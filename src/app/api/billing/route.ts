/**
 * GET  /api/billing         — Listar pagos con filtros
 * POST /api/billing         — Registrar un pago
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, created, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { listPayments, registerPayment } from '@/modules/billing/billing.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const query = Object.fromEntries(req.nextUrl.searchParams.entries());
    const payments = await listPayments(user.tenantId, query);
    return ok(payments);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (user.role === 'OWNER') throw new ForbiddenError();

    const body = await req.json();
    const payment = await registerPayment(user.tenantId, body);
    return created(payment);
  } catch (err) {
    return apiError(err);
  }
}
