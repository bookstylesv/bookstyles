import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PlanillaClient from '@/components/planilla/PlanillaClient';
import {
  listarPlanillas,
  getBarberosParaPlanilla,
  getConfigPlanilla,
  getConfigsBarberos,
} from '@/modules/planilla/planilla.repository';

export default async function PlanillaPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [planillas, barberos, configRows, barberosConfig] = await Promise.all([
    listarPlanillas(user.tenantId),
    getBarberosParaPlanilla(user.tenantId),
    getConfigPlanilla(user.tenantId),
    getConfigsBarberos(user.tenantId),
  ]);

  const planillasSer = planillas.map(p => ({
    id:               p.id,
    periodo:          p.periodo,
    estado:           p.estado,
    notas:            p.notas,
    createdAt:        p.createdAt.toISOString(),
    updatedAt:        p.updatedAt.toISOString(),
    totalBruto:       p.totalBruto.toNumber(),
    totalISS:         p.totalISS.toNumber(),
    totalAFP:         p.totalAFP.toNumber(),
    totalRenta:       p.totalRenta.toNumber(),
    totalDeducciones: p.totalDeducciones.toNumber(),
    totalNeto:        p.totalNeto.toNumber(),
    totalPatronalISS: p.totalPatronalISS.toNumber(),
    totalPatronalAFP: p.totalPatronalAFP.toNumber(),
    totalINSAFORP:    p.totalINSAFORP.toNumber(),
    detalles:         p.detalles,
  }));

  const barberosSer = barberos.map(b => ({
    id:                 b.id,
    nombre:             b.user.fullName,
    tipoPago:           b.configPlanilla?.tipoPago ?? null,
    fechaIngreso:       b.configPlanilla?.fechaIngreso?.toISOString() ?? null,
    salarioBase:        b.configPlanilla?.salarioBase.toNumber() ?? 0,
    valorPorUnidad:     b.configPlanilla?.valorPorUnidad.toNumber() ?? 0,
    porcentajeServicio: b.configPlanilla?.porcentajeServicio.toNumber() ?? 0,
    aplicaRenta:        b.configPlanilla?.aplicaRenta ?? true,
    configurado:        !!b.configPlanilla,
  }));

  const configSer = configRows.map(c => ({
    id:          c.id,
    clave:       c.clave,
    descripcion: c.descripcion,
    topeMaximo:  c.topeMaximo?.toNumber() ?? null,
    valor:       c.valor.toNumber(),
    updatedAt:   c.updatedAt.toISOString(),
  }));

  const barberosConfigSer = barberosConfig.map(c => ({
    id:                 c.id,
    tenantId:           c.tenantId,
    barberoId:          c.barberoId,
    tipoPago:           c.tipoPago,
    salarioBase:        c.salarioBase.toNumber(),
    valorPorUnidad:     c.valorPorUnidad.toNumber(),
    porcentajeServicio: c.porcentajeServicio.toNumber(),
    aplicaRenta:        c.aplicaRenta,
    createdAt:          c.createdAt.toISOString(),
    updatedAt:          c.updatedAt.toISOString(),
    barbero: {
      ...c.barbero,
      user: c.barbero.user,
    },
  }));

  return (
    <PlanillaClient
      planillasInit={planillasSer}
      barberosInit={barberosSer}
      configInit={configSer}
      barberosConfigInit={barberosConfigSer}
      hasConfig={configRows.length > 0}
    />
  );
}
