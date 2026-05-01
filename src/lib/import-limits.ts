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
  'empleados':    ['nombre', 'email'],
  'servicios':    ['nombre', 'precio', 'duracion_minutos'],
  'productos':    ['codigo', 'nombre', 'precio_venta'],
  'proveedores':  ['nombre'],
  'cat-producto': ['nombre'],
  'cat-gasto':    ['nombre'],
  'cat-servicio': ['nombre'],
};

/** Columnas completas de cada plantilla (required + opcionales) */
export const TEMPLATE_COLUMNS: Record<ImportResource, string[]> = {
  'clientes':     ['nombre', 'email', 'telefono', 'tipo_documento', 'num_documento', 'nrc', 'nombre_comercial', 'complemento', 'descuento_tipo', 'descuento_valor'],
  'empleados':    ['nombre', 'email', 'telefono', 'cargo', 'bio', 'especialidades'],
  'servicios':    ['nombre', 'precio', 'duracion_minutos', 'categoria', 'descripcion'],
  'productos':    ['codigo', 'nombre', 'precio_venta', 'costo', 'stock_actual', 'stock_minimo', 'categoria', 'descripcion'],
  'proveedores':  ['nombre', 'telefono', 'correo', 'contacto', 'tipo', 'nit', 'nrc', 'direccion'],
  'cat-producto': ['nombre', 'color'],
  'cat-gasto':    ['nombre', 'descripcion', 'color'],
  'cat-servicio': ['nombre', 'color'],
};

/** 5 filas de ejemplo para cada plantilla (hoja 2 del Excel) */
export const TEMPLATE_EXAMPLES: Record<ImportResource, Record<string, string>[]> = {
  // tipo_documento usa códigos DTE: 13=DUI, 36=NIT, 37=Pasaporte, 03=Cédula ext., 02=Carnet res.
  'clientes': [
    { nombre: 'Juan Pérez',       email: 'juan@email.com',    telefono: '77001122', tipo_documento: '13', num_documento: '012345678', nrc: '',       nombre_comercial: '',              complemento: 'Col. Escalón, SS',  descuento_tipo: 'PORCENTAJE', descuento_valor: '10' },
    { nombre: 'María López',      email: 'maria@email.com',   telefono: '77223344', tipo_documento: '13', num_documento: '023456789', nrc: '',       nombre_comercial: '',              complemento: 'Res. Santa Elena', descuento_tipo: '',           descuento_valor: '' },
    { nombre: 'Empresa ABC S.A.', email: 'info@abc.com',      telefono: '22001100', tipo_documento: '36', num_documento: '06141234561010', nrc: '123456', nombre_comercial: 'ABC Comercial', complemento: 'Centro Comercial', descuento_tipo: 'MONTO',      descuento_valor: '5.00' },
    { nombre: 'Pedro Martínez',   email: 'pedro@gmail.com',   telefono: '70001234', tipo_documento: '37', num_documento: 'A1234567',  nrc: '',       nombre_comercial: '',              complemento: '',                 descuento_tipo: '',           descuento_valor: '' },
    { nombre: 'Ana González',     email: 'ana@hotmail.com',   telefono: '60009988', tipo_documento: '13', num_documento: '056789012', nrc: '',       nombre_comercial: '',              complemento: 'Apdo. 101',        descuento_tipo: 'PORCENTAJE', descuento_valor: '15' },
  ],
  'empleados': [
    { nombre: 'Carlos Ramírez',  email: 'carlos@barberia.com',  telefono: '77334455', cargo: 'Barbero',         bio: 'Especialista en cortes clásicos', especialidades: 'Corte,Barba' },
    { nombre: 'Luis Hernández',  email: 'luis@barberia.com',    telefono: '77556677', cargo: 'Estilista',       bio: 'Más de 5 años de experiencia',    especialidades: 'Coloración,Peinado' },
    { nombre: 'Jorge Velásquez', email: 'jorge@barberia.com',   telefono: '78001234', cargo: 'Barbero',         bio: '',                                especialidades: 'Corte' },
    { nombre: 'Diana Flores',    email: 'diana@barberia.com',   telefono: '76543210', cargo: 'Recepcionista',   bio: 'Atención al cliente',             especialidades: '' },
    { nombre: 'Roberto Chávez',  email: 'roberto@barberia.com', telefono: '70112233', cargo: 'Barbero Senior',  bio: 'Instructor certificado',          especialidades: 'Corte,Barba,Cejas' },
  ],
  'servicios': [
    { nombre: 'Corte clásico',      precio: '8.00',  duracion_minutos: '30', categoria: 'Cabello',  descripcion: 'Corte con tijera y máquina' },
    { nombre: 'Corte + barba',       precio: '12.00', duracion_minutos: '45', categoria: 'Combo',    descripcion: 'Corte y arreglo de barba' },
    { nombre: 'Diseño de barba',     precio: '6.00',  duracion_minutos: '20', categoria: 'Barba',    descripcion: 'Perfilado y diseño' },
    { nombre: 'Tinte completo',      precio: '25.00', duracion_minutos: '90', categoria: 'Color',    descripcion: 'Aplicación de tinte en todo el cabello' },
    { nombre: 'Corte niño',          precio: '5.00',  duracion_minutos: '20', categoria: 'Cabello',  descripcion: 'Corte para menores de 12 años' },
  ],
  'productos': [
    { codigo: 'PROD-001', nombre: 'Pomada fijadora',     precio_venta: '12.50', costo: '6.00',  stock_actual: '20', stock_minimo: '5',  categoria: 'Cuidado capilar', descripcion: 'Fijación fuerte' },
    { codigo: 'PROD-002', nombre: 'Shampoo profesional', precio_venta: '9.00',  costo: '4.50',  stock_actual: '15', stock_minimo: '3',  categoria: 'Cuidado capilar', descripcion: '500ml' },
    { codigo: 'PROD-003', nombre: 'Aceite para barba',   precio_venta: '8.00',  costo: '3.50',  stock_actual: '10', stock_minimo: '2',  categoria: 'Barba',           descripcion: '30ml' },
    { codigo: 'PROD-004', nombre: 'Cera mate',            precio_venta: '11.00', costo: '5.00',  stock_actual: '25', stock_minimo: '5',  categoria: 'Cuidado capilar', descripcion: 'Acabado mate' },
    { codigo: 'PROD-005', nombre: 'Navaja desechable',    precio_venta: '2.50',  costo: '0.80',  stock_actual: '100', stock_minimo: '20', categoria: 'Herramientas',   descripcion: 'Paquete x10' },
  ],
  'proveedores': [
    { nombre: 'Distribuidora SV',   telefono: '22001100', correo: 'ventas@dist.com',   contacto: 'Miguel Torres',  tipo: 'NACIONAL',       nit: '0614-123456-101-0', nrc: '12345-6', direccion: 'Col. Escalón, SS' },
    { nombre: 'Global Barber Sup.', telefono: '22334455', correo: 'info@global.com',   contacto: 'Ana Rodríguez',  tipo: 'INTERNACIONAL',  nit: '',                  nrc: '',        direccion: 'Miami, FL, USA' },
    { nombre: 'Productos El Caribe',telefono: '22556677', correo: 'caribe@gmail.com',  contacto: 'José Morales',   tipo: 'NACIONAL',       nit: '0614-654321-102-1', nrc: '67890-1', direccion: 'Santa Tecla' },
    { nombre: 'ImportStyle GT',     telefono: '00502-1234', correo: 'style@gt.com',    contacto: 'Carlos Ruiz',    tipo: 'INTERNACIONAL',  nit: '',                  nrc: '',        direccion: 'Guatemala City' },
    { nombre: 'BeautyPro SV',       telefono: '21002200', correo: 'ventas@beauty.sv',  contacto: 'Laura Vásquez',  tipo: 'NACIONAL',       nit: '0614-111222-103-2', nrc: '11223-4', direccion: 'Antiguo Cuscatlán' },
  ],
  'cat-producto': [
    { nombre: 'Cuidado capilar', color: 'blue' },
    { nombre: 'Barba',           color: 'cyan' },
    { nombre: 'Herramientas',    color: 'orange' },
    { nombre: 'Color y tinte',   color: 'purple' },
    { nombre: 'Accesorios',      color: 'green' },
  ],
  'cat-gasto': [
    { nombre: 'Servicios básicos',  descripcion: 'Agua, luz, internet',        color: '#0d9488' },
    { nombre: 'Alquiler',           descripcion: 'Renta mensual del local',     color: '#6366f1' },
    { nombre: 'Insumos',            descripcion: 'Productos de uso diario',     color: '#f59e0b' },
    { nombre: 'Mantenimiento',      descripcion: 'Reparaciones y equipo',       color: '#ef4444' },
    { nombre: 'Publicidad',         descripcion: 'Redes sociales, volantes',    color: '#8b5cf6' },
  ],
  'cat-servicio': [
    { nombre: 'Cabello', color: 'green' },
    { nombre: 'Barba',   color: 'blue' },
    { nombre: 'Color',   color: 'purple' },
    { nombre: 'Combo',   color: 'orange' },
    { nombre: 'Otros',   color: 'default' },
  ],
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
