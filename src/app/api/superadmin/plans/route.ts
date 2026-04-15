import { NextRequest, NextResponse } from 'next/server';
import { validateSuperadminKey, unauthorizedResponse } from '@/lib/superadmin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  if (!validateSuperadminKey(req)) return unauthorizedResponse();

  try {
    const plans = await prisma.barberPlanConfig.findMany({
      orderBy: { id: 'asc' },
    });
    return NextResponse.json(plans);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[superadmin/plans GET]', msg);
    return NextResponse.json({ error: 'internal', detail: msg }, { status: 500 });
  }
}
