/**
 * GET /api/superadmin/tenants/[id]/branches
 * Lista las sucursales de un tenant específico.
 * Protegido con API key de superadmin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateSuperadminKey, unauthorizedResponse } from '@/lib/superadmin-auth';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  if (!validateSuperadminKey(req)) return unauthorizedResponse();

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
