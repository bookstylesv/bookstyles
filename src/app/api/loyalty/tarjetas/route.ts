import { NextRequest } from 'next/server'
import { ok, created } from '@/lib/response';
import { ValidationError, ConflictError } from '@/lib/errors';
import { listTarjetas, createTarjeta } from '@/modules/loyalty/loyalty.service'
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const dynamic = 'force-dynamic'

export const GET = withTenantAuth(async (_req: NextRequest, ctx) => {
    const tarjetas = await listTarjetas(ctx.tenantId)
    return ok(tarjetas)
}, { requiredModule: 'loyalty' })

export const POST = withTenantAuth(async (req: NextRequest, ctx) => {
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
      const tarjeta = await createTarjeta(ctx.tenantId, {
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
}, { requiredModule: 'loyalty' })
