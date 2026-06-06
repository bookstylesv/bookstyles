/**
 * GET  /api/appointments  — Listar citas (con filtros opcionales)
 * POST /api/appointments  — Crear nueva cita
 */

import { NextRequest } from 'next/server';
import { ok, created } from '@/lib/response';
import { listAppointments, createAppointment } from '@/modules/appointments/appointments.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (req: NextRequest, ctx) => {    const query = Object.fromEntries(req.nextUrl.searchParams.entries());
    const appointments = await listAppointments(ctx.tenantId, query);
    return ok(appointments);
}, { requiredModule: 'citas' })

export const POST = withTenantAuth(async (req: NextRequest, ctx) => {    const body = await req.json();
    const appointment = await createAppointment(ctx.tenantId, body);
    return created(appointment);
}, { requiredModule: 'citas' })
