'use client';

/**
 * DashboardSidebar — Sidebar con navegación agrupada en acordeón.
 * - Grupos colapsables: Ventas, Clientes, Equipo, Inventario, Negocio
 * - Colapsable: 240px ↔ 64px (modo compacto muestra íconos planos)
 * - Scroll solo en zona de navegación (logo y user card fijos)
 * - Grupo activo se abre automáticamente según ruta actual
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { BarberUserRole } from '@prisma/client';
import {
  HouseSimple, CalendarDots, CalendarHeart,
  Users, UsersThree, Scissors, Sparkle, Flower,
  UserCircle, CreditCard, Star, Heart, Gear, Truck,
  Package, Stack, ShoppingCart, Receipt, ClockCountdown,
  Money, ArrowLineLeft, ArrowLineRight, SignOut, CashRegister,
  ClockClockwise, FileText, PaintBrush, Buildings, CaretDown,
  CaretUp, CheckCircle, UserGear, Crown, ChartLine, Trophy,
  Target, Storefront,
} from '@phosphor-icons/react';
import { BgColorsOutlined } from '@ant-design/icons';
import ThemeSelector from '@/components/shared/ThemeSelector';
import { useBarberTheme } from '@/context/ThemeContext';

// ── Tipos ────────────────────────────────────────────────────────────────────
type NavItem = {
  href:    string;
  label:   string;
  icon:    React.ElementType;
  roles:   BarberUserRole[];
  module?: string;
};

type NavGroup = {
  key:   string;
  label: string;
  icon:  React.ElementType;
  items: NavItem[];
};

// ── Aliases de módulo ─────────────────────────────────────────────────────────
const MODULE_ALIASES: Record<string, string[]> = {
  pos:         ['pos', 'pos_turnos'],
  billing_dte: ['pos_dte'],
  dte:         ['pos_dte'],
  products:    ['compras', 'proveedores', 'productos', 'inventario'],
  expenses:    ['gastos', 'cxp'],
  servicios:   ['services'],
  citas:       ['appointments'],
  agenda:      ['appointments'],
  appointments:['appointments', 'billing'],
};

function moduleKeys(key: string) { return MODULE_ALIASES[key] ?? [key]; }

function moduleEnabled(modules: Record<string, boolean>, module: string) {
  if (Object.keys(modules).length === 0) return true;
  return Object.entries(modules).some(([k, enabled]) => enabled && moduleKeys(k).includes(module));
}

function moduleAssigned(access: string[] | null, module: string) {
  if (!Array.isArray(access)) return false;
  return access.some(k => moduleKeys(k).includes(module));
}

const OP_ROLES: BarberUserRole[] = ['SUPERADMIN', 'GERENTE', 'USERS'];

// ── Grupos de navegación — Barbería ──────────────────────────────────────────
const NAV_GROUPS_BARBER: NavGroup[] = [
  {
    key: 'ventas', label: 'Ventas', icon: CashRegister,
    items: [
      { href: '/pos',            label: 'POS',            icon: CashRegister,   roles: OP_ROLES, module: 'pos' },
      { href: '/pos-turnos',     label: 'Turnos de Caja', icon: ClockClockwise, roles: OP_ROLES, module: 'pos_turnos' },
      { href: '/pos-documentos', label: 'Documentos',     icon: FileText,       roles: OP_ROLES, module: 'pos_dte' },
      { href: '/appointments',   label: 'Citas',          icon: CalendarDots,   roles: OP_ROLES, module: 'appointments' },
      { href: '/billing',        label: 'Caja (Citas)',   icon: CreditCard,     roles: OP_ROLES, module: 'billing' },
    ],
  },
  {
    key: 'clientes', label: 'Clientes', icon: UserCircle,
    items: [
      { href: '/clients',  label: 'Clientes',         icon: UserCircle, roles: OP_ROLES, module: 'clients' },
      { href: '/loyalty',  label: 'Puntos y Tarjetas', icon: Star,       roles: OP_ROLES, module: 'loyalty' },
      { href: '/services', label: 'Servicios',         icon: Scissors,   roles: OP_ROLES, module: 'services' },
    ],
  },
  {
    key: 'equipo', label: 'Equipo', icon: Users,
    items: [
      { href: '/barbers',  label: 'Equipo',           icon: Users,    roles: OP_ROLES,            module: 'barbers' },
      { href: '/usuarios', label: 'Usuarios y Roles', icon: UserGear, roles: ['SUPERADMIN'] },
      { href: '/planilla', label: 'Planilla',         icon: Money,    roles: OP_ROLES,            module: 'payroll' },
    ],
  },
  {
    key: 'inventario', label: 'Inventario', icon: Package,
    items: [
      { href: '/productos',   label: 'Productos',       icon: Package,        roles: OP_ROLES, module: 'productos' },
      { href: '/compras',     label: 'Compras',         icon: ShoppingCart,   roles: OP_ROLES, module: 'compras' },
      { href: '/proveedores', label: 'Proveedores',     icon: Truck,          roles: OP_ROLES, module: 'proveedores' },
      { href: '/inventario',  label: 'Inventario',      icon: Stack,          roles: OP_ROLES, module: 'inventario' },
      { href: '/cxp',         label: 'Cuentas x Pagar', icon: ClockCountdown, roles: OP_ROLES, module: 'cxp' },
      { href: '/gastos',      label: 'Gastos',          icon: Receipt,        roles: OP_ROLES, module: 'gastos' },
    ],
  },
  {
    key: 'negocio', label: 'Negocio', icon: Storefront,
    items: [
      { href: '/metas',    label: 'Metas',         icon: Target,    roles: ['SUPERADMIN', 'GERENTE', 'USERS'], module: 'metas' },
      { href: '/branches', label: 'Sucursales',    icon: Buildings, roles: OP_ROLES,                           module: 'branches' },
      { href: '/settings', label: 'Configuración', icon: Gear,      roles: OP_ROLES,                           module: 'settings' },
    ],
  },
];

// ── Grupos de navegación — Salón ──────────────────────────────────────────────
const NAV_GROUPS_SALON: NavGroup[] = [
  {
    key: 'ventas', label: 'Ventas', icon: CashRegister,
    items: [
      { href: '/pos',            label: 'POS',            icon: CashRegister,   roles: OP_ROLES, module: 'pos' },
      { href: '/pos-turnos',     label: 'Turnos de Caja', icon: ClockClockwise, roles: OP_ROLES, module: 'pos_turnos' },
      { href: '/pos-documentos', label: 'Documentos',     icon: FileText,       roles: OP_ROLES, module: 'pos_dte' },
      { href: '/appointments',   label: 'Agenda',         icon: CalendarHeart,  roles: OP_ROLES, module: 'appointments' },
      { href: '/billing',        label: 'Caja (Agenda)',  icon: CreditCard,     roles: OP_ROLES, module: 'billing' },
    ],
  },
  {
    key: 'clientes', label: 'Clientas', icon: UserCircle,
    items: [
      { href: '/clients',  label: 'Clientas',      icon: UserCircle, roles: OP_ROLES, module: 'clients' },
      { href: '/loyalty',  label: 'Fidelización',  icon: Heart,      roles: OP_ROLES, module: 'loyalty' },
      { href: '/services', label: 'Tratamientos',  icon: Sparkle,    roles: OP_ROLES, module: 'services' },
    ],
  },
  {
    key: 'equipo', label: 'Equipo', icon: UsersThree,
    items: [
      { href: '/barbers',  label: 'Equipo',           icon: UsersThree, roles: OP_ROLES,            module: 'barbers' },
      { href: '/usuarios', label: 'Usuarios y Roles', icon: UserGear,   roles: ['SUPERADMIN'] },
      { href: '/planilla', label: 'Planilla',         icon: Money,      roles: OP_ROLES,            module: 'payroll' },
    ],
  },
  {
    key: 'inventario', label: 'Inventario', icon: Package,
    items: [
      { href: '/productos',   label: 'Productos',       icon: Package,        roles: OP_ROLES, module: 'productos' },
      { href: '/compras',     label: 'Compras',         icon: ShoppingCart,   roles: OP_ROLES, module: 'compras' },
      { href: '/proveedores', label: 'Proveedores',     icon: Truck,          roles: OP_ROLES, module: 'proveedores' },
      { href: '/inventario',  label: 'Inventario',      icon: Stack,          roles: OP_ROLES, module: 'inventario' },
      { href: '/cxp',         label: 'Cuentas x Pagar', icon: ClockCountdown, roles: OP_ROLES, module: 'cxp' },
      { href: '/gastos',      label: 'Gastos',          icon: Receipt,        roles: OP_ROLES, module: 'gastos' },
    ],
  },
  {
    key: 'negocio', label: 'Negocio', icon: Storefront,
    items: [
      { href: '/metas',    label: 'Metas',         icon: Target,    roles: ['SUPERADMIN', 'GERENTE', 'USERS'], module: 'metas' },
      { href: '/branches', label: 'Sucursales',    icon: Buildings, roles: OP_ROLES,                           module: 'branches' },
      { href: '/settings', label: 'Configuración', icon: Gear,      roles: OP_ROLES,                           module: 'settings' },
    ],
  },
];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

type BranchOption = { id: number; name: string; slug: string; isHeadquarters: boolean };

type Props = {
  role:             BarberUserRole;
  slug:             string;
  name:             string;
  enabledModules:   Record<string, boolean>;
  userModuleAccess: string[] | null;
  branches?:        BranchOption[];
  currentBranchId?: number | null;
  brandName?:       string;
};

// ── OwnerSidebar ──────────────────────────────────────────────────────────────
function OwnerSidebar({ name, brandName, slug }: { name: string; brandName?: string; slug: string }) {
  const pathname              = usePathname();
  const { theme: barberTheme }= useBarberTheme();
  const primary               = barberTheme.colorPrimary;
  const [collapsed,         setCollapsed]         = useState(false);
  const [mounted,           setMounted]           = useState(false);
  const [isMobile,          setIsMobile]          = useState(false);
  const [mobileOpen,        setMobileOpen]        = useState(false);
  const [themeSelectorOpen, setThemeSelectorOpen] = useState(false);

  const searchParams = useSearchParams();
  const activeTab    = searchParams.get('tab') ?? 'panel';
  const initials     = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  useEffect(() => {
    setMounted(true);
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setCollapsed(true);
    };
    check();
    window.addEventListener('resize', check);
    if (!window.matchMedia('(max-width: 767px)').matches) {
      if (localStorage.getItem('sb_collapsed') === 'true') setCollapsed(true);
    }
    return () => window.removeEventListener('resize', check);
  }, []);

  const effectiveCollapsed = isMobile ? !mobileOpen : collapsed;
  const W = isMobile ? 64 : (collapsed ? 64 : 240);

  function toggle() {
    if (isMobile) setMobileOpen(p => !p);
    else setCollapsed(p => { localStorage.setItem('sb_collapsed', String(!p)); return !p; });
  }

  const ownerNavItems = [
    { href: '/dashboard',               tab: 'panel',    label: 'Panel Ejecutivo', icon: HouseSimple  },
    { href: '/dashboard?tab=metricas',  tab: 'metricas', label: 'Métricas',        icon: ChartLine    },
    { href: '/dashboard?tab=ranking',   tab: 'ranking',  label: 'Ranking',         icon: Trophy       },
    { href: '/dashboard?tab=gastos',    tab: 'gastos',   label: 'Gastos',          icon: Receipt      },
    { href: '/dashboard?tab=compras',   tab: 'compras',  label: 'Compras & CxP',   icon: ShoppingCart },
    { href: '/dashboard?tab=planilla',  tab: 'planilla', label: 'Planilla',        icon: Money        },
    { href: '/dashboard?tab=reportes',  tab: 'reportes', label: 'Reportes',        icon: FileText     },
    { href: '/metas',                   tab: 'metas',    label: 'Metas',           icon: Target       },
  ];

  return (
    <>
      {isMobile && mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99, backdropFilter: 'blur(2px)' }} />
      )}
      <aside style={{
        width: isMobile && mobileOpen ? 240 : W,
        height: '100vh', position: 'sticky', top: 0,
        background: 'hsl(var(--sidebar-bg))', borderRight: '1px solid hsl(var(--sidebar-border))',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        transition: mounted ? 'width 0.22s ease' : 'none', overflowX: 'hidden',
        ...(isMobile && mobileOpen ? { position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100, height: '100vh' } : {}),
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent 0%, ${primary} 50%, transparent 100%)` }} />

        {/* Logo */}
        <div style={{ padding: effectiveCollapsed ? '22px 0 16px' : '20px 16px 16px', borderBottom: '1px solid hsl(var(--sidebar-border))', display: 'flex', alignItems: 'center', gap: 10, justifyContent: effectiveCollapsed ? 'center' : 'flex-start' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: `linear-gradient(135deg, hsl(var(--brand-primary)) 0%, hsl(var(--brand-primary-dark)) 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${primary}50` }}>
            <Crown size={18} weight="fill" color="#fff" />
          </div>
          {!effectiveCollapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ color: 'hsl(var(--sidebar-fg))', fontWeight: 700, fontSize: 14, letterSpacing: '-0.2px', whiteSpace: 'nowrap' }}>{brandName || 'Mi Negocio'}</div>
              <div style={{ color: 'hsl(var(--sidebar-muted))', fontSize: 10, marginTop: 1, fontWeight: 600, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>PROPIETARIO</div>
            </div>
          )}
        </div>

        {/* Info propietario */}
        {!effectiveCollapsed && (
          <div style={{ margin: '12px 12px 4px', background: `${primary}10`, border: `1px solid ${primary}30`, borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg, hsl(var(--brand-primary)) 0%, hsl(var(--brand-primary-dark)) 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{initials}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: 'hsl(var(--sidebar-fg))', fontWeight: 600, fontSize: 12, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                <div style={{ color: 'hsl(var(--sidebar-muted))', fontSize: 10, fontWeight: 700, letterSpacing: '0.3px' }}>Propietario · {slug}</div>
              </div>
            </div>
          </div>
        )}

        {/* Navegación */}
        <nav className="sidebar-nav" style={{ flex: 1, minHeight: 0, padding: '10px 8px', overflowY: 'scroll', overflowX: 'hidden' }}>
          {ownerNavItems.map(item => {
            const active = item.tab === 'metas' ? pathname === '/metas' : item.tab === activeTab;
            const Icon = item.icon;
            return (
              <Link key={item.tab} href={item.href} title={effectiveCollapsed ? item.label : undefined} style={{ display: 'flex', alignItems: 'center', gap: effectiveCollapsed ? 0 : 10, padding: effectiveCollapsed ? '12px 0' : '10px 12px', justifyContent: effectiveCollapsed ? 'center' : 'flex-start', textDecoration: 'none', fontSize: 13, fontWeight: active ? 700 : 400, color: active ? 'hsl(var(--brand-primary))' : 'hsl(var(--sidebar-fg))', background: active ? 'hsl(var(--brand-primary) / 0.12)' : 'transparent', borderLeft: active ? '3px solid hsl(var(--brand-primary))' : '3px solid transparent', borderRadius: active ? '0 8px 8px 0' : 4, transition: 'all 0.15s', whiteSpace: 'nowrap', overflow: 'hidden', marginBottom: 2 }}>
                <Icon size={18} weight={active ? 'bold' : 'regular'} style={{ flexShrink: 0, color: active ? primary : undefined }} />
                {!effectiveCollapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Botón Tema */}
        <button type="button" onClick={() => setThemeSelectorOpen(true)} title="Cambiar tema visual" className="sidebar-toggle-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '9px 0', background: 'transparent', border: 'none', borderTop: '1px solid hsl(var(--sidebar-border))', color: 'hsl(var(--sidebar-muted))', cursor: 'pointer', gap: 6, fontSize: 11, transition: 'color 0.15s' }}>
          <PaintBrush size={15} weight="bold" />
          {!effectiveCollapsed && !isMobile && <span>Tema: <BgColorsOutlined /> {barberTheme.name}</span>}
        </button>

        {/* Toggle */}
        <button type="button" onClick={toggle} title={effectiveCollapsed ? 'Expandir menú' : 'Colapsar menú'} className="sidebar-toggle-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '9px 0', background: 'transparent', border: 'none', borderTop: '1px solid hsl(var(--sidebar-border))', color: 'hsl(var(--sidebar-muted))', cursor: 'pointer', gap: 6, fontSize: 11, transition: 'color 0.15s' }}>
          {(effectiveCollapsed && !mobileOpen) ? <ArrowLineRight size={15} weight="bold" /> : <><ArrowLineLeft size={14} weight="bold" />{!isMobile && <span style={{ fontSize: 11 }}>Colapsar</span>}</>}
        </button>

        <ThemeSelector open={themeSelectorOpen} onClose={() => setThemeSelectorOpen(false)} />

        {/* Logout */}
        <div style={{ padding: effectiveCollapsed ? '10px 0' : '10px 12px 16px' }}>
          {effectiveCollapsed ? (
            <form action="/api/auth/logout" method="post" style={{ display: 'flex', justifyContent: 'center' }}>
              <button type="submit" title="Cerrar sesión" style={{ display: 'flex', background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--sidebar-muted))', padding: 6 }}>
                <SignOut size={16} weight="bold" />
              </button>
            </form>
          ) : (
            <form action="/api/auth/logout" method="post">
              <button type="submit" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', background: 'transparent', border: '1px solid hsl(var(--sidebar-border))', borderRadius: 8, color: 'hsl(var(--sidebar-muted))', fontSize: 12, cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s' }}>
                <SignOut size={13} weight="bold" />
                Cerrar sesión
              </button>
            </form>
          )}
        </div>
      </aside>
    </>
  );
}

// ── DashboardSidebar principal ────────────────────────────────────────────────
export default function DashboardSidebar({ role, slug, name, enabledModules, userModuleAccess, branches = [], currentBranchId, brandName }: Props) {
  const pathname  = usePathname();
  const { theme } = useBarberTheme();
  const isSalon   = theme.category === 'salon';
  const primary   = theme.colorPrimary;
  const navFont   = isSalon ? "'Playfair Display', Georgia, serif" : 'var(--font-inter, Inter, system-ui, sans-serif)';
  const LogoIcon  = isSalon ? Flower : Scissors;

  if (role === 'OWNER') {
    return (
      <Suspense fallback={<OwnerSidebar name={name} brandName={brandName} slug={slug} />}>
        <OwnerSidebar name={name} brandName={brandName} slug={slug} />
      </Suspense>
    );
  }

  const [collapsed,         setCollapsed]         = useState(false);
  const [mounted,           setMounted]           = useState(false);
  const [isMobile,          setIsMobile]          = useState(false);
  const [mobileOpen,        setMobileOpen]        = useState(false);
  const [themeSelectorOpen, setThemeSelectorOpen] = useState(false);
  const [branchDropOpen,    setBranchDropOpen]    = useState(false);
  const [switchingBranch,   setSwitchingBranch]   = useState(false);
  const [openGroups,        setOpenGroups]        = useState<Set<string>>(new Set());

  const showBranchSelector = role === 'SUPERADMIN' && branches.length > 1;
  const activeBranch       = branches.find(b => b.id === currentBranchId);

  // Filtrar grupos según rol y módulos habilitados
  const sourceGroups = isSalon ? NAV_GROUPS_SALON : NAV_GROUPS_BARBER;

  const filteredGroups = useMemo(() => {
    return sourceGroups.map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (!item.roles.includes(role)) return false;
        if (!item.module) return true;
        if (!moduleEnabled(enabledModules, item.module)) return false;
        if (role === 'SUPERADMIN') return true;
        return moduleAssigned(userModuleAccess, item.module);
      }),
    })).filter(g => g.items.length > 0);
  }, [role, enabledModules, userModuleAccess, isSalon]);

  // Auto-abrir el grupo que contiene la ruta activa
  useEffect(() => {
    const activeGroup = filteredGroups.find(g =>
      g.items.some(i => pathname === i.href || pathname.startsWith(i.href + '/'))
    );
    if (activeGroup) {
      setOpenGroups(prev => new Set([...prev, activeGroup.key]));
    }
  }, [pathname, filteredGroups]);

  useEffect(() => {
    setMounted(true);
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setCollapsed(true);
    };
    check();
    window.addEventListener('resize', check);
    if (!window.matchMedia('(max-width: 767px)').matches) {
      if (localStorage.getItem('sb_collapsed') === 'true') setCollapsed(true);
    }
    return () => window.removeEventListener('resize', check);
  }, []);

  function toggle() {
    if (isMobile) setMobileOpen(prev => !prev);
    else setCollapsed(prev => { localStorage.setItem('sb_collapsed', String(!prev)); return !prev; });
  }

  function toggleGroup(key: string) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function switchBranch(branchId: number | null) {
    if (switchingBranch) return;
    setSwitchingBranch(true); setBranchDropOpen(false);
    try {
      const res = await fetch('/api/auth/switch-branch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ branchId }) });
      if (res.ok) window.location.href = '/dashboard';
    } finally { setSwitchingBranch(false); }
  }

  const W                = isMobile ? 64 : (collapsed ? 64 : 240);
  const effectiveCollapsed = isMobile ? !mobileOpen : collapsed;
  const initials           = getInitials(name || 'U');

  return (
    <>
      {isMobile && mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 99, backdropFilter: 'blur(1px)' }} />
      )}
      <aside style={{
        width: isMobile && mobileOpen ? 240 : W,
        height: '100vh', position: 'sticky', top: 0,
        background: 'hsl(var(--sidebar-bg))', borderRight: '1px solid hsl(var(--sidebar-border))',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        transition: mounted ? 'width 0.22s ease' : 'none', overflowX: 'hidden',
        ...(isMobile && mobileOpen ? { position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100 } : {}),
      }}>

        {/* ── Logo ── */}
        <div style={{ padding: effectiveCollapsed ? '20px 0' : '18px 16px', borderBottom: '1px solid hsl(var(--sidebar-border))', display: 'flex', alignItems: 'center', gap: 10, justifyContent: effectiveCollapsed ? 'center' : 'flex-start', flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: 'linear-gradient(135deg, hsl(var(--brand-primary)) 0%, hsl(var(--brand-primary-dark)) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

        {/* ── Selector de Sucursal ── */}
        {showBranchSelector && (
          <div style={{ position: 'relative', borderBottom: '1px solid hsl(var(--sidebar-border))', flexShrink: 0 }}>
            <button type="button" onClick={() => setBranchDropOpen(p => !p)} title={effectiveCollapsed ? (activeBranch?.name ?? 'Todas') : undefined} disabled={switchingBranch} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: effectiveCollapsed ? 0 : 8, justifyContent: effectiveCollapsed ? 'center' : 'space-between', padding: effectiveCollapsed ? '10px 0' : '8px 14px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'hsl(var(--sidebar-fg))', fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <Buildings size={15} weight="bold" style={{ flexShrink: 0, color: 'hsl(var(--brand-primary))' }} />
                {!effectiveCollapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{activeBranch?.name ?? 'Todas las sucursales'}</span>}
              </div>
              {!effectiveCollapsed && (branchDropOpen ? <CaretUp size={12} /> : <CaretDown size={12} />)}
            </button>
            {branchDropOpen && !effectiveCollapsed && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: 'hsl(var(--sidebar-bg))', border: '1px solid hsl(var(--sidebar-border))', borderRadius: '0 0 8px 8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
                <button type="button" onClick={() => switchBranch(null)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, color: currentBranchId === null ? 'hsl(var(--brand-primary))' : 'hsl(var(--sidebar-fg))', fontWeight: currentBranchId === null ? 600 : 400 }}>
                  {currentBranchId === null && <CheckCircle size={13} weight="fill" />}
                  <span>Todas las sucursales</span>
                </button>
                {branches.map(b => (
                  <button key={b.id} type="button" onClick={() => switchBranch(b.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'transparent', border: 'none', borderTop: '1px solid hsl(var(--sidebar-border))', cursor: 'pointer', fontSize: 12, color: currentBranchId === b.id ? 'hsl(var(--brand-primary))' : 'hsl(var(--sidebar-fg))', fontWeight: currentBranchId === b.id ? 600 : 400 }}>
                    {currentBranchId === b.id && <CheckCircle size={13} weight="fill" />}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}{b.isHeadquarters ? ' ★' : ''}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Navegación (scrollable) ── */}
        <nav className="sidebar-nav" style={{ flex: 1, minHeight: 0, overflowY: 'scroll', overflowX: 'hidden', padding: '8px 0' }}>

          {/* Inicio — siempre visible, fuera de grupo */}
          <Link
            href="/dashboard"
            title={effectiveCollapsed ? 'Inicio' : undefined}
            onClick={() => isMobile && setMobileOpen(false)}
            style={{
              display: 'flex', alignItems: 'center',
              gap: effectiveCollapsed ? 0 : 10,
              padding: effectiveCollapsed ? '11px 0' : '9px 16px',
              justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
              textDecoration: 'none', fontSize: 13.5,
              fontWeight: pathname === '/dashboard' ? 600 : 400,
              color: pathname === '/dashboard' ? 'hsl(var(--brand-primary))' : 'hsl(var(--sidebar-fg))',
              background: pathname === '/dashboard' ? 'hsl(var(--brand-primary) / 0.10)' : 'transparent',
              borderLeft: pathname === '/dashboard' ? `3px solid hsl(var(--brand-primary))` : '3px solid transparent',
              transition: 'background 0.15s, color 0.15s',
              whiteSpace: 'nowrap', overflow: 'hidden',
              marginBottom: 2,
            }}
          >
            <HouseSimple size={18} weight={pathname === '/dashboard' ? 'bold' : 'regular'} style={{ flexShrink: 0 }} />
            {!effectiveCollapsed && <span style={{ fontFamily: navFont }}>Inicio</span>}
          </Link>

          {/* Separador entre Inicio y grupos */}
          {!effectiveCollapsed && (
            <div style={{ height: 1, background: 'hsl(var(--sidebar-border))', margin: '6px 16px 6px' }} />
          )}

          {/* Grupos */}
          {filteredGroups.map((group, gIdx) => {
            const GroupIcon  = group.icon;
            const isOpen     = openGroups.has(group.key);
            const hasActive  = group.items.some(i => pathname === i.href || pathname.startsWith(i.href + '/'));

            if (effectiveCollapsed) {
              // ── Modo compacto: íconos planos con separador entre grupos ──
              return (
                <div key={group.key}>
                  {gIdx > 0 && (
                    <div style={{ height: 1, background: 'hsl(var(--sidebar-border))', margin: '4px 14px' }} />
                  )}
                  {group.items.map(item => {
                    const active = pathname === item.href || pathname.startsWith(item.href + '/');
                    const Icon   = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={item.label}
                        onClick={() => isMobile && setMobileOpen(false)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: '10px 0', textDecoration: 'none',
                          color: active ? 'hsl(var(--brand-primary))' : 'hsl(var(--sidebar-fg))',
                          background: active ? 'hsl(var(--brand-primary) / 0.10)' : 'transparent',
                          borderLeft: active ? `3px solid hsl(var(--brand-primary))` : '3px solid transparent',
                          transition: 'background 0.15s, color 0.15s',
                          marginBottom: 1,
                        }}
                      >
                        <Icon size={18} weight={active ? 'bold' : 'regular'} />
                      </Link>
                    );
                  })}
                </div>
              );
            }

            // ── Modo expandido: acordeón ──
            return (
              <div key={group.key} style={{ marginBottom: 2 }}>
                {/* Cabecera del grupo */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '7px 16px',
                    background: hasActive ? `${primary}08` : 'transparent',
                    border: 'none', borderLeft: hasActive ? `3px solid ${primary}50` : '3px solid transparent',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <GroupIcon
                      size={15}
                      weight={hasActive ? 'bold' : 'regular'}
                      style={{ color: hasActive ? primary : 'hsl(var(--sidebar-muted))', flexShrink: 0 }}
                    />
                    <span style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.6px',
                      textTransform: 'uppercase', fontFamily: navFont,
                      color: hasActive ? primary : 'hsl(var(--sidebar-muted))',
                      whiteSpace: 'nowrap',
                    }}>
                      {group.label}
                    </span>
                  </div>
                  {isOpen
                    ? <CaretUp size={11} style={{ color: 'hsl(var(--sidebar-muted))', flexShrink: 0 }} />
                    : <CaretDown size={11} style={{ color: 'hsl(var(--sidebar-muted))', flexShrink: 0 }} />
                  }
                </button>

                {/* Items del grupo */}
                {isOpen && (
                  <div style={{ paddingBottom: 4 }}>
                    {group.items.map(item => {
                      const active = pathname === item.href || pathname.startsWith(item.href + '/');
                      const Icon   = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => isMobile && setMobileOpen(false)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 9,
                            padding: '8px 16px 8px 32px',
                            textDecoration: 'none', fontSize: 13,
                            fontWeight: active ? 600 : 400,
                            color: active ? 'hsl(var(--brand-primary))' : 'hsl(var(--sidebar-fg))',
                            background: active ? 'hsl(var(--brand-primary) / 0.10)' : 'transparent',
                            borderLeft: active ? `3px solid hsl(var(--brand-primary))` : '3px solid transparent',
                            transition: 'background 0.15s, color 0.15s',
                            whiteSpace: 'nowrap', overflow: 'hidden', marginBottom: 1,
                          }}
                        >
                          <Icon size={16} weight={active ? 'bold' : 'regular'} style={{ flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: navFont }}>
                            {item.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* ── Botón Tema (fijo) ── */}
        <button type="button" onClick={() => setThemeSelectorOpen(true)} title="Cambiar tema visual" className="sidebar-toggle-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '9px 0', background: 'transparent', border: 'none', borderTop: '1px solid hsl(var(--sidebar-border))', color: 'hsl(var(--sidebar-muted))', cursor: 'pointer', gap: 6, fontSize: 11, transition: 'color 0.15s, background 0.15s', flexShrink: 0 }}>
          <PaintBrush size={15} weight="bold" />
          {!effectiveCollapsed && !isMobile && <span>Tema: <BgColorsOutlined /> {theme.name}</span>}
        </button>

        {/* ── Toggle (fijo) ── */}
        <button type="button" onClick={toggle} title={effectiveCollapsed ? 'Expandir menú' : 'Colapsar menú'} className="sidebar-toggle-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '9px 0', background: 'transparent', border: 'none', borderTop: '1px solid hsl(var(--sidebar-border))', color: 'hsl(var(--sidebar-muted))', cursor: 'pointer', gap: 6, fontSize: 11, transition: 'color 0.15s, background 0.15s', flexShrink: 0 }}>
          {(effectiveCollapsed && !mobileOpen)
            ? <ArrowLineRight size={16} weight="bold" />
            : <><ArrowLineLeft size={15} weight="bold" />{!isMobile && <span>Colapsar</span>}</>
          }
        </button>

        <ThemeSelector open={themeSelectorOpen} onClose={() => setThemeSelectorOpen(false)} />

        {/* ── User Card (fijo) ── */}
        <div style={{ padding: effectiveCollapsed ? '12px 0' : '12px 16px', borderTop: '1px solid hsl(var(--sidebar-border))', display: 'flex', alignItems: 'center', gap: effectiveCollapsed ? 0 : 10, justifyContent: effectiveCollapsed ? 'center' : 'flex-start', flexDirection: effectiveCollapsed ? 'column' : 'row', flexShrink: 0 }}>
          <div title={effectiveCollapsed ? name : undefined} style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, hsl(var(--brand-primary)) 0%, hsl(var(--brand-primary-dark)) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 700, color: '#fff', letterSpacing: '0.3px' }}>
            {initials}
          </div>
          {!effectiveCollapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'hsl(var(--sidebar-fg))', fontWeight: 600, fontSize: 12.5, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'hsl(var(--sidebar-muted))', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 1 }}>{role}</div>
            </div>
          )}
          {effectiveCollapsed && (
            <form action="/api/auth/logout" method="post" style={{ marginTop: 4 }}>
              <button type="submit" title="Cerrar sesión" style={{ display: 'flex', background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--sidebar-muted))', padding: 2 }}>
                <SignOut size={16} weight="bold" />
              </button>
            </form>
          )}
        </div>

        {/* Logout expandido */}
        {!effectiveCollapsed && (
          <div style={{ padding: '0 16px 14px', flexShrink: 0 }}>
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="sidebar-logout-btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', background: 'transparent', border: '1px solid hsl(var(--sidebar-border))', borderRadius: 7, color: 'hsl(var(--sidebar-muted))', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'border-color 0.15s, color 0.15s' }}>
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
