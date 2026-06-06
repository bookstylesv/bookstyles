/**
 * GET  /api/gastos/categorias  — Listar categorías de gastos
 * POST /api/gastos/categorias  — Crear categoría
 */

import { NextRequest } from 'next/server';
import { ok, created } from '@/lib/response';
import { listCategoriasService, createCategoriaService } from '@/modules/gastos/gastos.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (_req: NextRequest, ctx) => {
    const categorias = await listCategoriasService(ctx.tenantId);
    return ok(categorias);
}, { requiredModule: 'gastos' })

export const POST = withTenantAuth(async (req: NextRequest, ctx) => {
    const body = await req.json();
    const categoria = await createCategoriaService(ctx.tenantId, body);
    return created(categoria);
}, { requiredModule: 'gastos' })
