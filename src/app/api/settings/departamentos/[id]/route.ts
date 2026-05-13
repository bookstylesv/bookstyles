/**
 * PATCH  /api/settings/departamentos/[id]  — Editar nombre (OWNER)
 * DELETE /api/settings/departamentos/[id]  — Eliminar (OWNER, solo si sin municipios)
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { updateDepartamento, deleteDepartamento } from '@/modules/settings/territorios.service';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (user.role !== 'SUPERADMIN') throw new ForbiddenError();

    const { id } = await params;
    const body = await req.json();
    const data = await updateDepartamento(Number(id), body);
    return ok(data);
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (user.role !== 'SUPERADMIN') throw new ForbiddenError();

    const { id } = await params;
    await deleteDepartamento(Number(id));
    return ok({ deleted: true });
  } catch (err) {
    return apiError(err);
  }
}
