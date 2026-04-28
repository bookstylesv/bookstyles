/**
 * module-guard.ts — Definición de módulos del ERP y control de acceso por rol.
 *
 * Roles del sistema:
 *   OWNER      → solo dashboard (métricas y reportes)
 *   SUPERADMIN → acceso total al ERP, incluyendo gestión de usuarios
 *   GERENTE    → todos los módulos operativos de su sucursal, excepto usuarios
 *   USUARIO    → solo los módulos explícitamente asignados en moduleAccess
 *   CLIENT     → sin acceso al ERP (solo portal público de reservas)
 */

// ── Claves de módulo ─────────────────────────────────────────────────────────

export const MODULE_KEYS = [
  'pos',          // POS + Turnos de Caja
  'pos_dte',      // Documentos / Facturación DTE
  'appointments', // Citas + Caja de Citas
  'clients',      // Clientes
  'loyalty',      // Puntos y Tarjetas de Fidelización
  'barbers',      // Barberos / Estilistas
  'services',     // Servicios / Tratamientos
  'products',     // Productos + Inventario + Compras + Proveedores
  'expenses',     // Gastos + Cuentas por Pagar
  'payroll',      // Planilla
  'branches',     // Sucursales
  'settings',     // Configuración
] as const;

export type ModuleKey = typeof MODULE_KEYS[number];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  pos:          'POS y Turnos de Caja',
  pos_dte:      'Documentos / Facturación DTE',
  appointments: 'Citas y Caja de Citas',
  clients:      'Clientes',
  loyalty:      'Fidelización (Puntos y Tarjetas)',
  barbers:      'Barberos / Estilistas',
  services:     'Servicios / Tratamientos',
  products:     'Productos, Inventario y Compras',
  expenses:     'Gastos y Cuentas por Pagar',
  payroll:      'Planilla',
  branches:     'Sucursales',
  settings:     'Configuración del sistema',
};

// ── Mapeo ruta de página → módulo ────────────────────────────────────────────

export const PAGE_MODULE_MAP: Record<string, ModuleKey | 'dashboard' | 'usuarios'> = {
  '/dashboard':       'dashboard',
  '/pos':             'pos',
  '/pos-turnos':      'pos',
  '/pos-documentos':  'pos_dte',
  '/appointments':    'appointments',
  '/billing':         'appointments',
  '/loyalty':         'loyalty',
  '/barbers':         'barbers',
  '/usuarios':        'usuarios',
  '/services':        'services',
  '/clients':         'clients',
  '/compras':         'products',
  '/proveedores':     'products',
  '/productos':       'products',
  '/inventario':      'products',
  '/gastos':          'expenses',
  '/cxp':             'expenses',
  '/planilla':        'payroll',
  '/branches':        'branches',
  '/settings':        'settings',
};

// ── Mapeo prefijo de API → módulo ─────────────────────────────────────────────

export const API_MODULE_MAP: [string, ModuleKey | 'usuarios'][] = [
  ['/api/usuarios',     'usuarios'],
  ['/api/pos',          'pos'],
  ['/api/billing',      'appointments'],
  ['/api/appointments', 'appointments'],
  ['/api/loyalty',      'loyalty'],
  ['/api/barbers',      'barbers'],
  ['/api/services',     'services'],
  ['/api/clients',      'clients'],
  ['/api/compras',      'products'],
  ['/api/proveedores',  'products'],
  ['/api/productos',    'products'],
  ['/api/inventario',   'products'],
  ['/api/gastos',       'expenses'],
  ['/api/cxp',          'expenses'],
  ['/api/planilla',     'payroll'],
  ['/api/branches',     'branches'],
  ['/api/settings',     'settings'],
];

// ── Control de acceso ────────────────────────────────────────────────────────

/**
 * Determina si un rol puede acceder a un módulo dado.
 * @param role         - Rol del usuario (string compatible con BarberUserRole)
 * @param module       - Clave del módulo a verificar
 * @param moduleAccess - Lista de módulos asignados (solo aplica a USUARIO)
 */
export function canAccess(
  role: string,
  module: ModuleKey | 'dashboard' | 'usuarios',
  moduleAccess: string[] | null,
): boolean {
  // Dashboard es visible para todos los roles ERP
  if (module === 'dashboard') return true;

  switch (role) {
    case 'SUPERADMIN':
      return true;

    case 'OWNER':
      // Solo ve el dashboard — ningún módulo operativo ni usuarios
      return false;

    case 'GERENTE':
      // Ve todo lo operativo excepto usuarios
      return module !== 'usuarios';

    case 'USUARIO':
      // Sin acceso a gestión de usuarios nunca
      if (module === 'usuarios') return false;
      // Solo módulos explícitamente asignados
      return Array.isArray(moduleAccess) && moduleAccess.includes(module);

    default:
      return false;
  }
}
