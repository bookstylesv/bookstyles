/**
 * GET /api/barbers — Listar barberos del tenant
 */

import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError } from '@/lib/errors';
import { listBarbers } from '@/modules/barbers/barbers.service';

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
