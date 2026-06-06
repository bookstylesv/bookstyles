import { NextRequest, NextResponse } from 'next/server';
import { pagarPlanilla } from '@/modules/planilla/planilla.repository';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const PATCH = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {
  const { id } = await routeCtx.params;
  try {
    await pagarPlanilla(ctx.tenantId, parseInt(id));
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}, { requiredModule: 'planilla' })
