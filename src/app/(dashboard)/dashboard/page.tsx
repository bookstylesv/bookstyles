/**
 * Dashboard — KPIs en tiempo real obtenidos directamente del servidor.
 * Server Component: no necesita API route.
 */

import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getStats } from '@/modules/appointments/appointments.service';

const KPI_CONFIG = [
  { key: 'citasHoy',       label: 'Citas hoy',        format: (v: number) => String(v) },
  { key: 'citasPendientes',label: 'Citas pendientes',  format: (v: number) => String(v) },
  { key: 'ingresosHoy',    label: 'Ingresos hoy',      format: (v: number) => `$${v.toFixed(2)}` },
  { key: 'clientesActivos',label: 'Clientes activos',  format: (v: number) => String(v) },
] as const;

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const stats = await getStats(user.tenantId);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'hsl(var(--text-primary))', margin: '0 0 4px' }}>
        Bienvenido
      </h1>
      <p style={{ color: 'hsl(var(--text-secondary))', margin: '0 0 32px', fontSize: 14 }}>
        Panel de gestión — {user.slug}
      </p>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {KPI_CONFIG.map(({ key, label, format }) => (
          <div key={key} style={{
            background: 'hsl(var(--bg-surface))',
            border: '1px solid hsl(var(--border-default))',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <p style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'hsl(var(--text-muted))',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              margin: '0 0 8px',
            }}>
              {label}
            </p>
            <p style={{ fontSize: 28, fontWeight: 700, color: 'hsl(var(--text-primary))', margin: 0 }}>
              {format(stats[key])}
            </p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'hsl(var(--text-primary))', margin: '0 0 12px' }}>
          Accesos rápidos
        </h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { href: '/appointments', label: 'Ver citas de hoy' },
            { href: '/services',     label: 'Gestionar servicios' },
            { href: '/barbers',      label: 'Ver barberos' },
          ].map(link => (
            <a key={link.href} href={link.href} style={{
              padding: '8px 16px',
              background: 'hsl(var(--bg-surface))',
              border: '1px solid hsl(var(--border-default))',
              borderRadius: 'var(--radius-md)',
              color: 'hsl(var(--text-primary))',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 500,
              transition: 'background 0.15s',
            }}>
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
