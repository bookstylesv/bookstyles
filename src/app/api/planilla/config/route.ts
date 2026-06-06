import { NextRequest, NextResponse } from 'next/server';
import { getConfigPlanilla, upsertConfigPlanilla, seedConfigPlanilla } from '@/modules/planilla/planilla.repository';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (_req: NextRequest, ctx) => {
const config = await getConfigPlanilla(ctx.tenantId);
  return NextResponse.json(config.map(c => ({
    ...c,
    valor:      c.valor.toNumber(),
    topeMaximo: c.topeMaximo?.toNumber() ?? null,
  })));
}, { requiredModule: 'planilla' })

export const PUT = withTenantAuth(async (req: NextRequest, ctx) => {
  const items = await req.json();
  await upsertConfigPlanilla(ctx.tenantId, items);
  return NextResponse.json({ ok: true });
}, { requiredModule: 'planilla' })

export const POST = withTenantAuth(async (_req: NextRequest, ctx) => {
  await seedConfigPlanilla(ctx.tenantId);
  return NextResponse.json({ ok: true });
}, { requiredModule: 'planilla' })
