/**
 * GET /api/book/[slug]/[branchSlug]
 * Datos públicos filtrados para una sucursal específica:
 * - Mismos servicios (catálogo compartido)
 * - Solo los barberos asignados a esa sucursal
 * - Datos de contacto de la sucursal (teléfono, dirección)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ slug: string; branchSlug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug, branchSlug } = await params;

  if (!/^[a-z0-9-]{2,50}$/.test(slug) || !/^[a-z0-9-]{2,50}$/.test(branchSlug)) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }

  const tenant = await prisma.barberTenant.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, phone: true, address: true, city: true, logoUrl: true },
  });
  if (!tenant) return NextResponse.json({ error: 'Barbería no encontrada' }, { status: 404 });

  const branch = await prisma.barberBranch.findFirst({
    where: { tenantId: tenant.id, slug: branchSlug, status: 'ACTIVE' },
    select: { id: true, name: true, slug: true, address: true, city: true, phone: true, isHeadquarters: true },
  });
  if (!branch) return NextResponse.json({ error: 'Sucursal no encontrada' }, { status: 404 });

  const [services, assignments] = await Promise.all([
    prisma.barberService.findMany({
      where:   { tenantId: tenant.id, active: true },
      select:  { id: true, name: true, description: true, price: true, duration: true, category: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    }),
    prisma.barberBranchAssignment.findMany({
      where: { branchId: branch.id },
      include: {
        barber: {
          select: {
            id: true, specialties: true, active: true,
            user: { select: { fullName: true, avatarUrl: true } },
            branchAssignments: { select: { branchId: true } },
          },
        },
      },
    }),
  ]);

  // Solo barberos activos asignados a esta sucursal
  const barbers = assignments
    .filter(a => a.barber?.active)
    .map(a => ({
      id:         a.barber.id,
      name:       a.barber.user.fullName,
      avatarUrl:  a.barber.user.avatarUrl ?? null,
      specialties: a.barber.specialties,
      branchIds:  a.barber.branchAssignments.map(x => x.branchId),
    }));

  return NextResponse.json({
    tenant: {
      ...tenant,
      // Datos de contacto de la sucursal tienen prioridad sobre los del tenant
      phone:   branch.phone   ?? tenant.phone,
      address: branch.address ?? tenant.address,
      city:    branch.city    ?? tenant.city,
    },
    branch,
    services: services.map(s => ({ ...s, price: Number(s.price) })),
    barbers,
  });
}
