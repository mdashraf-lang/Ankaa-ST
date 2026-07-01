import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try { formData = await req.formData() }
  catch { return NextResponse.json({ error: 'Invalid form data' }, { status: 400 }) }

  const file = formData.get('file') as File | null
  const type = (formData.get('type') as string) || 'receipt'   // 'receipt' | 'bank'
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const folder    = type === 'bank' ? 'bank-statements' : 'receipts'
  const ext       = file.name.split('.').pop() ?? 'pdf'
  const timestamp = Date.now()
  const filename  = type === 'bank' ? `bank-${timestamp}.${ext}` : `invoice-${timestamp}.${ext}`
  const path      = `${folder}/${userId}/${filename}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage
    .from('invoices')
    .upload(path, buffer, { contentType: file.type || 'application/pdf', upsert: true })

  if (error) {
    // Storage might not be configured locally — return graceful fallback
    console.warn('[Storage] upload failed:', error.message)
    return NextResponse.json({ url: null, path: null, warning: error.message })
  }

  const { data: urlData } = supabaseAdmin.storage.from('invoices').getPublicUrl(path)
  return NextResponse.json({ url: urlData.publicUrl, path })
}
