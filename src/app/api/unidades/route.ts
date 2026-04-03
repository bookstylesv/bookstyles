import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { ok, created } from '@/lib/response'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { listUnidades, createUnidad } from '@/modules/unidades/unidades.service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) throw new UnauthorizedError()
  if (user.role !== 'OWNER') throw new ForbiddenError()
  const unidades = await listUnidades(user.tenantId)
  return ok(unidades)
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) throw new UnauthorizedError()
  if (user.role !== 'OWNER') throw new ForbiddenError()

  const body = await req.json()
  const { nombre, simbolo } = body

  if (!nombre?.trim()) {
    return Response.json({ error: { message: 'El nombre es requerido' } }, { status: 400 })
  }

  try {
    const unidad = await createUnidad(user.tenantId, { nombre, simbolo })
    return created(unidad)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error al crear unidad'
    const isUnique = msg.includes('Unique') || msg.includes('unique')
    return Response.json(
      { error: { message: isUnique ? 'Ya existe una unidad con ese nombre' : msg } },
      { status: 400 },
    )
  }
}
