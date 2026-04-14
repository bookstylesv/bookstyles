/**
 * GET /api/productos/[id]/kardex
 * Retorna el historial de movimientos de inventario para un producto específico.
 * Soporta paginación: ?page=1&limit=20
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError } from '@/lib/errors';
import { getKardexProducto } from '@/modules/productos/productos.service';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const { id } = await params;
    const query = Object.fromEntries(req.nextUrl.searchParams.entries());
    const result = await getKardexProducto(Number(id), user.tenantId, query, user.branchId);
    return ok(result);
  } catch (err) {
    return apiError(err);
  }
}
