/**
 * GET  /api/barbers — Listar barberos del tenant
 * POST /api/barbers — Crear nuevo barbero (con usuario)
 */

import { getCurrentUser } from '@/lib/auth';
import { created, ok, apiError } from '@/lib/response';
import { UnauthorizedError } from '@/lib/errors';
import { listBarbers, createBarber } from '@/modules/barbers/barbers.service';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const barbers = await listBarbers(user.tenantId);
    return ok(barbers);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const body = await request.json();
    const barber = await createBarber(user.tenantId, body);
    return created(barber);
  } catch (err) {
    return apiError(err);
  }
}
