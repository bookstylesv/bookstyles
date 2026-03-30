import { NextRequest, NextResponse } from 'next/server';
import { validateSuperadminKey, unauthorizedResponse } from '@/lib/superadmin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!validateSuperadminKey(req)) return unauthorizedResponse();

  const { id } = await params;
  const barbers = await prisma.barber.findMany({
    where:   { tenantId: Number(id) },
    select:  { id: true, specialties: true, active: true, createdAt: true, user: { select: { fullName: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(barbers);
}
