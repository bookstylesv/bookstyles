/**
 * GET  /api/settings/departamentos  — Listar departamentos con conteo de municipios
 * POST /api/settings/departamentos  — Crear departamento (OWNER)
 */

import { NextRequest } from 'next/server';
import { ok, created } from '@/lib/response';
import { ForbiddenError } from '@/lib/errors';
import { listDepartamentos, createDepartamento } from '@/modules/settings/territorios.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (_req: NextRequest, ctx) => {    const data = await listDepartamentos();
    return ok(data);
}, { requiredModule: 'settings' })

export const POST = withTenantAuth(async (req: NextRequest, ctx) => {    if (ctx.user.role !== 'SUPERADMIN') throw new ForbiddenError();

    const body = await req.json();
    const data = await createDepartamento(body);
    return created(data);
}, { requiredModule: 'settings' })
