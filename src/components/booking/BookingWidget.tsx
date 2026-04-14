'use client';

/**
 * BookingWidget — Wizard público de reserva de citas.
 * Inspirado en el diseño Qutter (dark barbershop premium),
 * adaptado al color teal de Speeddan.
 * SIN acceso autenticado — solo POST a /api/book/[slug].
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Steps, Button, Row, Col, Typography, Tag, Avatar,
  Form, Input, Spin, Result, Divider, message,
} from 'antd';
import {
  ScissorOutlined, UserOutlined, CalendarOutlined,
  ClockCircleOutlined, CheckCircleFilled, PhoneOutlined,
  EnvironmentOutlined, WhatsAppOutlined, ArrowRightOutlined,
  ArrowLeftOutlined, TeamOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

// ── Paleta ─────────────────────────────────────────────
const C = {
  teal:       '#0d9488',
  tealDark:   '#0f766e',
  tealDeep:   '#0a1f1e',   // header fondo oscuro
  tealOverlay:'rgba(13,148,136,0.12)',
  cardBg:     '#f0fdf9',
  gold:       '#0d9488',   // mismo teal como acento
  cream:      '#f8fffe',
  border:     '#ccf0ec',
  text:       '#1a2e2d',
  textSub:    '#6b8c89',
};

// ── Tipos ───────────────────────────────────────────────
interface Service {
  id: number; name: string; description: string | null;
  price: number; duration: number; category: string | null;
}
interface Barber {
  id: number; name: string; avatarUrl: string | null; specialties: string[];
  branchIds?: number[];
}
interface BranchOption {
  id: number; name: string; slug: string;
  address: string | null; city: string | null; phone: string | null;
  isHeadquarters: boolean;
}
interface TenantInfo {
  name: string; slug: string; phone: string | null;
  address: string | null; city: string | null; logoUrl: string | null;
}

interface Props {
  tenant:          TenantInfo;
  services:        Service[];
  barbers:         Barber[];
  branches?:       BranchOption[];
  initialBranchId?: number | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  cabello:     'Cabello',
  barba:       'Barba',
  combo:       'Combo',
  tratamiento: 'Tratamiento',
};

const DAY_NAMES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MONTH_NAMES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function formatDate(d: Date) {
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12    = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${m.toString().padStart(2,'0')} ${period}`;
}

// Genera los próximos N días hábiles (hoy incluido)
function getNextDays(n: number): Date[] {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ── Sección de encabezado dark ──────────────────────────
function BookingHeader({ tenant }: { tenant: TenantInfo }) {
  return (
    <div style={{
      background:  C.tealDeep,
      padding:     '0 0 0 0',
      position:    'relative',
      overflow:    'hidden',
    }}>
      {/* Decoración de fondo */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-rule='evenodd'%3E%3Cpath d='M30 0c1 0 2 .5 2.5 1.5L35 5h5a3 3 0 013 3v5l3.5 2.5A3 3 0 0148 18v5l3.5 2.5A3 3 0 0153 28v5l-2.5 2A3 3 0 0148 37v5a3 3 0 01-3 3h-5l-2.5 3.5A3 3 0 0135 50h-5l-2.5 3.5A3 3 0 0125 55h-5a3 3 0 01-2.5-1.5L15 50h-5a3 3 0 01-3-3v-5l-3.5-2.5A3 3 0 012 37v-5l-2.5-2A3 3 0 01-2 28v-5l2.5-2.5A3 3 0 012 18v-5a3 3 0 013-3h5l2.5-3.5A3 3 0 0115 5h5l2.5-3.5A3 3 0 0125 0h5z'/%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      {/* Barra superior info */}
      <div style={{
        background: C.teal, padding: '8px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 8, position: 'relative',
      }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {tenant.phone && (
            <span style={{ color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <PhoneOutlined /> {tenant.phone}
            </span>
          )}
          {(tenant.address || tenant.city) && (
            <span style={{ color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <EnvironmentOutlined /> {[tenant.address, tenant.city].filter(Boolean).join(', ')}
            </span>
          )}
        </div>
        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
          <ClockCircleOutlined style={{ marginRight: 4 }} />
          Horario: Lun–Sáb 7:00 AM – 7:00 PM
        </span>
      </div>

      {/* Logo + nombre */}
      <div style={{
        textAlign: 'center', padding: '36px 24px 32px',
        position: 'relative',
      }}>
        {tenant.logoUrl ? (
          <img src={tenant.logoUrl} alt={tenant.name}
            style={{ height: 64, objectFit: 'contain', marginBottom: 12 }} />
        ) : (
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(13,148,136,0.3)', border: '2px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 28, color: '#fff',
          }}>
            <ScissorOutlined />
          </div>
        )}
        <Title level={2} style={{ color: '#fff', margin: 0, letterSpacing: 3, textTransform: 'uppercase' }}>
          {tenant.name}
        </Title>
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, letterSpacing: 2 }}>
          RESERVA TU CITA EN LÍNEA
        </Text>
      </div>
    </div>
  );
}

// ── Componente principal ────────────────────────────────
export default function BookingWidget({ tenant, services, barbers, branches = [], initialBranchId }: Props) {
  const hasMultiBranch = branches.length > 1;

  // step -1 = selector de sucursal (solo si hay >1 sucursal y no viene pre-seleccionada)
  const startStep = hasMultiBranch && !initialBranchId ? -1 : 0;

  const [step, setStep]               = useState(startStep);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(initialBranchId ?? null);
  const [service, setService]         = useState<Service | null>(null);
  const [barber, setBarber]           = useState<Barber | null | 'any'>('any');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [slots, setSlots]             = useState<Array<{ time: string; available: boolean }>>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [confirmed, setConfirmed]     = useState<{
    barberName: string; startTime: string;
  } | null>(null);
  const [msgApi, ctxHolder] = message.useMessage();

  const days = getNextDays(14);

  // Barberos filtrados por sucursal seleccionada
  const visibleBarbers = selectedBranchId
    ? barbers.filter(b => !b.branchIds || b.branchIds.length === 0 || b.branchIds.includes(selectedBranchId))
    : barbers;

  const activeBranch = branches.find(b => b.id === selectedBranchId) ?? null;

  // Cargar slots al cambiar fecha/barbero
  const loadSlots = useCallback(async () => {
    if (!selectedDate || !service) return;
    setLoadingSlots(true);
    setSlots([]);
    setSelectedTime(null);
    try {
      const params = new URLSearchParams({
        date:      toDateStr(selectedDate),
        serviceId: String(service.id),
      });
      if (barber && barber !== 'any') params.set('barberId', String(barber.id));
      const res  = await fetch(`/api/book/${tenant.slug}/slots?${params}`);
      const data = await res.json() as { slots: Array<{ time: string; available: boolean }>; isOpen: boolean; reason?: string };
      if (!data.isOpen) {
        msgApi.warning(data.reason ? `Día no disponible: ${data.reason}` : 'La barbería no atiende ese día');
        setSlots([]);
      } else {
        setSlots(data.slots ?? []);
      }
    } catch {
      msgApi.error('Error al cargar horarios');
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedDate, service, barber, tenant.slug, msgApi]);

  useEffect(() => {
    if (step === 2 && selectedDate) loadSlots();
  }, [step, selectedDate, loadSlots]);

  // Agrupar servicios por categoría
  const categories = [...new Set(services.map(s => s.category ?? 'otro'))];

  // ── Submit ─────────────────────────────────────────────
  async function handleSubmit(values: { name: string; phone: string; email?: string; notes?: string }) {
    if (!service || !selectedDate || !selectedTime) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/book/${tenant.slug}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId:   service.id,
          barberId:    barber === 'any' ? null : barber?.id ?? null,
          date:        toDateStr(selectedDate),
          time:        selectedTime,
          clientName:  values.name.trim(),
          clientPhone: values.phone.trim(),
          clientEmail: values.email?.trim() || undefined,
          notes:       values.notes?.trim() || undefined,
          branchId:    selectedBranchId ?? undefined,
        }),
      });
      const data = await res.json() as { ok: boolean; barberName?: string; startTime?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Error al crear la cita');
      setConfirmed({ barberName: data.barberName!, startTime: data.startTime! });
      setStep(4);
    } catch (e: unknown) {
      msgApi.error(e instanceof Error ? e.message : 'Error al reservar');
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setStep(startStep); setService(null); setBarber('any');
    setSelectedDate(null); setSelectedTime(null);
    setSlots([]); setConfirmed(null);
    if (!initialBranchId) setSelectedBranchId(null);
  }

  // ── Pantalla confirmación ──────────────────────────────
  if (step === 4 && confirmed) {
    const apptDate = new Date(confirmed.startTime);
    const waText = encodeURIComponent(
      `✅ Cita confirmada en ${tenant.name}\n` +
      `💈 Servicio: ${service?.name}\n` +
      `👤 Barbero: ${confirmed.barberName}\n` +
      `📅 ${formatDate(apptDate)} a las ${formatTime(selectedTime!)}\n\n` +
      `Reservado en: ${window.location.href}`
    );

    return (
      <>
        {ctxHolder}
        <BookingHeader tenant={tenant} />
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px 24px' }}>
          <div style={{
            background: '#fff', borderRadius: 16,
            boxShadow: '0 8px 40px rgba(13,148,136,0.12)',
            padding: '48px 36px', textAlign: 'center',
          }}>
            <CheckCircleFilled style={{ fontSize: 72, color: C.teal, marginBottom: 20 }} />
            <Title level={2} style={{ color: C.tealDeep, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2 }}>
              ¡Cita Confirmada!
            </Title>
            <Text style={{ color: C.textSub, fontSize: 14 }}>
              Te esperamos en {tenant.name}
            </Text>

            <Divider />

            <div style={{
              background: C.cardBg, borderRadius: 12,
              padding: '24px 20px', textAlign: 'left', marginBottom: 24,
            }}>
              {[
                { icon: <ScissorOutlined />,       label: 'Servicio',  val: service?.name },
                { icon: <CalendarOutlined />,      label: 'Fecha',     val: formatDate(apptDate) },
                { icon: <ClockCircleOutlined />,   label: 'Hora',      val: formatTime(selectedTime!) },
                { icon: <UserOutlined />,          label: 'Barbero',   val: confirmed.barberName },
                { icon: null,                      label: 'Precio',    val: `$${service?.price.toFixed(2)}` },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0',
                  borderBottom: i < 4 ? `1px solid ${C.border}` : 'none',
                }}>
                  <div style={{ width: 32, color: C.teal, fontSize: 16 }}>{item.icon}</div>
                  <div>
                    <div style={{ fontSize: 11, color: C.textSub, textTransform: 'uppercase', letterSpacing: 1 }}>{item.label}</div>
                    <div style={{ fontWeight: 600, color: C.text, fontSize: 15 }}>{item.val}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tenant.phone && (
                <a
                  href={`https://wa.me/${tenant.phone.replace(/\D/g,'')}?text=${waText}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: '#25D366', color: '#fff', padding: '14px 24px',
                    borderRadius: 0, fontWeight: 700, letterSpacing: 2,
                    textDecoration: 'none', textTransform: 'uppercase', fontSize: 13,
                  }}
                >
                  <WhatsAppOutlined style={{ fontSize: 18 }} /> Compartir por WhatsApp
                </a>
              )}
              <Button
                block size="large"
                onClick={reset}
                style={{
                  background: C.teal, color: '#fff', border: 'none',
                  borderRadius: 0, height: 52, fontWeight: 700,
                  letterSpacing: 2, textTransform: 'uppercase', fontSize: 13,
                }}
              >
                Reservar otra cita <ArrowRightOutlined />
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Wizard ─────────────────────────────────────────────
  const canNext = step === -1
    ? !!selectedBranchId
    : ([
        !!service,
        barber !== undefined,
        !!selectedDate && !!selectedTime && slots.some(s => s.time === selectedTime && s.available),
        true,
      ][step] ?? false);

  // Si estamos en el paso de selección de sucursal, mostrar pantalla especial
  if (step === -1) {
    return (
      <>
        {ctxHolder}
        <BookingHeader tenant={tenant} />
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 16px 80px' }}>
          <SectionTitle>¿En qué sucursal deseas tu cita?</SectionTitle>
          <Row gutter={[16, 16]}>
            {branches.map(branch => {
              const isSelected = selectedBranchId === branch.id;
              return (
                <Col key={branch.id} xs={24} sm={12} md={8}>
                  <button
                    onClick={() => {
                      setSelectedBranchId(branch.id);
                      setStep(0);
                    }}
                    style={{
                      width: '100%', textAlign: 'left', cursor: 'pointer',
                      background: isSelected ? C.tealOverlay : '#fff',
                      border: `2px solid ${isSelected ? C.teal : C.border}`,
                      borderRadius: 0, padding: '20px 18px',
                      transition: 'all .2s',
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: 15, color: C.tealDeep, marginBottom: 4 }}>
                      {branch.name}
                      {branch.isHeadquarters && (
                        <span style={{ marginLeft: 8, fontSize: 10, background: C.teal, color: '#fff', padding: '1px 6px', borderRadius: 0, verticalAlign: 'middle', letterSpacing: 1 }}>
                          PRINCIPAL
                        </span>
                      )}
                    </div>
                    {branch.city && (
                      <div style={{ fontSize: 12, color: C.textSub, marginBottom: 2 }}>
                        <EnvironmentOutlined style={{ marginRight: 4 }} />
                        {[branch.address, branch.city].filter(Boolean).join(', ')}
                      </div>
                    )}
                    {branch.phone && (
                      <div style={{ fontSize: 12, color: C.textSub }}>
                        <PhoneOutlined style={{ marginRight: 4 }} />
                        {branch.phone}
                      </div>
                    )}
                  </button>
                </Col>
              );
            })}
          </Row>
        </div>
      </>
    );
  }

  return (
    <>
      {ctxHolder}
      <BookingHeader tenant={tenant} />

      {/* Steps indicator */}
      <div style={{ background: '#fff', borderBottom: `2px solid ${C.border}`, padding: '20px 24px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          {/* Sucursal activa (cuando hay multi-branch) */}
          {hasMultiBranch && activeBranch && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12,
              background: C.tealOverlay, padding: '4px 12px', fontSize: 12, color: C.teal, fontWeight: 600,
            }}>
              <EnvironmentOutlined />
              {activeBranch.name}
              <button
                onClick={() => { setStep(-1); setSelectedBranchId(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.teal, fontSize: 11, padding: 0, marginLeft: 4, textDecoration: 'underline' }}
              >
                cambiar
              </button>
            </div>
          )}
          <Steps
            current={step}
            size="small"
            items={[
              { title: 'Servicio', icon: <ScissorOutlined /> },
              { title: 'Barbero',  icon: <TeamOutlined /> },
              { title: 'Fecha y hora', icon: <CalendarOutlined /> },
              { title: 'Mis datos', icon: <UserOutlined /> },
            ]}
            style={{ '--ant-color-primary': C.teal } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Contenido del paso */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px 80px' }}>

        {/* ── PASO 0: Servicio ── */}
        {step === 0 && (
          <div>
            <SectionTitle>¿Qué servicio deseas?</SectionTitle>
            {categories.map(cat => (
              <div key={cat} style={{ marginBottom: 32 }}>
                <Text style={{
                  display: 'block', fontSize: 11, fontWeight: 700,
                  letterSpacing: 3, color: C.textSub, textTransform: 'uppercase',
                  marginBottom: 16, borderLeft: `3px solid ${C.teal}`, paddingLeft: 10,
                }}>
                  {CATEGORY_LABELS[cat] ?? cat}
                </Text>
                <Row gutter={[16, 16]}>
                  {services.filter(s => (s.category ?? 'otro') === cat).map(s => (
                    <Col key={s.id} xs={24} sm={12} md={8}>
                      <ServiceCard
                        service={s}
                        selected={service?.id === s.id}
                        onClick={() => setService(s)}
                      />
                    </Col>
                  ))}
                </Row>
              </div>
            ))}
          </div>
        )}

        {/* ── PASO 1: Barbero ── */}
        {step === 1 && (
          <div>
            <SectionTitle>¿Con quién deseas tu cita?</SectionTitle>
            <Row gutter={[16, 16]}>
              {/* Cualquier barbero */}
              <Col xs={24} sm={12} md={8}>
                <BarberCard
                  name="Cualquier disponible"
                  subtitle="Te asignamos el barbero libre"
                  avatarUrl={null}
                  icon={<TeamOutlined style={{ fontSize: 28 }} />}
                  selected={barber === 'any'}
                  onClick={() => setBarber('any')}
                />
              </Col>
              {visibleBarbers.map(b => (
                <Col key={b.id} xs={24} sm={12} md={8}>
                  <BarberCard
                    name={b.name}
                    subtitle={b.specialties.slice(0,2).join(' · ') || 'Barbero profesional'}
                    avatarUrl={b.avatarUrl}
                    selected={barber !== 'any' && (barber as Barber)?.id === b.id}
                    onClick={() => setBarber(b)}
                  />
                </Col>
              ))}
            </Row>
          </div>
        )}

        {/* ── PASO 2: Fecha y hora ── */}
        {step === 2 && (
          <div>
            <SectionTitle>Elige fecha y hora</SectionTitle>

            {/* Selector de fecha */}
            <div style={{ marginBottom: 28 }}>
              <Text style={{
                fontSize: 11, fontWeight: 700, letterSpacing: 3,
                color: C.textSub, textTransform: 'uppercase',
                display: 'block', marginBottom: 12,
              }}>
                Fecha
              </Text>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
                {days.map((day, i) => {
                  const isSelected = selectedDate && toDateStr(day) === toDateStr(selectedDate);
                  const isToday    = i === 0;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(day)}
                      style={{
                        minWidth: 72, padding: '12px 8px',
                        background:    isSelected ? C.teal : '#fff',
                        color:         isSelected ? '#fff' : C.text,
                        border:        `2px solid ${isSelected ? C.teal : C.border}`,
                        borderRadius:  0,
                        cursor:        'pointer',
                        textAlign:     'center',
                        flexShrink:    0,
                        transition:    'all .2s',
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', opacity: .7 }}>
                        {DAY_NAMES[day.getDay()].slice(0,3)}
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>
                        {day.getDate()}
                      </div>
                      <div style={{ fontSize: 10, opacity: .7 }}>
                        {isToday ? 'HOY' : MONTH_NAMES[day.getMonth()].slice(0,3).toUpperCase()}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slots de hora */}
            {selectedDate && (
              <div>
                <Text style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: 3,
                  color: C.textSub, textTransform: 'uppercase',
                  display: 'block', marginBottom: 12,
                }}>
                  Horarios disponibles — {formatDate(selectedDate)}
                </Text>
                {loadingSlots ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <Spin size="large" />
                    <div style={{ marginTop: 12, color: C.textSub }}>Verificando disponibilidad...</div>
                  </div>
                ) : slots.length === 0 ? (
                  <div style={{
                    textAlign: 'center', padding: '40px 24px',
                    background: '#fff', border: `2px dashed ${C.border}`,
                  }}>
                    <ClockCircleOutlined style={{ fontSize: 40, color: C.border, marginBottom: 12 }} />
                    <div style={{ color: C.textSub }}>No hay horarios disponibles para este día</div>
                    <div style={{ color: C.textSub, fontSize: 12 }}>Prueba con otra fecha</div>
                  </div>
                ) : (
                  <>
                    {/* Leyenda */}
                    <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.textSub }}>
                        <span style={{ width: 14, height: 14, background: C.teal, display: 'inline-block' }} />
                        Disponible
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.textSub }}>
                        <span style={{ width: 14, height: 14, background: '#f0f0f0', border: '1px solid #d9d9d9', display: 'inline-block' }} />
                        Ocupado
                      </span>
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                      gap: 10,
                    }}>
                      {slots.map(slot => {
                        const isSelected  = slot.time === selectedTime;
                        const isAvailable = slot.available;
                        return (
                          <button
                            key={slot.time}
                            onClick={() => isAvailable && setSelectedTime(slot.time)}
                            disabled={!isAvailable}
                            title={!isAvailable ? 'Horario ocupado' : undefined}
                            style={{
                              padding:      '12px 8px',
                              background:   isSelected ? C.teal : isAvailable ? '#fff' : '#f5f5f5',
                              color:        isSelected ? '#fff' : isAvailable ? C.text : '#bfbfbf',
                              border:       `2px solid ${isSelected ? C.teal : isAvailable ? C.border : '#e8e8e8'}`,
                              borderRadius: 0,
                              cursor:       isAvailable ? 'pointer' : 'not-allowed',
                              fontWeight:   700,
                              fontSize:     14,
                              transition:   'all .15s',
                              position:     'relative',
                              textDecoration: !isAvailable ? 'line-through' : 'none',
                              opacity:      isAvailable ? 1 : 0.6,
                            }}
                          >
                            {formatTime(slot.time)}
                            {!isAvailable && (
                              <div style={{
                                position: 'absolute', bottom: 3, left: 0, right: 0,
                                fontSize: 9, color: '#bfbfbf', letterSpacing: 0.5,
                                textDecoration: 'none',
                              }}>
                                OCUPADO
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── PASO 3: Datos personales ── */}
        {step === 3 && (
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <SectionTitle>Tus datos de contacto</SectionTitle>

            {/* Resumen */}
            <div style={{
              background: C.cardBg, border: `1px solid ${C.border}`,
              padding: '16px 20px', marginBottom: 28,
              display: 'flex', flexWrap: 'wrap', gap: 16,
            }}>
              <div>
                <Text style={{ fontSize: 10, letterSpacing: 2, color: C.textSub, textTransform: 'uppercase' }}>Servicio</Text>
                <div style={{ fontWeight: 700, color: C.text }}>{service?.name}</div>
              </div>
              <div>
                <Text style={{ fontSize: 10, letterSpacing: 2, color: C.textSub, textTransform: 'uppercase' }}>Barbero</Text>
                <div style={{ fontWeight: 700, color: C.text }}>
                  {barber === 'any' ? 'Cualquier disponible' : (barber as Barber)?.name}
                </div>
              </div>
              <div>
                <Text style={{ fontSize: 10, letterSpacing: 2, color: C.textSub, textTransform: 'uppercase' }}>Fecha y hora</Text>
                <div style={{ fontWeight: 700, color: C.text }}>
                  {selectedDate && formatDate(selectedDate)} · {selectedTime && formatTime(selectedTime)}
                </div>
              </div>
              <div>
                <Text style={{ fontSize: 10, letterSpacing: 2, color: C.textSub, textTransform: 'uppercase' }}>Precio</Text>
                <div style={{ fontWeight: 700, color: C.teal, fontSize: 18 }}>${service?.price.toFixed(2)}</div>
              </div>
            </div>

            <Form layout="vertical" onFinish={handleSubmit} size="large">
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Tu nombre completo" name="name"
                    rules={[{ required: true, message: 'Ingresa tu nombre' }, { min: 2, message: 'Mínimo 2 caracteres' }]}>
                    <Input
                      prefix={<UserOutlined style={{ color: C.textSub }} />}
                      placeholder="Ej. Juan García"
                      style={{ borderRadius: 0 }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Teléfono / WhatsApp" name="phone"
                    rules={[
                      { required: true, message: 'Ingresa tu teléfono' },
                      { pattern: /^\+?[\d\s\-()]{7,15}$/, message: 'Teléfono no válido' },
                    ]}>
                    <Input
                      prefix={<PhoneOutlined style={{ color: C.textSub }} />}
                      placeholder="Ej. 7890-1234"
                      style={{ borderRadius: 0 }}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="Correo electrónico (opcional)" name="email"
                rules={[{ type: 'email', message: 'Correo no válido' }]}>
                <Input
                  placeholder="tucorreo@ejemplo.com"
                  style={{ borderRadius: 0 }}
                />
              </Form.Item>
              <Form.Item label="Notas adicionales (opcional)" name="notes">
                <Input.TextArea
                  placeholder="Ej. Quiero que me dejen el flequillo largo..."
                  rows={3}
                  style={{ borderRadius: 0 }}
                  maxLength={300}
                  showCount
                />
              </Form.Item>

              {/* Aviso de privacidad */}
              <Paragraph style={{ fontSize: 12, color: C.textSub, marginBottom: 20 }}>
                Tu información solo se usará para confirmar y gestionar tu cita.
                No compartimos tus datos con terceros.
              </Paragraph>

              <Button
                type="primary"
                htmlType="submit"
                block
                loading={submitting}
                style={{
                  height: 56, borderRadius: 0, background: C.teal,
                  fontWeight: 800, fontSize: 14, letterSpacing: 3,
                  textTransform: 'uppercase', border: 'none',
                }}
              >
                Confirmar cita <ArrowRightOutlined />
              </Button>
            </Form>
          </div>
        )}

        {/* ── Navegación ── */}
        {step < 4 && (
          <div style={{
            position:   'fixed', bottom: 0, left: 0, right: 0,
            background: '#fff', borderTop: `2px solid ${C.border}`,
            padding:    '16px 24px',
            display:    'flex', justifyContent: 'space-between', alignItems: 'center',
            zIndex:     100, boxShadow: '0 -4px 20px rgba(0,0,0,.08)',
          }}>
            <Button
              onClick={() => {
                if (step === 0 && hasMultiBranch && !initialBranchId) {
                  setStep(-1);
                } else {
                  setStep(s => s - 1);
                }
              }}
              disabled={step === 0 && (!hasMultiBranch || !!initialBranchId)}
              size="large"
              style={{
                borderRadius: 0, fontWeight: 700, letterSpacing: 2,
                textTransform: 'uppercase', fontSize: 12,
                borderColor: (step === 0 && (!hasMultiBranch || !!initialBranchId)) ? '#d9d9d9' : C.teal,
                color:        (step === 0 && (!hasMultiBranch || !!initialBranchId)) ? '#d9d9d9' : C.teal,
              }}
            >
              <ArrowLeftOutlined /> Anterior
            </Button>

            {/* Indicador central */}
            {step === 2 && selectedTime && (
              <Tag color="cyan" style={{ fontSize: 13, padding: '4px 12px', borderRadius: 0 }}>
                {selectedDate && `${selectedDate.getDate()}/${selectedDate.getMonth()+1}`} · {formatTime(selectedTime)}
              </Tag>
            )}
            {step < 3 && (
              <Button
                type="primary"
                onClick={() => setStep(s => s + 1)}
                disabled={!canNext}
                size="large"
                style={{
                  borderRadius: 0, background: canNext ? C.teal : undefined,
                  fontWeight: 700, letterSpacing: 2,
                  textTransform: 'uppercase', fontSize: 12, border: 'none',
                }}
              >
                {step === 2 ? 'Mis datos' : 'Siguiente'} <ArrowRightOutlined />
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── Sub-componentes ─────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{
        margin: 0, fontSize: 22, fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: 3, color: C.tealDeep,
      }}>
        {children}
      </h2>
      <div style={{ width: 48, height: 3, background: C.teal, marginTop: 8 }} />
    </div>
  );
}

function ServiceCard({ service, selected, onClick }: {
  service: Service; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width:      '100%',
        background: selected ? C.teal : '#fff',
        border:     `2px solid ${selected ? C.teal : C.border}`,
        borderRadius: 0,
        padding:    '24px 20px',
        textAlign:  'center',
        cursor:     'pointer',
        transition: 'all .2s',
        position:   'relative',
        overflow:   'hidden',
      }}
    >
      {selected && (
        <CheckCircleFilled style={{
          position: 'absolute', top: 10, right: 10,
          color: '#fff', fontSize: 18,
        }} />
      )}
      <ScissorOutlined style={{
        fontSize: 36, color: selected ? 'rgba(255,255,255,0.8)' : C.teal,
        display: 'block', marginBottom: 12,
      }} />
      <div style={{
        fontWeight: 800, fontSize: 15,
        color: selected ? '#fff' : C.tealDeep,
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6,
      }}>
        {service.name}
      </div>
      {service.description && (
        <div style={{
          fontSize: 12, color: selected ? 'rgba(255,255,255,0.7)' : C.textSub,
          marginBottom: 12, lineHeight: 1.5,
        }}>
          {service.description}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, alignItems: 'center' }}>
        <span style={{
          fontSize: 22, fontWeight: 800,
          color: selected ? '#fff' : C.teal,
        }}>
          ${service.price.toFixed(2)}
        </span>
        <span style={{
          fontSize: 12, color: selected ? 'rgba(255,255,255,0.6)' : C.textSub,
        }}>
          <ClockCircleOutlined style={{ marginRight: 3 }} />{service.duration} min
        </span>
      </div>
    </button>
  );
}

function BarberCard({ name, subtitle, avatarUrl, icon, selected, onClick }: {
  name: string; subtitle: string;
  avatarUrl?: string | null; icon?: React.ReactNode;
  selected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width:      '100%',
        background: selected ? C.teal : '#fff',
        border:     `2px solid ${selected ? C.teal : C.border}`,
        borderRadius: 0, padding: '28px 20px',
        textAlign:  'center', cursor: 'pointer',
        transition: 'all .2s', position: 'relative',
      }}
    >
      {selected && (
        <CheckCircleFilled style={{
          position: 'absolute', top: 10, right: 10,
          color: '#fff', fontSize: 18,
        }} />
      )}
      <div style={{ marginBottom: 14 }}>
        {avatarUrl ? (
          <Avatar src={avatarUrl} size={72}
            style={{ border: `3px solid ${selected ? 'rgba(255,255,255,0.4)' : C.teal}` }} />
        ) : (
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: selected ? 'rgba(255,255,255,0.2)' : C.cardBg,
            border:     `3px solid ${selected ? 'rgba(255,255,255,0.4)' : C.teal}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto', color: selected ? '#fff' : C.teal,
          }}>
            {icon ?? <UserOutlined style={{ fontSize: 28 }} />}
          </div>
        )}
      </div>
      <div style={{
        fontWeight: 800, fontSize: 15, letterSpacing: 1,
        textTransform: 'uppercase', color: selected ? '#fff' : C.tealDeep,
        marginBottom: 6,
      }}>
        {name}
      </div>
      <div style={{ fontSize: 12, color: selected ? 'rgba(255,255,255,0.7)' : C.textSub }}>
        {subtitle}
      </div>
    </button>
  );
}
