import { NextRequest, NextResponse } from 'next/server'
import { cerrarTurno } from '@/modules/pos/pos.service'
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const POST = withTenantAuth(async (req: NextRequest, ctx) => {
  try {
const { turnoId, montoContado, arqueoCaja, notasCierre } = await req.json()
    if (!turnoId || montoContado === undefined)
      return NextResponse.json({ error: 'Faltan datos: turnoId, montoContado' }, { status: 400 })

    const turno = await cerrarTurno(
      Number(turnoId), ctx.tenantId, Number(ctx.user.sub),
      Number(montoContado), arqueoCaja || {}, notasCierre
    )
    return NextResponse.json({ turno })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}, { requiredModule: 'pos' })
