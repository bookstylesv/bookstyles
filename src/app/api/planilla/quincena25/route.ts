import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getBarberosParaPlanilla } from '@/modules/planilla/planilla.repository';
import { calcularQuincena25 } from '@/modules/planilla/planilla.service';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const anio = parseInt(searchParams.get('anio') || '2027');

  const barberos = await getBarberosParaPlanilla(user.tenantId);

  const items = barberos
    .filter(b => b.configPlanilla)
    .map(b => {
      const cfg = b.configPlanilla!;
      const salario      = cfg.salarioBase.toNumber();
      const fechaIngreso = cfg.fechaIngreso ?? b.createdAt;
      const result       = calcularQuincena25(salario, fechaIngreso, anio);
      return {
        barberoId:    b.id,
        nombre:       b.user.fullName,
        salario,
        tipoPago:     cfg.tipoPago,
        fechaIngreso: fechaIngreso.toISOString(),
        ...result,
      };
    });

  const aplican      = items.filter(i => i.aplica);
  const noAplican    = items.filter(i => !i.aplica);
  const totalMonto   = aplican.reduce((s, i) => s + i.monto, 0);

  return NextResponse.json({
    anio, items,
    totalQuincena25: Math.round(totalMonto * 100) / 100,
    totalAplican:    aplican.length,
    totalNoAplican:  noAplican.length,
    totalBarberos:   items.length,
  });
}
