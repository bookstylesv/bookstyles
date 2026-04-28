import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { ok } from '@/lib/response'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { canjearLoyalty } from '@/modules/loyalty/loyalty.service'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ codigo: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) throw new UnauthorizedError()
  if (user.role === 'OWNER') throw new ForbiddenError()

  const { codigo } = await params
  const body = await req.json().catch(() => ({}))
  const { nota } = body

  try {
    const tarjeta = await canjearLoyalty(user.tenantId, codigo, nota)
    return ok(tarjeta)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error al registrar canje'
    return Response.json({ error: { message: msg } }, { status: 400 })
  }
}
