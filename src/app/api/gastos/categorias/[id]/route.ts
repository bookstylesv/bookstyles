/**
 * PUT    /api/gastos/categorias/[id]  — Actualizar categoría
 * DELETE /api/gastos/categorias/[id]  — Eliminar categoría (soft-delete si vacía)
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { updateCategoriaService, deleteCategoriaService } from '@/modules/gastos/gastos.service';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (!['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) throw new ForbiddenError();

    const { id } = await params;
    const body = await req.json();
    const categoria = await updateCategoriaService(user.tenantId, Number(id), body);
    return ok(categoria);
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
    const result = await deleteCategoriaService(user.tenantId, Number(id));
    return ok(result);
  } catch (err) {
    return apiError(err);
  }
}
