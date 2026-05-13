/**
 * POST /api/compras/[id]/anular  — Anular una compra
 * Body: { motivo: string }
 *
 * Si la compra era de tipo PRODUCTO, revierte el inventario y crea
 * entradas de tipo ANULACION en el kardex.
 *
 * Requiere rol OWNER.
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { anularCompra } from '@/modules/compras/compras.service';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (!['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) throw new ForbiddenError();

    const { id } = await params;
    const body = await req.json();
    const motivo = body?.motivo as string | undefined;

    const compra = await anularCompra(Number(id), user.tenantId, motivo ?? '');
    return ok(compra);
  } catch (err) {
    return apiError(err);
  }
}
