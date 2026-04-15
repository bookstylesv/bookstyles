import { NextRequest, NextResponse } from 'next/server';
import { validateSuperadminKey, unauthorizedResponse } from '@/lib/superadmin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  if (!validateSuperadminKey(req)) return unauthorizedResponse();

  try {
    const plans = await prisma.barberPlanConfig.findMany({
      orderBy: { id: 'asc' },
    });
    return NextResponse.json(plans);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[superadmin/plans GET]', msg);
    return NextResponse.json({ error: 'internal', detail: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!validateSuperadminKey(req)) return unauthorizedResponse();

  try {
    const body = await req.json() as {
      slug: string;
      displayName: string;
      description?: string;
      maxBarbers?: number;
      maxBranches?: number;
      modules?: Record<string, boolean>;
      price?: number | null;
      active?: boolean;
    };

    if (!body.slug || !body.displayName) {
      return NextResponse.json({ error: 'slug y displayName son requeridos' }, { status: 400 });
    }

    // Slug: solo letras minúsculas, números y guiones
    const cleanSlug = body.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');

    const existing = await prisma.barberPlanConfig.findUnique({ where: { slug: cleanSlug } });
    if (existing) {
      return NextResponse.json({ error: 'Ya existe un plan con ese slug' }, { status: 409 });
    }

    const plan = await prisma.barberPlanConfig.create({
      data: {
        slug:        cleanSlug,
        displayName: body.displayName,
        description: body.description ?? null,
        maxBarbers:  body.maxBarbers  ?? 5,
        maxBranches: body.maxBranches ?? 1,
        modules:     body.modules     ?? {},
        price:       body.price       ?? null,
        active:      body.active      ?? true,
      },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[superadmin/plans POST]', msg);
    return NextResponse.json({ error: 'internal', detail: msg }, { status: 500 });
  }
}
