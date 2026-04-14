/**
 * /book/[slug] — Página pública de reservas. No requiere login.
 */
import { notFound }     from 'next/navigation';
import { prisma }       from '@/lib/prisma';
import BookingWidget    from '@/components/booking/BookingWidget';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await prisma.barberTenant.findUnique({
    where: { slug },
    select: { name: true },
  });
  return {
    title: tenant ? `Reservar cita — ${tenant.name}` : 'Reservar cita',
  };
}

export default async function BookPage({ params }: Props) {
  const { slug } = await params;

  const tenant = await prisma.barberTenant.findUnique({
    where: { slug },
    select: {
      id: true, name: true, slug: true,
      phone: true, address: true, city: true, logoUrl: true,
    },
  });
  if (!tenant) notFound();

  const [services, barbers, branches] = await Promise.all([
    prisma.barberService.findMany({
      where:   { tenantId: tenant.id, active: true },
      select:  { id: true, name: true, description: true, price: true, duration: true, category: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    }),
    prisma.barber.findMany({
      where:   { tenantId: tenant.id, active: true },
      include: {
        user: { select: { fullName: true, avatarUrl: true } },
        branchAssignments: { select: { branchId: true } },
      },
      orderBy: { id: 'asc' },
    }),
    prisma.barberBranch.findMany({
      where:   { tenantId: tenant.id, status: 'ACTIVE' },
      select:  { id: true, name: true, slug: true, address: true, city: true, phone: true, isHeadquarters: true },
      orderBy: [{ isHeadquarters: 'desc' }, { name: 'asc' }],
    }),
  ]);

  const servicesSer = services.map(s => ({ ...s, price: Number(s.price) }));

  const barbersSer = barbers.map(b => ({
    id:          b.id,
    name:        b.user.fullName,
    avatarUrl:   b.user.avatarUrl ?? null,
    specialties: b.specialties,
    branchIds:   b.branchAssignments.map(a => a.branchId),
  }));

  return (
    <BookingWidget
      tenant={{
        name:    tenant.name,
        slug:    tenant.slug,
        phone:   tenant.phone ?? null,
        address: tenant.address ?? null,
        city:    tenant.city ?? null,
        logoUrl: tenant.logoUrl ?? null,
      }}
      services={servicesSer}
      barbers={barbersSer}
      branches={branches}
    />
  );
}
