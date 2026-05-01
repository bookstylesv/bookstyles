/**
 * GET /api/superadmin/tenants/:id/import/status
 * Devuelve: intentos del día, conteos actuales en BD por recurso.
 */
import { NextRequest, NextResponse } from 'next/server';
import { validateSuperadminKey, unauthorizedResponse } from '@/lib/superadmin-auth';
import { prisma } from '@/lib/prisma';
import { DAILY_IMPORT_LIMIT } from '@/lib/import-limits';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!validateSuperadminKey(req)) return unauthorizedResponse();

  const { id } = await params;
  const tenantId = parseInt(id, 10);
  if (isNaN(tenantId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const tenant = await prisma.barberTenant.findUnique({
    where: { id: tenantId },
    select: { id: true, plan: true },
  });
  if (!tenant) return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });

  // Intentos de hoy (import + reset cuentan igual)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [todayLogs, counts] = await Promise.all([
    prisma.barberImportLog.count({
      where: { tenantId, action: 'import', createdAt: { gte: todayStart } },
    }),
    Promise.all([
      prisma.barberUser.count({ where: { tenantId, role: 'CLIENT' } }),
      prisma.barber.count({ where: { tenantId } }),
      prisma.barberService.count({ where: { tenantId } }),
      prisma.barberProducto.count({ where: { tenantId } }),
      prisma.barberProveedor.count({ where: { tenantId } }),
      prisma.barberCategoriaProducto.count({ where: { tenantId } }),
      prisma.barberCategoriaGasto.count({ where: { tenantId } }),
      prisma.barberCategoriaServicio.count({ where: { tenantId } }),
    ]),
  ]);

  console.log(`[import/status] tenant:${tenantId} plan:${tenant.plan} intentos-hoy:${todayLogs}/${DAILY_IMPORT_LIMIT}`);

  return NextResponse.json({
    plan: tenant.plan,
    dailyUsed: todayLogs,
    dailyLimit: DAILY_IMPORT_LIMIT,
    dailyRemaining: Math.max(0, DAILY_IMPORT_LIMIT - todayLogs),
    counts: {
      clientes:       counts[0],
      empleados:      counts[1],
      servicios:      counts[2],
      productos:      counts[3],
      proveedores:    counts[4],
      'cat-producto': counts[5],
      'cat-gasto':    counts[6],
      'cat-servicio': counts[7],
    },
  });
}
