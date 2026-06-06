/**
 * GET    /api/services/[id]  — Obtener servicio
 * PATCH  /api/services/[id]  — Actualizar servicio
 * DELETE /api/services/[id]  — Eliminar servicio
 */

import { NextRequest } from 'next/server';
import { ok } from '@/lib/response';
import * as svc from '@/modules/services/services.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

type Params = { params: Promise<{ id: string }> };

export const GET = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {    const { id } = await routeCtx.params;
    const service = await svc.getService(Number(id), ctx.tenantId);
    return ok(service);
}, { requiredModule: 'citas' })

export const PATCH = withTenantAuth(async (req: NextRequest, ctx, routeCtx) => {    const { id } = await routeCtx.params;
    const body = await req.json();
    const service = await svc.updateService(Number(id), ctx.tenantId, body);
    return ok(service);
}, { requiredModule: 'citas' })

export const DELETE = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {    const { id } = await routeCtx.params;
    await svc.removeService(Number(id), ctx.tenantId);
    return ok({ deleted: true });
}, { requiredModule: 'citas' })
