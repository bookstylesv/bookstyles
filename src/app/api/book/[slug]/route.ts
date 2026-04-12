/**
 * GET  /api/book/[slug]  — tenant info, services, barbers (público, sin auth)
 * POST /api/book/[slug]  — crear cita pública (sin auth)
 *
 * SEGURIDAD:
 *  - Rate limiting: máx 5 reservas por teléfono cada 24 h
 *  - Sólo expone campos públicos (nombre, precio, duración)
 *  - Inputs sanitizados y validados antes de tocar la BD
 *  - El cliente invitado SOLO se crea con rol CLIENT — sin acceso al ERP
 *  - Nunca se devuelven tokens ni datos internos del tenant
 *  - CORS manejado por Next.js (same-origin por defecto)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma }      from '@/lib/prisma';
import { addMinutes }  from 'date-fns';

// ── Sanitizar texto libre (evita XSS en notas/nombres) ──
function sanitize(s: string, maxLen = 200): string {
  return s
    .replace(/[<>'"]/g, '')   // strip HTML chars
    .trim()
    .slice(0, maxLen);
}

// ── Validaciones de formato ──────────────────────────────
const DATE_RE  = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE  = /^([01]\d|2[0-3]):[0-5]\d$/;
const PHONE_RE = /^\+?[\d\s\-().]{6,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Rate limit basado en BD (persiste entre instancias serverless) ─
const RL_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 h
const RL_MAX = 5; // máx 5 reservas/teléfono/día

async function checkPhoneRateLimit(tenantId: number, clientPhone: string): Promise<boolean> {
  const since = new Date(Date.now() - RL_WINDOW_MS);

  // Buscar usuario por teléfono en este tenant
  const user = await prisma.barberUser.findFirst({
    where: { tenantId, phone: clientPhone },
    select: { id: true },
  });
  if (!user) return true; // primera reserva de este teléfono → siempre pasa

  const count = await prisma.barberAppointment.count({
    where: { tenantId, clientId: user.id, createdAt: { gte: since } },
  });
  return count < RL_MAX;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

// ── GET — información pública ────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  // Solo slugs válidos (alfanumérico + guiones)
  if (!/^[a-z0-9-]{2,50}$/.test(slug)) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }

  const tenant = await prisma.barberTenant.findUnique({
    where: { slug },
    // Solo campos necesarios para la página pública
    select: { id: true, name: true, slug: true, phone: true, address: true, city: true, logoUrl: true },
  });
  if (!tenant) return NextResponse.json({ error: 'Barbería no encontrada' }, { status: 404 });

  const [services, barbers] = await Promise.all([
    prisma.barberService.findMany({
      where:   { tenantId: tenant.id, active: true },
      select:  { id: true, name: true, description: true, price: true, duration: true, category: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    }),
    prisma.barber.findMany({
      where:   { tenantId: tenant.id, active: true },
      select:  { id: true, specialties: true, user: { select: { fullName: true, avatarUrl: true } } },
      orderBy: { id: 'asc' },
    }),
  ]);

  return NextResponse.json({
    tenant,
    services: services.map(s => ({ ...s, price: Number(s.price) })),
    barbers:  barbers.map(b => ({
      id: b.id, name: b.user.fullName,
      avatarUrl: b.user.avatarUrl, specialties: b.specialties,
    })),
  });
}

// ── POST — crear reserva pública ─────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  // ── 1. Validar slug ────────────────────────────────────
  if (!/^[a-z0-9-]{2,50}$/.test(slug)) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }

  // ── 2. Parsear y validar body ──────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  // serviceIds: array de IDs (multi-select). serviceId es fallback para compatibilidad.
  const rawIds    = Array.isArray(body.serviceIds) ? body.serviceIds : [];
  const primaryId = Number(body.serviceId);
  const serviceIds: number[] = rawIds.length > 0
    ? rawIds.map(Number).filter(n => !isNaN(n) && n > 0)
    : (primaryId > 0 ? [primaryId] : []);

  const barberId    = body.barberId != null ? Number(body.barberId) : null;
  const date        = String(body.date ?? '');
  const time        = String(body.time ?? '');
  const clientName  = sanitize(String(body.clientName  ?? ''), 100);
  const clientPhone = sanitize(String(body.clientPhone ?? ''),  20);
  const clientEmail = body.clientEmail ? sanitize(String(body.clientEmail), 120) : undefined;
  const notes       = body.notes       ? sanitize(String(body.notes), 300) : undefined;

  // Validaciones
  if (serviceIds.length === 0)
    return NextResponse.json({ error: 'serviceId inválido' }, { status: 400 });
  if (!DATE_RE.test(date))
    return NextResponse.json({ error: 'Fecha inválida (YYYY-MM-DD)' }, { status: 400 });
  if (!TIME_RE.test(time))
    return NextResponse.json({ error: 'Hora inválida (HH:MM)' }, { status: 400 });
  if (clientName.length < 2)
    return NextResponse.json({ error: 'Nombre demasiado corto' }, { status: 400 });
  if (!PHONE_RE.test(clientPhone))
    return NextResponse.json({ error: 'Teléfono inválido' }, { status: 400 });
  if (clientEmail && !EMAIL_RE.test(clientEmail))
    return NextResponse.json({ error: 'Correo inválido' }, { status: 400 });

  // No permitir fechas pasadas
  const [y, mo, d] = date.split('-').map(Number);
  const [h, m]     = time.split(':').map(Number);
  const startTime  = new Date(y, mo - 1, d, h, m, 0);
  const now        = new Date();
  now.setMinutes(now.getMinutes() - 5); // 5 min de gracia
  if (startTime < now)
    return NextResponse.json({ error: 'No puedes reservar en una fecha/hora pasada' }, { status: 400 });

  // ── 3. Validar tenant ─────────────────────────────────
  const tenant = await prisma.barberTenant.findUnique({ where: { slug } });
  if (!tenant) return NextResponse.json({ error: 'Barbería no encontrada' }, { status: 404 });

  // ── 4. Rate limiting DB-based (persiste entre cold starts) ──
  if (!(await checkPhoneRateLimit(tenant.id, clientPhone))) {
    return NextResponse.json(
      { error: 'Has alcanzado el límite de reservas por hoy. Contáctanos directamente.' },
      { status: 429 },
    );
  }

  // ── 5. Validar día no cerrado ──────────────────────────
  const dayStart = new Date(y, mo - 1, d, 0, 0, 0);
  const override = await prisma.barberDayOverride.findUnique({
    where: { tenantId_date: { tenantId: tenant.id, date: dayStart } },
  });
  if (override && !override.isOpen) {
    return NextResponse.json({ error: 'La barbería no atiende ese día' }, { status: 409 });
  }

  // ── 6. Validar servicios pertenecen a este tenant ─────
  const services = await prisma.barberService.findMany({
    where: { id: { in: serviceIds }, tenantId: tenant.id, active: true },
    orderBy: { id: 'asc' },
  });
  if (services.length === 0)
    return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });

  // Duración total de todos los servicios
  const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);
  const blockEndTime  = addMinutes(startTime, totalDuration);

  // ── 7. Resolver barbero (usando bloque completo) ───────
  let resolvedBarberId: number;

  if (!barberId) {
    const dayOfWeek  = startTime.getDay();
    const candidates = await prisma.barber.findMany({
      where:   { tenantId: tenant.id, active: true },
      include: {
        schedules:    { where: { dayOfWeek, active: true } },
        appointments: {
          where: {
            startTime: { lt: blockEndTime },
            endTime:   { gt: startTime },
            status:    { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
          },
        },
      },
    });
    const free = candidates.find(b => b.schedules.length > 0 && b.appointments.length === 0);
    if (!free)
      return NextResponse.json({ error: 'No hay barberos disponibles en ese horario' }, { status: 409 });
    resolvedBarberId = free.id;
  } else {
    const barberRecord = await prisma.barber.findFirst({
      where: { id: barberId, tenantId: tenant.id, active: true },
    });
    if (!barberRecord)
      return NextResponse.json({ error: 'Barbero no encontrado' }, { status: 404 });

    const conflict = await prisma.barberAppointment.findFirst({
      where: {
        barberId,
        status:    { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
        startTime: { lt: blockEndTime },
        endTime:   { gt: startTime },
      },
    });
    if (conflict)
      return NextResponse.json({ error: 'El barbero ya tiene una cita en ese horario' }, { status: 409 });
    resolvedBarberId = barberId;
  }

  // ── 8. Buscar o crear cliente (solo rol CLIENT) ────────
  const guestEmail = clientEmail || `${clientPhone.replace(/\D/g, '')}@guest.speeddan.com`;

  let clientUser = await prisma.barberUser.findFirst({
    where: { tenantId: tenant.id, phone: clientPhone },
  }) ?? await prisma.barberUser.findFirst({
    where: { tenantId: tenant.id, email: guestEmail },
  });

  if (!clientUser) {
    const bcrypt    = await import('bcryptjs');
    const randomPwd = await bcrypt.hash(crypto.randomUUID(), 10);
    clientUser = await prisma.barberUser.create({
      data: {
        tenantId: tenant.id,
        email:    guestEmail,
        password: randomPwd,
        fullName: clientName,
        phone:    clientPhone,
        role:     'CLIENT',
        active:   true,
      },
    });
  }

  // ── 9. Crear citas en cadena (una por servicio) ────────
  // Cada cita comienza donde termina la anterior
  const clientIp = getClientIp(req);
  const appointments = [];
  let cursor = startTime;
  for (const svc of services) {
    const svcEnd = addMinutes(cursor, svc.duration);
    // __WEB_IP:x.x.x.x__ permite al owner ver el origen y detectar abuso
    const apptNotes = cursor === startTime
      ? `__WEB_IP:${clientIp}__${notes ?? ''}`
      : `__WEB_IP:${clientIp}__`;
    const appt = await prisma.barberAppointment.create({
      data: {
        tenantId:  tenant.id,
        clientId:  clientUser.id,
        barberId:  resolvedBarberId,
        serviceId: svc.id,
        startTime: cursor,
        endTime:   svcEnd,
        status:    'PENDING',
        notes:     apptNotes,
      },
      include: {
        barber:  { include: { user: { select: { fullName: true } } } },
        service: { select: { name: true, price: true, duration: true } },
      },
    });
    appointments.push(appt);
    cursor = svcEnd;
  }

  const first       = appointments[0];
  const barberName  = first.barber.user.fullName;
  const serviceNames = appointments.map(a => a.service.name).join(', ');

  // ── 10. Construir URL WhatsApp de notificación al negocio ──
  const dtStr = first.startTime.toLocaleDateString('es-SV', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const tmStr = first.startTime.toLocaleTimeString('es-SV', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
  const waText = encodeURIComponent(
    `📅 Nueva reserva web — BookStyle\n` +
    `👤 Cliente: ${clientName} (${clientPhone})\n` +
    `✂️ Servicio: ${serviceNames}\n` +
    `👨 Profesional: ${barberName}\n` +
    `🗓️ ${dtStr} a las ${tmStr}`
  );
  const tenantPhone = tenant.phone?.replace(/\D/g, '') ?? '';
  const waUrl = tenantPhone ? `https://wa.me/${tenantPhone}?text=${waText}` : null;

  return NextResponse.json({
    ok:           true,
    barberName,
    serviceName:  serviceNames,
    startTime:    first.startTime.toISOString(),
    endTime:      appointments[appointments.length - 1].endTime.toISOString(),
    waUrl,
  }, { status: 201 });
}
