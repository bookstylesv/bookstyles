/**
 * PUT    /api/gastos/categorias/[id]  — Actualizar categoría
 * DELETE /api/gastos/categorias/[id]  — Eliminar categoría (soft-delete si vacía)
 */

import { NextRequest } from 'next/server';
import { ok } from '@/lib/response';
import { updateCategoriaService, deleteCategoriaService } from '@/modules/gastos/gastos.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

type Ctx = { params: Promise<{ id: string }> };

export const PUT = withTenantAuth(async (req: NextRequest, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    const body = await req.json();
    const categoria = await updateCategoriaService(ctx.tenantId, Number(id), body);
    return ok(categoria);
}, { requiredModule: 'gastos' })

export const DELETE = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    const result = await deleteCategoriaService(ctx.tenantId, Number(id));
    return ok(result);
}, { requiredModule: 'gastos' })
