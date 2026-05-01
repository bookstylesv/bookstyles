/**
 * import-limits.ts
 * Límites de importación por plan y por recurso.
 * Centralizado aquí para que sea fácil ajustar sin tocar los endpoints.
 */

export type ImportResource =
  | 'clientes'
  | 'empleados'
  | 'servicios'
  | 'productos'
  | 'proveedores'
  | 'cat-producto'
  | 'cat-gasto'
  | 'cat-servicio';

export const DAILY_IMPORT_LIMIT = 10; // intentos totales por tenant por día

/** Límite máximo de filas por lote (independiente del plan) */
export const ROW_LIMIT: Record<ImportResource, number> = {
  'clientes':     2000,
  'empleados':    100,
  'servicios':    500,
  'productos':    1000,
  'proveedores':  200,
  'cat-producto': 100,
  'cat-gasto':    100,
  'cat-servicio': 100,
};

/** Límite acumulado en BD según plan */
export const PLAN_LIMIT: Record<string, Record<ImportResource, number>> = {
  TRIAL: {
    'clientes':     50,
    'empleados':    3,
    'servicios':    20,
    'productos':    50,
    'proveedores':  10,
    'cat-producto': 10,
    'cat-gasto':    10,
    'cat-servicio': 10,
  },
  BASIC: {
    'clientes':     500,
    'empleados':    10,
    'servicios':    100,
    'productos':    200,
    'proveedores':  50,
    'cat-producto': 30,
    'cat-gasto':    30,
    'cat-servicio': 30,
  },
  PRO: {
    'clientes':     2000,
    'empleados':    25,
    'servicios':    300,
    'productos':    500,
    'proveedores':  100,
    'cat-producto': 100,
    'cat-gasto':    100,
    'cat-servicio': 100,
  },
  ENTERPRISE: {
    'clientes':     99999,
    'empleados':    500,
    'servicios':    99999,
    'productos':    99999,
    'proveedores':  99999,
    'cat-producto': 99999,
    'cat-gasto':    99999,
    'cat-servicio': 99999,
  },
};

/** Columnas requeridas por recurso para validar el Excel */
export const REQUIRED_COLUMNS: Record<ImportResource, string[]> = {
  'clientes':     ['nombre', 'email'],
  'empleados':    ['nombre', 'email', 'password'],
  'servicios':    ['nombre', 'precio', 'duracion_minutos'],
  'productos':    ['codigo', 'nombre', 'precio_venta'],
  'proveedores':  ['nombre'],
  'cat-producto': ['nombre'],
  'cat-gasto':    ['nombre'],
  'cat-servicio': ['nombre'],
};

/** Columnas completas de cada plantilla (required + opcionales) */
export const TEMPLATE_COLUMNS: Record<ImportResource, string[]> = {
  'clientes':     ['nombre', 'email', 'telefono', 'descuento_tipo', 'descuento_valor'],
  'empleados':    ['nombre', 'email', 'password', 'cargo', 'telefono'],
  'servicios':    ['nombre', 'precio', 'duracion_minutos', 'categoria', 'descripcion'],
  'productos':    ['codigo', 'nombre', 'precio_venta', 'costo', 'stock_actual', 'stock_minimo', 'categoria', 'descripcion'],
  'proveedores':  ['nombre', 'telefono', 'correo', 'contacto', 'tipo', 'nit', 'nrc', 'direccion'],
  'cat-producto': ['nombre', 'color'],
  'cat-gasto':    ['nombre', 'descripcion', 'color'],
  'cat-servicio': ['nombre', 'color'],
};

/** Fila de ejemplo para cada plantilla */
export const TEMPLATE_EXAMPLE: Record<ImportResource, Record<string, string>> = {
  'clientes':     { nombre: 'Juan Pérez', email: 'juan@email.com', telefono: '77001122', descuento_tipo: 'PORCENTAJE', descuento_valor: '10' },
  'empleados':    { nombre: 'Carlos Ramírez', email: 'carlos@barberia.com', password: 'Temp1234!', cargo: 'Barbero', telefono: '77334455' },
  'servicios':    { nombre: 'Corte clásico', precio: '8.00', duracion_minutos: '30', categoria: 'cabello', descripcion: 'Corte con tijera y máquina' },
  'productos':    { codigo: 'PROD-001', nombre: 'Pomada fijadora', precio_venta: '12.50', costo: '6.00', stock_actual: '20', stock_minimo: '5', categoria: 'Cuidado capilar', descripcion: '' },
  'proveedores':  { nombre: 'Distribuidora SV', telefono: '22001100', correo: 'ventas@dist.com', contacto: 'Miguel Torres', tipo: 'NACIONAL', nit: '', nrc: '', direccion: 'Col. Escalón, SS' },
  'cat-producto': { nombre: 'Cuidado capilar', color: 'blue' },
  'cat-gasto':    { nombre: 'Servicios básicos', descripcion: 'Agua, luz, internet', color: '#0d9488' },
  'cat-servicio': { nombre: 'Cabello', color: 'green' },
};

export const RESOURCE_LABEL: Record<ImportResource, string> = {
  'clientes':     'Clientes',
  'empleados':    'Empleados',
  'servicios':    'Servicios',
  'productos':    'Productos',
  'proveedores':  'Proveedores',
  'cat-producto': 'Categorías de Producto',
  'cat-gasto':    'Categorías de Gasto',
  'cat-servicio': 'Categorías de Servicio',
};

export function isValidResource(r: string): r is ImportResource {
  return Object.keys(ROW_LIMIT).includes(r);
}
