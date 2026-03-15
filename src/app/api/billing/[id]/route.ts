/**
 * PATCH /api/billing/[id]  — Actualizar método/estado de un pago
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { patchPayment } from '@/modules/billing/billing.service';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (user.role !== 'OWNER' && user.role !== 'BARBER') throw new ForbiddenError();

    const { id } = await params;
    const body = await req.json();
    const payment = await patchPayment(user.tenantId, Number(id), body);
    return ok(payment);
  } catch (err) {
    return apiError(err);
  }
}
