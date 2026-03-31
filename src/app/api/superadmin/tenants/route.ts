import { NextRequest, NextResponse } from 'next/server';
import { validateSuperadminKey, unauthorizedResponse } from '@/lib/superadmin-auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import type { BarberPlan, BarberTenantStatus } from '@prisma/client';

const TENANT_SELECT = {
  id: true, slug: true, name: true, plan: true, status: true,
  trialEndsAt: true, paidUntil: true, suspendedAt: true,
  maxBarbers: true, email: true, phone: true, city: true, country: true,
  logoUrl: true, createdAt: true, updatedAt: true,
  _count: { select: { users: true, barbers: true, appointments: true } },
} as const;

export async function GET(req: NextRequest) {
  if (!validateSuperadminKey(req)) return unauthorizedResponse();

  const { searchParams } = req.nextUrl;
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') as BarberTenantStatus | null;
  const plan   = searchParams.get('plan')   as BarberPlan | null;
  const page   = Math.max(1, Number(searchParams.get('page')  ?? 1));
  const limit  = Math.min(100, Number(searchParams.get('limit') ?? 50));

  const where = {
    deletedAt: null,
    ...(search && { OR: [
      { name: { contains: search, mode: 'insensitive' as const } },
      { slug: { contains: search, mode: 'insensitive' as const } },
      { email: { contains: search, mode: 'insensitive' as const } },
    ]}),
    ...(status && { status }),
    ...(plan   && { plan }),
  };

  const [items, total] = await Promise.all([
    prisma.barberTenant.findMany({
      where, select: TENANT_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit, take: limit,
    }),
    prisma.barberTenant.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  if (!validateSuperadminKey(req)) return unauthorizedResponse();

  const body = await req.json() as {
    name: string; slug: string; email?: string; phone?: string; city?: string;
    plan?: BarberPlan; maxBarbers?: number; paidUntil?: string;
    owner?: { fullName: string; email: string; password: string };
  };

  if (!body.name?.trim() || !body.slug?.trim()) {
    return NextResponse.json({ error: 'name y slug son requeridos' }, { status: 422 });
  }

  if (body.owner) {
    if (!body.owner.fullName?.trim() || !body.owner.email?.trim() || !body.owner.password?.trim()) {
      return NextResponse.json({ error: 'owner requiere fullName, email y password' }, { status: 422 });
    }
  }

  const existing = await prisma.barberTenant.findUnique({ where: { slug: body.slug } });
  if (existing) {
    return NextResponse.json({ error: 'El slug ya está en uso' }, { status: 409 });
  }

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 30);

  const tenant = await prisma.barberTenant.create({
    data: {
      name:       body.name.trim(),
      slug:       body.slug.trim().toLowerCase(),
      email:      body.email,
      phone:      body.phone,
      city:       body.city,
      plan:       body.plan ?? 'TRIAL',
      maxBarbers: body.maxBarbers ?? 3,
      paidUntil:  body.paidUntil ? new Date(body.paidUntil) : undefined,
      trialEndsAt,
    },
    select: TENANT_SELECT,
  });

  if (body.owner) {
    const hashed = await bcrypt.hash(body.owner.password, 10);
    await prisma.barberUser.create({
      data: {
        tenantId: tenant.id,
        fullName: body.owner.fullName.trim(),
        email:    body.owner.email.trim().toLowerCase(),
        password: hashed,
        role:     'OWNER',
      },
    });
  }

  return NextResponse.json(
    { ...tenant, ownerCreated: !!body.owner },
    { status: 201 },
  );
}
