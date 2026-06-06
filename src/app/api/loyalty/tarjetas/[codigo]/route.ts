import { NextRequest } from 'next/server'
import { ok } from '@/lib/response'
import { withTenantAuth } from '@/lib/with-tenant-auth'
import { getTarjetaByCodigo, deleteTarjeta } from '@/modules/loyalty/loyalty.service'

export const dynamic = 'force-dynamic'

export const GET = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {
  const { codigo } = await routeCtx.params
  const tarjeta = await getTarjetaByCodigo(ctx.tenantId, codigo)
  if (!tarjeta) {
    return Response.json({ error: { message: 'Tarjeta no encontrada' } }, { status: 404 })
  }
  return ok(tarjeta)
}, { requiredModule: 'loyalty' })

export const DELETE = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {
  const { codigo } = await routeCtx.params
  const tarjeta = await getTarjetaByCodigo(ctx.tenantId, codigo)
  if (!tarjeta) {
    return Response.json({ error: { message: 'Tarjeta no encontrada' } }, { status: 404 })
  }

  try {
    await deleteTarjeta(ctx.tenantId, tarjeta.id)
    return ok({ message: 'Tarjeta eliminada' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error al eliminar'
    return Response.json({ error: { message: msg } }, { status: 400 })
  }
}, { requiredModule: 'loyalty' })
