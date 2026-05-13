/**
 * POST /api/cxp/[id]/pago  — Registrar un pago parcial o total de una CxP
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { created, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { pagarCxP } from '@/modules/cxp/cxp.service';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (!['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) throw new ForbiddenError();

    const { id } = await params;
    const body = await req.json();
    const pago = await pagarCxP(user.tenantId, Number(id), body);
    return created(pago);
  } catch (err) {
    return apiError(err);
  }
}
