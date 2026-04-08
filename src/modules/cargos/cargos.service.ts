/**
 * cargos.service.ts — Lógica de negocio para cargos de empleados.
 */

import { ValidationError, NotFoundError, ConflictError } from '@/lib/errors';
import * as repo from './cargos.repository';

export async function listCargos(tenantId: number) {
  return repo.findAllCargos(tenantId);
}

export async function createCargo(tenantId: number, raw: unknown) {
  const data = raw as Record<string, unknown>;
  if (!data.nombre || String(data.nombre).trim() === '') {
    throw new ValidationError('El nombre del cargo es requerido');
  }
  try {
    return await repo.createCargo(tenantId, {
      nombre:      String(data.nombre).trim(),
      descripcion: data.descripcion ? String(data.descripcion).trim() : null,
    });
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2002') {
      throw new ConflictError('Ya existe un cargo con ese nombre');
    }
    throw err;
  }
}

export async function updateCargo(id: number, tenantId: number, raw: unknown) {
  const existing = await repo.findCargoById(id, tenantId);
  if (!existing) throw new NotFoundError('Cargo');

  const data = raw as Record<string, unknown>;
  return repo.updateCargo(id, tenantId, {
    ...(data.nombre      !== undefined && { nombre:      String(data.nombre).trim() }),
    ...(data.descripcion !== undefined && { descripcion: data.descripcion ? String(data.descripcion).trim() : null }),
    ...(data.activo      !== undefined && { activo:      Boolean(data.activo) }),
  });
}

export async function deleteCargo(id: number, tenantId: number) {
  const existing = await repo.findCargoById(id, tenantId);
  if (!existing) throw new NotFoundError('Cargo');
  await repo.deleteCargo(id, tenantId);
  return { deleted: true };
}
