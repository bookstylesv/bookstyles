import { NextRequest, NextResponse } from 'next/server';
import { validateSuperadminKey, unauthorizedResponse } from '@/lib/superadmin-auth';
import { prisma } from '@/lib/prisma';
import type { BarberPlan } from '@prisma/client';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!validateSuperadminKey(req)) return unauthorizedResponse();

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { plan?: BarberPlan; paidUntil?: string };

  const tenant = await prisma.barberTenant.findUnique({ where: { id: Number(id), deletedAt: null } });
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await prisma.barberTenant.update({
    where: { id: Number(id) },
    data:  {
      status:      'ACTIVE',
      suspendedAt: null,
      ...(body.plan     && { plan:     body.plan }),
      ...(body.paidUntil && { paidUntil: new Date(body.paidUntil) }),
    },
    select: { id: true, slug: true, name: true, status: true, plan: true, paidUntil: true },
  });

  return NextResponse.json(updated);
}
