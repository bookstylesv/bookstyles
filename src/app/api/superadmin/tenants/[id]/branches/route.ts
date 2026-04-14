/**
 * GET /api/superadmin/tenants/[id]/branches
 * Lista las sucursales de un tenant específico.
 * Protegido con API key de superadmin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function isAuthorized(req: NextRequest): boolean {
  const key = req.headers.get('x-api-key');
  return key === process.env.SUPERADMIN_API_KEY;
}

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const tenantId = Number(id);

  const branches = await prisma.barberBranch.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      status: true,
      isHeadquarters: true,
      createdAt: true,
      _count: { select: { barberAssignments: true, appointments: true } },
    },
    orderBy: [{ isHeadquarters: 'desc' }, { createdAt: 'asc' }],
  });

  return NextResponse.json(branches);
}
