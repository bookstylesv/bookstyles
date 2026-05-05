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
  'pos',          // POS
  'pos_turnos',   // Turnos de Caja
  'pos_dte',      // Documentos / Facturación DTE
  'appointments', // Citas / Agenda
  'billing',      // Caja de Citas / Agenda
  'clients',      // Clientes
  'loyalty',      // Puntos y Tarjetas de Fidelización
  'barbers',      // Equipo
  'services',     // Servicios / Tratamientos
  'compras',      // Compras
  'proveedores',  // Proveedores
  'productos',    // Productos
  'inventario',   // Inventario
  'gastos',       // Gastos
  'cxp',          // Cuentas por Pagar
  'payroll',      // Planilla
  'metas',        // Metas mensuales
  'branches',     // Sucursales
  'settings',     // Configuración
] as const;

export type ModuleKey = typeof MODULE_KEYS[number];

const ACCESS_ALIASES: Record<string, ModuleKey | 'usuarios'> = {
  billing_dte: 'pos_dte',
  dte: 'pos_dte',
  servicios: 'services',
  citas: 'appointments',
  agenda: 'appointments',
  usuarios: 'usuarios',
};

const LEGACY_ACCESS_GROUPS: Record<string, ModuleKey[]> = {
  pos: ['pos', 'pos_turnos'],
  appointments: ['appointments', 'billing'],
  products: ['compras', 'proveedores', 'productos', 'inventario'],
  expenses: ['gastos', 'cxp'],
};

function hasModuleAccess(moduleAccess: string[] | null, module: ModuleKey | 'usuarios') {
  if (!Array.isArray(moduleAccess)) return false;
  return moduleAccess.some(key => {
    const canonical = ACCESS_ALIASES[key] ?? key;
    if (canonical === module) return true;
    return module !== 'usuarios' && (LEGACY_ACCESS_GROUPS[canonical]?.includes(module) ?? false);
  });
}

export const MODULE_LABELS: Record<ModuleKey, string> = {
  pos:          'POS',
  pos_turnos:   'Turnos de Caja',
  pos_dte:      'Documentos / Facturación DTE',
  appointments: 'Citas / Agenda',
  billing:      'Caja de Citas / Agenda',
  clients:      'Clientes',
  loyalty:      'Fidelización (Puntos y Tarjetas)',
  barbers:      'Equipo',
  services:     'Servicios / Tratamientos',
  compras:      'Compras',
  proveedores:  'Proveedores',
  productos:    'Productos',
  inventario:   'Inventario',
  gastos:       'Gastos',
  cxp:          'Cuentas por Pagar',
  payroll:      'Planilla',
  metas:        'Metas Mensuales',
  branches:     'Sucursales',
  settings:     'Configuración del sistema',
};

// â”€â”€ Mapeo ruta de pÃ¡gina â†’ mÃ³dulo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const PAGE_MODULE_MAP: Record<string, ModuleKey | 'dashboard' | 'usuarios'> = {
  '/dashboard':       'dashboard',
  '/pos':             'pos',
  '/pos-turnos':      'pos_turnos',
  '/pos-documentos':  'pos_dte',
  '/appointments':    'appointments',
  '/billing':         'billing',
  '/loyalty':         'loyalty',
  '/barbers':         'barbers',
  '/usuarios':        'usuarios',
  '/services':        'services',
  '/clients':         'clients',
  '/compras':         'compras',
  '/proveedores':     'proveedores',
  '/productos':       'productos',
  '/inventario':      'inventario',
  '/gastos':          'gastos',
  '/cxp':             'cxp',
  '/planilla':        'payroll',
  '/metas':           'metas',
  '/branches':        'branches',
  '/settings':        'settings',
};

// â”€â”€ Mapeo prefijo de API â†’ mÃ³dulo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const API_MODULE_MAP: [string, ModuleKey | 'usuarios'][] = [
  ['/api/usuarios',     'usuarios'],
  ['/api/pos/turno',    'pos_turnos'],
  ['/api/pos/turnos',   'pos_turnos'],
  ['/api/pos',          'pos'],
  ['/api/billing',      'billing'],
  ['/api/appointments', 'appointments'],
  ['/api/loyalty',      'loyalty'],
  ['/api/barbers',      'barbers'],
  ['/api/services',     'services'],
  ['/api/clients',      'clients'],
  ['/api/compras',      'compras'],
  ['/api/proveedores',  'proveedores'],
  ['/api/productos',    'productos'],
  ['/api/inventario',   'inventario'],
  ['/api/gastos',       'gastos'],
  ['/api/cxp',          'cxp'],
  ['/api/planilla',     'payroll'],
  ['/api/metas',        'metas'],
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
      return true;

    case 'OWNER':
      // Solo ve el dashboard — excepto branches, settings y metas (responsabilidad del dueño)
      if (module === 'branches' || module === 'settings' || module === 'metas') return true;
      return false;

    case 'GERENTE':
      // Sin acceso a gestión de usuarios nunca
      if (module === 'usuarios') return false;
      // GERENTE siempre puede ver y gestionar metas de su sucursal
      if (module === 'metas') return true;
      // Solo módulos explícitamente asignados
      return hasModuleAccess(moduleAccess, module);

    case 'USERS':
      // Sin acceso a gestión de usuarios nunca
      if (module === 'usuarios') return false;
      // Solo módulos explícitamente asignados
      return hasModuleAccess(moduleAccess, module);

    default:
      return false;
  }
}

