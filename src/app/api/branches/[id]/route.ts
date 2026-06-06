/**
 * GET    /api/branches/[id]  — Obtener sucursal con detalle
 * PATCH  /api/branches/[id]  — Actualizar sucursal (solo OWNER)
 * DELETE /api/branches/[id]  — Eliminar sucursal (solo OWNER, sin datos)
 */

import { NextRequest } from 'next/server';
import { ok } from '@/lib/response';
import { branchesService } from '@/modules/branches/branches.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

type Params = { params: Promise<{ id: string }> };

export const GET = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {    const { id } = await routeCtx.params;
    const branch = await branchesService.getBranch(Number(id), ctx.tenantId);
    return ok(branch);
}, { requiredModule: 'branches' })

export const PATCH = withTenantAuth(async (req: NextRequest, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    const body = await req.json();
    const branch = await branchesService.updateBranch(Number(id), ctx.tenantId, body);
    return ok(branch);
}, { requiredModule: 'branches' })

export const DELETE = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    await branchesService.deleteBranch(Number(id), ctx.tenantId);
    return ok({ deleted: true });
}, { requiredModule: 'branches' })
