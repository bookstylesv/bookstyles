/**
 * /clients — Gestión de clientes del tenant.
 * Server Component: carga inicial desde BD.
 */

import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listClients } from '@/modules/clients/clients.service';
import ClientsClient from '@/components/clients/ClientsClient';

export default async function ClientsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'OWNER' && user.role !== 'BARBER') redirect('/dashboard');

  const clients = await listClients(user.tenantId);

  // Serializar Decimal y Dates para el cliente
  const serialized = clients.map(c => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    lastVisit: c.lastVisit ? c.lastVisit.toISOString() : null,
  }));

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'hsl(var(--text-primary))', margin: '0 0 4px' }}>
          Clientes
        </h1>
        <p style={{ color: 'hsl(var(--text-secondary))', margin: 0, fontSize: 14 }}>
          Base de clientes de la barbería
        </p>
      </div>
      <ClientsClient initialClients={serialized} />
    </div>
  );
}
