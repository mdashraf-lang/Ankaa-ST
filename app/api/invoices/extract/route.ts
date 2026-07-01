import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']
const GEMINI_BASE   = 'https://generativelanguage.googleapis.com/v1beta/models'

const CATEGORIES   = ['fuel', 'materials', 'transportation', 'food', 'others']
const CURRENCIES   = ['OMR','USD','EUR','GBP','SAR','AED','INR','PKR','BHD','KWD','QAR','JOD','EGP','TRY','JPY','CNY','AUD','CAD','CHF','SGD']
const PAID_BY_OPTS = ['Office card','CEO','IT department','Personal','Company account']

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY
  if (!key) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })

  // ── Parse multipart form ─────────────────────────────────────────────────
  let formData: FormData
  try { formData = await req.formData() }
  catch { return NextResponse.json({ error: 'Invalid multipart form' }, { status: 400 }) }

  const file = formData.get('pdf') as File | null
  if (!file) return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 })

  // ── Load cost centers ─────────────────────────────────────────────────────
  const { data: ccRows } = await db.from('cost_centers').select('name').eq('active', 1)
  const costCenters: string[] = (ccRows ?? []).map((r: { name: string }) => r.name)

  // ── Convert PDF to base64 ─────────────────────────────────────────────────
  const buffer   = Buffer.from(await file.arrayBuffer())
  const base64   = buffer.toString('base64')
  const mimeType = (file.type && file.type !== 'application/octet-stream') ? file.type : 'application/pdf'

  const today = new Date().toISOString().split('T')[0]
  const ccList = costCenters.length > 0 ? costCenters.join(', ') : 'none configured'

  const prompt = `You are an expert at reading invoice, receipt, and expense documents.
Extract ALL invoice/expense records from this PDF. A single PDF may contain multiple invoices.

Return a JSON ARRAY (even if only one invoice). Each element must follow this exact schema:
{
  "invoice_name": "vendor or company name as printed",
  "bill_number": "invoice/receipt/ref number or null",
  "date": "YYYY-MM-DD or null",
  "currency": "3-letter ISO code (${CURRENCIES.slice(0,8).join(', ')}, etc.) — default OMR",
  "total_amount": numeric total or null,
  "exchange_rate": numeric rate to OMR or null,
  "expense_category": "${CATEGORIES.join(' | ')}",
  "breakdown": { "fuel": 0, "materials": 0, "transportation": 0, "food": 0, "others": 0 },
  "cost_center": "match from [${ccList}] or null",
  "description": "1–2 sentence summary of what was purchased",
  "paid_by": "${PAID_BY_OPTS.join(' | ')} — default 'Office card'",
  "status": "paid | unpaid"
}

Rules:
- breakdown values must sum to total_amount
- Pick the single most appropriate expense_category
- If currency is not OMR, estimate exchange_rate to OMR if visible on document
- Today is ${today}
- Return ONLY valid JSON array, no markdown, no explanation`

  // ── Call Gemini with retries across models ────────────────────────────────
  let lastError = ''
  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [
              { inlineData: { mimeType, data: base64 } },
              { text: prompt }
            ]}],
            generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
          }),
        })

        if (res.status === 503 || res.status === 429) {
          const wait = attempt === 0 ? 2000 : attempt === 1 ? 5000 : 10000
          await new Promise(r => setTimeout(r, wait))
          continue
        }
        if (!res.ok) { lastError = `${model}: HTTP ${res.status}`; break }

        const json  = await res.json()
        const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
        const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

        let parsed: unknown[]
        try {
          const maybe = JSON.parse(clean)
          parsed = Array.isArray(maybe) ? maybe : [maybe]
        } catch {
          lastError = `${model}: JSON parse error`
          break
        }

        const invoices = parsed.map(normalise)
        return NextResponse.json({ invoices, multiple: invoices.length > 1 })
      } catch (e: unknown) {
        lastError = e instanceof Error ? e.message : String(e)
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000))
      }
    }
  }

  return NextResponse.json({ error: lastError || 'AI extraction failed' }, { status: 502 })
}

// ── Normalise / sanitise an AI result object ─────────────────────────────────
function normalise(raw: unknown): Record<string, unknown> {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>

  const cat = CATEGORIES.includes(String(r.expense_category)) ? String(r.expense_category) : 'others'
  const amt = typeof r.total_amount === 'number' ? r.total_amount : (parseFloat(String(r.total_amount)) || 0)

  const breakdown = (r.breakdown && typeof r.breakdown === 'object'
    ? r.breakdown : {}) as Record<string, number>

  // If AI didn't provide breakdown, put whole amount in the selected category
  const hasBreakdown = Object.values(breakdown).some(v => typeof v === 'number' && v > 0)
  const finalBreakdown = hasBreakdown ? {
    fuel:           Number(breakdown.fuel           ?? 0),
    materials:      Number(breakdown.materials      ?? 0),
    transportation: Number(breakdown.transportation ?? 0),
    food:           Number(breakdown.food           ?? 0),
    others:         Number(breakdown.others         ?? 0),
  } : {
    fuel:           cat === 'fuel'           ? amt : 0,
    materials:      cat === 'materials'      ? amt : 0,
    transportation: cat === 'transportation' ? amt : 0,
    food:           cat === 'food'           ? amt : 0,
    others:         cat === 'others'         ? amt : 0,
  }

  return {
    invoice_name:     String(r.invoice_name ?? r.name ?? ''),
    bill_number:      typeof r.bill_number === 'string'      ? r.bill_number      : '',
    date:             typeof r.date         === 'string'      ? r.date             : '',
    currency:         CURRENCIES.includes(String(r.currency)) ? String(r.currency) : 'OMR',
    total_amount:     amt,
    exchange_rate:    typeof r.exchange_rate === 'number'     ? r.exchange_rate    : null,
    expense_category: cat,
    breakdown:        finalBreakdown,
    cost_center:      typeof r.cost_center  === 'string'      ? r.cost_center      : '',
    description:      typeof r.description  === 'string'      ? r.description      : '',
    paid_by:          PAID_BY_OPTS.includes(String(r.paid_by)) ? String(r.paid_by) : 'Office card',
    status:           r.status === 'paid' ? 'paid' : 'unpaid',
  }
}
