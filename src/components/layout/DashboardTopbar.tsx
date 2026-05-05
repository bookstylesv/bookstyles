'use client';

/**
 * DashboardTopbar — Barra superior global del dashboard.
 * Visible en todos los módulos.
 * Contenido: fecha/hora (América Central), negocio, sucursal, turno, usuario, campana.
 */

import { useState, useEffect, useCallback } from 'react';
import { Bell, Buildings, ClockCountdown } from '@phosphor-icons/react';
import { Popover, List, Tag, Typography, Empty } from 'antd';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

// ── Tipos ─────────────────────────────────────────────────────────────────────
type NotifAppointment = {
  id: number;
  startTime: string;
  status: string;
  client:  { fullName: string };
  service: { name: string };
  barber:  { user: { fullName: string } };
};

type BranchOption = { id: number; name: string };

type Props = {
  brandName:       string;
  userName:        string;
  userRole:        string;
  branches:        BranchOption[];
  currentBranchId: number | null;
};

// ── Constantes ────────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  OWNER:      'Propietario',
  SUPERADMIN: 'Administrador',
  GERENTE:    'Gerente',
  USERS:      'Usuario',
  BARBER:     'Barbero',
  CLIENT:     'Cliente',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:     'warning',
  CONFIRMED:   'processing',
  IN_PROGRESS: 'purple',
  NO_SHOW:     'error',
};
const STATUS_LABELS: Record<string, string> = {
  PENDING:     'Pendiente',
  CONFIRMED:   'Confirmada',
  IN_PROGRESS: 'En curso',
  NO_SHOW:     'No asistió',
};

// Zona horaria América Central (El Salvador, UTC-6, sin horario de verano)
const TZ = 'America/El_Salvador';

function getNow() {
  return new Intl.DateTimeFormat('es-SV', {
    timeZone:  TZ,
    weekday:   'long',
    day:       '2-digit',
    month:     'long',
    hour:      '2-digit',
    minute:    '2-digit',
    second:    '2-digit',
    hour12:    false,
  }).format(new Date());
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function DashboardTopbar({
  brandName,
  userName,
  userRole,
  branches,
  currentBranchId,
}: Props) {
  const [dateTime,     setDateTime]     = useState(() => getNow());
  const [count,        setCount]        = useState(0);
  const [appointments, setAppointments] = useState<NotifAppointment[]>([]);
  const [bellOpen,     setBellOpen]     = useState(false);
  const [turnoAbierto, setTurnoAbierto] = useState<boolean | null>(null);

  // Reloj en tiempo real
  useEffect(() => {
    const id = setInterval(() => setDateTime(getNow()), 1000);
    return () => clearInterval(id);
  }, []);

  // Estado del turno de caja
  useEffect(() => {
    fetch('/api/pos/turno')
      .then(r => r.json())
      .then(d => setTurnoAbierto(d.turno != null))
      .catch(() => setTurnoAbierto(null));
  }, []);

  // Notificaciones de citas
  const fetchNotifications = useCallback(async () => {
    try {
      const res  = await fetch('/api/notifications/appointments');
      const json = await res.json();
      if (json.success) {
        setCount(json.data.count);
        setAppointments(json.data.appointments);
      }
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    const initialFetchId = window.setTimeout(() => {
      void fetchNotifications();
    }, 0);
    const handler = () => fetchNotifications();
    window.addEventListener('appointment-mutated', handler);
    return () => {
      window.clearTimeout(initialFetchId);
      window.removeEventListener('appointment-mutated', handler);
    };
  }, [fetchNotifications]);

  // Sucursal activa
  const activeBranch = branches.find(b => b.id === currentBranchId);
  const branchName   = activeBranch?.name ?? (branches.length > 1 ? 'Todas' : null);

  // Contenido del popover de notificaciones
  const bellContent = (
    <div style={{ width: 300 }}>
      {appointments.length === 0 ? (
        <Empty
          description="Sin citas pendientes"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ padding: '12px 0' }}
        />
      ) : (
        <List
          size="small"
          dataSource={appointments}
          style={{ maxHeight: 340, overflowY: 'auto' }}
          renderItem={(appt) => (
            <List.Item style={{ padding: '8px 0' }}>
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <Typography.Text strong style={{ fontSize: 13 }}>
                    {appt.client.fullName}
                  </Typography.Text>
                  <Tag
                    color={STATUS_COLORS[appt.status] ?? 'default'}
                    style={{ marginInlineEnd: 0, fontSize: 10, lineHeight: '16px', padding: '0 5px' }}
                  >
                    {STATUS_LABELS[appt.status] ?? appt.status}
                  </Tag>
                </div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {appt.service.name} · {format(new Date(appt.startTime), 'dd MMM, HH:mm', { locale: es })}
                </Typography.Text>
              </div>
            </List.Item>
          )}
        />
      )}
      <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: 8, marginTop: 4, textAlign: 'center' }}>
        <Link href="/appointments" onClick={() => setBellOpen(false)}>
          <Typography.Text style={{ fontSize: 12, color: 'hsl(var(--brand-primary))' }}>
            Ver todas las citas →
          </Typography.Text>
        </Link>
      </div>
    </div>
  );

  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      gap:            12,
      height:          48,
      padding:        '0 16px',
      marginBottom:    16,
      background:     'hsl(var(--bg-surface))',
      borderRadius:   'var(--radius-lg, 10px)',
      border:         '1px solid hsl(var(--border))',
      overflow:       'visible',
    }}>

      {/* ── IZQUIERDA: Fecha y hora ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexShrink: 0 }}>
        <ClockCountdown size={16} weight="bold" style={{ color: 'hsl(var(--brand-primary))', flexShrink: 0 }} />
        <Typography.Text style={{ fontSize: 12.5, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: 'hsl(var(--text-secondary))' }}>
          {dateTime || '—'}
        </Typography.Text>
      </div>

      {/* ── CENTRO: Negocio + Sucursal + Turno ─────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
        {/* Nombre del negocio */}
        <Typography.Text strong style={{ fontSize: 13, whiteSpace: 'nowrap', color: 'hsl(var(--sidebar-fg))' }}>
          {brandName}
        </Typography.Text>

        {/* Sucursal (solo si hay más de una) */}
        {branchName && (
          <>
            <span style={{ color: 'hsl(var(--text-disabled))', fontSize: 11 }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Buildings size={13} style={{ color: 'hsl(var(--text-muted))' }} />
              <Typography.Text style={{ fontSize: 12, color: 'hsl(var(--text-muted))', whiteSpace: 'nowrap' }}>
                {branchName}
              </Typography.Text>
            </div>
          </>
        )}

        {/* Estado del turno */}
        {turnoAbierto !== null && (
          <>
            <span style={{ color: 'hsl(var(--text-disabled))', fontSize: 11 }}>|</span>
            <Tag
              color={turnoAbierto ? 'success' : 'default'}
              style={{ marginInlineEnd: 0, fontSize: 10.5, fontWeight: 600 }}
            >
              Caja {turnoAbierto ? 'ABIERTA' : 'CERRADA'}
            </Tag>
          </>
        )}
      </div>

      {/* ── DERECHA: Usuario + Campana ──────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        {/* Usuario */}
        <div style={{ textAlign: 'right', lineHeight: 1.3 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'hsl(var(--sidebar-fg))', whiteSpace: 'nowrap' }}>
            {userName}
          </div>
          <div style={{ fontSize: 10, color: 'hsl(var(--sidebar-muted))', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            {ROLE_LABELS[userRole] ?? userRole}
          </div>
        </div>

        {/* Separador */}
        <div style={{ width: 1, height: 28, background: 'hsl(var(--border))' }} />

        {/* Campana */}
        <Popover
          content={bellContent}
          title={
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              Citas pendientes ({count})
            </span>
          }
          trigger="click"
          open={bellOpen}
          onOpenChange={setBellOpen}
          placement="bottomRight"
        >
          <button
            type="button"
            title={`${count} cita${count !== 1 ? 's' : ''} pendiente${count !== 1 ? 's' : ''}`}
            style={{
              position:       'relative',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              width:           44,
              height:          36,
              background:     count > 0 ? 'hsl(var(--brand-primary) / 0.1)' : 'transparent',
              border:         count > 0 ? '1px solid hsl(var(--brand-primary) / 0.3)' : '1px solid hsl(var(--border))',
              borderRadius:    8,
              color:          count > 0 ? 'hsl(var(--brand-primary))' : 'hsl(var(--sidebar-muted))',
              cursor:          'pointer',
              transition:      'all 0.15s',
              flexShrink:      0,
            }}
          >
            <Bell size={18} weight={count > 0 ? 'fill' : 'regular'} />
            {count > 0 && (
              <span style={{
                position:     'absolute',
                top:          -6,
                right:        3,
                background:   '#ef4444',
                color:        '#fff',
                fontSize:     10,
                fontWeight:   700,
                lineHeight:   '15px',
                padding:      '0 5px',
                borderRadius: 20,
                minWidth:     18,
                height:       16,
                textAlign:    'center',
                boxShadow:    '0 0 0 2px hsl(var(--bg-surface))',
              }}>
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>
        </Popover>
      </div>
    </div>
  );
}
