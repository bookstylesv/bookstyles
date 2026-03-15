/**
 * GET /api/appointments/stats — KPIs del dashboard
 */

import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError } from '@/lib/errors';
import { getStats } from '@/modules/appointments/appointments.service';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const stats = await getStats(user.tenantId);
    return ok(stats);
  } catch (err) {
    return apiError(err);
  }
}
