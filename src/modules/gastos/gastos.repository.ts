/**
 * gastos.repository.ts — Capa de datos para BarberGasto y BarberCategoriaGasto.
 * Todas las queries filtran por tenantId.
 */

import { prisma } from '@/lib/prisma';
import { branchWhere } from '@/lib/branch-filter';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type GastoFilters = {
  categoriaId?: number;
  desde?: Date;
  hasta?: Date;
  page?: number;
  limit?: number;
  branchId?: number | null;
};

export type CategoriaCreateInput = {
  nombre: string;
  descripcion?: string | null;
  color?: string;
};

export type CategoriaUpdateInput = Partial<CategoriaCreateInput> & { activo?: boolean };

export type GastoCreateInput = {
  categoriaId: number;
  descripcion: string;
  monto: number;
  fecha: Date;
  notas?: string | null;
};

export type GastoUpdateInput = Partial<GastoCreateInput>;

// ── Categorías ────────────────────────────────────────────────────────────────

export async function listCategorias(tenantId: number) {
  return prisma.barberCategoriaGasto.findMany({
    where: { tenantId, activo: true },
    orderBy: { nombre: 'asc' },
    include: {
      _count: { select: { gastos: true } },
    },
  });
}

export async function findCategoriaById(id: number, tenantId: number) {
  return prisma.barberCategoriaGasto.findFirst({
    where: { id, tenantId },
  });
}

export async function createCategoria(tenantId: number, data: CategoriaCreateInput) {
  return prisma.barberCategoriaGasto.create({
    data: {
      tenantId,
      nombre:      data.nombre,
      descripcion: data.descripcion ?? null,
      color:       data.color ?? '#0d9488',
      activo:      true,
    },
    include: {
      _count: { select: { gastos: true } },
    },
  });
}

export async function updateCategoria(id: number, tenantId: number, data: CategoriaUpdateInput) {
  return prisma.barberCategoriaGasto.update({
    where: { id },
    data: {
      ...(data.nombre      !== undefined && { nombre:      data.nombre }),
      ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
      ...(data.color       !== undefined && { color:       data.color }),
      ...(data.activo      !== undefined && { activo:      data.activo }),
    },
    include: {
      _count: { select: { gastos: true } },
    },
  });
}

export async function deleteCategoriaIfEmpty(id: number, tenantId: number) {
  const cat = await prisma.barberCategoriaGasto.findFirst({
    where: { id, tenantId },
    include: { _count: { select: { gastos: true } } },
  });

  if (!cat) return null;

  if (cat._count.gastos > 0) {
    throw new Error(`No se puede eliminar: la categoría tiene ${cat._count.gastos} gasto(s) asociado(s)`);
  }

  return prisma.barberCategoriaGasto.update({
    where: { id },
    data: { activo: false },
  });
}

// ── Gastos ────────────────────────────────────────────────────────────────────

export async function findAll(tenantId: number, filters: GastoFilters = {}) {
  const {
    categoriaId,
    desde,
    hasta,
    page  = 1,
    limit = 50,
  } = filters;

  const skip = (page - 1) * limit;

  const where = {
    tenantId,
    ...branchWhere(filters.branchId),
    ...(categoriaId && { categoriaId }),
    ...((desde || hasta) && {
      fecha: {
        ...(desde && { gte: desde }),
        ...(hasta && { lte: hasta }),
      },
    }),
  };

  const [gastos, total] = await Promise.all([
    prisma.barberGasto.findMany({
      where,
      include: {
        categoria: { select: { id: true, nombre: true, color: true } },
      },
      orderBy: { fecha: 'desc' },
      skip,
      take: limit,
    }),
    prisma.barberGasto.count({ where }),
  ]);

  return { gastos, total };
}

export async function findById(id: number, tenantId: number) {
  return prisma.barberGasto.findFirst({
    where: { id, tenantId },
    include: {
      categoria: { select: { id: true, nombre: true, color: true } },
    },
  });
}

export async function create(tenantId: number, data: GastoCreateInput) {
  return prisma.barberGasto.create({
    data: {
      tenantId,
      categoriaId: data.categoriaId,
      descripcion: data.descripcion,
      monto:       data.monto,
      fecha:       data.fecha,
      notas:       data.notas ?? null,
    },
    include: {
      categoria: { select: { id: true, nombre: true, color: true } },
    },
  });
}

export async function update(id: number, tenantId: number, data: GastoUpdateInput) {
  return prisma.barberGasto.update({
    where: { id },
    data: {
      ...(data.categoriaId !== undefined && { categoriaId: data.categoriaId }),
      ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
      ...(data.monto       !== undefined && { monto:       data.monto }),
      ...(data.fecha       !== undefined && { fecha:       data.fecha }),
      ...(data.notas       !== undefined && { notas:       data.notas }),
    },
    include: {
      categoria: { select: { id: true, nombre: true, color: true } },
    },
  });
}

export async function deleteGasto(id: number, tenantId: number) {
  return prisma.barberGasto.delete({ where: { id } });
}

// ── Resumen por categoría (mes/año) ───────────────────────────────────────────

export async function resumenPorCategoria(tenantId: number, mes: number, anio: number, branchId?: number | null) {
  const desde = new Date(anio, mes - 1, 1);
  const hasta = new Date(anio, mes, 1);

  const grupos = await prisma.barberGasto.groupBy({
    by:    ['categoriaId'],
    where: { tenantId, ...branchWhere(branchId), fecha: { gte: desde, lt: hasta } },
    _sum:  { monto: true },
    _count: { _all: true },
  });

  if (grupos.length === 0) return [];

  const catIds = grupos.map(g => g.categoriaId);
  const categorias = await prisma.barberCategoriaGasto.findMany({
    where: { id: { in: catIds } },
    select: { id: true, nombre: true, color: true },
  });

  const catMap = Object.fromEntries(categorias.map(c => [c.id, c]));

  return grupos.map(g => ({
    categoriaId: g.categoriaId,
    nombre:      catMap[g.categoriaId]?.nombre ?? 'Sin categoría',
    color:       catMap[g.categoriaId]?.color  ?? '#0d9488',
    total:       g._sum.monto?.toNumber() ?? 0,
    count:       g._count._all,
  }));
}

// ── KPIs ──────────────────────────────────────────────────────────────────────

export async function getStats(tenantId: number, branchId?: number | null) {
  const now       = new Date();
  const hoyInicio = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const hoyFin    = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1);
  const mesFin    = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const anioInicio = new Date(now.getFullYear(), 0, 1);
  const bWhere = branchWhere(branchId);

  const [hoyAgg, mesAgg, anioAgg, resumenMes] = await Promise.all([
    prisma.barberGasto.aggregate({
      where: { tenantId, ...bWhere, fecha: { gte: hoyInicio, lt: hoyFin } },
      _sum:  { monto: true },
    }),
    prisma.barberGasto.aggregate({
      where: { tenantId, ...bWhere, fecha: { gte: mesInicio, lt: mesFin } },
      _sum:  { monto: true },
    }),
    prisma.barberGasto.aggregate({
      where: { tenantId, ...bWhere, fecha: { gte: anioInicio } },
      _sum:  { monto: true },
    }),
    // Agrupación para obtener categoría top del mes
    prisma.barberGasto.groupBy({
      by:    ['categoriaId'],
      where: { tenantId, ...bWhere, fecha: { gte: mesInicio, lt: mesFin } },
      _sum:  { monto: true },
      orderBy: { _sum: { monto: 'desc' } },
      take: 1,
    }),
  ]);

  let categoriaTopMes: { nombre: string; color: string; total: number } | null = null;

  if (resumenMes.length > 0) {
    const topCat = await prisma.barberCategoriaGasto.findUnique({
      where:  { id: resumenMes[0].categoriaId },
      select: { nombre: true, color: true },
    });
    if (topCat) {
      categoriaTopMes = {
        nombre: topCat.nombre,
        color:  topCat.color,
        total:  resumenMes[0]._sum.monto?.toNumber() ?? 0,
      };
    }
  }

  return {
    totalHoy:        hoyAgg._sum.monto?.toNumber()  ?? 0,
    totalMes:        mesAgg._sum.monto?.toNumber()  ?? 0,
    totalAnio:       anioAgg._sum.monto?.toNumber() ?? 0,
    categoriaTopMes,
  };
}
