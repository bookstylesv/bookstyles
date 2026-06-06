/**
 * GET    /api/branches/[id]/barbers          — Listar barberos asignados
 * POST   /api/branches/[id]/barbers          — Asignar barbero a sucursal
 * DELETE /api/branches/[id]/barbers?barberId — Quitar barbero de sucursal
 */

import { NextRequest } from 'next/server';
import { ok, created } from '@/lib/response';
import { branchesService } from '@/modules/branches/branches.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

type Params = { params: Promise<{ id: string }> };

export const GET = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {    const { id } = await routeCtx.params;
    const barbers = await branchesService.getBarbersForBranch(Number(id), ctx.tenantId);
    return ok(barbers);
}, { requiredModule: 'branches' })

export const POST = withTenantAuth(async (req: NextRequest, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    const { barberId, isPrimary = false } = await req.json() as { barberId: number; isPrimary?: boolean };
    const assignment = await branchesService.assignBarber(Number(id), ctx.tenantId, barberId, isPrimary);
    return created(assignment);
}, { requiredModule: 'branches' })

export const DELETE = withTenantAuth(async (req: NextRequest, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    const { searchParams } = new URL(req.url);
    const barberId = Number(searchParams.get('barberId'));
    await branchesService.removeBarber(Number(id), ctx.tenantId, barberId);
    return ok({ removed: true });
}, { requiredModule: 'branches' })
