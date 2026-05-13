import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  listarPlanillas, crearPlanilla,
  getConfigPlanilla, getBarberosParaPlanilla
} from '@/modules/planilla/planilla.repository';
import {
  buildConfigMap, calcularSalarioBruto,
  calcularDeduccionesEmpleado, calcularAportePatronal
} from '@/modules/planilla/planilla.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializePlanilla(p: any) {
  return {
    ...p,
    totalBruto:       p.totalBruto.toNumber(),
    totalISS:         p.totalISS.toNumber(),
    totalAFP:         p.totalAFP.toNumber(),
    totalRenta:       p.totalRenta.toNumber(),
    totalDeducciones: p.totalDeducciones.toNumber(),
    totalNeto:        p.totalNeto.toNumber(),
    totalPatronalISS: p.totalPatronalISS.toNumber(),
    totalPatronalAFP: p.totalPatronalAFP.toNumber(),
    totalINSAFORP:    p.totalINSAFORP.toNumber(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    detalles: p.detalles?.map((d: any) => {
      // En el listado los detalles solo tienen { id }; en el detalle completo tienen todos los campos.
      if (d.salarioBruto == null) return d;
      return {
        ...d,
        unidades:         d.unidades?.toNumber() ?? 0,
        salarioBruto:     d.salarioBruto.toNumber(),
        isss:             d.isss.toNumber(),
        afp:              d.afp.toNumber(),
        renta:            d.renta.toNumber(),
        otrasDeducciones: d.otrasDeducciones.toNumber(),
        totalDeducciones: d.totalDeducciones.toNumber(),
        salarioNeto:      d.salarioNeto.toNumber(),
        isssPatronal:     d.isssPatronal.toNumber(),
        afpPatronal:      d.afpPatronal.toNumber(),
        insaforp:         d.insaforp.toNumber(),
      };
    }),
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const planillas = await listarPlanillas(user.tenantId);
  return NextResponse.json(planillas.map(serializePlanilla));
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { periodo, barberos: barberoInputs } = await req.json();
  // barberoInputs: Array<{ barberoId: number; unidades: number }>

  // Obtener config del tenant
  const configRows = await getConfigPlanilla(user.tenantId);
  if (!configRows.length) return NextResponse.json({ error: 'Configure los parámetros de planilla primero' }, { status: 400 });
  const cfg = buildConfigMap(configRows);

  // Obtener barberos activos con su config
  const barberos = await getBarberosParaPlanilla(user.tenantId);
  if (!barberos.length) return NextResponse.json({ error: 'No hay barberos activos' }, { status: 400 });

  const detalles = [];
  let totalBruto = 0, totalISS = 0, totalAFP = 0, totalRenta = 0;
  let totalDeducciones = 0, totalNeto = 0;
  let totalPatronalISS = 0, totalPatronalAFP = 0, totalINSAFORP = 0;

  for (const barb of barberos) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input = barberoInputs?.find((b: any) => b.barberoId === barb.id);
    const config = barb.configPlanilla;
    if (!config) continue;

    const unidades = input?.unidades ?? 0;
    // Para barberos POR_SERVICIO sin tarifa configurada (valorPorUnidad=0, porcentajeServicio=0)
    // las "unidades" enviadas desde el frontend representan directamente el total de comisión en $.
    const esPorComision =
      config.tipoPago === 'POR_SERVICIO' &&
      config.valorPorUnidad.toNumber() === 0 &&
      config.porcentajeServicio.toNumber() === 0;
    const salarioBruto = esPorComision
      ? Math.round(unidades * 100) / 100
      : calcularSalarioBruto(
          config.tipoPago,
          config.salarioBase.toNumber(),
          config.valorPorUnidad.toNumber(),
          config.porcentajeServicio.toNumber(),
          unidades
        );
    if (salarioBruto <= 0) continue;

    const ded  = calcularDeduccionesEmpleado(salarioBruto, cfg, config.aplicaRenta);
    const pat  = calcularAportePatronal(salarioBruto, cfg);

    detalles.push({
      barberoId: barb.id,
      nombre:    barb.user.fullName,
      tipoPago:  config.tipoPago,
      unidades,
      salarioBruto,
      isss:  ded.isss, afp: ded.afp, renta: ded.renta,
      otrasDeducciones: 0,
      totalDeducciones: ded.totalDeducciones,
      salarioNeto:      ded.salarioNeto,
      isssPatronal:  pat.isssPatronal,
      afpPatronal:   pat.afpPatronal,
      insaforp:      pat.insaforp,
    });

    totalBruto       += salarioBruto;
    totalISS         += ded.isss;
    totalAFP         += ded.afp;
    totalRenta       += ded.renta;
    totalDeducciones += ded.totalDeducciones;
    totalNeto        += ded.salarioNeto;
    totalPatronalISS += pat.isssPatronal;
    totalPatronalAFP += pat.afpPatronal;
    totalINSAFORP    += pat.insaforp;
  }

  if (!detalles.length) return NextResponse.json({ error: 'No hay barberos con configuración de pago y salario > 0' }, { status: 400 });

  const planilla = await crearPlanilla(
    user.tenantId, periodo,
    {
      totalBruto: Math.round(totalBruto * 100) / 100,
      totalISS:   Math.round(totalISS * 100) / 100,
      totalAFP:   Math.round(totalAFP * 100) / 100,
      totalRenta: Math.round(totalRenta * 100) / 100,
      totalDeducciones: Math.round(totalDeducciones * 100) / 100,
      totalNeto:        Math.round(totalNeto * 100) / 100,
      totalPatronalISS: Math.round(totalPatronalISS * 100) / 100,
      totalPatronalAFP: Math.round(totalPatronalAFP * 100) / 100,
      totalINSAFORP:    Math.round(totalINSAFORP * 100) / 100,
    },
    detalles
  );

  return NextResponse.json(serializePlanilla(planilla), { status: 201 });
}
