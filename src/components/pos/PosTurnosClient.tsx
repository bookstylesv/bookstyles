'use client'

import { useState } from 'react'
import {
  Card, Row, Col, Button, InputNumber, Table, Tag, Statistic,
  Modal, Descriptions, Alert, Space, Divider, Input
} from 'antd'
import { PlusOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons'
import { toast } from 'sonner'

interface Turno {
  id: number
  estado: string
  fechaApertura: string
  fechaCierre: string | null
  usuarioApertura: string
  usuarioCierre: string | null
  montoInicial: number
  totalEfectivo: number
  totalTarjeta: number
  totalTransferencia: number
  totalQR: number
  totalVentas: number
  cantidadServicios: number
  montoEsperado: number | null
  montoContado: number | null
  diferencia: number | null
  notasCierre: string | null
  totalVentasCount: number
  arqueoCaja: any
}

const BILLETES = [100, 50, 20, 10, 5, 1]
const MONEDAS = [0.25, 0.10, 0.05, 0.01]

const fmt = (n: number | null | undefined) =>
  n != null ? `$${Number(n).toFixed(2)}` : '—'

function calcTotal(arqueo: Record<string, number>, denominaciones: number[]) {
  return denominaciones.reduce((s, d) => s + d * (arqueo[String(d)] || 0), 0)
}

export default function PosTurnosClient({
  turnoActivo,
  historial: historialProp,
}: {
  turnoActivo: Turno | null
  historial: Turno[]
}) {
  const [historial, setHistorial] = useState<Turno[]>(historialProp)
  const [turno, setTurno] = useState<Turno | null>(turnoActivo)

  // ── Abrir turno ─────────────────────────────────────────────────────────────
  const [modalAbrir, setModalAbrir] = useState(false)
  const [montoInicial, setMontoInicial] = useState<number>(0)
  const [loadingAbrir, setLoadingAbrir] = useState(false)

  const abrirTurno = async () => {
    setLoadingAbrir(true)
    try {
      const res = await fetch('/api/pos/turno/abrir', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ montoInicial }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Turno abierto correctamente')
      setModalAbrir(false)
      window.location.reload()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoadingAbrir(false)
    }
  }

  // ── Cerrar turno ────────────────────────────────────────────────────────────
  const [modalCerrar, setModalCerrar] = useState(false)
  const [arqueoBilletes, setArqueoBilletes] = useState<Record<string, number>>({})
  const [arqueoMonedas, setArqueoMonedas] = useState<Record<string, number>>({})
  const [notasCierre, setNotasCierre] = useState('')
  const [loadingCerrar, setLoadingCerrar] = useState(false)

  const totalContadoBilletes = calcTotal(arqueoBilletes, BILLETES)
  const totalContadoMonedas = calcTotal(arqueoMonedas, MONEDAS)
  const totalContado = parseFloat((totalContadoBilletes + totalContadoMonedas).toFixed(2))

  const cerrarTurno = async () => {
    if (!turno) return
    setLoadingCerrar(true)
    try {
      const res = await fetch('/api/pos/turno/cerrar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turnoId: turno.id,
          montoContado: totalContado,
          arqueoCaja: {
            billetes: arqueoBilletes,
            monedas: arqueoMonedas,
            totalContado,
          },
          notasCierre,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Turno cerrado correctamente')
      setModalCerrar(false)
      window.location.reload()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoadingCerrar(false)
    }
  }

  // ── Columnas historial ───────────────────────────────────────────────────────
  const columns = [
    {
      title: '#',
      render: (_: unknown, __: unknown, idx: number) => historial.length - idx,
      width: 40,
    },
    {
      title: 'Apertura',
      dataIndex: 'fechaApertura',
      render: (v: string) => new Date(v).toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'short' }),
    },
    {
      title: 'Cierre',
      dataIndex: 'fechaCierre',
      render: (v: string | null) => v ? new Date(v).toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'short' }) : '—',
    },
    {
      title: 'Cajero',
      dataIndex: 'usuarioApertura',
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      render: (v: string) => <Tag color={v === 'ABIERTO' ? 'green' : 'default'}>{v}</Tag>,
    },
    {
      title: 'Ventas',
      dataIndex: 'totalVentasCount',
      align: 'center' as const,
    },
    {
      title: 'Total',
      dataIndex: 'totalVentas',
      render: (v: number) => <b style={{ color: '#0d9488' }}>{fmt(v)}</b>,
      align: 'right' as const,
    },
    {
      title: 'Diferencia',
      dataIndex: 'diferencia',
      align: 'right' as const,
      render: (v: number | null) => {
        if (v == null) return '—'
        const color = v > 0 ? '#52c41a' : v < 0 ? '#ff4d4f' : '#0d9488'
        return <b style={{ color }}>{v >= 0 ? '+' : ''}{fmt(v)}</b>
      },
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={24}>
          {turno ? (
            <Alert
              type="success"
              showIcon
              message={
                <Row justify="space-between" align="middle">
                  <Col>
                    <b style={{ color: '#0d9488' }}>🟢 Turno activo</b>
                    <span style={{ color: '#666', marginLeft: 12, fontSize: 12 }}>
                      {turno.usuarioApertura} · Desde {new Date(turno.fechaApertura).toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </Col>
                  <Col>
                    <Button danger icon={<LockOutlined />} onClick={() => setModalCerrar(true)}>
                      Cerrar Turno
                    </Button>
                  </Col>
                </Row>
              }
            />
          ) : (
            <Alert
              type="warning"
              showIcon
              message={
                <Row justify="space-between" align="middle">
                  <Col><b>🔒 No hay turno activo</b> — No se pueden registrar ventas</Col>
                  <Col>
                    <Button type="primary" icon={<UnlockOutlined />}
                      style={{ background: '#0d9488', borderColor: '#0d9488' }}
                      onClick={() => setModalAbrir(true)}>
                      Abrir Turno
                    </Button>
                  </Col>
                </Row>
              }
            />
          )}
        </Col>
      </Row>

      {/* KPIs turno activo */}
      {turno && (
        <Row gutter={12} style={{ marginBottom: 16 }}>
          {[
            { title: 'Fondo inicial', value: turno.montoInicial, prefix: '$' },
            { title: 'Ventas hoy', value: turno.totalVentasCount },
            { title: 'Efectivo ventas', value: turno.totalEfectivo, prefix: '$' },
            { title: 'Tarjeta', value: turno.totalTarjeta, prefix: '$' },
          ].map((k, i) => (
            <Col span={6} key={i}>
              <Card size="small">
                <Statistic title={k.title} value={k.value} prefix={k.prefix} precision={k.prefix ? 2 : 0}
                  valueStyle={{ color: '#0d9488' }} />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Historial */}
      <Card title="📋 Historial de Turnos" size="small">
        <Table
          dataSource={historial}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 15 }}
        />
      </Card>

      {/* Modal abrir turno */}
      <Modal
        open={modalAbrir}
        title="Abrir Turno de Caja"
        onCancel={() => setModalAbrir(false)}
        onOk={abrirTurno}
        confirmLoading={loadingAbrir}
        okText="Abrir Turno"
        okButtonProps={{ style: { background: '#0d9488', borderColor: '#0d9488' } }}
      >
        <p style={{ color: '#666', marginBottom: 16 }}>
          Ingresa el monto de efectivo con el que abres la caja (fondo de cambio).
        </p>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Monto inicial (efectivo en caja)</div>
          <InputNumber
            size="large" prefix="$" style={{ width: 200 }}
            value={montoInicial} min={0} precision={2}
            onChange={v => setMontoInicial(v || 0)}
            autoFocus
          />
        </div>
      </Modal>

      {/* Modal cerrar turno con arqueo */}
      <Modal
        open={modalCerrar}
        title="Cierre de Turno — Arqueo de Caja"
        onCancel={() => setModalCerrar(false)}
        onOk={cerrarTurno}
        confirmLoading={loadingCerrar}
        okText="Confirmar Cierre"
        okButtonProps={{ danger: true }}
        width={600}
      >
        {turno && (
          <>
            {/* Resumen sistema */}
            <Card size="small" style={{ marginBottom: 16, background: '#f0fdfa' }}>
              <Row gutter={12}>
                <Col span={8}>
                  <Statistic title="Fondo inicial" value={turno.montoInicial} prefix="$" precision={2} />
                </Col>
                <Col span={8}>
                  <Statistic title="+ Ventas efectivo" value={turno.totalEfectivo} prefix="$" precision={2} />
                </Col>
                <Col span={8}>
                  <Statistic title="= Esperado en caja" value={(turno.montoInicial || 0) + (turno.totalEfectivo || 0)}
                    prefix="$" precision={2} valueStyle={{ color: '#0d9488', fontWeight: 700 }} />
                </Col>
              </Row>
              <Divider style={{ margin: '8px 0' }} />
              <Row gutter={12}>
                <Col span={8}>
                  <Statistic title="💳 Tarjeta" value={turno.totalTarjeta} prefix="$" precision={2} />
                </Col>
                <Col span={8}>
                  <Statistic title="🏦 Transferencia" value={turno.totalTransferencia} prefix="$" precision={2} />
                </Col>
                <Col span={8}>
                  <Statistic title="📱 QR" value={turno.totalQR} prefix="$" precision={2} />
                </Col>
              </Row>
            </Card>

            {/* Arqueo físico */}
            <Row gutter={12}>
              <Col span={12}>
                <b>Billetes</b>
                <table style={{ width: '100%', marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', fontWeight: 500, color: '#888', fontSize: 11 }}>Denominación</th>
                      <th style={{ textAlign: 'center', fontWeight: 500, color: '#888', fontSize: 11 }}>Cantidad</th>
                      <th style={{ textAlign: 'right', fontWeight: 500, color: '#888', fontSize: 11 }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BILLETES.map(b => {
                      const cant = arqueoBilletes[String(b)] || 0
                      return (
                        <tr key={b}>
                          <td style={{ padding: '3px 0', fontSize: 12 }}>${b}.00</td>
                          <td style={{ textAlign: 'center' }}>
                            <InputNumber
                              size="small" style={{ width: 60 }} min={0}
                              value={cant || undefined}
                              onChange={v => setArqueoBilletes(prev => ({ ...prev, [String(b)]: v || 0 }))}
                            />
                          </td>
                          <td style={{ textAlign: 'right', fontSize: 12, color: cant > 0 ? '#0d9488' : '#ccc' }}>
                            ${(b * cant).toFixed(2)}
                          </td>
                        </tr>
                      )
                    })}
                    <tr>
                      <td colSpan={2} style={{ fontWeight: 700, paddingTop: 6 }}>Subtotal billetes</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#0d9488', paddingTop: 6 }}>
                        ${totalContadoBilletes.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Col>

              <Col span={12}>
                <b>Monedas</b>
                <table style={{ width: '100%', marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', fontWeight: 500, color: '#888', fontSize: 11 }}>Denominación</th>
                      <th style={{ textAlign: 'center', fontWeight: 500, color: '#888', fontSize: 11 }}>Cantidad</th>
                      <th style={{ textAlign: 'right', fontWeight: 500, color: '#888', fontSize: 11 }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MONEDAS.map(m => {
                      const cant = arqueoMonedas[String(m)] || 0
                      return (
                        <tr key={m}>
                          <td style={{ padding: '3px 0', fontSize: 12 }}>${m.toFixed(2)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <InputNumber
                              size="small" style={{ width: 60 }} min={0}
                              value={cant || undefined}
                              onChange={v => setArqueoMonedas(prev => ({ ...prev, [String(m)]: v || 0 }))}
                            />
                          </td>
                          <td style={{ textAlign: 'right', fontSize: 12, color: cant > 0 ? '#0d9488' : '#ccc' }}>
                            ${(m * cant).toFixed(4).replace(/0+$/, '0').replace(/\.$/, '.00')}
                          </td>
                        </tr>
                      )
                    })}
                    <tr>
                      <td colSpan={2} style={{ fontWeight: 700, paddingTop: 6 }}>Subtotal monedas</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#0d9488', paddingTop: 6 }}>
                        ${totalContadoMonedas.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Col>
            </Row>

            <Divider />

            {/* Resultado */}
            {(() => {
              const esperado = (turno.montoInicial || 0) + (turno.totalEfectivo || 0)
              const diferencia = parseFloat((totalContado - esperado).toFixed(2))
              return (
                <Card size="small" style={{ background: diferencia === 0 ? '#f0fdfa' : diferencia > 0 ? '#fffbe6' : '#fff2f0' }}>
                  <Row justify="space-between" align="middle">
                    <Col>
                      <div style={{ fontSize: 12, color: '#888' }}>Total contado</div>
                      <div style={{ fontSize: 22, fontWeight: 700 }}>${totalContado.toFixed(2)}</div>
                    </Col>
                    <Col>
                      <div style={{ fontSize: 12, color: '#888' }}>Esperado</div>
                      <div style={{ fontSize: 18 }}>${esperado.toFixed(2)}</div>
                    </Col>
                    <Col>
                      <div style={{ fontSize: 12, color: '#888' }}>Diferencia</div>
                      <div style={{
                        fontSize: 22, fontWeight: 700,
                        color: diferencia === 0 ? '#0d9488' : diferencia > 0 ? '#fa8c16' : '#ff4d4f'
                      }}>
                        {diferencia >= 0 ? '+' : ''}{diferencia.toFixed(2)}
                        {diferencia > 0 && ' (SOBRANTE)'}
                        {diferencia < 0 && ' (FALTANTE)'}
                        {diferencia === 0 && ' ✅'}
                      </div>
                    </Col>
                  </Row>
                </Card>
              )
            })()}

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Notas de cierre</div>
              <Input.TextArea rows={2} placeholder="Observaciones del cierre..." value={notasCierre}
                onChange={e => setNotasCierre(e.target.value)} />
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
