/**
 * branches.repository.ts — Capa de datos para BarberBranch y BarberBranchAssignment.
 * Todas las queries filtran por tenantId.
 */

import { prisma } from '@/lib/prisma';

// ── Tipos ────────────────────────────────────────────────────────────────────

export type BranchCreateInput = {
  name: string;
  slug: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  businessHours?: object;
  managerId?: number | null;
};

export type BranchUpdateInput = Partial<Omit<BranchCreateInput, 'slug'>> & {
  status?: 'ACTIVE' | 'INACTIVE';
};

// ── Queries ──────────────────────────────────────────────────────────────────

export async function findAllBranches(tenantId: number) {
  return prisma.barberBranch.findMany({
    where: { tenantId },
    include: {
      _count: {
        select: {
          appointments: true,
          ventas: true,
          barberAssignments: true,
        },
      },
    },
    orderBy: [{ isHeadquarters: 'desc' }, { createdAt: 'asc' }],
  });
}

export async function findActiveBranches(tenantId: number) {
  return prisma.barberBranch.findMany({
    where: { tenantId, status: 'ACTIVE' },
    select: { id: true, name: true, slug: true, isHeadquarters: true, city: true },
    orderBy: [{ isHeadquarters: 'desc' }, { name: 'asc' }],
  });
}

export async function findBranchById(id: number, tenantId: number) {
  return prisma.barberBranch.findFirst({
    where: { id, tenantId },
    include: {
      barberAssignments: {
        include: {
          barber: { include: { user: { select: { id: true, fullName: true } } } },
        },
      },
      _count: {
        select: { appointments: true, ventas: true, barberAssignments: true },
      },
    },
  });
}

export async function findBranchBySlug(slug: string, tenantId: number) {
  return prisma.barberBranch.findFirst({
    where: { slug, tenantId },
    select: { id: true, name: true, slug: true, status: true, isHeadquarters: true },
  });
}

export async function countBranches(tenantId: number) {
  return prisma.barberBranch.count({ where: { tenantId, status: 'ACTIVE' } });
}

export async function createBranch(tenantId: number, data: BranchCreateInput) {
  return prisma.barberBranch.create({
    data: {
      tenantId,
      name: data.name,
      slug: data.slug,
      address: data.address ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      city: data.city ?? null,
      businessHours: (data.businessHours as object) ?? [],
      managerId: data.managerId ?? null,
      status: 'ACTIVE',
      isHeadquarters: false,
    },
  });
}

export async function updateBranch(id: number, tenantId: number, data: BranchUpdateInput) {
  return prisma.barberBranch.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.businessHours !== undefined && { businessHours: data.businessHours as object }),
      ...(data.managerId !== undefined && { managerId: data.managerId }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });
}

export async function deleteBranch(id: number, tenantId: number) {
  return prisma.barberBranch.delete({ where: { id } });
}

export async function hasBranchData(id: number, tenantId: number): Promise<boolean> {
  const branch = await prisma.barberBranch.findFirst({
    where: { id, tenantId },
    select: {
      _count: {
        select: { appointments: true, ventas: true, gastos: true },
      },
    },
  });
  if (!branch) return false;
  const c = branch._count;
  return c.appointments > 0 || c.ventas > 0 || c.gastos > 0;
}

// ── Asignaciones de barberos ──────────────────────────────────────────────────

export async function assignBarberToBranch(branchId: number, barberId: number, isPrimary = false) {
  return prisma.barberBranchAssignment.upsert({
    where: { branchId_barberId: { branchId, barberId } },
    create: { branchId, barberId, isPrimary },
    update: { isPrimary },
  });
}

export async function removeBarberFromBranch(branchId: number, barberId: number) {
  return prisma.barberBranchAssignment.delete({
    where: { branchId_barberId: { branchId, barberId } },
  });
}

export async function getBarbersForBranch(branchId: number) {
  return prisma.barberBranchAssignment.findMany({
    where: { branchId },
    include: {
      barber: { include: { user: { select: { id: true, fullName: true, email: true } } } },
    },
  });
}
