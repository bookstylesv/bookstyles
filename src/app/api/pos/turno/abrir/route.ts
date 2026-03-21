import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { abrirTurno } from '@/modules/pos/pos.service'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (user.role !== 'OWNER' && user.role !== 'BARBER')
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

    const { montoInicial } = await req.json()
    const turno = await abrirTurno(user.tenantId, Number(user.sub), montoInicial || 0)
    return NextResponse.json({ turno }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
