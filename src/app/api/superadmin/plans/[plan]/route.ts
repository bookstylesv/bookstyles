import { NextRequest, NextResponse } from 'next/server';
import { validateSuperadminKey, unauthorizedResponse } from '@/lib/superadmin-auth';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ plan: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  if (!validateSuperadminKey(req)) return unauthorizedResponse();

  const { plan: slug } = await params;
  const config = await prisma.barberPlanConfig.findUnique({ where: { slug } });
  if (!config) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });

  return NextResponse.json(config);
}

export async function PUT(req: NextRequest, { params }: Params) {
  if (!validateSuperadminKey(req)) return unauthorizedResponse();

  const { plan: slug } = await params;

  const config = await prisma.barberPlanConfig.findUnique({ where: { slug } });
  if (!config) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });

  try {
    const body = await req.json() as {
      displayName?: string;
      description?: string;
      maxBarbers?: number;
      maxBranches?: number;
      modules?: Record<string, boolean>;
      price?: number | null;
      active?: boolean;
    };

    const updated = await prisma.barberPlanConfig.update({
      where: { slug },
      data: {
        ...(body.displayName !== undefined && { displayName: body.displayName }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.maxBarbers  !== undefined && { maxBarbers:  body.maxBarbers  }),
        ...(body.maxBranches !== undefined && { maxBranches: body.maxBranches }),
        ...(body.modules     !== undefined && { modules:     body.modules     }),
        ...(body.price       !== undefined && { price:       body.price       }),
        ...(body.active      !== undefined && { active:      body.active      }),
      },
    });

    return NextResponse.json(updated);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: 'internal', detail: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!validateSuperadminKey(req)) return unauthorizedResponse();

  const { plan: slug } = await params;

  const config = await prisma.barberPlanConfig.findUnique({ where: { slug } });
  if (!config) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });

  // Bloquear eliminación de planes del sistema
  if (config.plan !== null) {
    return NextResponse.json(
      { error: 'Los planes del sistema (TRIAL/BASIC/PRO/ENTERPRISE) no se pueden eliminar' },
      { status: 409 },
    );
  }

  // Verificar que ningún tenant use este plan
  const tenantsUsing = await prisma.barberTenant.count({ where: { planSlug: slug } });
  if (tenantsUsing > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: ${tenantsUsing} barbería(s) usan este plan` },
      { status: 409 },
    );
  }

  await prisma.barberPlanConfig.delete({ where: { slug } });
  return NextResponse.json({ message: 'Plan eliminado' });
}
