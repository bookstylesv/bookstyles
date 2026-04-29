'use client';

// ══════════════════════════════════════════════════════════
// OWNER DASHBOARD — Vista ejecutiva premium del propietario
// ══════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Row, Col, Card, Statistic, Typography, Tag, Space, theme,
  Progress, Button, Dropdown, Divider,
} from 'antd';
import { useBarberTheme } from '@/context/ThemeContext';
import {
  DollarOutlined, RiseOutlined, FallOutlined,
  TeamOutlined, CalendarOutlined, TrophyOutlined,
  BarChartOutlined, LineChartOutlined, MinusOutlined,
  FileExcelOutlined, DownloadOutlined, CaretDownOutlined,
  CrownOutlined, FireOutlined, ThunderboltOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

// ── Tipos ─────────────────────────────────────────────────
type MesData     = { mes: string; ingresos: number; gastos: number; utilidad: number };
type ServicioTop = { nombre: string; total: number; cantidad: number };
type BarberRank  = { nombre: string; citas: number; completadas: number; ingresos: number };

export type OwnerStats = {
  ingresosMesAct:    number;
  ingresosMesPas:    number;
  gastosMesAct:      number;
  gastosMesPas:      number;
  utilidadMesAct:    number;
  utilidadMesPas:    number;
  margenMes:         number;
  ingresoYTD:        number;
  varIngresos:       number | null;
  varGastos:         number | null;
  varUtilidad:       number | null;
  totalClientes:     number;
  clientesNuevosMes: number;
  citasMesAct:       number;
  citasCompletadasMes: number;
  tasaCompletacion:  number;
  ingresosVsGastos:  MesData[];
  topServicios:      ServicioTop[];
  rankingBarberos:   BarberRank[];
  mesMostrado:       string;
  mesPasadoMostrado: string;
};

// ── Paleta dorada para OWNER ───────────────────────────────
const GOLD = {
  main:   '#d4a017',
  light:  '#f5c842',
  dark:   '#a07810',
  soft:   'rgba(212,160,23,0.10)',
  border: 'rgba(212,160,23,0.22)',
};

const PIE_COLORS = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4', '#ccfbf1'];

// ── Tooltip financiero ─────────────────────────────────────
function TooltipFinanciero({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1a1a2e', border: `1px solid ${GOLD.border}`,
      borderRadius: 10, padding: '10px 16px', fontSize: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)', minWidth: 160,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: '#fff', fontSize: 13 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 4 }}>
          <span style={{ color: p.color, fontWeight: 600 }}>
            {p.name === 'ingresos' ? 'Ingresos' : p.name === 'gastos' ? 'Gastos' : 'Utilidad'}
          </span>
          <span style={{ fontWeight: 700, color: '#fff' }}>
            ${p.value.toLocaleString('es-SV', { minimumFractionDigits: 2 })}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Badge de variación ─────────────────────────────────────
function VarBadge({ value }: { value: number | null }) {
  if (value === null) return <span style={{ fontSize: 11, color: '#666' }}>—</span>;
  const up      = value > 0;
  const neutral = value === 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      background: neutral ? 'rgba(150,150,150,0.1)' : up ? 'rgba(82,196,26,0.12)' : 'rgba(255,77,79,0.12)',
      color: neutral ? '#888' : up ? '#52c41a' : '#ff4d4f',
    }}>
      {neutral ? <MinusOutlined /> : up ? <RiseOutlined /> : <FallOutlined />}
      {Math.abs(value)}% vs mes ant.
    </span>
  );
}

// ── KPI Card premium ───────────────────────────────────────
function KpiCard({ label, value, suffix, icon, color, badge, extra }: {
  label: string; value: number; suffix?: string;
  icon: React.ReactNode; color: string;
  badge?: React.ReactNode; extra?: React.ReactNode;
}) {
  return (
    <Card
      size="small"
      style={{
        borderRadius: 14,
        border: `1px solid ${color}30`,
        background: `linear-gradient(135deg, ${color}08 0%, transparent 100%)`,
        boxShadow: `0 2px 12px ${color}15`,
        height: '100%',
      }}
      styles={{ body: { padding: '16px 18px' } }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17, color,
        }}>
          {icon}
        </div>
        {badge}
      </div>
      <Statistic
        value={value}
        precision={2}
        suffix={suffix ? <span style={{ fontSize: 11, opacity: 0.6 }}>{suffix}</span> : undefined}
        valueStyle={{ color, fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}
      />
      <div style={{ fontSize: 11, color: '#888', fontWeight: 500, marginTop: 2, marginBottom: 6 }}>
        {label}
      </div>
      {extra}
    </Card>
  );
}

// ── Excel Export ───────────────────────────────────────────
async function exportToExcel(stats: OwnerStats, type: string) {
  const XLSX = (await import('xlsx')).default;

  let ws: ReturnType<typeof XLSX.utils.aoa_to_sheet>;
  let sheetName: string;
  let fileName: string;

  if (type === 'financiero') {
    const rows = [
      ['Reporte Financiero — Flujo de los últimos 6 meses'],
      [],
      ['Mes', 'Ingresos (USD)', 'Gastos (USD)', 'Utilidad (USD)'],
      ...stats.ingresosVsGastos.map(m => [m.mes, m.ingresos, m.gastos, m.utilidad]),
      [],
      ['Resumen del mes actual'],
      ['Ingresos', stats.ingresosMesAct],
      ['Gastos', stats.gastosMesAct],
      ['Utilidad neta', stats.utilidadMesAct],
      ['Margen (%)', stats.margenMes],
      ['Ingresos YTD', stats.ingresoYTD],
    ];
    ws = XLSX.utils.aoa_to_sheet(rows);
    sheetName = 'Financiero';
    fileName = `reporte-financiero-${stats.mesMostrado.replace(' ', '-').toLowerCase()}.xlsx`;

  } else if (type === 'servicios') {
    const rows = [
      ['Top Servicios — últimos 30 días'],
      [],
      ['#', 'Servicio', 'Ingresos (USD)', 'Cantidad de veces'],
      ...stats.topServicios.map((s, i) => [i + 1, s.nombre, s.total, s.cantidad]),
    ];
    ws = XLSX.utils.aoa_to_sheet(rows);
    sheetName = 'Top Servicios';
    fileName = `top-servicios-${stats.mesMostrado.replace(' ', '-').toLowerCase()}.xlsx`;

  } else {
    const rows = [
      [`Ranking de Barberos — ${stats.mesMostrado}`],
      [],
      ['#', 'Barbero', 'Citas totales', 'Completadas', 'Ingresos (USD)'],
      ...stats.rankingBarberos.map((b, i) => [i + 1, b.nombre, b.citas, b.completadas, b.ingresos]),
    ];
    ws = XLSX.utils.aoa_to_sheet(rows);
    sheetName = 'Barberos';
    fileName = `ranking-barberos-${stats.mesMostrado.replace(' ', '-').toLowerCase()}.xlsx`;
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}

// ── Componente principal ───────────────────────────────────
export default function OwnerDashboardClient({ stats, userName }: { stats: OwnerStats; userName: string }) {
  const { theme: barberTheme } = useBarberTheme();
  const primary = barberTheme.colorPrimary;
  const { token } = theme.useToken();
  const [exportLoading, setExportLoading] = useState(false);

  const C = {
    success:  token.colorSuccess,
    error:    token.colorError,
    warning:  token.colorWarning,
    textMuted: 'rgba(150,150,150,0.9)',
  };

  const utilidadColor = stats.utilidadMesAct >= 0 ? C.success : C.error;

  // Datos para gráfica de barras de barberos
  const barberBarData = stats.rankingBarberos.slice(0, 5).map(b => ({
    name: b.nombre.split(' ')[0],
    Ingresos: b.ingresos,
    Citas: b.completadas,
  }));

  // Datos para pie chart de servicios
  const pieData = stats.topServicios.slice(0, 6).map(s => ({
    name: s.nombre.length > 18 ? s.nombre.slice(0, 18) + '…' : s.nombre,
    value: s.total,
  }));

  // Radial para tasa de completación
  const radialData = [{ name: 'Tasa', value: stats.tasaCompletacion, fill: primary }];

  async function handleExport(type: string) {
    setExportLoading(true);
    try { await exportToExcel(stats, type); }
    finally { setExportLoading(false); }
  }

  const exportItems = [
    { key: 'financiero', label: 'Reporte financiero (6 meses)', icon: <BarChartOutlined /> },
    { key: 'servicios',  label: 'Top servicios del mes',        icon: <LineChartOutlined /> },
    { key: 'barberos',   label: 'Ranking de barberos',          icon: <TrophyOutlined /> },
  ];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>

      {/* ── Header ejecutivo premium ── */}
      <div style={{
        marginBottom: 24,
        background: 'linear-gradient(135deg, #0d1117 0%, #1a2332 50%, #0d1117 100%)',
        border: `1px solid ${GOLD.border}`,
        borderRadius: 18,
        padding: '24px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16,
        boxShadow: `0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 ${GOLD.border}`,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decoración de fondo */}
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 200, height: 200, borderRadius: '50%',
          background: `radial-gradient(circle, ${GOLD.main}15 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: `linear-gradient(135deg, ${GOLD.main} 0%, ${GOLD.dark} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 12px ${GOLD.main}50`,
            flexShrink: 0,
          }}>
            <CrownOutlined style={{ fontSize: 24, color: '#fff' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Title level={4} style={{ margin: 0, color: '#fff', fontSize: 20 }}>
                Panel Ejecutivo
              </Title>
              <Tag style={{
                background: `linear-gradient(135deg, ${GOLD.main} 0%, ${GOLD.dark} 100%)`,
                border: 'none', color: '#fff', fontWeight: 700,
                fontSize: 11, borderRadius: 12, padding: '2px 10px',
              }}>
                PROPIETARIO
              </Tag>
            </div>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>
              Bienvenido, {userName.split(' ')[0]} · Resumen de {stats.mesMostrado}
            </Text>
          </div>
        </div>

        {/* Botón de exportación */}
        <Dropdown
          menu={{
            items: exportItems.map(e => ({
              key: e.key,
              icon: e.icon,
              label: e.label,
              onClick: () => handleExport(e.key),
            })),
          }}
          placement="bottomRight"
        >
          <Button
            loading={exportLoading}
            icon={<FileExcelOutlined />}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${GOLD.border}`,
              color: GOLD.light,
              borderRadius: 10,
              fontWeight: 600,
              height: 38,
            }}
          >
            Exportar Excel <CaretDownOutlined style={{ fontSize: 10 }} />
          </Button>
        </Dropdown>
      </div>

      {/* ── KPIs financieros — fila 1 ── */}
      <Row gutter={[14, 14]} style={{ marginBottom: 14 }}>
        <Col xs={12} sm={12} md={6}>
          <KpiCard
            label={`Ingresos — ${stats.mesMostrado}`}
            value={stats.ingresosMesAct}
            suffix="USD"
            icon={<DollarOutlined />}
            color={C.success}
            badge={<VarBadge value={stats.varIngresos} />}
            extra={<Progress percent={Math.min(100, stats.ingresosMesAct > 0 ? 100 : 0)} showInfo={false} size="small" strokeColor={C.success} style={{ marginTop: 2 }} />}
          />
        </Col>
        <Col xs={12} sm={12} md={6}>
          <KpiCard
            label={`Gastos — ${stats.mesMostrado}`}
            value={stats.gastosMesAct}
            suffix="USD"
            icon={<FallOutlined />}
            color={C.error}
            badge={<VarBadge value={stats.varGastos} />}
          />
        </Col>
        <Col xs={12} sm={12} md={6}>
          <KpiCard
            label={`Utilidad — ${stats.mesMostrado}`}
            value={stats.utilidadMesAct}
            suffix="USD"
            icon={<RiseOutlined />}
            color={utilidadColor}
            badge={<VarBadge value={stats.varUtilidad} />}
            extra={
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                Margen: <strong style={{ color: utilidadColor }}>{stats.margenMes}%</strong>
              </div>
            }
          />
        </Col>
        <Col xs={12} sm={12} md={6}>
          <KpiCard
            label="Ingresos acumulados (YTD)"
            value={stats.ingresoYTD}
            suffix="YTD"
            icon={<BarChartOutlined />}
            color={GOLD.main}
            extra={
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                Acumulado del año en curso
              </div>
            }
          />
        </Col>
      </Row>

      {/* ── KPIs operativos — fila 2 ── */}
      <Row gutter={[14, 14]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={12} md={6}>
          <KpiCard
            label="Total clientes"
            value={stats.totalClientes}
            icon={<TeamOutlined />}
            color="#722ed1"
            extra={
              <div style={{ fontSize: 11, color: C.success, fontWeight: 600, marginTop: 4 }}>
                +{stats.clientesNuevosMes} nuevos este mes
              </div>
            }
          />
        </Col>
        <Col xs={12} sm={12} md={6}>
          <KpiCard
            label={`Citas — ${stats.mesMostrado}`}
            value={stats.citasMesAct}
            icon={<CalendarOutlined />}
            color="#0891b2"
            extra={
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                {stats.citasCompletadasMes} completadas
              </div>
            }
          />
        </Col>
        <Col xs={12} sm={12} md={6}>
          <KpiCard
            label="Tasa de completación"
            value={stats.tasaCompletacion}
            suffix="%"
            icon={<TrophyOutlined />}
            color={C.warning}
            extra={
              <Progress
                percent={stats.tasaCompletacion}
                showInfo={false}
                size="small"
                strokeColor={{ '0%': C.warning, '100%': C.success }}
                style={{ marginTop: 4 }}
              />
            }
          />
        </Col>
        <Col xs={12} sm={12} md={6}>
          <KpiCard
            label="Clientes nuevos este mes"
            value={stats.clientesNuevosMes}
            icon={<FireOutlined />}
            color="#eb5757"
            extra={
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                De {stats.totalClientes} clientes totales
              </div>
            }
          />
        </Col>
      </Row>

      {/* ── Gráfica principal: Flujo financiero 6 meses ── */}
      <Row gutter={[14, 14]} style={{ marginBottom: 14 }}>
        <Col xs={24} lg={16}>
          <Card
            style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)' }}
            styles={{ body: { padding: '16px 20px 20px' } }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <LineChartOutlined style={{ color: primary }} />
                  <Text strong style={{ fontSize: 14 }}>Flujo financiero — últimos 6 meses</Text>
                </div>
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() => handleExport('financiero')}
                  style={{ fontSize: 11 }}
                >
                  Excel
                </Button>
              </div>
            }
          >
            {stats.ingresosVsGastos.some(m => m.ingresos > 0 || m.gastos > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={stats.ingresosVsGastos} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={primary} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={primary} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gGastos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.error} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={C.error} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gUtilidad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={GOLD.main} stopOpacity={0.20} />
                      <stop offset="95%" stopColor={GOLD.main} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} width={56}
                    tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                  />
                  <ReTooltip content={<TooltipFinanciero />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                    formatter={v => v === 'ingresos' ? 'Ingresos' : v === 'gastos' ? 'Gastos' : 'Utilidad'}
                  />
                  <Area type="monotone" dataKey="ingresos" name="ingresos" stroke={primary} strokeWidth={2.5} fill="url(#gIngresos)" dot={{ r: 4, fill: primary, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  <Area type="monotone" dataKey="gastos"   name="gastos"   stroke={C.error}  strokeWidth={2}   strokeDasharray="5 3" fill="url(#gGastos)"   dot={{ r: 4, fill: C.error,  strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  <Area type="monotone" dataKey="utilidad" name="utilidad" stroke={GOLD.main} strokeWidth={2} fill="url(#gUtilidad)" dot={{ r: 3, fill: GOLD.main, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
                <BarChartOutlined style={{ fontSize: 40, marginBottom: 12 }} />
                <Text type="secondary">Sin datos financieros en los últimos 6 meses</Text>
              </div>
            )}
          </Card>
        </Col>

        {/* Radial — tasa de completación */}
        <Col xs={24} lg={8}>
          <Card
            style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', height: '100%' }}
            styles={{ body: { padding: '16px 20px' } }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrophyOutlined style={{ color: C.warning }} />
                <Text strong style={{ fontSize: 14 }}>Rendimiento operativo</Text>
              </div>
            }
          >
            {/* Radial chart */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: 160, height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="65%" outerRadius="90%" data={radialData} startAngle={210} endAngle={-30}>
                    <RadialBar dataKey="value" cornerRadius={8} background={{ fill: 'rgba(255,255,255,0.06)' }} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 28, fontWeight: 900, color: primary, lineHeight: 1 }}>
                    {stats.tasaCompletacion}%
                  </span>
                  <span style={{ fontSize: 11, color: '#888', marginTop: 2 }}>completadas</span>
                </div>
              </div>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            {/* Mini stats operativas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Citas totales',    value: stats.citasMesAct,        color: '#0891b2' },
                { label: 'Completadas',      value: stats.citasCompletadasMes, color: C.success },
                { label: 'Clientes nuevos',  value: stats.clientesNuevosMes,  color: '#722ed1' },
                { label: 'Total clientes',   value: stats.totalClientes,      color: primary },
              ].map(s => (
                <div key={s.label} style={{
                  background: `${s.color}0f`, borderRadius: 10,
                  padding: '10px 12px', border: `1px solid ${s.color}20`,
                }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* ── Gráfica barberos + Pie servicios ── */}
      <Row gutter={[14, 14]} style={{ marginBottom: 14 }}>
        {/* Bar chart barberos */}
        <Col xs={24} lg={14}>
          <Card
            style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)' }}
            styles={{ body: { padding: '16px 20px 20px' } }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ThunderboltOutlined style={{ color: GOLD.main }} />
                  <Text strong style={{ fontSize: 14 }}>Rendimiento por barbero — {stats.mesMostrado}</Text>
                </div>
                <Button size="small" icon={<DownloadOutlined />} onClick={() => handleExport('barberos')} style={{ fontSize: 11 }}>
                  Excel
                </Button>
              </div>
            }
          >
            {barberBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barberBarData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} width={50}
                    tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                  />
                  <ReTooltip
                    contentStyle={{ background: '#1a1a2e', border: `1px solid ${GOLD.border}`, borderRadius: 10, fontSize: 12 }}
                    formatter={(val: unknown, name: unknown): [string, string] => [
                      name === 'Ingresos' ? `$${Number(val).toFixed(2)}` : String(val),
                      String(name),
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Ingresos" fill={primary} radius={[6, 6, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Citas"    fill={GOLD.main}  radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
                <Text type="secondary">Sin datos de barberos este mes</Text>
              </div>
            )}
          </Card>
        </Col>

        {/* Pie chart servicios */}
        <Col xs={24} lg={10}>
          <Card
            style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', height: '100%' }}
            styles={{ body: { padding: '16px 20px' } }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FireOutlined style={{ color: '#eb5757' }} />
                  <Text strong style={{ fontSize: 14 }}>Distribución de servicios</Text>
                </div>
                <Button size="small" icon={<DownloadOutlined />} onClick={() => handleExport('servicios')} style={{ fontSize: 11 }}>
                  Excel
                </Button>
              </div>
            }
          >
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ReTooltip
                      contentStyle={{ background: '#1a1a2e', border: `1px solid ${GOLD.border}`, borderRadius: 10, fontSize: 12 }}
                      formatter={(val: unknown) => [`$${Number(val).toFixed(2)}`, 'Total']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                  {pieData.map((s, i) => (
                    <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                        <span style={{ fontSize: 11.5, color: '#bbb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>{s.name}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }}>
                        ${s.value.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
                <Text type="secondary">Sin datos de servicios</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Comparativa mes + Ranking full ── */}
      <Row gutter={[14, 14]}>
        {/* Comparativa mes vs anterior */}
        <Col xs={24} lg={10}>
          <Card
            style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', height: '100%' }}
            styles={{ body: { padding: '16px 20px' } }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChartOutlined style={{ color: primary }} />
                <Text strong style={{ fontSize: 14 }}>Comparativa — mes vs anterior</Text>
              </div>
            }
          >
            <div style={{ paddingTop: 6 }}>
              {[
                { label: 'Ingresos', actual: stats.ingresosMesAct, pasado: stats.ingresosMesPas, color: C.success },
                { label: 'Gastos',   actual: stats.gastosMesAct,   pasado: stats.gastosMesPas,   color: C.error },
                { label: 'Utilidad', actual: stats.utilidadMesAct, pasado: stats.utilidadMesPas, color: GOLD.main },
              ].map(row => {
                const max = Math.max(Math.abs(row.actual), Math.abs(row.pasado), 1);
                const pctAct = (Math.abs(row.actual) / max) * 100;
                const pctPas = (Math.abs(row.pasado) / max) * 100;
                return (
                  <div key={row.label} style={{ marginBottom: 22 }}>
                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>{row.label}</Text>
                    {[
                      { label: stats.mesMostrado,      pct: pctAct, val: row.actual, opacity: 1 },
                      { label: stats.mesPasadoMostrado, pct: pctPas, val: row.pasado, opacity: 0.45 },
                    ].map(r => (
                      <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                        <span style={{ fontSize: 10, color: '#666', width: 56, flexShrink: 0 }}>{r.label}</span>
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.07)', borderRadius: 6, height: 9, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 6, background: row.color, opacity: r.opacity, width: `${r.pct}%`, transition: 'width 0.6s' }} />
                        </div>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: row.color, opacity: r.opacity, width: 72, textAlign: 'right', flexShrink: 0 }}>
                          ${Math.abs(r.val).toLocaleString('es-SV', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>

        {/* Ranking barberos premium */}
        <Col xs={24} lg={14}>
          <Card
            style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', height: '100%' }}
            styles={{ body: { padding: '16px 20px' } }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrophyOutlined style={{ color: GOLD.main }} />
                  <Text strong style={{ fontSize: 14 }}>Ranking barberos — {stats.mesMostrado}</Text>
                </div>
                <Tag style={{ background: GOLD.soft, border: `1px solid ${GOLD.border}`, color: GOLD.light, borderRadius: 10, fontSize: 11 }}>
                  Por ingresos
                </Tag>
              </div>
            }
          >
            {stats.rankingBarberos.length > 0 ? (
              <div>
                {stats.rankingBarberos.map((b, i) => {
                  const max = stats.rankingBarberos[0].ingresos;
                  const pct = max > 0 ? (b.ingresos / max) * 100 : 0;
                  const medal = ['🥇', '🥈', '🥉'][i] ?? null;
                  const rowColor = i === 0 ? GOLD.main : i === 1 ? '#bbb' : i === 2 ? '#cd7f32' : primary;
                  return (
                    <div key={b.nombre} style={{
                      display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
                      padding: '10px 14px', borderRadius: 10,
                      background: i === 0 ? `${GOLD.main}10` : 'rgba(255,255,255,0.03)',
                      border: i === 0 ? `1px solid ${GOLD.border}` : '1px solid rgba(255,255,255,0.05)',
                    }}>
                      {/* Posición */}
                      <div style={{ width: 30, textAlign: 'center', flexShrink: 0 }}>
                        {medal
                          ? <span style={{ fontSize: 20 }}>{medal}</span>
                          : <span style={{ fontSize: 13, fontWeight: 700, color: '#666' }}>#{i + 1}</span>
                        }
                      </div>

                      {/* Nombre + barra */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 13, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? '#fff' : '#ccc' }}>
                            {b.nombre}
                          </span>
                          <Space size={12}>
                            <span style={{ fontSize: 11, color: '#777' }}>{b.completadas} citas</span>
                            <span style={{ fontSize: 13, fontWeight: 800, color: rowColor }}>
                              ${b.ingresos.toFixed(2)}
                            </span>
                          </Space>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 5, height: 6, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 5,
                            background: `linear-gradient(90deg, ${rowColor} 0%, ${rowColor}aa 100%)`,
                            width: `${pct}%`, transition: 'width 0.7s ease',
                          }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
                <TrophyOutlined style={{ fontSize: 36, marginBottom: 10 }} />
                <Text type="secondary">Sin datos de barberos este mes</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
