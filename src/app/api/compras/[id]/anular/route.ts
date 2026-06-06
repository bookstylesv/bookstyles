/**
 * POST /api/compras/[id]/anular  — Anular una compra
 * Body: { motivo: string }
 *
 * Si la compra era de tipo PRODUCTO, revierte el inventario y crea
 * entradas de tipo ANULACION en el kardex.
 *
 * Requiere rol OWNER.
 */

import { NextRequest } from 'next/server';
import { ok } from '@/lib/response';
import { anularCompra } from '@/modules/compras/compras.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

type Params = { params: Promise<{ id: string }> };

export const POST = withTenantAuth(async (req: NextRequest, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    const body = await req.json();
    const motivo = body?.motivo as string | undefined;

    const compra = await anularCompra(Number(id), ctx.tenantId, motivo ?? '');
    return ok(compra);
}, { requiredModule: 'compras' })
