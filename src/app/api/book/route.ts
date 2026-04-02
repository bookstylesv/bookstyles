/**
 * GET /api/book — Lista pública de negocios activos (sin auth)
 *
 * Usado por landing pages externas (ej: BookStyle) para mostrar
 * todos los negocios disponibles antes de que el cliente elija uno.
 *
 * Solo expone campos públicos. No requiere autenticación.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const tenants = await prisma.barberTenant.findMany({
      where: {
        status: { in: ['ACTIVE', 'TRIAL'] },
        deletedAt: null,
      },
      select: {
        id:      true,
        name:    true,
        slug:    true,
        city:    true,
        address: true,
        phone:   true,
        logoUrl: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ tenants });
  } catch {
    return NextResponse.json(
      { error: 'No se pudo cargar la lista de negocios.' },
      { status: 500 },
    );
  }
}
