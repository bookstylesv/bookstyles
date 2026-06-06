import { NextRequest, NextResponse } from 'next/server'
import { createNotaCredito, getNotasCredito } from '@/modules/pos/pos.service'
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (_req: NextRequest, ctx) => {
  try {
const ncs = await getNotasCredito(ctx.tenantId)
    return NextResponse.json({ notasCredito: ncs })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}, { requiredModule: 'pos' })

export const POST = withTenantAuth(async (req: NextRequest, ctx) => {
  try {
if (!['OWNER','SUPERADMIN','GERENTE','USERS'].includes(ctx.user.role)) return NextResponse.json({ error: 'Solo el propietario puede emitir NC' }, { status: 403 })

    const { ventaId, motivo } = await req.json()
    if (!ventaId || !motivo) return NextResponse.json({ error: 'ventaId y motivo son requeridos' }, { status: 400 })

    const nc = await createNotaCredito(ctx.tenantId, Number(ventaId), motivo)
    return NextResponse.json({ notaCredito: nc }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}, { requiredModule: 'pos' })
