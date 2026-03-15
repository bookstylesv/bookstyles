/**
 * Dashboard — KPIs en tiempo real obtenidos directamente del servidor.
 * Server Component: no necesita API route.
 * Diseño ARCTIC/PREMIUM con tarjetas KPI degradadas.
 */

import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getStats } from '@/modules/appointments/appointments.service';
import Link from 'next/link';

const KPI_CONFIG = [
  { key: 'citasHoy',        label: 'Citas hoy',        emoji: '📅', gradient: 'var(--gradient-kpi-1)', format: (v: number) => String(v) },
  { key: 'citasPendientes', label: 'Citas pendientes',  emoji: '⏳', gradient: 'var(--gradient-kpi-2)', format: (v: number) => String(v) },
  { key: 'ingresosHoy',     label: 'Ingresos hoy',     emoji: '💰', gradient: 'var(--gradient-kpi-3)', format: (v: number) => `$${v.toFixed(2)}` },
  { key: 'clientesActivos', label: 'Clientes activos',  emoji: '👥', gradient: 'var(--gradient-kpi-4)', format: (v: number) => String(v) },
] as const;

const QUICK_LINKS = [
  { href: '/appointments', label: 'Ver citas de hoy',     icon: '📅' },
  { href: '/services',     label: 'Gestionar servicios',   icon: '💈' },
  { href: '/barbers',      label: 'Ver barberos',          icon: '✂️' },
  { href: '/billing',      label: 'Registrar pago',        icon: '💳' },
];

function getRoleBadgeLabel(role: string): string {
  const map: Record<string, string> = {
    OWNER:  'Propietario',
    BARBER: 'Barbero',
    CLIENT: 'Cliente',
  };
  return map[role] ?? role;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const stats = await getStats(user.tenantId);

  return (
    <div style={{ maxWidth: 1100, width: '100%' }}>

      {/* ── Bienvenida ── */}
      <div style={{
        marginBottom: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div>
          <h1 style={{
            fontSize: 26,
            fontWeight: 800,
            color: 'hsl(var(--text-primary))',
            margin: '0 0 6px',
            letterSpacing: '-0.4px',
          }}>
            Bienvenido, {user.name.split(' ')[0]}
          </h1>
          <p style={{
            color: 'hsl(var(--text-secondary))',
            margin: 0,
            fontSize: 14,
          }}>
            Panel de gestión — {user.slug}
          </p>
        </div>
        {/* Badge de rol */}
        <div style={{
          padding: '6px 14px',
          background: 'hsl(var(--brand-primary))',
          borderRadius: 'var(--radius-full)',
          color: '#ffffff',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.4px',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}>
          {getRoleBadgeLabel(user.role)}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 18,
        marginBottom: 40,
      }}>
        {KPI_CONFIG.map(({ key, label, emoji, gradient, format }) => (
          <div
            key={key}
            style={{
              background: gradient,
              borderRadius: 'var(--radius-xl)',
              padding: '20px 24px',
              minHeight: 120,
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Decorativo de fondo */}
            <div style={{
              position: 'absolute',
              top: -16,
              right: -16,
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.07)',
              pointerEvents: 'none',
            }} />

            {/* Emoji */}
            <span style={{
              fontSize: 28,
              lineHeight: 1,
              display: 'block',
              marginBottom: 12,
              position: 'relative',
              zIndex: 1,
            }}>
              {emoji}
            </span>

            {/* Etiqueta */}
            <p style={{
              fontSize: 10.5,
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.75)',
              textTransform: 'uppercase',
              letterSpacing: '0.7px',
              margin: '0 0 6px',
              position: 'relative',
              zIndex: 1,
            }}>
              {label}
            </p>

            {/* Valor */}
            <p style={{
              fontSize: 32,
              fontWeight: 800,
              color: '#ffffff',
              margin: 0,
              lineHeight: 1,
              letterSpacing: '-0.5px',
              position: 'relative',
              zIndex: 1,
            }}>
              {format(stats[key])}
            </p>
          </div>
        ))}
      </div>

      {/* ── Accesos Rápidos ── */}
      <div>
        <h2 style={{
          fontSize: 16,
          fontWeight: 700,
          color: 'hsl(var(--text-primary))',
          margin: '0 0 16px',
          letterSpacing: '-0.2px',
        }}>
          Accesos rápidos
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 12,
        }}>
          {QUICK_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                background: 'hsl(var(--bg-surface))',
                border: '1px solid hsl(var(--border-default))',
                borderLeft: '4px solid hsl(var(--brand-primary))',
                borderRadius: 'var(--radius-lg)',
                color: 'hsl(var(--text-primary))',
                textDecoration: 'none',
                fontSize: 13.5,
                fontWeight: 500,
                boxShadow: '0 1px 4px rgba(93, 100, 116, 0.06)',
                transition: 'background 0.15s, box-shadow 0.15s, transform 0.1s',
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
