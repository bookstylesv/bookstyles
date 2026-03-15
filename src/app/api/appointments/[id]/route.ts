/**
 * GET   /api/appointments/[id]  — Obtener cita
 * PATCH /api/appointments/[id]  — Actualizar cita
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError } from '@/lib/errors';
import { getAppointment, updateAppointment } from '@/modules/appointments/appointments.service';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const { id } = await params;
    const appt = await getAppointment(Number(id), user.tenantId);
    return ok(appt);
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const { id } = await params;
    const body = await req.json();
    const appt = await updateAppointment(Number(id), user.tenantId, body);
    return ok(appt);
  } catch (err) {
    return apiError(err);
  }
}
