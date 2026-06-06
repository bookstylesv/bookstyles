import { NextRequest } from 'next/server'
import { ok } from '@/lib/response'
import { withTenantAuth } from '@/lib/with-tenant-auth'
import { updateUnidad, deleteUnidad } from '@/modules/unidades/unidades.service'

export const dynamic = 'force-dynamic'

export const PUT = withTenantAuth(async (req: NextRequest, ctx, routeCtx) => {
  const { id } = await routeCtx.params
  const body = await req.json()
  const { nombre, simbolo } = body

  if (!nombre?.trim()) {
    return Response.json({ error: { message: 'El nombre es requerido' } }, { status: 400 })
  }

  try {
    const unidad = await updateUnidad(ctx.tenantId, Number(id), { nombre, simbolo })
    return ok(unidad)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error al actualizar unidad'
    return Response.json({ error: { message: msg } }, { status: 400 })
  }
}, { requiredModule: 'inventario' })

export const DELETE = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {
  const { id } = await routeCtx.params

  try {
    await deleteUnidad(ctx.tenantId, Number(id))
    return ok({ message: 'Unidad desactivada' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error al eliminar unidad'
    return Response.json({ error: { message: msg } }, { status: 400 })
  }
}, { requiredModule: 'inventario' })
