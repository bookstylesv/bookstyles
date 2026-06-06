/**
 * GET  /api/settings/municipios?departamento=cod  — Listar municipios (filtro opcional)
 * POST /api/settings/municipios                   — Crear municipio (OWNER)
 */

import { NextRequest } from 'next/server';
import { ok, created } from '@/lib/response';
import { ForbiddenError } from '@/lib/errors';
import { listMunicipios, createMunicipio } from '@/modules/settings/territorios.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (req: NextRequest, ctx) => {    const departamentoCod = req.nextUrl.searchParams.get('departamento') ?? undefined;
    const data = await listMunicipios(departamentoCod);
    return ok(data);
}, { requiredModule: 'settings' })

export const POST = withTenantAuth(async (req: NextRequest, ctx) => {    if (ctx.user.role !== 'SUPERADMIN') throw new ForbiddenError();

    const body = await req.json();
    const data = await createMunicipio(body);
    return created(data);
}, { requiredModule: 'settings' })
