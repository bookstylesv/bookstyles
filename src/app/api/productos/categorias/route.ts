/**
 * GET  /api/productos/categorias  — Listar categorías activas del tenant
 * POST /api/productos/categorias  — Crear o reactivar una categoría
 */

import { NextRequest } from 'next/server';
import { ok, created } from '@/lib/response';
import { listCategorias, createCategoria } from '@/modules/productos/productos.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (_req: NextRequest, ctx) => {    const categorias = await listCategorias(ctx.tenantId);
    return ok(categorias);
}, { requiredModule: 'inventario' })

export const POST = withTenantAuth(async (req: NextRequest, ctx) => {
    const body = await req.json();
    const categoria = await createCategoria(ctx.tenantId, body);
    return created(categoria);
}, { requiredModule: 'inventario' })
