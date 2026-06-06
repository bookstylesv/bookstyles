/**
 * GET    /api/productos/[id]  — Obtener un producto por ID
 * PUT    /api/productos/[id]  — Actualizar un producto
 * DELETE /api/productos/[id]  — Desactivar (soft delete) un producto
 */

import { NextRequest } from 'next/server';
import { ok } from '@/lib/response';
import {
  getProducto,
  updateProducto,
  deactivateProducto,
} from '@/modules/productos/productos.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

type Params = { params: Promise<{ id: string }> };

export const GET = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {    const { id } = await routeCtx.params;
    const producto = await getProducto(Number(id), ctx.tenantId);
    return ok(producto);
}, { requiredModule: 'inventario' })

export const PUT = withTenantAuth(async (req: NextRequest, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    const body = await req.json();
    const updated = await updateProducto(Number(id), ctx.tenantId, body);
    return ok(updated);
}, { requiredModule: 'inventario' })

export const DELETE = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    const updated = await deactivateProducto(Number(id), ctx.tenantId);
    return ok(updated);
}, { requiredModule: 'inventario' })
