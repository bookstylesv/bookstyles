/**
 * productos.service.ts — Lógica de negocio para el módulo de Productos e Inventario.
 * Serializa campos Decimal (Prisma) a number para evitar errores de serialización JSON.
 * Valida reglas de negocio antes de delegar al repositorio.
 */

import { NotFoundError, ValidationError, ConflictError } from '@/lib/errors';
import * as repo from './productos.repository';
import { prisma } from '@/lib/prisma';

// ── Tipos serializados (Decimal → number) ───────────────────────────────────────

export type ProductoSerialized = {
  id: number;
  tenantId: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoriaId: number | null;
  categoria: { id: number; nombre: string } | null;
  precioVenta: number;
  costoPromedio: number;
  comisionTipo: string;
  precioComision: number | null;
  stockMinimo: number;
  stockActual: number;
  unidadMedida: string;
  unidadCompra: string;
  unidadVentaId: number | null;
  unidadVenta: { id: number; nombre: string; simbolo: string | null } | null;
  factorConversion: number;
  activo: boolean;
  stockBajo: boolean;
};

export type KardexSerialized = {
  id: number;
  tenantId: number;
  productoId: number;
  tipoMovimiento: string;
  referencia: string;
  cantidad: number;
  costoUnitario: number;
  costoTotal: number;
  stockAnterior: number;
  stockNuevo: number;
  notas: string | null;
  fecha: string;
  producto: { id: number; codigo: string; nombre: string; unidadMedida: string } | null;
};

// ── Serializadores ──────────────────────────────────────────────────────────────

type RawProducto = Awaited<ReturnType<typeof repo.findProductoById>>;

function serializeProducto(p: NonNullable<RawProducto>): ProductoSerialized {
  const stockActual = Number(p.stockActual);
  const stockMinimo = Number(p.stockMinimo);
  return {
    id: p.id,
    tenantId: p.tenantId,
    codigo: p.codigo,
    nombre: p.nombre,
    descripcion: p.descripcion ?? null,
    categoriaId: p.categoriaId ?? null,
    categoria: p.categoria ?? null,
    precioVenta: Number(p.precioVenta),
    costoPromedio: Number(p.costoPromedio),
    comisionTipo: p.comisionTipo ?? 'NINGUNA',
    precioComision: p.precioComision !== null && p.precioComision !== undefined ? Number(p.precioComision) : null,
    stockMinimo,
    stockActual,
    unidadMedida: p.unidadMedida,
    unidadCompra: p.unidadCompra,
    unidadVentaId: p.unidadVentaId ?? null,
    unidadVenta: (p as unknown as { unidadVenta?: { id: number; nombre: string; simbolo: string | null } | null }).unidadVenta ?? null,
    factorConversion: Number(p.factorConversion ?? 1),
    activo: p.activo,
    stockBajo: stockActual <= stockMinimo,
  };
}

type RawKardex = {
  id: number;
  tenantId: number;
  productoId: number;
  tipoMovimiento: string;
  referencia: string;
  cantidad: { toNumber(): number } | number;
  costoUnitario: { toNumber(): number } | number;
  costoTotal: { toNumber(): number } | number;
  stockAnterior: { toNumber(): number } | number;
  stockNuevo: { toNumber(): number } | number;
  notas: string | null;
  fecha: Date;
  producto: { id: number; codigo: string; nombre: string; unidadMedida: string } | null;
};

function serializeKardex(k: RawKardex): KardexSerialized {
  const toNum = (v: { toNumber(): number } | number) =>
    typeof v === 'number' ? v : v.toNumber();
  return {
    id: k.id,
    tenantId: k.tenantId,
    productoId: k.productoId,
    tipoMovimiento: k.tipoMovimiento,
    referencia: k.referencia,
    cantidad: toNum(k.cantidad),
    costoUnitario: toNum(k.costoUnitario),
    costoTotal: toNum(k.costoTotal),
    stockAnterior: toNum(k.stockAnterior),
    stockNuevo: toNum(k.stockNuevo),
    notas: k.notas ?? null,
    fecha: k.fecha.toISOString(),
    producto: k.producto ?? null,
  };
}

// ── Productos ───────────────────────────────────────────────────────────────────

export async function listProductos(tenantId: number, query: Record<string, string> = {}) {
  const filters: repo.ProductoFilters = {};
  if (query.search) filters.search = query.search;
  if (query.categoriaId) filters.categoriaId = Number(query.categoriaId);
  if (query.soloStockBajo === 'true') filters.soloStockBajo = true;

  const page = Math.max(1, parseInt(query.page ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '50', 10)));
  const skip = (page - 1) * limit;

  const { items, total } = await repo.findAllProductos(tenantId, filters, { page, limit, skip });
  return {
    items: items.map(p => serializeProducto(p as NonNullable<RawProducto>)),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getProducto(id: number, tenantId: number) {
  const p = await repo.findProductoById(id, tenantId);
  if (!p) throw new NotFoundError('Producto');
  return serializeProducto(p);
}

export async function createProducto(tenantId: number, body: unknown) {
  const b = body as Record<string, unknown>;

  if (!b.codigo) throw new ValidationError('El código es requerido');
  if (!b.nombre) throw new ValidationError('El nombre es requerido');
  if (!b.precioVenta) throw new ValidationError('El precio de venta es requerido');

  const precioVenta = Number(b.precioVenta);
  if (isNaN(precioVenta) || precioVenta <= 0) {
    throw new ValidationError('El precio de venta debe ser mayor a 0');
  }

  // Verificar unicidad de código por tenant
  const existing = await prisma.barberProducto.findFirst({
    where: { tenantId, codigo: String(b.codigo) },
  });
  if (existing) {
    throw new ConflictError(`El código "${b.codigo}" ya está en uso`);
  }

  const payload = {
    codigo: String(b.codigo).toUpperCase().trim(),
    nombre: String(b.nombre).trim(),
    descripcion: b.descripcion ? String(b.descripcion).trim() : undefined,
    categoriaId: b.categoriaId ? Number(b.categoriaId) : undefined,
    precioVenta,
    costoPromedio: b.costoPromedio ? Number(b.costoPromedio) : 0,
    precioComision: b.precioComision !== undefined && b.precioComision !== null && b.precioComision !== ''
      ? Number(b.precioComision)
      : null,
    stockMinimo: b.stockMinimo ? Number(b.stockMinimo) : 0,
    stockInicial: b.stockInicial ? Number(b.stockInicial) : 0,
    unidadMedida: b.unidadMedida ? String(b.unidadMedida) : 'UNIDAD',
    unidadCompra: b.unidadCompra ? String(b.unidadCompra).trim() : 'UNIDAD',
    unidadVentaId: b.unidadVentaId ? Number(b.unidadVentaId) : null,
    factorConversion: b.factorConversion ? Number(b.factorConversion) : 1,
  };

  const p = await repo.createProducto(tenantId, payload);

  // Si hay stock inicial, crear entrada en kardex
  const stockInicial = b.stockInicial ? Number(b.stockInicial) : 0;
  if (stockInicial > 0) {
    await prisma.barberKardex.create({
      data: {
        tenantId,
        productoId: p.id,
        tipoMovimiento: 'ENTRADA',
        referencia: 'STOCK_INICIAL',
        cantidad: stockInicial,
        costoUnitario: Number(p.costoPromedio),
        costoTotal: stockInicial * Number(p.costoPromedio),
        stockAnterior: 0,
        stockNuevo: stockInicial,
        notas: 'Stock inicial al crear el producto',
        fecha: new Date(),
      },
    });
  }

  return serializeProducto(p);
}

export async function updateProducto(id: number, tenantId: number, body: unknown) {
  const existing = await repo.findProductoById(id, tenantId);
  if (!existing) throw new NotFoundError('Producto');

  const b = body as Record<string, unknown>;
  const data: repo.ProductoUpdateInput = {};

  if (b.codigo !== undefined) {
    const nuevoCodigo = String(b.codigo).toUpperCase().trim();
    // Verificar que el nuevo código no esté ocupado por otro producto
    if (nuevoCodigo !== existing.codigo) {
      const conflict = await prisma.barberProducto.findFirst({
        where: { tenantId, codigo: nuevoCodigo, NOT: { id } },
      });
      if (conflict) throw new ConflictError(`El código "${nuevoCodigo}" ya está en uso`);
    }
    data.codigo = nuevoCodigo;
  }

  if (b.nombre !== undefined) data.nombre = String(b.nombre).trim();
  if (b.descripcion !== undefined) data.descripcion = String(b.descripcion).trim();
  if (b.categoriaId !== undefined) data.categoriaId = b.categoriaId ? Number(b.categoriaId) : undefined;
  if (b.precioVenta !== undefined) {
    const pv = Number(b.precioVenta);
    if (isNaN(pv) || pv <= 0) throw new ValidationError('El precio de venta debe ser mayor a 0');
    data.precioVenta = pv;
  }
  if (b.costoPromedio !== undefined) data.costoPromedio = Number(b.costoPromedio);
  if (b.precioComision !== undefined) {
    data.precioComision = (b.precioComision !== null && b.precioComision !== '')
      ? Number(b.precioComision)
      : null;
  }
  if (b.stockMinimo !== undefined) data.stockMinimo = Number(b.stockMinimo);
  if (b.unidadMedida !== undefined) data.unidadMedida = String(b.unidadMedida);
  if (b.unidadCompra !== undefined) data.unidadCompra = String(b.unidadCompra).trim();
  if (b.unidadVentaId !== undefined) data.unidadVentaId = b.unidadVentaId ? Number(b.unidadVentaId) : null;
  if (b.factorConversion !== undefined) data.factorConversion = Number(b.factorConversion);

  const updated = await repo.updateProducto(id, tenantId, data);
  return serializeProducto(updated);
}

export async function deactivateProducto(id: number, tenantId: number) {
  const existing = await repo.findProductoById(id, tenantId);
  if (!existing) throw new NotFoundError('Producto');

  const updated = await repo.deactivateProducto(id, tenantId);
  return serializeProducto(updated);
}

export async function searchProductos(tenantId: number, query: string) {
  const results = await repo.searchProductos(tenantId, query);
  return results.map(p => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    stockActual: Number(p.stockActual),
    unidadMedida: p.unidadMedida,
    precioVenta: Number(p.precioVenta),
  }));
}

// ── Categorías ──────────────────────────────────────────────────────────────────

export async function listCategorias(tenantId: number) {
  return repo.findAllCategorias(tenantId);
}

export async function createCategoria(tenantId: number, body: unknown) {
  const b = body as Record<string, unknown>;
  if (!b.nombre) throw new ValidationError('El nombre de la categoría es requerido');

  const nombre = String(b.nombre).trim();
  if (nombre.length < 2) throw new ValidationError('El nombre debe tener al menos 2 caracteres');

  const color = b.color ? String(b.color) : 'blue';

  return repo.createCategoria(tenantId, nombre, color);
}

// ── Kardex ──────────────────────────────────────────────────────────────────────

export async function getKardexProducto(productoId: number, tenantId: number, query: Record<string, string> = {}) {
  const p = await repo.findProductoById(productoId, tenantId);
  if (!p) throw new NotFoundError('Producto');

  const page = Math.max(1, parseInt(query.page ?? '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10)));
  const { items, total } = await repo.getKardex(productoId, tenantId, page, pageSize);

  return {
    items: items.map(k => serializeKardex(k as unknown as RawKardex)),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    producto: serializeProducto(p),
  };
}

export async function getKardexGeneral(tenantId: number, query: Record<string, string> = {}) {
  const page = Math.max(1, parseInt(query.page ?? '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(query.limit ?? '30', 10)));
  const { items, total } = await repo.getKardexGeneral(tenantId, page, pageSize);

  return {
    items: items.map(k => serializeKardex(k as unknown as RawKardex)),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function ajustarStock(id: number, tenantId: number, body: unknown) {
  const existing = await repo.findProductoById(id, tenantId);
  if (!existing) throw new NotFoundError('Producto');

  const b = body as Record<string, unknown>;
  const tipoMovimiento = b.tipoMovimiento as 'ENTRADA' | 'SALIDA' | 'AJUSTE';

  if (!tipoMovimiento || !['ENTRADA', 'SALIDA', 'AJUSTE'].includes(tipoMovimiento)) {
    throw new ValidationError('tipoMovimiento debe ser ENTRADA, SALIDA o AJUSTE');
  }
  if (!b.cantidad) throw new ValidationError('La cantidad es requerida');
  if (!b.referencia) throw new ValidationError('La referencia es requerida');

  const cantidad = Number(b.cantidad);
  if (isNaN(cantidad) || cantidad < 0) {
    throw new ValidationError('La cantidad debe ser un número mayor o igual a 0');
  }

  // Validar que SALIDA no deje stock negativo
  if (tipoMovimiento === 'SALIDA') {
    const stockActual = Number(existing.stockActual);
    if (cantidad > stockActual) {
      throw new ValidationError(
        `Stock insuficiente. Stock actual: ${stockActual} ${existing.unidadMedida}. Salida solicitada: ${cantidad}`
      );
    }
  }

  const costoUnitario = b.costoUnitario ? Number(b.costoUnitario) : Number(existing.costoPromedio);

  const updated = await repo.ajustarStock(id, tenantId, {
    tipoMovimiento,
    cantidad,
    costoUnitario,
    referencia: String(b.referencia).trim(),
    notas: b.notas ? String(b.notas).trim() : undefined,
  });

  return serializeProducto(updated);
}

// ── Resumen ─────────────────────────────────────────────────────────────────────

export async function getResumenInventario(tenantId: number) {
  return repo.getResumenInventario(tenantId);
}
