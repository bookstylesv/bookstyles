/**
 * GET  /api/cargos — Listar cargos del tenant
 * POST /api/cargos — Crear cargo
 */

import { NextRequest } from 'next/server';
import { ok, created } from '@/lib/response';
import { listCargos, createCargo } from '@/modules/cargos/cargos.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (_req: NextRequest, ctx) => {    return ok(await listCargos(ctx.tenantId));
}, { requiredModule: 'planilla' })

export const POST = withTenantAuth(async (req: NextRequest, ctx) => {
    const body = await req.json();
    return created(await createCargo(ctx.tenantId, body));
}, { requiredModule: 'planilla' })
