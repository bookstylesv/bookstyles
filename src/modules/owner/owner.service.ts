/**
 * owner.service.ts — Estadísticas extendidas para el panel ejecutivo del OWNER.
 * Cubre: Gastos por categoría, Compras, CxP y Planilla con filtro mes/año.
 */

import { prisma } from '@/lib/prisma';
import { resumen as cxpResumen } from '@/modules/cxp/cxp.repository';

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export async function getOwnerExtendedStats(tenantId: number, mes: number, anio: number) {
  // mes = 1-12, anio = yyyy
  const inicioMes     = new Date(anio, mes - 1, 1);
  const finMes        = new Date(anio, mes, 0, 23, 59, 59, 999);
  const inicioMesPas  = new Date(anio, mes - 2, 1);
  const finMesPas     = new Date(anio, mes - 1, 0, 23, 59, 59, 999);
  const inicio6M      = new Date(anio, mes - 6, 1);

  const [
    gastosCatGrupos,
    gastosEvolucionRaw,
    gastosMesAgg,
    gastosMesPasAgg,
    comprasMesAgg,
    comprasProductosAgg,
    comprasServiciosAgg,
    comprasEvolucionRaw,
    planillasAnio,
  ] = await Promise.all([
    // 1. Gastos por categoría del mes
    prisma.barberGasto.groupBy({
      by: ['categoriaId'],
      where: { tenantId, fecha: { gte: inicioMes, lte: finMes } },
      _sum:   { monto: true },
      _count: { _all: true },
    }),
    // 2. Gastos últimos 6 meses (evolución)
    prisma.barberGasto.findMany({
      where:  { tenantId, fecha: { gte: inicio6M, lte: finMes } },
      select: { monto: true, fecha: true },
    }),
    // 3. Gastos mes actual (total)
    prisma.barberGasto.aggregate({
      where: { tenantId, fecha: { gte: inicioMes, lte: finMes } },
      _sum:  { monto: true },
    }),
    // 4. Gastos mes anterior (para % variación)
    prisma.barberGasto.aggregate({
      where: { tenantId, fecha: { gte: inicioMesPas, lte: finMesPas } },
      _sum:  { monto: true },
    }),
    // 5. Compras total del mes
    prisma.barberCompra.aggregate({
      where:  { tenantId, fecha: { gte: inicioMes, lte: finMes }, estado: { not: 'ANULADA' } },
      _sum:   { total: true },
      _count: { id: true },
    }),
    // 6. Compras PRODUCTO del mes
    prisma.barberCompra.aggregate({
      where: { tenantId, tipoCompra: 'PRODUCTO', fecha: { gte: inicioMes, lte: finMes }, estado: { not: 'ANULADA' } },
      _sum:  { total: true },
    }),
    // 7. Compras GASTO_SERVICIO del mes
    prisma.barberCompra.aggregate({
      where: { tenantId, tipoCompra: 'GASTO_SERVICIO', fecha: { gte: inicioMes, lte: finMes }, estado: { not: 'ANULADA' } },
      _sum:  { total: true },
    }),
    // 8. Compras 6 meses (evolución productos vs servicios)
    prisma.barberCompra.findMany({
      where:  { tenantId, fecha: { gte: inicio6M, lte: finMes }, estado: { not: 'ANULADA' } },
      select: { total: true, tipoCompra: true, fecha: true },
    }),
    // 9. Planillas del año seleccionado
    prisma.barberPlanilla.findMany({
      where:   { tenantId, periodo: { startsWith: String(anio) } },
      select:  {
        periodo: true, estado: true,
        totalBruto: true, totalDeducciones: true, totalNeto: true,
        totalPatronalISS: true, totalPatronalAFP: true, totalINSAFORP: true,
      },
      orderBy: { periodo: 'asc' },
    }),
  ]);

  // CxP — siempre estado actual (sin filtro de fecha)
  const cxp = await cxpResumen(tenantId);

  // ── Gastos por categoría ──────────────────────────────────────────────────
  let gastosPorCategoria: Array<{ nombre: string; color: string; total: number; count: number }> = [];
  if (gastosCatGrupos.length > 0) {
    const catIds  = gastosCatGrupos.map(g => g.categoriaId).filter(Boolean) as number[];
    const cats    = catIds.length > 0
      ? await prisma.barberCategoriaGasto.findMany({ where: { id: { in: catIds } }, select: { id: true, nombre: true, color: true } })
      : [];
    const catMap  = Object.fromEntries(cats.map(c => [c.id, c]));
    gastosPorCategoria = gastosCatGrupos
      .map(g => ({
        nombre: catMap[g.categoriaId ?? 0]?.nombre ?? 'Sin categoría',
        color:  catMap[g.categoriaId ?? 0]?.color  ?? '#0d9488',
        total:  parseFloat((g._sum.monto?.toNumber() ?? 0).toFixed(2)),
        count:  g._count._all,
      }))
      .sort((a, b) => b.total - a.total);
  }

  // ── Evolución gastos 6 meses ──────────────────────────────────────────────
  const mapaGastos = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(anio, mes - 1 - i, 1);
    mapaGastos.set(`${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, 0);
  }
  for (const g of gastosEvolucionRaw) {
    const d = g.fecha;
    const k = `${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    const v = mapaGastos.get(k);
    if (v !== undefined) mapaGastos.set(k, parseFloat((v + Number(g.monto)).toFixed(2)));
  }
  const gastosEvolucion = Array.from(mapaGastos.entries()).map(([label, total]) => ({ mes: label, total }));

  // ── Evolución compras 6 meses (productos vs servicios) ───────────────────
  const mapaCompras = new Map<string, { productos: number; servicios: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(anio, mes - 1 - i, 1);
    mapaCompras.set(`${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, { productos: 0, servicios: 0 });
  }
  for (const c of comprasEvolucionRaw) {
    const d = c.fecha as Date;
    const k = `${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    const e = mapaCompras.get(k);
    if (e) {
      if (c.tipoCompra === 'PRODUCTO') e.productos = parseFloat((e.productos + Number(c.total)).toFixed(2));
      else                             e.servicios = parseFloat((e.servicios + Number(c.total)).toFixed(2));
    }
  }
  const comprasEvolucion = Array.from(mapaCompras.entries()).map(([label, v]) => ({
    mes: label, productos: v.productos, servicios: v.servicios,
    total: parseFloat((v.productos + v.servicios).toFixed(2)),
  }));

  // ── Planilla del año ──────────────────────────────────────────────────────
  const planillaEvolucion = planillasAnio.map(p => {
    const [y2, m2] = p.periodo.split('-').map(Number);
    return {
      periodo:          `${MESES[m2 - 1]} ${String(y2).slice(2)}`,
      totalBruto:       parseFloat(p.totalBruto.toString()),
      totalDeducciones: parseFloat(p.totalDeducciones.toString()),
      totalNeto:        parseFloat(p.totalNeto.toString()),
      costoPatronal:    parseFloat((
        Number(p.totalPatronalISS) + Number(p.totalPatronalAFP) + Number(p.totalINSAFORP)
      ).toFixed(2)),
      estado:           p.estado,
    };
  });

  const gastosTotalMes  = parseFloat((gastosMesAgg._sum.monto?.toNumber()    ?? 0).toFixed(2));
  const gastosMesPasNum = parseFloat((gastosMesPasAgg._sum.monto?.toNumber() ?? 0).toFixed(2));
  const gastosVarPct    = gastosMesPasNum > 0
    ? parseFloat(((gastosTotalMes - gastosMesPasNum) / gastosMesPasNum * 100).toFixed(1))
    : null;

  return {
    // ── Gastos ──
    gastosPorCategoria,
    gastosEvolucion,
    gastosTotalMes,
    gastosVarPct,

    // ── Compras ──
    comprasMes:       parseFloat((comprasMesAgg._sum.total?.toNumber()       ?? 0).toFixed(2)),
    comprasCount:     comprasMesAgg._count.id,
    comprasProductos: parseFloat((comprasProductosAgg._sum.total?.toNumber() ?? 0).toFixed(2)),
    comprasServicios: parseFloat((comprasServiciosAgg._sum.total?.toNumber() ?? 0).toFixed(2)),
    comprasEvolucion,

    // ── CxP ──
    cxp,

    // ── Planilla ──
    planillaEvolucion,
    planillaTotalBruto:       parseFloat(planillaEvolucion.reduce((s, p) => s + p.totalBruto,       0).toFixed(2)),
    planillaTotalNeto:         parseFloat(planillaEvolucion.reduce((s, p) => s + p.totalNeto,        0).toFixed(2)),
    planillaTotalDeducciones:  parseFloat(planillaEvolucion.reduce((s, p) => s + p.totalDeducciones, 0).toFixed(2)),
    planillaTotalPatronal:     parseFloat(planillaEvolucion.reduce((s, p) => s + p.costoPatronal,    0).toFixed(2)),
  };
}

export type OwnerExtendedStats = Awaited<ReturnType<typeof getOwnerExtendedStats>>;
