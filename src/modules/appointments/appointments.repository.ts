/**
 * appointments.repository.ts — Capa de datos para BarberAppointment.
 * Todas las queries filtran por tenantId.
 */

import { prisma } from '@/lib/prisma';
import type { BarberAppointmentStatus } from '@prisma/client';
import { branchWhere } from '@/lib/branch-filter';

export type AppointmentFilters = {
  status?: BarberAppointmentStatus;
  barberId?: number;
  from?: Date;
  to?: Date;
  branchId?: number | null;
};

export type AppointmentCreateInput = {
  clientId: number;
  barberId: number;
  serviceId: number;
  startTime: Date;
  endTime: Date;
  notes?: string;
};

const APPOINTMENT_INCLUDE = {
  client: { select: { id: true, fullName: true, email: true, phone: true } },
  barber: {
    include: {
      user: { select: { id: true, fullName: true } },
    },
  },
  service: { select: { id: true, name: true, price: true, duration: true, category: true } },
  payment: { select: { id: true, amount: true, method: true, status: true, paidAt: true } },
} as const;

export async function findAllAppointments(tenantId: number, filters: AppointmentFilters = {}) {
  return prisma.barberAppointment.findMany({
    where: {
      tenantId,
      ...branchWhere(filters.branchId),
      ...(filters.status && { status: filters.status }),
      ...(filters.barberId && { barberId: filters.barberId }),
      ...((filters.from || filters.to) ? {
        startTime: {
          ...(filters.from && { gte: filters.from }),
          ...(filters.to && { lte: filters.to }),
        },
      } : {}),
    },
    include: APPOINTMENT_INCLUDE,
    orderBy: { startTime: 'asc' },
  });
}

export async function findAppointmentById(id: number, tenantId: number) {
  return prisma.barberAppointment.findFirst({
    where: { id, tenantId },
    include: APPOINTMENT_INCLUDE,
  });
}

export async function createAppointment(tenantId: number, data: AppointmentCreateInput) {
  return prisma.barberAppointment.create({
    data: {
      tenantId,
      clientId: data.clientId,
      barberId: data.barberId,
      serviceId: data.serviceId,
      startTime: data.startTime,
      endTime: data.endTime,
      notes: data.notes,
      status: 'PENDING',
    },
    include: APPOINTMENT_INCLUDE,
  });
}

export async function updateAppointmentStatus(
  id: number,
  tenantId: number,
  status: BarberAppointmentStatus,
  cancelReason?: string,
) {
  return prisma.barberAppointment.update({
    where: { id },
    data: { status, ...(cancelReason && { cancelReason }) },
    include: APPOINTMENT_INCLUDE,
  });
}

export async function updateAppointment(
  id: number,
  tenantId: number,
  data: Partial<AppointmentCreateInput>,
) {
  return prisma.barberAppointment.update({
    where: { id },
    data: {
      ...(data.startTime && { startTime: data.startTime }),
      ...(data.endTime && { endTime: data.endTime }),
      ...(data.barberId && { barberId: data.barberId }),
      ...(data.serviceId && { serviceId: data.serviceId }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
    include: APPOINTMENT_INCLUDE,
  });
}

// ── KPI queries ──────────────────────────────────────

export async function countTodayAppointments(tenantId: number, todayStart: Date, todayEnd: Date) {
  return prisma.barberAppointment.count({
    where: { tenantId, startTime: { gte: todayStart, lt: todayEnd } },
  });
}

export async function countPendingAppointments(tenantId: number) {
  return prisma.barberAppointment.count({
    where: { tenantId, status: 'PENDING' },
  });
}

export async function sumPaymentsToday(tenantId: number, todayStart: Date, todayEnd: Date) {
  const result = await prisma.barberPayment.aggregate({
    where: {
      tenantId,
      status: 'PAID',
      paidAt: { gte: todayStart, lt: todayEnd },
    },
    _sum: { amount: true },
  });
  return result._sum.amount?.toNumber() ?? 0;
}

export async function countActiveClientsLast30Days(tenantId: number, since: Date) {
  const rows = await prisma.barberAppointment.findMany({
    where: { tenantId, startTime: { gte: since } },
    select: { clientId: true },
    distinct: ['clientId'],
  });
  return rows.length;
}

export async function countAppointmentsLast7Days(tenantId: number): Promise<{ day: string; count: number }[]> {
  const now = new Date();
  // Construir los 7 días con sus etiquetas
  const days: Array<{ date: Date; label: string }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    days.push({ date: d, label: d.toLocaleDateString('es-SV', { weekday: 'short' }) });
  }

  // Una sola query en lugar de 7 queries en loop
  const since = days[0].date;
  const until = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const appointments = await prisma.barberAppointment.findMany({
    where: { tenantId, startTime: { gte: since, lt: until } },
    select: { startTime: true },
  });

  // Agrupar en memoria por fecha exacta
  const countByDate = new Map<string, number>();
  for (const { date } of days) countByDate.set(date.toDateString(), 0);
  for (const appt of appointments) {
    const key = new Date(
      appt.startTime.getFullYear(),
      appt.startTime.getMonth(),
      appt.startTime.getDate(),
    ).toDateString();
    if (countByDate.has(key)) countByDate.set(key, (countByDate.get(key) ?? 0) + 1);
  }

  return days.map(({ date, label }) => ({ day: label, count: countByDate.get(date.toDateString()) ?? 0 }));
}
