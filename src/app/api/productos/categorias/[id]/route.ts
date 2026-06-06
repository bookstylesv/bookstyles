import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withTenantAuth } from '@/lib/with-tenant-auth';

// PATCH /api/productos/categorias/[id]
export const PATCH = withTenantAuth(async (req: NextRequest, ctx, routeCtx) => {
const { id } = await routeCtx.params;
    const catId = parseInt(id);

    const cat = await prisma.barberCategoriaProducto.findFirst({
        where: { id: catId, tenantId: ctx.tenantId },
    });
    if (!cat) return NextResponse.json({ error: { message: 'Categoría no encontrada' } }, { status: 404 });

    const body = await req.json();
    const updated = await prisma.barberCategoriaProducto.update({
        where: { id: catId },
        data: {
            ...(body.nombre !== undefined && { nombre: String(body.nombre).trim() }),
            ...(body.color !== undefined && { color: body.color }),
            ...(body.activa !== undefined && { activa: body.activa }),
        },
    });
    return NextResponse.json({ data: updated });
}, { requiredModule: 'inventario' })

// DELETE /api/productos/categorias/[id]
export const DELETE = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {
const { id } = await routeCtx.params;
    const catId = parseInt(id);

    const cat = await prisma.barberCategoriaProducto.findFirst({
        where: { id: catId, tenantId: ctx.tenantId },
    });
    if (!cat) return NextResponse.json({ error: { message: 'Categoría no encontrada' } }, { status: 404 });

    // Soft-delete: set activa = false (keeps referential integrity with products)
    await prisma.barberCategoriaProducto.update({
        where: { id: catId },
        data: { activa: false },
    });
    return NextResponse.json({ data: { ok: true } });
}, { requiredModule: 'inventario' })
