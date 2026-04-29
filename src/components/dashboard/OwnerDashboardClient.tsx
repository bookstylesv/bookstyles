'use client';

// ══════════════════════════════════════════════════════════
// OWNER DASHBOARD — 7 tabs + filtro mes/año
// Panel Ejecutivo | Métricas | Ranking | Gastos | Compras & CxP | Planilla | Reportes
// ══════════════════════════════════════════════════════════

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  Row, Col, Card, Statistic, Typography, Tag, Space, theme,
  Progress, Button, Divider, Select, message,
} from 'antd';
import { useBarberTheme } from '@/context/ThemeContext';
import {
  DollarOutlined, RiseOutlined, FallOutlined, TeamOutlined,
  CalendarOutlined, TrophyOutlined, BarChartOutlined, LineChartOutlined,
  MinusOutlined, DownloadOutlined,
  CrownOutlined, FireOutlined, ShoppingCartOutlined, WalletOutlined,
  ExclamationCircleOutlined, CheckCircleOutlined, ClockCircleOutlined,
  TruckOutlined, FileTextOutlined,
  TeamOutlined as TeamIcon,
} from '@ant-design/icons';
import type { OwnerExtendedStats } from '@/modules/owner/owner.service';

const { Title, Text } = Typography;

// ── Re-exportamos el tipo de stats básicas ─────────────────
export type OwnerStats = {
  ingresosMesAct: number; ingresosMesPas: number;
  gastosMesAct:   number; gastosMesPas:   number;
  utilidadMesAct: number; utilidadMesPas: number;
  margenMes:      number; ingresoYTD:     number;
  varIngresos:    number | null; varGastos: number | null; varUtilidad: number | null;
  totalClientes:  number; clientesNuevosMes: number;
  citasMesAct:    number; citasCompletadasMes: number; tasaCompletacion: number;
  ingresosVsGastos: { mes: string; ingresos: number; gastos: number; utilidad: number }[];
  topServicios:     { nombre: string; total: number; cantidad: number }[];
  rankingBarberos:  { nombre: string; citas: number; completadas: number; ingresos: number }[];
  mesMostrado: string; mesPasadoMostrado: string;
};

// ── Paletas ────────────────────────────────────────────────
const PIE_COLORS = ['#0d9488','#14b8a6','#2dd4bf','#5eead4','#0891b2','#6366f1','#a855f7','#ec4899'];
const NOMBRES_MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ── Tooltip genérico ───────────────────────────────────────
function ChartTooltip({ active, payload, label, currency = true }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  currency?: boolean;
}) {
  const { token: t } = theme.useToken();
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: t.colorBgElevated, border: `1px solid ${t.colorBorderSecondary}`,
      borderRadius: 10, padding: '10px 16px', fontSize: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)', minWidth: 150,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: t.colorText, fontSize: 13 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 3 }}>
          <span style={{ color: p.color, fontWeight: 600 }}>{p.name}</span>
          <span style={{ fontWeight: 700, color: t.colorText }}>
            {currency ? `$${Number(p.value).toLocaleString('es-SV', { minimumFractionDigits: 2 })}` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Badge variación ────────────────────────────────────────
function VarBadge({ value }: { value: number | null }) {
  if (value === null) return <span style={{ fontSize: 11, color: 'hsl(var(--text-secondary))' }}>—</span>;
  const up = value > 0; const neutral = value === 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      background: neutral ? 'rgba(150,150,150,0.1)' : up ? 'rgba(82,196,26,0.12)' : 'rgba(255,77,79,0.12)',
      color: neutral ? '#888' : up ? '#52c41a' : '#ff4d4f',
    }}>
      {neutral ? <MinusOutlined /> : up ? <RiseOutlined /> : <FallOutlined />}
      {Math.abs(value)}%
    </span>
  );
}

// ── KPI Card ───────────────────────────────────────────────
function KpiCard({ label, value, suffix, icon, color, badge, extra, precision = 2 }: {
  label: string; value: number; suffix?: string; icon: React.ReactNode;
  color: string; badge?: React.ReactNode; extra?: React.ReactNode; precision?: number;
}) {
  const { token: t } = theme.useToken();
  return (
    <Card size="small" style={{
      borderRadius: 14, border: `1px solid ${color}30`,
      background: `linear-gradient(135deg, ${color}10 0%, ${t.colorBgContainer} 65%)`,
      boxShadow: `0 2px 12px ${color}15`, height: '100%',
    }} styles={{ body: { padding: '16px 18px' } }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17, color,
        }}>{icon}</div>
        {badge}
      </div>
      <Statistic
        value={value} precision={precision}
        suffix={suffix ? <span style={{ fontSize: 11, opacity: 0.6 }}>{suffix}</span> : undefined}
        valueStyle={{ color, fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}
      />
      <div style={{ fontSize: 11, color: t.colorTextSecondary, fontWeight: 500, marginTop: 2, marginBottom: 6 }}>{label}</div>
      {extra}
    </Card>
  );
}


// ═══════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════
export default function OwnerDashboardClient({
  stats, extendedStats, userName, mesFiltro, anioFiltro,
}: {
  stats:         OwnerStats;
  extendedStats: OwnerExtendedStats;
  userName:      string;
  mesFiltro:     number;
  anioFiltro:    number;
}) {
  const { theme: barberTheme } = useBarberTheme();
  const primary   = barberTheme.colorPrimary;
  const { token } = theme.useToken();
  const router    = useRouter();
  const sp        = useSearchParams();
  const activeTab = sp.get('tab') ?? 'panel';
  const [pending, setPending] = useState<string | null>(null);

  const C = {
    success:   token.colorSuccess,
    error:     token.colorError,
    warning:   token.colorWarning,
    textMuted: token.colorTextSecondary,
  };

  // ── Cambiar filtro mes/año ─────────────────────────────
  function updateFilter(field: 'mes' | 'anio', value: number) {
    const params = new URLSearchParams(sp.toString());
    params.set(field, String(value));
    router.push(`/dashboard?${params.toString()}`);
  }

  // ── Cambiar tab preservando filtros ───────────────────
  function goTab(tab: string) {
    const params = new URLSearchParams(sp.toString());
    params.set('tab', tab);
    router.push(`/dashboard?${params.toString()}`);
  }

  const now         = new Date();
  const anioActual  = now.getFullYear();
  const utilidadColor = stats.utilidadMesAct >= 0 ? C.success : C.error;

  // Datos derivados
  const barberBarData  = stats.rankingBarberos.slice(0, 5).map(b => ({ name: b.nombre.split(' ')[0], Ingresos: b.ingresos, Citas: b.completadas }));
  const pieServData    = stats.topServicios.slice(0, 8).map(s => ({ name: s.nombre.length > 18 ? s.nombre.slice(0, 18) + '…' : s.nombre, value: s.total }));
  const radialData     = [{ name: 'Tasa', value: stats.tasaCompletacion, fill: primary }];
  const { cxp }        = extendedStats;
  const cxpPieData     = [
    { name: 'Vencidas',    value: cxp.montoVencido,   color: C.error },
    { name: 'Por vencer',  value: cxp.montoPorVencer, color: C.warning },
    { name: 'Vigentes',    value: cxp.montoVigente,   color: C.success },
  ].filter(d => d.value > 0);

  const tabTitles: Record<string, string> = {
    panel:    'Panel Ejecutivo',
    metricas: 'Métricas financieras',
    ranking:  'Ranking y servicios',
    gastos:   'Análisis de gastos',
    compras:  'Compras y cuentas por pagar',
    planilla: 'Planilla y nómina',
    reportes: 'Reportes',
  };

  // ── Descarga de reportes desde BD ─────────────────────
  async function downloadReport(key: string) {
    if (pending) return;
    setPending(key);
    try {
      const XLSX   = await import('xlsx');
      const wb     = XLSX.utils.book_new();
      const label  = `${NOMBRES_MESES[mesFiltro - 1]} ${anioFiltro}`;
      const slug   = label.replace(' ', '-').toLowerCase();
      const inicio = new Date(anioFiltro, mesFiltro - 1, 1).toISOString().split('T')[0];
      const fin    = new Date(anioFiltro, mesFiltro, 0).toISOString().split('T')[0];

      function hoja(rows: unknown[][], nombre: string) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), nombre);
      }
      async function apiFetch(url: string) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        return json.data;
      }
      // Extrae el array del response independiente de la forma
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function toArray(raw: any): any[] {
        if (Array.isArray(raw)) return raw;
        if (raw?.items)       return raw.items;
        if (raw?.ventas)      return raw.ventas;
        if (raw?.gastos)      return raw.gastos;
        if (raw?.compras)     return raw.compras;
        if (raw?.clientes)    return raw.clientes;
        if (raw?.proveedores) return raw.proveedores;
        if (raw?.productos)   return raw.productos;
        return [];
      }
      function triggerDownload(filename: string) {
        const buf  = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        message.success(`Reporte descargado: ${filename}`);
      }

      switch (key) {
        // ── Ventas ──────────────────────────────────────────────
        case 'ventas': {
          const raw   = await apiFetch(`/api/pos/venta?desde=${inicio}&hasta=${fin}&estado=ACTIVA`);
          const items = toArray(raw);
          if (items.length === 0) { message.warning('No hay ventas registradas en el período seleccionado'); break; }
          hoja([
            [`Reporte de Ventas — ${label}`], [],
            ['#','Fecha','No. Venta','Cliente','Subtotal','IVA','Total','Tipo Doc.'],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...items.map((v: any, i: number) => [
              i + 1,
              v.createdAt ? new Date(v.createdAt).toLocaleDateString('es-SV') : '',
              v.numero ?? '',
              v.clienteNombre || 'Consumidor Final',
              v.subtotal ?? 0,
              v.iva ?? 0,
              v.total ?? 0,
              v.tipoDte === '01' ? 'Factura' : v.tipoDte === '03' ? 'CCF' : (v.tipoDte ?? ''),
            ]),
            [],
            ['Total registros', items.length, '', '', '', '',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              items.reduce((s: number, v: any) => s + (v.total ?? 0), 0)],
          ], 'Ventas');
          triggerDownload(`ventas-${slug}.xlsx`);
          break;
        }

        // ── Gastos ──────────────────────────────────────────────
        case 'gastos': {
          const raw   = await apiFetch(`/api/gastos?desde=${inicio}&hasta=${fin}`);
          const items = toArray(raw);
          if (items.length === 0) { message.warning('No hay gastos registrados en el período seleccionado'); break; }
          hoja([
            [`Reporte de Gastos — ${label}`], [],
            ['#','Fecha','Descripción','Categoría','Monto (USD)'],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...items.map((g: any, i: number) => [
              i + 1,
              g.fecha ? new Date(g.fecha).toLocaleDateString('es-SV') : '',
              g.descripcion ?? '',
              g.categoria?.nombre ?? 'Sin categoría',
              g.monto ?? 0,
            ]),
            [],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ['TOTAL','','','', items.reduce((s: number, g: any) => s + (g.monto ?? 0), 0)],
          ], 'Gastos');
          triggerDownload(`gastos-${slug}.xlsx`);
          break;
        }

        // ── Compras ─────────────────────────────────────────────
        case 'compras': {
          const raw   = await apiFetch(`/api/compras?from=${inicio}&to=${fin}`);
          const items = toArray(raw);
          if (items.length === 0) { message.warning('No hay compras registradas en el período seleccionado'); break; }
          hoja([
            [`Reporte de Compras — ${label}`], [],
            ['#','Fecha','No. Doc.','Proveedor','Tipo','Subtotal','Total','Estado'],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...items.map((c: any, i: number) => [
              i + 1,
              c.fecha ? new Date(c.fecha).toLocaleDateString('es-SV') : '',
              c.numeroDocumento ?? '',
              c.proveedor?.nombre ?? '',
              c.tipoCompra === 'PRODUCTO' ? 'Producto' : 'Servicio/Gasto',
              c.subtotal ?? 0,
              c.total ?? 0,
              c.estado ?? '',
            ]),
            [],
            ['TOTAL','','','','',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              items.reduce((s: number, c: any) => s + (c.subtotal ?? 0), 0),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              items.reduce((s: number, c: any) => s + (c.total ?? 0), 0)],
          ], 'Compras');
          triggerDownload(`compras-${slug}.xlsx`);
          break;
        }

        // ── Citas ────────────────────────────────────────────────
        case 'citas': {
          const raw   = await apiFetch(`/api/appointments?from=${inicio}&to=${fin}`);
          const items = toArray(raw);
          if (items.length === 0) { message.warning('No hay citas registradas en el período seleccionado'); break; }
          hoja([
            [`Reporte de Citas — ${label}`], [],
            ['#','Fecha','Hora','Cliente','Barbero','Servicio','Estado','Monto'],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...items.map((a: any, i: number) => [
              i + 1,
              a.startTime ? new Date(a.startTime).toLocaleDateString('es-SV') : '',
              a.startTime ? new Date(a.startTime).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' }) : '',
              a.client?.fullName ?? '',
              a.barber?.user?.fullName ?? '',
              a.service?.name ?? '',
              a.status ?? '',
              a.payment?.amount ?? a.service?.price ?? 0,
            ]),
            [],
            ['Total citas', items.length],
          ], 'Citas');
          triggerDownload(`citas-${slug}.xlsx`);
          break;
        }

        // ── Clientes ─────────────────────────────────────────────
        case 'clientes': {
          const raw   = await apiFetch('/api/clients');
          const items = toArray(raw);
          if (items.length === 0) { message.warning('No hay clientes registrados'); break; }
          hoja([
            ['Reporte de Clientes'], [],
            ['#','Nombre','Email','Teléfono','DUI','Fecha Registro'],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...items.map((c: any, i: number) => [
              i + 1,
              c.fullName ?? '',
              c.email ?? '',
              c.phone ?? '',
              c.dui ?? '',
              c.createdAt ? new Date(c.createdAt).toLocaleDateString('es-SV') : '',
            ]),
            [],
            ['Total clientes', items.length],
          ], 'Clientes');
          triggerDownload('clientes.xlsx');
          break;
        }

        // ── CxP ──────────────────────────────────────────────────
        case 'cxp': {
          const raw   = await apiFetch('/api/cxp');
          const items = toArray(raw);
          if (items.length === 0) { message.warning('No hay cuentas por pagar registradas'); break; }
          hoja([
            ['Reporte Cuentas por Pagar — Estado actual'], [],
            ['#','No. Doc.','Proveedor','Fecha','Total (USD)','Saldo (USD)','Estado','Vencimiento'],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...items.map((c: any, i: number) => [
              i + 1,
              c.numeroDocumento ?? '',
              c.proveedor?.nombre ?? '',
              c.fecha ? new Date(c.fecha).toLocaleDateString('es-SV') : '',
              c.total ?? 0,
              c.saldo ?? 0,
              c.estadoCxP ?? '',
              c.fechaVencimiento ? new Date(c.fechaVencimiento).toLocaleDateString('es-SV') : '',
            ]),
            [],
            ['TOTALES','','','',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              items.reduce((s: number, c: any) => s + (c.total ?? 0), 0),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              items.reduce((s: number, c: any) => s + (c.saldo ?? 0), 0)],
          ], 'Cuentas por Pagar');
          triggerDownload('cxp-estado-actual.xlsx');
          break;
        }

        // ── Planilla (datos ya cargados) ──────────────────────────
        case 'planilla': {
          if (extendedStats.planillaEvolucion.length === 0) { message.warning('No hay planillas registradas para el año seleccionado'); break; }
          hoja([
            [`Reporte de Planilla — ${anioFiltro}`], [],
            ['── Totales del año ──'],
            ['Concepto','Monto (USD)'],
            ['Salario Bruto Total',   extendedStats.planillaTotalBruto],
            ['Deducciones Totales',   extendedStats.planillaTotalDeducciones],
            ['Salario Neto Total',    extendedStats.planillaTotalNeto],
            ['Costo Patronal Total',  extendedStats.planillaTotalPatronal],
            [],
            ['── Detalle por período ──'],
            ['Período','Salario Bruto (USD)','Deducciones (USD)','Salario Neto (USD)','Costo Patronal (USD)','Estado'],
            ...extendedStats.planillaEvolucion.map(p =>
              [p.periodo, p.totalBruto, p.totalDeducciones, p.totalNeto, p.costoPatronal, p.estado]),
            [],
            ['TOTALES', extendedStats.planillaTotalBruto, extendedStats.planillaTotalDeducciones,
              extendedStats.planillaTotalNeto, extendedStats.planillaTotalPatronal, ''],
          ], 'Planilla');
          triggerDownload(`planilla-${anioFiltro}.xlsx`);
          break;
        }

        // ── Proveedores ───────────────────────────────────────────
        case 'proveedores': {
          const raw   = await apiFetch('/api/proveedores');
          const items = toArray(raw);
          if (items.length === 0) { message.warning('No hay proveedores registrados'); break; }
          hoja([
            ['Reporte de Proveedores'], [],
            ['#','Nombre','NRC','NIT','Teléfono','Email','Dirección','Plazo Crédito (días)'],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...items.map((p: any, i: number) => [
              i + 1,
              p.nombre ?? '',
              p.nrc ?? '',
              p.nit ?? '',
              p.telefono ?? '',
              p.email ?? '',
              p.direccion ?? '',
              p.plazoCredito ?? 0,
            ]),
            [],
            ['Total proveedores', items.length],
          ], 'Proveedores');
          triggerDownload('proveedores.xlsx');
          break;
        }

        // ── Inventario ────────────────────────────────────────────
        case 'inventario': {
          const raw   = await apiFetch('/api/productos');
          const items = toArray(raw);
          if (items.length === 0) { message.warning('No hay productos registrados en el inventario'); break; }
          hoja([
            ['Reporte de Inventario — Estado actual'], [],
            ['#','Código','Producto','Categoría','Unidad','Stock','Stock Mín.','Costo (USD)','Precio Venta (USD)'],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...items.map((p: any, i: number) => [
              i + 1,
              p.codigo ?? '',
              p.nombre ?? '',
              p.categoria?.nombre ?? '',
              p.unidadMedida ?? '',
              p.stock ?? 0,
              p.stockMinimo ?? 0,
              p.costoUnitario ?? p.costo ?? 0,
              p.precioVenta ?? p.precio ?? 0,
            ]),
            [],
            ['Total productos', items.length],
          ], 'Inventario');
          triggerDownload('inventario.xlsx');
          break;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      message.error(`Error al generar el reporte: ${msg}`);
    } finally {
      setPending(null);
    }
  }

  // ── Opciones para Select ───────────────────────────────
  const mesesOpts = NOMBRES_MESES.map((n, i) => ({ value: i + 1, label: n }));
  const aniosOpts = Array.from({ length: 6 }, (_, i) => {
    const a = anioActual - i;
    return { value: a, label: String(a) };
  });

  const tooltipStyle = { background: token.colorBgElevated, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 10, fontSize: 12, color: token.colorText };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>

      {/* ── HEADER ── */}
      <div style={{
        marginBottom: 20,
        background: 'hsl(var(--bg-surface))',
        border: `1px solid ${primary}30`,
        borderRadius: 16, padding: '16px 22px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
        boxShadow: `0 4px 20px ${primary}10`,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle, ${primary}10 0%, transparent 70%)`, pointerEvents: 'none' }} />

        {/* Título + badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, hsl(var(--brand-primary)) 0%, hsl(var(--brand-primary-dark)) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 12px ${primary}40`,
          }}>
            <CrownOutlined style={{ fontSize: 20, color: '#fff' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <Title level={5} style={{ margin: 0, fontSize: 16 }}>{tabTitles[activeTab] ?? 'Panel Ejecutivo'}</Title>
              <Tag style={{
                background: 'linear-gradient(135deg, hsl(var(--brand-primary)) 0%, hsl(var(--brand-primary-dark)) 100%)',
                border: 'none', color: '#fff', fontWeight: 700, fontSize: 10, borderRadius: 10, padding: '1px 8px',
              }}>PROPIETARIO</Tag>
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>{userName.split(' ')[0]}</Text>
          </div>
        </div>

        {/* Filtros mes/año */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Select
            value={mesFiltro}
            onChange={v => updateFilter('mes', v)}
            options={mesesOpts}
            size="small"
            style={{ width: 118 }}
            popupMatchSelectWidth={false}
          />
          <Select
            value={anioFiltro}
            onChange={v => updateFilter('anio', v)}
            options={aniosOpts}
            size="small"
            style={{ width: 78 }}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          TAB PANEL EJECUTIVO — 8 KPI cards
      ══════════════════════════════════════════════════ */}
      {activeTab === 'panel' && (
        <>
          <Row gutter={[14, 14]} style={{ marginBottom: 14 }}>
            <Col xs={12} md={6}>
              <KpiCard label={`Ingresos — ${stats.mesMostrado}`} value={stats.ingresosMesAct} suffix="USD" icon={<DollarOutlined />} color={C.success} badge={<VarBadge value={stats.varIngresos} />}
                extra={<Progress percent={stats.ingresosMesAct > 0 ? 100 : 0} showInfo={false} size="small" strokeColor={C.success} style={{ marginTop: 2 }} />}
              />
            </Col>
            <Col xs={12} md={6}>
              <KpiCard label={`Gastos — ${stats.mesMostrado}`} value={stats.gastosMesAct} suffix="USD" icon={<FallOutlined />} color={C.error} badge={<VarBadge value={stats.varGastos} />} />
            </Col>
            <Col xs={12} md={6}>
              <KpiCard label={`Utilidad — ${stats.mesMostrado}`} value={stats.utilidadMesAct} suffix="USD" icon={<RiseOutlined />} color={utilidadColor} badge={<VarBadge value={stats.varUtilidad} />}
                extra={<div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>Margen: <strong style={{ color: utilidadColor }}>{stats.margenMes}%</strong></div>}
              />
            </Col>
            <Col xs={12} md={6}>
              <KpiCard label="Ingresos YTD" value={stats.ingresoYTD} suffix="USD" icon={<BarChartOutlined />} color={primary}
                extra={<div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>Acumulado año {anioFiltro}</div>}
              />
            </Col>
          </Row>
          <Row gutter={[14, 14]}>
            <Col xs={12} md={6}>
              <KpiCard label="Total clientes" value={stats.totalClientes} precision={0} icon={<TeamOutlined />} color="#722ed1"
                extra={<div style={{ fontSize: 11, color: C.success, fontWeight: 600, marginTop: 4 }}>+{stats.clientesNuevosMes} nuevos</div>}
              />
            </Col>
            <Col xs={12} md={6}>
              <KpiCard label={`Citas — ${stats.mesMostrado}`} value={stats.citasMesAct} precision={0} icon={<CalendarOutlined />} color="#0891b2"
                extra={<div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{stats.citasCompletadasMes} completadas</div>}
              />
            </Col>
            <Col xs={12} md={6}>
              <KpiCard label="Tasa de completación" value={stats.tasaCompletacion} suffix="%" icon={<TrophyOutlined />} color={C.warning}
                extra={<Progress percent={stats.tasaCompletacion} showInfo={false} size="small" strokeColor={{ '0%': C.warning, '100%': C.success }} style={{ marginTop: 4 }} />}
              />
            </Col>
            <Col xs={12} md={6}>
              <KpiCard label="Compras del mes" value={extendedStats.comprasMes} suffix="USD" icon={<ShoppingCartOutlined />} color="#f59e0b"
                extra={<div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{extendedStats.comprasCount} órdenes registradas</div>}
              />
            </Col>
          </Row>
        </>
      )}

      {/* ══════════════════════════════════════════════════
          TAB MÉTRICAS — flujo financiero + operativo
      ══════════════════════════════════════════════════ */}
      {activeTab === 'metricas' && (
        <>
          {/* Área chart 6 meses */}
          <Card style={{ borderRadius: 14, border: '1px solid hsl(var(--border-default))', marginBottom: 14 }}
            styles={{ body: { padding: '16px 20px 20px' } }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <LineChartOutlined style={{ color: primary }} />
                  <Text strong style={{ fontSize: 14 }}>Flujo financiero — últimos 6 meses</Text>
                </div>
                              </div>
            }
          >
            {stats.ingresosVsGastos.some(m => m.ingresos > 0 || m.gastos > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={stats.ingresosVsGastos} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gIng" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={primary}  stopOpacity={0.3} />
                      <stop offset="95%" stopColor={primary}  stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gGas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.error}  stopOpacity={0.25} />
                      <stop offset="95%" stopColor={C.error}  stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gUti" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.success} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={C.success} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-default))" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fill: token.colorText }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: token.colorTextSecondary }} axisLine={false} tickLine={false} width={62} tickFormatter={(v: number) => `$${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`} />
                  <ReTooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10, color: token.colorText }} />
                  <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke={primary}   strokeWidth={2.5} fill="url(#gIng)" dot={{ r: 4, fill: primary,   strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  <Area type="monotone" dataKey="gastos"   name="Gastos"   stroke={C.error}   strokeWidth={2}   strokeDasharray="5 3" fill="url(#gGas)" dot={{ r: 4, fill: C.error,   strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  <Area type="monotone" dataKey="utilidad" name="Utilidad" stroke={C.success} strokeWidth={2}   fill="url(#gUti)" dot={{ r: 3, fill: C.success, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <BarChartOutlined style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }} />
                <Text type="secondary">Sin datos en el período seleccionado</Text>
              </div>
            )}
          </Card>

          {/* Radial + Comparativa */}
          <Row gutter={[14, 14]}>
            <Col xs={24} lg={9}>
              <Card style={{ borderRadius: 14, border: '1px solid hsl(var(--border-default))', height: '100%' }}
                styles={{ body: { padding: '16px 20px' } }}
                title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TrophyOutlined style={{ color: C.warning }} /><Text strong style={{ fontSize: 14 }}>Rendimiento operativo</Text></div>}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: 170, height: 170 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart cx="50%" cy="50%" innerRadius="65%" outerRadius="90%" data={radialData} startAngle={210} endAngle={-30}>
                        <RadialBar dataKey="value" cornerRadius={8} background={{ fill: 'hsl(var(--bg-subtle))' }} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 30, fontWeight: 900, color: primary, lineHeight: 1 }}>{stats.tasaCompletacion}%</span>
                      <span style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>completadas</span>
                    </div>
                  </div>
                </div>
                <Divider style={{ margin: '12px 0' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Citas totales',  value: stats.citasMesAct,          color: '#0891b2' },
                    { label: 'Completadas',     value: stats.citasCompletadasMes,  color: C.success },
                    { label: 'Clientes nuevos', value: stats.clientesNuevosMes,    color: '#722ed1' },
                    { label: 'Total clientes',  value: stats.totalClientes,        color: primary   },
                  ].map(s => (
                    <div key={s.label} style={{ background: `${s.color}0f`, borderRadius: 10, padding: '10px 12px', border: `1px solid ${s.color}20` }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: token.colorTextSecondary, marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={15}>
              <Card style={{ borderRadius: 14, border: '1px solid hsl(var(--border-default))', height: '100%' }}
                styles={{ body: { padding: '16px 20px' } }}
                title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><BarChartOutlined style={{ color: primary }} /><Text strong style={{ fontSize: 14 }}>Comparativa — {stats.mesMostrado} vs {stats.mesPasadoMostrado}</Text></div>}
              >
                <div style={{ paddingTop: 6 }}>
                  {[
                    { label: 'Ingresos', actual: stats.ingresosMesAct, pasado: stats.ingresosMesPas, color: C.success },
                    { label: 'Gastos',   actual: stats.gastosMesAct,   pasado: stats.gastosMesPas,   color: C.error   },
                    { label: 'Utilidad', actual: stats.utilidadMesAct, pasado: stats.utilidadMesPas, color: primary   },
                  ].map(row => {
                    const max = Math.max(Math.abs(row.actual), Math.abs(row.pasado), 1);
                    return (
                      <div key={row.label} style={{ marginBottom: 26 }}>
                        <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>{row.label}</Text>
                        {[
                          { label: stats.mesMostrado,       pct: (Math.abs(row.actual) / max) * 100, val: row.actual, opacity: 1    },
                          { label: stats.mesPasadoMostrado, pct: (Math.abs(row.pasado) / max) * 100, val: row.pasado, opacity: 0.45 },
                        ].map(r => (
                          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                            <span style={{ fontSize: 10, color: token.colorTextSecondary, width: 70, flexShrink: 0 }}>{r.label}</span>
                            <div style={{ flex: 1, background: 'hsl(var(--bg-subtle))', borderRadius: 6, height: 10, overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 6, background: row.color, opacity: r.opacity, width: `${r.pct}%`, transition: 'width 0.6s' }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: row.color, opacity: r.opacity, width: 78, textAlign: 'right', flexShrink: 0 }}>
                              ${Math.abs(r.val).toLocaleString('es-SV', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* ══════════════════════════════════════════════════
          TAB RANKING — barberos + servicios
      ══════════════════════════════════════════════════ */}
      {activeTab === 'ranking' && (
        <>
          <Row gutter={[14, 14]} style={{ marginBottom: 14 }}>
            <Col xs={24} lg={14}>
              <Card style={{ borderRadius: 14, border: '1px solid hsl(var(--border-default))' }}
                styles={{ body: { padding: '16px 20px 20px' } }}
                title={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <BarChartOutlined style={{ color: primary }} />
                      <Text strong style={{ fontSize: 14 }}>Rendimiento por barbero — {stats.mesMostrado}</Text>
                    </div>
                                      </div>
                }
              >
                {barberBarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={barberBarData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-default))" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: token.colorText }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: token.colorTextSecondary }} axisLine={false} tickLine={false} width={54} tickFormatter={(v: number) => `$${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`} />
                      <ReTooltip contentStyle={tooltipStyle} formatter={(val: unknown, name: unknown): [string, string] => [name === 'Ingresos' ? `$${Number(val).toFixed(2)}` : String(val), String(name)]} />
                      <Legend wrapperStyle={{ fontSize: 12, color: token.colorText }} />
                      <Bar dataKey="Ingresos" fill={primary}    radius={[6,6,0,0]} maxBarSize={40} />
                      <Bar dataKey="Citas"    fill={C.warning}  radius={[6,6,0,0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Text type="secondary">Sin datos de barberos en este período</Text>
                  </div>
                )}
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card style={{ borderRadius: 14, border: '1px solid hsl(var(--border-default))', height: '100%' }}
                styles={{ body: { padding: '16px 20px' } }}
                title={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FireOutlined style={{ color: '#eb5757' }} />
                      <Text strong style={{ fontSize: 14 }}>Top servicios</Text>
                    </div>
                                      </div>
                }
              >
                {pieServData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={185}>
                      <PieChart>
                        <Pie data={pieServData} cx="50%" cy="50%" innerRadius={50} outerRadius={78} dataKey="value" paddingAngle={3}>
                          {pieServData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <ReTooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`$${Number(v).toFixed(2)}`, 'Total']} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {pieServData.map((s, i) => (
                        <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                            <span style={{ fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>{s.name}</span>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }}>${s.value.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Text type="secondary">Sin datos de servicios</Text>
                  </div>
                )}
              </Card>
            </Col>
          </Row>

          {/* Tabla ranking */}
          <Card style={{ borderRadius: 14, border: '1px solid hsl(var(--border-default))' }}
            styles={{ body: { padding: '16px 20px' } }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrophyOutlined style={{ color: primary }} />
                  <Text strong style={{ fontSize: 14 }}>Ranking barberos — {stats.mesMostrado}</Text>
                </div>
                <Tag style={{ background: `${primary}12`, border: `1px solid ${primary}30`, color: primary, borderRadius: 10, fontSize: 11 }}>Por ingresos</Tag>
              </div>
            }
          >
            {stats.rankingBarberos.length > 0 ? stats.rankingBarberos.map((b, i) => {
              const max      = stats.rankingBarberos[0].ingresos;
              const pct      = max > 0 ? (b.ingresos / max) * 100 : 0;
              const medal    = ['🥇','🥈','🥉'][i] ?? null;
              const rowColor = i === 0 ? primary : i === 1 ? '#bbb' : i === 2 ? '#cd7f32' : C.textMuted;
              return (
                <div key={b.nombre} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, padding: '10px 14px', borderRadius: 10, background: i === 0 ? `${primary}10` : 'hsl(var(--bg-subtle))', border: i === 0 ? `1px solid ${primary}30` : '1px solid hsl(var(--border-default))' }}>
                  <div style={{ width: 30, textAlign: 'center', flexShrink: 0 }}>
                    {medal ? <span style={{ fontSize: 20 }}>{medal}</span> : <span style={{ fontSize: 13, fontWeight: 700, color: token.colorTextSecondary }}>#{i+1}</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? primary : token.colorText }}>{b.nombre}</span>
                      <Space size={12}>
                        <span style={{ fontSize: 11, color: token.colorTextSecondary }}>{b.completadas} citas</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: rowColor }}>${b.ingresos.toFixed(2)}</span>
                      </Space>
                    </div>
                    <div style={{ background: 'hsl(var(--bg-muted))', borderRadius: 5, height: 6, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 5, background: `linear-gradient(90deg, ${rowColor} 0%, ${rowColor}aa 100%)`, width: `${pct}%`, transition: 'width 0.7s' }} />
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div style={{ height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <TrophyOutlined style={{ fontSize: 36, marginBottom: 10, opacity: 0.3 }} />
                <Text type="secondary">Sin datos en este período</Text>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ══════════════════════════════════════════════════
          TAB GASTOS — por categoría + evolución
      ══════════════════════════════════════════════════ */}
      {activeTab === 'gastos' && (
        <>
          {/* KPI gastos */}
          <Row gutter={[14, 14]} style={{ marginBottom: 14 }}>
            <Col xs={12} md={6}>
              <KpiCard label={`Total gastos — ${stats.mesMostrado}`} value={extendedStats.gastosTotalMes} suffix="USD" icon={<WalletOutlined />} color={C.error} badge={<VarBadge value={extendedStats.gastosVarPct} />} />
            </Col>
            <Col xs={12} md={6}>
              <KpiCard label="Categorías distintas" value={extendedStats.gastosPorCategoria.length} precision={0} icon={<BarChartOutlined />} color="#f59e0b" />
            </Col>
            <Col xs={12} md={6}>
              <KpiCard label="Mayor categoría" value={extendedStats.gastosPorCategoria[0]?.total ?? 0} suffix="USD" icon={<FireOutlined />} color="#eb5757"
                extra={extendedStats.gastosPorCategoria[0] && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{extendedStats.gastosPorCategoria[0].nombre}</div>}
              />
            </Col>
            <Col xs={12} md={6}>
              <KpiCard label="Transacciones del mes" value={extendedStats.gastosPorCategoria.reduce((s, g) => s + g.count, 0)} precision={0} icon={<CheckCircleOutlined />} color={primary} />
            </Col>
          </Row>

          <Row gutter={[14, 14]}>
            {/* Donut por categoría */}
            <Col xs={24} lg={10}>
              <Card style={{ borderRadius: 14, border: '1px solid hsl(var(--border-default))', height: '100%' }}
                styles={{ body: { padding: '16px 20px' } }}
                title={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <WalletOutlined style={{ color: C.error }} />
                      <Text strong style={{ fontSize: 14 }}>Gastos por categoría — {stats.mesMostrado}</Text>
                    </div>
                                      </div>
                }
              >
                {extendedStats.gastosPorCategoria.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={extendedStats.gastosPorCategoria} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="total" paddingAngle={3}>
                          {extendedStats.gastosPorCategoria.map((g, i) => <Cell key={i} fill={g.color || PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <ReTooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`$${Number(v).toFixed(2)}`, 'Total']} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                      {extendedStats.gastosPorCategoria.map((g, i) => (
                        <div key={g.nombre} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 3, background: g.color || PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                            <span style={{ fontSize: 12 }}>{g.nombre}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 10, color: C.textMuted }}>{g.count} reg.</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: g.color || PIE_COLORS[i % PIE_COLORS.length] }}>${g.total.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ height: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <WalletOutlined style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }} />
                    <Text type="secondary">Sin gastos en {stats.mesMostrado}</Text>
                  </div>
                )}
              </Card>
            </Col>

            {/* Línea evolución gastos 6 meses */}
            <Col xs={24} lg={14}>
              <Card style={{ borderRadius: 14, border: '1px solid hsl(var(--border-default))', height: '100%' }}
                styles={{ body: { padding: '16px 20px 20px' } }}
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <LineChartOutlined style={{ color: C.error }} />
                    <Text strong style={{ fontSize: 14 }}>Evolución de gastos — últimos 6 meses</Text>
                  </div>
                }
              >
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={extendedStats.gastosEvolucion} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gGastosEvo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={C.error} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={C.error} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-default))" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12, fill: token.colorText }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: token.colorTextSecondary }} axisLine={false} tickLine={false} width={60} tickFormatter={(v: number) => `$${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`} />
                    <ReTooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`$${Number(v).toFixed(2)}`, 'Gastos']} />
                    <Area type="monotone" dataKey="total" name="Gastos" stroke={C.error} strokeWidth={2.5} fill="url(#gGastosEvo)" dot={{ r: 4, fill: C.error, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* ══════════════════════════════════════════════════
          TAB COMPRAS & CxP — evolución + estado deuda
      ══════════════════════════════════════════════════ */}
      {activeTab === 'compras' && (
        <>
          {/* KPIs compras */}
          <Row gutter={[14, 14]} style={{ marginBottom: 14 }}>
            <Col xs={12} md={6}>
              <KpiCard label={`Total compras — ${stats.mesMostrado}`} value={extendedStats.comprasMes} suffix="USD" icon={<ShoppingCartOutlined />} color="#f59e0b"
                extra={<div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{extendedStats.comprasCount} órdenes</div>}
              />
            </Col>
            <Col xs={12} md={6}>
              <KpiCard label="Compras de productos" value={extendedStats.comprasProductos} suffix="USD" icon={<BarChartOutlined />} color={primary} />
            </Col>
            <Col xs={12} md={6}>
              <KpiCard label="Servicios / gastos ext." value={extendedStats.comprasServicios} suffix="USD" icon={<WalletOutlined />} color="#6366f1" />
            </Col>
            <Col xs={12} md={6}>
              <KpiCard label="Deuda vencida (CxP)" value={cxp.montoVencido} suffix="USD" icon={<ExclamationCircleOutlined />} color={C.error}
                extra={<div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{cxp.countVencidas} documentos</div>}
              />
            </Col>
          </Row>

          <Row gutter={[14, 14]}>
            {/* Barras compras 6 meses */}
            <Col xs={24} lg={15}>
              <Card style={{ borderRadius: 14, border: '1px solid hsl(var(--border-default))' }}
                styles={{ body: { padding: '16px 20px 20px' } }}
                title={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ShoppingCartOutlined style={{ color: '#f59e0b' }} />
                      <Text strong style={{ fontSize: 14 }}>Compras últimos 6 meses — productos vs servicios</Text>
                    </div>
                                      </div>
                }
              >
                <ResponsiveContainer width="100%" height={270}>
                  <BarChart data={extendedStats.comprasEvolucion} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-default))" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12, fill: token.colorText }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: token.colorTextSecondary }} axisLine={false} tickLine={false} width={60} tickFormatter={(v: number) => `$${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`} />
                    <ReTooltip contentStyle={tooltipStyle} formatter={(v: unknown, n: unknown) => [`$${Number(v).toFixed(2)}`, String(n)]} />
                    <Legend wrapperStyle={{ fontSize: 12, color: token.colorText }} />
                    <Bar dataKey="productos" name="Productos" fill={primary}    radius={[4,4,0,0]} maxBarSize={36} stackId="a" />
                    <Bar dataKey="servicios" name="Servicios" fill="#6366f1"   radius={[4,4,0,0]} maxBarSize={36} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>

            {/* Donut CxP estado de deudas */}
            <Col xs={24} lg={9}>
              <Card style={{ borderRadius: 14, border: '1px solid hsl(var(--border-default))', height: '100%' }}
                styles={{ body: { padding: '16px 20px' } }}
                title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ClockCircleOutlined style={{ color: C.warning }} /><Text strong style={{ fontSize: 14 }}>Estado cuentas por pagar</Text></div>}
              >
                {cxpPieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={170}>
                      <PieChart>
                        <Pie data={cxpPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={78} dataKey="value" paddingAngle={3}>
                          {cxpPieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                        <ReTooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`$${Number(v).toFixed(2)}`, '']} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                      {[
                        { label: 'Vencidas',   count: cxp.countVencidas,  monto: cxp.montoVencido,   color: C.error   },
                        { label: 'Por vencer', count: cxp.countPorVencer, monto: cxp.montoPorVencer, color: C.warning },
                        { label: 'Vigentes',   count: cxp.countVigentes,  monto: cxp.montoVigente,   color: C.success },
                        { label: 'Pagadas',    count: cxp.countPagadas,   monto: null,               color: '#888'    },
                      ].map(r => (
                        <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: `${r.color}0d`, border: `1px solid ${r.color}25` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color }} />
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{r.label}</span>
                            <Tag style={{ fontSize: 10, padding: '0 6px', margin: 0, borderRadius: 8 }}>{r.count}</Tag>
                          </div>
                          {r.monto !== null && <span style={{ fontSize: 12, fontWeight: 700, color: r.color }}>${r.monto.toFixed(2)}</span>}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircleOutlined style={{ fontSize: 36, color: C.success, marginBottom: 10 }} />
                    <Text type="secondary">Sin cuentas por pagar pendientes</Text>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* ══════════════════════════════════════════════════
          TAB PLANILLA — costos laborales del año
      ══════════════════════════════════════════════════ */}
      {activeTab === 'planilla' && (
        <>
          {/* KPIs planilla del año */}
          <Row gutter={[14, 14]} style={{ marginBottom: 14 }}>
            <Col xs={12} md={6}>
              <KpiCard label={`Salario bruto — ${anioFiltro}`} value={extendedStats.planillaTotalBruto} suffix="USD" icon={<DollarOutlined />} color={primary} />
            </Col>
            <Col xs={12} md={6}>
              <KpiCard label={`Salario neto — ${anioFiltro}`} value={extendedStats.planillaTotalNeto} suffix="USD" icon={<CheckCircleOutlined />} color={C.success} />
            </Col>
            <Col xs={12} md={6}>
              <KpiCard label="Deducciones empleados" value={extendedStats.planillaTotalDeducciones} suffix="USD" icon={<FallOutlined />} color={C.error}
                extra={<div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>ISSS + AFP + Renta</div>}
              />
            </Col>
            <Col xs={12} md={6}>
              <KpiCard label="Costo patronal" value={extendedStats.planillaTotalPatronal} suffix="USD" icon={<TeamIcon />} color="#6366f1"
                extra={<div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>ISSS + AFP + INSAFORP</div>}
              />
            </Col>
          </Row>

          {/* Barras planilla por período */}
          <Card style={{ borderRadius: 14, border: '1px solid hsl(var(--border-default))', marginBottom: 14 }}
            styles={{ body: { padding: '16px 20px 20px' } }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BarChartOutlined style={{ color: primary }} />
                  <Text strong style={{ fontSize: 14 }}>Costo laboral por período — {anioFiltro}</Text>
                </div>
                              </div>
            }
          >
            {extendedStats.planillaEvolucion.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={extendedStats.planillaEvolucion} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-default))" />
                  <XAxis dataKey="periodo" tick={{ fontSize: 12, fill: token.colorText }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: token.colorTextSecondary }} axisLine={false} tickLine={false} width={64} tickFormatter={(v: number) => `$${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`} />
                  <ReTooltip contentStyle={tooltipStyle} formatter={(v: unknown, n: unknown) => [`$${Number(v).toFixed(2)}`, String(n)]} />
                  <Legend wrapperStyle={{ fontSize: 12, color: token.colorText }} />
                  <Bar dataKey="totalBruto"       name="Salario bruto"   fill={primary}    radius={[4,4,0,0]} maxBarSize={32} />
                  <Bar dataKey="totalNeto"        name="Salario neto"    fill={C.success}  radius={[4,4,0,0]} maxBarSize={32} />
                  <Bar dataKey="totalDeducciones" name="Deducciones"     fill={C.error}    radius={[4,4,0,0]} maxBarSize={32} />
                  <Bar dataKey="costoPatronal"    name="Costo patronal"  fill="#6366f1"    radius={[4,4,0,0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <TeamIcon style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }} />
                <Text type="secondary">Sin planillas registradas en {anioFiltro}</Text>
              </div>
            )}
          </Card>

          {/* Tabla detallada planillas */}
          {extendedStats.planillaEvolucion.length > 0 && (
            <Card style={{ borderRadius: 14, border: '1px solid hsl(var(--border-default))' }}
              styles={{ body: { padding: 0, overflow: 'hidden' } }}
              title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircleOutlined style={{ color: C.success }} /><Text strong style={{ fontSize: 14 }}>Detalle planillas — {anioFiltro}</Text></div>}
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'hsl(var(--bg-subtle))', borderBottom: '1px solid hsl(var(--border-default))' }}>
                      {['Período','Salario bruto','Deducciones','Salario neto','Costo patronal','Estado'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Período' || h === 'Estado' ? 'left' : 'right', fontWeight: 600, fontSize: 12, color: token.colorTextSecondary }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {extendedStats.planillaEvolucion.map((p, i) => (
                      <tr key={p.periodo} style={{ borderBottom: '1px solid hsl(var(--border-default))', background: i % 2 === 0 ? 'transparent' : 'hsl(var(--bg-subtle))' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 600 }}>{p.periodo}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>${p.totalBruto.toFixed(2)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: C.error }}>${p.totalDeducciones.toFixed(2)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: C.success, fontWeight: 700 }}>${p.totalNeto.toFixed(2)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: '#6366f1' }}>${p.costoPatronal.toFixed(2)}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <Tag color={p.estado === 'PAGADA' ? 'success' : p.estado === 'APROBADA' ? 'processing' : 'default'} style={{ borderRadius: 8, fontSize: 11 }}>
                            {p.estado}
                          </Tag>
                        </td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: `2px solid ${primary}30`, background: `${primary}06`, fontWeight: 700 }}>
                      <td style={{ padding: '10px 16px' }}>TOTAL AÑO</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>${extendedStats.planillaTotalBruto.toFixed(2)}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: C.error }}>${extendedStats.planillaTotalDeducciones.toFixed(2)}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: C.success }}>${extendedStats.planillaTotalNeto.toFixed(2)}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: '#6366f1' }}>${extendedStats.planillaTotalPatronal.toFixed(2)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════
          TAB REPORTES — descarga de reportes desde la BD
      ══════════════════════════════════════════════════ */}
      {activeTab === 'reportes' && (() => {
        const reporteItems = [
          {
            key:         'ventas',
            label:       'Ventas del mes',
            description: 'Lista completa de ventas POS: número de venta, cliente, subtotal, IVA, total y tipo de documento (Factura / CCF).',
            periodo:     stats.mesMostrado,
            filtrado:    true,
            color:       C.success,
            icon:        <DollarOutlined />,
          },
          {
            key:         'gastos',
            label:       'Gastos del mes',
            description: 'Registro de gastos operativos: fecha, descripción, categoría y monto.',
            periodo:     stats.mesMostrado,
            filtrado:    true,
            color:       C.error,
            icon:        <WalletOutlined />,
          },
          {
            key:         'compras',
            label:       'Compras del mes',
            description: 'Órdenes de compra: proveedor, tipo (producto/servicio), subtotal, total y estado.',
            periodo:     stats.mesMostrado,
            filtrado:    true,
            color:       '#f59e0b',
            icon:        <ShoppingCartOutlined />,
          },
          {
            key:         'citas',
            label:       'Citas del mes',
            description: 'Listado de citas agendadas: cliente, barbero, servicio, estado y monto cobrado.',
            periodo:     stats.mesMostrado,
            filtrado:    true,
            color:       '#0891b2',
            icon:        <CalendarOutlined />,
          },
          {
            key:         'planilla',
            label:       'Planilla del año',
            description: 'Nómina por período: salario bruto, deducciones (ISSS/AFP/Renta), salario neto y costo patronal.',
            periodo:     String(anioFiltro),
            filtrado:    false,
            color:       primary,
            icon:        <TeamIcon />,
          },
          {
            key:         'cxp',
            label:       'Cuentas por Pagar',
            description: 'Estado actual de deudas con proveedores: saldo pendiente, vencimiento y clasificación.',
            periodo:     'Estado actual',
            filtrado:    false,
            color:       C.warning,
            icon:        <ClockCircleOutlined />,
          },
          {
            key:         'clientes',
            label:       'Clientes',
            description: 'Directorio completo de clientes: nombre, email, teléfono, DUI y fecha de registro.',
            periodo:     'Todos los registros',
            filtrado:    false,
            color:       '#722ed1',
            icon:        <TeamOutlined />,
          },
          {
            key:         'proveedores',
            label:       'Proveedores',
            description: 'Directorio de proveedores: NRC, NIT, teléfono, email y plazo de crédito.',
            periodo:     'Todos los registros',
            filtrado:    false,
            color:       '#f59e0b',
            icon:        <TruckOutlined />,
          },
          {
            key:         'inventario',
            label:       'Inventario actual',
            description: 'Stock actual de productos con costo unitario, precio de venta y stock mínimo.',
            periodo:     'Estado actual',
            filtrado:    false,
            color:       '#0891b2',
            icon:        <BarChartOutlined />,
          },
        ];

        return (
          <>
            {/* Descripción */}
            <Card style={{ borderRadius: 14, border: '1px solid hsl(var(--border-default))', marginBottom: 18 }}
              styles={{ body: { padding: '14px 20px' } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileTextOutlined style={{ fontSize: 18, color: primary }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Reportes del sistema</div>
                  <div style={{ fontSize: 12, color: token.colorTextSecondary, marginTop: 2 }}>
                    Los reportes marcados con <Tag color="blue" style={{ fontSize: 10, margin: '0 4px' }}>período</Tag>
                    usan el mes y año seleccionados en el filtro. Los demás traen datos actuales del sistema.
                  </div>
                </div>
              </div>
            </Card>

            {/* Grid de reportes */}
            <Row gutter={[14, 14]}>
              {reporteItems.map(r => (
                <Col xs={24} sm={12} lg={8} key={r.key}>
                  <Card
                    style={{
                      borderRadius: 14,
                      border: `1px solid ${r.color}30`,
                      background: `linear-gradient(135deg, ${r.color}08 0%, ${token.colorBgContainer} 65%)`,
                      height: '100%',
                    }}
                    styles={{ body: { padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 } }}
                  >
                    {/* Cabecera */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 11, flexShrink: 0,
                        background: `${r.color}15`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, color: r.color,
                      }}>
                        {r.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: token.colorText }}>{r.label}</div>
                        <Tag
                          style={{
                            marginTop: 4, fontSize: 10, borderRadius: 8, padding: '0 7px',
                            background: r.filtrado ? `${primary}12` : `${token.colorFillSecondary}`,
                            border: r.filtrado ? `1px solid ${primary}30` : `1px solid ${token.colorBorderSecondary}`,
                            color: r.filtrado ? primary : token.colorTextSecondary,
                          }}
                        >
                          {r.filtrado ? `Período: ${r.periodo}` : r.periodo}
                        </Tag>
                      </div>
                    </div>

                    {/* Descripción */}
                    <div style={{ fontSize: 12, color: token.colorTextSecondary, lineHeight: 1.55, flex: 1 }}>
                      {r.description}
                    </div>

                    {/* Botón descarga */}
                    <Button
                      block
                      loading={pending === r.key}
                      disabled={pending !== null && pending !== r.key}
                      icon={<DownloadOutlined />}
                      onClick={() => downloadReport(r.key)}
                      style={{
                        borderRadius: 9, fontWeight: 600, fontSize: 13,
                        background: pending === r.key ? undefined : r.color,
                        borderColor: r.color,
                        color: pending === r.key ? undefined : '#fff',
                        height: 36,
                      }}
                    >
                      {pending === r.key ? 'Generando...' : 'Descargar Excel'}
                    </Button>
                  </Card>
                </Col>
              ))}
            </Row>
          </>
        );
      })()}
    </div>
  );
}
