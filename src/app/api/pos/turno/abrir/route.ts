import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { created, apiError } from '@/lib/response'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { abrirTurno } from '@/modules/pos/pos.service'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) throw new UnauthorizedError()
    if (user.role === 'OWNER') throw new ForbiddenError('Sin permiso para abrir turno')

    const { montoInicial } = await req.json()
    const turno = await abrirTurno(user.tenantId, Number(user.sub), montoInicial || 0)
    return created({ turno })
  } catch (e) {
    return apiError(e)
  }
}
