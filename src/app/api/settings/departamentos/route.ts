/**
 * GET  /api/settings/departamentos  — Listar departamentos con conteo de municipios
 * POST /api/settings/departamentos  — Crear departamento (OWNER)
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, created, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { listDepartamentos, createDepartamento } from '@/modules/settings/territorios.service';

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const data = await listDepartamentos();
    return ok(data);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (user.role !== 'SUPERADMIN') throw new ForbiddenError();

    const body = await req.json();
    const data = await createDepartamento(body);
    return created(data);
  } catch (err) {
    return apiError(err);
  }
}
