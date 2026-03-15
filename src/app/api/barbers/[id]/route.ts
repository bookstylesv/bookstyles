/**
 * GET   /api/barbers/[id]  — Obtener barbero
 * PATCH /api/barbers/[id]  — Actualizar bio/specialties/active
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError } from '@/lib/errors';
import { getBarber, updateBarber } from '@/modules/barbers/barbers.service';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const { id } = await params;
    const barber = await getBarber(Number(id), user.tenantId);
    return ok(barber);
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
    const barber = await updateBarber(Number(id), user.tenantId, body);
    return ok(barber);
  } catch (err) {
    return apiError(err);
  }
}
