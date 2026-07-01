import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'
import { isAdmin, isHR } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// All 70 device entries from the HIKVISION terminal list — used for seeding
export const DEVICE_ROSTER: { device_id: number; device_name: string }[] = [
  { device_id: 1,  device_name: 'Ahmed Nasser Al-Mantheri' },
  { device_id: 2,  device_name: 'Osama' },
  { device_id: 3,  device_name: 'Yousif Al Riyami' },
  { device_id: 4,  device_name: 'Maadh Al Balushi' },
  { device_id: 5,  device_name: 'Ahmed abdul H. Al Manthari' },
  { device_id: 6,  device_name: 'Abdulmalik Al aufi' },
  { device_id: 7,  device_name: 'Al Hussain Al Harooni' },
  { device_id: 8,  device_name: 'Mansour' },
  { device_id: 9,  device_name: 'Mohammed Al Kindi' },
  { device_id: 10, device_name: 'Abdulmalik Al Balushi' },
  { device_id: 11, device_name: 'Mohammed Al Sawafi' },
  { device_id: 12, device_name: 'Yahya Al Hajri' },
  { device_id: 13, device_name: 'Hisham Al Musheifri' },
  { device_id: 14, device_name: 'Mohammed Badar' },
  { device_id: 15, device_name: 'Abdul Majeed Al Balushi' },
  { device_id: 16, device_name: 'Adil Al Balushi' },
  { device_id: 17, device_name: 'Hamed Al Wahaibi' },
  { device_id: 18, device_name: 'Abdullah Walad Thani' },
  { device_id: 19, device_name: 'Ali Saif Al Ghassani' },
  { device_id: 20, device_name: 'Daniya Al Shabibi' },
  { device_id: 21, device_name: 'Dima Al Maawali' },
  { device_id: 22, device_name: 'Ghayadah Al Jabri' },
  { device_id: 23, device_name: 'Hamed Al Al Wahaibi' },
  { device_id: 24, device_name: 'Hilal Al Riyami' },
  { device_id: 25, device_name: 'Hisham Al Musheifri' },
  { device_id: 26, device_name: 'Huria Al Hamdani' },
  { device_id: 27, device_name: 'Ibrahim Al Masoudi' },
  { device_id: 28, device_name: 'Ikram Ullah Al Balushi' },
  { device_id: 29, device_name: 'Imad Al Zadjali' },
  { device_id: 30, device_name: 'Jasim Al Balushi' },
  { device_id: 31, device_name: 'Jawahir Al Harthi' },
  { device_id: 32, device_name: 'Khalid Al Masoudi' },
  { device_id: 33, device_name: 'Khalid Al Shibli' },
  { device_id: 34, device_name: 'Khamis Al Hashmi' },
  { device_id: 35, device_name: 'Maathir Al Wahaibi' },
  { device_id: 36, device_name: 'Maram Al Nuaimi' },
  { device_id: 37, device_name: 'Maryam Al Kalbani' },
  { device_id: 38, device_name: 'Mazin Al Ambouri' },
  { device_id: 39, device_name: 'Mazin Al Toubi' },
  { device_id: 40, device_name: 'Mohammed Al Maskari' },
  { device_id: 41, device_name: 'Mohammed Al Riyami' },
  { device_id: 42, device_name: 'Omar Nasser Al Ghaithy' },
  { device_id: 43, device_name: 'Rahma Al Jahwari' },
  { device_id: 44, device_name: 'Rayan Al Rawahi' },
  { device_id: 45, device_name: 'Reham Al Ghanboosi' },
  { device_id: 46, device_name: 'Sultan Al Balushi' },
  { device_id: 47, device_name: 'Yaqeen Al Farsi' },
  { device_id: 48, device_name: 'Ahmed Al Habsi' },
  { device_id: 49, device_name: 'Alberto' },
  { device_id: 50, device_name: 'Darwish Al Balushi' },
  { device_id: 51, device_name: 'Fateme Sohrabi' },
  { device_id: 52, device_name: 'Furwa Asim' },
  { device_id: 53, device_name: 'Hamed Al Abri' },
  { device_id: 54, device_name: 'Hazza Al Jahmani' },
  { device_id: 55, device_name: 'Ibrahim Al Hattali' },
  { device_id: 56, device_name: 'Jamal Al Raisi' },
  { device_id: 57, device_name: 'Mekaeel Abdullah' },
  { device_id: 58, device_name: 'Mohammed Ashraf Ali' },
  { device_id: 59, device_name: 'Ahmed Al Busaidi' },
  { device_id: 60, device_name: 'Mohammed Imthiyaz' },
  { device_id: 61, device_name: 'Muhammad Hanif' },
  { device_id: 62, device_name: 'Palwasha Asif' },
  { device_id: 63, device_name: 'Rami Katat' },
  { device_id: 64, device_name: 'Raquel Qomes Vaz' },
  { device_id: 65, device_name: 'Rayan Al Hashmi' },
  { device_id: 66, device_name: 'Reynaldo' },
  { device_id: 67, device_name: 'Ruwaina Al Aamri' },
  { device_id: 68, device_name: 'Sultan Al Habsi' },
  { device_id: 69, device_name: 'Zainab Al Rahbi' },
  { device_id: 71, device_name: 'Hajoud' },
]

// ── GET — list all device mappings (merges saved DB rows with full roster) ────
export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role') || ''
  if (!isAdmin(role) && !isHR(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: saved } = await db
    .from('device_id_mapping')
    .select('*, profiles:profile_id(id, full_name, employee_id, avatar_url)')
    .order('device_id')

  const savedMap: Record<number, Record<string, unknown>> = {}
  for (const row of (saved ?? []) as Record<string, unknown>[]) {
    savedMap[row.device_id as number] = row
  }

  // Merge roster with saved mappings (roster is the source of truth for device names)
  const mappings = DEVICE_ROSTER.map(entry => {
    const saved = savedMap[entry.device_id]
    return {
      device_id:   entry.device_id,
      device_name: entry.device_name,
      id:          saved?.id ?? null,
      employee_id: saved?.employee_id ?? null,
      profile_id:  saved?.profile_id ?? null,
      profile:     saved?.profiles ?? null,
      is_active:   saved?.is_active ?? 1,
    }
  })

  return NextResponse.json({ mappings })
}

// ── POST — upsert a single device → employee mapping ─────────────────────────
export async function POST(req: NextRequest) {
  const role    = req.headers.get('x-user-role') || ''
  const userId  = req.headers.get('x-user-id') || ''
  if (!isAdmin(role) && !isHR(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as {
    device_id: number
    employee_id: string | null
    profile_id: string | null
  }

  const { device_id, employee_id, profile_id } = body
  if (!device_id) return NextResponse.json({ error: 'device_id required' }, { status: 400 })

  const rosterEntry = DEVICE_ROSTER.find(e => e.device_id === device_id)
  const device_name = rosterEntry?.device_name ?? ''

  const now = new Date().toISOString()

  // Check if row already exists
  const { data: existing } = await db
    .from('device_id_mapping')
    .select('id')
    .eq('device_id', device_id)
    .single()

  if (existing?.id) {
    const { data, error } = await db
      .from('device_id_mapping')
      .update({ employee_id, profile_id, device_name, updated_at: now })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ mapping: data })
  }

  const { data, error } = await db
    .from('device_id_mapping')
    .insert({
      id: randomUUID(), device_id, device_name,
      employee_id, profile_id, is_active: 1,
      created_at: now, updated_at: now,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ mapping: data })
}

// ── DELETE — remove a mapping by device_id ────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const role = req.headers.get('x-user-role') || ''
  if (!isAdmin(role) && !isHR(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const device_id = Number(searchParams.get('device_id'))
  if (!device_id) return NextResponse.json({ error: 'device_id required' }, { status: 400 })

  const { error } = await db.from('device_id_mapping').delete().eq('device_id', device_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
