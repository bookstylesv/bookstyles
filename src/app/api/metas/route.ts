/**
 * GET  /api/metas        — Lista metas del tenant (por año)
 * POST /api/metas        — Upsert meta mensual para una sucursal
 *
 * OWNER/SUPERADMIN: ven/gestionan todas las sucursales
 * GERENTE: solo su sucursal (branchId del JWT)
 */
import { getCurrentUser }  from '@/lib/auth';
import { ok, created, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (user.role !== 'OWNER' && user.role !== 'SUPERADMIN' && user.role !== 'GERENTE') {
      throw new ForbiddenError();
    }

    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()));

    const where: Record<string, unknown> = { tenantId: user.tenantId, year };
    if (user.role === 'GERENTE' && user.branchId) {
      where.branchId = user.branchId;
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
  } catch (err) { return apiError(err); }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (user.role !== 'SUPERADMIN' && user.role !== 'GERENTE') {
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

    // GERENTE solo puede establecer meta para su propia sucursal
    if (user.role === 'GERENTE' && user.branchId !== branchId) {
      throw new ForbiddenError('Solo puedes establecer metas para tu sucursal');
    }

    // Verificar que la sucursal pertenece al tenant
    const branch = await prisma.barberBranch.findFirst({
      where: { id: branchId, tenantId: user.tenantId },
    });
    if (!branch) throw new ValidationError('Sucursal no encontrada');

    const meta = await prisma.barberMeta.upsert({
      where:  { branchId_year_month: { branchId, year, month } },
      create: { tenantId: user.tenantId, branchId, year, month, objetivo },
      update: { objetivo },
      select: { id: true, branchId: true, year: true, month: true, objetivo: true },
    });

    return created(meta);
  } catch (err) { return apiError(err); }
}
