/**
 * productos.repository.ts — Capa de datos para BarberProducto, BarberCategoriaProducto y BarberKardex.
 * Todas las queries filtran por tenantId para aislamiento multi-tenant.
 */

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type ProductoFilters = {
  search?: string;
  categoriaId?: number;
  soloStockBajo?: boolean;
};

export type ProductoPagination = {
  page: number;
  limit: number;
  skip: number;
};

export type ProductoCreateInput = {
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoriaId?: number;
  precioVenta: number;
  costoPromedio?: number;
  precioComision?: number | null;
  stockMinimo?: number;
  stockInicial?: number;
  unidadMedida?: string;
};

export type ProductoUpdateInput = Partial<Omit<ProductoCreateInput, 'stockInicial'>>;

export type AjusteStockInput = {
  tipoMovimiento: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  cantidad: number;
  costoUnitario: number;
  referencia: string;
  notas?: string;
};

// ── Includes ───────────────────────────────────────────────────────────────────

const PRODUCTO_INCLUDE = {
  categoria: {
    select: { id: true, nombre: true },
  },
} as const;

// ── Productos ──────────────────────────────────────────────────────────────────

export async function findAllProductos(
  tenantId: number,
  filters: ProductoFilters = {},
  pagination?: ProductoPagination,
) {
  const where: Prisma.BarberProductoWhereInput = {
    tenantId,
    activo: true,
    ...(filters.categoriaId && { categoriaId: filters.categoriaId }),
    ...(filters.soloStockBajo && {
      stockActual: { lte: prisma.barberProducto.fields.stockMinimo },
    }),
    ...(filters.search && {
      OR: [
        { nombre: { contains: filters.search, mode: 'insensitive' } },
        { codigo: { contains: filters.search, mode: 'insensitive' } },
      ],
    }),
  };

  // soloStockBajo requires raw comparison — handled via a special where
  const whereBase: Prisma.BarberProductoWhereInput = {
    tenantId,
    activo: true,
    ...(filters.categoriaId && { categoriaId: filters.categoriaId }),
    ...(filters.search && {
      OR: [
        { nombre: { contains: filters.search, mode: 'insensitive' } },
        { codigo: { contains: filters.search, mode: 'insensitive' } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.barberProducto.findMany({
      where: whereBase,
      include: PRODUCTO_INCLUDE,
      orderBy: { nombre: 'asc' },
      ...(pagination && { skip: pagination.skip, take: pagination.limit }),
    }),
    prisma.barberProducto.count({ where: whereBase }),
  ]);

  // Filter soloStockBajo in memory (Prisma does not support column-to-column comparison directly)
  const filtered = filters.soloStockBajo
    ? items.filter(p => Number(p.stockActual) <= Number(p.stockMinimo))
    : items;

  return { items: filtered, total: filters.soloStockBajo ? filtered.length : total };
}

export async function findProductoById(id: number, tenantId: number) {
  return prisma.barberProducto.findFirst({
    where: { id, tenantId },
    include: PRODUCTO_INCLUDE,
  });
}

export async function createProducto(tenantId: number, data: ProductoCreateInput) {
  return prisma.barberProducto.create({
    data: {
      tenantId,
      codigo: data.codigo,
      nombre: data.nombre,
      descripcion: data.descripcion,
      categoriaId: data.categoriaId ?? null,
      precioVenta: data.precioVenta,
      costoPromedio: data.costoPromedio ?? 0,
      precioComision: data.precioComision ?? null,
      stockMinimo: data.stockMinimo ?? 0,
      stockActual: data.stockInicial ?? 0,
      unidadMedida: data.unidadMedida ?? 'UNIDAD',
      activo: true,
    },
    include: PRODUCTO_INCLUDE,
  });
}

export async function updateProducto(id: number, tenantId: number, data: ProductoUpdateInput) {
  return prisma.barberProducto.update({
    where: { id },
    data: {
      ...(data.codigo !== undefined && { codigo: data.codigo }),
      ...(data.nombre !== undefined && { nombre: data.nombre }),
      ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
      ...(data.categoriaId !== undefined && { categoriaId: data.categoriaId }),
      ...(data.precioVenta !== undefined && { precioVenta: data.precioVenta }),
      ...(data.costoPromedio !== undefined && { costoPromedio: data.costoPromedio }),
      ...(data.precioComision !== undefined && { precioComision: data.precioComision }),
      ...(data.stockMinimo !== undefined && { stockMinimo: data.stockMinimo }),
      ...(data.unidadMedida !== undefined && { unidadMedida: data.unidadMedida }),
    },
    include: PRODUCTO_INCLUDE,
  });
}

export async function deactivateProducto(id: number, tenantId: number) {
  return prisma.barberProducto.update({
    where: { id },
    data: { activo: false },
    include: PRODUCTO_INCLUDE,
  });
}

export async function searchProductos(tenantId: number, query: string) {
  return prisma.barberProducto.findMany({
    where: {
      tenantId,
      activo: true,
      OR: [
        { nombre: { contains: query, mode: 'insensitive' } },
        { codigo: { contains: query, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      stockActual: true,
      unidadMedida: true,
      precioVenta: true,
    },
    orderBy: { nombre: 'asc' },
    take: 20,
  });
}

// ── Categorías ─────────────────────────────────────────────────────────────────

export async function findAllCategorias(tenantId: number) {
  return prisma.barberCategoriaProducto.findMany({
    where: { tenantId, activa: true },
    orderBy: { nombre: 'asc' },
  });
}

export async function createCategoria(tenantId: number, nombre: string, color = 'blue') {
  return prisma.barberCategoriaProducto.upsert({
    where: { tenantId_nombre: { tenantId, nombre } },
    update: { activa: true, color },
    create: { tenantId, nombre, color },
  });
}

// ── Kardex ─────────────────────────────────────────────────────────────────────

const KARDEX_INCLUDE = {
  producto: {
    select: { id: true, codigo: true, nombre: true, unidadMedida: true },
  },
} as const;

export async function getKardex(
  productoId: number,
  tenantId: number,
  page = 1,
  pageSize = 20,
) {
  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    prisma.barberKardex.findMany({
      where: { productoId, tenantId },
      include: KARDEX_INCLUDE,
      orderBy: { fecha: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.barberKardex.count({ where: { productoId, tenantId } }),
  ]);
  return { items, total };
}

export async function getKardexGeneral(tenantId: number, page = 1, pageSize = 30) {
  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    prisma.barberKardex.findMany({
      where: { tenantId },
      include: KARDEX_INCLUDE,
      orderBy: { fecha: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.barberKardex.count({ where: { tenantId } }),
  ]);
  return { items, total };
}

export async function ajustarStock(
  productoId: number,
  tenantId: number,
  data: AjusteStockInput,
) {
  return prisma.$transaction(async (tx) => {
    const producto = await tx.barberProducto.findFirst({
      where: { id: productoId, tenantId },
    });
    if (!producto) throw new Error('Producto no encontrado');

    const stockAnterior = Number(producto.stockActual);
    const cantidad = Number(data.cantidad);
    let stockNuevo: number;

    if (data.tipoMovimiento === 'SALIDA') {
      stockNuevo = stockAnterior - cantidad;
    } else if (data.tipoMovimiento === 'ENTRADA') {
      stockNuevo = stockAnterior + cantidad;
    } else {
      // AJUSTE: cantidad es el nuevo stock absoluto
      stockNuevo = cantidad;
    }

    // Costo promedio ponderado (solo aplica en ENTRADA y COMPRA)
    let nuevoCostoPromedio = Number(producto.costoPromedio);
    if (data.tipoMovimiento === 'ENTRADA' && data.costoUnitario > 0) {
      const costoTotalAnterior = stockAnterior * nuevoCostoPromedio;
      const costoTotalNuevo = cantidad * data.costoUnitario;
      const nuevoStock = stockAnterior + cantidad;
      nuevoCostoPromedio = nuevoStock > 0
        ? (costoTotalAnterior + costoTotalNuevo) / nuevoStock
        : data.costoUnitario;
    }

    // Registrar movimiento en kardex
    await tx.barberKardex.create({
      data: {
        tenantId,
        productoId,
        tipoMovimiento: data.tipoMovimiento,
        referencia: data.referencia,
        cantidad: data.tipoMovimiento === 'AJUSTE' ? cantidad - stockAnterior : cantidad,
        costoUnitario: data.costoUnitario,
        costoTotal: Math.abs(data.tipoMovimiento === 'AJUSTE' ? (cantidad - stockAnterior) * data.costoUnitario : cantidad * data.costoUnitario),
        stockAnterior,
        stockNuevo,
        notas: data.notas,
        fecha: new Date(),
      },
    });

    // Actualizar stock y costo promedio en el producto
    const updatedProducto = await tx.barberProducto.update({
      where: { id: productoId },
      data: {
        stockActual: stockNuevo,
        costoPromedio: nuevoCostoPromedio,
      },
      include: PRODUCTO_INCLUDE,
    });

    return updatedProducto;
  });
}

// ── Resumen de inventario ──────────────────────────────────────────────────────

export async function getResumenInventario(tenantId: number) {
  const productos = await prisma.barberProducto.findMany({
    where: { tenantId, activo: true },
    select: { stockActual: true, stockMinimo: true, costoPromedio: true },
  });

  const totalProductos = productos.length;
  const productosStockBajo = productos.filter(
    p => Number(p.stockActual) <= Number(p.stockMinimo),
  ).length;
  const valorInventario = productos.reduce(
    (sum, p) => sum + Number(p.stockActual) * Number(p.costoPromedio),
    0,
  );

  const totalCategorias = await prisma.barberCategoriaProducto.count({
    where: { tenantId, activa: true },
  });

  return { totalProductos, productosStockBajo, valorInventario, totalCategorias };
}
