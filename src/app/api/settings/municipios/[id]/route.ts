/**
 * PATCH  /api/settings/municipios/[id]  — Editar nombre (OWNER)
 * DELETE /api/settings/municipios/[id]  — Eliminar (OWNER)
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { updateMunicipio, deleteMunicipio } from '@/modules/settings/territorios.service';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (user.role !== 'SUPERADMIN') throw new ForbiddenError();

    const { id } = await params;
    const body = await req.json();
    const data = await updateMunicipio(Number(id), body);
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
    await deleteMunicipio(Number(id));
    return ok({ deleted: true });
  } catch (err) {
    return apiError(err);
  }
}
