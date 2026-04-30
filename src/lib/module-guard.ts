/**
 * module-guard.ts â€” DefiniciÃ³n de mÃ³dulos del ERP y control de acceso por rol.
 *
 * Roles del sistema:
 *   OWNER      â†’ solo dashboard (mÃ©tricas y reportes)
 *   SUPERADMIN â†’ acceso total al ERP, incluyendo gestiÃ³n de usuarios
 *   GERENTE    â†’ todos los mÃ³dulos operativos de su sucursal, excepto usuarios
 *   USERS    â†’ solo los mÃ³dulos explÃ­citamente asignados en moduleAccess
 *   CLIENT     â†’ sin acceso al ERP (solo portal pÃºblico de reservas)
 */

// â”€â”€ Claves de mÃ³dulo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const MODULE_KEYS = [
  'pos',          // POS + Turnos de Caja
  'pos_dte',      // Documentos / FacturaciÃ³n DTE
  'appointments', // Citas + Caja de Citas
  'clients',      // Clientes
  'loyalty',      // Puntos y Tarjetas de FidelizaciÃ³n
  'barbers',      // Barberos / Estilistas
  'services',     // Servicios / Tratamientos
  'products',     // Productos + Inventario + Compras + Proveedores
  'expenses',     // Gastos + Cuentas por Pagar
  'payroll',      // Planilla
  'branches',     // Sucursales
  'settings',     // ConfiguraciÃ³n
] as const;

export type ModuleKey = typeof MODULE_KEYS[number];

const ACCESS_ALIASES: Record<string, ModuleKey | 'usuarios'> = {
  billing: 'pos_dte',
  billing_dte: 'pos_dte',
  dte: 'pos_dte',
  gastos: 'expenses',
  cxp: 'expenses',
  compras: 'products',
  proveedores: 'products',
  inventario: 'products',
  productos: 'products',
  servicios: 'services',
  citas: 'appointments',
  agenda: 'appointments',
  usuarios: 'usuarios',
};

function hasModuleAccess(moduleAccess: string[] | null, module: ModuleKey | 'usuarios') {
  if (!Array.isArray(moduleAccess)) return false;
  return moduleAccess.some(key => (ACCESS_ALIASES[key] ?? key) === module);
}

export const MODULE_LABELS: Record<ModuleKey, string> = {
  pos:          'POS y Turnos de Caja',
  pos_dte:      'Documentos / FacturaciÃ³n DTE',
  appointments: 'Citas y Caja de Citas',
  clients:      'Clientes',
  loyalty:      'FidelizaciÃ³n (Puntos y Tarjetas)',
  barbers:      'Barberos / Estilistas',
  services:     'Servicios / Tratamientos',
  products:     'Productos, Inventario y Compras',
  expenses:     'Gastos y Cuentas por Pagar',
  payroll:      'Planilla',
  branches:     'Sucursales',
  settings:     'ConfiguraciÃ³n del sistema',
};

// â”€â”€ Mapeo ruta de pÃ¡gina â†’ mÃ³dulo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Mapeo prefijo de API â†’ mÃ³dulo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Control de acceso â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Determina si un rol puede acceder a un mÃ³dulo dado.
 * @param role         - Rol del usuario (string compatible con BarberUserRole)
 * @param module       - Clave del mÃ³dulo a verificar
 * @param moduleAccess - Lista de mÃ³dulos asignados (solo aplica a USERS)
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
      if (module === 'usuarios') return true;
      return hasModuleAccess(moduleAccess, module);

    case 'OWNER':
      // Solo ve el dashboard â€” ningÃºn mÃ³dulo operativo ni usuarios
      return false;

    case 'GERENTE':
    case 'USERS':
      // Sin acceso a gestiÃ³n de usuarios nunca
      if (module === 'usuarios') return false;
      // Solo mÃ³dulos explÃ­citamente asignados
      return hasModuleAccess(moduleAccess, module);

    default:
      return false;
  }
}

