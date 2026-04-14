import { NextRequest, NextResponse } from 'next/server';
import { validateSuperadminKey, unauthorizedResponse } from '@/lib/superadmin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  if (!validateSuperadminKey(req)) return unauthorizedResponse();

  const plans = await prisma.barberPlanConfig.findMany({
    orderBy: { id: 'asc' },
  });

  return NextResponse.json(plans);
}
