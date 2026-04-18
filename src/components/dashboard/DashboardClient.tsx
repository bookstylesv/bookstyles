'use client';

// ══════════════════════════════════════════════════════════
// DASHBOARD PRINCIPAL — KPIs + gráficas + accesos rápidos
// ══════════════════════════════════════════════════════════

import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Row, Col, Card, Statistic, Button, Typography, Tag, Space, theme } from 'antd';
import { useBarberTheme } from '@/context/ThemeContext';
import {
  CalendarOutlined, ClockCircleOutlined, DollarOutlined,
  TeamOutlined, ScissorOutlined, UserOutlined, CreditCardOutlined,
  RightOutlined, ShoppingCartOutlined, LineChartOutlined,
} from '@ant-design/icons';
import Link from 'next/link';

const { Title, Text } = Typography;

// ── Tipos ───────────────────────────────────────────────
type WeekDay  = { day: string; count: number };
type VentaDay = { day: string; total: number; count: number };
type MesData  = { mes: string; ingresos: number; gastos: number; utilidad: number };
type ServicioTop = { nombre: string; total: number; cantidad: number };
type BarberRank  = { nombre: string; citas: number; completadas: number; ingresos: number };

type Stats = {
  citasHoy:        number;
  citasPendientes: number;
  ingresosHoy:     number;
  clientesActivos: number;
  citasSemana:     WeekDay[];
  // POS
  ventasPosHoy:   number;
  ingresosPosHoy: number;
  ventasSemana:   VentaDay[];
  ticketPromedio: number;
  // Gráficas
  ingresosVsGastos: MesData[];
  topServicios:     ServicioTop[];
  rankingBarberos:  BarberRank[];
};

// ── Links rápidos ───────────────────────────────────────
const QUICK_LINKS = [
  { href: '/appointments', label: 'Ver citas de hoy',    icon: <CalendarOutlined />,    accent: '#0d9488' },
  { href: '/pos',          label: 'Ir al POS',           icon: <ShoppingCartOutlined />, accent: '#10b981' },
  { href: '/services',     label: 'Gestionar servicios', icon: <ScissorOutlined />,     accent: '#7c3aed' },
  { href: '/barbers',      label: 'Ver barberos',        icon: <UserOutlined />,        accent: '#0284c7' },
  { href: '/billing',      label: 'Registrar pago',      icon: <CreditCardOutlined />,  accent: '#b45309' },
];

const ROLE_LABELS: Record<string, string> = {
  OWNER:  'Propietario',
  BARBER: 'Barbero',
  CLIENT: 'Cliente',
};

// ── Tooltip para gráfica de barras semanales ────────────
function TooltipSemana({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number }>; label?: string;
}) {
  const { theme: barberTheme } = useBarberTheme();
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))',
      borderRadius: 8, padding: '8px 14px', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,.08)',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ color: barberTheme.colorPrimary }}>${payload[0].value.toFixed(2)}</div>
    </div>
  );
}

// ── Tooltip para gráfica ingresos vs gastos ─────────────
function TooltipIngGastos({ active, payload, label }: {
  active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))',
      borderRadius: 8, padding: '10px 14px', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,.10)',
      minWidth: 140,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: 'hsl(var(--text-primary))' }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
          <span style={{ color: p.color, fontWeight: 600 }}>{p.name}</span>
          <span style={{ fontWeight: 700 }}>${p.value.toFixed(2)}</span>
        </div>
      ))}
      {payload.length === 2 && (
        <>
          <div style={{ borderTop: '1px solid hsl(var(--border-default))', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'hsl(var(--text-muted))' }}>Utilidad</span>
            <span style={{
              fontWeight: 800,
              color: (payload[0].value - payload[1].value) >= 0 ? '#52c41a' : '#ff4d4f',
            }}>
              ${(payload[0].value - payload[1].value).toFixed(2)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ── Componente ──────────────────────────────────────────
export default function DashboardClient({
  stats,
  userName,
  userRole,
  tenantSlug,
}: {
  stats:      Stats;
  userName:   string;
  userRole:   string;
  tenantSlug: string;
}) {
  const { theme: barberTheme } = useBarberTheme();
  const primary = barberTheme.colorPrimary;
  const { token } = theme.useToken();
  const C = {
    bgPrimaryLow:  `${primary}18`,
    bgSurface:     'hsl(var(--bg-surface))',
    textPrimary:   'hsl(var(--text-primary))',
    textMuted:     'hsl(var(--text-muted))',
    textDisabled:  'hsl(var(--text-disabled))',
    border:        'hsl(var(--border-default))',
    colorSuccess:  token.colorSuccess,
    colorWarning:  token.colorWarning,
    colorError:    token.colorError,
  };

  // Mes actual para KPI utilidad
  const mesActual = stats.ingresosVsGastos[stats.ingresosVsGastos.length - 1];
  const utilidadMes = mesActual ? mesActual.utilidad : 0;

  return (
    <>
      {/* ── Bienvenida ── */}
      <div style={{
        marginBottom: 24, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <Title level={4} style={{ margin: '0 0 4px' }}>
            Bienvenido, {userName.split(' ')[0]}
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Panel de gestión — {tenantSlug}
          </Text>
        </div>
        <Tag color="cyan" style={{ fontWeight: 600, fontSize: 12, padding: '4px 14px', borderRadius: 20 }}>
          {ROLE_LABELS[userRole] ?? userRole}
        </Tag>
      </div>

      {/* ── KPIs fila 1 ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={12} md={6}>
          <Card size="small" style={{ borderTop: `3px solid ${C.colorSuccess}` }}>
            <Statistic
              title="Ingresos hoy"
              value={stats.ingresosHoy} precision={2}
              prefix={<DollarOutlined style={{ color: C.colorSuccess }} />}
              valueStyle={{ color: C.colorSuccess, fontSize: 20 }}
              suffix={<span style={{ fontSize: 12, color: C.textMuted, fontWeight: 400 }}>USD</span>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small" style={{ borderTop: `3px solid ${primary}` }}>
            <Statistic
              title="Ventas POS hoy"
              value={stats.ventasPosHoy}
              prefix={<ShoppingCartOutlined style={{ color: primary }} />}
              valueStyle={{ fontSize: 20 }}
              suffix={<span style={{ fontSize: 12, color: C.textMuted, fontWeight: 400 }}>ventas</span>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small" style={{ borderTop: '3px solid #7c3aed' }}>
            <Statistic
              title="Ticket promedio"
              value={stats.ticketPromedio} precision={2}
              prefix={<LineChartOutlined style={{ color: '#7c3aed' }} />}
              valueStyle={{ color: '#7c3aed', fontSize: 20 }}
              suffix={<span style={{ fontSize: 12, color: C.textMuted, fontWeight: 400 }}>7 días</span>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small" style={{ borderTop: `3px solid ${utilidadMes >= 0 ? C.colorSuccess : C.colorError}` }}>
            <Statistic
              title="Utilidad del mes"
              value={utilidadMes} precision={2}
              prefix={<DollarOutlined style={{ color: utilidadMes >= 0 ? C.colorSuccess : C.colorError }} />}
              valueStyle={{ color: utilidadMes >= 0 ? C.colorSuccess : C.colorError, fontSize: 20 }}
              suffix={<span style={{ fontSize: 12, color: C.textMuted, fontWeight: 400 }}>ingresos−gastos</span>}
            />
          </Card>
        </Col>
      </Row>

      {/* ── KPIs fila 2 ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} md={6}>
          <Card size="small" style={{ borderTop: '3px solid #0891b2' }}>
            <Statistic
              title="Citas hoy"
              value={stats.citasHoy}
              prefix={<CalendarOutlined style={{ color: '#0891b2' }} />}
              valueStyle={{ fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small" style={{ borderTop: `3px solid ${C.colorWarning}` }}>
            <Statistic
              title="Citas pendientes"
              value={stats.citasPendientes}
              prefix={<ClockCircleOutlined style={{ color: C.colorWarning }} />}
              valueStyle={{ fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small" style={{ borderTop: `3px solid ${C.colorSuccess}` }}>
            <Statistic
              title="Ingresos POS hoy"
              value={stats.ingresosPosHoy} precision={2}
              prefix={<DollarOutlined style={{ color: C.colorSuccess }} />}
              valueStyle={{ color: C.colorSuccess, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small" style={{ borderTop: '3px solid #722ed1' }}>
            <Statistic
              title="Clientes activos"
              value={stats.clientesActivos}
              prefix={<TeamOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ fontSize: 20 }}
              suffix={<span style={{ fontSize: 12, color: C.textMuted, fontWeight: 400 }}>30 días</span>}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Gráfica Ingresos vs Gastos (línea doble) ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Title level={5} style={{ margin: 0 }}>Ingresos vs Gastos — últimos 6 meses</Title>
                <Tag color="blue" style={{ fontSize: 11 }}>Mensual</Tag>
              </div>
            }
            size="small"
          >
            {stats.ingresosVsGastos.some(m => m.ingresos > 0 || m.gastos > 0) ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={stats.ingresosVsGastos}
                  margin={{ top: 10, right: 24, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                    width={52}
                  />
                  <ReTooltip content={<TooltipIngGastos />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    formatter={(value) => value === 'ingresos' ? 'Ingresos' : 'Gastos'}
                  />
                  <Line
                    type="monotone"
                    dataKey="ingresos"
                    name="ingresos"
                    stroke={primary}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: primary, strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="gastos"
                    name="gastos"
                    stroke={C.colorError}
                    strokeWidth={2.5}
                    strokeDasharray="5 3"
                    dot={{ r: 4, fill: C.colorError, strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{
                height: 260, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', color: C.textDisabled,
              }}>
                <LineChartOutlined style={{ fontSize: 40, marginBottom: 12 }} />
                <Text type="secondary">Sin datos de ingresos o gastos en los últimos 6 meses</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Gráfica barras semanales + Top servicios + Accesos rápidos ── */}
      <Row gutter={[16, 16]}>
        {/* Ventas 7 días */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Title level={5} style={{ margin: 0 }}>Ventas POS — 7 días</Title>
                <Tag color="green" style={{ fontSize: 11 }}>En vivo</Tag>
              </div>
            }
            size="small"
            style={{ height: '100%' }}
          >
            {stats.ventasSemana && stats.ventasSemana.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={stats.ventasSemana}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => `$${v}`} />
                  <ReTooltip content={<TooltipSemana />} cursor={{ fill: C.bgPrimaryLow }} />
                  <Bar dataKey="total" name="Ventas $" fill={primary} radius={[4, 4, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{
                height: 220, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', color: C.textDisabled,
              }}>
                <ShoppingCartOutlined style={{ fontSize: 36, marginBottom: 10 }} />
                <Text type="secondary">Sin ventas esta semana</Text>
              </div>
            )}
          </Card>
        </Col>

        {/* Top servicios */}
        <Col xs={24} lg={8}>
          <Card
            title={<Title level={5} style={{ margin: 0 }}>Top servicios — 30 días</Title>}
            size="small"
            style={{ height: '100%' }}
          >
            {stats.topServicios && stats.topServicios.length > 0 ? (
              <div style={{ paddingTop: 4 }}>
                {stats.topServicios.map((s, i) => {
                  const maxTotal = stats.topServicios[0].total;
                  const pct = maxTotal > 0 ? (s.total / maxTotal) * 100 : 0;
                  return (
                    <div key={s.nombre} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, color: C.textPrimary, fontWeight: i === 0 ? 700 : 400 }}>
                          {i + 1}. {s.nombre.length > 22 ? s.nombre.slice(0, 22) + '…' : s.nombre}
                        </span>
                        <span style={{ fontSize: 12, color: primary, fontWeight: 700 }}>
                          ${s.total.toFixed(2)}
                        </span>
                      </div>
                      <div style={{ background: C.border, borderRadius: 4, height: 5, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 4,
                          background: i === 0 ? primary : `${primary}80`,
                          width: `${pct}%`,
                          transition: 'width 0.6s ease',
                        }} />
                      </div>
                      <div style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>
                        {s.cantidad} veces
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                height: 220, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', color: C.textDisabled,
              }}>
                <ScissorOutlined style={{ fontSize: 36, marginBottom: 10 }} />
                <Text type="secondary">Sin servicios en los últimos 30 días</Text>
              </div>
            )}
          </Card>
        </Col>

        {/* Accesos rápidos */}
        <Col xs={24} lg={6}>
          <Card
            title={<Title level={5} style={{ margin: 0 }}>Accesos rápidos</Title>}
            size="small"
            style={{ height: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              {QUICK_LINKS.map(link => (
                <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
                  <Button
                    block icon={link.icon}
                    style={{
                      textAlign: 'left', borderLeft: `4px solid ${link.accent}`,
                      paddingLeft: 12, height: 40, fontWeight: 500,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    <span style={{ flex: 1 }}>{link.label}</span>
                    <RightOutlined style={{ fontSize: 10, color: C.textDisabled }} />
                  </Button>
                </Link>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>

      {/* ── Citas semana + Ranking de barberos ── */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* Citas por día — últimos 7 días */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Title level={5} style={{ margin: 0 }}>Citas — últimos 7 días</Title>
                <Tag color="blue" style={{ fontSize: 11 }}>Diario</Tag>
              </div>
            }
            size="small"
          >
            {stats.citasSemana.some(d => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.citasSemana} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <ReTooltip
                    cursor={{ fill: C.bgPrimaryLow }}
                    contentStyle={{ background: C.bgSurface, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                    formatter={(v: unknown) => [`${v} citas`, 'Citas']}
                  />
                  <Bar dataKey="count" name="Citas" fill="#0891b2" radius={[4, 4, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.textDisabled }}>
                <CalendarOutlined style={{ fontSize: 36, marginBottom: 10 }} />
                <Text type="secondary">Sin citas esta semana</Text>
              </div>
            )}
          </Card>
        </Col>

        {/* Ranking de barberos — mes actual */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Title level={5} style={{ margin: 0 }}>Ranking barberos — mes</Title>
                <Tag color="purple" style={{ fontSize: 11 }}>Completadas</Tag>
              </div>
            }
            size="small"
          >
            {stats.rankingBarberos.length > 0 ? (
              <div style={{ paddingTop: 4 }}>
                {stats.rankingBarberos.map((b, i) => {
                  const max = stats.rankingBarberos[0].completadas;
                  const pct = max > 0 ? (b.completadas / max) * 100 : 0;
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <div key={b.nombre} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Space size={6}>
                          <span style={{ fontSize: 14, lineHeight: 1 }}>{medals[i] ?? `${i + 1}.`}</span>
                          <span style={{ fontSize: 13, fontWeight: i === 0 ? 700 : 500, color: C.textPrimary }}>
                            {b.nombre}
                          </span>
                        </Space>
                        <Space size={12}>
                          <span style={{ fontSize: 12, color: primary, fontWeight: 700 }}>
                            {b.completadas} <span style={{ fontWeight: 400, color: C.textMuted }}>citas</span>
                          </span>
                          <span style={{ fontSize: 12, color: token.colorSuccess, fontWeight: 700 }}>
                            ${b.ingresos.toFixed(2)}
                          </span>
                        </Space>
                      </div>
                      <div style={{ background: C.border, borderRadius: 4, height: 5, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 4,
                          background: i === 0 ? primary : `${primary}80`,
                          width: `${pct}%`,
                          transition: 'width 0.6s ease',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.textDisabled }}>
                <ScissorOutlined style={{ fontSize: 36, marginBottom: 10 }} />
                <Text type="secondary">Sin datos de barberos este mes</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </>
  );
}
