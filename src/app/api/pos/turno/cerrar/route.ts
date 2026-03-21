import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { cerrarTurno } from '@/modules/pos/pos.service'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { turnoId, montoContado, arqueoCaja, notasCierre } = await req.json()
    if (!turnoId || montoContado === undefined)
      return NextResponse.json({ error: 'Faltan datos: turnoId, montoContado' }, { status: 400 })

    const turno = await cerrarTurno(
      Number(turnoId), user.tenantId, Number(user.sub),
      Number(montoContado), arqueoCaja || {}, notasCierre
    )
    return NextResponse.json({ turno })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
