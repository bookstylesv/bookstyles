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
  findClientsWithDescuento,
  type ClientCreateInput,
  type ClientUpdateInput,
} from './clients.repository';
import { prisma } from '@/lib/prisma';

// ── List ──────────────────────────────────────────────────

export async function listClients(tenantId: number) {
  return findAllClients(tenantId);
}

// ── List with descuento (para POS) ───────────────────────

export async function listClientsWithDescuento(tenantId: number) {
  return findClientsWithDescuento(tenantId);
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

  // Email opcional — si no viene se auto-genera uno interno no usable para login
  const emailRaw = data.email && typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  const emailFinal = emailRaw && emailRaw.includes('@')
    ? emailRaw
    : `noemail-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@interno.noemail`;

  const tipoDocumento = data.tipoDocumento ? String(data.tipoDocumento).trim() : undefined;
  const numDocumento  = data.numDocumento  ? String(data.numDocumento).trim()  : undefined;

  // Si viene NIT (36) sin NRC, es válido (NRC es opcional)
  // Si viene tipoDocumento, debe venir numDocumento
  if (tipoDocumento && !numDocumento) {
    throw new ValidationError('Si especifica tipo de documento, debe ingresar el número de documento');
  }

  // Validar descuento
  const descuentoTipo  = data.descuentoTipo  ? String(data.descuentoTipo).trim()  : undefined;
  const descuentoValor = data.descuentoValor != null ? Number(data.descuentoValor) : undefined;
  if (descuentoTipo) {
    if (!['PORCENTAJE', 'MONTO'].includes(descuentoTipo))
      throw new ValidationError('Tipo de descuento inválido');
    if (!descuentoValor || descuentoValor <= 0)
      throw new ValidationError('El valor del descuento debe ser mayor a 0');
    if (descuentoTipo === 'PORCENTAJE' && descuentoValor > 100)
      throw new ValidationError('El porcentaje no puede superar 100');
  }

  const input: ClientCreateInput = {
    fullName:        String(data.fullName).trim(),
    email:           emailFinal,
    phone:           data.phone ? String(data.phone).trim() : undefined,
    password:        data.password ? String(data.password) : undefined,
    tipoDocumento,
    numDocumento,
    nrc:             data.nrc             ? String(data.nrc).trim()             : undefined,
    nombreComercial: data.nombreComercial ? String(data.nombreComercial).trim() : undefined,
    departamentoCod: data.departamentoCod ? String(data.departamentoCod).trim() : undefined,
    municipioCod:    data.municipioCod    ? String(data.municipioCod).trim()    : undefined,
    complemento:     data.complemento     ? String(data.complemento).trim()     : undefined,
    descuentoTipo,
    descuentoValor,
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

  // Si cambia el email (y no es un email interno auto-generado), verificar unicidad
  if (data.email && typeof data.email === 'string' && data.email.includes('@') && !data.email.includes('@interno.noemail')) {
    const email = data.email.trim().toLowerCase();
    const conflict = await prisma.barberUser.findFirst({
      where: { tenantId, email, NOT: { id } },
      select: { id: true },
    });
    if (conflict) throw new ConflictError('Ese email ya está en uso por otro usuario');
  }

  // Validar descuento si se está cambiando
  if (data.descuentoTipo !== undefined) {
    const dTipo  = data.descuentoTipo  ? String(data.descuentoTipo).trim()  : undefined;
    const dValor = data.descuentoValor != null ? Number(data.descuentoValor) : undefined;
    if (dTipo) {
      if (!['PORCENTAJE', 'MONTO'].includes(dTipo))
        throw new ValidationError('Tipo de descuento inválido');
      if (!dValor || dValor <= 0)
        throw new ValidationError('El valor del descuento debe ser mayor a 0');
      if (dTipo === 'PORCENTAJE' && dValor > 100)
        throw new ValidationError('El porcentaje no puede superar 100');
    }
  }

  const input: ClientUpdateInput = {
    ...(data.fullName        ? { fullName:        String(data.fullName).trim() } : {}),
    ...(data.email           ? { email:           String(data.email).trim().toLowerCase() } : {}),
    ...(data.phone           !== undefined ? { phone:           data.phone           ? String(data.phone).trim()           : undefined } : {}),
    ...(data.tipoDocumento   !== undefined ? { tipoDocumento:   data.tipoDocumento   ? String(data.tipoDocumento).trim()   : undefined } : {}),
    ...(data.numDocumento    !== undefined ? { numDocumento:    data.numDocumento    ? String(data.numDocumento).trim()    : undefined } : {}),
    ...(data.nrc             !== undefined ? { nrc:             data.nrc             ? String(data.nrc).trim()             : undefined } : {}),
    ...(data.nombreComercial !== undefined ? { nombreComercial: data.nombreComercial ? String(data.nombreComercial).trim() : undefined } : {}),
    ...(data.departamentoCod !== undefined ? { departamentoCod: data.departamentoCod ? String(data.departamentoCod).trim() : undefined } : {}),
    ...(data.municipioCod    !== undefined ? { municipioCod:    data.municipioCod    ? String(data.municipioCod).trim()    : undefined } : {}),
    ...(data.complemento     !== undefined ? { complemento:     data.complemento     ? String(data.complemento).trim()     : undefined } : {}),
    ...(data.descuentoTipo   !== undefined ? { descuentoTipo:   data.descuentoTipo   ? String(data.descuentoTipo).trim()   : undefined } : {}),
    ...(data.descuentoValor  !== undefined ? { descuentoValor:  data.descuentoValor  != null ? Number(data.descuentoValor) : undefined } : {}),
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
