/**
 * POST /api/superadmin/tenants/:id/import/reset
 * Body JSON: { resource: ImportResource }
 * Elimina TODOS los registros del recurso para el tenant.
 * Acción destructiva — solo disponible desde el panel de control.
 */
import { NextRequest, NextResponse } from 'next/server';
import { validateSuperadminKey, unauthorizedResponse } from '@/lib/superadmin-auth';
import { prisma } from '@/lib/prisma';
import { isValidResource, type ImportResource } from '@/lib/import-limits';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!validateSuperadminKey(req)) return unauthorizedResponse();

  const { id } = await params;
  const tenantId = parseInt(id, 10);
  if (isNaN(tenantId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const resource = body.resource as string;

  if (!isValidResource(resource))
    return NextResponse.json({ error: `Recurso "${resource}" no reconocido.` }, { status: 400 });

  const tenant = await prisma.barberTenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!tenant) return NextResponse.json({ error: 'Tenant no encontrado.' }, { status: 404 });

  const deleteMap: Record<ImportResource, () => Promise<{ count: number }>> = {
    'clientes':     () => prisma.barberUser.deleteMany({ where: { tenantId, role: 'CLIENT' } }),
    'empleados':    () => prisma.barber.deleteMany({ where: { tenantId } }),
    'servicios':    () => prisma.barberService.deleteMany({ where: { tenantId } }),
    'productos':    () => prisma.barberProducto.deleteMany({ where: { tenantId } }),
    'proveedores':  () => prisma.barberProveedor.deleteMany({ where: { tenantId } }),
    'cat-producto': () => prisma.barberCategoriaProducto.deleteMany({ where: { tenantId } }),
    'cat-gasto':    () => prisma.barberCategoriaGasto.deleteMany({ where: { tenantId } }),
    'cat-servicio': () => prisma.barberCategoriaServicio.deleteMany({ where: { tenantId } }),
  };

  const result = await deleteMap[resource]();

  // Registrar en log
  await prisma.barberImportLog.create({
    data: { tenantId, resource, action: 'reset', rows: result.count, imported: 0, skipped: 0, errors: [] },
  });

  console.log(`[import/reset] tenant:${tenantId} resource:${resource} eliminados:${result.count}`);

  return NextResponse.json({
    success: true,
    resource,
    deleted: result.count,
    message: `Se eliminaron ${result.count} registros de ${resource}.`,
  });
}
