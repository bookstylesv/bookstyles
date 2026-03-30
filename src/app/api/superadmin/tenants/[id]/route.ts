import { NextRequest, NextResponse } from 'next/server';
import { validateSuperadminKey, unauthorizedResponse } from '@/lib/superadmin-auth';
import { prisma } from '@/lib/prisma';
import type { BarberPlan, BarberTenantStatus } from '@prisma/client';

const TENANT_SELECT = {
  id: true, slug: true, name: true, plan: true, status: true,
  trialEndsAt: true, paidUntil: true, suspendedAt: true,
  maxBarbers: true, email: true, phone: true, city: true, country: true,
  logoUrl: true, createdAt: true, updatedAt: true,
  _count: { select: { users: true, barbers: true, appointments: true } },
} as const;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!validateSuperadminKey(req)) return unauthorizedResponse();

  const { id } = await params;
  const tenant = await prisma.barberTenant.findUnique({
    where: { id: Number(id), deletedAt: null },
    select: TENANT_SELECT,
  });

  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(tenant);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!validateSuperadminKey(req)) return unauthorizedResponse();

  const { id } = await params;
  const body = await req.json() as {
    name?:        string;
    slug?:        string;
    email?:       string;
    phone?:       string;
    city?:        string;
    country?:     string;
    logoUrl?:     string;
    plan?:        BarberPlan;
    status?:      BarberTenantStatus;
    maxBarbers?:  number;
    paidUntil?:   string | null;
    trialEndsAt?: string | null;
  };

  const tenant = await prisma.barberTenant.findUnique({ where: { id: Number(id), deletedAt: null } });
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await prisma.barberTenant.update({
    where: { id: Number(id) },
    data: {
      ...(body.name       !== undefined && { name:       body.name }),
      ...(body.slug       !== undefined && { slug:       body.slug.toLowerCase() }),
      ...(body.email      !== undefined && { email:      body.email }),
      ...(body.phone      !== undefined && { phone:      body.phone }),
      ...(body.city       !== undefined && { city:       body.city }),
      ...(body.country    !== undefined && { country:    body.country }),
      ...(body.logoUrl    !== undefined && { logoUrl:    body.logoUrl }),
      ...(body.plan       !== undefined && { plan:       body.plan }),
      ...(body.status     !== undefined && { status:     body.status }),
      ...(body.maxBarbers !== undefined && { maxBarbers: body.maxBarbers }),
      ...(body.paidUntil  !== undefined && { paidUntil:  body.paidUntil ? new Date(body.paidUntil) : null }),
      ...(body.trialEndsAt !== undefined && { trialEndsAt: body.trialEndsAt ? new Date(body.trialEndsAt) : null }),
    },
    select: TENANT_SELECT,
  });

  return NextResponse.json(updated);
}
