import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { ok } from '@/lib/response'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { acumularLoyalty } from '@/modules/loyalty/loyalty.service'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ codigo: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) throw new UnauthorizedError()
  if (user.role === 'OWNER') throw new ForbiddenError()

  const { codigo } = await params
  const body = await req.json()
  const { ventaId, totalVenta } = body

  if (!ventaId || totalVenta === undefined) {
    return Response.json({ error: { message: 'Faltan ventaId o totalVenta' } }, { status: 400 })
  }

  try {
    const result = await acumularLoyalty(
      user.tenantId,
      codigo,
      Number(ventaId),
      Number(totalVenta),
    )
    return ok(result)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error al acumular'
    return Response.json({ error: { message: msg } }, { status: 400 })
  }
}
