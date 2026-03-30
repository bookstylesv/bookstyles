import { NextRequest, NextResponse } from 'next/server';
import { validateSuperadminKey, unauthorizedResponse } from '@/lib/superadmin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  if (!validateSuperadminKey(req)) return unauthorizedResponse();

  const [total, byStatus, byPlan] = await Promise.all([
    prisma.barberTenant.count({ where: { deletedAt: null } }),
    prisma.barberTenant.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { id: true },
    }),
    prisma.barberTenant.groupBy({
      by: ['plan'],
      where: { deletedAt: null },
      _count: { id: true },
    }),
  ]);

  const statusMap = Object.fromEntries(byStatus.map(r => [r.status, r._count.id]));
  const planMap   = Object.fromEntries(byPlan.map(r => [r.plan, r._count.id]));

  return NextResponse.json({
    total,
    activos:    statusMap['ACTIVE']    ?? 0,
    en_trial:   statusMap['TRIAL']     ?? 0,
    suspendidos:statusMap['SUSPENDED'] ?? 0,
    cancelados: statusMap['CANCELLED'] ?? 0,
    por_plan:   planMap,
  });
}
