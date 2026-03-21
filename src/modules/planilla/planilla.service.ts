// Servicio de cálculos de planilla — legislación El Salvador
// Adaptado para barbería (barberos con tipos de pago variables)

export interface ConfigPlanillaMap {
  isss_pct: number;
  isss_tope: number;
  afp_pct: number;
  isss_patronal_pct: number;
  isss_patronal_tope: number;
  afp_patronal_pct: number;
  insaforp_pct: number;
  isr_t1_max: number;
  isr_t2_max: number;
  isr_t3_max: number;
  isr_t2_pct: number;
  isr_t3_pct: number;
  isr_t4_pct: number;
  isr_t2_exceso_desde: number;
  isr_t3_exceso_desde: number;
  isr_t4_exceso_desde: number;
  isr_t2_cuota: number;
  isr_t3_cuota: number;
  isr_t4_cuota: number;
}

export const CONFIG_DEFAULTS: Array<{ clave: string; valor: number; descripcion: string; topeMaximo?: number }> = [
  { clave: 'isss_pct',            valor: 3,       descripcion: 'ISSS empleado (%)' },
  { clave: 'isss_tope',           valor: 1000,    descripcion: 'Tope salarial ISSS ($)' },
  { clave: 'afp_pct',             valor: 7.25,    descripcion: 'AFP empleado (%)' },
  { clave: 'isss_patronal_pct',   valor: 7.5,     descripcion: 'ISSS patronal (%)' },
  { clave: 'isss_patronal_tope',  valor: 1000,    descripcion: 'Tope salarial ISSS patronal ($)' },
  { clave: 'afp_patronal_pct',    valor: 8.75,    descripcion: 'AFP patronal (%)' },
  { clave: 'insaforp_pct',        valor: 1,       descripcion: 'INSAFORP/INCAF (%)' },
  { clave: 'isr_t1_max',          valor: 472,     descripcion: 'ISR: tope tramo 1 exento ($)' },
  { clave: 'isr_t2_max',          valor: 895.24,  descripcion: 'ISR: tope tramo 2 ($)' },
  { clave: 'isr_t3_max',          valor: 2038.10, descripcion: 'ISR: tope tramo 3 ($)' },
  { clave: 'isr_t2_pct',          valor: 10,      descripcion: 'ISR: tramo 2 porcentaje (%)' },
  { clave: 'isr_t3_pct',          valor: 20,      descripcion: 'ISR: tramo 3 porcentaje (%)' },
  { clave: 'isr_t4_pct',          valor: 30,      descripcion: 'ISR: tramo 4 porcentaje (%)' },
  { clave: 'isr_t2_exceso_desde', valor: 472,     descripcion: 'ISR: tramo 2 base exceso desde ($)' },
  { clave: 'isr_t3_exceso_desde', valor: 895.24,  descripcion: 'ISR: tramo 3 base exceso desde ($)' },
  { clave: 'isr_t4_exceso_desde', valor: 2038.10, descripcion: 'ISR: tramo 4 base exceso desde ($)' },
  { clave: 'isr_t2_cuota',        valor: 0,       descripcion: 'ISR: tramo 2 cuota fija ($)' },
  { clave: 'isr_t3_cuota',        valor: 42.31,   descripcion: 'ISR: tramo 3 cuota fija ($)' },
  { clave: 'isr_t4_cuota',        valor: 270.90,  descripcion: 'ISR: tramo 4 cuota fija ($)' },
];

export function calcularISR(baseImponible: number, cfg: ConfigPlanillaMap): number {
  if (baseImponible <= cfg.isr_t1_max) return 0;
  if (baseImponible <= cfg.isr_t2_max) {
    return cfg.isr_t2_cuota + (baseImponible - cfg.isr_t2_exceso_desde) * (cfg.isr_t2_pct / 100);
  }
  if (baseImponible <= cfg.isr_t3_max) {
    return cfg.isr_t3_cuota + (baseImponible - cfg.isr_t3_exceso_desde) * (cfg.isr_t3_pct / 100);
  }
  return cfg.isr_t4_cuota + (baseImponible - cfg.isr_t4_exceso_desde) * (cfg.isr_t4_pct / 100);
}

export function calcularDeduccionesEmpleado(
  salarioBruto: number,
  cfg: ConfigPlanillaMap,
  aplicaRenta: boolean
) {
  const baseISS = Math.min(salarioBruto, cfg.isss_tope);
  const isss = round2(baseISS * (cfg.isss_pct / 100));
  const afp  = round2(salarioBruto * (cfg.afp_pct / 100));
  const baseImponibleRenta = salarioBruto - isss - afp;
  const renta = aplicaRenta ? round2(calcularISR(baseImponibleRenta, cfg)) : 0;
  const totalDeducciones = round2(isss + afp + renta);
  const salarioNeto = round2(salarioBruto - totalDeducciones);
  return { isss, afp, renta, totalDeducciones, salarioNeto };
}

export function calcularAportePatronal(salarioBruto: number, cfg: ConfigPlanillaMap) {
  const baseISS = Math.min(salarioBruto, cfg.isss_patronal_tope);
  const isssPatronal = round2(baseISS * (cfg.isss_patronal_pct / 100));
  const afpPatronal  = round2(salarioBruto * (cfg.afp_patronal_pct / 100));
  const insaforp     = round2(salarioBruto * (cfg.insaforp_pct / 100));
  const totalPatronal = round2(isssPatronal + afpPatronal + insaforp);
  return { isssPatronal, afpPatronal, insaforp, totalPatronal };
}

export function calcularSalarioBruto(
  tipoPago: string,
  salarioBase: number,
  valorPorUnidad: number,
  porcentajeServicio: number,
  unidades: number
): number {
  switch (tipoPago) {
    case 'FIJO':         return round2(salarioBase);
    case 'POR_DIA':      return round2(valorPorUnidad * unidades);
    case 'POR_SEMANA':   return round2(valorPorUnidad * unidades);
    case 'POR_HORA':     return round2(valorPorUnidad * unidades);
    case 'POR_SERVICIO':
      if (porcentajeServicio > 0) {
        // unidades = total ingresos de servicios del período
        return round2(unidades * (porcentajeServicio / 100));
      }
      return round2(valorPorUnidad * unidades);
    default: return 0;
  }
}

export function buildConfigMap(rows: Array<{ clave: string; valor: { toNumber(): number } }>): ConfigPlanillaMap {
  const map: Record<string, number> = {};
  for (const row of rows) map[row.clave] = row.valor.toNumber();
  // Defaults si falta alguna clave
  for (const d of CONFIG_DEFAULTS) {
    if (map[d.clave] === undefined) map[d.clave] = d.valor;
  }
  return map as unknown as ConfigPlanillaMap;
}

// ── Aguinaldo (Art. 196-202 Código de Trabajo El Salvador) ──────────────────
// Escala: 1-3 años → 15 días | 3-10 años → 19 días | ≥10 años → 21 días
export function calcularAguinaldo(
  salarioMensual: number,
  fechaIngreso: Date,
  fechaCorte: Date,
  otorgarCompleto = false
): { monto: number; dias: number; esProporcional: boolean; mesesTrabajados: number; antiguedadAnios: number } {
  const meses = mesesEntre(fechaIngreso, fechaCorte);
  const anios  = meses / 12;

  let dias = 0;
  let esProporcional = false;

  if (meses < 12 && !otorgarCompleto) {
    // Menos de un año: proporcional a 15 días
    dias = round2((meses / 12) * 15);
    esProporcional = true;
  } else {
    if (anios < 3)       dias = 15;
    else if (anios < 10) dias = 19;
    else                  dias = 21;
  }

  const monto = round2((salarioMensual / 30) * dias);
  return { monto, dias, esProporcional, mesesTrabajados: Math.floor(meses), antiguedadAnios: Math.floor(anios) };
}

// ── Vacaciones (Art. 177 Código de Trabajo El Salvador) ──────────────────────
// 15 días de vacaciones + 30% recargo sobre el salario de esos días
export function calcularVacaciones(
  salarioMensual: number,
  fechaIngreso: Date,
  fechaCorte: Date
): { monto: number; dias: number; esProporcional: boolean; mesesTrabajados: number } {
  const meses = mesesEntre(fechaIngreso, fechaCorte);
  let dias = 15;
  let esProporcional = false;

  if (meses < 12) {
    dias = round2((meses / 12) * 15);
    esProporcional = true;
  }

  const salarioDiario = salarioMensual / 30;
  const monto = round2(salarioDiario * dias * 1.30); // +30% recargo
  return { monto, dias, esProporcional, mesesTrabajados: Math.floor(meses) };
}

// ── Quincena 25 (Decreto Legislativo 499 — vigente desde enero 2027) ─────────
// 50% del salario mensual para empleados con salario ≤ $1,500
// Se paga el 25 de enero de cada año
export function calcularQuincena25(
  salarioMensual: number,
  fechaIngreso: Date,
  anio: number
): { monto: number; aplica: boolean; esProporcional: boolean; mesesTrabajados: number } {
  const TOPE_QUINCENA25 = 1500;
  if (salarioMensual > TOPE_QUINCENA25) {
    return { monto: 0, aplica: false, esProporcional: false, mesesTrabajados: 0 };
  }

  const fechaCorte = new Date(anio, 0, 25); // 25 de enero del año indicado
  const meses = mesesEntre(fechaIngreso, fechaCorte);
  let monto = round2(salarioMensual * 0.5);
  let esProporcional = false;

  if (meses < 12) {
    monto = round2((meses / 12) * salarioMensual * 0.5);
    esProporcional = true;
  }

  return { monto, aplica: true, esProporcional, mesesTrabajados: Math.floor(meses) };
}

// ── Helpers internos ──────────────────────────────────────────────────────────
function mesesEntre(desde: Date, hasta: Date): number {
  const anios  = hasta.getFullYear() - desde.getFullYear();
  const meses  = hasta.getMonth()    - desde.getMonth();
  const dias   = hasta.getDate()     - desde.getDate();
  return Math.max(0, anios * 12 + meses + (dias < 0 ? -1 : 0));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
