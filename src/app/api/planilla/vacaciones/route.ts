import { NextRequest, NextResponse } from 'next/server';
import { getBarberosParaPlanilla } from '@/modules/planilla/planilla.repository';
import { calcularVacaciones } from '@/modules/planilla/planilla.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (_req: NextRequest, ctx) => {
const barberos   = await getBarberosParaPlanilla(ctx.tenantId);
  const fechaCorte = new Date(); // hoy como fecha de corte

  const items = barberos
    .filter(b => b.configPlanilla)
    .map(b => {
      const cfg = b.configPlanilla!;
      const salario      = cfg.salarioBase.toNumber();
      const fechaIngreso = cfg.fechaIngreso ?? b.createdAt;
      const result       = calcularVacaciones(salario, fechaIngreso, fechaCorte);
      return {
        barberoId:    b.id,
        nombre:       b.user.fullName,
        salario,
        tipoPago:     cfg.tipoPago,
        fechaIngreso: fechaIngreso.toISOString(),
        ...result,
      };
    });

  const totalVacaciones = items.reduce((s, i) => s + i.monto, 0);
  return NextResponse.json({
    items,
    totalVacaciones: Math.round(totalVacaciones * 100) / 100,
    totalBarberos:   items.length,
  });
}, { requiredModule: 'planilla' })
