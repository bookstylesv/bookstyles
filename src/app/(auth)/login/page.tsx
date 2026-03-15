/**
 * Login page — diseño split-screen premium (ARCTIC palette).
 * Paso 1: código de empresa (slug)
 * Paso 2: email + contraseña
 * Toda la lógica de negocio se preserva intacta.
 * Solo CSS variables — sin colores hardcodeados.
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

  // Aplicar tema del tenant si existe
  useEffect(() => {
    if (!tenant?.themeConfig) return;
    const root = document.documentElement;
    Object.entries(tenant.themeConfig).forEach(([key, val]) => {
      root.style.setProperty(key, val as string);
    });
    return () => {
      Object.keys(tenant.themeConfig).forEach(key => root.style.removeProperty(key));
    };
  }, [tenant]);

  const handleVerifyEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim()) return setError('Ingresa el código de empresa');
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/verify?slug=${slug.trim().toLowerCase()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Empresa no encontrada');
      setTenant(json.data);
      setStep('credenciales');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return setError('Email y contraseña son requeridos');
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password, slug: slug.trim().toLowerCase() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Credenciales inválidas');
      localStorage.setItem('barber_last_tenant', slug.trim().toLowerCase());
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Estilos reutilizables ── */
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    background: 'hsl(var(--input-bg))',
    border: '1.5px solid hsl(var(--input-border))',
    borderRadius: 'var(--radius-md)',
    fontSize: 14,
    color: 'hsl(var(--input-text))',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
    fontFamily: 'var(--font-sans)',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: 'hsl(var(--text-secondary))',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
  };

  const submitBtnStyle: React.CSSProperties = {
    padding: '13px',
    background: loading ? 'hsl(var(--bg-muted))' : 'var(--gradient-hero)',
    color: '#ffffff',
    border: 'none',
    borderRadius: 'var(--radius-lg)',
    fontSize: 15,
    fontWeight: 700,
    width: '100%',
    cursor: loading ? 'not-allowed' : 'pointer',
    letterSpacing: '0.3px',
    transition: 'opacity 0.15s',
    fontFamily: 'var(--font-sans)',
  };

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      fontFamily: 'var(--font-sans)',
      background: 'hsl(var(--bg-page))',
    }}>
      {/* ── LADO IZQUIERDO (oculto en móvil) ── */}
      <div style={{
        display: 'none',
        width: '45%',
        flexShrink: 0,
        background: 'var(--gradient-hero)',
        position: 'relative',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        padding: '60px 48px',
      }}
        className="login-left-panel"
      >
        {/* Círculos decorativos */}
        <div style={{
          position: 'absolute',
          top: -80,
          left: -80,
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: -60,
          right: -60,
          width: 260,
          height: 260,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          top: '55%',
          left: '60%',
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
          pointerEvents: 'none',
        }} />

        {/* Contenido central */}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 80, lineHeight: 1, marginBottom: 24 }}>✂️</div>
          <h1 style={{
            fontSize: 38,
            fontWeight: 800,
            color: '#ffffff',
            margin: '0 0 12px',
            letterSpacing: '-0.5px',
          }}>
            Speeddan
          </h1>
          <p style={{
            fontSize: 16,
            color: 'rgba(255,255,255,0.80)',
            margin: '0 0 48px',
            lineHeight: 1.5,
          }}>
            Gestiona tu barbería con estilo
          </p>

          {/* Chips de características */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {['📅 Citas', '👥 Clientes', '💳 Pagos'].map(chip => (
              <span key={chip} style={{
                padding: '8px 18px',
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.20)',
                borderRadius: 'var(--radius-full)',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '0.2px',
              }}>
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── LADO DERECHO (formulario) ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        background: 'hsl(var(--bg-page))',
        minHeight: '100vh',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 420,
        }}>
          {/* Header del formulario */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            {/* Logo / Ícono */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 52,
              height: 52,
              background: 'var(--gradient-hero)',
              borderRadius: 'var(--radius-lg)',
              fontSize: 22,
              marginBottom: 16,
              boxShadow: '0 4px 14px rgba(100, 152, 175, 0.35)',
            }}>
              ✂️
            </div>
            <h1 style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'hsl(var(--text-primary))',
              margin: '0 0 4px',
              letterSpacing: '-0.3px',
            }}>
              {tenant?.name ?? 'Speeddan Barbería'}
            </h1>
            <p style={{
              fontSize: 13,
              color: 'hsl(var(--text-muted))',
              margin: 0,
            }}>
              {step === 'empresa' ? 'Ingresa el código de tu barbería' : 'Accede a tu cuenta'}
            </p>
          </div>

          {/* Indicador de pasos */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 28,
          }}>
            {/* Paso 1 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: step === 'empresa'
                  ? 'var(--gradient-hero)'
                  : 'hsl(var(--brand-primary))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: '#ffffff',
                flexShrink: 0,
              }}>
                {step === 'credenciales' ? '✓' : '1'}
              </div>
              <span style={{
                fontSize: 12,
                fontWeight: step === 'empresa' ? 600 : 400,
                color: step === 'empresa' ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
              }}>
                Empresa
              </span>
            </div>
            {/* Línea */}
            <div style={{
              width: 32,
              height: 1.5,
              background: step === 'credenciales'
                ? 'hsl(var(--brand-primary))'
                : 'hsl(var(--border-default))',
              transition: 'background 0.3s',
            }} />
            {/* Paso 2 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: step === 'credenciales'
                  ? 'var(--gradient-hero)'
                  : 'hsl(var(--border-default))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: step === 'credenciales' ? '#ffffff' : 'hsl(var(--text-muted))',
                flexShrink: 0,
              }}>
                2
              </div>
              <span style={{
                fontSize: 12,
                fontWeight: step === 'credenciales' ? 600 : 400,
                color: step === 'credenciales' ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
              }}>
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
            boxShadow: '0 4px 24px rgba(93, 100, 116, 0.10)',
          }}>

            {/* Error */}
            {error && (
              <div style={{
                padding: '10px 14px',
                background: 'hsl(var(--status-error-bg))',
                border: '1px solid hsl(var(--status-error))',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                color: 'hsl(var(--status-error))',
                marginBottom: 20,
              }}>
                {error}
              </div>
            )}

            {/* PASO 1 — Código de empresa */}
            {step === 'empresa' && (
              <form onSubmit={handleVerifyEmpresa} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={labelStyle}>Código de empresa</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={e => setSlug(e.target.value)}
                    placeholder="ej: mi-barberia"
                    autoFocus
                    style={inputStyle}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  style={submitBtnStyle}
                >
                  {loading ? 'Verificando...' : 'Continuar \u2192'}
                </button>
              </form>
            )}

            {/* PASO 2 — Email y contraseña */}
            {step === 'credenciales' && (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Botón volver */}
                <button
                  type="button"
                  onClick={() => { setStep('empresa'); setTenant(null); setError(null); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'hsl(var(--text-muted))',
                    fontSize: 13,
                    padding: 0,
                    textAlign: 'left',
                    marginBottom: -4,
                    fontFamily: 'var(--font-sans)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  &larr; Cambiar empresa
                </button>

                {/* Email */}
                <div>
                  <label style={labelStyle}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoFocus
                    autoComplete="email"
                    style={inputStyle}
                  />
                </div>

                {/* Contraseña */}
                <div>
                  <label style={labelStyle}>Contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete="current-password"
                      style={{ ...inputStyle, paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(p => !p)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'hsl(var(--text-muted))',
                        display: 'flex',
                        alignItems: 'center',
                        padding: 0,
                      }}
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={submitBtnStyle}
                >
                  {loading ? 'Ingresando...' : 'Ingresar'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* ── CSS para mostrar el panel izquierdo en pantallas grandes ── */}
      <style>{`
        @media (min-width: 768px) {
          .login-left-panel {
            display: flex !important;
          }
        }
      `}</style>
    </main>
  );
}
