/**
 * PGlite adapter — mirrors the Supabase client `.from()` chain API.
 * Used when USE_LOCAL_DB=true. No internet, no Supabase account needed.
 */
import { PGlite } from '@electric-sql/pglite'
import path from 'path'
import { randomUUID } from 'crypto'

// ── Singleton across HMR reloads ─────────────────────────────────────────────
// Next.js Hot Module Replacement re-evaluates modules on every file save,
// which would create a new PGlite connection and hit the "DB already locked"
// error (PGlite only allows one connection at a time via postmaster.pid).
// Storing on `globalThis` survives HMR so the same PGlite instance is reused
// for the lifetime of the Node.js dev server process.
const g = globalThis as typeof globalThis & { __pgliteDb?: PGlite }

function getDb(): PGlite {
  if (!g.__pgliteDb) {
    const dataDir = process.env.LOCAL_DB_PATH
      ?? path.resolve(process.cwd(), '.local-db').replace(/\\/g, '/')
    g.__pgliteDb = new PGlite(dataDir)
  }
  return g.__pgliteDb
}

// ─── Result types (same shape as Supabase) ───────────────────────────────────
export interface DbResult<T> {
  data: T | null
  error: { message: string } | null
  count?: number | null
}

// ─── Query Builder ────────────────────────────────────────────────────────────
type Op = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'is' | 'in' | 'like' | 'ilike'

interface Where {
  col: string
  op: Op
  val: unknown
}

type OrderDir = 'asc' | 'desc'

interface OrderClause {
  col: string
  dir: OrderDir
  nullsFirst?: boolean
}

class QueryBuilder<T = Record<string, unknown>> {
  private _table: string
  private _selectCols = '*'
  private _wheres: Where[] = []
  private _orders: OrderClause[] = []
  private _limitVal?: number
  private _offsetVal?: number
  private _operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
  private _insertData: Record<string, unknown> | Record<string, unknown>[] | null = null
  private _updateData: Record<string, unknown> | null = null
  private _returnSingle = false
  private _countOnly = false
  private _upsertConflict?: string
  private _returning = false

  constructor(table: string) {
    this._table = table
  }

  // ── SELECT ─────────────────────────────────────────────────────────────────
  select(cols = '*', opts?: { count?: 'exact'; head?: boolean }): this {
    // When chained after insert/update/upsert/delete, `.select()` means
    // "return the mutated row" — do NOT overwrite the operation.
    // Those operations already emit RETURNING * so the data is already available.
    if (this._operation !== 'select') {
      this._returning = true
      this._selectCols = simplifySelectCols(cols)
      return this
    }
    this._operation = 'select'
    // Strip joined table references like `*, profiles:user_id(...)` → keep only simple cols
    // For local dev we return all columns and let the app handle nulls
    this._selectCols = simplifySelectCols(cols)
    if (opts?.count === 'exact') this._countOnly = !!opts?.head
    return this
  }

  // ── INSERT ─────────────────────────────────────────────────────────────────
  insert(data: Record<string, unknown> | Record<string, unknown>[]): this {
    this._operation = 'insert'
    this._insertData = data
    return this
  }

  // ── UPDATE ─────────────────────────────────────────────────────────────────
  update(data: Record<string, unknown>): this {
    this._operation = 'update'
    this._updateData = data
    return this
  }

  // ── DELETE ─────────────────────────────────────────────────────────────────
  delete(): this {
    this._operation = 'delete'
    return this
  }

  // ── UPSERT ─────────────────────────────────────────────────────────────────
  upsert(data: Record<string, unknown>, opts?: { onConflict?: string }): this {
    this._operation = 'upsert'
    this._insertData = data
    this._upsertConflict = opts?.onConflict
    return this
  }

  // ── FILTERS ────────────────────────────────────────────────────────────────
  eq(col: string, val: unknown): this    { return this._where(col, 'eq', val) }
  neq(col: string, val: unknown): this   { return this._where(col, 'neq', val) }
  gt(col: string, val: unknown): this    { return this._where(col, 'gt', val) }
  gte(col: string, val: unknown): this   { return this._where(col, 'gte', val) }
  lt(col: string, val: unknown): this    { return this._where(col, 'lt', val) }
  lte(col: string, val: unknown): this   { return this._where(col, 'lte', val) }
  is(col: string, val: unknown): this    { return this._where(col, 'is', val) }
  in(col: string, vals: unknown[]): this { return this._where(col, 'in', vals) }
  like(col: string, val: string): this   { return this._where(col, 'like', val) }
  ilike(col: string, val: string): this  { return this._where(col, 'ilike', val) }

  private _where(col: string, op: Op, val: unknown): this {
    this._wheres.push({ col, op, val })
    return this
  }

  // ── ORDERING & PAGINATION ──────────────────────────────────────────────────
  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }): this {
    this._orders.push({
      col,
      dir: opts?.ascending === false ? 'desc' : 'asc',
      nullsFirst: opts?.nullsFirst,
    })
    return this
  }

  limit(n: number): this  { this._limitVal = n; return this }
  offset(n: number): this { this._offsetVal = n; return this }

  // ── RETURN SINGLE ROW ──────────────────────────────────────────────────────
  single(): Promise<DbResult<T>> {
    this._returnSingle = true
    return this._execute() as Promise<DbResult<T>>
  }

  // Chained .select() after insert/update to return the row
  // Already handled by setting _returning = true implicitly on insert/update
  // The Supabase pattern is `.insert(data).select().single()`
  // We detect this by returning `this` from select when operation is already set

  // ── EXECUTE ────────────────────────────────────────────────────────────────
  then<R>(resolve: (v: DbResult<T[]>) => R, reject?: (e: unknown) => R): Promise<R> {
    return this._execute().then(resolve as never, reject)
  }

  private async _execute(): Promise<DbResult<T | T[]>> {
    const db = getDb()
    try {
      switch (this._operation) {
        case 'select':  return await this._doSelect(db)
        case 'insert':  return await this._doInsert(db)
        case 'update':  return await this._doUpdate(db)
        case 'delete':  return await this._doDelete(db)
        case 'upsert':  return await this._doUpsert(db)
        default: return { data: null, error: { message: 'Unknown operation' } }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`[LocalDB] ${this._operation} on ${this._table}:`, msg)
      return { data: null, error: { message: msg } }
    }
  }

  // ── SELECT impl ────────────────────────────────────────────────────────────
  private async _doSelect(db: PGlite): Promise<DbResult<T | T[]>> {
    const { sql, params } = this._buildSelect()
    const res = await db.query<T>(sql, params)
    const rows = res.rows ?? []

    if (this._countOnly) {
      return { data: null, count: rows.length, error: null }
    }

    if (this._returnSingle) {
      if (rows.length === 0) return { data: null, error: { message: 'No rows returned' } }
      return { data: rows[0], error: null }
    }
    return { data: rows, error: null }
  }

  private _buildSelect() {
    const parts: string[] = [`SELECT ${this._selectCols} FROM ${this._table}`]
    const { clause, params } = this._buildWhere()
    if (clause) parts.push(`WHERE ${clause}`)
    if (this._orders.length) {
      parts.push('ORDER BY ' + this._orders.map(o =>
        `${o.col} ${o.dir.toUpperCase()}${o.nullsFirst ? ' NULLS FIRST' : ''}`
      ).join(', '))
    }
    if (this._limitVal != null) parts.push(`LIMIT ${this._limitVal}`)
    if (this._offsetVal != null) parts.push(`OFFSET ${this._offsetVal}`)
    return { sql: parts.join(' '), params }
  }

  // ── INSERT impl ────────────────────────────────────────────────────────────
  private async _doInsert(db: PGlite): Promise<DbResult<T | T[]>> {
    const rows = Array.isArray(this._insertData) ? this._insertData : [this._insertData!]
    const results: T[] = []

    for (const row of rows) {
      const prepared = prepareRow(row)
      // Always provide an id if not set (PGlite default is empty string)
      if (!prepared.id) prepared.id = randomUUID()
      // Always provide timestamps
      if (!prepared.created_at) prepared.created_at = new Date().toISOString()
      const cols = Object.keys(prepared)
      const vals = Object.values(prepared)
      const placeholders = vals.map((_, i) => `$${i + 1}`)
      const sql = `INSERT INTO ${this._table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`
      const res = await db.query<T>(sql, vals)
      if (res.rows?.[0]) results.push(res.rows[0])
    }

    if (this._returnSingle || !Array.isArray(this._insertData)) {
      return { data: results[0] ?? null, error: null }
    }
    return { data: results, error: null }
  }

  // ── UPDATE impl ────────────────────────────────────────────────────────────
  private async _doUpdate(db: PGlite): Promise<DbResult<T | T[]>> {
    const prepared = prepareRow(this._updateData!)
    const entries = Object.entries(prepared)
    if (entries.length === 0) return { data: null, error: { message: 'No fields to update' } }

    const sets = entries.map(([k], i) => `${k} = $${i + 1}`)
    const setParams = entries.map(([, v]) => v)

    const { clause, params: whereParams } = this._buildWhere(setParams.length)
    const whereClause = clause ? `WHERE ${clause}` : ''
    const allParams = [...setParams, ...whereParams]

    const sql = `UPDATE ${this._table} SET ${sets.join(', ')} ${whereClause} RETURNING *`
    const res = await db.query<T>(sql, allParams)

    if (this._returnSingle) {
      return { data: res.rows?.[0] ?? null, error: null }
    }
    return { data: res.rows ?? [], error: null }
  }

  // ── DELETE impl ────────────────────────────────────────────────────────────
  private async _doDelete(db: PGlite): Promise<DbResult<T | T[]>> {
    const { clause, params } = this._buildWhere()
    const whereClause = clause ? `WHERE ${clause}` : ''
    await db.query(`DELETE FROM ${this._table} ${whereClause}`, params)
    return { data: null, error: null }
  }

  // ── UPSERT impl ────────────────────────────────────────────────────────────
  private async _doUpsert(db: PGlite): Promise<DbResult<T | T[]>> {
    const row = Array.isArray(this._insertData) ? this._insertData[0] : this._insertData!
    const prepared = prepareRow(row)
    const cols = Object.keys(prepared)
    const vals = Object.values(prepared)
    const placeholders = vals.map((_, i) => `$${i + 1}`)
    const conflict = this._upsertConflict ?? cols[0]
    const updates = cols.filter(c => c !== conflict).map(c => `${c} = EXCLUDED.${c}`)
    const onConflict = updates.length
      ? `ON CONFLICT (${conflict}) DO UPDATE SET ${updates.join(', ')}`
      : `ON CONFLICT (${conflict}) DO NOTHING`
    const sql = `INSERT INTO ${this._table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) ${onConflict} RETURNING *`
    const res = await db.query<T>(sql, vals)

    if (this._returnSingle) {
      return { data: res.rows?.[0] ?? null, error: null }
    }
    return { data: res.rows ?? [], error: null }
  }

  // ── WHERE clause builder ───────────────────────────────────────────────────
  private _buildWhere(paramOffset = 0): { clause: string; params: unknown[] } {
    if (!this._wheres.length) return { clause: '', params: [] }
    const parts: string[] = []
    const params: unknown[] = []
    let idx = paramOffset + 1

    for (const w of this._wheres) {
      if (w.op === 'is' && w.val === null) {
        parts.push(`${w.col} IS NULL`)
      } else if (w.op === 'is') {
        parts.push(`${w.col} IS NOT NULL`)
      } else if (w.op === 'in') {
        const arr = w.val as unknown[]
        const ph = arr.map((_, i) => `$${idx + i}`)
        parts.push(`${w.col} IN (${ph.join(', ')})`)
        params.push(...arr)
        idx += arr.length
      } else {
        const opSql: Record<Op, string> = {
          eq: '=', neq: '!=', gt: '>', gte: '>=', lt: '<', lte: '<=',
          is: 'IS', in: 'IN', like: 'LIKE', ilike: 'ILIKE',
        }
        parts.push(`${w.col} ${opSql[w.op]} $${idx}`)
        params.push(w.val)
        idx++
      }
    }
    return { clause: parts.join(' AND '), params }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function simplifySelectCols(cols: string): string {
  // Strip Supabase join syntax: `profiles:user_id(id, name)`, `table!inner(...)`.
  // Splitting on ',' leaks inner column names and leaves dangling ')' fragments.
  // Fix: collect any word that directly precedes '(' (the join relation name),
  // remove all balanced paren groups, then filter bad tokens.
  if (!cols || cols === '*') return '*'

  // Words that are join relation names (appear directly before '(')
  const joinNames = new Set<string>()
  const prefixRe = /(\w+)\s*\(/g
  let m: RegExpExecArray | null
  while ((m = prefixRe.exec(cols)) !== null) joinNames.add(m[1])

  // Remove balanced paren groups iteratively (innermost first)
  let s = cols
  let prev = ''
  while (s !== prev) { prev = s; s = s.replace(/\([^()]*\)/g, '') }

  const cleaned = s
    .split(',')
    .map(c => c.trim())
    .filter(c =>
      c.length > 0 &&
      !c.includes('(') && !c.includes(')') &&
      !c.includes(':') && !c.includes('!') &&
      !joinNames.has(c)
    )
    .join(', ')
  return cleaned || '*'
}

function prepareRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (v === undefined) continue
    // Stringify objects/arrays for JSONB columns
    if (v !== null && typeof v === 'object') {
      out[k] = JSON.stringify(v)
    } else {
      out[k] = v
    }
  }
  return out
}

// ─── The exported client (same shape as supabaseAdmin) ────────────────────────
export const localDb = {
  from<T = Record<string, unknown>>(table: string) {
    return new QueryBuilder<T>(table)
  },
  // Raw SQL passthrough — used by API routes that need ORDER BY reserved keywords
  async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> {
    const db = getDb()
    const res = await db.query<T>(sql, params)
    return { rows: res.rows ?? [] }
  },
}
