/**
 * POST /api/productos/[id]/ajustar-stock
 * Ajuste manual de stock: ENTRADA | SALIDA | AJUSTE
 * Crea el movimiento en kardex y actualiza stockActual + costoPromedio.
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { ajustarStock } from '@/modules/productos/productos.service';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (user.role !== 'OWNER') throw new ForbiddenError('Solo el propietario puede ajustar el stock');

    const { id } = await params;
    const body = await req.json();
    const updated = await ajustarStock(Number(id), user.tenantId, body, user.branchId);
    return ok(updated);
  } catch (err) {
    return apiError(err);
  }
}
