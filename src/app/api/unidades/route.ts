import { NextRequest } from 'next/server'
import { ok, created } from '@/lib/response'
import { withTenantAuth } from '@/lib/with-tenant-auth'
import { listUnidades, createUnidad } from '@/modules/unidades/unidades.service'

export const dynamic = 'force-dynamic'

export const GET = withTenantAuth(async (_req: NextRequest, ctx) => {
  const unidades = await listUnidades(ctx.tenantId)
  return ok(unidades)
}, { requiredModule: 'inventario' })

export const POST = withTenantAuth(async (req: NextRequest, ctx) => {
  const body = await req.json()
  const { nombre, simbolo } = body

  if (!nombre?.trim()) {
    return Response.json({ error: { message: 'El nombre es requerido' } }, { status: 400 })
  }

  try {
    const unidad = await createUnidad(ctx.tenantId, { nombre, simbolo })
    return created(unidad)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error al crear unidad'
    const isUnique = msg.includes('Unique') || msg.includes('unique')
    return Response.json(
      { error: { message: isUnique ? 'Ya existe una unidad con ese nombre' : msg } },
      { status: 400 },
    )
  }
}, { requiredModule: 'inventario' })
