/**
 * billing.repository.ts — Capa de datos para BarberPayment.
 * Todas las queries filtran por tenantId.
 */

import { prisma } from '@/lib/prisma';
import type { BarberPaymentMethod, BarberPaymentStatus } from '@prisma/client';

export type PaymentFilters = {
  status?: BarberPaymentStatus;
  from?:   Date;
  to?:     Date;
};

export type PaymentCreateInput = {
  appointmentId: number;
  amount:        number;
  method:        BarberPaymentMethod;
  notes?:        string;
  status?:       BarberPaymentStatus;
};

export type PaymentUpdateInput = {
  method?: BarberPaymentMethod;
  status?: BarberPaymentStatus;
  notes?:  string;
  paidAt?: Date | null;
};

const PAYMENT_INCLUDE = {
  appointment: {
    include: {
      client:  { select: { id: true, fullName: true, email: true, phone: true } },
      barber:  { include: { user: { select: { id: true, fullName: true } } } },
      service: { select: { id: true, name: true, duration: true } },
    },
  },
} as const;

export async function findAllPayments(tenantId: number, filters: PaymentFilters = {}) {
  return prisma.barberPayment.findMany({
    where: {
      tenantId,
      ...(filters.status && { status: filters.status }),
      ...((filters.from || filters.to) ? {
        createdAt: {
          ...(filters.from && { gte: filters.from }),
          ...(filters.to   && { lte: filters.to }),
        },
      } : {}),
    },
    include: PAYMENT_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
}

export async function findPaymentById(id: number, tenantId: number) {
  return prisma.barberPayment.findFirst({
    where: { id, tenantId },
    include: PAYMENT_INCLUDE,
  });
}

export async function findUnpaidAppointments(tenantId: number) {
  return prisma.barberAppointment.findMany({
    where: {
      tenantId,
      status: { in: ['CONFIRMED', 'COMPLETED', 'IN_PROGRESS'] },
      payment: null,
    },
    include: {
      client:  { select: { id: true, fullName: true } },
      barber:  { include: { user: { select: { fullName: true } } } },
      service: { select: { id: true, name: true, price: true } },
    },
    orderBy: { startTime: 'desc' },
  });
}

export async function createPayment(tenantId: number, data: PaymentCreateInput) {
  const payment = await prisma.barberPayment.create({
    data: {
      tenantId,
      appointmentId: data.appointmentId,
      amount:        data.amount,
      method:        data.method,
      status:        data.status ?? 'PAID',
      paidAt:        data.status !== 'PENDING' ? new Date() : null,
      notes:         data.notes,
    },
    include: PAYMENT_INCLUDE,
  });

  // Si el pago es PAID, marcar la cita como COMPLETED
  if (payment.status === 'PAID') {
    await prisma.barberAppointment.update({
      where: { id: data.appointmentId },
      data:  { status: 'COMPLETED' },
    });
  }

  return payment;
}

export async function updatePayment(id: number, tenantId: number, data: PaymentUpdateInput) {
  const wasNotPaid = data.status === 'PAID';

  const payment = await prisma.barberPayment.update({
    where: { id },
    data: {
      ...(data.method !== undefined && { method: data.method }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.notes  !== undefined && { notes:  data.notes }),
      ...(wasNotPaid && { paidAt: new Date() }),
    },
    include: PAYMENT_INCLUDE,
  });

  // Si marcamos como PAID, actualizar la cita
  if (wasNotPaid) {
    await prisma.barberAppointment.update({
      where: { id: payment.appointmentId },
      data:  { status: 'COMPLETED' },
    });
  }

  return payment;
}

// ── KPIs ──────────────────────────────────────────────────

export async function getBillingStats(tenantId: number) {
  const now = new Date();
  const todayStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd    = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayRes, monthRes, pendingRes, pendingCount] = await Promise.all([
    prisma.barberPayment.aggregate({
      where: { tenantId, status: 'PAID', paidAt: { gte: todayStart, lt: todayEnd } },
      _sum: { amount: true },
    }),
    prisma.barberPayment.aggregate({
      where: { tenantId, status: 'PAID', paidAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.barberPayment.aggregate({
      where: { tenantId, status: 'PENDING' },
      _sum: { amount: true },
    }),
    prisma.barberPayment.count({
      where: { tenantId, status: 'PENDING' },
    }),
  ]);

  return {
    ingresosHoy:  todayRes._sum.amount?.toNumber()   ?? 0,
    ingresosMes:  monthRes._sum.amount?.toNumber()   ?? 0,
    pendienteSum: pendingRes._sum.amount?.toNumber() ?? 0,
    pendienteCount: pendingCount,
  };
}
