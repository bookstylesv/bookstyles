/**
 * GET  /api/gastos  — Listar gastos con filtros opcionales
 * POST /api/gastos  — Registrar nuevo gasto
 */

import { NextRequest } from 'next/server';
import { ok, created } from '@/lib/response';
import { listGastos, createGastoService } from '@/modules/gastos/gastos.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (req: NextRequest, ctx) => {
    const query = Object.fromEntries(req.nextUrl.searchParams.entries());
    const result = await listGastos(ctx.tenantId, query);
    return ok(result.gastos);
}, { requiredModule: 'gastos' })

export const POST = withTenantAuth(async (req: NextRequest, ctx) => {
    const body = await req.json();
    const gasto = await createGastoService(ctx.tenantId, body);
    return created(gasto);
}, { requiredModule: 'gastos' })
