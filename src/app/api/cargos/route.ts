/**
 * GET  /api/cargos — Listar cargos del tenant
 * POST /api/cargos — Crear cargo
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, created, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { listCargos, createCargo } from '@/modules/cargos/cargos.service';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    return ok(await listCargos(user.tenantId));
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (user.role !== 'OWNER') throw new ForbiddenError();
    const body = await req.json();
    return created(await createCargo(user.tenantId, body));
  } catch (err) {
    return apiError(err);
  }
}
