/**
 * Login page — diseño split-screen premium.
 * Panel izquierdo: glassmorphism + patrón + animaciones CSS.
 * Panel derecho: formulario limpio en 2 pasos.
 * Toda la lógica de negocio intacta.
 */

'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Step = 'empresa' | 'credenciales';

type TenantInfo = {
  id:          number;
  slug:        string;
  name:        string;
  logoUrl:     string | null;
  status:      string;
  themeConfig: Record<string, string>;
};

/* ── SVG icons ────────────────────────────────────────────────────── */
function ScissorsIcon({ size = 32, color = 'currentColor', strokeWidth = 1.6 }: { size?: number; color?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

/* ── Componente principal ──────────────────────────────────────────── */
export default function LoginPage() {
  const router = useRouter();
  const [step,     setStep]     = useState<Step>('empresa');
  const [slug,     setSlug]     = useState(() => typeof window !== 'undefined' ? localStorage.getItem('barber_last_tenant') ?? '' : '');
  const [tenant,   setTenant]   = useState<TenantInfo | null>(null);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (!tenant?.themeConfig) return;
    const root = document.documentElement;
    Object.entries(tenant.themeConfig).forEach(([key, val]) => root.style.setProperty(key, val as string));
    return () => Object.keys(tenant.themeConfig).forEach(key => root.style.removeProperty(key));
  }, [tenant]);

  const handleVerifyEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim()) return setError('Ingresa el código de empresa');
    setError(null); setLoading(true);
    try {
      const res  = await fetch(`/api/tenant/verify?slug=${slug.trim().toLowerCase()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Empresa no encontrada');
      setTenant(json.data); setStep('credenciales');
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return setError('Email y contraseña son requeridos');
    setError(null); setLoading(true);
    try {
      const res  = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, slug: slug.trim().toLowerCase() }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Credenciales inválidas');
      localStorage.setItem('barber_last_tenant', slug.trim().toLowerCase());
      router.push('/dashboard');
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  /* ── Estilos reutilizables ── */
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px',
    background: 'hsl(var(--input-bg))',
    border: '1.5px solid hsl(var(--input-border))',
    borderRadius: 'var(--radius-md)',
    fontSize: 14, color: 'hsl(var(--input-text))',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
    fontFamily: 'var(--font-sans)',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600,
    color: 'hsl(var(--text-secondary))', marginBottom: 6,
    textTransform: 'uppercase', letterSpacing: '0.6px',
  };
  const submitBtnStyle: React.CSSProperties = {
    padding: '13px',
    background: loading ? 'hsl(var(--bg-muted))' : 'var(--gradient-hero)',
    color: '#ffffff', border: 'none',
    borderRadius: 'var(--radius-lg)',
    fontSize: 15, fontWeight: 700, width: '100%',
    cursor: loading ? 'not-allowed' : 'pointer',
    letterSpacing: '0.3px', transition: 'opacity 0.15s',
    fontFamily: 'var(--font-sans)',
  };

  /* ── Glass card helper ── */
  const glassCard = (style: React.CSSProperties = {}): React.CSSProperties => ({
    background: 'rgba(255,255,255,0.10)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.20)',
    borderRadius: 16,
    boxShadow: '0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.15)',
    ...style,
  });

  return (
    <main style={{ minHeight: '100vh', display: 'flex', fontFamily: 'var(--font-sans)', background: 'hsl(var(--bg-page))' }}>

      {/* ════════════════════════════════════════
          PANEL IZQUIERDO — glassmorphism hero
          ════════════════════════════════════════ */}
      <div
        className="login-left-panel"
        style={{
          display: 'none',
          width: '48%',
          flexShrink: 0,
          background: 'var(--gradient-hero)',
          position: 'relative',
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          padding: '60px 48px',
        }}
      >
        {/* ── Capa de patrón diagonal ── */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `
            repeating-linear-gradient(
              45deg,
              rgba(255,255,255,0.025) 0px,
              rgba(255,255,255,0.025) 1px,
              transparent 1px,
              transparent 48px
            ),
            repeating-linear-gradient(
              -45deg,
              rgba(255,255,255,0.02) 0px,
              rgba(255,255,255,0.02) 1px,
              transparent 1px,
              transparent 48px
            )
          `,
        }} />

        {/* ── Orbe brillante superior ── */}
        <div className="orb-top" style={{
          position: 'absolute', top: -120, right: -80,
          width: 380, height: 380, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        {/* ── Orbe inferior ── */}
        <div style={{
          position: 'absolute', bottom: -80, left: -60,
          width: 280, height: 280, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* ══ CONTENIDO CENTRAL ══ */}
        <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 420 }}>

          {/* Logo principal */}
          <div className="anim-fade-up" style={{ textAlign: 'center', marginBottom: 40 }}>
            {/* Ícono scissors premium */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 72, height: 72, borderRadius: 20, marginBottom: 20,
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.25)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}>
              <ScissorsIcon size={34} color="white" strokeWidth={1.5} />
            </div>

            <h1 style={{ fontSize: 42, fontWeight: 900, color: '#ffffff', margin: '0 0 8px', letterSpacing: '-1px', lineHeight: 1 }}>
              Speeddan
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.72)', margin: 0, fontWeight: 400, letterSpacing: '0.1px' }}>
              Sistema de gestión para barberías
            </p>
          </div>

          {/* ── Tarjetas flotantes de características ── */}

          {/* Card 1 — Citas */}
          <div className="float-a" style={{
            ...glassCard({ padding: '14px 20px', marginBottom: 14 }),
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CalendarIcon />
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>Gestión de Citas</div>
              <div style={{ color: 'rgba(255,255,255,0.60)', fontSize: 12, marginTop: 2 }}>Agenda online en tiempo real</div>
            </div>
            <div style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 600, whiteSpace: 'nowrap' }}>
              Activo
            </div>
          </div>

          {/* Card 2 — Reportes */}
          <div className="float-b" style={{
            ...glassCard({ padding: '14px 20px', marginBottom: 14 }),
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ChartIcon />
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>Reportes y Caja</div>
              <div style={{ color: 'rgba(255,255,255,0.60)', fontSize: 12, marginTop: 2 }}>Control financiero completo</div>
            </div>
            <div style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 600, whiteSpace: 'nowrap' }}>
              Activo
            </div>
          </div>

          {/* Card 3 — Clientes */}
          <div className="float-c" style={{
            ...glassCard({ padding: '14px 20px' }),
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UsersIcon />
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>Gestión de Clientes</div>
              <div style={{ color: 'rgba(255,255,255,0.60)', fontSize: 12, marginTop: 2 }}>Historial y fidelización</div>
            </div>
            <div style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 600, whiteSpace: 'nowrap' }}>
              Activo
            </div>
          </div>

          {/* ── Footer badge ── */}
          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 100, padding: '8px 18px',
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
              <span style={{ color: 'rgba(255,255,255,0.80)', fontSize: 12, fontWeight: 500 }}>
                ERP Multi-tenant para barberías
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          PANEL DERECHO — formulario
          ════════════════════════════════════════ */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', background: 'hsl(var(--bg-page))', minHeight: '100vh',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Header del formulario */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            {/* Logo limpio — scissors SVG en color primario */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 56, height: 56, marginBottom: 18,
              background: 'var(--gradient-hero)',
              borderRadius: 16,
              boxShadow: '0 6px 20px rgba(13,148,136,0.30)',
            }}>
              <ScissorsIcon size={26} color="white" strokeWidth={1.8} />
            </div>

            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'hsl(var(--text-primary))', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
              {tenant?.name ?? 'Speeddan Barbería'}
            </h1>
            <p style={{ fontSize: 13, color: 'hsl(var(--text-muted))', margin: 0 }}>
              {step === 'empresa' ? 'Ingresa el código de tu barbería' : 'Accede a tu cuenta'}
            </p>
          </div>

          {/* Indicador de pasos */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: step === 'empresa' ? 'var(--gradient-hero)' : 'hsl(var(--brand-primary))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#ffffff', flexShrink: 0,
              }}>
                {step === 'credenciales' ? '✓' : '1'}
              </div>
              <span style={{ fontSize: 12, fontWeight: step === 'empresa' ? 600 : 400, color: step === 'empresa' ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))' }}>
                Empresa
              </span>
            </div>
            <div style={{ width: 32, height: 1.5, background: step === 'credenciales' ? 'hsl(var(--brand-primary))' : 'hsl(var(--border-default))', transition: 'background 0.3s' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: step === 'credenciales' ? 'var(--gradient-hero)' : 'hsl(var(--border-default))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                color: step === 'credenciales' ? '#ffffff' : 'hsl(var(--text-muted))',
                flexShrink: 0,
              }}>
                2
              </div>
              <span style={{ fontSize: 12, fontWeight: step === 'credenciales' ? 600 : 400, color: step === 'credenciales' ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))' }}>
                Acceso
              </span>
            </div>
          </div>

          {/* Card del formulario */}
          <div style={{
            background: 'hsl(var(--bg-surface))',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid hsl(var(--border-default))',
            padding: '32px 32px',
            boxShadow: '0 4px 24px rgba(93,100,116,0.10)',
          }}>
            {error && (
              <div style={{
                padding: '10px 14px',
                background: 'hsl(var(--status-error-bg))',
                border: '1px solid hsl(var(--status-error))',
                borderRadius: 'var(--radius-md)',
                fontSize: 13, color: 'hsl(var(--status-error))', marginBottom: 20,
              }}>
                {error}
              </div>
            )}

            {/* PASO 1 — Código de empresa */}
            {step === 'empresa' && (
              <form onSubmit={handleVerifyEmpresa} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={labelStyle}>Código de empresa</label>
                  <input type="text" value={slug} onChange={e => setSlug(e.target.value)}
                    placeholder="ej: mi-barberia" autoFocus style={inputStyle} />
                </div>
                <button type="submit" disabled={loading} style={submitBtnStyle}>
                  {loading ? 'Verificando...' : 'Continuar →'}
                </button>
              </form>
            )}

            {/* PASO 2 — Email y contraseña */}
            {step === 'credenciales' && (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <button type="button"
                  onClick={() => { setStep('empresa'); setTenant(null); setError(null); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))', fontSize: 13, padding: 0, textAlign: 'left', marginBottom: -4, fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  ← Cambiar empresa
                </button>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    autoFocus autoComplete="email" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPass ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete="current-password"
                      style={{ ...inputStyle, paddingRight: 44 }} />
                    <button type="button" onClick={() => setShowPass(p => !p)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', padding: 0 }}>
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading} style={submitBtnStyle}>
                  {loading ? 'Ingresando...' : 'Ingresar'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* ── Estilos y animaciones ── */}
      <style>{`
        @media (min-width: 768px) {
          .login-left-panel { display: flex !important; }
        }

        /* Animaciones de flotación para las cards */
        @keyframes floatA {
          0%, 100% { transform: translateY(0px) rotate(-0.5deg); }
          50%       { transform: translateY(-10px) rotate(0.5deg); }
        }
        @keyframes floatB {
          0%, 100% { transform: translateY(0px) rotate(0.5deg); }
          50%       { transform: translateY(-8px) rotate(-0.5deg); }
        }
        @keyframes floatC {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-12px); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes orbPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.08); }
        }

        .float-a {
          animation: floatA 5s ease-in-out infinite;
        }
        .float-b {
          animation: floatB 6.5s ease-in-out infinite;
          animation-delay: 1s;
        }
        .float-c {
          animation: floatC 7s ease-in-out infinite;
          animation-delay: 2s;
        }
        .anim-fade-up {
          animation: fadeUp 0.7s ease both;
        }
        .orb-top {
          animation: orbPulse 8s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}
