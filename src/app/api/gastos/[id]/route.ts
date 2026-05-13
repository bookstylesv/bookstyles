/**
 * PUT    /api/gastos/[id]  — Actualizar gasto
 * DELETE /api/gastos/[id]  — Eliminar gasto
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { updateGastoService, deleteGastoService } from '@/modules/gastos/gastos.service';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (!['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) throw new ForbiddenError();

    const { id } = await params;
    const body = await req.json();
    const gasto = await updateGastoService(user.tenantId, Number(id), body);
    return ok(gasto);
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (!['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) throw new ForbiddenError();

    const { id } = await params;
    const result = await deleteGastoService(user.tenantId, Number(id));
    return ok(result);
  } catch (err) {
    return apiError(err);
  }
}
