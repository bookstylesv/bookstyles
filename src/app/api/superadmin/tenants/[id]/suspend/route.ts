import { NextRequest, NextResponse } from 'next/server';
import { validateSuperadminKey, unauthorizedResponse } from '@/lib/superadmin-auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!validateSuperadminKey(req)) return unauthorizedResponse();

  const { id } = await params;
  const tenant = await prisma.barberTenant.findUnique({ where: { id: Number(id), deletedAt: null } });
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await prisma.barberTenant.update({
    where: { id: Number(id) },
    data:  { status: 'SUSPENDED', suspendedAt: new Date() },
    select: { id: true, slug: true, name: true, status: true },
  });

  return NextResponse.json(updated);
}
