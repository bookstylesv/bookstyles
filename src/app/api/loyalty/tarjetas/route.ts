import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { ok, created, apiError } from '@/lib/response'
import { UnauthorizedError, ForbiddenError, ValidationError, ConflictError } from '@/lib/errors'
import { listTarjetas, createTarjeta } from '@/modules/loyalty/loyalty.service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) throw new UnauthorizedError()
    if (!['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) throw new ForbiddenError()
    const tarjetas = await listTarjetas(user.tenantId)
    return ok(tarjetas)
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) throw new UnauthorizedError()
    if (!['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) throw new ForbiddenError()

    const body = await req.json()
    const { codigo, nombre, tipo, meta, dolarsPorPunto } = body

    if (!codigo || !nombre || !tipo || !meta) {
      throw new ValidationError('Faltan campos obligatorios: codigo, nombre, tipo, meta')
    }
    if (!['SELLOS', 'PUNTOS'].includes(tipo)) {
      throw new ValidationError('Tipo inválido. Valores permitidos: SELLOS, PUNTOS')
    }
    if (tipo === 'PUNTOS' && !dolarsPorPunto) {
      throw new ValidationError('Indica cuántos dólares equivalen a 1 punto')
    }

    try {
      const tarjeta = await createTarjeta(user.tenantId, {
        codigo, nombre, tipo, meta: Number(meta),
        dolarsPorPunto: dolarsPorPunto ? Number(dolarsPorPunto) : undefined,
      })
      return created(tarjeta)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : ''
      if (msg.includes('Unique') || msg.includes('unique')) {
        throw new ConflictError('El código ya existe en este tenant')
      }
      throw e
    }
  } catch (e) {
    return apiError(e)
  }
}
