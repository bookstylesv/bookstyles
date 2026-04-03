import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { ok } from '@/lib/response'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { updateUnidad, deleteUnidad } from '@/modules/unidades/unidades.service'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) throw new UnauthorizedError()
  if (user.role !== 'OWNER') throw new ForbiddenError()

  const { id } = await params
  const body = await req.json()
  const { nombre, simbolo } = body

  if (!nombre?.trim()) {
    return Response.json({ error: { message: 'El nombre es requerido' } }, { status: 400 })
  }

  try {
    const unidad = await updateUnidad(user.tenantId, Number(id), { nombre, simbolo })
    return ok(unidad)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error al actualizar unidad'
    return Response.json({ error: { message: msg } }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) throw new UnauthorizedError()
  if (user.role !== 'OWNER') throw new ForbiddenError()

  const { id } = await params

  try {
    await deleteUnidad(user.tenantId, Number(id))
    return ok({ message: 'Unidad desactivada' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error al eliminar unidad'
    return Response.json({ error: { message: msg } }, { status: 400 })
  }
}
