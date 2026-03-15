/**
 * services.service.ts — Lógica de negocio para servicios.
 * Valida datos antes de pasar al repositorio.
 */

import { NotFoundError, ValidationError } from '@/lib/errors';
import * as repo from './services.repository';

export async function listServices(tenantId: number) {
  const services = await repo.findAllServices(tenantId);
  return services.map(s => ({
    ...s,
    price: s.price.toNumber(),
  }));
}

export async function getService(id: number, tenantId: number) {
  const service = await repo.findServiceById(id, tenantId);
  if (!service) throw new NotFoundError('Servicio');
  return { ...service, price: service.price.toNumber() };
}

export async function createService(tenantId: number, body: unknown) {
  const data = validateServiceBody(body);
  const created = await repo.createService(tenantId, data);
  return { ...created, price: created.price.toNumber() };
}

export async function updateService(id: number, tenantId: number, body: unknown) {
  const existing = await repo.findServiceById(id, tenantId);
  if (!existing) throw new NotFoundError('Servicio');

  const data = validateServiceBody(body, true);
  const updated = await repo.updateService(id, tenantId, data);
  return { ...updated, price: updated.price.toNumber() };
}

export async function removeService(id: number, tenantId: number) {
  const existing = await repo.findServiceById(id, tenantId);
  if (!existing) throw new NotFoundError('Servicio');
  return repo.deleteService(id, tenantId);
}

// ── Validation ────────────────────────────────────────

const VALID_CATEGORIES = ['cabello', 'barba', 'combo', 'tratamiento'] as const;

function validateServiceBody(body: unknown, partial = false) {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Cuerpo inválido');
  }
  const b = body as Record<string, unknown>;

  if (!partial && !b.name) throw new ValidationError('El nombre es requerido');
  if (b.name !== undefined && typeof b.name !== 'string') {
    throw new ValidationError('Nombre inválido');
  }
  if (!partial && b.price === undefined) throw new ValidationError('El precio es requerido');
  if (b.price !== undefined && (typeof b.price !== 'number' || b.price < 0)) {
    throw new ValidationError('Precio inválido');
  }
  if (!partial && b.duration === undefined) throw new ValidationError('La duración es requerida');
  if (b.duration !== undefined && (typeof b.duration !== 'number' || b.duration < 1)) {
    throw new ValidationError('Duración inválida (mínimo 1 minuto)');
  }
  if (b.category !== undefined && !VALID_CATEGORIES.includes(b.category as never)) {
    throw new ValidationError(`Categoría inválida. Use: ${VALID_CATEGORIES.join(', ')}`);
  }

  return {
    name: b.name as string,
    description: b.description as string | undefined,
    price: b.price as number,
    duration: b.duration as number,
    category: b.category as string | undefined,
    active: b.active as boolean | undefined,
  };
}
