/**
 * POST /api/appointments/[id]/cancel — Cancelar cita
 */

import { NextRequest } from 'next/server';
import { ok } from '@/lib/response';
import { cancelAppointment } from '@/modules/appointments/appointments.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

type Params = { params: Promise<{ id: string }> };

export const POST = withTenantAuth(async (req: NextRequest, ctx, routeCtx) => {    const { id } = await routeCtx.params;
    const body = await req.json().catch(() => ({}));
    const appt = await cancelAppointment(Number(id), ctx.tenantId, body.reason);
    return ok(appt);
}, { requiredModule: 'citas' })
