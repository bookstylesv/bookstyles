/**
 * GET  /api/branches  — Listar sucursales del tenant
 * POST /api/branches  — Crear nueva sucursal (solo OWNER)
 */

import { NextRequest } from 'next/server';
import { ok, created } from '@/lib/response';
import { branchesService } from '@/modules/branches/branches.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (_req: NextRequest, ctx) => {    const branches = await branchesService.listBranches(ctx.tenantId);
    return ok(branches);
}, { requiredModule: 'branches' })

export const POST = withTenantAuth(async (req: NextRequest, ctx) => {
    const body = await req.json();
    const branch = await branchesService.createBranch(ctx.tenantId, body);
    return created(branch);
}, { requiredModule: 'branches' })
