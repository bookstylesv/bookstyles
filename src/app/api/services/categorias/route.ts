import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withTenantAuth } from '@/lib/with-tenant-auth';

// GET /api/services/categorias
export const GET = withTenantAuth(async (_req: NextRequest, ctx) => {
const categorias = await prisma.barberCategoriaServicio.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { nombre: 'asc' },
  });
  return NextResponse.json({ data: categorias });
}, { requiredModule: 'citas' })

// POST /api/services/categorias
export const POST = withTenantAuth(async (req: NextRequest, ctx) => {
const body = await req.json();
  const nombre = (body.nombre ?? '').trim();
  if (!nombre) return NextResponse.json({ error: { message: 'El nombre es requerido' } }, { status: 400 });

  const exists = await prisma.barberCategoriaServicio.findFirst({
    where: { tenantId: ctx.tenantId, nombre: { equals: nombre, mode: 'insensitive' } },
  });
  if (exists) return NextResponse.json({ error: { message: 'Ya existe una categoría con ese nombre' } }, { status: 409 });

  const cat = await prisma.barberCategoriaServicio.create({
    data: { tenantId: ctx.tenantId, nombre, color: body.color ?? 'blue', activo: true },
  });
  return NextResponse.json({ data: cat }, { status: 201 });
}, { requiredModule: 'citas' })
