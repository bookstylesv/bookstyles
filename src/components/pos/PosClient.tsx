'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Row, Col, Card, Button, Select, InputNumber, Tag, Statistic,
  Modal, Alert, Divider, Badge, Tooltip, Space, Input, Avatar, AutoComplete
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, FileTextOutlined, CheckCircleOutlined,
  ReloadOutlined, PrinterOutlined, FileDoneOutlined,
  AppstoreOutlined, UnorderedListOutlined, ShoppingCartOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import { abrirFacturaCompleta, abrirTicket, type DTEJsonViewer } from '@/lib/dte-viewer'
import { useBarberTheme } from '@/context/ThemeContext'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Barbero { id: number; nombre: string }
interface Servicio { id: number; name: string; price: number; category?: string }
interface Producto {
  id: number; codigo: string; nombre: string; precio: number; stock: number
  stockMinimo: number; categoria: string; unidad: string
  unidadCompra?: string; factorConversion?: number; esFraccionable?: boolean
}
interface LineaVenta {
  key: string
  barberoId: number | null
  barberoNombre: string
  servicioId: number | null
  productoId: number | null
  esProducto: boolean
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
  productos: productosProp,
  preloadAppointmentId,
}: {
  barberos: Barbero[]
  servicios: Servicio[]
  productos: Producto[]
  preloadAppointmentId?: number
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
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards')
  const [busqueda, setBusqueda] = useState('')

  // Loyalty
  const [codigoTarjeta,  setCodigoTarjeta]  = useState('')
  const [tarjetaInfo,    setTarjetaInfo]    = useState<{
    id: number; codigo: string; nombre: string
    tipo: 'SELLOS' | 'PUNTOS'; meta: number; saldoActual: number
    estado: 'ACTIVA' | 'PENDIENTE_CANJE'; dolarsPorPunto?: number
  } | null>(null)
  const [loadingTarjeta, setLoadingTarjeta] = useState(false)
  const [lineaGratis,    setLineaGratis]    = useState<string | null>(null)
  const [todasTarjetas,  setTodasTarjetas]  = useState<{
    id: number; codigo: string; nombre: string
    tipo: 'SELLOS' | 'PUNTOS'; meta: number; saldoActual: number
    estado: 'ACTIVA' | 'PENDIENTE_CANJE'; dolarsPorPunto?: number
  }[]>([])

  // Mini-modal para productos fraccionables
  const [modalFraccion, setModalFraccion] = useState<{
    producto: Producto
    modoVenta: 'unidad' | 'fraccion'
    cantidadFraccion: number
  } | null>(null)

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

  // ── Pre-carga desde cita (appointmentId en URL) ─────────────────────────────
  useEffect(() => {
    if (!preloadAppointmentId) return
    fetch(`/api/appointments/${preloadAppointmentId}`)
      .then(r => r.json())
      .then(json => {
        const appt = json.data ?? json
        if (!appt?.id) return
        setBarberoActivo({ id: appt.barber.id, nombre: appt.barber.user.fullName })
        setClienteNombre(appt.client.fullName)
        setLineas([{
          key:            `svc-preload-${appt.service.id}`,
          barberoId:      appt.barber.id,
          barberoNombre:  appt.barber.user.fullName,
          servicioId:     appt.service.id,
          productoId:     null,
          esProducto:     false,
          descripcion:    appt.service.name,
          precioUnitario: appt.service.price,
          cantidad:       1,
          descuento:      0,
          esGravado:      true,
        }])
      })
      .catch(() => {/* silencioso si falla */})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      servicioId: null, productoId: null, esProducto: false,
      descripcion: '',
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
          updated.productoId = null
          updated.esProducto = false
        }
      }
      if (field === 'productoId') {
        const p = productosProp.find(p => p.id === value)
        if (p) {
          updated.descripcion = p.nombre
          updated.precioUnitario = p.precio
          updated.servicioId = null
          updated.esProducto = true
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
        servicioId: svc.id, productoId: null, esProducto: false,
        descripcion: svc.name,
        precioUnitario: svc.price,
        cantidad: 1, descuento: 0, esGravado: false,
      }])
      return
    }
    const lineaSinServicio = lineas.find(l => !l.servicioId && !l.productoId)
    if (lineaSinServicio) {
      setLineas(prev => prev.map(l =>
        l.key === lineaSinServicio.key
          ? { ...l, servicioId: svc.id, productoId: null, esProducto: false, descripcion: svc.name, precioUnitario: svc.price }
          : l
      ))
    } else {
      setLineas(prev => [...prev, {
        key: Date.now().toString(),
        barberoId: null, barberoNombre: '',
        servicioId: svc.id, productoId: null, esProducto: false,
        descripcion: svc.name,
        precioUnitario: svc.price, cantidad: 1, descuento: 0, esGravado: false,
      }])
    }
  }

  const selectProductoRapido = (p: Producto) => {
    if (p.stock <= 0) return toast.error(`Sin stock: ${p.nombre}`)
    // Si el producto es fraccionable, abrir mini-modal para elegir modo
    if (p.esFraccionable && (p.factorConversion ?? 1) > 1) {
      setModalFraccion({ producto: p, modoVenta: 'unidad', cantidadFraccion: 1 })
      return
    }
    agregarProductoAlCarrito(p, 1, p.precio, p.nombre)
  }

  const agregarProductoAlCarrito = (p: Producto, cantidad: number, precioUnitario: number, descripcion: string) => {
    const existente = lineas.find(l => l.productoId === p.id && l.descripcion === descripcion)
    if (existente) {
      updateLinea(existente.key, 'cantidad', existente.cantidad + cantidad)
      return
    }
    setLineas(prev => [...prev, {
      key: Date.now().toString(),
      barberoId: null, barberoNombre: '',
      servicioId: null, productoId: p.id, esProducto: true,
      descripcion,
      precioUnitario, cantidad, descuento: 0, esGravado: false,
    }])
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
    if (lineas.length === 0) return toast.error('Agrega al menos un ítem')
    if (lineas.some(l => !l.esProducto && !l.barberoId)) return toast.error('Asigna un barbero a cada servicio')
    if (lineas.some(l => !l.descripcion)) return toast.error('Todos los ítems deben tener descripción')
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
          barberoId: l.barberoId ?? undefined,
          servicioId: l.servicioId ?? undefined,
          productoId: l.productoId ?? undefined,
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

      // Loyalty: acumular o canjear
      if (codigoTarjeta.trim() && tarjetaInfo) {
        if (tarjetaInfo.estado === 'PENDIENTE_CANJE') {
          await fetch(`/api/loyalty/tarjetas/${codigoTarjeta.toUpperCase()}/canjear`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nota: `Canje en venta #${data.venta.numero}` }),
          })
        } else {
          const acumRes = await fetch(`/api/loyalty/tarjetas/${codigoTarjeta.toUpperCase()}/acumular`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ventaId: data.venta.id, totalVenta: subtotal }),
          })
          const acumJson = await acumRes.json()
          if (acumJson.data?.completada) {
            toast.success('🎉 ¡Tarjeta completa! El cliente ganó su premio en la próxima visita.')
          }
        }
        setCodigoTarjeta('')
        setTarjetaInfo(null)
        setLineaGratis(null)
      }

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

  // ── Tarjeta de fidelización ─────────────────────────────────────────────────

  // Cargar lista completa de tarjetas (una sola vez al enfocar el campo)
  const cargarTarjetas = useCallback(async () => {
    if (todasTarjetas.length > 0) return // ya cargadas
    setLoadingTarjeta(true)
    try {
      const res  = await fetch('/api/loyalty/tarjetas')
      const json = await res.json()
      if (res.ok) setTodasTarjetas(json.data ?? [])
    } finally { setLoadingTarjeta(false) }
  }, [todasTarjetas.length])

  // Seleccionar una tarjeta del dropdown
  const seleccionarTarjeta = useCallback((codigo: string) => {
    const t = todasTarjetas.find(x => x.codigo === codigo)
    if (!t) return
    setCodigoTarjeta(t.codigo)
    setTarjetaInfo(t)
    if (t.estado === 'PENDIENTE_CANJE') {
      toast.success('🎉 ¡Tarjeta completa! El cliente ganó su premio.')
    }
  }, [todasTarjetas])

  const darLineaGratis = (key: string) => {
    if (lineaGratis === key) {
      // Toggle off: quitar descuento
      setLineaGratis(null)
      setLineas(prev => prev.map(l => l.key === key ? { ...l, descuento: 0 } : l))
    } else {
      // Quitar descuento anterior
      if (lineaGratis) {
        setLineas(prev => prev.map(l => l.key === lineaGratis ? { ...l, descuento: 0 } : l))
      }
      setLineaGratis(key)
      setLineas(prev => prev.map(l =>
        l.key === key ? { ...l, descuento: l.precioUnitario * l.cantidad } : l
      ))
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

      <Row gutter={[12, 12]}>
        {/* ── Columna izquierda: Barbero + Catálogo ── */}
        <Col xs={24} lg={15}>
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

            {/* ── Servicios / Productos ── */}
            <div style={{ marginBottom: 12 }}>
              {/* Cabecera con label + toggle vista */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  2 · Elige servicio o producto
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button onClick={() => setViewMode('cards')} title="Vista tarjetas" style={{
                    padding: '3px 7px', borderRadius: '6px 0 0 6px', cursor: 'pointer', fontSize: 14,
                    border: `1.5px solid ${C.border}`,
                    background: viewMode === 'cards' ? primary : C.bgSurface,
                    color: viewMode === 'cards' ? '#fff' : C.textMuted,
                    borderRight: 'none',
                  }}><AppstoreOutlined /></button>
                  <button onClick={() => setViewMode('list')} title="Vista lista" style={{
                    padding: '3px 7px', borderRadius: '0 6px 6px 0', cursor: 'pointer', fontSize: 14,
                    border: `1.5px solid ${C.border}`,
                    background: viewMode === 'list' ? primary : C.bgSurface,
                    color: viewMode === 'list' ? '#fff' : C.textMuted,
                  }}><UnorderedListOutlined /></button>
                </div>
              </div>

              {/* Buscador — compatible con pistola de código de barras */}
              <Input
                size="small"
                placeholder="Buscar o escanear código de barras..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                allowClear
                autoFocus
                style={{ marginBottom: 8 }}
                onPressEnter={() => {
                  const q = busqueda.trim().toLowerCase()
                  if (!q) return
                  // Coincidencia exacta por código → agregar directamente
                  const exact = productosProp.find(p => p.codigo.toLowerCase() === q)
                  if (exact) { selectProductoRapido(exact); setBusqueda(''); return }
                  // Un solo resultado (nombre o código parcial) → agregar
                  const parcial = productosProp.filter(p =>
                    p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)
                  )
                  if (parcial.length === 1) { selectProductoRapido(parcial[0]); setBusqueda('') }
                }}
              />

              {(() => {
                const q = busqueda.trim().toLowerCase()
                const esProductosTab = categoriaActiva === '__productos__'
                const cats = ['todos', ...Array.from(new Set(serviciosProp.map(s => s.category || 'otro'))).sort(), '__productos__']
                const labels: Record<string, string> = {
                  todos: '🔍 Todos', cabello: '💇 Cabello', barba: '🧔 Barba',
                  combo: '⭐ Combos', tratamiento: '💆 Tratamientos', otro: '📦 Otros',
                  __productos__: '📦 Productos',
                }
                // Con búsqueda activa: mostrar todo (servicios + productos) sin importar tab
                const serviciosFiltrados = q
                  ? serviciosProp.filter(s => s.name.toLowerCase().includes(q))
                  : esProductosTab
                    ? []
                    : categoriaActiva === 'todos' ? serviciosProp : serviciosProp.filter(s => (s.category || 'otro') === categoriaActiva)

                const productosFiltrados = q
                  ? productosProp.filter(p =>
                      p.nombre.toLowerCase().includes(q) ||
                      p.codigo.toLowerCase().includes(q)
                    )
                  : esProductosTab ? productosProp : []

                // En búsqueda activa mostramos ambos grupos
                const mostrarProductos = esProductosTab || !!q
                const mostrarServicios = !esProductosTab || !!q

                return (
                  <>
                    {/* Tabs — ocultos mientras hay búsqueda activa */}
                    {!q && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                        {cats.map(cat => {
                          const count = cat === '__productos__'
                            ? productosProp.length
                            : cat === 'todos' ? serviciosProp.length : serviciosProp.filter(s => (s.category || 'otro') === cat).length
                          const activo = categoriaActiva === cat
                          return (
                            <button key={cat} onClick={() => setCategoriaActiva(cat)} style={{
                              padding: '3px 10px', borderRadius: 12, fontSize: 12, cursor: 'pointer',
                              border: activo ? `2px solid ${primary}` : `1.5px solid ${C.border}`,
                              background: activo ? primary : C.bgSurface,
                              color: activo ? '#fff' : C.textSecondary,
                              fontWeight: activo ? 600 : 400,
                              transition: 'all 0.15s',
                            }}>
                              {labels[cat] || cat}
                              <span style={{ marginLeft: 4, opacity: 0.7, fontSize: 10 }}>({count})</span>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {/* ── VISTA TARJETAS ── */}
                    {viewMode === 'cards' && (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(min(120px, 44%), 1fr))',
                        gap: 6,
                        maxHeight: 'clamp(160px, 30vh, 240px)',
                        overflowY: 'auto',
                        padding: '2px 2px 4px',
                      }}>
                        {mostrarServicios && serviciosFiltrados.map(s => (
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
                        {mostrarProductos && productosFiltrados.map(p => {
                          const sinStock = p.stock <= 0
                          const stockBajo = !sinStock && p.stock <= p.stockMinimo
                          const stockColor = sinStock ? '#ff4d4f' : stockBajo ? '#faad14' : primary
                          return (
                            <button
                              key={`p-${p.id}`}
                              onClick={() => selectProductoRapido(p)}
                              disabled={sinStock}
                              title={sinStock ? 'Sin stock' : `Stock: ${p.stock} ${p.unidad}`}
                              style={{
                                padding: '6px 8px', borderRadius: 8, fontSize: 12,
                                cursor: sinStock ? 'not-allowed' : 'pointer',
                                border: `1.5px solid ${sinStock ? `${C.borderStrong}60` : C.border}`,
                                background: sinStock ? C.bgSubtle : C.bgSurface,
                                color: sinStock ? C.textDisabled : C.textPrimary,
                                textAlign: 'left', lineHeight: 1.3,
                                transition: 'all 0.15s',
                                opacity: sinStock ? 0.5 : 1,
                                position: 'relative',
                              }}
                              onMouseEnter={e => { if (!sinStock) (e.currentTarget as HTMLElement).style.borderColor = primary }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = sinStock ? `${C.borderStrong}60` : C.border }}
                            >
                              <div style={{
                                position: 'absolute', top: 4, right: 4,
                                fontSize: 9, fontWeight: 700, color: stockColor,
                                background: `${stockColor}18`, borderRadius: 4, padding: '1px 4px',
                              }}>
                                {p.stock} {p.unidad.toLowerCase()}
                              </div>
                              <div style={{ fontWeight: 500, marginBottom: 2, paddingRight: 28 }}>{p.nombre}</div>
                              <div style={{ color: primary, fontWeight: 700 }}>{fmt(p.precio)}</div>
                            </button>
                          )
                        })}
                        {mostrarServicios && serviciosFiltrados.length === 0 && mostrarProductos && productosFiltrados.length === 0 && (
                          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: C.textDisabled, padding: '16px 0' }}>
                            Sin resultados para "{busqueda}"
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── VISTA LISTA ── */}
                    {viewMode === 'list' && (
                      <div style={{ maxHeight: 'clamp(160px, 30vh, 240px)', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                              <th style={{ textAlign: 'left', padding: '3px 6px', color: C.textMuted, fontWeight: 600 }}>Nombre</th>
                              <th style={{ textAlign: 'right', padding: '3px 6px', color: C.textMuted, fontWeight: 600 }}>Precio</th>
                              <th style={{ textAlign: 'center', padding: '3px 6px', color: C.textMuted, fontWeight: 600 }}>Stock</th>
                              <th style={{ width: 36 }} />
                            </tr>
                          </thead>
                          <tbody>
                            {mostrarServicios && serviciosFiltrados.map(s => (
                              <tr key={s.id} style={{ borderBottom: `1px solid ${C.border}` }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.bgSubtle}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                                <td style={{ padding: '4px 6px', color: C.textPrimary }}>{s.name}</td>
                                <td style={{ padding: '4px 6px', textAlign: 'right', color: primary, fontWeight: 700 }}>{fmt(s.price)}</td>
                                <td style={{ padding: '4px 6px', textAlign: 'center', color: C.textMuted }}>—</td>
                                <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                                  <button onClick={() => selectServicioRapido(s)} style={{
                                    width: 24, height: 24, borderRadius: 6, border: `1.5px solid ${primary}`,
                                    background: C.bgPrimaryLow, color: primary, cursor: 'pointer', fontWeight: 700,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  }}>+</button>
                                </td>
                              </tr>
                            ))}
                            {mostrarProductos && productosFiltrados.map(p => {
                              const sinStock = p.stock <= 0
                              const stockBajo = !sinStock && p.stock <= p.stockMinimo
                              const stockColor = sinStock ? '#ff4d4f' : stockBajo ? '#faad14' : primary
                              return (
                                <tr key={`p-${p.id}`} style={{ borderBottom: `1px solid ${C.border}`, opacity: sinStock ? 0.5 : 1 }}
                                  onMouseEnter={e => { if (!sinStock) (e.currentTarget as HTMLElement).style.background = C.bgSubtle }}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                                  <td style={{ padding: '4px 6px', color: C.textPrimary }}>{p.nombre}</td>
                                  <td style={{ padding: '4px 6px', textAlign: 'right', color: primary, fontWeight: 700 }}>{fmt(p.precio)}</td>
                                  <td style={{ padding: '4px 6px', textAlign: 'center', color: stockColor, fontWeight: 600, fontSize: 11 }}>
                                    {p.stock} {p.unidad.toLowerCase()}
                                  </td>
                                  <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                                    <button onClick={() => selectProductoRapido(p)} disabled={sinStock} style={{
                                      width: 24, height: 24, borderRadius: 6, border: `1.5px solid ${primary}`,
                                      background: C.bgPrimaryLow, color: primary, cursor: sinStock ? 'not-allowed' : 'pointer',
                                      fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>+</button>
                                  </td>
                                </tr>
                              )
                            })}
                            {mostrarServicios && serviciosFiltrados.length === 0 && mostrarProductos && productosFiltrados.length === 0 && (
                              <tr><td colSpan={4} style={{ textAlign: 'center', color: C.textDisabled, padding: '16px 0' }}>
                                Sin resultados para "{busqueda}"
                              </td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>

            {/* cierre de catalog */}
          </Card>
        </Col>

        {/* ── Columna derecha: Carrito + Cobro ── */}
        <Col xs={24} lg={9}>
          <div style={{ position: 'sticky', top: 12 }}>
            <Card
              size="small"
              title={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Space>
                    <ShoppingCartOutlined />
                    <span style={{ fontWeight: 700 }}>Carrito</span>
                    {lineas.length > 0 && (
                      <span style={{
                        background: primary, color: '#fff', borderRadius: 10,
                        padding: '0 7px', fontSize: 11, fontWeight: 700,
                      }}>{lineas.length}</span>
                    )}
                  </Space>
                  {lineas.length > 0 && (
                    <Button size="small" type="text" danger onClick={() => { setLineas([]); setLineaGratis(null) }}>
                      Limpiar
                    </Button>
                  )}
                </div>
              }
            >
              {/* ── Líneas del carrito ── */}
              {lineas.length === 0 ? (
                <div style={{ textAlign: 'center', color: C.textDisabled, padding: '28px 0' }}>
                  <ShoppingCartOutlined style={{ fontSize: 36, marginBottom: 8, display: 'block' }} />
                  <div style={{ fontSize: 13 }}>Toca un servicio o producto</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>para agregar al carrito</div>
                </div>
              ) : (
                <div style={{ marginBottom: 4 }}>
                  {lineas.map((l, idx) => (
                    <div key={l.key} style={{
                      padding: '8px 0',
                      borderBottom: `1px solid ${C.border}`,
                      background: lineaGratis === l.key ? '#f6ffed' : 'transparent',
                      borderRadius: lineaGratis === l.key ? 4 : 0,
                    }}>
                      {/* Fila 1: número + descripción + subtotal */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <span style={{
                          width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                          background: C.bgMuted, color: C.textMuted, fontSize: 10, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{idx + 1}</span>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Descripción */}
                          <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {l.descripcion || (l.esProducto ? '📦 Producto' : '✂️ Servicio')}
                            </span>
                            {lineaGratis === l.key && (
                              <Tag color="success" style={{ fontSize: 10, marginInlineEnd: 0 }}>GRATIS 🎁</Tag>
                            )}
                          </div>

                          {/* Barbero select */}
                          <Select
                            size="small"
                            placeholder={l.esProducto ? 'Sin barbero (opcional)' : '✂️ Asignar barbero'}
                            style={{ width: '100%', marginTop: 4 }}
                            allowClear={l.esProducto}
                            value={l.barberoId ?? undefined}
                            onChange={v => {
                              const b = barberosProp.find(b => b.id === v)
                              updateLinea(l.key, 'barberoId', v ?? null)
                              updateLinea(l.key, 'barberoNombre', b?.nombre ?? '')
                            }}
                            options={barberosProp.map(b => ({ value: b.id, label: b.nombre }))}
                          />

                          {/* Service/product select — solo si no tiene item asignado todavía */}
                          {!l.servicioId && !l.productoId && (
                            l.esProducto ? (
                              <Select size="small" showSearch placeholder="Buscar producto…"
                                style={{ width: '100%', marginTop: 4 }}
                                value={l.productoId ?? undefined}
                                onChange={v => updateLinea(l.key, 'productoId', v)}
                                options={productosProp.map(p => ({ value: p.id, label: `${p.nombre}` }))}
                              />
                            ) : (
                              <Select size="small" showSearch placeholder="Buscar servicio…"
                                style={{ width: '100%', marginTop: 4 }}
                                value={l.servicioId ?? undefined}
                                onChange={v => updateLinea(l.key, 'servicioId', v)}
                                options={serviciosProp.map(s => ({ value: s.id, label: `${s.name} — ${fmt(s.price)}` }))}
                              />
                            )
                          )}
                        </div>

                        {/* Precio + subtotal */}
                        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 58 }}>
                          <div style={{
                            color: l.descuento > 0 ? '#52c41a' : primary,
                            fontWeight: 700, fontSize: 14,
                          }}>
                            {fmt(l.precioUnitario * l.cantidad - l.descuento)}
                          </div>
                          {l.cantidad > 1 && (
                            <div style={{ fontSize: 10, color: C.textMuted }}>
                              {fmt(l.precioUnitario)} c/u
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Fila 2: controles qty + precio editable + acciones */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, paddingLeft: 24 }}>
                        {/* Qty − N + */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <button
                            onClick={() => updateLinea(l.key, 'cantidad', Math.max(1, l.cantidad - 1))}
                            style={{ width: 22, height: 22, borderRadius: 4, border: `1px solid ${C.border}`, background: C.bgSurface, cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textSecondary }}
                          >−</button>
                          <span style={{ minWidth: 24, textAlign: 'center', fontSize: 13, fontWeight: 700 }}>{l.cantidad}</span>
                          <button
                            onClick={() => updateLinea(l.key, 'cantidad', l.cantidad + 1)}
                            style={{ width: 22, height: 22, borderRadius: 4, border: `1px solid ${C.border}`, background: C.bgSurface, cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textSecondary }}
                          >+</button>
                        </div>

                        {/* Precio unitario editable */}
                        <InputNumber
                          size="small" prefix="$" style={{ flex: 1, minWidth: 0 }}
                          value={l.precioUnitario} min={0} precision={2}
                          onChange={v => updateLinea(l.key, 'precioUnitario', v || 0)}
                        />

                        {/* Botón gratis (loyalty) */}
                        {tarjetaInfo?.estado === 'PENDIENTE_CANJE' && (
                          <Tooltip title={lineaGratis === l.key ? 'Quitar regalo' : 'Marcar gratis'}>
                            <button onClick={() => darLineaGratis(l.key)} style={{
                              padding: '2px 6px', borderRadius: 4, fontSize: 11, cursor: 'pointer',
                              border: lineaGratis === l.key ? `2px solid #52c41a` : `1.5px solid ${C.border}`,
                              background: lineaGratis === l.key ? '#f6ffed' : C.bgSurface,
                              color: lineaGratis === l.key ? '#52c41a' : C.textMuted, fontWeight: 600,
                            }}>🎁</button>
                          </Tooltip>
                        )}

                        {/* Eliminar */}
                        <button onClick={() => removeLinea(l.key)} style={{
                          width: 24, height: 24, borderRadius: 4, border: 'none',
                          background: 'transparent', color: '#ff4d4f', cursor: 'pointer',
                          fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>×</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button type="dashed" size="small" block icon={<PlusOutlined />} onClick={addLinea} style={{ marginTop: 8, marginBottom: 12 }}>
                Agregar línea manual
              </Button>

              <Divider style={{ margin: '8px 0' }} />

              {/* Total prominente */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: lineas.length > 0 ? `${primary}12` : C.bgSubtle,
                border: `1.5px solid ${lineas.length > 0 ? `${primary}50` : C.border}`,
                borderRadius: 10, padding: '10px 16px', marginBottom: 12,
              }}>
                <span style={{ color: C.textSecondary, fontSize: 14 }}>Total</span>
                <span style={{ color: primary, fontSize: 28, fontWeight: 800 }}>{fmt(subtotal)}</span>
              </div>

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

            {/* Tarjeta de fidelización */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4, fontWeight: 600 }}>
                🎴 Código de tarjeta (opcional)
              </div>
              <AutoComplete
                style={{ width: '100%' }}
                value={codigoTarjeta}
                onFocus={cargarTarjetas}
                onChange={val => {
                  const v = val.toUpperCase()
                  setCodigoTarjeta(v)
                  if (!v) { setTarjetaInfo(null); setLineaGratis(null) }
                }}
                onSelect={seleccionarTarjeta}
                options={todasTarjetas
                  .filter(t => {
                    const q = codigoTarjeta.trim().toUpperCase()
                    if (!q) return true
                    return t.codigo.includes(q) || t.nombre.toUpperCase().includes(q)
                  })
                  .map(t => ({
                    value: t.codigo,
                    label: (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          <strong>{t.codigo}</strong>
                          <span style={{ color: '#888', marginLeft: 6, fontSize: 12 }}>{t.nombre}</span>
                        </span>
                        <span style={{ fontSize: 11 }}>
                          {t.tipo === 'SELLOS' ? '🔖' : '⭐'} {t.saldoActual}/{t.meta}
                          {t.estado === 'PENDIENTE_CANJE' && <span style={{ color: '#d46b08', marginLeft: 4 }}>🎁</span>}
                        </span>
                      </div>
                    ),
                  }))}
              >
                <Input
                  placeholder="Busca por código o nombre…"
                  size="small"
                  allowClear
                  suffix={loadingTarjeta ? '…' : undefined}
                  onClear={() => { setTarjetaInfo(null); setLineaGratis(null); setCodigoTarjeta('') }}
                />
              </AutoComplete>
              {tarjetaInfo && (
                <Card size="small" style={{ marginTop: 6, background: tarjetaInfo.estado === 'PENDIENTE_CANJE' ? '#fff7e6' : C.bgPrimaryLow, borderColor: tarjetaInfo.estado === 'PENDIENTE_CANJE' ? '#faad14' : `${primary}40` }}>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>
                    {tarjetaInfo.codigo} — {tarjetaInfo.nombre}
                  </div>
                  <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>
                    {tarjetaInfo.tipo === 'SELLOS' ? '🔖 Sellos' : '⭐ Puntos'}:
                    {' '}{tarjetaInfo.saldoActual}/{tarjetaInfo.meta}
                  </div>
                  {tarjetaInfo.estado === 'PENDIENTE_CANJE' && (
                    <div style={{ marginTop: 6, fontSize: 11, color: '#d46b08', fontWeight: 600 }}>
                      🎉 ¡Tarjeta completa! Selecciona qué línea es gratis:
                    </div>
                  )}
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
              style={{ height: 52, fontSize: 16, fontWeight: 800, marginTop: 4 }}
            >
              ✅ COBRAR {subtotal > 0 ? fmt(subtotal) : ''}
            </Button>
            </Card>
          </div>
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

      {/* ══════════════════════════════════════════════════════
          Mini-modal: Venta de producto fraccionable
      ══════════════════════════════════════════════════════ */}
      <Modal
        open={!!modalFraccion}
        onCancel={() => setModalFraccion(null)}
        title={
          <Space>
            <span>✂️</span>
            <span>¿Cómo vender este producto?</span>
          </Space>
        }
        footer={null}
        destroyOnHidden
        width={440}
      >
        {modalFraccion && (() => {
          const p = modalFraccion.producto
          const factor = p.factorConversion ?? 1
          const unidVenta = p.unidad
          const unidCompra = p.unidadCompra ?? 'unidad'
          const stockEnCompra = (p.stock / factor).toFixed(2)

          // Precio por unidad de venta = precio / factor
          const precioPorFraccion = p.precio / factor
          const precioFraccionTotal = precioPorFraccion * modalFraccion.cantidadFraccion

          const stockSuficiente = modalFraccion.modoVenta === 'unidad'
            ? p.stock >= factor
            : p.stock >= modalFraccion.cantidadFraccion

          const handleAgregar = () => {
            if (!stockSuficiente) {
              toast.error(`Stock insuficiente. Disponible: ${p.stock} ${unidVenta}`)
              return
            }
            if (modalFraccion.modoVenta === 'unidad') {
              // Descuenta factorConversion unidades de venta
              agregarProductoAlCarrito(
                p,
                factor, // la cantidad en unidades de venta
                precioPorFraccion,
                `${p.nombre} (1 ${unidCompra} = ${factor} ${unidVenta})`
              )
            } else {
              const cant = modalFraccion.cantidadFraccion
              if (cant <= 0) { toast.error('Indica la cantidad'); return }
              agregarProductoAlCarrito(
                p,
                cant,
                precioPorFraccion,
                `${p.nombre} × ${cant} ${unidVenta}`
              )
            }
            setModalFraccion(null)
          }

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Info del producto */}
              <div style={{
                background: `${primary}12`, borderRadius: 8, padding: '10px 14px',
                border: `1px solid ${primary}30`,
              }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.nombre}</div>
                <div style={{ fontSize: 12, color: 'hsl(var(--text-muted))', marginTop: 4 }}>
                  Stock: <strong>{p.stock} {unidVenta}</strong>
                  {' '}= {stockEnCompra} {unidCompra}{Number(stockEnCompra) !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Selector modo venta */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setModalFraccion(prev => prev ? { ...prev, modoVenta: 'unidad' } : null)}
                  style={{
                    flex: 1, padding: '14px 10px', borderRadius: 8, cursor: 'pointer',
                    border: `2px solid ${modalFraccion.modoVenta === 'unidad' ? primary : 'hsl(var(--border-default))'}`,
                    background: modalFraccion.modoVenta === 'unidad' ? `${primary}12` : 'hsl(var(--bg-surface))',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  }}
                >
                  <span style={{ fontSize: 22 }}>📦</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>Unidad completa</span>
                  <span style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>
                    1 {unidCompra} = {factor} {unidVenta}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: primary }}>
                    {fmt(p.precio)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalFraccion(prev => prev ? { ...prev, modoVenta: 'fraccion' } : null)}
                  style={{
                    flex: 1, padding: '14px 10px', borderRadius: 8, cursor: 'pointer',
                    border: `2px solid ${modalFraccion.modoVenta === 'fraccion' ? primary : 'hsl(var(--border-default))'}`,
                    background: modalFraccion.modoVenta === 'fraccion' ? `${primary}12` : 'hsl(var(--bg-surface))',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  }}
                >
                  <span style={{ fontSize: 22 }}>✂️</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>Por fracción</span>
                  <span style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>
                    {fmt(precioPorFraccion)} / {unidVenta}
                  </span>
                </button>
              </div>

              {/* Input cantidad fracción */}
              {modalFraccion.modoVenta === 'fraccion' && (
                <div>
                  <div style={{ fontSize: 12, marginBottom: 6, fontWeight: 500 }}>
                    Cantidad de {unidVenta}s a vender:
                  </div>
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0.01} step={1} precision={2}
                    value={modalFraccion.cantidadFraccion}
                    onChange={v => setModalFraccion(prev => prev ? { ...prev, cantidadFraccion: v ?? 1 } : null)}
                    addonAfter={unidVenta}
                    autoFocus
                  />
                  {modalFraccion.cantidadFraccion > 0 && (
                    <div style={{ marginTop: 6, fontSize: 13, color: primary, fontWeight: 600 }}>
                      Total: {fmt(precioFraccionTotal)}
                    </div>
                  )}
                </div>
              )}

              {/* Alerta stock insuficiente */}
              {!stockSuficiente && (
                <Alert
                  type="error"
                  message={`Stock insuficiente. Disponible: ${p.stock} ${unidVenta}`}
                  showIcon
                />
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button onClick={() => setModalFraccion(null)}>Cancelar</Button>
                <Button
                  type="primary"
                  disabled={!stockSuficiente || (modalFraccion.modoVenta === 'fraccion' && modalFraccion.cantidadFraccion <= 0)}
                  onClick={handleAgregar}
                  style={{ background: primary, borderColor: primary }}
                >
                  Agregar al carrito
                </Button>
              </div>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}
