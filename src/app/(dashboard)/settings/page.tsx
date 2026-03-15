'use client';

/**
 * /settings — Configuración del tenant.
 * Client Component con dos secciones: Info y Apariencia.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const PLAN_LABELS: Record<string, string> = {
  TRIAL: 'Prueba', BASIC: 'Básico', PRO: 'Pro', ENTERPRISE: 'Empresarial',
};

type Tenant = {
  id:          number;
  slug:        string;
  name:        string;
  email:       string | null;
  phone:       string | null;
  address:     string | null;
  city:        string | null;
  country:     string;
  logoUrl:     string | null;
  plan:        string;
  status:      string;
  themeConfig: Record<string, string>;
  trialEndsAt: string | null;
  paidUntil:   string | null;
};

type InfoForm = {
  name:    string;
  email:   string;
  phone:   string;
  address: string;
  city:    string;
};

type ThemeForm = {
  brandPrimary: string;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background:   'hsl(var(--bg-surface))',
      border:       '1px solid hsl(var(--border-default))',
      borderRadius: 'var(--radius-lg)',
      padding:      24,
      marginBottom: 20,
    }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, color: 'hsl(var(--text-primary))', margin: '0 0 18px' }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [tenant, setTenant]         = useState<Tenant | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoMsg, setInfoMsg]         = useState('');
  const [infoError, setInfoError]     = useState('');

  const {
    register: regInfo,
    handleSubmit: handleInfo,
    reset: resetInfo,
  } = useForm<InfoForm>();

  const {
    register: regTheme,
    handleSubmit: handleTheme,
  } = useForm<ThemeForm>();

  // Cargar datos del tenant
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setTenant(json.data);
          resetInfo({
            name:    json.data.name    ?? '',
            email:   json.data.email   ?? '',
            phone:   json.data.phone   ?? '',
            address: json.data.address ?? '',
            city:    json.data.city    ?? '',
          });
        }
      });
  }, [resetInfo]);

  async function onInfoSubmit(values: InfoForm) {
    setInfoLoading(true);
    setInfoMsg('');
    setInfoError('');
    try {
      const res = await fetch('/api/settings', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) { setInfoError(json.error?.message ?? 'Error'); return; }
      setTenant(json.data);
      setInfoMsg('Cambios guardados ✓');
    } catch {
      setInfoError('Error de red');
    } finally {
      setInfoLoading(false);
    }
  }

  async function onThemeSubmit(values: ThemeForm) {
    const hsl = values.brandPrimary.trim();
    const res = await fetch('/api/settings', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ themeConfig: { '--brand-primary': hsl } }),
    });
    const json = await res.json();
    if (res.ok) {
      setTenant(prev => prev ? { ...prev, themeConfig: json.data.themeConfig } : prev);
      // Aplicar cambio en tiempo real
      document.documentElement.style.setProperty('--brand-primary', hsl);
    }
  }

  if (!tenant) {
    return (
      <div style={{ color: 'hsl(var(--text-muted))', padding: '40px 0', textAlign: 'center' }}>
        Cargando configuración…
      </div>
    );
  }

  const primaryHSL = (tenant.themeConfig as Record<string, string>)['--brand-primary'] ?? '213 94% 47%';

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'hsl(var(--text-primary))', margin: '0 0 4px' }}>
          Configuración
        </h1>
        <p style={{ color: 'hsl(var(--text-secondary))', margin: 0, fontSize: 14 }}>
          Datos y apariencia de tu barbería
        </p>
      </div>

      {/* Plan actual */}
      <Section title="Plan y estado">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: 12, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: 4 }}>Plan</span>
            <Badge variant="default">{PLAN_LABELS[tenant.plan] ?? tenant.plan}</Badge>
          </div>
          <div>
            <span style={{ fontSize: 12, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: 4 }}>Estado</span>
            <Badge variant={tenant.status === 'ACTIVE' ? 'default' : 'secondary'}>
              {tenant.status}
            </Badge>
          </div>
          <div>
            <span style={{ fontSize: 12, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: 4 }}>Slug</span>
            <code style={{ fontSize: 13, background: 'hsl(var(--bg-page))', padding: '2px 8px', borderRadius: 4 }}>
              {tenant.slug}
            </code>
          </div>
          {tenant.trialEndsAt && (
            <div>
              <span style={{ fontSize: 12, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: 4 }}>Trial hasta</span>
              <span style={{ fontSize: 13 }}>{new Date(tenant.trialEndsAt).toLocaleDateString('es-SV')}</span>
            </div>
          )}
        </div>
      </Section>

      {/* Info básica */}
      <Section title="Información del negocio">
        <form onSubmit={handleInfo(onInfoSubmit)}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            <div>
              <Label htmlFor="cfg-name">Nombre del negocio *</Label>
              <Input id="cfg-name" {...regInfo('name', { required: true })} placeholder="Speeddan Barbería" />
            </div>
            <div>
              <Label htmlFor="cfg-email">Email de contacto</Label>
              <Input id="cfg-email" type="email" {...regInfo('email')} placeholder="info@barberia.com" />
            </div>
            <div>
              <Label htmlFor="cfg-phone">Teléfono</Label>
              <Input id="cfg-phone" {...regInfo('phone')} placeholder="+503 2222-0000" />
            </div>
            <div>
              <Label htmlFor="cfg-city">Ciudad</Label>
              <Input id="cfg-city" {...regInfo('city')} placeholder="San Salvador" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Label htmlFor="cfg-address">Dirección</Label>
              <Input id="cfg-address" {...regInfo('address')} placeholder="Calle Principal #123, Col. Centro" />
            </div>
          </div>

          {infoError && <p style={{ color: 'hsl(var(--destructive))', fontSize: 13, marginTop: 10 }}>{infoError}</p>}
          {infoMsg   && <p style={{ color: 'hsl(var(--color-success))', fontSize: 13, marginTop: 10 }}>{infoMsg}</p>}

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" disabled={infoLoading}>
              {infoLoading ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </Section>

      {/* Apariencia */}
      <Section title="Apariencia (Color principal)">
        <form onSubmit={handleTheme(onThemeSubmit)}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <Label htmlFor="cfg-primary">Color primario (HSL sin hsl())</Label>
              <Input
                id="cfg-primary"
                {...regTheme('brandPrimary')}
                defaultValue={primaryHSL}
                placeholder="213 94% 47%"
              />
              <p style={{ fontSize: 12, color: 'hsl(var(--text-muted))', marginTop: 4 }}>
                Formato: <code>H S% L%</code> · Ej: <code>213 94% 47%</code> (azul)
                · <code>142 70% 45%</code> (verde) · <code>0 72% 51%</code> (rojo)
              </p>
            </div>
            <div>
              <div style={{
                width: 40, height: 40, borderRadius: 'var(--radius-md)',
                background: `hsl(${primaryHSL})`,
                border: '2px solid hsl(var(--border-default))',
              }} />
            </div>
            <Button type="submit">Aplicar color</Button>
          </div>
        </form>
      </Section>
    </div>
  );
}
