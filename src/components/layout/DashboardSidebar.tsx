'use client';

/**
 * DashboardSidebar — Sidebar profesional con Phosphor Icons + colapso.
 * - Phosphor Icons: Regular/Bold según estado activo
 * - Colapsable: 240px ↔ 64px con transición CSS suave
 * - Estado persistido en localStorage 'sb_collapsed'
 * - Tooltips nativos (title) en modo colapsado
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { BarberUserRole } from '@prisma/client';
import {
  HouseSimple,
  CalendarDots,
  Users,
  Scissors,
  UserCircle,
  CreditCard,
  Star,
  Gear,
  Truck,
  Package,
  ShoppingCart,
  Receipt,
  ClockCountdown,
  Money,
  ArrowLineLeft,
  ArrowLineRight,
  SignOut,
  CashRegister,
  ClockClockwise,
  FileText,
} from '@phosphor-icons/react';

type NavItem = {
  href:  string;
  label: string;
  icon:  React.ElementType;
  roles: BarberUserRole[];
};

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',      label: 'Inicio',          icon: HouseSimple,    roles: ['OWNER', 'BARBER', 'CLIENT'] },
  // ── Operación diaria ──
  { href: '/pos',            label: 'POS',             icon: CashRegister,   roles: ['OWNER', 'BARBER'] },
  { href: '/pos-turnos',     label: 'Turnos de Caja',  icon: ClockClockwise, roles: ['OWNER', 'BARBER'] },
  { href: '/pos-documentos', label: 'Documentos',      icon: FileText,       roles: ['OWNER'] },
  { href: '/appointments',   label: 'Citas',           icon: CalendarDots,   roles: ['OWNER', 'BARBER', 'CLIENT'] },
  { href: '/billing',        label: 'Caja (Citas)',    icon: CreditCard,     roles: ['OWNER'] },
  // ── Catálogos ──
  { href: '/barbers',        label: 'Barberos',        icon: Users,          roles: ['OWNER'] },
  { href: '/services',       label: 'Servicios',       icon: Scissors,       roles: ['OWNER'] },
  { href: '/clients',        label: 'Clientes',        icon: UserCircle,     roles: ['OWNER', 'BARBER'] },
  // ── Administración ──
  { href: '/compras',        label: 'Compras',         icon: ShoppingCart,   roles: ['OWNER'] },
  { href: '/proveedores',    label: 'Proveedores',     icon: Truck,          roles: ['OWNER'] },
  { href: '/inventario',     label: 'Inventario',      icon: Package,        roles: ['OWNER'] },
  { href: '/gastos',         label: 'Gastos',          icon: Receipt,        roles: ['OWNER'] },
  { href: '/cxp',            label: 'Cuentas x Pagar', icon: ClockCountdown, roles: ['OWNER'] },
  { href: '/planilla',       label: 'Planilla',        icon: Money,          roles: ['OWNER'] },
  { href: '/reviews',        label: 'Reseñas',         icon: Star,           roles: ['OWNER', 'BARBER'] },
  { href: '/settings',       label: 'Configuración',   icon: Gear,           roles: ['OWNER'] },
];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

type Props = { role: BarberUserRole; slug: string; name: string };

export default function DashboardSidebar({ role, slug, name }: Props) {
  const pathname = usePathname();
  const items    = NAV_ITEMS.filter(i => i.roles.includes(role));
  const initials = getInitials(name || 'U');

  const [collapsed, setCollapsed] = useState(false);
  const [mounted,   setMounted]   = useState(false);

  useEffect(() => {
    setMounted(true);
    if (localStorage.getItem('sb_collapsed') === 'true') setCollapsed(true);
  }, []);

  function toggle() {
    setCollapsed(prev => {
      localStorage.setItem('sb_collapsed', String(!prev));
      return !prev;
    });
  }

  const W = collapsed ? 64 : 240;

  return (
    <aside style={{
      width:         W,
      minHeight:     '100vh',
      background:    'hsl(var(--sidebar-bg))',
      borderRight:   '1px solid hsl(var(--sidebar-border))',
      display:       'flex',
      flexDirection: 'column',
      flexShrink:    0,
      transition:    mounted ? 'width 0.22s ease' : 'none',
      overflow:      'hidden',
    }}>

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div style={{
        padding:        collapsed ? '20px 0' : '18px 16px',
        borderBottom:   '1px solid hsl(var(--sidebar-border))',
        display:        'flex',
        alignItems:     'center',
        gap:            10,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          background: 'linear-gradient(135deg, hsl(var(--brand-primary)) 0%, hsl(var(--brand-primary-dark)) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Scissors size={17} weight="bold" color="#fff" />
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ color: 'hsl(var(--sidebar-fg))', fontWeight: 700, fontSize: 14.5, letterSpacing: '-0.2px', whiteSpace: 'nowrap' }}>
              Speeddan
            </div>
            <div style={{ color: 'hsl(var(--sidebar-muted))', fontSize: 10, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {slug}
            </div>
          </div>
        )}
      </div>

      {/* ── Navegación ───────────────────────────────────────────────────── */}
      <nav style={{ flex: 1, padding: '8px 0' }}>
        {items.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon   = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className="sidebar-nav-link"
              style={{
                display:        'flex',
                alignItems:     'center',
                gap:            collapsed ? 0 : 10,
                padding:        collapsed ? '12px 0' : '10px 16px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                textDecoration: 'none',
                fontSize:       13.5,
                fontWeight:     active ? 600 : 400,
                color:          active ? 'hsl(var(--brand-primary))' : 'hsl(var(--sidebar-fg))',
                background:     active ? 'hsl(var(--brand-primary) / 0.12)' : 'transparent',
                borderLeft:     active ? '3px solid hsl(var(--brand-primary))' : '3px solid transparent',
                transition:     'background 0.15s, color 0.15s',
                whiteSpace:     'nowrap',
                overflow:       'hidden',
              }}
            >
              <Icon size={18} weight={active ? 'bold' : 'regular'} style={{ flexShrink: 0 }} />
              {!collapsed && (
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Toggle ───────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={toggle}
        title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        className="sidebar-toggle-btn"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', padding: '9px 0', background: 'transparent', border: 'none',
          borderTop: '1px solid hsl(var(--sidebar-border))',
          color: 'hsl(var(--sidebar-muted))', cursor: 'pointer',
          gap: 6, fontSize: 11,
          transition: 'color 0.15s, background 0.15s',
        }}
      >
        {collapsed
          ? <ArrowLineRight size={16} weight="bold" />
          : <><ArrowLineLeft size={15} weight="bold" /><span>Colapsar</span></>
        }
      </button>

      {/* ── User Card ────────────────────────────────────────────────────── */}
      <div style={{
        padding:        collapsed ? '12px 0' : '12px 16px',
        borderTop:      '1px solid hsl(var(--sidebar-border))',
        display:        'flex',
        alignItems:     'center',
        gap:            collapsed ? 0 : 10,
        justifyContent: collapsed ? 'center' : 'flex-start',
        flexDirection:  collapsed ? 'column' : 'row',
      }}>
        <div
          title={collapsed ? name : undefined}
          style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, hsl(var(--brand-primary)) 0%, hsl(var(--brand-primary-dark)) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11.5, fontWeight: 700, color: '#fff', letterSpacing: '0.3px',
          }}
        >
          {initials}
        </div>

        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'hsl(var(--sidebar-fg))', fontWeight: 600, fontSize: 12.5, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {name}
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'hsl(var(--sidebar-muted))', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 1 }}>
              {role}
            </div>
          </div>
        )}

        {/* Logout: icono si está colapsado */}
        {collapsed && (
          <form action="/api/auth/logout" method="post" style={{ marginTop: 4 }}>
            <button type="submit" title="Cerrar sesión" style={{ display: 'flex', background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--sidebar-muted))', padding: 2 }}>
              <SignOut size={16} weight="bold" />
            </button>
          </form>
        )}
      </div>

      {/* Logout: texto si está expandido */}
      {!collapsed && (
        <div style={{ padding: '0 16px 14px' }}>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="sidebar-logout-btn" style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px', background: 'transparent', border: '1px solid hsl(var(--sidebar-border))',
              borderRadius: 7, color: 'hsl(var(--sidebar-muted))', fontSize: 12,
              cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'border-color 0.15s, color 0.15s',
            }}>
              <SignOut size={13} weight="bold" />
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </aside>
  );
}
