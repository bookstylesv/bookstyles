/**
 * GET  /api/compras  — Listar compras con filtros y paginación
 * POST /api/compras  — Registrar una nueva compra
 *
 * Requiere rol OWNER.
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, created, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { listCompras, createCompra } from '@/modules/compras/compras.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (!['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) throw new ForbiddenError();

    const query = Object.fromEntries(req.nextUrl.searchParams.entries());
    const result = await listCompras(user.tenantId, query);
    return ok(result.data);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (!['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) throw new ForbiddenError();

    const body = await req.json();
    const compra = await createCompra(user.tenantId, body);
    return created(compra);
  } catch (err) {
    return apiError(err);
  }
}
