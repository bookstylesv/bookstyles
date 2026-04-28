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
      schedules:      { orderBy: { dayOfWeek: 'asc' } },
      configPlanilla: true,
    },
  });
}

export type BarberUpdateInput = {
  bio?: string;
  cargo?: string;
  specialties?: string[];
  active?: boolean;
};

export type BarberCreateInput = {
  fullName:    string;
  email:       string;
  password?:   string; // Opcional — se genera automáticamente si no se provee
  phone?:      string;
  bio?:        string;
  cargo?:      string;
  specialties?: string[];
};

/** Genera una contraseña temporal segura de 10 caracteres */
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function createBarber(tenantId: number, data: BarberCreateInput) {
  const bcrypt = await import('bcryptjs');
  const tempPassword = data.password ? null : generateTempPassword();
  const rawPassword  = data.password ?? tempPassword!;
  const hashed = await bcrypt.hash(rawPassword, 10);

  return prisma.$transaction(async tx => {
    const user = await tx.barberUser.create({
      data: {
        tenantId,
        email:    data.email.toLowerCase().trim(),
        fullName: data.fullName.trim(),
        phone:    data.phone?.trim(),
        password: hashed,
        role:     'CLIENT', // Barberos como entidad de datos — no usan el ERP
        active:   true,
      },
    });

    const barber = await tx.barber.create({
      data: {
        tenantId,
        userId:      user.id,
        bio:         data.bio?.trim(),
        cargo:       data.cargo?.trim() || 'Barbero',
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

    return { barber, tempPassword };
  });
}

export async function updateBarber(id: number, tenantId: number, data: BarberUpdateInput) {
  return prisma.barber.update({
    where: { id },
    data: {
      ...(data.bio !== undefined && { bio: data.bio }),
      ...(data.cargo !== undefined && { cargo: data.cargo }),
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
