/**
 * PUT    /api/gastos/[id]  — Actualizar gasto
 * DELETE /api/gastos/[id]  — Eliminar gasto
 */

import { NextRequest } from 'next/server';
import { ok } from '@/lib/response';
import { updateGastoService, deleteGastoService } from '@/modules/gastos/gastos.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

type Ctx = { params: Promise<{ id: string }> };

export const PUT = withTenantAuth(async (req: NextRequest, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    const body = await req.json();
    const gasto = await updateGastoService(ctx.tenantId, Number(id), body);
    return ok(gasto);
}, { requiredModule: 'gastos' })

export const DELETE = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    const result = await deleteGastoService(ctx.tenantId, Number(id));
    return ok(result);
}, { requiredModule: 'gastos' })
