/**
 * GET  /api/gastos/categorias  — Listar categorías de gastos
 * POST /api/gastos/categorias  — Crear categoría
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, created, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { listCategoriasService, createCategoriaService } from '@/modules/gastos/gastos.service';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (!['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) throw new ForbiddenError();

    const categorias = await listCategoriasService(user.tenantId);
    return ok(categorias);
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
    const categoria = await createCategoriaService(user.tenantId, body);
    return created(categoria);
  } catch (err) {
    return apiError(err);
  }
}
