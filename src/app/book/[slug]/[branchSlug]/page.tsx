/**
 * /book/[slug]/[branchSlug] — Booking público para una sucursal específica.
 * Pre-selecciona la sucursal y filtra los barberos a los asignados en ella.
 */

import { notFound }     from 'next/navigation';
import { prisma }       from '@/lib/prisma';
import BookingWidget    from '@/components/booking/BookingWidget';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string; branchSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, branchSlug } = await params;
  const branch = await prisma.barberBranch.findFirst({
    where: { slug: branchSlug, tenant: { slug } },
    select: { name: true, tenant: { select: { name: true } } },
  });
  return {
    title: branch
      ? `Reservar cita — ${branch.name} · ${branch.tenant.name}`
      : 'Reservar cita',
  };
}

export default async function BranchBookPage({ params }: Props) {
  const { slug, branchSlug } = await params;

  const tenant = await prisma.barberTenant.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, phone: true, address: true, city: true, logoUrl: true },
  });
  if (!tenant) notFound();

  const branch = await prisma.barberBranch.findFirst({
    where: { tenantId: tenant.id, slug: branchSlug, status: 'ACTIVE' },
    select: { id: true, name: true, slug: true, address: true, city: true, phone: true, isHeadquarters: true },
  });
  if (!branch) notFound();

  // Todas las sucursales activas (para el selector en el widget)
  const branches = await prisma.barberBranch.findMany({
    where:   { tenantId: tenant.id, status: 'ACTIVE' },
    select:  { id: true, name: true, slug: true, address: true, city: true, phone: true, isHeadquarters: true },
    orderBy: [{ isHeadquarters: 'desc' }, { name: 'asc' }],
  });

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

  const servicesSer = services.map(s => ({ ...s, price: Number(s.price) }));

  const barbersSer = assignments
    .filter(a => a.barber?.active)
    .map(a => ({
      id:          a.barber.id,
      name:        a.barber.user.fullName,
      avatarUrl:   a.barber.user.avatarUrl ?? null,
      specialties: a.barber.specialties,
      branchIds:   a.barber.branchAssignments.map(x => x.branchId),
    }));

  return (
    <BookingWidget
      tenant={{
        name:    tenant.name,
        slug:    tenant.slug,
        // Datos de la sucursal tienen prioridad
        phone:   branch.phone   ?? tenant.phone   ?? null,
        address: branch.address ?? tenant.address ?? null,
        city:    branch.city    ?? tenant.city    ?? null,
        logoUrl: tenant.logoUrl ?? null,
      }}
      services={servicesSer}
      barbers={barbersSer}
      branches={branches}
      initialBranchId={branch.id}
    />
  );
}
