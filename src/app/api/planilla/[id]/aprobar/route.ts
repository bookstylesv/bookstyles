import { NextRequest, NextResponse } from 'next/server';
import { aprobarPlanilla } from '@/modules/planilla/planilla.repository';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const PATCH = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {
  const { id } = await routeCtx.params;
  await aprobarPlanilla(ctx.tenantId, parseInt(id));
  return NextResponse.json({ ok: true });
}, { requiredModule: 'planilla' })
