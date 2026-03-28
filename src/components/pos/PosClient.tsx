'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Row, Col, Card, Button, Select, InputNumber, Tag, Statistic,
  Modal, Alert, Divider, Badge, Tooltip, Space, Input, Avatar
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, FileTextOutlined, CheckCircleOutlined,
  ReloadOutlined, PrinterOutlined, FileDoneOutlined
} from '@ant-design/icons'
import { toast } from 'sonner'
import { abrirFacturaCompleta, abrirTicket, type DTEJsonViewer } from '@/lib/dte-viewer'
import { useBarberTheme } from '@/context/ThemeContext'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Barbero { id: number; nombre: string }
interface Servicio { id: number; name: string; price: number; category?: string }
interface LineaVenta {
  key: string
  barberoId: number | null
  barberoNombre: string
  servicioId: number | null
  descripcion: string
  precioUnitario: number
  cantidad: number
  descuento: number
  esGravado: boolean
}
interface PagoItem {
  key: string
  metodo: 'CASH' | 'CARD' | 'TRANSFER' | 'QR'
  monto: number
  recibido?: number
  referencia?: string
}
interface TurnoInfo {
  id: number
  fechaApertura: string
  montoInicial: number
  usuarioApertura: string
  totalVentas: number
  barberosHoy: BarberoHoy[]
}
interface BarberoHoy {
  barberoId: number
  nombre: string
  servicios: number
  total: number
  desglose: { descripcion: string; precioUnitario: number; cantidad: number; subtotal: number }[]
}
interface VentaReciente {
  id: number
  numero: number
  clienteNombre: string
  total: number
  createdAt: string
  estado: string
  pagos: { metodo: string; monto: number }[]
  detalles: { barberoNombre: string; descripcion: string; subtotal: number }[]
}

const METODOS = [
  { key: 'CASH', label: '💵 Efectivo', color: 'green' },
  { key: 'CARD', label: '💳 Tarjeta', color: 'blue' },
  { key: 'TRANSFER', label: '🏦 Transfer.', color: 'purple' },
  { key: 'QR', label: '📱 QR', color: 'orange' },
]

const BILLETES = [1, 5, 10, 20, 50, 100]

const fmt = (n: number) => `$${n.toFixed(2)}`

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PosClient({
  barberos: barberosProp,
  servicios: serviciosProp,
}: {
  barberos: Barbero[]
  servicios: Servicio[]
}) {
  const { theme: barberTheme } = useBarberTheme()
  const primary = barberTheme.colorPrimary

  // Colores semánticos reutilizables
  const C = {
    bgPage:       'hsl(var(--bg-page))',
    bgSurface:    'hsl(var(--bg-surface))',
    bgSubtle:     'hsl(var(--bg-subtle))',
    bgMuted:      'hsl(var(--bg-muted))',
    bgPrimaryLow: `${primary}18`,
    textPrimary:  'hsl(var(--text-primary))',
    textSecondary:'hsl(var(--text-secondary))',
    textMuted:    'hsl(var(--text-muted))',
    textDisabled: 'hsl(var(--text-disabled))',
    border:       'hsl(var(--border-default))',
    borderStrong: 'hsl(var(--border-strong))',
  }

  const [turno, setTurno] = useState<TurnoInfo | null>(null)
  const [barberosHoy, setBarberosHoy] = useState<BarberoHoy[]>([])
  const [ventasRecientes, setVentasRecientes] = useState<VentaReciente[]>([])
  const [lineas, setLineas] = useState<LineaVenta[]>([])
  const [pagos, setPagos] = useState<PagoItem[]>([{ key: '1', metodo: 'CASH', monto: 0 }])
  const [tipoDte, setTipoDte] = useState<'01' | '03'>('01')
  const [conFactura, setConFactura] = useState(false)
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteDocumento, setClienteDocumento] = useState('')
  const [clienteNrc, setClienteNrc] = useState('')
  const [loadingCobrar, setLoadingCobrar] = useState(false)
  const [modalExito, setModalExito] = useState<{ numero: number; total: number; codigoGen: string; dte: DTEJsonViewer | null } | null>(null)
  const [barberoActivo, setBarberoActivo] = useState<{ id: number; nombre: string } | null>(null)
  const [categoriaActiva, setCategoriaActiva] = useState<string>('todos')

  // ── Cargar datos ────────────────────────────────────────────────────────────

  const cargarTurno = useCallback(async () => {
    const res = await fetch('/api/pos/turno')
    const data = await res.json()
    setTurno(data.turno || null)
    if (data.turno) setBarberosHoy(data.turno.barberosHoy || [])
  }, [])

  const cargarVentasRecientes = useCallback(async () => {
    const res = await fetch('/api/pos/venta?page=1')
    const data = await res.json()
    setVentasRecientes((data.items || []).slice(0, 8))
  }, [])

  useEffect(() => {
    cargarTurno()
    cargarVentasRecientes()
  }, [cargarTurno, cargarVentasRecientes])

  // ── Cálculos ────────────────────────────────────────────────────────────────

  const subtotal = lineas.reduce((s, l) => s + l.precioUnitario * l.cantidad - l.descuento, 0)
  const totalPagado = pagos.length === 1 ? subtotal : pagos.reduce((s, p) => s + (p.monto || 0), 0)
  const diferencia = totalPagado - subtotal
  const pagoCompleto = pagos.length === 1
    ? true
    : Math.abs(diferencia) < 0.01 || diferencia > 0

  // ── Lineas de venta ─────────────────────────────────────────────────────────

  const addLinea = () => {
    setLineas(prev => [...prev, {
      key: Date.now().toString(),
      barberoId: null, barberoNombre: '',
      servicioId: null, descripcion: '',
      precioUnitario: 0, cantidad: 1, descuento: 0, esGravado: false,
    }])
  }

  const updateLinea = (key: string, field: keyof LineaVenta, value: unknown) => {
    setLineas(prev => prev.map(l => {
      if (l.key !== key) return l
      const updated = { ...l, [field]: value }
      if (field === 'servicioId') {
        const svc = serviciosProp.find(s => s.id === value)
        if (svc) {
          updated.descripcion = svc.name
          updated.precioUnitario = svc.price
        }
      }
      return updated
    }))
  }

  const removeLinea = (key: string) => setLineas(prev => prev.filter(l => l.key !== key))

  const selectServicioRapido = (svc: Servicio) => {
    if (barberoActivo) {
      setLineas(prev => [...prev, {
        key: Date.now().toString(),
        barberoId: barberoActivo.id,
        barberoNombre: barberoActivo.nombre,
        servicioId: svc.id,
        descripcion: svc.name,
        precioUnitario: svc.price,
        cantidad: 1, descuento: 0, esGravado: false,
      }])
      return
    }
    const lineaSinServicio = lineas.find(l => !l.servicioId)
    if (lineaSinServicio) {
      setLineas(prev => prev.map(l =>
        l.key === lineaSinServicio.key
          ? { ...l, servicioId: svc.id, descripcion: svc.name, precioUnitario: svc.price }
          : l
      ))
    } else {
      setLineas(prev => [...prev, {
        key: Date.now().toString(),
        barberoId: null, barberoNombre: '',
        servicioId: svc.id, descripcion: svc.name,
        precioUnitario: svc.price, cantidad: 1, descuento: 0, esGravado: false,
      }])
    }
  }

  // ── Pagos ───────────────────────────────────────────────────────────────────

  const updatePago = (key: string, field: keyof PagoItem, value: unknown) => {
    setPagos(prev => prev.map(p => p.key === key ? { ...p, [field]: value } : p))
  }

  const addPago = () => {
    const metodosUsados = pagos.map(p => p.metodo)
    const siguiente = METODOS.find(m => !metodosUsados.includes(m.key as 'CASH'))
    if (!siguiente) return
    setPagos(prev => [...prev, { key: Date.now().toString(), metodo: siguiente.key as 'CASH', monto: 0 }])
  }

  const removePago = (key: string) => {
    if (pagos.length === 1) return
    setPagos(prev => prev.filter(p => p.key !== key))
  }

  const usarBillete = (pagoKey: string, billete: number) => {
    updatePago(pagoKey, 'recibido', billete)
  }

  const pendientePorPago = (pagoKey: string) => {
    const otrosPagos = pagos.filter(p => p.key !== pagoKey).reduce((s, p) => s + (p.monto || 0), 0)
    return Math.max(0, parseFloat((subtotal - otrosPagos).toFixed(2)))
  }

  // ── Cobrar ──────────────────────────────────────────────────────────────────

  const cobrar = async () => {
    if (!turno) return toast.error('No hay turno activo')
    if (lineas.length === 0) return toast.error('Agrega al menos un servicio')
    if (lineas.some(l => !l.barberoId)) return toast.error('Asigna un barbero a cada servicio')
    if (lineas.some(l => !l.descripcion)) return toast.error('Todos los servicios deben tener descripción')
    if (!pagoCompleto) return toast.error(`Falta cubrir ${fmt(subtotal - totalPagado)}`)

    setLoadingCobrar(true)
    try {
      const body = {
        turnoId: turno.id,
        tipoDte,
        clienteNombre: conFactura ? clienteNombre || 'Consumidor Final' : 'Consumidor Final',
        clienteDocumento: conFactura ? clienteDocumento : undefined,
        clienteNrc: conFactura && tipoDte === '03' ? clienteNrc : undefined,
        items: lineas.map(l => ({
          barberoId: l.barberoId,
          servicioId: l.servicioId,
          descripcion: l.descripcion,
          cantidad: l.cantidad,
          precioUnitario: l.precioUnitario,
          descuento: l.descuento,
          esGravado: l.esGravado,
        })),
        pagos: pagos.map(p => {
          const montoFinal = pagos.length === 1 ? subtotal : p.monto
          return {
            metodo: p.metodo,
            monto: montoFinal,
            recibido: p.metodo === 'CASH' ? p.recibido : undefined,
            vuelto: p.metodo === 'CASH' && p.recibido && p.recibido > montoFinal
              ? parseFloat((p.recibido - montoFinal).toFixed(2)) : undefined,
            referencia: p.referencia,
          }
        }),
      }

      const res = await fetch('/api/pos/venta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Error al cobrar')

      setModalExito({ numero: data.venta.numero, total: data.venta.total, codigoGen: data.venta.codigoGeneracion, dte: data.dte || null })
      setLineas([])
      setPagos([{ key: '1', metodo: 'CASH', monto: 0 }])
      setConFactura(false)
      setClienteNombre('')
      setClienteDocumento('')
      setClienteNrc('')
      cargarTurno()
      cargarVentasRecientes()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoadingCobrar(false)
    }
  }

  // ── Sin turno ───────────────────────────────────────────────────────────────

  if (!turno) {
    return (
      <div style={{ maxWidth: 500, margin: '80px auto', textAlign: 'center' }}>
        <Card>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h2 style={{ color: primary }}>No hay turno abierto</h2>
          <p style={{ color: C.textMuted, marginBottom: 24 }}>Para empezar a vender necesitas abrir un turno de caja</p>
          <Button type="primary" size="large" href="/pos-turnos">
            Ir a Turnos de Caja
          </Button>
        </Card>
      </div>
    )
  }

  // ── UI principal ────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 'clamp(8px, 2vw, 16px)', background: C.bgPage, minHeight: '100vh' }}>

      {/* Header turno */}
      <Card size="small" style={{ marginBottom: 12, borderColor: primary }} bodyStyle={{ padding: '8px 16px' }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space>
              <Badge status="processing" color={primary} text={
                <span style={{ fontWeight: 600, color: primary }}>TURNO ABIERTO</span>
              } />
              <span style={{ color: C.textMuted, fontSize: 12 }}>
                {turno.usuarioApertura} · Desde {new Date(turno.fechaApertura).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </Space>
          </Col>
          <Col>
            <Space>
              <Tag color="green">💰 Fondo: {fmt(turno.montoInicial)}</Tag>
              <Tag color="blue">🧾 {turno.totalVentas} ventas</Tag>
              <Tooltip title="Actualizar">
                <Button size="small" icon={<ReloadOutlined />} onClick={cargarTurno} />
              </Tooltip>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={12}>
        {/* ── Columna izquierda: POS ── */}
        <Col xs={24} lg={14}>
          <Card title={<span>🛒 Nueva Venta</span>} size="small" style={{ marginBottom: 12 }}>

            {/* ── Selector de barbero activo ── */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                1 · Selecciona barbero
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {barberosProp.length <= 8 ? (
                  barberosProp.map(b => {
                    const activo = barberoActivo?.id === b.id
                    const iniciales = b.nombre.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                    return (
                      <button
                        key={b.id}
                        onClick={() => setBarberoActivo(activo ? null : { id: b.id, nombre: b.nombre })}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '4px 10px 4px 4px', borderRadius: 20,
                          border: activo ? `2px solid ${primary}` : `1.5px solid ${C.border}`,
                          background: activo ? C.bgPrimaryLow : C.bgSurface,
                          cursor: 'pointer', fontWeight: activo ? 600 : 400,
                          color: activo ? primary : C.textPrimary, fontSize: 13,
                          transition: 'all 0.15s',
                        }}
                      >
                        <Avatar size={22}
                          style={{ background: activo ? primary : C.bgMuted, color: activo ? '#fff' : C.textSecondary, fontSize: 10, flexShrink: 0 }}>
                          {iniciales}
                        </Avatar>
                        {b.nombre.split(' ')[0]}
                      </button>
                    )
                  })
                ) : (
                  <Select
                    showSearch
                    placeholder="Buscar barbero..."
                    style={{ width: 280 }}
                    allowClear
                    value={barberoActivo?.id}
                    onChange={(v, opt: any) => setBarberoActivo(v ? { id: v, nombre: opt?.label?.replace('✂️ ', '') || '' } : null)}
                    filterOption={(input, opt) => (opt?.label as string || '').toLowerCase().includes(input.toLowerCase())}
                    options={barberosProp.map(b => ({ value: b.id, label: '✂️ ' + b.nombre }))}
                  />
                )}
              </div>
              {barberoActivo && (
                <div style={{ marginTop: 6, fontSize: 12, color: primary }}>
                  ✂️ <b>{barberoActivo.nombre}</b> seleccionado — elige un servicio abajo para agregar la línea
                </div>
              )}
            </div>

            {/* ── Servicios por categoría ── */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                2 · Elige servicio
              </div>

              {(() => {
                const cats = ['todos', ...Array.from(new Set(serviciosProp.map(s => s.category || 'otro'))).sort()]
                const labels: Record<string, string> = {
                  todos: '🔍 Todos', cabello: '💇 Cabello', barba: '🧔 Barba',
                  combo: '⭐ Combos', tratamiento: '💆 Tratamientos', otro: '📦 Otros',
                }
                const serviciosFiltrados = categoriaActiva === 'todos'
                  ? serviciosProp
                  : serviciosProp.filter(s => (s.category || 'otro') === categoriaActiva)

                return (
                  <>
                    {/* Tabs de categoría */}
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                      {cats.map(cat => (
                        <button key={cat} onClick={() => setCategoriaActiva(cat)} style={{
                          padding: '3px 10px', borderRadius: 12, fontSize: 12, cursor: 'pointer',
                          border: categoriaActiva === cat ? `2px solid ${primary}` : `1.5px solid ${C.border}`,
                          background: categoriaActiva === cat ? primary : C.bgSurface,
                          color: categoriaActiva === cat ? '#fff' : C.textSecondary,
                          fontWeight: categoriaActiva === cat ? 600 : 400,
                          transition: 'all 0.15s',
                        }}>
                          {labels[cat] || cat}
                          <span style={{ marginLeft: 4, opacity: 0.7, fontSize: 10 }}>
                            ({cat === 'todos' ? serviciosProp.length : serviciosProp.filter(s => (s.category || 'otro') === cat).length})
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Grid de servicios */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(min(120px, 44%), 1fr))',
                      gap: 6,
                      maxHeight: 'clamp(160px, 30vh, 240px)',
                      overflowY: 'auto',
                      padding: '2px 2px 4px',
                    }}>
                      {serviciosFiltrados.map(s => (
                        <button
                          key={s.id}
                          onClick={() => selectServicioRapido(s)}
                          title={!barberoActivo ? 'Selecciona primero un barbero' : s.name}
                          style={{
                            padding: '6px 8px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                            border: `1.5px solid ${C.border}`,
                            background: barberoActivo ? C.bgSurface : C.bgSubtle,
                            color: barberoActivo ? C.textPrimary : C.textMuted,
                            textAlign: 'left', lineHeight: 1.3,
                            transition: 'all 0.15s',
                            opacity: barberoActivo ? 1 : 0.6,
                          }}
                          onMouseEnter={e => { if (barberoActivo) (e.currentTarget as HTMLElement).style.borderColor = primary }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border }}
                        >
                          <div style={{ fontWeight: 500, marginBottom: 2 }}>{s.name}</div>
                          <div style={{ color: primary, fontWeight: 700 }}>{fmt(s.price)}</div>
                        </button>
                      ))}
                    </div>
                  </>
                )
              })()}
            </div>

            <Divider style={{ margin: '8px 0' }} />

            {/* Tabla de líneas */}
            {lineas.length === 0 ? (
              <div style={{ textAlign: 'center', color: C.textDisabled, padding: '20px 0' }}>
                Toca un barbero o servicio para agregar líneas
              </div>
            ) : (
              <div style={{ marginBottom: 8 }}>
                {lineas.map((l, idx) => (
                  <Card key={l.key} size="small" style={{ marginBottom: 6, background: C.bgSubtle }}>
                    {/* Fila 1: número + barbero + servicio */}
                    <Row gutter={6} align="middle" style={{ marginBottom: 4 }}>
                      <Col flex="20px">
                        <span style={{ color: C.textMuted, fontSize: 11 }}>{idx + 1}</span>
                      </Col>
                      <Col flex="1">
                        <Select
                          size="small" placeholder="Barbero" style={{ width: '100%' }}
                          value={l.barberoId}
                          onChange={v => {
                            const b = barberosProp.find(b => b.id === v)
                            updateLinea(l.key, 'barberoId', v)
                            if (b) updateLinea(l.key, 'barberoNombre', b.nombre)
                          }}
                          options={barberosProp.map(b => ({ value: b.id, label: '✂️ ' + b.nombre }))}
                        />
                      </Col>
                      <Col flex="1">
                        <Select
                          size="small" showSearch placeholder="Servicio" style={{ width: '100%' }}
                          value={l.servicioId}
                          onChange={v => updateLinea(l.key, 'servicioId', v)}
                          options={serviciosProp.map(s => ({ value: s.id, label: s.name + ' ' + fmt(s.price) }))}
                        />
                      </Col>
                    </Row>
                    {/* Fila 2: precio + descuento + total + borrar */}
                    <Row gutter={6} align="middle">
                      <Col flex="20px" />
                      <Col flex="1">
                        <InputNumber
                          size="small" prefix="$" style={{ width: '100%' }}
                          value={l.precioUnitario} min={0} precision={2}
                          onChange={v => updateLinea(l.key, 'precioUnitario', v || 0)}
                        />
                      </Col>
                      <Col flex="1">
                        <InputNumber
                          size="small" prefix="$" placeholder="Desc." style={{ width: '100%' }}
                          value={l.descuento || undefined} min={0} precision={2}
                          onChange={v => updateLinea(l.key, 'descuento', v || 0)}
                        />
                      </Col>
                      <Col style={{ textAlign: 'right', minWidth: 60 }}>
                        <span style={{ fontWeight: 700, color: primary, fontSize: 13 }}>
                          {fmt(l.precioUnitario * l.cantidad - l.descuento)}
                        </span>
                      </Col>
                      <Col flex="28px">
                        <Button size="small" type="text" danger icon={<DeleteOutlined />}
                          onClick={() => removeLinea(l.key)} />
                      </Col>
                    </Row>
                  </Card>
                ))}
              </div>
            )}

            <Button type="dashed" block icon={<PlusOutlined />} onClick={addLinea} style={{ marginBottom: 12 }}>
              Agregar línea
            </Button>

            <Divider style={{ margin: '8px 0' }} />

            {/* Total */}
            <Row justify="end" style={{ marginBottom: 12 }}>
              <Col>
                <Statistic title="Total" value={subtotal} precision={2} prefix="$"
                  valueStyle={{ color: primary, fontSize: 28, fontWeight: 700 }} />
              </Col>
            </Row>

            {/* ── Sección de cobro ── */}
            {(() => {
              const esPagoSimple = pagos.length === 1
              const p = pagos[0]
              const esCash = p.metodo === 'CASH'
              const montoEfectivo = esPagoSimple ? subtotal : p.monto
              const vuelto = esCash && (p.recibido || 0) > 0
                ? parseFloat((Math.max(0, (p.recibido || 0) - montoEfectivo)).toFixed(2))
                : 0
              const clienteEntregaMenos = esCash && (p.recibido || 0) > 0 && (p.recibido || 0) < montoEfectivo

              return (
                <div style={{ marginBottom: 10 }}>

                  {/* Encabezado sección cobro */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      3 · Cobro
                    </div>
                    {pagos.length < 3 && lineas.length > 0 && (
                      <Button size="small" type="link" icon={<PlusOutlined />} onClick={addPago}
                        style={{ fontSize: 12, padding: 0, color: primary }}>
                        Dividir pago
                      </Button>
                    )}
                  </div>

                  {/* ── PAGO SIMPLE ── */}
                  {esPagoSimple ? (
                    <div>
                      {/* Selector de método */}
                      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                        {METODOS.map(m => (
                          <button key={m.key} onClick={() => {
                            updatePago(p.key, 'metodo', m.key)
                            updatePago(p.key, 'recibido', undefined)
                          }} style={{
                            flex: 1, padding: 'clamp(5px, 1.5vw, 8px) 2px', borderRadius: 8, cursor: 'pointer',
                            border: p.metodo === m.key ? `2px solid ${primary}` : `1.5px solid ${C.border}`,
                            background: p.metodo === m.key ? C.bgPrimaryLow : C.bgSurface,
                            color: p.metodo === m.key ? primary : C.textSecondary,
                            fontWeight: p.metodo === m.key ? 700 : 400,
                            fontSize: 'clamp(10px, 2.5vw, 13px)', textAlign: 'center', transition: 'all 0.15s',
                            lineHeight: 1.2,
                          }}>
                            {m.label}
                          </button>
                        ))}
                      </div>

                      {/* Total a cobrar prominente */}
                      {lineas.length > 0 && (
                        <div style={{
                          background: `${primary}12`, border: `1.5px solid ${primary}50`,
                          borderRadius: 10, padding: '10px 16px', marginBottom: 12,
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                          <span style={{ color: C.textSecondary, fontSize: 14 }}>Total a cobrar</span>
                          <span style={{ color: primary, fontSize: 26, fontWeight: 800 }}>{fmt(subtotal)}</span>
                        </div>
                      )}

                      {/* CASH: billetes + campo recibido + vuelto */}
                      {esCash && lineas.length > 0 && (
                        <>
                          <div style={{ marginBottom: 6 }}>
                            <div style={{ fontSize: 12, color: C.textSecondary, fontWeight: 600, marginBottom: 6 }}>
                              ¿Con cuánto paga el cliente?
                            </div>
                            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                              {BILLETES.map(b => {
                                const activo = p.recibido === b
                                return (
                                  <button key={b} onClick={() => usarBillete(p.key, b)} style={{
                                    flex: '1 1 50px', padding: '8px 0', borderRadius: 8,
                                    border: activo ? `2px solid ${primary}` : `1.5px solid ${C.border}`,
                                    background: activo ? primary : b >= subtotal ? `${primary}12` : C.bgSubtle,
                                    color: activo ? '#fff' : b >= subtotal ? primary : C.textSecondary,
                                    fontWeight: 700, fontSize: 14, cursor: 'pointer',
                                    transition: 'all 0.15s',
                                  }}>
                                    ${b}
                                  </button>
                                )
                              })}
                            </div>
                            <InputNumber
                              size="large" prefix="$" placeholder="O escribe el monto exacto"
                              style={{ width: '100%' }}
                              value={p.recibido || undefined} min={0} precision={2}
                              onChange={v => updatePago(p.key, 'recibido', v || 0)}
                            />
                          </div>

                          {/* Vuelto / Falta */}
                          {(p.recibido || 0) > 0 && (
                            <div style={{
                              borderRadius: 10, padding: '12px 16px', marginTop: 8,
                              background: clienteEntregaMenos ? '#fff1f0' : `${primary}12`,
                              border: `2px solid ${clienteEntregaMenos ? '#ff4d4f' : primary}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}>
                              {clienteEntregaMenos ? (
                                <>
                                  <span style={{ color: '#ff4d4f', fontWeight: 600, fontSize: 14 }}>⚠️ Falta</span>
                                  <span style={{ color: '#ff4d4f', fontSize: 24, fontWeight: 800 }}>
                                    {fmt(montoEfectivo - (p.recibido || 0))}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span style={{ color: primary, fontWeight: 600, fontSize: 14 }}>💰 Vuelto</span>
                                  <span style={{ color: primary, fontSize: 28, fontWeight: 800 }}>{fmt(vuelto)}</span>
                                </>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {/* CARD / TRANSFER / QR */}
                      {(p.metodo === 'CARD' || p.metodo === 'TRANSFER' || p.metodo === 'QR') && lineas.length > 0 && (
                        <Input size="large" placeholder={
                          p.metodo === 'CARD' ? 'Referencia o últimos 4 dígitos (opcional)' :
                          p.metodo === 'TRANSFER' ? 'Número de comprobante (opcional)' :
                          'Referencia QR (opcional)'
                        }
                          prefix="#"
                          value={p.referencia}
                          onChange={e => updatePago(p.key, 'referencia', e.target.value)}
                        />
                      )}
                    </div>

                  ) : (
                    /* ── PAGO DIVIDIDO ── */
                    <div>
                      {lineas.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                            <span style={{ color: C.textSecondary }}>Cubierto</span>
                            <span style={{ fontWeight: 700, color: pagoCompleto ? primary : '#faad14' }}>
                              {fmt(totalPagado)} / {fmt(subtotal)}
                              {pagoCompleto && ' ✅'}
                            </span>
                          </div>
                          <div style={{ background: C.bgMuted, borderRadius: 6, height: 8, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: 6, transition: 'width 0.3s',
                              background: pagoCompleto ? primary : '#faad14',
                              width: `${Math.min(100, subtotal > 0 ? (totalPagado / subtotal) * 100 : 0)}%`,
                            }} />
                          </div>
                        </div>
                      )}

                      {pagos.map((pg) => {
                        const pendiente = pendientePorPago(pg.key)
                        const pgVuelto = pg.metodo === 'CASH' && (pg.recibido || 0) > 0
                          ? Math.max(0, (pg.recibido || 0) - pg.monto)
                          : 0
                        const pgFalta = pg.metodo === 'CASH' && (pg.recibido || 0) > 0 && (pg.recibido || 0) < pg.monto
                        return (
                          <Card key={pg.key} size="small" style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <Select size="small" style={{ flex: 1 }} value={pg.metodo}
                                onChange={v => { updatePago(pg.key, 'metodo', v); updatePago(pg.key, 'recibido', undefined) }}
                                options={METODOS.map(m => ({ value: m.key, label: m.label }))}
                              />
                              <InputNumber size="small" prefix="$"
                                style={{ width: 110 }}
                                value={pg.monto} min={0} max={subtotal} precision={2}
                                placeholder="Monto"
                                onChange={v => updatePago(pg.key, 'monto', v || 0)}
                                addonAfter={
                                  <span style={{ fontSize: 10, color: primary, cursor: 'pointer' }}
                                    onClick={() => updatePago(pg.key, 'monto', pendiente)}
                                    title="Usar el restante">
                                    Resto
                                  </span>
                                }
                              />
                              {pagos.length > 1 && (
                                <Button size="small" type="text" danger icon={<DeleteOutlined />}
                                  onClick={() => removePago(pg.key)} />
                              )}
                            </div>

                            {pg.metodo === 'CASH' && (
                              <>
                                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>El cliente entrega:</div>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                                  {BILLETES.map(b => (
                                    <button key={b} onClick={() => usarBillete(pg.key, b)} style={{
                                      flex: '1 1 36px', padding: '5px 2px', borderRadius: 6,
                                      border: pg.recibido === b ? `2px solid ${primary}` : `1px solid ${C.border}`,
                                      background: pg.recibido === b ? primary : C.bgSubtle,
                                      color: pg.recibido === b ? '#fff' : C.textSecondary,
                                      fontWeight: 600, fontSize: 12, cursor: 'pointer',
                                    }}>
                                      ${b}
                                    </button>
                                  ))}
                                </div>
                                <InputNumber size="small" prefix="$" placeholder="O monto exacto"
                                  style={{ width: '100%', marginBottom: 4 }}
                                  value={pg.recibido || undefined} min={0} precision={2}
                                  onChange={v => updatePago(pg.key, 'recibido', v || 0)}
                                />
                                {(pg.recibido || 0) > 0 && (
                                  <div style={{
                                    padding: '6px 12px', borderRadius: 8, marginTop: 4, textAlign: 'right',
                                    background: pgFalta ? '#fff1f0' : `${primary}12`,
                                    border: `1.5px solid ${pgFalta ? '#ff4d4f' : primary}`,
                                  }}>
                                    <span style={{ color: pgFalta ? '#ff4d4f' : primary, fontWeight: 700 }}>
                                      {pgFalta ? `⚠️ Falta ${fmt(pg.monto - (pg.recibido || 0))}` : `💰 Vuelto ${fmt(pgVuelto)}`}
                                    </span>
                                  </div>
                                )}
                              </>
                            )}
                            {(pg.metodo === 'CARD' || pg.metodo === 'TRANSFER' || pg.metodo === 'QR') && (
                              <Input size="small" prefix="#"
                                placeholder={pg.metodo === 'CARD' ? 'Últimos 4 dígitos (opcional)' : 'Comprobante (opcional)'}
                                value={pg.referencia}
                                onChange={e => updatePago(pg.key, 'referencia', e.target.value)}
                              />
                            )}
                          </Card>
                        )
                      })}

                      {pagos.length < 3 && (
                        <Button size="small" type="dashed" block icon={<PlusOutlined />} onClick={addPago}
                          style={{ marginTop: 4 }}>
                          + Agregar otro método
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Factura (opcional) */}
            <div style={{ marginBottom: 12 }}>
              <Button size="small" type={conFactura ? 'primary' : 'dashed'}
                icon={<FileTextOutlined />}
                onClick={() => setConFactura(v => !v)}>
                {conFactura ? '🧾 Con factura' : '☐ Cliente quiere factura'}
              </Button>

              {conFactura && (
                <Card size="small" style={{ marginTop: 8, background: C.bgPrimaryLow, borderColor: `${primary}40` }}>
                  <Row gutter={8} style={{ marginBottom: 6 }}>
                    <Col span={12}>
                      <div style={{ fontSize: 11, color: C.textMuted }}>Tipo</div>
                      <Select size="small" value={tipoDte} onChange={v => setTipoDte(v)} style={{ width: '100%' }}>
                        <Select.Option value="01">Factura Consumidor Final</Select.Option>
                        <Select.Option value="03">Crédito Fiscal (CCF)</Select.Option>
                      </Select>
                    </Col>
                    <Col span={12}>
                      <div style={{ fontSize: 11, color: C.textMuted }}>Nombre</div>
                      <Input size="small" placeholder="Consumidor Final" value={clienteNombre}
                        onChange={e => setClienteNombre(e.target.value)} />
                    </Col>
                  </Row>
                  <Row gutter={8}>
                    <Col span={12}>
                      <div style={{ fontSize: 11, color: C.textMuted }}>{tipoDte === '03' ? 'NIT' : 'DUI'}</div>
                      <Input size="small" placeholder={tipoDte === '03' ? '0614-123456-001-5' : '12345678-9'}
                        value={clienteDocumento} onChange={e => setClienteDocumento(e.target.value)} />
                    </Col>
                    {tipoDte === '03' && (
                      <Col span={12}>
                        <div style={{ fontSize: 11, color: C.textMuted }}>NRC</div>
                        <Input size="small" placeholder="123456-7" value={clienteNrc}
                          onChange={e => setClienteNrc(e.target.value)} />
                      </Col>
                    )}
                  </Row>
                  <Alert type="info" showIcon style={{ marginTop: 8, fontSize: 11 }}
                    message="Modo simulación activo — El documento se guardará como JSON pero no se envía al MH" />
                </Card>
              )}
            </div>

            {/* Botón cobrar */}
            <Button
              type="primary" size="large" block
              icon={<CheckCircleOutlined />}
              loading={loadingCobrar}
              disabled={lineas.length === 0 || !pagoCompleto}
              onClick={cobrar}
              style={{ height: 48, fontSize: 16, fontWeight: 700 }}
            >
              ✅ COBRAR {subtotal > 0 ? fmt(subtotal) : ''}
            </Button>
          </Card>
        </Col>

        {/* ── Columna derecha: barberos hoy + últimas ventas ── */}
        <Col xs={24} lg={10}>
          {/* Barberos hoy */}
          <Card title="✂️ Barberos hoy" size="small" style={{ marginBottom: 12 }}>
            {barberosHoy.length === 0 ? (
              <div style={{ color: C.textDisabled, textAlign: 'center', padding: '16px 0' }}>Sin servicios aún</div>
            ) : (
              barberosHoy.map(b => (
                <div key={b.barberoId} style={{ marginBottom: 10 }}>
                  <Row justify="space-between" align="middle">
                    <Col><b>{b.nombre}</b> <span style={{ color: C.textMuted, fontSize: 11 }}>{b.servicios} servicios</span></Col>
                    <Col><b style={{ color: primary }}>{fmt(b.total)}</b></Col>
                  </Row>
                  <div style={{ background: C.bgMuted, borderRadius: 4, height: 6, marginTop: 4, overflow: 'hidden' }}>
                    <div style={{
                      background: primary, height: '100%', borderRadius: 4,
                      width: `${Math.min(100, (b.total / Math.max(...barberosHoy.map(x => x.total))) * 100)}%`
                    }} />
                  </div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>
                    {b.desglose.map(d => `${d.cantidad}×${d.descripcion} ${fmt(d.subtotal)}`).join(' · ')}
                  </div>
                </div>
              ))
            )}
            {barberosHoy.length > 0 && (
              <div style={{ borderTop: `1px dashed ${C.border}`, marginTop: 8, paddingTop: 8 }}>
                <Row justify="space-between">
                  <Col style={{ color: C.textMuted }}>Total turno</Col>
                  <Col><b style={{ color: primary, fontSize: 14 }}>{fmt(barberosHoy.reduce((s, b) => s + b.total, 0))}</b></Col>
                </Row>
              </div>
            )}
          </Card>

          {/* Últimas ventas */}
          <Card title="🕐 Últimas ventas" size="small"
            extra={<Button size="small" icon={<ReloadOutlined />} onClick={cargarVentasRecientes} />}>
            {ventasRecientes.length === 0 ? (
              <div style={{ color: C.textDisabled, textAlign: 'center', padding: '16px 0' }}>Sin ventas aún</div>
            ) : (
              ventasRecientes.map(v => (
                <div key={v.id} style={{
                  padding: '6px 0', borderBottom: `1px solid ${C.border}`,
                  opacity: v.estado === 'ANULADA' ? 0.4 : 1,
                }}>
                  <Row justify="space-between" align="middle">
                    <Col>
                      <span style={{ fontWeight: 600 }}>#{v.numero}</span>
                      <span style={{ color: C.textMuted, fontSize: 11, marginLeft: 6 }}>
                        {new Date(v.createdAt).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {v.estado === 'ANULADA' && <Tag color="red" style={{ marginLeft: 4, fontSize: 10 }}>ANULADA</Tag>}
                    </Col>
                    <Col><b style={{ color: primary }}>{fmt(v.total)}</b></Col>
                  </Row>
                  <div style={{ fontSize: 10, color: C.textMuted }}>
                    {v.detalles.map((d, i) => <span key={i}>{d.barberoNombre}: {d.descripcion} </span>)}
                  </div>
                </div>
              ))
            )}
          </Card>
        </Col>
      </Row>

      {/* Modal éxito */}
      <Modal
        open={!!modalExito} footer={null} closable={false} width={360}
        centered
      >
        {modalExito && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 44 }}>✅</div>
            <h2 style={{ color: primary, margin: '10px 0 4px' }}>¡Cobro registrado!</h2>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.textPrimary }}>{fmt(modalExito.total)}</div>
            <div style={{ color: C.textMuted, margin: '6px 0 2px', fontSize: 13 }}>Venta #{modalExito.numero}</div>
            <div style={{ color: C.textDisabled, fontSize: 9, marginBottom: 16, fontFamily: 'monospace' }}>{modalExito.codigoGen}</div>

            {modalExito.dte && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>¿El cliente quiere factura?</div>
                <Space>
                  <Button
                    icon={<FileDoneOutlined />}
                    onClick={() => abrirFacturaCompleta(modalExito.dte!)}
                    style={{ borderColor: primary, color: primary }}
                  >
                    Ver Factura (A4)
                  </Button>
                  <Button
                    icon={<PrinterOutlined />}
                    onClick={() => abrirTicket(modalExito.dte!)}
                  >
                    Ver Ticket (80mm)
                  </Button>
                </Space>
              </div>
            )}

            <Button
              onClick={() => setModalExito(null)}
              type="primary" size="large"
              style={{ minWidth: 160 }}
            >
              Nueva venta
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
