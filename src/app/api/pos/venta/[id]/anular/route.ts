import { NextRequest, NextResponse } from 'next/server'
import { anularVenta } from '@/modules/pos/pos.service'
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const POST = withTenantAuth(async (req: NextRequest, ctx, routeCtx) => {
  try {
if (!['OWNER','SUPERADMIN','GERENTE','USERS'].includes(ctx.user.role)) return NextResponse.json({ error: 'Solo el propietario puede anular' }, { status: 403 })

    const { id } = await routeCtx.params;const { motivo } = await req.json()
    if (!motivo) return NextResponse.json({ error: 'El motivo de anulación es requerido' }, { status: 400 })

    await anularVenta(Number(id), ctx.tenantId, motivo)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}, { requiredModule: 'pos' })
