/**
 * DashboardSidebar.tsx — Sidebar del dashboard (ARCTIC palette).
 * Diseño premium con deep slate, teal accents y user card.
 * Sin colores hardcodeados. Usa CSS variables del sistema.
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { BarberUserRole } from '@prisma/client';

type NavItem = { href: string; label: string; icon: string; roles: BarberUserRole[] };

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',    label: 'Inicio',        icon: '🏠', roles: ['OWNER', 'BARBER', 'CLIENT'] },
  { href: '/appointments', label: 'Citas',          icon: '📅', roles: ['OWNER', 'BARBER', 'CLIENT'] },
  { href: '/barbers',      label: 'Barberos',       icon: '✂️', roles: ['OWNER'] },
  { href: '/services',     label: 'Servicios',      icon: '💈', roles: ['OWNER'] },
  { href: '/clients',      label: 'Clientes',       icon: '👥', roles: ['OWNER', 'BARBER'] },
  { href: '/billing',      label: 'Caja',           icon: '💳', roles: ['OWNER'] },
  { href: '/reviews',      label: 'Reseñas',        icon: '⭐', roles: ['OWNER', 'BARBER'] },
  { href: '/settings',     label: 'Configuración',  icon: '⚙️', roles: ['OWNER'] },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

type Props = { role: BarberUserRole; slug: string; name: string };

export default function DashboardSidebar({ role, slug, name }: Props) {
  const pathname = usePathname();
  const items    = NAV_ITEMS.filter(i => i.roles.includes(role));
  const initials = getInitials(name || 'User');

  return (
    <aside style={{
      width: 240,
      minHeight: '100vh',
      background: 'hsl(var(--sidebar-bg))',
      borderRight: '1px solid hsl(var(--sidebar-border))',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* ── Logo / Marca ── */}
      <div style={{
        padding: '24px 20px 20px',
        borderBottom: '1px solid hsl(var(--sidebar-border))',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 2,
        }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>✂️</span>
          <span style={{
            color: 'hsl(var(--brand-primary))',
            fontWeight: 700,
            fontSize: 17,
            letterSpacing: '-0.2px',
          }}>
            Speeddan
          </span>
        </div>
        <div style={{
          color: 'hsl(var(--sidebar-muted))',
          fontSize: 11,
          marginTop: 4,
          textTransform: 'uppercase',
          letterSpacing: '0.7px',
          paddingLeft: 30,
        }}>
          {slug}
        </div>
      </div>

      {/* ── Navegación ── */}
      <nav style={{ flex: 1, padding: '12px 0' }}>
        {items.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 20px',
                textDecoration: 'none',
                color: active
                  ? 'hsl(var(--brand-primary))'
                  : 'hsl(var(--sidebar-fg))',
                background: active
                  ? 'hsl(var(--brand-primary) / 0.15)'
                  : 'transparent',
                borderLeft: active
                  ? '3px solid hsl(var(--brand-primary))'
                  : '3px solid transparent',
                fontSize: 13.5,
                fontWeight: active ? 600 : 400,
                transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* ── User Card ── */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid hsl(var(--sidebar-border))',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 12,
        }}>
          {/* Avatar con iniciales */}
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'hsl(var(--brand-primary))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: 13,
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '0.3px',
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              color: 'hsl(var(--sidebar-fg))',
              fontWeight: 700,
              fontSize: 13,
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {name}
            </div>
            <div style={{
              display: 'inline-block',
              marginTop: 3,
              padding: '1px 7px',
              background: 'hsl(var(--sidebar-border))',
              borderRadius: 'var(--radius-full)',
              fontSize: 10,
              fontWeight: 600,
              color: 'hsl(var(--sidebar-muted))',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              {role}
            </div>
          </div>
        </div>

        {/* Logout */}
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '9px',
              background: 'transparent',
              border: '1px solid hsl(var(--sidebar-border))',
              borderRadius: 'var(--radius-md)',
              color: 'hsl(var(--sidebar-muted))',
              fontSize: 12.5,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              transition: 'border-color 0.15s, color 0.15s',
            }}
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
