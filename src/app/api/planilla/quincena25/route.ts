import { NextRequest, NextResponse } from 'next/server';
import { getBarberosParaPlanilla } from '@/modules/planilla/planilla.repository';
import { calcularQuincena25 } from '@/modules/planilla/planilla.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (req: NextRequest, ctx) => {
const { searchParams } = new URL(req.url);
  const anio = parseInt(searchParams.get('anio') || '2027');

  const barberos = await getBarberosParaPlanilla(ctx.tenantId);

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
}, { requiredModule: 'planilla' })
