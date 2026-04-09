/**
 * Catálogos oficiales del Ministerio de Hacienda — El Salvador
 * CAT-012: Departamentos  (V1.2)
 * CAT-013: Municipios     (V1.2 — vigente desde nov 2024)
 *
 * CAMBIO 2023: Decreto Legislativo N° 762 (jun 2023) redujo los 262
 * municipios a 44, nombrados por punto cardinal dentro de cada depto.
 * Los 262 municipios anteriores pasaron a ser "distritos".
 * El MH actualizó el catálogo DTE a la V1.2 con obligatoriedad desde
 * el 01/11/2024.
 *
 * IMPORTANTE: Los códigos de municipio NO son globalmente únicos.
 * El MH valida el par (departamentoCod, municipioCod).
 * Fuente: Catálogos del Sistema de Transmisión V1.2 — MH El Salvador
 */

export interface Departamento {
  codigo: string;
  nombre: string;
}

export interface Municipio {
  codigo: string;
  nombre: string;
  departamentoCod: string;
}

// ── CAT-012: Departamentos ────────────────────────────────────────────────────

export const DEPARTAMENTOS: Departamento[] = [
  { codigo: '00', nombre: 'Otro (Extranjero)' },
  { codigo: '01', nombre: 'Ahuachapán' },
  { codigo: '02', nombre: 'Santa Ana' },
  { codigo: '03', nombre: 'Sonsonate' },
  { codigo: '04', nombre: 'Chalatenango' },
  { codigo: '05', nombre: 'La Libertad' },
  { codigo: '06', nombre: 'San Salvador' },
  { codigo: '07', nombre: 'Cuscatlán' },
  { codigo: '08', nombre: 'La Paz' },
  { codigo: '09', nombre: 'Cabañas' },
  { codigo: '10', nombre: 'San Vicente' },
  { codigo: '11', nombre: 'Usulután' },
  { codigo: '12', nombre: 'San Miguel' },
  { codigo: '13', nombre: 'Morazán' },
  { codigo: '14', nombre: 'La Unión' },
];

// ── CAT-013: Municipios (V1.2 — 44 municipios vigentes) ──────────────────────

export const MUNICIPIOS: Municipio[] = [
  // ── 00 Extranjeros ────────────────────────────────────────────────────────
  { codigo: '00', nombre: 'Otro (Extranjero)',  departamentoCod: '00' },

  // ── 01 Ahuachapán — 3 municipios ─────────────────────────────────────────
  { codigo: '13', nombre: 'Ahuachapán Norte',   departamentoCod: '01' },
  { codigo: '14', nombre: 'Ahuachapán Centro',  departamentoCod: '01' },
  { codigo: '15', nombre: 'Ahuachapán Sur',     departamentoCod: '01' },

  // ── 02 Santa Ana — 4 municipios ──────────────────────────────────────────
  { codigo: '14', nombre: 'Santa Ana Norte',    departamentoCod: '02' },
  { codigo: '15', nombre: 'Santa Ana Centro',   departamentoCod: '02' },
  { codigo: '16', nombre: 'Santa Ana Este',     departamentoCod: '02' },
  { codigo: '17', nombre: 'Santa Ana Oeste',    departamentoCod: '02' },

  // ── 03 Sonsonate — 4 municipios ──────────────────────────────────────────
  { codigo: '17', nombre: 'Sonsonate Norte',    departamentoCod: '03' },
  { codigo: '18', nombre: 'Sonsonate Centro',   departamentoCod: '03' },
  { codigo: '19', nombre: 'Sonsonate Este',     departamentoCod: '03' },
  { codigo: '20', nombre: 'Sonsonate Oeste',    departamentoCod: '03' },

  // ── 04 Chalatenango — 3 municipios ───────────────────────────────────────
  { codigo: '34', nombre: 'Chalatenango Norte', departamentoCod: '04' },
  { codigo: '35', nombre: 'Chalatenango Centro',departamentoCod: '04' },
  { codigo: '36', nombre: 'Chalatenango Sur',   departamentoCod: '04' },

  // ── 05 La Libertad — 6 municipios ────────────────────────────────────────
  { codigo: '23', nombre: 'La Libertad Norte',  departamentoCod: '05' },
  { codigo: '24', nombre: 'La Libertad Centro', departamentoCod: '05' },
  { codigo: '25', nombre: 'La Libertad Oeste',  departamentoCod: '05' },
  { codigo: '26', nombre: 'La Libertad Este',   departamentoCod: '05' },
  { codigo: '27', nombre: 'La Libertad Costa',  departamentoCod: '05' },
  { codigo: '28', nombre: 'La Libertad Sur',    departamentoCod: '05' },

  // ── 06 San Salvador — 5 municipios ───────────────────────────────────────
  { codigo: '20', nombre: 'San Salvador Norte', departamentoCod: '06' },
  { codigo: '21', nombre: 'San Salvador Oeste', departamentoCod: '06' },
  { codigo: '22', nombre: 'San Salvador Este',  departamentoCod: '06' },
  { codigo: '23', nombre: 'San Salvador Centro',departamentoCod: '06' },
  { codigo: '24', nombre: 'San Salvador Sur',   departamentoCod: '06' },

  // ── 07 Cuscatlán — 2 municipios ──────────────────────────────────────────
  { codigo: '17', nombre: 'Cuscatlán Norte',    departamentoCod: '07' },
  { codigo: '18', nombre: 'Cuscatlán Sur',      departamentoCod: '07' },

  // ── 08 La Paz — 3 municipios ─────────────────────────────────────────────
  { codigo: '23', nombre: 'La Paz Oeste',       departamentoCod: '08' },
  { codigo: '24', nombre: 'La Paz Centro',      departamentoCod: '08' },
  { codigo: '25', nombre: 'La Paz Este',        departamentoCod: '08' },

  // ── 09 Cabañas — 2 municipios ────────────────────────────────────────────
  { codigo: '10', nombre: 'Cabañas Oeste',      departamentoCod: '09' },
  { codigo: '11', nombre: 'Cabañas Este',       departamentoCod: '09' },

  // ── 10 San Vicente — 2 municipios ────────────────────────────────────────
  { codigo: '14', nombre: 'San Vicente Norte',  departamentoCod: '10' },
  { codigo: '15', nombre: 'San Vicente Sur',    departamentoCod: '10' },

  // ── 11 Usulután — 3 municipios ───────────────────────────────────────────
  { codigo: '24', nombre: 'Usulután Norte',     departamentoCod: '11' },
  { codigo: '25', nombre: 'Usulután Este',      departamentoCod: '11' },
  { codigo: '26', nombre: 'Usulután Oeste',     departamentoCod: '11' },

  // ── 12 San Miguel — 3 municipios ─────────────────────────────────────────
  { codigo: '21', nombre: 'San Miguel Norte',   departamentoCod: '12' },
  { codigo: '22', nombre: 'San Miguel Centro',  departamentoCod: '12' },
  { codigo: '23', nombre: 'San Miguel Oeste',   departamentoCod: '12' },

  // ── 13 Morazán — 2 municipios ────────────────────────────────────────────
  { codigo: '27', nombre: 'Morazán Norte',      departamentoCod: '13' },
  { codigo: '28', nombre: 'Morazán Sur',        departamentoCod: '13' },

  // ── 14 La Unión — 2 municipios ───────────────────────────────────────────
  { codigo: '19', nombre: 'La Unión Norte',     departamentoCod: '14' },
  { codigo: '20', nombre: 'La Unión Sur',       departamentoCod: '14' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getMunicipiosByDepto(departamentoCod: string): Municipio[] {
  return MUNICIPIOS.filter(m => m.departamentoCod === departamentoCod);
}

export function getDepartamentoNombre(codigo: string): string {
  return DEPARTAMENTOS.find(d => d.codigo === codigo)?.nombre ?? codigo;
}

export function getMunicipioNombre(departamentoCod: string, municipioCod: string): string {
  return MUNICIPIOS.find(
    m => m.departamentoCod === departamentoCod && m.codigo === municipioCod,
  )?.nombre ?? municipioCod;
}
