/**
 * GET  /api/inventario/transferencias — Listar transferencias de stock
 * POST /api/inventario/transferencias — Crear transferencia (OWNER only)
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, created, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { transferirStock, listTransferencias } from '@/modules/inventario/inventario.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const sp = req.nextUrl.searchParams;
    const query: Record<string, string> = {};
    sp.forEach((v, k) => { query[k] = v; });

    // Si el usuario tiene branchId en el JWT, usarlo como filtro por defecto
    if (!query.branchId && user.branchId != null) {
      query.branchId = String(user.branchId);
    }

    const result = await listTransferencias(user.tenantId, query);
    return ok(result);
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (user.role !== 'OWNER') throw new ForbiddenError('Solo el propietario puede transferir stock');

    const body = await req.json();
    const result = await transferirStock(user.tenantId, body);
    return created(result);
  } catch (e) {
    return apiError(e);
  }
}
