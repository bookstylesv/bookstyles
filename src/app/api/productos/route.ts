/**
 * GET  /api/productos  — Listar productos con filtros y paginación
 * POST /api/productos  — Crear un nuevo producto
 */

import { NextRequest } from 'next/server';
import { ok, created } from '@/lib/response';
import { listProductos, createProducto } from '@/modules/productos/productos.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (req: NextRequest, ctx) => {    const query = Object.fromEntries(req.nextUrl.searchParams.entries());
    const result = await listProductos(ctx.tenantId, query);
    return ok(result);
}, { requiredModule: 'inventario' })

export const POST = withTenantAuth(async (req: NextRequest, ctx) => {
    const body = await req.json();
    const producto = await createProducto(ctx.tenantId, body);
    return created(producto);
}, { requiredModule: 'inventario' })
