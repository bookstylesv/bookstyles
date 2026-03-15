/**
 * billing.service.ts — Lógica de negocio para la Caja.
 */

import { NotFoundError, ValidationError, ConflictError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import {
  findAllPayments,
  findPaymentById,
  findUnpaidAppointments,
  createPayment,
  updatePayment,
  getBillingStats,
  type PaymentFilters,
  type PaymentUpdateInput,
} from './billing.repository';
import type { BarberPaymentMethod, BarberPaymentStatus } from '@prisma/client';

const VALID_METHODS  = ['CASH', 'CARD', 'TRANSFER', 'QR']  as const;
const VALID_STATUSES = ['PENDING', 'PAID', 'REFUNDED'] as const;

// ── Helpers ───────────────────────────────────────────────

function serializePayment(p: NonNullable<Awaited<ReturnType<typeof findPaymentById>>>) {
  return {
    ...p,
    amount: p.amount.toNumber(),
    appointment: {
      ...p.appointment,
      service: {
        ...p.appointment.service,
      },
    },
  };
}

// ── List ──────────────────────────────────────────────────

export async function listPayments(tenantId: number, query: Record<string, string> = {}) {
  const filters: PaymentFilters = {};
  if (query.status) filters.status = query.status as BarberPaymentStatus;
  if (query.from)   filters.from   = new Date(query.from);
  if (query.to)     filters.to     = new Date(query.to);

  const payments = await findAllPayments(tenantId, filters);
  return payments.map(serializePayment);
}

// ── Unpaid appointments ───────────────────────────────────

export async function listUnpaidAppointments(tenantId: number) {
  const appts = await findUnpaidAppointments(tenantId);
  return appts.map(a => ({
    ...a,
    service: { ...a.service, price: a.service.price.toNumber() },
  }));
}

// ── Create ────────────────────────────────────────────────

export async function registerPayment(tenantId: number, raw: unknown) {
  const data = raw as Record<string, unknown>;

  if (!data.appointmentId) throw new ValidationError('appointmentId es requerido');
  if (!data.amount || Number(data.amount) <= 0) throw new ValidationError('El monto debe ser mayor a 0');
  if (!data.method || !VALID_METHODS.includes(data.method as BarberPaymentMethod)) {
    throw new ValidationError('Método de pago inválido (CASH | CARD | TRANSFER | QR)');
  }

  const appointmentId = Number(data.appointmentId);

  // Verificar que la cita pertenece al tenant
  const appt = await prisma.barberAppointment.findFirst({
    where: { id: appointmentId, tenantId },
    include: { payment: true },
  });
  if (!appt) throw new NotFoundError('Cita');
  if (appt.payment) throw new ConflictError('Esta cita ya tiene un pago registrado');

  const payment = await createPayment(tenantId, {
    appointmentId,
    amount: Number(data.amount),
    method: data.method as BarberPaymentMethod,
    notes:  data.notes ? String(data.notes) : undefined,
    status: (data.status as BarberPaymentStatus | undefined) ?? 'PAID',
  });

  return serializePayment(payment);
}

// ── Update ────────────────────────────────────────────────

export async function patchPayment(tenantId: number, id: number, raw: unknown) {
  const data = raw as Record<string, unknown>;

  const existing = await findPaymentById(id, tenantId);
  if (!existing) throw new NotFoundError('Pago');

  const update: PaymentUpdateInput = {};
  if (data.method && VALID_METHODS.includes(data.method as BarberPaymentMethod)) {
    update.method = data.method as BarberPaymentMethod;
  }
  if (data.status && VALID_STATUSES.includes(data.status as BarberPaymentStatus)) {
    update.status = data.status as BarberPaymentStatus;
  }
  if (data.notes !== undefined) update.notes = String(data.notes);

  const payment = await updatePayment(id, tenantId, update);
  return serializePayment(payment);
}

// ── Stats ─────────────────────────────────────────────────

export async function getStats(tenantId: number) {
  return getBillingStats(tenantId);
}
