/**
 * /billing — Caja de pagos.
 * Server Component: carga inicial en paralelo.
 */

import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import {
  listPayments,
  listUnpaidAppointments,
  getStats,
} from '@/modules/billing/billing.service';
import BillingClient from '@/components/billing/BillingClient';

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'OWNER') redirect('/dashboard');

  const [payments, unpaid, stats] = await Promise.all([
    listPayments(user.tenantId),
    listUnpaidAppointments(user.tenantId),
    getStats(user.tenantId),
  ]);

  // Serializar fechas
  const serializedPayments = payments.map(p => ({
    ...p,
    paidAt:    p.paidAt    ? (p.paidAt as Date).toISOString()    : null,
    createdAt: (p.createdAt as Date).toISOString(),
    appointment: {
      ...p.appointment,
      startTime: (p.appointment.startTime as Date).toISOString(),
    },
  }));

  const serializedUnpaid = unpaid.map(a => ({
    ...a,
    startTime: (a.startTime as Date).toISOString(),
  }));

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'hsl(var(--text-primary))', margin: '0 0 4px' }}>
          Caja
        </h1>
        <p style={{ color: 'hsl(var(--text-secondary))', margin: 0, fontSize: 14 }}>
          Registro de pagos e ingresos
        </p>
      </div>

      <BillingClient
        initialPayments={serializedPayments}
        initialUnpaid={serializedUnpaid}
        initialStats={stats}
      />
    </div>
  );
}
