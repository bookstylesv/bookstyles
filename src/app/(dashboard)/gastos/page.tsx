/**
 * /gastos — Módulo de Gastos (OWNER only).
 * Server Component: carga datos en paralelo y los pasa al Client Component.
 */

import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import {
  listCategoriasService,
  listGastos,
  getStatsService,
  resumenMesService,
} from '@/modules/gastos/gastos.service';
import GastosClient from '@/components/gastos/GastosClient';

export default async function GastosPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'CLIENT') redirect('/dashboard');

  const now = new Date();
  const mes  = now.getMonth() + 1;
  const anio = now.getFullYear();

  const [categorias, gastosResult, stats, resumen] = await Promise.all([
    listCategoriasService(user.tenantId),
    listGastos(user.tenantId, { limit: '100' }),
    getStatsService(user.tenantId),
    resumenMesService(user.tenantId, mes, anio),
  ]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'hsl(var(--text-primary))', margin: '0 0 4px' }}>
          Gastos
        </h1>
        <p style={{ color: 'hsl(var(--text-secondary))', margin: 0, fontSize: 14 }}>
          Registro y control de egresos del negocio
        </p>
      </div>

      <GastosClient
        initialGastos={gastosResult.gastos}
        initialCategorias={categorias}
        initialStats={stats}
        initialResumen={resumen}
        mesFiltro={mes}
        anioFiltro={anio}
      />
    </div>
  );
}
