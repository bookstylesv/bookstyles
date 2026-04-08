/**
 * services.repository.ts — Capa de acceso a datos para BarberService.
 * Todas las queries filtran por tenantId.
 */

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export type ServiceCreateInput = {
  name: string;
  description?: string;
  price: number;
  comisionTipo?: string;
  comisionBarbero?: number;
  duration: number;
  category?: string;
  active?: boolean;
};

export type ServiceUpdateInput = Partial<ServiceCreateInput>;

export async function findAllServices(tenantId: number) {
  return prisma.barberService.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findServiceById(id: number, tenantId: number) {
  return prisma.barberService.findFirst({
    where: { id, tenantId },
  });
}

export async function createService(tenantId: number, data: ServiceCreateInput) {
  return prisma.barberService.create({
    data: {
      tenantId,
      name: data.name,
      description: data.description,
      price: data.price,
      comisionTipo: data.comisionTipo ?? 'NINGUNA',
      comisionBarbero: data.comisionBarbero ?? 0,
      duration: data.duration,
      category: data.category,
      active: data.active ?? true,
    },
  });
}

export async function updateService(
  id: number,
  tenantId: number,
  data: ServiceUpdateInput,
) {
  return prisma.barberService.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.price !== undefined && { price: data.price }),
      ...(data.comisionTipo !== undefined && { comisionTipo: data.comisionTipo }),
      ...(data.comisionBarbero !== undefined && { comisionBarbero: data.comisionBarbero }),
      ...(data.duration !== undefined && { duration: data.duration }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.active !== undefined && { active: data.active }),
    },
  });
}

export async function deleteService(id: number, tenantId: number) {
  // Soft-delete: desactivar en lugar de borrar si tiene citas
  const hasAppointments = await prisma.barberAppointment.count({
    where: { serviceId: id, tenantId },
  });
  if (hasAppointments > 0) {
    return prisma.barberService.update({
      where: { id },
      data: { active: false },
    });
  }
  return prisma.barberService.delete({ where: { id } });
}
