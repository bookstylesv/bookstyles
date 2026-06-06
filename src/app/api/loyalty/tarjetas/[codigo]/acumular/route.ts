import { NextRequest } from 'next/server'
import { ok } from '@/lib/response'
import { withTenantAuth } from '@/lib/with-tenant-auth'
import { acumularLoyalty } from '@/modules/loyalty/loyalty.service'

export const dynamic = 'force-dynamic'

export const POST = withTenantAuth(async (req: NextRequest, ctx, routeCtx) => {
  const { codigo } = await routeCtx.params

  const body = await req.json()
  const { ventaId, totalVenta } = body

  if (!ventaId || totalVenta === undefined) {
    return Response.json({ error: { message: 'Faltan ventaId o totalVenta' } }, { status: 400 })
  }

  try {
    const result = await acumularLoyalty(
      ctx.tenantId,
      codigo,
      Number(ventaId),
      Number(totalVenta),
    )
    return ok(result)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error al acumular'
    return Response.json({ error: { message: msg } }, { status: 400 })
  }
}, { requiredModule: 'loyalty' })
