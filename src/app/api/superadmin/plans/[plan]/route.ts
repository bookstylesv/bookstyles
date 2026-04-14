import { NextRequest, NextResponse } from 'next/server';
import { validateSuperadminKey, unauthorizedResponse } from '@/lib/superadmin-auth';
import { prisma } from '@/lib/prisma';
import type { BarberPlan } from '@prisma/client';

const VALID_PLANS: BarberPlan[] = ['TRIAL', 'BASIC', 'PRO', 'ENTERPRISE'];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ plan: string }> },
) {
  if (!validateSuperadminKey(req)) return unauthorizedResponse();

  const { plan } = await params;
  const upper = plan.toUpperCase() as BarberPlan;
  if (!VALID_PLANS.includes(upper)) {
    return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });
  }

  const config = await prisma.barberPlanConfig.findUnique({ where: { plan: upper } });
  if (!config) {
    return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });
  }

  return NextResponse.json(config);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ plan: string }> },
) {
  if (!validateSuperadminKey(req)) return unauthorizedResponse();

  const { plan } = await params;
  const upper = plan.toUpperCase() as BarberPlan;
  if (!VALID_PLANS.includes(upper)) {
    return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });
  }

  const body = await req.json() as {
    displayName?: string;
    description?: string;
    maxBarbers?: number;
    maxBranches?: number;
    modules?: Record<string, boolean>;
    price?: number | null;
    active?: boolean;
  };

  const updated = await prisma.barberPlanConfig.update({
    where: { plan: upper },
    data: {
      ...(body.displayName !== undefined && { displayName: body.displayName }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.maxBarbers !== undefined && { maxBarbers: body.maxBarbers }),
      ...(body.maxBranches !== undefined && { maxBranches: body.maxBranches }),
      ...(body.modules !== undefined && { modules: body.modules }),
      ...(body.price !== undefined && { price: body.price }),
      ...(body.active !== undefined && { active: body.active }),
    },
  });

  return NextResponse.json(updated);
}
