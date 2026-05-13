/**
 * GET  /api/settings/municipios?departamento=cod  — Listar municipios (filtro opcional)
 * POST /api/settings/municipios                   — Crear municipio (OWNER)
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, created, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { listMunicipios, createMunicipio } from '@/modules/settings/territorios.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const departamentoCod = req.nextUrl.searchParams.get('departamento') ?? undefined;
    const data = await listMunicipios(departamentoCod);
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
    const data = await createMunicipio(body);
    return created(data);
  } catch (err) {
    return apiError(err);
  }
}
