import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getConfigPlanilla, upsertConfigPlanilla, seedConfigPlanilla } from '@/modules/planilla/planilla.repository';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const config = await getConfigPlanilla(user.tenantId);
  return NextResponse.json(config.map(c => ({
    ...c,
    valor:      c.valor.toNumber(),
    topeMaximo: c.topeMaximo?.toNumber() ?? null,
  })));
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const items = await req.json();
  await upsertConfigPlanilla(user.tenantId, items);
  return NextResponse.json({ ok: true });
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user || !['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  await seedConfigPlanilla(user.tenantId);
  return NextResponse.json({ ok: true });
}
