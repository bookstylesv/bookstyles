import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { aprobarPlanilla } from '@/modules/planilla/planilla.repository';

export async function PATCH(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;
  await aprobarPlanilla(user.tenantId, parseInt(id));
  return NextResponse.json({ ok: true });
}
