/**
 * GET /api/proveedores/search?q=  — Búsqueda rápida de proveedores (máx 10)
 * Usado por dropdowns en módulo de Compras.
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { quickSearchProveedores } from '@/modules/proveedores/proveedores.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (!['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) throw new ForbiddenError();

    const q = req.nextUrl.searchParams.get('q') ?? '';
    const results = await quickSearchProveedores(user.tenantId, q);
    return ok(results);
  } catch (err) {
    return apiError(err);
  }
}
