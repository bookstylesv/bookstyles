/**
 * GET  /api/compras/[id]/pagos  — Historial de pagos de una compra
 * POST /api/compras/[id]/pagos  — Registrar un pago CxP
 *
 * Requiere rol OWNER.
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, created, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { historialPagos, registrarPago } from '@/modules/compras/compras.service';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (!['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) throw new ForbiddenError();

    const { id } = await params;
    const pagos = await historialPagos(user.tenantId, Number(id));
    return ok(pagos);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (!['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) throw new ForbiddenError();

    const { id } = await params;
    const body = await req.json();
    const pago = await registrarPago(user.tenantId, Number(id), body);
    return created(pago);
  } catch (err) {
    return apiError(err);
  }
}
