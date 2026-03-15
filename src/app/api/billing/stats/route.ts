/**
 * GET /api/billing/stats — KPIs de caja
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError } from '@/lib/errors';
import { getStats } from '@/modules/billing/billing.service';

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const stats = await getStats(user.tenantId);
    return ok(stats);
  } catch (err) {
    return apiError(err);
  }
}
