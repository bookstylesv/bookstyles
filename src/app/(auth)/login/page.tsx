'use client';

import { Playfair_Display } from 'next/font/google';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type Step = 'empresa' | 'credenciales';
type Sector = 'barberia' | 'salon';
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

const displayFont = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['600', '700', '800'],
});

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

const SECTORS = {
  barberia: {
    sectorLabel: 'Barberia', eyebrow: 'Barber premium', helperEmpresa: 'Ingresa el codigo de tu barberia', helperAcceso: 'Accede a tu cuenta', headerName: 'Speeddan Barberia', companyLabel: 'Codigo de empresa', companyPlaceholder: 'ej: mi-barberia', footerNote: 'Speeddan ERP Â· Sistema seguro', heroFooter: 'ERP Multi-tenant para barberias', tagline: 'Sistema de gestion para barberias', accentA: '#5D6474', accentB: '#6498AF', glow: 'rgba(100,152,175,0.36)', focus: 'rgba(100,152,175,0.72)', text: '#ffffff', muted: 'rgba(255,255,255,0.56)', labelColor: 'rgba(255,255,255,0.54)', card: 'rgba(255,255,255,0.055)', cardBorder: 'rgba(255,255,255,0.10)', input: 'rgba(255,255,255,0.07)', inputBorder: 'rgba(255,255,255,0.16)', leftBase: 'hsl(175 60% 18%)', rightBase: 'hsl(175 60% 8%)', leftImage: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1400&q=80', rightImage: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1400&q=80', leftOverlay: 'linear-gradient(145deg, rgba(11,31,28,0.42) 0%, rgba(22,46,42,0.35) 50%, rgba(100,152,175,0.28) 100%)', rightOverlay: 'linear-gradient(160deg, rgba(11,31,28,0.78) 0%, rgba(15,42,38,0.72) 50%, rgba(22,46,42,0.80) 100%)', leftOrb: 'radial-gradient(circle, rgba(100,152,175,0.18) 0%, transparent 70%)', rightOrb: 'radial-gradient(circle, rgba(100,152,175,0.12) 0%, transparent 70%)', chipBg: 'rgba(74,222,128,0.18)', chipBorder: 'rgba(74,222,128,0.30)', chipText: '#4ade80', stepDone: '#4ade80', stepIdle: 'rgba(255,255,255,0.10)', useDisplay: false, features: DEFAULT_BRANDING.features,
  },
  salon: {
    sectorLabel: 'Salon', eyebrow: 'Beauty studio', helperEmpresa: 'Ingresa el codigo de tu salon', helperAcceso: 'Accede a tu cabina digital', headerName: 'Speeddan Salon', companyLabel: 'Codigo del salon', companyPlaceholder: 'ej: studio-rosa', footerNote: 'Speeddan Beauty Â· Plataforma segura', heroFooter: 'ERP Multi-tenant para salones', tagline: 'Sistema de gestion para salones de belleza', accentA: '#8B1E4F', accentB: '#E06F98', glow: 'rgba(224,111,152,0.34)', focus: 'rgba(224,111,152,0.74)', text: '#fff8fb', muted: 'rgba(255,228,238,0.68)', labelColor: 'rgba(255,228,238,0.74)', card: 'rgba(255,250,252,0.065)', cardBorder: 'rgba(255,220,232,0.16)', input: 'rgba(255,245,249,0.08)', inputBorder: 'rgba(255,220,232,0.20)', leftBase: '#54142e', rightBase: '#2a0c19', leftImage: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1400&q=80', rightImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1400&q=80', leftOverlay: 'linear-gradient(145deg, rgba(67,10,28,0.42) 0%, rgba(103,19,47,0.34) 48%, rgba(230,121,159,0.22) 100%)', rightOverlay: 'linear-gradient(160deg, rgba(43,8,24,0.86) 0%, rgba(79,15,44,0.78) 52%, rgba(122,24,69,0.82) 100%)', leftOrb: 'radial-gradient(circle, rgba(231,111,152,0.24) 0%, transparent 72%)', rightOrb: 'radial-gradient(circle, rgba(252,198,217,0.16) 0%, transparent 72%)', chipBg: 'rgba(255,214,226,0.16)', chipBorder: 'rgba(255,214,226,0.24)', chipText: '#ffd6e2', stepDone: '#f9a8d4', stepIdle: 'rgba(255,233,242,0.12)', useDisplay: true, features: [{ title: 'Agenda de Belleza', description: 'Cabello, unas, maquillaje y spa' }, { title: 'Cabinas y Caja', description: 'Control diario de servicios y pagos' }, { title: 'Clientes VIP', description: 'Historial de color y preferencias' }],
  },
} as const;

function getStoredSector(): Sector {
  if (typeof window === 'undefined') return 'barberia';
  const saved = window.localStorage.getItem('speeddan_login_sector');
  return saved === 'salon' ? 'salon' : 'barberia';
}

const featureIcons = [CalendarIcon, ChartIcon, UsersIcon];

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('empresa');
  const [sector, setSector] = useState<Sector>(getStoredSector);
  const [slug, setSlug] = useState(() => typeof window !== 'undefined' ? window.localStorage.getItem('barber_last_tenant') ?? '' : '');
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);

  useEffect(() => {
    fetch('/api/public/branding').then((r) => (r.ok ? r.json() : null)).then((data) => { if (data) setBranding(data); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!tenant?.themeConfig) return;
    const root = document.documentElement;
    Object.entries(tenant.themeConfig).forEach(([k, v]) => root.style.setProperty(k, v as string));
    return () => Object.keys(tenant.themeConfig).forEach((k) => root.style.removeProperty(k));
  }, [tenant]);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('barber_last_tenant') : null;
    if (!saved) return;
    setLoading(true);
    fetch(`/api/tenant/verify?slug=${saved}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.data) {
          setTenant(data.data);
          setSector(data.data.businessType === 'SALON' ? 'salon' : 'barberia');
          setStep('credenciales');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const theme = SECTORS[sector];
  const brandName = branding.brandName || DEFAULT_BRANDING.brandName;
  const brandTagline = sector === 'salon' ? theme.tagline : branding.tagline || DEFAULT_BRANDING.tagline;
  const features = sector === 'salon' ? theme.features : (branding.features?.length === 3 ? branding.features : DEFAULT_BRANDING.features);
  const heading = tenant?.name ?? theme.headerName;

  const setInputState = (element: HTMLInputElement, focused: boolean) => {
    element.style.borderColor = focused ? theme.focus : theme.inputBorder;
    element.style.background = focused ? 'rgba(255,255,255,0.11)' : theme.input;
    element.style.boxShadow = focused ? `0 0 0 3px ${theme.glow}` : 'none';
  };

  const handleChangeClave = () => {
    window.localStorage.removeItem('barber_last_tenant');
    setSlug('');
    setTenant(null);
    setStep('empresa');
    setError(null);
  };

  const switchSector = (next: Sector) => {
    setSector(next);
    setStep('empresa');
    setTenant(null);
    setEmail('');
    setPassword('');
    setError(null);
    window.localStorage.setItem('speeddan_login_sector', next);
  };

  const handleVerifyEmpresa = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!slug.trim()) return setError(`Ingresa el ${sector === 'salon' ? 'codigo del salon' : 'codigo de empresa'}`);
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/tenant/verify?slug=${slug.trim().toLowerCase()}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? 'Empresa no encontrada');
      setTenant(payload.data);
      const nextSector: Sector = payload.data.businessType === 'SALON' ? 'salon' : 'barberia';
      setSector(nextSector);
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
    background: sector === 'salon' ? 'rgba(255,248,251,0.13)' : 'rgba(255,255,255,0.12)', backdropFilter: 'blur(20px) saturate(1.5)', WebkitBackdropFilter: 'blur(20px) saturate(1.5)', border: sector === 'salon' ? '1px solid rgba(255,223,234,0.22)' : '1px solid rgba(255,255,255,0.24)', borderRadius: 18, boxShadow: sector === 'salon' ? '0 10px 34px rgba(28,8,17,0.26), inset 0 1px 0 rgba(255,240,246,0.18)' : '0 8px 32px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.18)', ...extra,
  });

  return (
    <main className={displayFont.variable} style={{ minHeight: '100vh', display: 'flex', fontFamily: 'var(--font-sans)' }}>
      <div className="login-left-panel" style={{ display: 'none', width: '48%', flexShrink: 0, background: theme.leftBase, position: 'relative', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '60px 48px' }}>
        <div style={{ position: 'absolute', inset: '-8px', zIndex: 0, backgroundImage: `url("${theme.leftImage}")`, backgroundSize: 'cover', backgroundPosition: 'center', filter: sector === 'salon' ? 'blur(0.5px) brightness(0.72) saturate(1.05)' : 'blur(0.5px) brightness(0.68) saturate(1.10)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: theme.leftOverlay }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', backgroundImage: sector === 'salon' ? 'repeating-linear-gradient(120deg, rgba(255,235,242,0.03) 0px, rgba(255,235,242,0.03) 1px, transparent 1px, transparent 54px), repeating-linear-gradient(30deg, rgba(255,235,242,0.02) 0px, rgba(255,235,242,0.02) 1px, transparent 1px, transparent 54px)' : 'repeating-linear-gradient(45deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 52px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 52px)' }} />
        <div className="orb-top" style={{ position: 'absolute', top: -120, right: -80, zIndex: 3, width: 400, height: 400, borderRadius: '50%', background: theme.leftOrb, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -60, zIndex: 3, width: 300, height: 300, borderRadius: '50%', background: sector === 'salon' ? 'radial-gradient(circle, rgba(130,24,66,0.26) 0%, transparent 72%)' : 'radial-gradient(circle, rgba(22,46,42,0.30) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 5, width: '100%', maxWidth: 430 }}>
          <div className="anim-fade-up" style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 72, height: 72, borderRadius: 22, marginBottom: 18, background: sector === 'salon' ? 'linear-gradient(135deg, rgba(255,223,234,0.22) 0%, rgba(224,111,152,0.18) 100%)' : 'rgba(255,255,255,0.16)', backdropFilter: 'blur(24px) saturate(1.6)', WebkitBackdropFilter: 'blur(24px) saturate(1.6)', border: sector === 'salon' ? '1px solid rgba(255,223,234,0.28)' : '1px solid rgba(255,255,255,0.30)', boxShadow: sector === 'salon' ? '0 14px 40px rgba(32,10,19,0.32), inset 0 1px 0 rgba(255,243,247,0.24)' : '0 12px 40px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.28)' }}>
              {sector === 'salon' ? <Sparkles size={32} color="white" strokeWidth={2.1} /> : <ScissorsIcon size={34} color="white" strokeWidth={1.5} />}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '7px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', border: sector === 'salon' ? '1px solid rgba(255,223,234,0.18)' : '1px solid rgba(255,255,255,0.14)', color: sector === 'salon' ? '#ffe0ea' : 'rgba(255,255,255,0.72)', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: sector === 'salon' ? '#ffd1e0' : '#4ade80', boxShadow: sector === 'salon' ? '0 0 8px rgba(255,209,224,0.85)' : '0 0 8px #4ade80' }} />
              {theme.eyebrow}
            </div>
            <h1 style={{ fontSize: sector === 'salon' ? 48 : 42, fontWeight: sector === 'salon' ? 700 : 900, margin: '0 0 8px', letterSpacing: sector === 'salon' ? '-0.04em' : '-1px', lineHeight: 1, fontFamily: theme.useDisplay ? 'var(--font-display), Georgia, serif' : 'var(--font-sans)', color: theme.useDisplay ? 'transparent' : '#fff', background: theme.useDisplay ? 'linear-gradient(135deg, #fff7fb 0%, #ffdce8 45%, #ffc7d8 100%)' : undefined, WebkitBackgroundClip: theme.useDisplay ? 'text' : undefined, backgroundClip: theme.useDisplay ? 'text' : undefined, textShadow: theme.useDisplay ? 'none' : '0 2px 12px rgba(0,0,0,0.4)' }}>{brandName}</h1>
            <div style={{ width: sector === 'salon' ? 140 : 112, height: 1, margin: '0 auto 12px', background: sector === 'salon' ? 'linear-gradient(90deg, rgba(255,212,228,0.18) 0%, rgba(224,111,152,0.12) 100%)' : 'linear-gradient(90deg, rgba(100,152,175,0.18) 0%, rgba(255,255,255,0.12) 100%)' }} />
            <p style={{ fontSize: 15, color: sector === 'salon' ? 'rgba(255,236,243,0.82)' : 'rgba(255,255,255,0.75)', margin: 0, fontWeight: 400 }}>{brandTagline}</p>
          </div>

          {featureIcons.map((Icon, index) => (
            <div key={index} className={['float-a', 'float-b', 'float-c'][index]} style={{ ...glassCard({ padding: '14px 20px', marginBottom: index < 2 ? 14 : 0 }), display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 13, flexShrink: 0, background: sector === 'salon' ? 'rgba(255,232,240,0.12)' : 'rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon stroke={sector === 'salon' ? 'rgba(255,238,244,0.92)' : 'rgba(255,255,255,0.90)'} /></div>
              <div><div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{features[index]?.title}</div><div style={{ color: sector === 'salon' ? 'rgba(255,231,239,0.68)' : 'rgba(255,255,255,0.60)', fontSize: 12, marginTop: 2 }}>{features[index]?.description}</div></div>
              <div style={{ marginLeft: 'auto', background: theme.chipBg, border: `1px solid ${theme.chipBorder}`, borderRadius: 999, padding: '3px 10px', fontSize: 11, color: theme.chipText, fontWeight: 700, whiteSpace: 'nowrap' }}>Activo</div>
            </div>
          ))}

          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', border: sector === 'salon' ? '1px solid rgba(255,223,234,0.16)' : '1px solid rgba(255,255,255,0.14)', borderRadius: 999, padding: '8px 18px' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: sector === 'salon' ? '#ffd1e0' : '#4ade80', boxShadow: sector === 'salon' ? '0 0 8px rgba(255,209,224,0.85)' : '0 0 8px #4ade80' }} />
              <span style={{ color: sector === 'salon' ? 'rgba(255,235,242,0.82)' : 'rgba(255,255,255,0.78)', fontSize: 12, fontWeight: 500 }}>{theme.heroFooter}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', minHeight: '100vh', background: theme.rightBase, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: '-8px', zIndex: 0, pointerEvents: 'none', backgroundImage: `url("${theme.rightImage}")`, backgroundSize: 'cover', backgroundPosition: sector === 'salon' ? 'center' : 'center top', filter: sector === 'salon' ? 'blur(0.4px) brightness(0.46) saturate(0.96)' : 'blur(0.5px) brightness(0.42) saturate(0.85)' }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: theme.rightOverlay }} />
        <div style={{ position: 'absolute', top: -80, right: -80, width: 360, height: 360, borderRadius: '50%', pointerEvents: 'none', zIndex: 2, background: theme.rightOrb }} />

        <div style={{ width: '100%', maxWidth: 430, position: 'relative', zIndex: 5 }}>
          {tenant === null && (
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: 5, borderRadius: 999, background: 'rgba(255,255,255,0.08)', border: sector === 'salon' ? '1px solid rgba(255,223,234,0.16)' : '1px solid rgba(255,255,255,0.14)', boxShadow: '0 12px 40px rgba(0,0,0,0.18)' }}>
                {(['barberia', 'salon'] as Sector[]).map((option) => {
                  const active = option === sector;
                  const optionTheme = SECTORS[option];
                  return <button key={option} type="button" onClick={() => switchSector(option)} style={{ border: 'none', cursor: 'pointer', borderRadius: 999, padding: '9px 14px', minWidth: 124, fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: active ? '#fff' : theme.muted, background: active ? `linear-gradient(135deg, ${optionTheme.accentA} 0%, ${optionTheme.accentB} 100%)` : 'transparent', boxShadow: active ? `0 10px 26px ${optionTheme.glow}` : 'none', transition: 'background 0.18s, color 0.18s' }}>{optionTheme.sectorLabel}</button>;
                })}
              </div>
              <p style={{ margin: '10px 0 0', fontSize: 12, color: theme.muted, letterSpacing: '0.02em' }}>El cliente elige la vista que mejor representa su negocio.</p>
            </div>
          )}

          <div style={{ textAlign: 'center', marginBottom: 34 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 58, height: 58, marginBottom: 18, background: `linear-gradient(135deg, ${theme.accentA} 0%, ${theme.accentB} 100%)`, borderRadius: 18, boxShadow: `0 14px 30px ${theme.glow}` }}>
              {sector === 'salon' ? <Sparkles size={26} color="white" strokeWidth={2.1} /> : <ScissorsIcon size={26} color="white" strokeWidth={1.8} />}
            </div>
            <h1 style={{ fontSize: sector === 'salon' ? 24 : 22, fontWeight: 700, color: theme.text, margin: '0 0 4px', letterSpacing: sector === 'salon' ? '-0.03em' : '-0.3px', fontFamily: theme.useDisplay ? 'var(--font-display), Georgia, serif' : 'var(--font-sans)' }}>{heading}</h1>
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

          <div style={{ background: theme.card, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderRadius: 18, border: `1px solid ${theme.cardBorder}`, padding: '32px 28px', boxShadow: sector === 'salon' ? '0 14px 50px rgba(20,6,12,0.34)' : '0 8px 40px rgba(0,0,0,0.35)' }}>
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


