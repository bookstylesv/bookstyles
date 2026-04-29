/**
 * /compras — Módulo de Compras / Gastos
 * Server Component: carga inicial de compras + stats en paralelo.
 * Solo accesible para OWNER.
 */

import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listCompras, getStats } from '@/modules/compras/compras.service';
import ComprasClient from '@/components/compras/ComprasClient';

export const metadata = { title: 'Compras — Speeddan Barbería' };

export default async function ComprasPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'CLIENT') redirect('/dashboard');

  const [result, stats] = await Promise.all([
    listCompras(user.tenantId, { limit: '20' } as Record<string, string>),
    getStats(user.tenantId),
  ]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: 'hsl(var(--text-primary))',
            margin: '0 0 4px',
          }}
        >
          Compras
        </h1>
        <p
          style={{
            color: 'hsl(var(--text-secondary))',
            margin: 0,
            fontSize: 14,
          }}
        >
          Registro de compras de productos, insumos y gastos de servicio
        </p>
      </div>

      <ComprasClient
        initialCompras={result.data}
        initialStats={stats}
      />
    </div>
  );
}
