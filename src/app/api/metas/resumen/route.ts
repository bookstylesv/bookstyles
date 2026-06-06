/**
 * GET /api/metas/resumen?year=2026
 *
 * Devuelve datos agregados por mes para el módulo Metas:
 * - metas (objetivos configurados)
 * - ventas (ingresos)
 * - compras, gastos, planilla, notas de crédito (deducciones)
 *
 * OWNER/SUPERADMIN: todas las sucursales del tenant
 * GERENTE: solo su sucursal asignada
 */
import { NextRequest } from 'next/server';
import { ok } from '@/lib/response';
import { withTenantAuth } from '@/lib/with-tenant-auth';
import { prisma } from '@/lib/prisma';

function groupByMonth<T extends { createdAt?: Date; fecha?: Date; periodo?: string }>(
  items: (T & { branchId?: number | null; total?: unknown; monto?: unknown; totalNeto?: unknown })[],
  valueKey: 'total' | 'monto' | 'totalNeto',
): Array<{ branchId: number | null; month: number; total: number }> {
  const map = new Map<string, number>();

  for (const item of items) {
    const date = item.createdAt ?? item.fecha;
    let month: number;

    if (item.periodo) {
      month = parseInt(item.periodo.split('-')[1]);
    } else if (date) {
      month = date.getMonth() + 1;
    } else {
      continue;
    }

    const branchId = item.branchId ?? null;
    const key = `${branchId ?? 'null'}:${month}`;
    const value = parseFloat(String((item as Record<string, unknown>)[valueKey] ?? 0));
    map.set(key, (map.get(key) ?? 0) + value);
  }

  return Array.from(map.entries()).map(([key, total]) => {
    const [bStr, mStr] = key.split(':');
    return {
      branchId: bStr === 'null' ? null : parseInt(bStr),
      month:    parseInt(mStr),
      total,
    };
  });
}

export const GET = withTenantAuth(async (req: NextRequest, ctx) => {
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()));

  const start = new Date(year, 0, 1);
  const end   = new Date(year, 11, 31, 23, 59, 59, 999);

  const tenantId = ctx.tenantId;
  const isGerente = ctx.user.role === 'GERENTE';
  const branchFilter = isGerente && ctx.branchId ? { branchId: ctx.branchId } : {};

  const [branches, metas, ventas, compras, gastos, planillas, notasCredito] = await Promise.all([
    prisma.barberBranch.findMany({
      where: { tenantId, ...(isGerente && ctx.branchId ? { id: ctx.branchId } : {}), status: 'ACTIVE' },
      select: { id: true, name: true, slug: true, isHeadquarters: true },
      orderBy: [{ isHeadquarters: 'desc' }, { name: 'asc' }],
    }),

    prisma.barberMeta.findMany({
      where: { tenantId, year, ...branchFilter },
      select: { branchId: true, month: true, objetivo: true },
    }),

    prisma.barberVenta.findMany({
      where: { tenantId, estado: 'ACTIVA', createdAt: { gte: start, lte: end }, ...branchFilter },
      select: { branchId: true, total: true, createdAt: true },
    }),

    prisma.barberCompra.findMany({
      where: { tenantId, estado: { not: 'ANULADA' }, createdAt: { gte: start, lte: end }, ...branchFilter },
      select: { branchId: true, total: true, createdAt: true },
    }),

    prisma.barberGasto.findMany({
      where: { tenantId, fecha: { gte: start, lte: end }, ...branchFilter },
      select: { branchId: true, monto: true, fecha: true },
    }),

    prisma.barberPlanilla.findMany({
      where: { tenantId, periodo: { gte: `${year}-01`, lte: `${year}-12` }, estado: 'PAGADA' },
      select: { totalNeto: true, periodo: true },
    }),

    prisma.barberNotaCredito.findMany({
      where: { tenantId, estado: 'ACTIVA', createdAt: { gte: start, lte: end }, ...branchFilter },
      select: { branchId: true, total: true, createdAt: true },
    }),
  ]);

  const ventasPorMes       = groupByMonth(ventas,       'total');
  const comprasPorMes      = groupByMonth(compras,      'total');
  const gastosPorMes       = groupByMonth(gastos,       'monto');
  const notasCreditoPorMes = groupByMonth(notasCredito, 'total');

  const planillaPorMes: Array<{ month: number; total: number }> = [];
  const planillaMap = new Map<number, number>();
  for (const p of planillas) {
    const month = parseInt(p.periodo.split('-')[1]);
    planillaMap.set(month, (planillaMap.get(month) ?? 0) + parseFloat(String(p.totalNeto)));
  }
  planillaMap.forEach((total, month) => planillaPorMes.push({ month, total }));

  return ok({
    year,
    branches,
    metas,
    ventasPorMes,
    comprasPorMes,
    gastosPorMes,
    planillaPorMes,
    notasCreditoPorMes,
  });
}, { requiredModule: 'metas' })
