/**
 * GET   /api/appointments/[id]  — Obtener cita
 * PATCH /api/appointments/[id]  — Actualizar cita
 */

import { NextRequest } from 'next/server';
import { ok } from '@/lib/response';
import { getAppointment, updateAppointment } from '@/modules/appointments/appointments.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

type Params = { params: Promise<{ id: string }> };

export const GET = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {    const { id } = await routeCtx.params;
    const appt = await getAppointment(Number(id), ctx.tenantId);
    return ok(appt);
}, { requiredModule: 'citas' })

export const PATCH = withTenantAuth(async (req: NextRequest, ctx, routeCtx) => {    const { id } = await routeCtx.params;
    const body = await req.json();
    const appt = await updateAppointment(Number(id), ctx.tenantId, body);
    return ok(appt);
}, { requiredModule: 'citas' })
