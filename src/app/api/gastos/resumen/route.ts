/**
 * GET /api/gastos/resumen?mes=&anio=
 * Retorna el total de gastos agrupado por categoría para el mes/año indicado.
 */

import { NextRequest } from 'next/server';
import { ok } from '@/lib/response';
import { ValidationError } from '@/lib/errors';
import { resumenMesService } from '@/modules/gastos/gastos.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (req: NextRequest, ctx) => {
    const sp   = req.nextUrl.searchParams;
    const now  = new Date();
    const mes  = Number(sp.get('mes')  ?? now.getMonth() + 1);
    const anio = Number(sp.get('anio') ?? now.getFullYear());

    if (mes < 1 || mes > 12)        throw new ValidationError('Mes inválido (1-12)');
    if (anio < 2000 || anio > 2100) throw new ValidationError('Año inválido');

    const data = await resumenMesService(ctx.tenantId, mes, anio);
    return ok(data);
}, { requiredModule: 'gastos' })
