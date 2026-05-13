import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getPlanillaById, eliminarPlanilla } from '@/modules/planilla/planilla.repository';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ser(p: any) {
  if (!p) return null;
  return {
    ...p,
    totalBruto: p.totalBruto.toNumber(), totalISS: p.totalISS.toNumber(),
    totalAFP: p.totalAFP.toNumber(), totalRenta: p.totalRenta.toNumber(),
    totalDeducciones: p.totalDeducciones.toNumber(), totalNeto: p.totalNeto.toNumber(),
    totalPatronalISS: p.totalPatronalISS.toNumber(), totalPatronalAFP: p.totalPatronalAFP.toNumber(),
    totalINSAFORP: p.totalINSAFORP.toNumber(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    detalles: p.detalles?.map((d: any) => ({
      ...d,
      unidades: d.unidades?.toNumber() ?? 0,
      salarioBruto: d.salarioBruto.toNumber(), isss: d.isss.toNumber(),
      afp: d.afp.toNumber(), renta: d.renta.toNumber(),
      otrasDeducciones: d.otrasDeducciones.toNumber(),
      totalDeducciones: d.totalDeducciones.toNumber(), salarioNeto: d.salarioNeto.toNumber(),
      isssPatronal: d.isssPatronal.toNumber(), afpPatronal: d.afpPatronal.toNumber(),
      insaforp: d.insaforp.toNumber(),
    })),
  };
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;
  const planilla = await getPlanillaById(user.tenantId, parseInt(id));
  if (!planilla) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
  return NextResponse.json(ser(planilla));
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;
  try {
    await eliminarPlanilla(user.tenantId, parseInt(id));
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
