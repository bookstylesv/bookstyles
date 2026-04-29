/**
 * /proveedores — Gestión de proveedores del tenant.
 * Server Component: carga inicial de datos en paralelo.
 */

import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import {
  listProveedores,
  getStats,
} from '@/modules/proveedores/proveedores.service';
import ProveedoresClient from '@/components/proveedores/ProveedoresClient';

export const metadata = { title: 'Proveedores — Speeddan Barbería' };

export default async function ProveedoresPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'CLIENT') redirect('/dashboard');

  const [result, stats] = await Promise.all([
    listProveedores(user.tenantId, { page: 1, pageSize: 50 }),
    getStats(user.tenantId),
  ]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'hsl(var(--text-primary))', margin: '0 0 4px' }}>
          Proveedores
        </h1>
        <p style={{ color: 'hsl(var(--text-secondary))', margin: 0, fontSize: 14 }}>
          Gestión de proveedores y contactos comerciales
        </p>
      </div>
      <ProveedoresClient
        initialProveedores={result.items}
        initialStats={stats}
      />
    </div>
  );
}
