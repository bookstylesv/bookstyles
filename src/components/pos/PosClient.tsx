'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Row, Col, Card, Button, Select, InputNumber, Tag, Statistic,
  Modal, Alert, Divider, Badge, Tabs, Table, Tooltip, message, Space, Input
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, ShoppingCartOutlined,
  UserOutlined, FileTextOutlined, CheckCircleOutlined,
  ReloadOutlined, InfoCircleOutlined
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
  const totalPagado = pagos.reduce((s, p) => s + (p.monto || 0), 0)
  const diferencia = totalPagado - subtotal
  const pagoCompleto = Math.abs(diferencia) < 0.01 || diferencia > 0

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

  const selectBarberoRapido = (barberoId: number, barberoNombre: string) => {
    // Si hay una línea vacía sin barbero, asignarle este
    const lineaVacia = lineas.find(l => !l.barberoId)
    if (lineaVacia) {
      updateLinea(lineaVacia.key, 'barberoId', barberoId)
      updateLinea(lineaVacia.key, 'barberoNombre', barberoNombre)
    } else {
      // Agregar nueva línea con este barbero
      setLineas(prev => [...prev, {
        key: Date.now().toString(),
        barberoId, barberoNombre,
        servicioId: null, descripcion: '',
        precioUnitario: 0, cantidad: 1, descuento: 0, esGravado: false,
      }])
    }
  }

  const selectServicioRapido = (svc: Servicio) => {
    // Asignar al primer ítem sin servicio
    const lineaSinServicio = lineas.find(l => !l.servicioId)
    if (lineaSinServicio) {
      setLineas(prev => prev.map(l =>
        l.key === lineaSinServicio.key
          ? { ...l, servicioId: svc.id, descripcion: svc.name, precioUnitario: svc.price }
          : l
      ))
    } else {
      // Agregar nueva línea
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
        pagos: pagos.map(p => ({
          metodo: p.metodo,
          monto: p.monto,
          recibido: p.metodo === 'CASH' ? p.recibido : undefined,
          vuelto: p.metodo === 'CASH' && p.recibido && p.recibido > p.monto
            ? parseFloat((p.recibido - p.monto).toFixed(2)) : undefined,
          referencia: p.referencia,
        })),
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

            {/* Botones rápidos barberos */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase' }}>Barbero</div>
              <Space wrap>
                {barberosProp.map(b => (
                  <Button key={b.id} size="small" onClick={() => selectBarberoRapido(b.id, b.nombre)}
                    style={{ borderRadius: 6 }}>
                    ✂️ {b.nombre}
                  </Button>
                ))}
              </Space>
            </div>

            {/* Botones rápidos servicios */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase' }}>Servicio rápido</div>
              <Space wrap>
                {serviciosProp.filter(s => s.price > 0).map(s => (
                  <Button key={s.id} size="small" type="dashed" onClick={() => selectServicioRapido(s)}
                    style={{ borderRadius: 6 }}>
                    {s.name} — {fmt(s.price)}
                  </Button>
                ))}
              </Space>
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

            {/* Pagos */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase' }}>
                Forma de pago
              </div>
              {pagos.map(p => (
                <Card key={p.key} size="small" style={{ marginBottom: 6 }}>
                  <Row gutter={6} align="middle">
                    <Col span={6}>
                      <Select size="small" style={{ width: '100%' }} value={p.metodo}
                        onChange={v => updatePago(p.key, 'metodo', v)}
                        options={METODOS.map(m => ({ value: m.key, label: m.label }))}
                      />
                    </Col>
                    <Col span={5}>
                      <InputNumber size="small" prefix="$" style={{ width: '100%' }}
                        value={p.monto} min={0} precision={2}
                        onChange={v => updatePago(p.key, 'monto', v || 0)}
                      />
                    </Col>
                    {p.metodo === 'CASH' && (
                      <>
                        <Col span={5}>
                          <InputNumber size="small" prefix="$" placeholder="Recibido" style={{ width: '100%' }}
                            value={p.recibido} min={0} precision={2}
                            onChange={v => updatePago(p.key, 'recibido', v || 0)}
                          />
                        </Col>
                        <Col span={5}>
                          {p.recibido && p.recibido > 0 && (
                            <Tag color={p.recibido >= p.monto ? 'green' : 'red'} style={{ width: '100%', textAlign: 'center' }}>
                              Vuelto: {fmt(Math.max(0, (p.recibido || 0) - p.monto))}
                            </Tag>
                          )}
                        </Col>
                      </>
                    )}
                    {(p.metodo === 'CARD' || p.metodo === 'TRANSFER') && (
                      <Col span={10}>
                        <Input size="small" placeholder="Referencia / # tarjeta"
                          value={p.referencia}
                          onChange={e => updatePago(p.key, 'referencia', e.target.value)}
                        />
                      </Col>
                    )}
                    <Col span={2}>
                      {pagos.length > 1 && (
                        <Button size="small" type="text" danger icon={<DeleteOutlined />}
                          onClick={() => removePago(p.key)} />
                      )}
                    </Col>
                  </Row>
                  {p.metodo === 'CASH' && (
                    <div style={{ marginTop: 6 }}>
                      <span style={{ fontSize: 11, color: '#888' }}>Billetes: </span>
                      <Space size={4}>
                        {BILLETES.map(b => (
                          <Button key={b} size="small" style={{ padding: '0 6px', fontSize: 11 }}
                            onClick={() => usarBillete(p.key, b)}>
                            ${b}
                          </Button>
                        ))}
                      </Space>
                    </div>
                  )}
                </Card>
              ))}

              {pagos.length < 4 && (
                <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={addPago}>
                  Agregar otro método
                </Button>
              )}

              {lineas.length > 0 && (
                <div style={{ textAlign: 'right', marginTop: 6, fontSize: 12 }}>
                  Cubierto: <b style={{ color: pagoCompleto ? '#0d9488' : '#ff4d4f' }}>{fmt(totalPagado)}</b> / {fmt(subtotal)}
                  {diferencia > 0.01 && <span style={{ color: '#888', marginLeft: 8 }}>(Vuelto total: {fmt(diferencia)})</span>}
                </div>
              )}
            </div>

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
