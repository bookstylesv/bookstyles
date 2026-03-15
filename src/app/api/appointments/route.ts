/**
 * GET  /api/appointments  — Listar citas (con filtros opcionales)
 * POST /api/appointments  — Crear nueva cita
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, created, apiError } from '@/lib/response';
import { UnauthorizedError } from '@/lib/errors';
import { listAppointments, createAppointment } from '@/modules/appointments/appointments.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const query = Object.fromEntries(req.nextUrl.searchParams.entries());
    const appointments = await listAppointments(user.tenantId, query);
    return ok(appointments);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const body = await req.json();
    const appointment = await createAppointment(user.tenantId, body);
    return created(appointment);
  } catch (err) {
    return apiError(err);
  }
}
