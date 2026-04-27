'use client';

/**
 * DashboardSidebar — Sidebar profesional con Phosphor Icons + colapso.
 * - Phosphor Icons: Regular/Bold según estado activo
 * - Colapsable: 240px ↔ 64px con transición CSS suave
 * - Estado persistido en localStorage 'sb_effectiveCollapsed'
 * - Tooltips nativos (title) en modo colapsado
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { BarberUserRole } from '@prisma/client';
import {
  HouseSimple,
  CalendarDots,
  CalendarHeart,
  Users,
  UsersThree,
  Scissors,
  Sparkle,
  Flower,
  UserCircle,
  CreditCard,
  Star,
  Heart,
  Gear,
  Truck,
  Package,
  Stack,
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
  PaintBrush,
  Buildings,
  CaretDown,
  CaretUp,
  CheckCircle,
  UserGear,
} from '@phosphor-icons/react';
import ThemeSelector from '@/components/shared/ThemeSelector';
import { useBarberTheme } from '@/context/ThemeContext';

type NavItem = {
  href:   string;
  label:  string;
  icon:   React.ElementType;
  roles:  BarberUserRole[];
  module?: string; // módulo requerido; si es undefined el item siempre es visible
};

const NAV_ITEMS_BARBER: NavItem[] = [
  { href: '/dashboard',      label: 'Inicio',           icon: HouseSimple,    roles: ['OWNER', 'BARBER', 'CLIENT'] },
  { href: '/pos',            label: 'POS',              icon: CashRegister,   roles: ['OWNER', 'ADMIN', 'GERENTE', 'BARBER'],          module: 'pos' },
  { href: '/pos-turnos',     label: 'Turnos de Caja',   icon: ClockClockwise, roles: ['OWNER', 'ADMIN', 'GERENTE', 'BARBER'],          module: 'pos' },
  { href: '/pos-documentos', label: 'Documentos',       icon: FileText,       roles: ['OWNER', 'ADMIN'],           module: 'billing_dte' },
  { href: '/appointments',   label: 'Citas',            icon: CalendarDots,   roles: ['OWNER', 'ADMIN', 'GERENTE', 'BARBER', 'CLIENT'],module: 'appointments' },
  { href: '/billing',        label: 'Caja (Citas)',     icon: CreditCard,     roles: ['OWNER', 'ADMIN', 'GERENTE'],module: 'appointments' },
  { href: '/loyalty',        label: 'Puntos y Tarjetas',icon: Star,           roles: ['OWNER', 'ADMIN'],           module: 'loyalty' },
  { href: '/barbers',        label: 'Barberos',         icon: Users,          roles: ['OWNER', 'ADMIN', 'GERENTE'] },
  { href: '/usuarios',       label: 'Usuarios y Roles', icon: UserGear,       roles: ['OWNER', 'ADMIN', 'IT'] },
  { href: '/services',       label: 'Servicios',        icon: Scissors,       roles: ['OWNER', 'ADMIN', 'GERENTE'] },
  { href: '/clients',        label: 'Clientes',         icon: UserCircle,     roles: ['OWNER', 'ADMIN', 'BARBER', 'GERENTE'], module: 'clients' },
  { href: '/compras',        label: 'Compras',          icon: ShoppingCart,   roles: ['OWNER'],                    module: 'products' },
  { href: '/proveedores',    label: 'Proveedores',      icon: Truck,          roles: ['OWNER'],                    module: 'products' },
  { href: '/productos',      label: 'Productos',        icon: Package,        roles: ['OWNER'],                    module: 'products' },
  { href: '/inventario',     label: 'Inventario',       icon: Stack,          roles: ['OWNER'],                    module: 'products' },
  { href: '/gastos',         label: 'Gastos',           icon: Receipt,        roles: ['OWNER'],                    module: 'expenses' },
  { href: '/cxp',            label: 'Cuentas x Pagar',  icon: ClockCountdown, roles: ['OWNER'],                    module: 'accounts_receivable' },
  { href: '/planilla',       label: 'Planilla',         icon: Money,          roles: ['OWNER'],                    module: 'payroll' },
  { href: '/branches',       label: 'Sucursales',       icon: Buildings,      roles: ['OWNER'],                    module: 'branches' },
  { href: '/settings',       label: 'Configuración',    icon: Gear,           roles: ['OWNER'] },
];

const NAV_ITEMS_SALON: NavItem[] = [
  { href: '/dashboard',      label: 'Inicio',           icon: HouseSimple,    roles: ['OWNER', 'BARBER', 'CLIENT'] },
  { href: '/pos',            label: 'POS',              icon: CashRegister,   roles: ['OWNER', 'ADMIN', 'GERENTE', 'BARBER'],          module: 'pos' },
  { href: '/pos-turnos',     label: 'Turnos de Caja',   icon: ClockClockwise, roles: ['OWNER', 'ADMIN', 'GERENTE', 'BARBER'],          module: 'pos' },
  { href: '/pos-documentos', label: 'Documentos',       icon: FileText,       roles: ['OWNER', 'ADMIN'],           module: 'billing_dte' },
  { href: '/appointments',   label: 'Agenda',           icon: CalendarHeart,  roles: ['OWNER', 'ADMIN', 'GERENTE', 'BARBER', 'CLIENT'],module: 'appointments' },
  { href: '/billing',        label: 'Caja (Agenda)',    icon: CreditCard,     roles: ['OWNER', 'ADMIN', 'GERENTE'],module: 'appointments' },
  { href: '/loyalty',        label: 'Fidelización',     icon: Heart,          roles: ['OWNER', 'ADMIN'],           module: 'loyalty' },
  { href: '/barbers',        label: 'Estilistas',       icon: UsersThree,     roles: ['OWNER', 'ADMIN', 'GERENTE'] },
  { href: '/usuarios',       label: 'Usuarios y Roles', icon: UserGear,       roles: ['OWNER', 'ADMIN', 'IT'] },
  { href: '/services',       label: 'Tratamientos',     icon: Sparkle,        roles: ['OWNER', 'ADMIN', 'GERENTE'] },
  { href: '/clients',        label: 'Clientas',         icon: UserCircle,     roles: ['OWNER', 'ADMIN', 'BARBER', 'GERENTE'], module: 'clients' },
  { href: '/compras',        label: 'Compras',          icon: ShoppingCart,   roles: ['OWNER'],                    module: 'products' },
  { href: '/proveedores',    label: 'Proveedores',      icon: Truck,          roles: ['OWNER'],                    module: 'products' },
  { href: '/productos',      label: 'Productos',        icon: Package,        roles: ['OWNER'],                    module: 'products' },
  { href: '/inventario',     label: 'Inventario',       icon: Stack,          roles: ['OWNER'],                    module: 'products' },
  { href: '/gastos',         label: 'Gastos',           icon: Receipt,        roles: ['OWNER'],                    module: 'expenses' },
  { href: '/cxp',            label: 'Cuentas x Pagar',  icon: ClockCountdown, roles: ['OWNER'],                    module: 'accounts_receivable' },
  { href: '/planilla',       label: 'Planilla',         icon: Money,          roles: ['OWNER'],                    module: 'payroll' },
  { href: '/branches',       label: 'Sucursales',       icon: Buildings,      roles: ['OWNER'],                    module: 'branches' },
  { href: '/settings',       label: 'Configuración',    icon: Gear,           roles: ['OWNER'] },
];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

type BranchOption = {
  id: number;
  name: string;
  slug: string;
  isHeadquarters: boolean;
};

type Props = {
  role:           BarberUserRole;
  slug:           string;
  name:           string;
  enabledModules: Record<string, boolean>;
  branches?:      BranchOption[];
  currentBranchId?: number | null;
  brandName?:     string;
};

export default function DashboardSidebar({ role, slug, name, enabledModules, branches = [], currentBranchId, brandName }: Props) {
  const pathname       = usePathname();
  const { theme }      = useBarberTheme();
  const isSalon        = theme.category === 'femenino';
  const navConfig      = isSalon ? NAV_ITEMS_SALON : NAV_ITEMS_BARBER;
  const items          = navConfig.filter(i => {
    if (!i.roles.includes(role)) return false;
    // Si el item no tiene módulo asignado, siempre es visible
    if (!i.module) return true;
    // Si no hay configuración de módulos aún (BD sin seed), mostrar todo
    if (Object.keys(enabledModules).length === 0) return true;
    return enabledModules[i.module] === true;
  });
  const initials       = getInitials(name || 'U');
  const LogoIcon       = isSalon ? Flower : Scissors;
  const navFont        = isSalon
    ? "'Playfair Display', Georgia, serif"
    : 'var(--font-inter, Inter, system-ui, sans-serif)';

  const [collapsed,         setCollapsed]         = useState(false);
  const [mounted,           setMounted]           = useState(false);
  const [isMobile,          setIsMobile]          = useState(false);
  const [mobileOpen,        setMobileOpen]        = useState(false);
  const [themeSelectorOpen, setThemeSelectorOpen] = useState(false);
  const [branchDropOpen,    setBranchDropOpen]    = useState(false);
  const [switchingBranch,   setSwitchingBranch]   = useState(false);

  const showBranchSelector = role === 'OWNER' && branches.length > 1;
  const activeBranch = branches.find(b => b.id === currentBranchId);

  async function switchBranch(branchId: number | null) {
    if (switchingBranch) return;
    setSwitchingBranch(true);
    setBranchDropOpen(false);
    try {
      const res = await fetch('/api/auth/switch-branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId }),
      });
      if (res.ok) {
        window.location.href = '/dashboard';
      }
    } finally {
      setSwitchingBranch(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setCollapsed(true);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    if (!window.matchMedia('(max-width: 767px)').matches) {
      if (localStorage.getItem('sb_collapsed') === 'true') setCollapsed(true);
    }
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  function toggle() {
    if (isMobile) {
      setMobileOpen(prev => !prev);
    } else {
      setCollapsed(prev => {
        localStorage.setItem('sb_collapsed', String(!prev));
        return !prev;
      });
    }
  }

  // En móvil siempre colapsado; el drawer lo expande flotando sobre el contenido
  const W = isMobile ? 64 : (collapsed ? 64 : 240);
  const effectiveCollapsed = isMobile ? !mobileOpen : collapsed;

  return (
    <>
      {/* Overlay oscuro en móvil cuando el drawer está abierto */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            zIndex: 99, backdropFilter: 'blur(1px)',
          }}
        />
      )}
    <aside style={{
      width:         isMobile && mobileOpen ? 240 : W,
      minHeight:     '100vh',
      background:    'hsl(var(--sidebar-bg))',
      borderRight:   '1px solid hsl(var(--sidebar-border))',
      display:       'flex',
      flexDirection: 'column',
      flexShrink:    0,
      transition:    mounted ? 'width 0.22s ease' : 'none',
      overflow:      'hidden',
      // En móvil, el sidebar abierto flota sobre el contenido
      ...(isMobile && mobileOpen ? {
        position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100,
      } : {}),
    }}>

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div style={{
        padding:        effectiveCollapsed ? '20px 0' : '18px 16px',
        borderBottom:   '1px solid hsl(var(--sidebar-border))',
        display:        'flex',
        alignItems:     'center',
        gap:            10,
        justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          background: 'linear-gradient(135deg, hsl(var(--brand-primary)) 0%, hsl(var(--brand-primary-dark)) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <LogoIcon size={17} weight="bold" color="#fff" />
        </div>
        {!effectiveCollapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ color: 'hsl(var(--sidebar-fg))', fontWeight: 700, fontSize: 14.5, letterSpacing: isSalon ? '0.2px' : '-0.2px', whiteSpace: 'nowrap', fontFamily: navFont }}>
              {brandName || (isSalon ? 'BookStyles Salón' : 'BookStyles')}
            </div>
            <div style={{ color: 'hsl(var(--sidebar-muted))', fontSize: 10, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {slug}
            </div>
          </div>
        )}
      </div>

      {/* ── Selector de Sucursal (solo OWNER con 2+ sucursales) ─────────── */}
      {showBranchSelector && (
        <div style={{ position: 'relative', borderBottom: '1px solid hsl(var(--sidebar-border))' }}>
          <button
            type="button"
            onClick={() => setBranchDropOpen(p => !p)}
            title={effectiveCollapsed ? (activeBranch?.name ?? 'Todas las sucursales') : undefined}
            disabled={switchingBranch}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: effectiveCollapsed ? 0 : 8,
              justifyContent: effectiveCollapsed ? 'center' : 'space-between',
              padding: effectiveCollapsed ? '10px 0' : '8px 14px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'hsl(var(--sidebar-fg))',
              fontSize: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <Buildings size={15} weight="bold" style={{ flexShrink: 0, color: 'hsl(var(--brand-primary))' }} />
              {!effectiveCollapsed && (
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                  {activeBranch?.name ?? 'Todas las sucursales'}
                </span>
              )}
            </div>
            {!effectiveCollapsed && (
              branchDropOpen ? <CaretUp size={12} /> : <CaretDown size={12} />
            )}
          </button>

          {branchDropOpen && !effectiveCollapsed && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
              background: 'hsl(var(--sidebar-bg))',
              border: '1px solid hsl(var(--sidebar-border))',
              borderRadius: '0 0 8px 8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              overflow: 'hidden',
            }}>
              {/* Opción: todas las sucursales */}
              <button
                type="button"
                onClick={() => switchBranch(null)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 14px', background: 'transparent', border: 'none',
                  cursor: 'pointer', fontSize: 12,
                  color: currentBranchId === null ? 'hsl(var(--brand-primary))' : 'hsl(var(--sidebar-fg))',
                  fontWeight: currentBranchId === null ? 600 : 400,
                }}
              >
                {currentBranchId === null && <CheckCircle size={13} weight="fill" />}
                <span>Todas las sucursales</span>
              </button>
              {branches.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => switchBranch(b.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '9px 14px', background: 'transparent', border: 'none',
                    borderTop: '1px solid hsl(var(--sidebar-border))',
                    cursor: 'pointer', fontSize: 12,
                    color: currentBranchId === b.id ? 'hsl(var(--brand-primary))' : 'hsl(var(--sidebar-fg))',
                    fontWeight: currentBranchId === b.id ? 600 : 400,
                  }}
                >
                  {currentBranchId === b.id && <CheckCircle size={13} weight="fill" />}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.name}{b.isHeadquarters ? ' ★' : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Navegación ───────────────────────────────────────────────────── */}
      <nav style={{ flex: 1, padding: '8px 0' }}>
        {items.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon   = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={effectiveCollapsed ? item.label : undefined}
              className="sidebar-nav-link"
              onClick={() => isMobile && setMobileOpen(false)}
              style={{
                display:        'flex',
                alignItems:     'center',
                gap:            effectiveCollapsed ? 0 : 10,
                padding:        effectiveCollapsed ? '12px 0' : '10px 16px',
                justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
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
              {!effectiveCollapsed && (
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: navFont }}>
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Botón Tema ───────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setThemeSelectorOpen(true)}
        title="Cambiar tema visual"
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
        <PaintBrush size={15} weight="bold" />
        {!effectiveCollapsed && !isMobile && <span>Tema: {theme.emoji} {theme.name}</span>}
      </button>

      {/* ── Toggle ───────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={toggle}
        title={effectiveCollapsed ? 'Expandir menú' : 'Colapsar menú'}
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
        {(effectiveCollapsed && !mobileOpen)
          ? <ArrowLineRight size={16} weight="bold" />
          : <><ArrowLineLeft size={15} weight="bold" />{!isMobile && <span>Colapsar</span>}</>
        }
      </button>

      {/* ── ThemeSelector Modal ───────────────────────────────────────────── */}
      <ThemeSelector
        open={themeSelectorOpen}
        onClose={() => setThemeSelectorOpen(false)}
      />

      {/* ── User Card ────────────────────────────────────────────────────── */}
      <div style={{
        padding:        effectiveCollapsed ? '12px 0' : '12px 16px',
        borderTop:      '1px solid hsl(var(--sidebar-border))',
        display:        'flex',
        alignItems:     'center',
        gap:            effectiveCollapsed ? 0 : 10,
        justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
        flexDirection:  effectiveCollapsed ? 'column' : 'row',
      }}>
        <div
          title={effectiveCollapsed ? name : undefined}
          style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, hsl(var(--brand-primary)) 0%, hsl(var(--brand-primary-dark)) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11.5, fontWeight: 700, color: '#fff', letterSpacing: '0.3px',
          }}
        >
          {initials}
        </div>

        {!effectiveCollapsed && (
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
        {effectiveCollapsed && (
          <form action="/api/auth/logout" method="post" style={{ marginTop: 4 }}>
            <button type="submit" title="Cerrar sesión" style={{ display: 'flex', background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--sidebar-muted))', padding: 2 }}>
              <SignOut size={16} weight="bold" />
            </button>
          </form>
        )}
      </div>

      {/* Logout: texto si está expandido */}
      {!effectiveCollapsed && (
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
    </>
  );
}
