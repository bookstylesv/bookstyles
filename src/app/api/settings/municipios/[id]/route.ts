/**
 * PATCH  /api/settings/municipios/[id]  — Editar nombre (OWNER)
 * DELETE /api/settings/municipios/[id]  — Eliminar (OWNER)
 */

import { NextRequest } from 'next/server';
import { ok } from '@/lib/response';
import { ForbiddenError } from '@/lib/errors';
import { updateMunicipio, deleteMunicipio } from '@/modules/settings/territorios.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withTenantAuth(async (req: NextRequest, ctx, routeCtx) => {    if (ctx.user.role !== 'SUPERADMIN') throw new ForbiddenError();

    const { id } = await routeCtx.params;
    const body = await req.json();
    const data = await updateMunicipio(Number(id), body);
    return ok(data);
}, { requiredModule: 'settings' })

export const DELETE = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {    if (ctx.user.role !== 'SUPERADMIN') throw new ForbiddenError();

    const { id } = await routeCtx.params;
    await deleteMunicipio(Number(id));
    return ok({ deleted: true });
}, { requiredModule: 'settings' })
