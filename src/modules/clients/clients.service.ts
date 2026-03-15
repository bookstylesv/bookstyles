/**
 * clients.service.ts — Lógica de negocio para Clientes.
 * Valida emails únicos dentro del tenant.
 */

import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import {
  findAllClients,
  findClientById,
  createClient,
  updateClient,
  toggleClientActive,
  deleteClient,
  type ClientCreateInput,
  type ClientUpdateInput,
} from './clients.repository';
import { prisma } from '@/lib/prisma';

// ── List ──────────────────────────────────────────────────

export async function listClients(tenantId: number) {
  return findAllClients(tenantId);
}

// ── Detail ────────────────────────────────────────────────

export async function getClientById(tenantId: number, id: number) {
  const client = await findClientById(id, tenantId);
  if (!client) throw new NotFoundError('Cliente no encontrado');
  return client;
}

// ── Create ────────────────────────────────────────────────

export async function createClientUser(tenantId: number, raw: unknown) {
  const data = raw as Record<string, unknown>;

  if (!data.fullName || typeof data.fullName !== 'string' || !data.fullName.trim()) {
    throw new ValidationError('El nombre es obligatorio');
  }
  if (!data.email || typeof data.email !== 'string' || !data.email.includes('@')) {
    throw new ValidationError('El email no es válido');
  }

  const input: ClientCreateInput = {
    fullName: String(data.fullName).trim(),
    email:    String(data.email).trim().toLowerCase(),
    phone:    data.phone ? String(data.phone).trim() : undefined,
    password: data.password ? String(data.password) : undefined,
  };

  // Email único dentro del tenant
  const exists = await prisma.barberUser.findFirst({
    where: { tenantId, email: input.email },
    select: { id: true },
  });
  if (exists) throw new ConflictError('Ya existe un usuario con ese email en esta barbería');

  return createClient(tenantId, input);
}

// ── Update ────────────────────────────────────────────────

export async function updateClientUser(tenantId: number, id: number, raw: unknown) {
  const data = raw as Record<string, unknown>;

  // Verificar que existe
  const existing = await findClientById(id, tenantId);
  if (!existing) throw new NotFoundError('Cliente no encontrado');

  // Si cambia el email, verificar unicidad
  if (data.email && typeof data.email === 'string') {
    const email = data.email.trim().toLowerCase();
    const conflict = await prisma.barberUser.findFirst({
      where: { tenantId, email, NOT: { id } },
      select: { id: true },
    });
    if (conflict) throw new ConflictError('Ese email ya está en uso por otro usuario');
  }

  const input: ClientUpdateInput = {
    ...(data.fullName ? { fullName: String(data.fullName).trim() } : {}),
    ...(data.email    ? { email:    String(data.email).trim().toLowerCase() } : {}),
    ...(data.phone !== undefined ? { phone: data.phone ? String(data.phone).trim() : undefined } : {}),
  };

  return updateClient(id, tenantId, input);
}

// ── Toggle active ─────────────────────────────────────────

export async function setClientActive(tenantId: number, id: number, active: boolean) {
  const existing = await findClientById(id, tenantId);
  if (!existing) throw new NotFoundError('Cliente no encontrado');
  return toggleClientActive(id, tenantId, active);
}

// ── Delete ────────────────────────────────────────────────

export async function removeClient(tenantId: number, id: number) {
  const existing = await findClientById(id, tenantId);
  if (!existing) throw new NotFoundError('Cliente no encontrado');
  return deleteClient(id, tenantId);
}
