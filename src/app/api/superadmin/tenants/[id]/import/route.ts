/**
 * POST /api/superadmin/tenants/:id/import
 * Body: multipart/form-data  { resource: ImportResource, file: xlsx/csv }
 *
 * Capas de seguridad aplicadas:
 *  1. Archivo > 2 MB → rechazado antes de parsear
 *  2. Filas > ROW_LIMIT[resource] → rechazado
 *  3. Existentes + nuevos > PLAN_LIMIT[plan][resource] → rechazado
 *  4. Validación fila por fila (columnas requeridas, tipos)
 *  5. 10 importaciones/día por tenant
 */
import { NextRequest, NextResponse } from 'next/server';
import { validateSuperadminKey, unauthorizedResponse } from '@/lib/superadmin-auth';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import {
  isValidResource, DAILY_IMPORT_LIMIT, ROW_LIMIT, PLAN_LIMIT,
  REQUIRED_COLUMNS, type ImportResource,
} from '@/lib/import-limits';

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

type RowError = { fila: number; campo: string; error: string };

// ── helpers ───────────────────────────────────────────

function str(v: unknown): string  { return v != null ? String(v).trim() : ''; }
function num(v: unknown): number  { return isNaN(Number(v)) ? 0 : Number(v); }
function email(v: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

function normalizeRows(sheet: XLSX.WorkSheet): Record<string, string>[] {
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  return raw.map(row =>
    Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.toLowerCase().trim().replace(/\s+/g, '_'), str(v)])
    )
  );
}

function validateColumns(rows: Record<string, string>[], required: string[]): string | null {
  if (rows.length === 0) return 'El archivo no contiene filas de datos.';
  const keys = Object.keys(rows[0]);
  const missing = required.filter(c => !keys.includes(c));
  if (missing.length > 0)
    return `Columnas requeridas faltantes: ${missing.join(', ')}. Descarga la plantilla correcta.`;
  return null;
}

// ── importers ─────────────────────────────────────────

async function importClientes(tenantId: number, rows: Record<string, string>[]) {
  const errors: RowError[] = [];
  const toCreate: {
    tenantId: number; email: string; password: string; fullName: string; role: 'CLIENT';
    phone?: string; tipoDocumento?: string; numDocumento?: string; nrc?: string;
    nombreComercial?: string; complemento?: string; descuentoTipo?: string; descuentoValor?: number;
  }[] = [];

  // Códigos DTE: 13=DUI, 36=NIT, 37=Pasaporte, 03=Cédula ext., 02=Carnet res.
  const VALID_DOC_CODES = ['13', '36', '37', '03', '02'];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]; const fila = i + 2;
    if (!r.nombre) { errors.push({ fila, campo: 'nombre', error: 'Nombre requerido' }); continue; }
    if (!r.email)  { errors.push({ fila, campo: 'email',  error: 'Email requerido' }); continue; }
    if (!email(r.email)) { errors.push({ fila, campo: 'email', error: `"${r.email}" no es un email válido` }); continue; }

    const descTipo = r.descuento_tipo?.toUpperCase();
    const docCode  = r.tipo_documento?.trim();

    toCreate.push({
      tenantId, role: 'CLIENT',
      fullName: r.nombre, email: r.email.toLowerCase(),
      password: '$2b$10$placeholder_import_password_hash',
      phone:           r.telefono       || undefined,
      tipoDocumento:   VALID_DOC_CODES.includes(docCode ?? '') ? docCode : undefined,
      numDocumento:    r.num_documento  || undefined,
      nrc:             r.nrc            || undefined,
      nombreComercial: r.nombre_comercial || undefined,
      complemento:     r.complemento    || undefined,
      descuentoTipo:   descTipo === 'PORCENTAJE' || descTipo === 'MONTO' ? descTipo : undefined,
      descuentoValor:  r.descuento_valor ? num(r.descuento_valor) : undefined,
    });
  }

  if (toCreate.length === 0) return { imported: 0, skipped: rows.length, errors };

  const result = await prisma.barberUser.createMany({ data: toCreate, skipDuplicates: true });
  return { imported: result.count, skipped: rows.length - result.count, errors };
}

async function importEmpleados(tenantId: number, rows: Record<string, string>[]) {
  const errors: RowError[] = [];
  let imported = 0; let skipped = 0;

  const bcrypt = await import('bcryptjs');

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]; const fila = i + 2;
    if (!r.nombre) { errors.push({ fila, campo: 'nombre', error: 'Nombre requerido' }); skipped++; continue; }
    if (!r.email)  { errors.push({ fila, campo: 'email',  error: 'Email requerido' }); skipped++; continue; }
    if (!email(r.email)) { errors.push({ fila, campo: 'email', error: `"${r.email}" no es un email válido` }); skipped++; continue; }

    // Contraseña auto-generada (el empleado la cambia en su primer acceso)
    const tempPassword = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase() + '!';
    const hashed = await bcrypt.hash(tempPassword, 10);

    // Especialidades: "Corte,Barba" → ["Corte", "Barba"]
    const specialties = r.especialidades
      ? r.especialidades.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    try {
      const user = await prisma.barberUser.create({
        data: { tenantId, role: 'USERS', fullName: r.nombre, email: r.email.toLowerCase(), password: hashed, phone: r.telefono || undefined },
      });
      await prisma.barber.create({
        data: { tenantId, userId: user.id, cargo: r.cargo || 'Barbero', bio: r.bio || undefined, specialties },
      });
      imported++;
    } catch {
      errors.push({ fila, campo: 'email', error: `Email "${r.email}" ya existe en este tenant` });
      skipped++;
    }
  }
  return { imported, skipped, errors };
}

async function importServicios(tenantId: number, rows: Record<string, string>[]) {
  const errors: RowError[] = [];
  const toCreate: { tenantId: number; name: string; price: number; duration: number; category?: string; description?: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]; const fila = i + 2;
    if (!r.nombre) { errors.push({ fila, campo: 'nombre', error: 'Nombre requerido' }); continue; }
    if (!r.precio || isNaN(Number(r.precio))) { errors.push({ fila, campo: 'precio', error: 'Precio inválido o vacío' }); continue; }
    if (!r.duracion_minutos || isNaN(Number(r.duracion_minutos))) { errors.push({ fila, campo: 'duracion_minutos', error: 'Duración en minutos requerida' }); continue; }
    toCreate.push({ tenantId, name: r.nombre, price: num(r.precio), duration: Math.round(num(r.duracion_minutos)), category: r.categoria || undefined, description: r.descripcion || undefined });
  }

  const result = await prisma.barberService.createMany({ data: toCreate, skipDuplicates: true });
  return { imported: result.count, skipped: rows.length - result.count, errors };
}

async function importProductos(tenantId: number, rows: Record<string, string>[]) {
  const errors: RowError[] = [];
  const toCreate: { tenantId: number; codigo: string; nombre: string; precioVenta: number; costoPromedio: number; stockActual: number; stockMinimo: number; categoriaId?: number; descripcion?: string }[] = [];

  // Mapa nombre→id de categorías existentes
  const cats = await prisma.barberCategoriaProducto.findMany({ where: { tenantId }, select: { id: true, nombre: true } });
  const catMap = new Map(cats.map(c => [c.nombre.toLowerCase(), c.id]));

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]; const fila = i + 2;
    if (!r.codigo) { errors.push({ fila, campo: 'codigo', error: 'Código requerido' }); continue; }
    if (!r.nombre) { errors.push({ fila, campo: 'nombre', error: 'Nombre requerido' }); continue; }
    if (!r.precio_venta || isNaN(Number(r.precio_venta))) { errors.push({ fila, campo: 'precio_venta', error: 'Precio de venta inválido' }); continue; }

    let categoriaId: number | undefined;
    if (r.categoria) {
      const catId = catMap.get(r.categoria.toLowerCase());
      if (!catId) { errors.push({ fila, campo: 'categoria', error: `Categoría "${r.categoria}" no existe — créala primero` }); continue; }
      categoriaId = catId;
    }
    toCreate.push({ tenantId, codigo: r.codigo, nombre: r.nombre, precioVenta: num(r.precio_venta), costoPromedio: num(r.costo), stockActual: num(r.stock_actual), stockMinimo: num(r.stock_minimo), categoriaId, descripcion: r.descripcion || undefined });
  }

  const result = await prisma.barberProducto.createMany({ data: toCreate, skipDuplicates: true });
  return { imported: result.count, skipped: rows.length - result.count, errors };
}

async function importProveedores(tenantId: number, rows: Record<string, string>[]) {
  const errors: RowError[] = [];
  const toCreate: { tenantId: number; nombre: string; telefono?: string; correo?: string; contacto?: string; tipo: string; nit?: string; nrc?: string; direccion?: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]; const fila = i + 2;
    if (!r.nombre) { errors.push({ fila, campo: 'nombre', error: 'Nombre requerido' }); continue; }
    const tipo = r.tipo?.toUpperCase();
    toCreate.push({ tenantId, nombre: r.nombre, telefono: r.telefono || undefined, correo: r.correo || undefined, contacto: r.contacto || undefined, tipo: tipo === 'INTERNACIONAL' ? 'INTERNACIONAL' : 'NACIONAL', nit: r.nit || undefined, nrc: r.nrc || undefined, direccion: r.direccion || undefined });
  }

  const result = await prisma.barberProveedor.createMany({ data: toCreate, skipDuplicates: true });
  return { imported: result.count, skipped: rows.length - result.count, errors };
}

async function importCatProducto(tenantId: number, rows: Record<string, string>[]) {
  const errors: RowError[] = [];
  const toCreate: { tenantId: number; nombre: string; color: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]; const fila = i + 2;
    if (!r.nombre) { errors.push({ fila, campo: 'nombre', error: 'Nombre requerido' }); continue; }
    toCreate.push({ tenantId, nombre: r.nombre, color: r.color || 'blue' });
  }
  const result = await prisma.barberCategoriaProducto.createMany({ data: toCreate, skipDuplicates: true });
  return { imported: result.count, skipped: rows.length - result.count, errors };
}

async function importCatGasto(tenantId: number, rows: Record<string, string>[]) {
  const errors: RowError[] = [];
  const toCreate: { tenantId: number; nombre: string; descripcion?: string; color: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]; const fila = i + 2;
    if (!r.nombre) { errors.push({ fila, campo: 'nombre', error: 'Nombre requerido' }); continue; }
    toCreate.push({ tenantId, nombre: r.nombre, descripcion: r.descripcion || undefined, color: r.color || '#0d9488' });
  }
  const result = await prisma.barberCategoriaGasto.createMany({ data: toCreate, skipDuplicates: true });
  return { imported: result.count, skipped: rows.length - result.count, errors };
}

async function importCatServicio(tenantId: number, rows: Record<string, string>[]) {
  const errors: RowError[] = [];
  const toCreate: { tenantId: number; nombre: string; color: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]; const fila = i + 2;
    if (!r.nombre) { errors.push({ fila, campo: 'nombre', error: 'Nombre requerido' }); continue; }
    toCreate.push({ tenantId, nombre: r.nombre, color: r.color || 'blue' });
  }
  const result = await prisma.barberCategoriaServicio.createMany({ data: toCreate, skipDuplicates: true });
  return { imported: result.count, skipped: rows.length - result.count, errors };
}

// ── handler principal ─────────────────────────────────

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!validateSuperadminKey(req)) return unauthorizedResponse();

  const { id } = await params;
  const tenantId = parseInt(id, 10);
  if (isNaN(tenantId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  // Capa 4 — tamaño máximo del archivo
  const contentLength = Number(req.headers.get('content-length') ?? 0);
  if (contentLength > MAX_FILE_BYTES)
    return NextResponse.json({ error: `El archivo supera el límite de 2 MB. Divide la importación en partes más pequeñas.` }, { status: 413 });

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: 'No se recibió el archivo.' }, { status: 400 });

  const resource = str(formData.get('resource')) as ImportResource;
  const file = formData.get('file') as File | null;

  if (!isValidResource(resource)) return NextResponse.json({ error: `Recurso "${resource}" no reconocido.` }, { status: 400 });
  if (!file) return NextResponse.json({ error: 'No se adjuntó ningún archivo.' }, { status: 400 });

  // Validar tamaño real del archivo
  if (file.size > MAX_FILE_BYTES)
    return NextResponse.json({ error: 'El archivo supera el límite de 2 MB.' }, { status: 413 });

  // Obtener tenant y plan
  const tenant = await prisma.barberTenant.findUnique({ where: { id: tenantId }, select: { id: true, plan: true } });
  if (!tenant) return NextResponse.json({ error: 'Tenant no encontrado.' }, { status: 404 });

  // Capa 5 — límite de 10 importaciones por día
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayCount = await prisma.barberImportLog.count({ where: { tenantId, action: 'import', createdAt: { gte: todayStart } } });
  if (todayCount >= DAILY_IMPORT_LIMIT)
    return NextResponse.json({ error: `Límite diario alcanzado: ya realizaste ${DAILY_IMPORT_LIMIT} importaciones hoy. El contador se reinicia a las 12:00 AM.` }, { status: 429 });

  // Parsear Excel/CSV
  const buffer = Buffer.from(await file.arrayBuffer());
  let rows: Record<string, string>[];
  try {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = normalizeRows(ws);
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el archivo. Asegúrate de subir un .xlsx o .csv válido.' }, { status: 400 });
  }

  // Capa 1 — límite por lote
  const rowLimit = ROW_LIMIT[resource];
  if (rows.length > rowLimit)
    return NextResponse.json({ error: `El archivo contiene ${rows.length} filas pero el límite por importación es ${rowLimit}. Divide el archivo en partes más pequeñas.` }, { status: 400 });

  // Validar columnas requeridas
  const colError = validateColumns(rows, REQUIRED_COLUMNS[resource]);
  if (colError) return NextResponse.json({ error: colError }, { status: 400 });

  // Capa 2 — límite por plan (conteo actual en BD)
  const planLimits = PLAN_LIMIT[tenant.plan] ?? PLAN_LIMIT['ENTERPRISE'];
  const planLimit  = planLimits[resource];
  const countMap: Record<ImportResource, () => Promise<number>> = {
    'clientes':     () => prisma.barberUser.count({ where: { tenantId, role: 'CLIENT' } }),
    'empleados':    () => prisma.barber.count({ where: { tenantId } }),
    'servicios':    () => prisma.barberService.count({ where: { tenantId } }),
    'productos':    () => prisma.barberProducto.count({ where: { tenantId } }),
    'proveedores':  () => prisma.barberProveedor.count({ where: { tenantId } }),
    'cat-producto': () => prisma.barberCategoriaProducto.count({ where: { tenantId } }),
    'cat-gasto':    () => prisma.barberCategoriaGasto.count({ where: { tenantId } }),
    'cat-servicio': () => prisma.barberCategoriaServicio.count({ where: { tenantId } }),
  };
  const current = await countMap[resource]();
  if (current + rows.length > planLimit)
    return NextResponse.json({
      error: `Tu plan ${tenant.plan} permite un máximo de ${planLimit} ${resource}. Ya tienes ${current} y estás intentando agregar ${rows.length}. Elimina registros o actualiza tu plan.`,
    }, { status: 400 });

  // Ejecutar importación
  let result: { imported: number; skipped: number; errors: RowError[] };
  try {
    switch (resource) {
      case 'clientes':     result = await importClientes(tenantId, rows); break;
      case 'empleados':    result = await importEmpleados(tenantId, rows); break;
      case 'servicios':    result = await importServicios(tenantId, rows); break;
      case 'productos':    result = await importProductos(tenantId, rows); break;
      case 'proveedores':  result = await importProveedores(tenantId, rows); break;
      case 'cat-producto': result = await importCatProducto(tenantId, rows); break;
      case 'cat-gasto':    result = await importCatGasto(tenantId, rows); break;
      case 'cat-servicio': result = await importCatServicio(tenantId, rows); break;
    }
  } catch (err) {
    console.error(`[import] error tenantId:${tenantId} resource:${resource}`, err);
    return NextResponse.json({ error: 'Error interno al procesar la importación. Revisa el formato del archivo.' }, { status: 500 });
  }

  // Registrar en log
  await prisma.barberImportLog.create({
    data: { tenantId, resource, action: 'import', rows: rows.length, imported: result.imported, skipped: result.skipped, errors: result.errors },
  });

  const remaining = DAILY_IMPORT_LIMIT - todayCount - 1;
  console.log(`[import] tenant:${tenantId} resource:${resource} rows:${rows.length} imported:${result.imported} skipped:${result.skipped} errors:${result.errors.length} intentos-restantes:${remaining}`);

  return NextResponse.json({
    success: true,
    resource,
    rows:     rows.length,
    imported: result.imported,
    skipped:  result.skipped,
    errors:   result.errors,
    dailyRemaining: remaining,
    message: result.errors.length === 0
      ? `✓ ${result.imported} registros importados correctamente.`
      : `${result.imported} importados, ${result.errors.length} con errores — revisa la tabla de errores.`,
  });
}
