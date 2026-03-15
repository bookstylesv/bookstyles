/**
 * barbers.repository.ts — Capa de acceso a datos para Barber.
 * Incluye relaciones: user, schedules.
 */

import { prisma } from '@/lib/prisma';

export async function findAllBarbers(tenantId: number) {
  return prisma.barber.findMany({
    where: { tenantId },
    include: {
      user: {
        select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true, active: true },
      },
      schedules: {
        where: { active: true },
        orderBy: { dayOfWeek: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function findBarberById(id: number, tenantId: number) {
  return prisma.barber.findFirst({
    where: { id, tenantId },
    include: {
      user: {
        select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true, active: true },
      },
      schedules: {
        orderBy: { dayOfWeek: 'asc' },
      },
    },
  });
}

export type BarberUpdateInput = {
  bio?: string;
  specialties?: string[];
  active?: boolean;
};

export type BarberCreateInput = {
  fullName:    string;
  email:       string;
  password:    string;
  phone?:      string;
  bio?:        string;
  specialties?: string[];
};

export async function createBarber(tenantId: number, data: BarberCreateInput) {
  const bcrypt = await import('bcryptjs');
  const hashed = await bcrypt.hash(data.password, 10);

  return prisma.$transaction(async tx => {
    const user = await tx.barberUser.create({
      data: {
        tenantId,
        email:    data.email.toLowerCase().trim(),
        fullName: data.fullName.trim(),
        phone:    data.phone?.trim(),
        password: hashed,
        role:     'BARBER',
        active:   true,
      },
    });

    const barber = await tx.barber.create({
      data: {
        tenantId,
        userId:      user.id,
        bio:         data.bio?.trim(),
        specialties: data.specialties ?? [],
        active:      true,
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true, active: true },
        },
        schedules: { orderBy: { dayOfWeek: 'asc' } },
      },
    });

    return barber;
  });
}

export async function updateBarber(id: number, tenantId: number, data: BarberUpdateInput) {
  return prisma.barber.update({
    where: { id },
    data: {
      ...(data.bio !== undefined && { bio: data.bio }),
      ...(data.specialties !== undefined && { specialties: data.specialties }),
      ...(data.active !== undefined && { active: data.active }),
    },
    include: {
      user: {
        select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true, active: true },
      },
      schedules: { orderBy: { dayOfWeek: 'asc' } },
    },
  });
}
