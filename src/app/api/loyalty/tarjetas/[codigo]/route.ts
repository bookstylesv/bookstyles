import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { ok } from '@/lib/response'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { getTarjetaByCodigo, deleteTarjeta } from '@/modules/loyalty/loyalty.service'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ codigo: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) throw new UnauthorizedError()
  if (user.role === 'OWNER') throw new ForbiddenError()

  const { codigo } = await params
  const tarjeta = await getTarjetaByCodigo(user.tenantId, codigo)
  if (!tarjeta) {
    return Response.json({ error: { message: 'Tarjeta no encontrada' } }, { status: 404 })
  }
  return ok(tarjeta)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) throw new UnauthorizedError()
  if (user.role !== 'OWNER') throw new ForbiddenError()

  const { codigo } = await params
  const tarjeta = await getTarjetaByCodigo(user.tenantId, codigo)
  if (!tarjeta) {
    return Response.json({ error: { message: 'Tarjeta no encontrada' } }, { status: 404 })
  }

  try {
    await deleteTarjeta(user.tenantId, tarjeta.id)
    return ok({ message: 'Tarjeta eliminada' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error al eliminar'
    return Response.json({ error: { message: msg } }, { status: 400 })
  }
}
