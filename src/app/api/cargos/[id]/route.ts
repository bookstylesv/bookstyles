/**
 * PUT    /api/cargos/[id] — Actualizar cargo
 * DELETE /api/cargos/[id] — Eliminar cargo
 */

import { NextRequest } from 'next/server';
import { ok } from '@/lib/response';
import { updateCargo, deleteCargo } from '@/modules/cargos/cargos.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

type Ctx = { params: Promise<{ id: string }> };

export const PUT = withTenantAuth(async (req: NextRequest, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    const body = await req.json();
    return ok(await updateCargo(Number(id), ctx.tenantId, body));
}, { requiredModule: 'planilla' })

export const DELETE = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    return ok(await deleteCargo(Number(id), ctx.tenantId));
}, { requiredModule: 'planilla' })
