/**
 * GET  /api/inventario/transferencias — Listar transferencias de stock
 * POST /api/inventario/transferencias — Crear transferencia
 */

import { NextRequest } from 'next/server';
import { ok, created } from '@/lib/response';
import { withTenantAuth } from '@/lib/with-tenant-auth';
import { transferirStock, listTransferencias } from '@/modules/inventario/inventario.service';

export const GET = withTenantAuth(async (req: NextRequest, ctx) => {
  const sp = req.nextUrl.searchParams;
  const query: Record<string, string> = {};
  sp.forEach((v, k) => { query[k] = v; });

  // Si el usuario tiene branchId en el JWT, usarlo como filtro por defecto
  if (!query.branchId && ctx.branchId != null) {
    query.branchId = String(ctx.branchId);
  }

  const result = await listTransferencias(ctx.tenantId, query);
  return ok(result);
}, { requiredModule: 'inventario' });

export const POST = withTenantAuth(async (req: NextRequest, ctx) => {
  const body = await req.json();
  const result = await transferirStock(ctx.tenantId, body);
  return created(result);
}, { requiredModule: 'inventario' });
