'use client';

// ══════════════════════════════════════════════════════════
// OWNER DASHBOARD — Vista ejecutiva del propietario
// Solo métricas financieras y rendimiento. Sin accesos operativos.
// ══════════════════════════════════════════════════════════

import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Row, Col, Card, Statistic, Typography, Tag, Space, theme, Progress,
} from 'antd';
import { useBarberTheme } from '@/context/ThemeContext';
import {
  DollarOutlined, RiseOutlined, FallOutlined,
  TeamOutlined, CalendarOutlined, TrophyOutlined,
  BarChartOutlined, ScissorOutlined, LineChartOutlined,
  MinusOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

type MesData    = { mes: string; ingresos: number; gastos: number; utilidad: number };
type ServicioTop = { nombre: string; total: number; cantidad: number };
type BarberRank  = { nombre: string; citas: number; completadas: number; ingresos: number };

export type OwnerStats = {
  ingresosMesAct:   number;
  ingresosMesPas:   number;
  gastosMesAct:     number;
  gastosMesPas:     number;
  utilidadMesAct:   number;
  utilidadMesPas:   number;
  margenMes:        number;
  ingresoYTD:       number;
  varIngresos:      number | null;
  varGastos:        number | null;
  varUtilidad:      number | null;
  totalClientes:    number;
  clientesNuevosMes: number;
  citasMesAct:      number;
  citasCompletadasMes: number;
  tasaCompletacion: number;
  ingresosVsGastos: MesData[];
  topServicios:     ServicioTop[];
  rankingBarberos:  BarberRank[];
  mesMostrado:      string;
  mesPasadoMostrado: string;
};

// ── Tooltip gráfica ingresos vs gastos ─────────────────
function TooltipFinanciero({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))',
      borderRadius: 8, padding: '10px 14px', fontSize: 12,
      boxShadow: '0 4px 12px rgba(0,0,0,.12)', minWidth: 150,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: 'hsl(var(--text-primary))' }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
          <span style={{ color: p.color, fontWeight: 600 }}>{p.name}</span>
          <span style={{ fontWeight: 700 }}>${p.value.toLocaleString('es-SV', { minimumFractionDigits: 2 })}</span>
        </div>
      ))}
    </div>
  );
}

// ── Badge de variación mes vs mes ──────────────────────
function VarBadge({ value }: { value: number | null }) {
  if (value === null) return <span style={{ fontSize: 11, color: 'hsl(var(--text-disabled))' }}>—</span>;
  const up      = value > 0;
  const neutral = value === 0;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700,
      color: neutral ? 'hsl(var(--text-muted))' : up ? '#52c41a' : '#ff4d4f',
      display: 'inline-flex', alignItems: 'center', gap: 2,
    }}>
      {neutral ? <MinusOutlined /> : up ? <RiseOutlined /> : <FallOutlined />}
      {Math.abs(value)}% vs mes ant.
    </span>
  );
}

export default function OwnerDashboardClient({
  stats,
  userName,
}: {
  stats:    OwnerStats;
  userName: string;
}) {
  const { theme: barberTheme } = useBarberTheme();
  const primary = barberTheme.colorPrimary;
  const { token } = theme.useToken();

  const C = {
    bgSurface:    'hsl(var(--bg-surface))',
    textPrimary:  'hsl(var(--text-primary))',
    textMuted:    'hsl(var(--text-muted))',
    textDisabled: 'hsl(var(--text-disabled))',
    border:       'hsl(var(--border-default))',
    success:      token.colorSuccess,
    error:        token.colorError,
    warning:      token.colorWarning,
  };

  const utilidadColor = stats.utilidadMesAct >= 0 ? C.success : C.error;

  return (
    <>
      {/* ── Encabezado ejecutivo ── */}
      <div style={{
        marginBottom: 24, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <Title level={4} style={{ margin: '0 0 4px' }}>
            Panel Ejecutivo — {userName.split(' ')[0]}
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Resumen financiero y rendimiento del negocio · {stats.mesMostrado}
          </Text>
        </div>
        <Space>
          <Tag color="gold" style={{ fontWeight: 600, fontSize: 12, padding: '4px 14px', borderRadius: 20 }}>
            Propietario
          </Tag>
        </Space>
      </div>

      {/* ── KPIs financieros principales ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* Ingresos del mes */}
        <Col xs={12} sm={12} md={6}>
          <Card size="small" style={{ borderTop: `3px solid ${C.success}` }}>
            <Statistic
              title={`Ingresos — ${stats.mesMostrado}`}
              value={stats.ingresosMesAct} precision={2}
              prefix={<DollarOutlined style={{ color: C.success }} />}
              valueStyle={{ color: C.success, fontSize: 20 }}
              suffix={<span style={{ fontSize: 11, color: C.textMuted }}>USD</span>}
            />
            <div style={{ marginTop: 4 }}>
              <VarBadge value={stats.varIngresos} />
            </div>
          </Card>
        </Col>

        {/* Gastos del mes */}
        <Col xs={12} sm={12} md={6}>
          <Card size="small" style={{ borderTop: `3px solid ${C.error}` }}>
            <Statistic
              title={`Gastos — ${stats.mesMostrado}`}
              value={stats.gastosMesAct} precision={2}
              prefix={<FallOutlined style={{ color: C.error }} />}
              valueStyle={{ color: C.error, fontSize: 20 }}
              suffix={<span style={{ fontSize: 11, color: C.textMuted }}>USD</span>}
            />
            <div style={{ marginTop: 4 }}>
              <VarBadge value={stats.varGastos} />
            </div>
          </Card>
        </Col>

        {/* Utilidad del mes */}
        <Col xs={12} sm={12} md={6}>
          <Card size="small" style={{ borderTop: `3px solid ${utilidadColor}` }}>
            <Statistic
              title={`Utilidad — ${stats.mesMostrado}`}
              value={stats.utilidadMesAct} precision={2}
              prefix={<RiseOutlined style={{ color: utilidadColor }} />}
              valueStyle={{ color: utilidadColor, fontSize: 20 }}
              suffix={<span style={{ fontSize: 11, color: C.textMuted }}>USD</span>}
            />
            <div style={{ marginTop: 4 }}>
              <VarBadge value={stats.varUtilidad} />
            </div>
          </Card>
        </Col>

        {/* YTD */}
        <Col xs={12} sm={12} md={6}>
          <Card size="small" style={{ borderTop: `3px solid ${primary}` }}>
            <Statistic
              title="Ingresos acumulados (año)"
              value={stats.ingresoYTD} precision={2}
              prefix={<BarChartOutlined style={{ color: primary }} />}
              valueStyle={{ fontSize: 20 }}
              suffix={<span style={{ fontSize: 11, color: C.textMuted }}>YTD</span>}
            />
            <div style={{ marginTop: 4 }}>
              <span style={{ fontSize: 11, color: C.textMuted }}>
                Margen: <strong style={{ color: stats.margenMes >= 0 ? C.success : C.error }}>{stats.margenMes}%</strong>
              </span>
            </div>
          </Card>
        </Col>
      </Row>

      {/* ── KPIs operativos ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} md={6}>
          <Card size="small" style={{ borderTop: '3px solid #722ed1' }}>
            <Statistic
              title="Total clientes"
              value={stats.totalClientes}
              prefix={<TeamOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ fontSize: 20 }}
            />
            <div style={{ marginTop: 4 }}>
              <span style={{ fontSize: 11, color: C.success, fontWeight: 600 }}>
                +{stats.clientesNuevosMes} nuevos este mes
              </span>
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={12} md={6}>
          <Card size="small" style={{ borderTop: '3px solid #0891b2' }}>
            <Statistic
              title={`Citas — ${stats.mesMostrado}`}
              value={stats.citasMesAct}
              prefix={<CalendarOutlined style={{ color: '#0891b2' }} />}
              valueStyle={{ fontSize: 20 }}
            />
            <div style={{ marginTop: 4 }}>
              <span style={{ fontSize: 11, color: C.textMuted }}>
                {stats.citasCompletadasMes} completadas
              </span>
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={12} md={6}>
          <Card size="small" style={{ borderTop: `3px solid ${C.warning}` }}>
            <Statistic
              title="Tasa de completación"
              value={stats.tasaCompletacion}
              suffix="%"
              prefix={<TrophyOutlined style={{ color: C.warning }} />}
              valueStyle={{ color: C.warning, fontSize: 20 }}
            />
            <div style={{ marginTop: 6 }}>
              <Progress
                percent={stats.tasaCompletacion}
                showInfo={false}
                size="small"
                strokeColor={C.warning}
                trailColor={C.border}
              />
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={12} md={6}>
          <Card size="small" style={{ borderTop: `3px solid ${C.success}` }}>
            <Statistic
              title="Margen de utilidad"
              value={stats.margenMes}
              suffix="%"
              prefix={<LineChartOutlined style={{ color: stats.margenMes >= 0 ? C.success : C.error }} />}
              valueStyle={{ color: stats.margenMes >= 0 ? C.success : C.error, fontSize: 20 }}
            />
            <div style={{ marginTop: 6 }}>
              <Progress
                percent={Math.max(0, Math.min(100, stats.margenMes))}
                showInfo={false}
                size="small"
                strokeColor={stats.margenMes >= 0 ? C.success : C.error}
                trailColor={C.border}
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* ── Gráfica área — Ingresos vs Gastos 6 meses ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Title level={5} style={{ margin: 0 }}>Flujo financiero — últimos 6 meses</Title>
                <Tag color="blue" style={{ fontSize: 11 }}>Mensual</Tag>
              </div>
            }
            size="small"
          >
            {stats.ingresosVsGastos.some(m => m.ingresos > 0 || m.gastos > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart
                  data={stats.ingresosVsGastos}
                  margin={{ top: 10, right: 24, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={primary}   stopOpacity={0.25} />
                      <stop offset="95%" stopColor={primary}   stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradGastos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.error}   stopOpacity={0.20} />
                      <stop offset="95%" stopColor={C.error}   stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={56}
                    tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                  />
                  <ReTooltip content={<TooltipFinanciero />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    formatter={(value) => value === 'ingresos' ? 'Ingresos' : value === 'gastos' ? 'Gastos' : 'Utilidad'}
                  />
                  <Area
                    type="monotone" dataKey="ingresos" name="ingresos"
                    stroke={primary} strokeWidth={2.5}
                    fill="url(#gradIngresos)"
                    dot={{ r: 4, fill: primary, strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                  <Area
                    type="monotone" dataKey="gastos" name="gastos"
                    stroke={C.error} strokeWidth={2}
                    strokeDasharray="5 3"
                    fill="url(#gradGastos)"
                    dot={{ r: 4, fill: C.error, strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone" dataKey="utilidad" name="utilidad"
                    stroke={C.warning} strokeWidth={2}
                    dot={{ r: 3, fill: C.warning, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.textDisabled }}>
                <BarChartOutlined style={{ fontSize: 40, marginBottom: 12 }} />
                <Text type="secondary">Sin datos financieros en los últimos 6 meses</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Comparativa mes + Top servicios + Ranking ── */}
      <Row gutter={[16, 16]}>
        {/* Comparativa mes actual vs mes anterior */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Title level={5} style={{ margin: 0 }}>Mes vs mes anterior</Title>
              </div>
            }
            size="small"
            style={{ height: '100%' }}
          >
            <div style={{ paddingTop: 4 }}>
              {/* Ingresos comparativa */}
              {[
                { label: 'Ingresos', actual: stats.ingresosMesAct, pasado: stats.ingresosMesPas, color: C.success },
                { label: 'Gastos',   actual: stats.gastosMesAct,   pasado: stats.gastosMesPas,   color: C.error },
                { label: 'Utilidad', actual: stats.utilidadMesAct, pasado: stats.utilidadMesPas, color: primary },
              ].map(row => {
                const max = Math.max(Math.abs(row.actual), Math.abs(row.pasado), 1);
                const pctAct = Math.max(0, (Math.abs(row.actual) / max) * 100);
                const pctPas = Math.max(0, (Math.abs(row.pasado) / max) * 100);
                return (
                  <div key={row.label} style={{ marginBottom: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text strong style={{ fontSize: 12 }}>{row.label}</Text>
                    </div>
                    {/* Mes actual */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 10, color: C.textMuted, width: 68, flexShrink: 0 }}>{stats.mesMostrado}</span>
                      <div style={{ flex: 1, background: C.border, borderRadius: 4, height: 8, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 4, background: row.color, width: `${pctAct}%`, transition: 'width 0.6s' }} />
                      </div>
                      <span style={{ fontSize: 11, color: row.color, fontWeight: 700, width: 64, textAlign: 'right', flexShrink: 0 }}>
                        ${Math.abs(row.actual).toLocaleString('es-SV', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {/* Mes anterior */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, color: C.textDisabled, width: 68, flexShrink: 0 }}>{stats.mesPasadoMostrado}</span>
                      <div style={{ flex: 1, background: C.border, borderRadius: 4, height: 8, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 4, background: `${row.color}50`, width: `${pctPas}%`, transition: 'width 0.6s' }} />
                      </div>
                      <span style={{ fontSize: 11, color: C.textMuted, width: 64, textAlign: 'right', flexShrink: 0 }}>
                        ${Math.abs(row.pasado).toLocaleString('es-SV', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>

        {/* Top servicios */}
        <Col xs={24} lg={8}>
          <Card
            title={<Title level={5} style={{ margin: 0 }}>Top servicios — 30 días</Title>}
            size="small"
            style={{ height: '100%' }}
          >
            {stats.topServicios.length > 0 ? (
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
                        <div style={{ height: '100%', borderRadius: 4, background: i === 0 ? primary : `${primary}80`, width: `${pct}%`, transition: 'width 0.6s' }} />
                      </div>
                      <div style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>{s.cantidad} veces</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.textDisabled }}>
                <ScissorOutlined style={{ fontSize: 36, marginBottom: 10 }} />
                <Text type="secondary">Sin servicios en los últimos 30 días</Text>
              </div>
            )}
          </Card>
        </Col>

        {/* Ranking barberos por ingresos */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Title level={5} style={{ margin: 0 }}>Top barberos — {stats.mesMostrado}</Title>
                <Tag color="gold" style={{ fontSize: 11 }}>Ingresos</Tag>
              </div>
            }
            size="small"
            style={{ height: '100%' }}
          >
            {stats.rankingBarberos.length > 0 ? (
              <div style={{ paddingTop: 4 }}>
                {stats.rankingBarberos.map((b, i) => {
                  const max = stats.rankingBarberos[0].ingresos;
                  const pct = max > 0 ? (b.ingresos / max) * 100 : 0;
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <div key={b.nombre} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Space size={6}>
                          <span style={{ fontSize: 14, lineHeight: 1 }}>{medals[i] ?? `${i + 1}.`}</span>
                          <span style={{ fontSize: 13, fontWeight: i === 0 ? 700 : 500, color: C.textPrimary }}>
                            {b.nombre.split(' ')[0]}
                          </span>
                        </Space>
                        <Space size={10}>
                          <span style={{ fontSize: 11, color: C.textMuted }}>{b.completadas} citas</span>
                          <span style={{ fontSize: 12, color: C.success, fontWeight: 700 }}>
                            ${b.ingresos.toFixed(2)}
                          </span>
                        </Space>
                      </div>
                      <div style={{ background: C.border, borderRadius: 4, height: 5, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 4, background: i === 0 ? C.success : `${C.success}70`, width: `${pct}%`, transition: 'width 0.6s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.textDisabled }}>
                <TrophyOutlined style={{ fontSize: 36, marginBottom: 10 }} />
                <Text type="secondary">Sin datos de barberos este mes</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </>
  );
}
