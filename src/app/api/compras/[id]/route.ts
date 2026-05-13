/**
 * GET /api/compras/[id]  — Obtener detalle de una compra
 *
 * Requiere rol OWNER.
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { getCompra } from '@/modules/compras/compras.service';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (!['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) throw new ForbiddenError();

    const { id } = await params;
    const compra = await getCompra(Number(id), user.tenantId);
    return ok(compra);
  } catch (err) {
    return apiError(err);
  }
}
