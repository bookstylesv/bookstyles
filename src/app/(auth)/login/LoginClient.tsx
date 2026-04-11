'use client';

import { Eye, EyeOff, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useState } from 'react';

type Step = 'empresa' | 'credenciales';
type LoginTheme =
  | 'neutral'
  | 'barberia-teal' | 'barberia-clasica' | 'barberia-carbon' | 'barberia-navy'
  | 'salon-rose'    | 'salon-lila'       | 'salon-dorado'    | 'salon-esmeralda';

type Feature = { title: string; description: string };
type TenantInfo = {
  id: number;
  slug: string;
  name: string;
  logoUrl: string | null;
  status: string;
  themeConfig: Record<string, string>;
  businessType: 'BARBERIA' | 'SALON';
};
type BrandingConfig = {
  brandName: string;
  tagline: string;
  features: Feature[];
};

function ScissorsIcon({ size = 32, color = 'white', strokeWidth = 1.6 }: { size?: number; color?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  );
}

function StoreIcon({ size = 32, color = 'white', strokeWidth = 1.6 }: { size?: number; color?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function CalendarIcon({ stroke }: { stroke: string }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
}
function ChartIcon({ stroke }: { stroke: string }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" /></svg>;
}
function UsersIcon({ stroke }: { stroke: string }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}

const DEFAULT_BRANDING: BrandingConfig = {
  brandName: 'Speeddan',
  tagline: 'Sistema de gestion para barberias',
  features: [
    { title: 'Gestion de Citas', description: 'Agenda online en tiempo real' },
    { title: 'Reportes y Caja', description: 'Control financiero completo' },
    { title: 'Gestion de Clientes', description: 'Historial y fidelizacion' },
  ],
};

const SECTORS: Record<LoginTheme, {
  sectorLabel: string; eyebrow: string; helperEmpresa: string; helperAcceso: string;
  headerName: string; companyLabel: string; companyPlaceholder: string; footerNote: string;
  heroFooter: string; tagline: string; accentA: string; accentB: string; glow: string;
  focus: string; text: string; muted: string; labelColor: string; card: string;
  cardBorder: string; input: string; inputBorder: string; leftBase: string; rightBase: string;
  leftImage: string; rightImage: string; leftOverlay: string; rightOverlay: string;
  leftOrb: string; rightOrb: string; chipBg: string; chipBorder: string; chipText: string;
  stepDone: string; stepIdle: string; useDisplay: boolean; features: Feature[];
}> = {
  neutral: {
    sectorLabel: 'Speeddan', eyebrow: 'Sistema ERP', helperEmpresa: 'Ingresa la clave de tu empresa', helperAcceso: 'Accede a tu cuenta', headerName: 'Speeddan ERP', companyLabel: 'Clave de empresa', companyPlaceholder: 'ej: mi-empresa', footerNote: 'Speeddan · Sistema seguro', heroFooter: 'ERP Multi-tenant', tagline: 'Sistema de gestión para tu negocio', accentA: '#5b21b6', accentB: '#7c3aed', glow: 'rgba(124,58,237,0.36)', focus: 'rgba(124,58,237,0.72)', text: '#ffffff', muted: 'rgba(255,255,255,0.56)', labelColor: 'rgba(255,255,255,0.54)', card: 'rgba(255,255,255,0.055)', cardBorder: 'rgba(255,255,255,0.10)', input: 'rgba(255,255,255,0.07)', inputBorder: 'rgba(255,255,255,0.16)', leftBase: 'hsl(262 60% 10%)', rightBase: 'hsl(262 60% 6%)', leftImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=80', rightImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=80', leftOverlay: 'linear-gradient(145deg, rgba(20,8,60,0.62) 0%, rgba(40,16,100,0.54) 50%, rgba(124,58,237,0.28) 100%)', rightOverlay: 'linear-gradient(160deg, rgba(15,6,45,0.88) 0%, rgba(30,12,80,0.82) 52%, rgba(50,20,110,0.86) 100%)', leftOrb: 'radial-gradient(circle, rgba(124,58,237,0.20) 0%, transparent 70%)', rightOrb: 'radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 70%)', chipBg: 'rgba(167,139,250,0.18)', chipBorder: 'rgba(167,139,250,0.30)', chipText: '#a78bfa', stepDone: '#a78bfa', stepIdle: 'rgba(255,255,255,0.10)', useDisplay: false, features: [{ title: 'Barbería & Salón', description: 'ERP multi-sector completo' }, { title: 'Gestión de Citas', description: 'Agenda online en tiempo real' }, { title: 'Control Financiero', description: 'Reportes y caja en tiempo real' }],
  },

  /* ── BARBERÍAS ─────────────────────────────────────────────────────── */

  'barberia-teal': {
    sectorLabel: 'Barberia', eyebrow: 'Barber premium', helperEmpresa: 'Ingresa el codigo de tu barberia', helperAcceso: 'Accede a tu cuenta', headerName: 'Speeddan Barberia', companyLabel: 'Codigo de empresa', companyPlaceholder: 'ej: mi-barberia', footerNote: 'Speeddan ERP · Sistema seguro', heroFooter: 'ERP Multi-tenant para barberias', tagline: 'Sistema de gestion para barberias', accentA: '#5D6474', accentB: '#6498AF', glow: 'rgba(100,152,175,0.36)', focus: 'rgba(100,152,175,0.72)', text: '#ffffff', muted: 'rgba(255,255,255,0.56)', labelColor: 'rgba(255,255,255,0.54)', card: 'rgba(255,255,255,0.055)', cardBorder: 'rgba(255,255,255,0.10)', input: 'rgba(255,255,255,0.07)', inputBorder: 'rgba(255,255,255,0.16)', leftBase: 'hsl(175 60% 18%)', rightBase: 'hsl(175 60% 8%)', leftImage: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1400&q=80', rightImage: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1400&q=80', leftOverlay: 'linear-gradient(145deg, rgba(11,31,28,0.42) 0%, rgba(22,46,42,0.35) 50%, rgba(100,152,175,0.28) 100%)', rightOverlay: 'linear-gradient(160deg, rgba(11,31,28,0.78) 0%, rgba(15,42,38,0.72) 50%, rgba(22,46,42,0.80) 100%)', leftOrb: 'radial-gradient(circle, rgba(100,152,175,0.18) 0%, transparent 70%)', rightOrb: 'radial-gradient(circle, rgba(100,152,175,0.12) 0%, transparent 70%)', chipBg: 'rgba(74,222,128,0.18)', chipBorder: 'rgba(74,222,128,0.30)', chipText: '#4ade80', stepDone: '#4ade80', stepIdle: 'rgba(255,255,255,0.10)', useDisplay: false, features: DEFAULT_BRANDING.features,
  },

  'barberia-clasica': {
    sectorLabel: 'Barberia', eyebrow: 'Barber clásico', helperEmpresa: 'Ingresa el codigo de tu barberia', helperAcceso: 'Accede a tu cuenta', headerName: 'Speeddan Barberia', companyLabel: 'Codigo de empresa', companyPlaceholder: 'ej: mi-barberia', footerNote: 'Speeddan ERP · Sistema seguro', heroFooter: 'ERP Multi-tenant para barberias', tagline: 'Tradicion y estilo en cada corte', accentA: '#6b3e1e', accentB: '#D4A853', glow: 'rgba(212,168,83,0.36)', focus: 'rgba(212,168,83,0.72)', text: '#fff8f0', muted: 'rgba(255,243,220,0.60)', labelColor: 'rgba(255,240,210,0.58)', card: 'rgba(255,248,235,0.06)', cardBorder: 'rgba(255,230,160,0.14)', input: 'rgba(255,248,230,0.07)', inputBorder: 'rgba(255,220,130,0.18)', leftBase: 'hsl(25 60% 8%)', rightBase: 'hsl(25 55% 4%)', leftImage: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=1400&q=80', rightImage: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1400&q=80', leftOverlay: 'linear-gradient(145deg, rgba(40,18,4,0.52) 0%, rgba(70,32,8,0.44) 50%, rgba(180,120,30,0.22) 100%)', rightOverlay: 'linear-gradient(160deg, rgba(30,12,3,0.86) 0%, rgba(55,25,7,0.80) 52%, rgba(80,38,10,0.84) 100%)', leftOrb: 'radial-gradient(circle, rgba(212,168,83,0.20) 0%, transparent 70%)', rightOrb: 'radial-gradient(circle, rgba(212,168,83,0.14) 0%, transparent 70%)', chipBg: 'rgba(212,168,83,0.18)', chipBorder: 'rgba(212,168,83,0.32)', chipText: '#D4A853', stepDone: '#D4A853', stepIdle: 'rgba(255,240,200,0.10)', useDisplay: false, features: [{ title: 'Cortes Clásicos', description: 'Agenda y gestión de turnos' }, { title: 'Caja y Reportes', description: 'Control de ingresos diario' }, { title: 'Fidelización', description: 'Historial de clientes' }],
  },

  'barberia-carbon': {
    sectorLabel: 'Barberia', eyebrow: 'Urban barbershop', helperEmpresa: 'Ingresa el codigo de tu barberia', helperAcceso: 'Accede a tu cuenta', headerName: 'Speeddan Barberia', companyLabel: 'Codigo de empresa', companyPlaceholder: 'ej: mi-barberia', footerNote: 'Speeddan ERP · Sistema seguro', heroFooter: 'ERP Multi-tenant para barberias', tagline: 'Precision urbana en cada detalle', accentA: '#374151', accentB: '#9ca3af', glow: 'rgba(156,163,175,0.32)', focus: 'rgba(156,163,175,0.68)', text: '#f9fafb', muted: 'rgba(243,244,246,0.54)', labelColor: 'rgba(229,231,235,0.54)', card: 'rgba(255,255,255,0.045)', cardBorder: 'rgba(255,255,255,0.09)', input: 'rgba(255,255,255,0.06)', inputBorder: 'rgba(255,255,255,0.14)', leftBase: 'hsl(220 14% 7%)', rightBase: 'hsl(220 14% 4%)', leftImage: 'https://images.unsplash.com/photo-1593702295094-617b8d943b33?auto=format&fit=crop&w=1400&q=80', rightImage: 'https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?auto=format&fit=crop&w=1400&q=80', leftOverlay: 'linear-gradient(145deg, rgba(10,10,18,0.60) 0%, rgba(20,20,35,0.52) 50%, rgba(55,65,81,0.30) 100%)', rightOverlay: 'linear-gradient(160deg, rgba(8,8,14,0.90) 0%, rgba(15,15,25,0.85) 52%, rgba(28,28,44,0.88) 100%)', leftOrb: 'radial-gradient(circle, rgba(156,163,175,0.16) 0%, transparent 70%)', rightOrb: 'radial-gradient(circle, rgba(156,163,175,0.10) 0%, transparent 70%)', chipBg: 'rgba(209,213,219,0.14)', chipBorder: 'rgba(209,213,219,0.24)', chipText: '#d1d5db', stepDone: '#d1d5db', stepIdle: 'rgba(255,255,255,0.08)', useDisplay: false, features: [{ title: 'Estilo Urbano', description: 'Agenda y turnos modernos' }, { title: 'Control de Caja', description: 'Reportes en tiempo real' }, { title: 'Clientes VIP', description: 'Historial y preferencias' }],
  },

  'barberia-navy': {
    sectorLabel: 'Barberia', eyebrow: 'Gentleman barber', helperEmpresa: 'Ingresa el codigo de tu barberia', helperAcceso: 'Accede a tu cuenta', headerName: 'Speeddan Barberia', companyLabel: 'Codigo de empresa', companyPlaceholder: 'ej: mi-barberia', footerNote: 'Speeddan ERP · Sistema seguro', heroFooter: 'ERP Multi-tenant para barberias', tagline: 'Elegancia britanica en cada servicio', accentA: '#1e3a5f', accentB: '#e74c3c', glow: 'rgba(231,76,60,0.34)', focus: 'rgba(231,76,60,0.68)', text: '#f0f4ff', muted: 'rgba(224,232,255,0.58)', labelColor: 'rgba(210,222,255,0.56)', card: 'rgba(255,255,255,0.05)', cardBorder: 'rgba(200,220,255,0.12)', input: 'rgba(200,220,255,0.07)', inputBorder: 'rgba(200,210,255,0.16)', leftBase: 'hsl(214 52% 7%)', rightBase: 'hsl(214 52% 4%)', leftImage: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&w=1400&q=80', rightImage: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1400&q=80', leftOverlay: 'linear-gradient(145deg, rgba(8,18,38,0.55) 0%, rgba(18,36,74,0.46) 50%, rgba(30,58,95,0.28) 100%)', rightOverlay: 'linear-gradient(160deg, rgba(6,14,30,0.90) 0%, rgba(12,26,56,0.84) 52%, rgba(20,42,80,0.88) 100%)', leftOrb: 'radial-gradient(circle, rgba(231,76,60,0.18) 0%, transparent 70%)', rightOrb: 'radial-gradient(circle, rgba(231,76,60,0.12) 0%, transparent 70%)', chipBg: 'rgba(231,76,60,0.16)', chipBorder: 'rgba(231,76,60,0.28)', chipText: '#fc8a7a', stepDone: '#fc8a7a', stepIdle: 'rgba(200,218,255,0.10)', useDisplay: false, features: [{ title: 'Estilo Gentleman', description: 'Agenda y barberos premium' }, { title: 'Reportes de Caja', description: 'Control financiero completo' }, { title: 'Clientes Fieles', description: 'Historial y fidelización' }],
  },

  /* ── SALONES ───────────────────────────────────────────────────────── */

  'salon-rose': {
    sectorLabel: 'Salon', eyebrow: 'Beauty studio', helperEmpresa: 'Ingresa el codigo de tu salon', helperAcceso: 'Accede a tu cabina digital', headerName: 'Speeddan Salon', companyLabel: 'Codigo del salon', companyPlaceholder: 'ej: studio-rosa', footerNote: 'Speeddan Beauty · Plataforma segura', heroFooter: 'ERP Multi-tenant para salones', tagline: 'Sistema de gestion para salones de belleza', accentA: '#8B1E4F', accentB: '#E06F98', glow: 'rgba(224,111,152,0.34)', focus: 'rgba(224,111,152,0.74)', text: '#fff8fb', muted: 'rgba(255,228,238,0.68)', labelColor: 'rgba(255,228,238,0.74)', card: 'rgba(255,250,252,0.065)', cardBorder: 'rgba(255,220,232,0.16)', input: 'rgba(255,245,249,0.08)', inputBorder: 'rgba(255,220,232,0.20)', leftBase: '#54142e', rightBase: '#2a0c19', leftImage: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1400&q=80', rightImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1400&q=80', leftOverlay: 'linear-gradient(145deg, rgba(67,10,28,0.42) 0%, rgba(103,19,47,0.34) 48%, rgba(230,121,159,0.22) 100%)', rightOverlay: 'linear-gradient(160deg, rgba(43,8,24,0.86) 0%, rgba(79,15,44,0.78) 52%, rgba(122,24,69,0.82) 100%)', leftOrb: 'radial-gradient(circle, rgba(231,111,152,0.24) 0%, transparent 72%)', rightOrb: 'radial-gradient(circle, rgba(252,198,217,0.16) 0%, transparent 72%)', chipBg: 'rgba(255,214,226,0.16)', chipBorder: 'rgba(255,214,226,0.24)', chipText: '#ffd6e2', stepDone: '#f9a8d4', stepIdle: 'rgba(255,233,242,0.12)', useDisplay: true, features: [{ title: 'Agenda de Belleza', description: 'Cabello, unas, maquillaje y spa' }, { title: 'Cabinas y Caja', description: 'Control diario de servicios y pagos' }, { title: 'Clientes VIP', description: 'Historial de color y preferencias' }],
  },

  'salon-lila': {
    sectorLabel: 'Salon', eyebrow: 'Beauty lounge', helperEmpresa: 'Ingresa el codigo de tu salon', helperAcceso: 'Accede a tu cabina digital', headerName: 'Speeddan Salon', companyLabel: 'Codigo del salon', companyPlaceholder: 'ej: studio-lila', footerNote: 'Speeddan Beauty · Plataforma segura', heroFooter: 'ERP Multi-tenant para salones', tagline: 'Elegancia y estilo en cada servicio', accentA: '#5b3d8a', accentB: '#a78bfa', glow: 'rgba(167,139,250,0.36)', focus: 'rgba(167,139,250,0.74)', text: '#fdf8ff', muted: 'rgba(237,228,255,0.68)', labelColor: 'rgba(237,228,255,0.74)', card: 'rgba(250,248,255,0.065)', cardBorder: 'rgba(210,195,255,0.16)', input: 'rgba(240,235,255,0.08)', inputBorder: 'rgba(210,195,255,0.20)', leftBase: 'hsl(262 45% 8%)', rightBase: 'hsl(262 45% 4%)', leftImage: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1400&q=80', rightImage: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=1400&q=80', leftOverlay: 'linear-gradient(145deg, rgba(28,12,58,0.44) 0%, rgba(52,24,100,0.36) 48%, rgba(140,100,220,0.20) 100%)', rightOverlay: 'linear-gradient(160deg, rgba(18,8,38,0.88) 0%, rgba(36,16,74,0.82) 52%, rgba(56,26,108,0.86) 100%)', leftOrb: 'radial-gradient(circle, rgba(167,139,250,0.22) 0%, transparent 72%)', rightOrb: 'radial-gradient(circle, rgba(196,181,253,0.14) 0%, transparent 72%)', chipBg: 'rgba(196,181,253,0.16)', chipBorder: 'rgba(196,181,253,0.24)', chipText: '#c4b5fd', stepDone: '#c4b5fd', stepIdle: 'rgba(230,224,255,0.12)', useDisplay: true, features: [{ title: 'Estilo & Color', description: 'Tintes, mechas y tratamientos' }, { title: 'Agenda Digital', description: 'Cabinas y turnos en tiempo real' }, { title: 'Clientas VIP', description: 'Historial de color y preferencias' }],
  },

  'salon-dorado': {
    sectorLabel: 'Salon', eyebrow: 'Luxury studio', helperEmpresa: 'Ingresa el codigo de tu salon', helperAcceso: 'Accede a tu cabina digital', headerName: 'Speeddan Salon', companyLabel: 'Codigo del salon', companyPlaceholder: 'ej: studio-gold', footerNote: 'Speeddan Beauty · Plataforma segura', heroFooter: 'ERP Multi-tenant para salones', tagline: 'Lujo y sofisticacion en cada detalle', accentA: '#7a5c1e', accentB: '#c9a84c', glow: 'rgba(201,168,76,0.36)', focus: 'rgba(201,168,76,0.74)', text: '#fffbf0', muted: 'rgba(255,243,210,0.68)', labelColor: 'rgba(255,240,200,0.74)', card: 'rgba(255,252,240,0.065)', cardBorder: 'rgba(230,200,120,0.16)', input: 'rgba(255,248,220,0.08)', inputBorder: 'rgba(230,200,120,0.20)', leftBase: 'hsl(40 58% 7%)', rightBase: 'hsl(40 52% 3%)', leftImage: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=1400&q=80', rightImage: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=1400&q=80', leftOverlay: 'linear-gradient(145deg, rgba(38,24,4,0.48) 0%, rgba(72,46,8,0.40) 48%, rgba(180,140,40,0.20) 100%)', rightOverlay: 'linear-gradient(160deg, rgba(24,15,3,0.90) 0%, rgba(48,30,6,0.84) 52%, rgba(72,48,10,0.88) 100%)', leftOrb: 'radial-gradient(circle, rgba(201,168,76,0.22) 0%, transparent 72%)', rightOrb: 'radial-gradient(circle, rgba(218,190,110,0.14) 0%, transparent 72%)', chipBg: 'rgba(218,190,110,0.16)', chipBorder: 'rgba(218,190,110,0.26)', chipText: '#dab86e', stepDone: '#dab86e', stepIdle: 'rgba(240,220,160,0.12)', useDisplay: true, features: [{ title: 'Belleza Premium', description: 'Servicios exclusivos de lujo' }, { title: 'Agenda VIP', description: 'Cabinas y turnos prioritarios' }, { title: 'Clientes Gold', description: 'Programa de fidelización premium' }],
  },

  'salon-esmeralda': {
    sectorLabel: 'Salon', eyebrow: 'Wellness & spa', helperEmpresa: 'Ingresa el codigo de tu salon', helperAcceso: 'Accede a tu cabina digital', headerName: 'Speeddan Salon', companyLabel: 'Codigo del salon', companyPlaceholder: 'ej: studio-spa', footerNote: 'Speeddan Beauty · Plataforma segura', heroFooter: 'ERP Multi-tenant para salones', tagline: 'Bienestar natural en cada tratamiento', accentA: '#1a5740', accentB: '#2d8a65', glow: 'rgba(45,138,101,0.36)', focus: 'rgba(45,138,101,0.74)', text: '#f0fff8', muted: 'rgba(210,245,228,0.68)', labelColor: 'rgba(210,245,228,0.74)', card: 'rgba(240,255,248,0.065)', cardBorder: 'rgba(150,220,185,0.16)', input: 'rgba(220,248,234,0.08)', inputBorder: 'rgba(150,220,185,0.20)', leftBase: 'hsl(158 55% 7%)', rightBase: 'hsl(158 50% 3%)', leftImage: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1400&q=80', rightImage: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1400&q=80', leftOverlay: 'linear-gradient(145deg, rgba(6,26,18,0.50) 0%, rgba(14,50,34,0.42) 48%, rgba(40,110,76,0.22) 100%)', rightOverlay: 'linear-gradient(160deg, rgba(4,18,12,0.90) 0%, rgba(10,36,26,0.84) 52%, rgba(18,58,42,0.88) 100%)', leftOrb: 'radial-gradient(circle, rgba(45,138,101,0.22) 0%, transparent 72%)', rightOrb: 'radial-gradient(circle, rgba(80,180,140,0.14) 0%, transparent 72%)', chipBg: 'rgba(80,180,140,0.16)', chipBorder: 'rgba(80,180,140,0.26)', chipText: '#50b48c', stepDone: '#50b48c', stepIdle: 'rgba(170,230,200,0.12)', useDisplay: true, features: [{ title: 'Spa & Bienestar', description: 'Masajes, faciales y relajacion' }, { title: 'Agenda de Cabinas', description: 'Control de turnos y servicios' }, { title: 'Clientes Fieles', description: 'Historial de tratamientos' }],
  },
};

function getDefaultTheme(businessType?: 'BARBERIA' | 'SALON'): LoginTheme {
  if (businessType === 'SALON') return 'salon-rose';
  if (businessType === 'BARBERIA') return 'barberia-teal';
  return 'neutral';
}

const featureIcons = [CalendarIcon, ChartIcon, UsersIcon];

export default function LoginClient({
  initialBranding,
  initialTenant,
  initialStep,
}: {
  initialBranding: BrandingConfig | null;
  initialTenant?: TenantInfo | null;
  initialStep?: Step;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(initialStep ?? 'empresa');

  // Determinar tema inicial desde themeConfig.loginTheme, businessType, o localStorage
  const getInitialTheme = (): LoginTheme => {
    if (initialTenant) {
      const saved = initialTenant.themeConfig?.loginTheme as LoginTheme | undefined;
      return saved && saved in SECTORS ? saved : getDefaultTheme(initialTenant.businessType);
    }
    return 'neutral';
  };

  const [sector, setSector] = useState<LoginTheme>(getInitialTheme);
  const [slug, setSlug] = useState(initialTenant?.slug ?? '');
  const [tenant, setTenant] = useState<TenantInfo | null>(initialTenant ?? null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const branding = initialBranding;

  // Fix flash morado: sincronizar sector desde localStorage ANTES del primer paint
  useLayoutEffect(() => {
    if (initialTenant) return; // /login/[slug] ya tiene el tema correcto desde el servidor
    const saved = window.localStorage.getItem('barber_last_sector') as LoginTheme | null;
    if (saved && saved in SECTORS && saved !== 'neutral') {
      setSector(saved);
    }
  }, []);

  useEffect(() => {
    if (!tenant?.themeConfig) return;
    const root = document.documentElement;
    Object.entries(tenant.themeConfig).forEach(([k, v]) => root.style.setProperty(k, v as string));
    return () => Object.keys(tenant.themeConfig).forEach((k) => root.style.removeProperty(k));
  }, [tenant]);

  useEffect(() => {
    // Si ya llegó con tenant precargado (ruta /login/[slug]) no sobreescribir
    if (initialTenant) return;
    const saved = window.localStorage.getItem('barber_last_tenant');
    if (!saved) return;
    setSlug(saved);
    setLoading(true);
    fetch(`/api/tenant/verify?slug=${saved}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.data) {
          setTenant(data.data);
          const themeFromConfig = data.data.themeConfig?.loginTheme as LoginTheme | undefined;
          const nextTheme = (themeFromConfig && themeFromConfig in SECTORS)
            ? themeFromConfig
            : getDefaultTheme(data.data.businessType);
          setSector(nextTheme);
          window.localStorage.setItem('barber_last_sector', nextTheme);
          setStep('credenciales');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const theme = SECTORS[sector];
  const isSalon = sector.startsWith('salon-');
  const isNeutral = sector === 'neutral';

  const brandName = branding?.brandName || DEFAULT_BRANDING.brandName;
  const brandTagline = isSalon ? theme.tagline : branding?.tagline || DEFAULT_BRANDING.tagline;
  const features = isSalon ? theme.features : (branding?.features?.length === 3 ? branding.features : DEFAULT_BRANDING.features);
  const heading = tenant?.name ?? (isNeutral ? (branding ? brandName : '') : theme.headerName);

  const setInputState = (element: HTMLInputElement, focused: boolean) => {
    element.style.borderColor = focused ? theme.focus : theme.inputBorder;
    element.style.background = focused ? 'rgba(255,255,255,0.11)' : theme.input;
    element.style.boxShadow = focused ? `0 0 0 3px ${theme.glow}` : 'none';
  };

  const handleChangeClave = () => {
    window.localStorage.removeItem('barber_last_tenant');
    window.localStorage.removeItem('barber_last_sector');
    setSlug('');
    setTenant(null);
    setSector('neutral');
    setStep('empresa');
    setEmail('');
    setPassword('');
    setError(null);
  };

  const switchSector = (next: LoginTheme) => {
    setSector(next);
    setStep('empresa');
    setTenant(null);
    setEmail('');
    setPassword('');
    setError(null);
    window.localStorage.setItem('barber_last_sector', next);
  };

  const handleVerifyEmpresa = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!slug.trim()) return setError(`Ingresa el ${isSalon ? 'codigo del salon' : 'codigo de empresa'}`);
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/tenant/verify?slug=${slug.trim().toLowerCase()}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? 'Empresa no encontrada');
      setTenant(payload.data);
      const themeFromConfig = payload.data.themeConfig?.loginTheme as LoginTheme | undefined;
      const nextTheme = (themeFromConfig && themeFromConfig in SECTORS)
        ? themeFromConfig
        : getDefaultTheme(payload.data.businessType);
      setSector(nextTheme);
      window.localStorage.setItem('barber_last_sector', nextTheme);
      setStep('credenciales');
    } catch (caughtError: any) {
      setError(caughtError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password) return setError('Usuario y contraseña son requeridos');
    setError(null);
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, slug: slug.trim().toLowerCase() }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? 'Credenciales invalidas');
      window.localStorage.setItem('barber_last_tenant', slug.trim().toLowerCase());
      router.push('/dashboard');
    } catch (caughtError: any) {
      setError(caughtError.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', background: theme.input, border: `1.5px solid ${theme.inputBorder}`, borderRadius: 12, fontSize: 14, color: theme.text, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.18s, background 0.18s, box-shadow 0.18s', fontFamily: 'var(--font-sans)',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700, color: theme.labelColor, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.7px',
  };
  const buttonStyle: React.CSSProperties = {
    padding: '13px', background: loading ? `${theme.accentB}66` : `linear-gradient(135deg, ${theme.accentA} 0%, ${theme.accentB} 100%)`, color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, width: '100%', cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.2px', fontFamily: 'var(--font-sans)', boxShadow: loading ? 'none' : `0 12px 28px ${theme.glow}`,
  };
  const glassCard = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    background: isSalon ? 'rgba(255,248,251,0.13)' : 'rgba(255,255,255,0.12)', backdropFilter: 'blur(20px) saturate(1.5)', WebkitBackdropFilter: 'blur(20px) saturate(1.5)', border: isSalon ? '1px solid rgba(255,223,234,0.22)' : '1px solid rgba(255,255,255,0.24)', borderRadius: 18, boxShadow: isSalon ? '0 10px 34px rgba(28,8,17,0.26), inset 0 1px 0 rgba(255,240,246,0.18)' : '0 8px 32px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.18)', ...extra,
  });

  return (
    <main style={{ minHeight: '100vh', display: 'flex', fontFamily: 'var(--font-sans)' }}>
      <div className="login-left-panel" style={{ display: 'none', width: '48%', flexShrink: 0, background: theme.leftBase, position: 'relative', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '60px 48px' }}>
        <div style={{ position: 'absolute', inset: '-8px', zIndex: 0, backgroundImage: `url("${theme.leftImage}")`, backgroundSize: 'cover', backgroundPosition: 'center', filter: isSalon ? 'blur(0.5px) brightness(0.72) saturate(1.05)' : 'blur(0.5px) brightness(0.68) saturate(1.10)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: theme.leftOverlay }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', backgroundImage: isSalon ? 'repeating-linear-gradient(120deg, rgba(255,235,242,0.03) 0px, rgba(255,235,242,0.03) 1px, transparent 1px, transparent 54px), repeating-linear-gradient(30deg, rgba(255,235,242,0.02) 0px, rgba(255,235,242,0.02) 1px, transparent 1px, transparent 54px)' : 'repeating-linear-gradient(45deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 52px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 52px)' }} />
        <div className="orb-top" style={{ position: 'absolute', top: -120, right: -80, zIndex: 3, width: 400, height: 400, borderRadius: '50%', background: theme.leftOrb, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -60, zIndex: 3, width: 300, height: 300, borderRadius: '50%', background: isSalon ? 'radial-gradient(circle, rgba(130,24,66,0.26) 0%, transparent 72%)' : 'radial-gradient(circle, rgba(22,46,42,0.30) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 5, width: '100%', maxWidth: 430 }}>
          <div className="anim-fade-up" style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 72, height: 72, borderRadius: 22, marginBottom: 18, background: isSalon ? 'linear-gradient(135deg, rgba(255,223,234,0.22) 0%, rgba(224,111,152,0.18) 100%)' : 'rgba(255,255,255,0.16)', backdropFilter: 'blur(24px) saturate(1.6)', WebkitBackdropFilter: 'blur(24px) saturate(1.6)', border: isSalon ? '1px solid rgba(255,223,234,0.28)' : '1px solid rgba(255,255,255,0.30)', boxShadow: isSalon ? '0 14px 40px rgba(32,10,19,0.32), inset 0 1px 0 rgba(255,243,247,0.24)' : '0 12px 40px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.28)' }}>
              {isNeutral ? <StoreIcon size={32} color="white" strokeWidth={1.5} /> : isSalon ? <Sparkles size={32} color="white" strokeWidth={2.1} /> : <ScissorsIcon size={34} color="white" strokeWidth={1.5} />}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '7px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', border: isSalon ? '1px solid rgba(255,223,234,0.18)' : '1px solid rgba(255,255,255,0.14)', color: isSalon ? '#ffe0ea' : 'rgba(255,255,255,0.72)', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: isSalon ? '#ffd1e0' : '#4ade80', boxShadow: isSalon ? '0 0 8px rgba(255,209,224,0.85)' : '0 0 8px #4ade80' }} />
              {theme.eyebrow}
            </div>
            <h1 style={{ fontSize: isSalon ? 48 : 42, fontWeight: isSalon ? 700 : 900, margin: '0 0 8px', letterSpacing: isSalon ? '-0.04em' : '-1px', lineHeight: 1, fontFamily: theme.useDisplay ? 'var(--font-playfair), Georgia, serif' : 'var(--font-sans)', color: theme.useDisplay ? 'transparent' : '#fff', background: theme.useDisplay ? 'linear-gradient(135deg, #fff7fb 0%, #ffdce8 45%, #ffc7d8 100%)' : undefined, WebkitBackgroundClip: theme.useDisplay ? 'text' : undefined, backgroundClip: theme.useDisplay ? 'text' : undefined, textShadow: theme.useDisplay ? 'none' : '0 2px 12px rgba(0,0,0,0.4)' }}>{brandName}</h1>
            <div style={{ width: isSalon ? 140 : 112, height: 1, margin: '0 auto 12px', background: isSalon ? 'linear-gradient(90deg, rgba(255,212,228,0.18) 0%, rgba(224,111,152,0.12) 100%)' : 'linear-gradient(90deg, rgba(100,152,175,0.18) 0%, rgba(255,255,255,0.12) 100%)' }} />
            <p style={{ fontSize: 15, color: isSalon ? 'rgba(255,236,243,0.82)' : 'rgba(255,255,255,0.75)', margin: 0, fontWeight: 400 }}>{brandTagline}</p>
          </div>

          {featureIcons.map((Icon, index) => (
            <div key={index} className={['float-a', 'float-b', 'float-c'][index]} style={{ ...glassCard({ padding: '14px 20px', marginBottom: index < 2 ? 14 : 0 }), display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 13, flexShrink: 0, background: isSalon ? 'rgba(255,232,240,0.12)' : 'rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon stroke={isSalon ? 'rgba(255,238,244,0.92)' : 'rgba(255,255,255,0.90)'} /></div>
              <div><div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{features[index]?.title}</div><div style={{ color: isSalon ? 'rgba(255,231,239,0.68)' : 'rgba(255,255,255,0.60)', fontSize: 12, marginTop: 2 }}>{features[index]?.description}</div></div>
              <div style={{ marginLeft: 'auto', background: theme.chipBg, border: `1px solid ${theme.chipBorder}`, borderRadius: 999, padding: '3px 10px', fontSize: 11, color: theme.chipText, fontWeight: 700, whiteSpace: 'nowrap' }}>Activo</div>
            </div>
          ))}

          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', border: isSalon ? '1px solid rgba(255,223,234,0.16)' : '1px solid rgba(255,255,255,0.14)', borderRadius: 999, padding: '8px 18px' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: isSalon ? '#ffd1e0' : '#4ade80', boxShadow: isSalon ? '0 0 8px rgba(255,209,224,0.85)' : '0 0 8px #4ade80' }} />
              <span style={{ color: isSalon ? 'rgba(255,235,242,0.82)' : 'rgba(255,255,255,0.78)', fontSize: 12, fontWeight: 500 }}>{theme.heroFooter}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', minHeight: '100vh', background: theme.rightBase, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: '-8px', zIndex: 0, pointerEvents: 'none', backgroundImage: `url("${theme.rightImage}")`, backgroundSize: 'cover', backgroundPosition: isSalon ? 'center' : 'center top', filter: isSalon ? 'blur(0.4px) brightness(0.65) saturate(0.96)' : 'blur(0.5px) brightness(0.72) saturate(0.85)' }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: theme.rightOverlay, opacity: 0.60 }} />
        <div style={{ position: 'absolute', top: -80, right: -80, width: 360, height: 360, borderRadius: '50%', pointerEvents: 'none', zIndex: 2, background: theme.rightOrb }} />

        <div style={{ width: '100%', maxWidth: 430, position: 'relative', zIndex: 5 }}>

          <div style={{ textAlign: 'center', marginBottom: 34 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 58, height: 58, marginBottom: 18, background: `linear-gradient(135deg, ${theme.accentA} 0%, ${theme.accentB} 100%)`, borderRadius: 18, boxShadow: `0 14px 30px ${theme.glow}` }}>
              {isNeutral ? <StoreIcon size={26} color="white" strokeWidth={1.6} /> : isSalon ? <Sparkles size={26} color="white" strokeWidth={2.1} /> : <ScissorsIcon size={26} color="white" strokeWidth={1.8} />}
            </div>
            <h1 style={{ fontSize: isSalon ? 24 : 22, fontWeight: 700, color: theme.text, margin: '0 0 4px', letterSpacing: isSalon ? '-0.03em' : '-0.3px', fontFamily: theme.useDisplay ? 'var(--font-playfair), Georgia, serif' : 'var(--font-sans)' }}>{heading}</h1>
            <p style={{ fontSize: 13, color: theme.muted, margin: 0 }}>{step === 'empresa' ? theme.helperEmpresa : theme.helperAcceso}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: step === 'empresa' ? `linear-gradient(135deg, ${theme.accentA}, ${theme.accentB})` : theme.stepDone, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', boxShadow: step === 'empresa' ? `0 0 14px ${theme.glow}` : `0 0 12px ${theme.stepDone}` }}>{step === 'credenciales' ? 'OK' : '1'}</div>
              <span style={{ fontSize: 12, fontWeight: step === 'empresa' ? 700 : 400, color: step === 'empresa' ? theme.text : theme.muted }}>Empresa</span>
            </div>
            <div style={{ width: 40, height: 1.5, background: step === 'credenciales' ? `linear-gradient(90deg, ${theme.accentA}, ${theme.accentB})` : 'rgba(255,255,255,0.15)', borderRadius: 2 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: step === 'credenciales' ? `linear-gradient(135deg, ${theme.accentA}, ${theme.accentB})` : theme.stepIdle, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: step === 'credenciales' ? '#fff' : theme.muted, border: step === 'credenciales' ? 'none' : `1px solid ${theme.cardBorder}`, boxShadow: step === 'credenciales' ? `0 0 14px ${theme.glow}` : 'none' }}>2</div>
              <span style={{ fontSize: 12, fontWeight: step === 'credenciales' ? 700 : 400, color: step === 'credenciales' ? theme.text : theme.muted }}>Acceso</span>
            </div>
          </div>

          <div style={{ background: theme.card, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderRadius: 18, border: `1px solid ${theme.cardBorder}`, padding: '32px 28px', boxShadow: isSalon ? '0 14px 50px rgba(20,6,12,0.34)' : '0 8px 40px rgba(0,0,0,0.35)' }}>
            {error && <div style={{ padding: '10px 14px', background: 'rgba(127,29,29,0.16)', border: '1px solid rgba(248,113,113,0.34)', borderRadius: 10, fontSize: 13, color: '#fecdd3', marginBottom: 20 }}>{error}</div>}

            {step === 'empresa' && (
              <form onSubmit={handleVerifyEmpresa} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={labelStyle}>{theme.companyLabel}</label>
                  <input type="text" value={slug} onChange={(event) => setSlug(event.target.value)} placeholder={theme.companyPlaceholder} autoFocus style={inputStyle} onFocus={(event) => setInputState(event.target, true)} onBlur={(event) => setInputState(event.target, false)} />
                </div>
                <button type="submit" disabled={loading} style={buttonStyle}>{loading ? 'Verificando...' : 'Continuar ->'}</button>
              </form>
            )}

            {step === 'credenciales' && (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={labelStyle}>Usuario o email</label>
                  <input type="text" value={email} onChange={(event) => setEmail(event.target.value)} autoFocus autoComplete="username" style={inputStyle} onFocus={(event) => setInputState(event.target, true)} onBlur={(event) => setInputState(event.target, false)} />
                </div>
                <div>
                  <label style={labelStyle}>Contrasena</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPass ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" style={{ ...inputStyle, paddingRight: 44 }} onFocus={(event) => setInputState(event.target, true)} onBlur={(event) => setInputState(event.target, false)} />
                    <button type="button" onClick={() => setShowPass((current) => !current)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: theme.muted, display: 'flex', alignItems: 'center', padding: 0 }}>{showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                </div>
                <button type="submit" disabled={loading} style={buttonStyle}>{loading ? 'Ingresando...' : 'Ingresar'}</button>
                <div style={{ textAlign: 'center', marginTop: -8 }}>
                  <button type="button" onClick={handleChangeClave} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.muted, fontSize: 12, fontFamily: 'var(--font-sans)', textDecoration: 'underline', textUnderlineOffset: 3, opacity: 0.7 }}>
                    Clave
                  </button>
                </div>
              </form>
            )}
          </div>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: theme.muted }}>{theme.footerNote}</p>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) { .login-left-panel { display: flex !important; } }
        @keyframes floatA { 0%, 100% { transform: translateY(0px) rotate(-0.5deg); } 50% { transform: translateY(-10px) rotate(0.5deg); } }
        @keyframes floatB { 0%, 100% { transform: translateY(0px) rotate(0.5deg); } 50% { transform: translateY(-8px) rotate(-0.5deg); } }
        @keyframes floatC { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes orbPulse { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }
        .float-a { animation: floatA 5s ease-in-out infinite; }
        .float-b { animation: floatB 6.5s ease-in-out infinite; animation-delay: 1s; }
        .float-c { animation: floatC 7s ease-in-out infinite; animation-delay: 2s; }
        .anim-fade-up { animation: fadeUp 0.7s ease both; }
        .orb-top { animation: orbPulse 8s ease-in-out infinite; }
        input::placeholder { color: inherit; opacity: 0.78; }
      `}</style>
    </main>
  );
}
