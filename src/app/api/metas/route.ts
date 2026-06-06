/**
 * GET  /api/metas        — Lista metas del tenant (por año)
 * POST /api/metas        — Upsert meta mensual para una sucursal
 *
 * OWNER/SUPERADMIN: ven/gestionan todas las sucursales
 * GERENTE: solo su sucursal (branchId del JWT)
 */
import { NextRequest } from 'next/server';
import { ok, created } from '@/lib/response';
import { ForbiddenError, ValidationError } from '@/lib/errors';
import { withTenantAuth } from '@/lib/with-tenant-auth';
import { prisma } from '@/lib/prisma';

export const GET = withTenantAuth(async (req: NextRequest, ctx) => {
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()));

  const where: Record<string, unknown> = { tenantId: ctx.tenantId, year };
  if (ctx.user.role === 'GERENTE' && ctx.branchId) {
    where.branchId = ctx.branchId;
  }

  const metas = await prisma.barberMeta.findMany({
    where,
    select: {
      id: true, branchId: true, year: true, month: true, objetivo: true,
      branch: { select: { id: true, name: true, slug: true } },
    },
    orderBy: [{ branchId: 'asc' }, { month: 'asc' }],
  });

  return ok(metas);
}, { requiredModule: 'metas' })

export const POST = withTenantAuth(async (req: NextRequest, ctx) => {
  if (ctx.user.role !== 'SUPERADMIN' && ctx.user.role !== 'GERENTE') {
    throw new ForbiddenError('Solo SUPERADMIN y GERENTE pueden establecer metas');
  }

  const body = await req.json();
  const { branchId, year, month, objetivo } = body as {
    branchId: number;
    year:     number;
    month:    number;
    objetivo: number;
  };

  if (!branchId || !year || !month || objetivo === undefined || objetivo === null) {
    throw new ValidationError('Faltan campos requeridos: branchId, year, month, objetivo');
  }
  if (month < 1 || month > 12) throw new ValidationError('Mes debe ser entre 1 y 12');
  if (objetivo < 0) throw new ValidationError('El objetivo no puede ser negativo');

  if (ctx.user.role === 'GERENTE' && ctx.branchId !== branchId) {
    throw new ForbiddenError('Solo puedes establecer metas para tu sucursal');
  }

  const branch = await prisma.barberBranch.findFirst({
    where: { id: branchId, tenantId: ctx.tenantId },
  });
  if (!branch) throw new ValidationError('Sucursal no encontrada');

  const meta = await prisma.barberMeta.upsert({
    where:  { branchId_year_month: { branchId, year, month } },
    create: { tenantId: ctx.tenantId, branchId, year, month, objetivo },
    update: { objetivo },
    select: { id: true, branchId: true, year: true, month: true, objetivo: true },
  });

  return created(meta);
}, { requiredModule: 'metas' })
