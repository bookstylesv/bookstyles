/**
 * PATCH  /api/settings/departamentos/[id]  — Editar nombre (OWNER)
 * DELETE /api/settings/departamentos/[id]  — Eliminar (OWNER, solo si sin municipios)
 */

import { NextRequest } from 'next/server';
import { ok } from '@/lib/response';
import { ForbiddenError } from '@/lib/errors';
import { updateDepartamento, deleteDepartamento } from '@/modules/settings/territorios.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withTenantAuth(async (req: NextRequest, ctx, routeCtx) => {    if (ctx.user.role !== 'SUPERADMIN') throw new ForbiddenError();

    const { id } = await routeCtx.params;
    const body = await req.json();
    const data = await updateDepartamento(Number(id), body);
    return ok(data);
}, { requiredModule: 'settings' })

export const DELETE = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {    if (ctx.user.role !== 'SUPERADMIN') throw new ForbiddenError();

    const { id } = await routeCtx.params;
    await deleteDepartamento(Number(id));
    return ok({ deleted: true });
}, { requiredModule: 'settings' })
