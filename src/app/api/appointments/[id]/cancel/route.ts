/**
 * POST /api/appointments/[id]/cancel — Cancelar cita
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError } from '@/lib/errors';
import { cancelAppointment } from '@/modules/appointments/appointments.service';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const appt = await cancelAppointment(Number(id), user.tenantId, body.reason);
    return ok(appt);
  } catch (err) {
    return apiError(err);
  }
}
