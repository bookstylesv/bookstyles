/**
 * /cxp — Módulo de Cuentas por Pagar (OWNER only).
 * Server Component: carga datos en paralelo y los pasa al Client Component.
 */

import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listCxP, getResumen } from '@/modules/cxp/cxp.service';
import CxPClient from '@/components/cxp/CxPClient';

export default async function CxPPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'CLIENT') redirect('/dashboard');

  const [cxpList, resumen] = await Promise.all([
    listCxP(user.tenantId),
    getResumen(user.tenantId),
  ]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'hsl(var(--text-primary))', margin: '0 0 4px' }}>
          Cuentas por Pagar
        </h1>
        <p style={{ color: 'hsl(var(--text-secondary))', margin: 0, fontSize: 14 }}>
          Control de facturas a crédito y abonos a proveedores
        </p>
      </div>

      <CxPClient
        initialList={cxpList}
        initialResumen={resumen}
      />
    </div>
  );
}
