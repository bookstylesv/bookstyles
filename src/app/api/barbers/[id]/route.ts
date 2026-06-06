/**
 * GET   /api/barbers/[id]  — Obtener barbero
 * PATCH /api/barbers/[id]  — Actualizar bio/specialties/active
 */

import { NextRequest } from 'next/server';
import { ok } from '@/lib/response';
import { getBarber, updateBarber } from '@/modules/barbers/barbers.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

type Params = { params: Promise<{ id: string }> };

export const GET = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {    const { id } = await routeCtx.params;
    const barber = await getBarber(Number(id), ctx.tenantId);
    return ok(barber);
}, { requiredModule: 'citas' })

export const PATCH = withTenantAuth(async (req: NextRequest, ctx, routeCtx) => {    const { id } = await routeCtx.params;
    const body = await req.json();
    const barber = await updateBarber(Number(id), ctx.tenantId, body);
    return ok(barber);
}, { requiredModule: 'citas' })
