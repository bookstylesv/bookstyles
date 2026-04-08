/**
 * cargos.repository.ts — Acceso a datos para cargos de empleados.
 */

import { prisma } from '@/lib/prisma';

export async function findAllCargos(tenantId: number) {
  return prisma.barberCargo.findMany({
    where:   { tenantId },
    orderBy: { nombre: 'asc' },
  });
}

export async function findCargoById(id: number, tenantId: number) {
  return prisma.barberCargo.findFirst({ where: { id, tenantId } });
}

export async function createCargo(tenantId: number, data: { nombre: string; descripcion?: string | null }) {
  return prisma.barberCargo.create({ data: { tenantId, ...data } });
}

export async function updateCargo(id: number, tenantId: number, data: { nombre?: string; descripcion?: string | null; activo?: boolean }) {
  return prisma.barberCargo.update({ where: { id }, data: { ...data, updatedAt: new Date() } });
}

export async function deleteCargo(id: number, tenantId: number) {
  return prisma.barberCargo.delete({ where: { id, tenantId } });
}
