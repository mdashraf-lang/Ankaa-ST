/**
 * Database client selector.
 * USE_LOCAL_DB=true  → PGlite (local file, zero internet)
 * default            → Supabase service-role client
 *
 * Both clients expose a `.from(table)` chain that returns { data, error }.
 * Cast to `any` to avoid TypeScript union incompatibility between the two.
 */

import { localDb } from './pglite'
import { supabaseAdmin } from '@/lib/supabase/admin'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: any =
  process.env.USE_LOCAL_DB === 'true' ? localDb : supabaseAdmin
