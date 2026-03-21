import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getBarberosParaPlanilla } from '@/modules/planilla/planilla.repository';
import { calcularAguinaldo } from '@/modules/planilla/planilla.service';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const anio     = parseInt(searchParams.get('anio') || String(new Date().getFullYear()));
  const completo = searchParams.get('completo') === 'true';

  const barberos = await getBarberosParaPlanilla(user.tenantId);
  const fechaCorte = new Date(anio, 11, 31); // 31 dic del año indicado

  const items = barberos
    .filter(b => b.configPlanilla)
    .map(b => {
      const cfg = b.configPlanilla!;
      const salario      = cfg.salarioBase.toNumber();
      const fechaIngreso = cfg.fechaIngreso ?? b.createdAt;
      const result       = calcularAguinaldo(salario, fechaIngreso, fechaCorte, completo);
      return {
        barberoId:       b.id,
        nombre:          b.user.fullName,
        salario,
        tipoPago:        cfg.tipoPago,
        fechaIngreso:    fechaIngreso.toISOString(),
        ...result,
      };
    });

  const totalAguinaldo = items.reduce((s, i) => s + i.monto, 0);
  return NextResponse.json({
    anio, items,
    totalAguinaldo: Math.round(totalAguinaldo * 100) / 100,
    totalBarberos:  items.length,
  });
}
