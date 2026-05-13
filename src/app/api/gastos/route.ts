/**
 * GET  /api/gastos  — Listar gastos con filtros opcionales
 * POST /api/gastos  — Registrar nuevo gasto
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, created, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { listGastos, createGastoService } from '@/modules/gastos/gastos.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (!['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) throw new ForbiddenError();

    const query = Object.fromEntries(req.nextUrl.searchParams.entries());
    const result = await listGastos(user.tenantId, query);
    return ok(result.gastos);
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
    const gasto = await createGastoService(user.tenantId, body);
    return created(gasto);
  } catch (err) {
    return apiError(err);
  }
}
