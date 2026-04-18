import { NextRequest, NextResponse } from 'next/server';
import { validateSuperadminKey, unauthorizedResponse } from '@/lib/superadmin-auth';
import { prisma } from '@/lib/prisma';

const DEFAULT_FEATURES = [
  { title: 'Gestión de Citas', description: 'Agenda online en tiempo real' },
  { title: 'Reportes y Caja', description: 'Control financiero completo' },
  { title: 'Gestión de Clientes', description: 'Historial y fidelización' },
];

export async function GET(req: NextRequest) {
  if (!validateSuperadminKey(req)) return unauthorizedResponse();

  const config = await prisma.barberGlobalConfig.findUnique({ where: { id: 1 } });

  return NextResponse.json({
    brandName: config?.brandName ?? 'BookStyles',
    tagline: config?.tagline ?? 'Sistema de gestión para barberías',
    features: config?.features ?? DEFAULT_FEATURES,
  });
}

export async function PUT(req: NextRequest) {
  if (!validateSuperadminKey(req)) return unauthorizedResponse();

  const body = await req.json() as {
    brandName?: string;
    tagline?: string;
    features?: { title: string; description: string }[];
  };

  const config = await prisma.barberGlobalConfig.upsert({
    where: { id: 1 },
    update: {
      ...(body.brandName !== undefined && { brandName: body.brandName.trim() }),
      ...(body.tagline !== undefined && { tagline: body.tagline.trim() }),
      ...(body.features !== undefined && { features: body.features }),
    },
    create: {
      id: 1,
      brandName: body.brandName?.trim() ?? 'BookStyles',
      tagline: body.tagline?.trim() ?? 'Sistema de gestión para barberías',
      features: body.features ?? DEFAULT_FEATURES,
    },
  });

  return NextResponse.json({
    brandName: config.brandName,
    tagline: config.tagline,
    features: config.features,
  });
}
