import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withTenantAuth } from '@/lib/with-tenant-auth';

// PATCH /api/services/categorias/[id]
export const PATCH = withTenantAuth(async (req: NextRequest, ctx, routeCtx) => {
const { id } = await routeCtx.params;
  const catId = parseInt(id);
  const cat = await prisma.barberCategoriaServicio.findFirst({ where: { id: catId, tenantId: ctx.tenantId } });
  if (!cat) return NextResponse.json({ error: { message: 'Categoría no encontrada' } }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.barberCategoriaServicio.update({
    where: { id: catId },
    data: {
      ...(body.nombre !== undefined && { nombre: body.nombre.trim() }),
      ...(body.color  !== undefined && { color: body.color }),
      ...(body.activo !== undefined && { activo: body.activo }),
    },
  });
  return NextResponse.json({ data: updated });
}, { requiredModule: 'citas' })

// DELETE /api/services/categorias/[id]
export const DELETE = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {
const { id } = await routeCtx.params;
  const catId = parseInt(id);
  const cat = await prisma.barberCategoriaServicio.findFirst({ where: { id: catId, tenantId: ctx.tenantId } });
  if (!cat) return NextResponse.json({ error: { message: 'Categoría no encontrada' } }, { status: 404 });

  await prisma.barberCategoriaServicio.delete({ where: { id: catId } });
  return NextResponse.json({ data: { ok: true } });
}, { requiredModule: 'citas' })
