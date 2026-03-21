'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Row, Col, Card, Button, Select, InputNumber, Tag, Statistic,
  Modal, Alert, Divider, Badge, Tabs, Tooltip, Space, Input, Segmented, Avatar
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, FileTextOutlined, CheckCircleOutlined,
  ReloadOutlined, ScissorOutlined, UserOutlined
} from '@ant-design/icons'
import { toast } from 'sonner'

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
  const [modalExito, setModalExito] = useState<{ numero: number; total: number; codigoGen: string } | null>(null)
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
  // Pago simple: siempre cubre el total. Pago dividido: suma de los montos ingresados
  const totalPagado = pagos.length === 1 ? subtotal : pagos.reduce((s, p) => s + (p.monto || 0), 0)
  const diferencia = totalPagado - subtotal
  const pagoCompleto = pagos.length === 1
    ? true  // pago simple siempre cubre (efectivo requiere que recibido >= total si es CASH, pero no bloqueamos el botón)
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
      // Si se selecciona servicio, auto-llenar precio y descripción
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
    // Si hay barbero activo seleccionado, crear siempre una línea nueva con él
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
    // Sin barbero activo: asignar al primer ítem sin servicio
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
    // El segundo método arranca en 0, el primero se ajusta al resto
    setPagos(prev => [...prev, { key: Date.now().toString(), metodo: siguiente.key as 'CASH', monto: 0 }])
  }

  const removePago = (key: string) => {
    if (pagos.length === 1) return
    setPagos(prev => prev.filter(p => p.key !== key))
  }

  // Los billetes establecen el monto RECIBIDO (lo que el cliente entrega físicamente)
  const usarBillete = (pagoKey: string, billete: number) => {
    updatePago(pagoKey, 'recibido', billete)
  }

  // Cuánto falta por cubrir con los demás métodos
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
          // En pago simple el monto es el total, en pago dividido el monto lo ingresó el usuario
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

      setModalExito({ numero: data.venta.numero, total: data.venta.total, codigoGen: data.venta.codigoGeneracion })
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
          <h2 style={{ color: '#0d9488' }}>No hay turno abierto</h2>
          <p style={{ color: '#666', marginBottom: 24 }}>Para empezar a vender necesitas abrir un turno de caja</p>
          <Button type="primary" size="large" href="/pos-turnos" style={{ background: '#0d9488', borderColor: '#0d9488' }}>
            Ir a Turnos de Caja
          </Button>
        </Card>
      </div>
    )
  }

  // ── UI principal ────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '16px', background: '#f5f5f5', minHeight: '100vh' }}>

      {/* Header turno */}
      <Card size="small" style={{ marginBottom: 12, borderColor: '#0d9488' }} bodyStyle={{ padding: '8px 16px' }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space>
              <Badge status="processing" color="#0d9488" text={
                <span style={{ fontWeight: 600, color: '#0d9488' }}>TURNO ABIERTO</span>
              } />
              <span style={{ color: '#666', fontSize: 12 }}>
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
              <div style={{ fontSize: 11, color: '#888', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                1 · Selecciona barbero
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {barberosProp.length <= 8 ? (
                  // ≤8 barberos: chips compactos
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
                          border: activo ? '2px solid #0d9488' : '1.5px solid #d9d9d9',
                          background: activo ? '#f0fdfa' : '#fff',
                          cursor: 'pointer', fontWeight: activo ? 600 : 400,
                          color: activo ? '#0d9488' : '#333', fontSize: 13,
                          transition: 'all 0.15s',
                        }}
                      >
                        <Avatar size={22}
                          style={{ background: activo ? '#0d9488' : '#e0e0e0', color: activo ? '#fff' : '#555', fontSize: 10, flexShrink: 0 }}>
                          {iniciales}
                        </Avatar>
                        {b.nombre.split(' ')[0]}
                      </button>
                    )
                  })
                ) : (
                  // >8 barberos: Select con búsqueda
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
                <div style={{ marginTop: 6, fontSize: 12, color: '#0d9488' }}>
                  ✂️ <b>{barberoActivo.nombre}</b> seleccionado — elige un servicio abajo para agregar la línea
                </div>
              )}
            </div>

            {/* ── Servicios por categoría ── */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                2 · Elige servicio
              </div>

              {/* Tabs de categoría */}
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
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                      {cats.map(cat => (
                        <button key={cat} onClick={() => setCategoriaActiva(cat)} style={{
                          padding: '3px 10px', borderRadius: 12, fontSize: 12, cursor: 'pointer',
                          border: categoriaActiva === cat ? '2px solid #0d9488' : '1.5px solid #d9d9d9',
                          background: categoriaActiva === cat ? '#0d9488' : '#fff',
                          color: categoriaActiva === cat ? '#fff' : '#555',
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

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                      gap: 6,
                      maxHeight: 220,
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
                            border: '1.5px solid #e0e0e0',
                            background: barberoActivo ? '#fff' : '#fafafa',
                            color: barberoActivo ? '#222' : '#999',
                            textAlign: 'left', lineHeight: 1.3,
                            transition: 'all 0.15s',
                            opacity: barberoActivo ? 1 : 0.6,
                          }}
                          onMouseEnter={e => { if (barberoActivo) (e.currentTarget as HTMLElement).style.borderColor = '#0d9488' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e0e0e0' }}
                        >
                          <div style={{ fontWeight: 500, marginBottom: 2 }}>{s.name}</div>
                          <div style={{ color: '#0d9488', fontWeight: 700 }}>{fmt(s.price)}</div>
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
              <div style={{ textAlign: 'center', color: '#bbb', padding: '20px 0' }}>
                Toca un barbero o servicio para agregar líneas
              </div>
            ) : (
              <div style={{ marginBottom: 8 }}>
                {lineas.map((l, idx) => (
                  <Card key={l.key} size="small" style={{ marginBottom: 6, background: '#fafafa' }}>
                    <Row gutter={6} align="middle">
                      <Col span={1}>
                        <span style={{ color: '#888', fontSize: 11 }}>{idx + 1}</span>
                      </Col>
                      <Col span={6}>
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
                      <Col span={7}>
                        <Select
                          size="small" showSearch placeholder="Servicio" style={{ width: '100%' }}
                          value={l.servicioId}
                          onChange={v => updateLinea(l.key, 'servicioId', v)}
                          options={serviciosProp.map(s => ({ value: s.id, label: s.name + ' ' + fmt(s.price) }))}
                        />
                      </Col>
                      <Col span={4}>
                        <InputNumber
                          size="small" prefix="$" style={{ width: '100%' }}
                          value={l.precioUnitario} min={0} precision={2}
                          onChange={v => updateLinea(l.key, 'precioUnitario', v || 0)}
                        />
                      </Col>
                      <Col span={3}>
                        <InputNumber
                          size="small" prefix="$" placeholder="Desc." style={{ width: '100%' }}
                          value={l.descuento || undefined} min={0} precision={2}
                          onChange={v => updateLinea(l.key, 'descuento', v || 0)}
                        />
                      </Col>
                      <Col span={2} style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 600, color: '#0d9488' }}>
                          {fmt(l.precioUnitario * l.cantidad - l.descuento)}
                        </span>
                      </Col>
                      <Col span={1}>
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
                  valueStyle={{ color: '#0d9488', fontSize: 28, fontWeight: 700 }} />
              </Col>
            </Row>

            {/* ── Sección de cobro ── */}
            {(() => {
              const esPagoSimple = pagos.length === 1
              const p = pagos[0]
              const esCash = p.metodo === 'CASH'
              // Monto efectivo del pago simple = total a pagar
              const montoEfectivo = esPagoSimple ? subtotal : p.monto
              const vuelto = esCash && (p.recibido || 0) > 0
                ? parseFloat((Math.max(0, (p.recibido || 0) - montoEfectivo)).toFixed(2))
                : 0
              const clienteEntregaMenos = esCash && (p.recibido || 0) > 0 && (p.recibido || 0) < montoEfectivo

              return (
                <div style={{ marginBottom: 10 }}>

                  {/* ── Encabezado con método + botón pago dividido ── */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      3 · Cobro
                    </div>
                    {pagos.length < 3 && lineas.length > 0 && (
                      <Button size="small" type="link" icon={<PlusOutlined />} onClick={addPago}
                        style={{ fontSize: 12, padding: 0, color: '#0d9488' }}>
                        Dividir pago
                      </Button>
                    )}
                  </div>

                  {/* ── PAGO SIMPLE: un solo método ── */}
                  {esPagoSimple ? (
                    <div>
                      {/* Selector de método — horizontal, tipo segmento */}
                      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                        {METODOS.map(m => (
                          <button key={m.key} onClick={() => {
                            updatePago(p.key, 'metodo', m.key)
                            updatePago(p.key, 'recibido', undefined)
                          }} style={{
                            flex: 1, padding: '8px 4px', borderRadius: 8, cursor: 'pointer',
                            border: p.metodo === m.key ? '2px solid #0d9488' : '1.5px solid #e0e0e0',
                            background: p.metodo === m.key ? '#f0fdfa' : '#fff',
                            color: p.metodo === m.key ? '#0d9488' : '#666',
                            fontWeight: p.metodo === m.key ? 700 : 400,
                            fontSize: 13, textAlign: 'center', transition: 'all 0.15s',
                          }}>
                            {m.label}
                          </button>
                        ))}
                      </div>

                      {/* Total a cobrar — prominente */}
                      {lineas.length > 0 && (
                        <div style={{
                          background: '#f6ffed', border: '1.5px solid #b7eb8f',
                          borderRadius: 10, padding: '10px 16px', marginBottom: 12,
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                          <span style={{ color: '#555', fontSize: 14 }}>Total a cobrar</span>
                          <span style={{ color: '#0d9488', fontSize: 26, fontWeight: 800 }}>{fmt(subtotal)}</span>
                        </div>
                      )}

                      {/* CASH: billetes + campo recibido + vuelto */}
                      {esCash && lineas.length > 0 && (
                        <>
                          <div style={{ marginBottom: 6 }}>
                            <div style={{ fontSize: 12, color: '#555', fontWeight: 600, marginBottom: 6 }}>
                              ¿Con cuánto paga el cliente?
                            </div>
                            {/* Billetes rápidos — más grandes y claros */}
                            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                              {BILLETES.map(b => {
                                const activo = p.recibido === b
                                return (
                                  <button key={b} onClick={() => usarBillete(p.key, b)} style={{
                                    flex: '1 1 50px', padding: '8px 0', borderRadius: 8,
                                    border: activo ? '2px solid #0d9488' : '1.5px solid #d9d9d9',
                                    background: activo ? '#0d9488' : b >= subtotal ? '#f6ffed' : '#fafafa',
                                    color: activo ? '#fff' : b >= subtotal ? '#389e0d' : '#555',
                                    fontWeight: 700, fontSize: 14, cursor: 'pointer',
                                    transition: 'all 0.15s',
                                  }}>
                                    ${b}
                                  </button>
                                )
                              })}
                            </div>
                            {/* Campo manual */}
                            <InputNumber
                              size="large" prefix="$" placeholder="O escribe el monto exacto"
                              style={{ width: '100%' }}
                              value={p.recibido || undefined} min={0} precision={2}
                              onChange={v => updatePago(p.key, 'recibido', v || 0)}
                            />
                          </div>

                          {/* Vuelto — la parte más importante, grande y visible */}
                          {(p.recibido || 0) > 0 && (
                            <div style={{
                              borderRadius: 10, padding: '12px 16px', marginTop: 8,
                              background: clienteEntregaMenos ? '#fff1f0' : '#f0fdfa',
                              border: `2px solid ${clienteEntregaMenos ? '#ff4d4f' : '#0d9488'}`,
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
                                  <span style={{ color: '#0d9488', fontWeight: 600, fontSize: 14 }}>💰 Vuelto</span>
                                  <span style={{ color: '#0d9488', fontSize: 28, fontWeight: 800 }}>{fmt(vuelto)}</span>
                                </>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {/* CARD / TRANSFER / QR: referencia opcional */}
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
                    /* ── PAGO DIVIDIDO: múltiples métodos ── */
                    <div>
                      {/* Barra de progreso del cubierto */}
                      {lineas.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                            <span style={{ color: '#555' }}>Cubierto</span>
                            <span style={{ fontWeight: 700, color: pagoCompleto ? '#0d9488' : '#faad14' }}>
                              {fmt(totalPagado)} / {fmt(subtotal)}
                              {pagoCompleto && ' ✅'}
                            </span>
                          </div>
                          <div style={{ background: '#f0f0f0', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: 6, transition: 'width 0.3s',
                              background: pagoCompleto ? '#0d9488' : '#faad14',
                              width: `${Math.min(100, subtotal > 0 ? (totalPagado / subtotal) * 100 : 0)}%`,
                            }} />
                          </div>
                        </div>
                      )}

                      {pagos.map((pg, idx) => {
                        const pendiente = pendientePorPago(pg.key)
                        const pgVuelto = pg.metodo === 'CASH' && (pg.recibido || 0) > 0
                          ? Math.max(0, (pg.recibido || 0) - pg.monto)
                          : 0
                        const pgFalta = pg.metodo === 'CASH' && (pg.recibido || 0) > 0 && (pg.recibido || 0) < pg.monto
                        return (
                          <Card key={pg.key} size="small" style={{ marginBottom: 8, borderColor: '#e8e8e8' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              {/* Método */}
                              <Select size="small" style={{ flex: 1 }} value={pg.metodo}
                                onChange={v => { updatePago(pg.key, 'metodo', v); updatePago(pg.key, 'recibido', undefined) }}
                                options={METODOS.map(m => ({ value: m.key, label: m.label }))}
                              />
                              {/* Monto de este método */}
                              <InputNumber size="small" prefix="$"
                                style={{ width: 110 }}
                                value={pg.monto} min={0} max={subtotal} precision={2}
                                placeholder="Monto"
                                onChange={v => updatePago(pg.key, 'monto', v || 0)}
                                addonAfter={
                                  <span style={{ fontSize: 10, color: '#0d9488', cursor: 'pointer' }}
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

                            {/* Cash dentro de pago dividido */}
                            {pg.metodo === 'CASH' && (
                              <>
                                <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>El cliente entrega:</div>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                                  {BILLETES.map(b => (
                                    <button key={b} onClick={() => usarBillete(pg.key, b)} style={{
                                      flex: '1 1 36px', padding: '5px 2px', borderRadius: 6,
                                      border: pg.recibido === b ? '2px solid #0d9488' : '1px solid #d9d9d9',
                                      background: pg.recibido === b ? '#0d9488' : '#fafafa',
                                      color: pg.recibido === b ? '#fff' : '#555',
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
                                    background: pgFalta ? '#fff1f0' : '#f0fdfa',
                                    border: `1.5px solid ${pgFalta ? '#ff4d4f' : '#0d9488'}`,
                                  }}>
                                    <span style={{ color: pgFalta ? '#ff4d4f' : '#0d9488', fontWeight: 700 }}>
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
                onClick={() => setConFactura(v => !v)}
                style={conFactura ? { background: '#0d9488', borderColor: '#0d9488' } : {}}>
                {conFactura ? '🧾 Con factura' : '☐ Cliente quiere factura'}
              </Button>

              {conFactura && (
                <Card size="small" style={{ marginTop: 8, background: '#f0fdfa' }}>
                  <Row gutter={8} style={{ marginBottom: 6 }}>
                    <Col span={12}>
                      <div style={{ fontSize: 11, color: '#888' }}>Tipo</div>
                      <Select size="small" value={tipoDte} onChange={v => setTipoDte(v)} style={{ width: '100%' }}>
                        <Select.Option value="01">Factura Consumidor Final</Select.Option>
                        <Select.Option value="03">Crédito Fiscal (CCF)</Select.Option>
                      </Select>
                    </Col>
                    <Col span={12}>
                      <div style={{ fontSize: 11, color: '#888' }}>Nombre</div>
                      <Input size="small" placeholder="Consumidor Final" value={clienteNombre}
                        onChange={e => setClienteNombre(e.target.value)} />
                    </Col>
                  </Row>
                  <Row gutter={8}>
                    <Col span={12}>
                      <div style={{ fontSize: 11, color: '#888' }}>{tipoDte === '03' ? 'NIT' : 'DUI'}</div>
                      <Input size="small" placeholder={tipoDte === '03' ? '0614-123456-001-5' : '12345678-9'}
                        value={clienteDocumento} onChange={e => setClienteDocumento(e.target.value)} />
                    </Col>
                    {tipoDte === '03' && (
                      <Col span={12}>
                        <div style={{ fontSize: 11, color: '#888' }}>NRC</div>
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
              style={{ background: '#0d9488', borderColor: '#0d9488', height: 48, fontSize: 16, fontWeight: 700 }}
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
              <div style={{ color: '#bbb', textAlign: 'center', padding: '16px 0' }}>Sin servicios aún</div>
            ) : (
              barberosHoy.map(b => (
                <div key={b.barberoId} style={{ marginBottom: 10 }}>
                  <Row justify="space-between" align="middle">
                    <Col><b>{b.nombre}</b> <span style={{ color: '#888', fontSize: 11 }}>{b.servicios} servicios</span></Col>
                    <Col><b style={{ color: '#0d9488' }}>{fmt(b.total)}</b></Col>
                  </Row>
                  {/* Barra visual */}
                  <div style={{ background: '#e6f7f5', borderRadius: 4, height: 6, marginTop: 4, overflow: 'hidden' }}>
                    <div style={{
                      background: '#0d9488', height: '100%', borderRadius: 4,
                      width: `${Math.min(100, (b.total / Math.max(...barberosHoy.map(x => x.total))) * 100)}%`
                    }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
                    {b.desglose.map(d => `${d.cantidad}×${d.descripcion} ${fmt(d.subtotal)}`).join(' · ')}
                  </div>
                </div>
              ))
            )}
            {barberosHoy.length > 0 && (
              <div style={{ borderTop: '1px dashed #e0e0e0', marginTop: 8, paddingTop: 8 }}>
                <Row justify="space-between">
                  <Col style={{ color: '#888' }}>Total turno</Col>
                  <Col><b style={{ color: '#0d9488', fontSize: 14 }}>{fmt(barberosHoy.reduce((s, b) => s + b.total, 0))}</b></Col>
                </Row>
              </div>
            )}
          </Card>

          {/* Últimas ventas */}
          <Card title="🕐 Últimas ventas" size="small"
            extra={<Button size="small" icon={<ReloadOutlined />} onClick={cargarVentasRecientes} />}>
            {ventasRecientes.length === 0 ? (
              <div style={{ color: '#bbb', textAlign: 'center', padding: '16px 0' }}>Sin ventas aún</div>
            ) : (
              ventasRecientes.map(v => (
                <div key={v.id} style={{
                  padding: '6px 0', borderBottom: '1px solid #f0f0f0',
                  opacity: v.estado === 'ANULADA' ? 0.4 : 1,
                }}>
                  <Row justify="space-between" align="middle">
                    <Col>
                      <span style={{ fontWeight: 600 }}>#{v.numero}</span>
                      <span style={{ color: '#888', fontSize: 11, marginLeft: 6 }}>
                        {new Date(v.createdAt).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {v.estado === 'ANULADA' && <Tag color="red" style={{ marginLeft: 4, fontSize: 10 }}>ANULADA</Tag>}
                    </Col>
                    <Col><b style={{ color: '#0d9488' }}>{fmt(v.total)}</b></Col>
                  </Row>
                  <div style={{ fontSize: 10, color: '#999' }}>
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
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48 }}>✅</div>
            <h2 style={{ color: '#0d9488', margin: '12px 0 4px' }}>Cobro registrado</h2>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#111' }}>{fmt(modalExito.total)}</div>
            <div style={{ color: '#888', margin: '8px 0 4px', fontSize: 12 }}>Venta #{modalExito.numero}</div>
            <div style={{ color: '#bbb', fontSize: 10, marginBottom: 16 }}>{modalExito.codigoGen}</div>
            <Space>
              <Button onClick={() => setModalExito(null)} type="primary"
                style={{ background: '#0d9488', borderColor: '#0d9488' }}>
                Nueva venta
              </Button>
              <Button onClick={() => {
                window.open(`/pos-documentos?uuid=${modalExito.codigoGen}`, '_blank')
                setModalExito(null)
              }}>
                Ver documento
              </Button>
            </Space>
          </div>
        )}
      </Modal>
    </div>
  )
}
