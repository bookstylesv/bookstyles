'use client';

// ══════════════════════════════════════════════════════════
// CONFIGURACIÓN — Datos y apariencia del tenant
// ══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Card, Button, Input, Row, Col, Tag, Typography, Space, Spin, Switch, TimePicker,
} from 'antd';
import {
  SaveOutlined, SettingOutlined, BgColorsOutlined, InfoCircleOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';

const { Title, Text } = Typography;

// ── Tipos ───────────────────────────────────────────────
const PLAN_LABELS: Record<string, string> = {
  TRIAL: 'Prueba', BASIC: 'Básico', PRO: 'Pro', ENTERPRISE: 'Empresarial',
};
const PLAN_COLORS: Record<string, string> = {
  TRIAL: 'default', BASIC: 'blue', PRO: 'purple', ENTERPRISE: 'gold',
};

type Tenant = {
  id: number; slug: string; name: string; email: string | null;
  phone: string | null; address: string | null; city: string | null;
  country: string; logoUrl: string | null; plan: string; status: string;
  themeConfig: Record<string, string>; trialEndsAt: string | null; paidUntil: string | null;
};

type InfoForm  = { name: string; email: string; phone: string; address: string; city: string };
type ThemeForm = { brandPrimary: string };

type BusinessHourEntry = {
  dayOfWeek: number;
  active:    boolean;
  startTime: string;
  endTime:   string;
};

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const DEFAULT_HOURS: BusinessHourEntry[] = [
  { dayOfWeek: 0, active: false, startTime: '08:00', endTime: '17:00' },
  { dayOfWeek: 1, active: false, startTime: '08:00', endTime: '17:00' },
  { dayOfWeek: 2, active: true,  startTime: '08:00', endTime: '17:00' },
  { dayOfWeek: 3, active: true,  startTime: '08:00', endTime: '17:00' },
  { dayOfWeek: 4, active: true,  startTime: '08:00', endTime: '17:00' },
  { dayOfWeek: 5, active: true,  startTime: '08:00', endTime: '17:00' },
  { dayOfWeek: 6, active: true,  startTime: '08:00', endTime: '17:00' },
];

// Helper label wrapper
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 500, color: '#595959', marginBottom: 4 }}>
      {children}
    </div>
  );
}

// ── Componente ───────────────────────────────────────────
export default function SettingsPage() {
  const [tenant,           setTenant]           = useState<Tenant | null>(null);
  const [infoLoading,      setInfoLoading]      = useState(false);
  const [infoError,        setInfoError]        = useState('');
  const [hours,            setHours]            = useState<BusinessHourEntry[]>(DEFAULT_HOURS);
  const [hoursLoading,     setHoursLoading]     = useState(false);

  const { register: regInfo, handleSubmit: handleInfo, reset: resetInfo } = useForm<InfoForm>();
  const { register: regTheme, handleSubmit: handleTheme }                 = useForm<ThemeForm>();

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
    fetch('/api/settings/schedule')
      .then(r => r.json())
      .then(json => { if (json.success) setHours(json.data); });
  }, [resetInfo]);

  async function onInfoSubmit(values: InfoForm) {
    setInfoLoading(true); setInfoError('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = json.error?.message ?? 'Error al guardar';
        setInfoError(msg); toast.error(msg); return;
      }
      setTenant(json.data);
      toast.success('Información actualizada correctamente');
    } catch {
      setInfoError('Error de red'); toast.error('Error de red');
    } finally { setInfoLoading(false); }
  }

  function toggleDay(dayOfWeek: number, active: boolean) {
    setHours(prev => prev.map(h => h.dayOfWeek === dayOfWeek ? { ...h, active } : h));
  }

  function setTime(dayOfWeek: number, field: 'startTime' | 'endTime', value: Dayjs | null) {
    if (!value) return;
    setHours(prev => prev.map(h =>
      h.dayOfWeek === dayOfWeek ? { ...h, [field]: value.format('HH:mm') } : h
    ));
  }

  async function saveHours() {
    setHoursLoading(true);
    try {
      const res  = await fetch('/api/settings/schedule', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hours),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? 'Error al guardar horarios'); return; }
      setHours(json.data);
      toast.success('Horarios guardados y sincronizados con los barberos');
    } catch {
      toast.error('Error de red');
    } finally { setHoursLoading(false); }
  }

  async function onThemeSubmit(values: ThemeForm) {
    const hsl = values.brandPrimary.trim();
    const id  = toast.loading('Aplicando color…');
    const res = await fetch('/api/settings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeConfig: { '--brand-primary': hsl } }),
    });
    const json = await res.json();
    if (res.ok) {
      setTenant(prev => prev ? { ...prev, themeConfig: json.data.themeConfig } : prev);
      document.documentElement.style.setProperty('--brand-primary', hsl);
      toast.success('Color principal aplicado', { id });
    } else {
      toast.error(json.error?.message ?? 'Error al cambiar color', { id });
    }
  }

  if (!tenant) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <Spin size="large" tip="Cargando configuración…" />
      </div>
    );
  }

  const primaryHSL = (tenant.themeConfig as Record<string, string>)['--brand-primary'] ?? '172 83% 32%';

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: '0 0 4px' }}>
          <SettingOutlined style={{ marginRight: 8, color: '#0d9488' }} />
          Configuración
        </Title>
        <Text type="secondary">Datos y apariencia de tu barbería</Text>
      </div>

      {/* ── Plan y estado ── */}
      <Card
        title={
          <Space>
            <InfoCircleOutlined style={{ color: '#0d9488' }} />
            <span>Plan y estado</span>
          </Space>
        }
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Space wrap size={24}>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Plan</Text>
            <Tag color={PLAN_COLORS[tenant.plan] ?? 'default'} style={{ fontWeight: 600 }}>
              {PLAN_LABELS[tenant.plan] ?? tenant.plan}
            </Tag>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Estado</Text>
            <Tag color={tenant.status === 'ACTIVE' ? 'success' : 'warning'}>
              {tenant.status === 'ACTIVE' ? 'Activo' : tenant.status}
            </Tag>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Subdominio</Text>
            <code style={{ fontSize: 13, background: '#f5f5f5', padding: '2px 8px', borderRadius: 4, border: '1px solid #e8e8e8' }}>
              {tenant.slug}
            </code>
          </div>
          {tenant.trialEndsAt && (
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Trial hasta</Text>
              <Text style={{ fontSize: 13 }}>{new Date(tenant.trialEndsAt).toLocaleDateString('es-SV')}</Text>
            </div>
          )}
        </Space>
      </Card>

      {/* ── Información del negocio ── */}
      <Card
        title={
          <Space>
            <InfoCircleOutlined style={{ color: '#0d9488' }} />
            <span>Información del negocio</span>
          </Space>
        }
        size="small"
        style={{ marginBottom: 16 }}
      >
        <form onSubmit={handleInfo(onInfoSubmit)}>
          <Row gutter={[16, 12]}>
            <Col xs={24} md={12}>
              <FieldLabel>Nombre del negocio *</FieldLabel>
              <Input {...regInfo('name', { required: true })} placeholder="Speeddan Barbería" />
            </Col>
            <Col xs={24} md={12}>
              <FieldLabel>Email de contacto</FieldLabel>
              <Input type="email" {...regInfo('email')} placeholder="info@barberia.com" />
            </Col>
            <Col xs={24} md={12}>
              <FieldLabel>Teléfono</FieldLabel>
              <Input {...regInfo('phone')} placeholder="+503 2222-0000" />
            </Col>
            <Col xs={24} md={12}>
              <FieldLabel>Ciudad</FieldLabel>
              <Input {...regInfo('city')} placeholder="San Salvador" />
            </Col>
            <Col xs={24}>
              <FieldLabel>Dirección</FieldLabel>
              <Input {...regInfo('address')} placeholder="Calle Principal #123, Col. Centro" />
            </Col>
          </Row>
          {infoError && (
            <p style={{ color: '#ff4d4f', fontSize: 13, marginTop: 10, marginBottom: 0 }}>{infoError}</p>
          )}
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="primary" htmlType="submit" loading={infoLoading} icon={<SaveOutlined />}>
              {infoLoading ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </Card>

      {/* ── Horarios de trabajo ── */}
      <Card
        title={
          <Space>
            <ClockCircleOutlined style={{ color: '#0d9488' }} />
            <span>Horarios de trabajo</span>
          </Space>
        }
        size="small"
        style={{ marginBottom: 16 }}
        extra={
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={hoursLoading}
            onClick={saveHours}
            size="small"
          >
            Guardar horarios
          </Button>
        }
      >
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>
          Configura los días y horarios en que atiende tu barbería. Los clientes solo podrán agendar citas dentro de estos horarios.
        </Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {hours.map(h => (
            <Row key={h.dayOfWeek} align="middle" gutter={12}>
              <Col style={{ width: 32 }}>
                <Switch
                  size="small"
                  checked={h.active}
                  onChange={val => toggleDay(h.dayOfWeek, val)}
                  style={{ background: h.active ? '#0d9488' : undefined }}
                />
              </Col>
              <Col style={{ width: 96 }}>
                <Text style={{ fontSize: 13, color: h.active ? undefined : '#bfbfbf', fontWeight: h.active ? 500 : 400 }}>
                  {DAY_NAMES[h.dayOfWeek]}
                </Text>
              </Col>
              {h.active ? (
                <>
                  <Col>
                    <TimePicker
                      size="small"
                      format="HH:mm"
                      minuteStep={30}
                      value={dayjs(h.startTime, 'HH:mm')}
                      onChange={val => setTime(h.dayOfWeek, 'startTime', val)}
                      allowClear={false}
                      style={{ width: 90 }}
                    />
                  </Col>
                  <Col>
                    <Text type="secondary" style={{ fontSize: 12 }}>a</Text>
                  </Col>
                  <Col>
                    <TimePicker
                      size="small"
                      format="HH:mm"
                      minuteStep={30}
                      value={dayjs(h.endTime, 'HH:mm')}
                      onChange={val => setTime(h.dayOfWeek, 'endTime', val)}
                      allowClear={false}
                      style={{ width: 90 }}
                    />
                  </Col>
                </>
              ) : (
                <Col>
                  <Text type="secondary" style={{ fontSize: 12 }}>Cerrado</Text>
                </Col>
              )}
            </Row>
          ))}
        </div>
      </Card>

      {/* ── Apariencia ── */}
      <Card
        title={
          <Space>
            <BgColorsOutlined style={{ color: '#0d9488' }} />
            <span>Apariencia — Color principal</span>
          </Space>
        }
        size="small"
      >
        <form onSubmit={handleTheme(onThemeSubmit)}>
          <Row gutter={16} align="bottom">
            <Col xs={24} sm={16} md={10}>
              <FieldLabel>Color primario (HSL sin hsl())</FieldLabel>
              <Input
                {...regTheme('brandPrimary')}
                defaultValue={primaryHSL}
                placeholder="172 83% 32%"
              />
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                Formato: <code>H S% L%</code> · Ej: <code>172 83% 32%</code> (teal) · <code>213 94% 47%</code> (azul)
              </Text>
            </Col>
            <Col>
              <div style={{
                width:  40, height: 40, borderRadius: 8,
                background: `hsl(${primaryHSL})`,
                border: '2px solid #e8e8e8', marginBottom: 22,
              }} />
            </Col>
            <Col>
              <Button type="primary" htmlType="submit" icon={<BgColorsOutlined />} style={{ marginBottom: 22 }}>
                Aplicar color
              </Button>
            </Col>
          </Row>
        </form>
      </Card>
    </div>
  );
}
