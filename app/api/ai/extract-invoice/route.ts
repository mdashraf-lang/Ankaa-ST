import { NextRequest, NextResponse } from 'next/server'

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

const CATEGORIES  = ['fuel', 'materials', 'transportation', 'food', 'others']
const PAID_BY_OPT = ['Office card', 'CEO', 'IT department', 'Personal', 'Company account']
const CURRENCIES  = ['OMR','USD','EUR','GBP','SAR','AED','INR','PKR','BHD','KWD','QAR','JOD','EGP','TRY','JPY','CNY','AUD','CAD','CHF','SGD']

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY
  if (!key) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })

  const { description, costCenters = [] } = await req.json()
  if (!description?.trim()) return NextResponse.json({ error: 'description required' }, { status: 400 })

  const ccList = (costCenters as string[]).join(', ') || 'none'

  const prompt = `Extract invoice/expense details from this description and return ONLY a valid JSON object (no markdown, no explanation).

Fields to extract:
- name: string — short expense title (e.g. "Shell Fuel", "Office Supplies")
- amount: number or null — numeric amount only, no symbols
- currency: string — 3-letter code from this list: ${CURRENCIES.join(', ')}. Default "OMR"
- transaction_date: string or null — ISO date YYYY-MM-DD. If only day/month given, use year ${new Date().getFullYear()}
- expense_category: string — one of: ${CATEGORIES.join(', ')}
- cost_center: string or null — pick closest match from: ${ccList}. Null if no match
- paid_by: string — one of: ${PAID_BY_OPT.join(', ')}. Default "Office card"
- bill_number: string or null — invoice/receipt number if mentioned
- description: string — a clean 1-sentence description of the expense
- status: string — "paid" if paid/settled, "unpaid" otherwise

Description: "${description.trim()}"

Return ONLY the JSON object.`

  try {
    const res = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `Gemini error: ${err}` }, { status: 502 })
    }

    const data = await res.json()
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Could not parse AI response', raw: text }, { status: 502 })
    }

    // Sanitise / coerce values
    const result = {
      name:             typeof parsed.name === 'string'             ? parsed.name             : '',
      amount:           typeof parsed.amount === 'number'           ? String(parsed.amount)   : '',
      currency:         CURRENCIES.includes(String(parsed.currency)) ? String(parsed.currency) : 'OMR',
      transaction_date: typeof parsed.transaction_date === 'string' ? parsed.transaction_date : '',
      expense_category: CATEGORIES.includes(String(parsed.expense_category)) ? String(parsed.expense_category) : 'others',
      cost_center:      typeof parsed.cost_center === 'string'      ? parsed.cost_center      : '',
      paid_by:          PAID_BY_OPT.includes(String(parsed.paid_by)) ? String(parsed.paid_by) : 'Office card',
      bill_number:      typeof parsed.bill_number === 'string'      ? parsed.bill_number      : '',
      description:      typeof parsed.description === 'string'      ? parsed.description      : '',
      status:           parsed.status === 'paid'                    ? 'paid'                  : 'unpaid',
    }

    return NextResponse.json({ result })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
