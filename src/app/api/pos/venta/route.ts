import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createVenta, getVentas } from '@/modules/pos/pos.service'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const sp = req.nextUrl.searchParams
    const result = await getVentas(user.tenantId, {
      estado: sp.get('estado') || undefined,
      tipoDte: sp.get('tipoDte') || undefined,
      turnoId: sp.get('turnoId') ? Number(sp.get('turnoId')) : undefined,
      desde: sp.get('desde') || undefined,
      hasta: sp.get('hasta') || undefined,
      page: Number(sp.get('page') || '1'),
    })
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const result = await createVenta(user.tenantId, body)
    return NextResponse.json(result, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
