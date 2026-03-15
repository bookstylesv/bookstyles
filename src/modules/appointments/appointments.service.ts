/**
 * appointments.service.ts — Lógica de negocio para citas.
 */

import { NotFoundError, ValidationError } from '@/lib/errors';
import { addMinutes } from 'date-fns';
import * as repo from './appointments.repository';
import type { BarberAppointmentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function listAppointments(tenantId: number, query: Record<string, string> = {}) {
  const filters: repo.AppointmentFilters = {};
  if (query.status) filters.status = query.status as BarberAppointmentStatus;
  if (query.barberId) filters.barberId = Number(query.barberId);
  if (query.from) filters.from = new Date(query.from);
  if (query.to) filters.to = new Date(query.to);

  const appointments = await repo.findAllAppointments(tenantId, filters);
  return appointments.map(serializeAppointment);
}

export async function getAppointment(id: number, tenantId: number) {
  const appt = await repo.findAppointmentById(id, tenantId);
  if (!appt) throw new NotFoundError('Cita');
  return serializeAppointment(appt);
}

export async function createAppointment(tenantId: number, body: unknown) {
  const b = body as Record<string, unknown>;
  if (!b.clientId || !b.barberId || !b.serviceId || !b.startTime) {
    throw new ValidationError('clientId, barberId, serviceId y startTime son requeridos');
  }

  const service = await prisma.barberService.findFirst({
    where: { id: Number(b.serviceId), tenantId },
  });
  if (!service) throw new NotFoundError('Servicio');

  const startTime = new Date(b.startTime as string);
  const endTime = addMinutes(startTime, service.duration);

  const appt = await repo.createAppointment(tenantId, {
    clientId: Number(b.clientId),
    barberId: Number(b.barberId),
    serviceId: Number(b.serviceId),
    startTime,
    endTime,
    notes: b.notes as string | undefined,
  });
  return serializeAppointment(appt);
}

export async function updateAppointment(id: number, tenantId: number, body: unknown) {
  const existing = await repo.findAppointmentById(id, tenantId);
  if (!existing) throw new NotFoundError('Cita');

  const b = body as Record<string, unknown>;
  const data: Partial<repo.AppointmentCreateInput> = {};
  if (b.startTime) {
    data.startTime = new Date(b.startTime as string);
    const service = await prisma.barberService.findFirst({
      where: { id: existing.serviceId, tenantId },
    });
    data.endTime = addMinutes(data.startTime, service?.duration ?? 30);
  }
  if (b.barberId) data.barberId = Number(b.barberId);
  if (b.serviceId) data.serviceId = Number(b.serviceId);
  if (b.notes !== undefined) data.notes = b.notes as string;

  const updated = await repo.updateAppointment(id, tenantId, data);
  return serializeAppointment(updated);
}

export async function cancelAppointment(id: number, tenantId: number, reason?: string) {
  const existing = await repo.findAppointmentById(id, tenantId);
  if (!existing) throw new NotFoundError('Cita');
  if (existing.status === 'CANCELLED') throw new ValidationError('La cita ya está cancelada');

  const updated = await repo.updateAppointmentStatus(id, tenantId, 'CANCELLED', reason);
  return serializeAppointment(updated);
}

export async function getStats(tenantId: number) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const since30    = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [citasHoy, citasPendientes, ingresosHoy, clientesActivos] = await Promise.all([
    repo.countTodayAppointments(tenantId, todayStart, todayEnd),
    repo.countPendingAppointments(tenantId),
    repo.sumPaymentsToday(tenantId, todayStart, todayEnd),
    repo.countActiveClientsLast30Days(tenantId, since30),
  ]);

  return { citasHoy, citasPendientes, ingresosHoy, clientesActivos };
}

// ── Serializer ────────────────────────────────────────

type RawAppointment = Awaited<ReturnType<typeof repo.findAppointmentById>>;

function serializeAppointment(appt: NonNullable<RawAppointment>) {
  return {
    ...appt,
    service: {
      ...appt.service,
      price: appt.service.price.toNumber(),
    },
    payment: appt.payment
      ? { ...appt.payment, amount: appt.payment.amount.toNumber() }
      : null,
  };
}
