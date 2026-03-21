import { randomUUID } from 'crypto'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface DTEItem {
  numItem: number
  descripcion: string
  barberoNombre: string
  cantidad: number
  precioUni: number
  montoDescu: number
  esGravado: boolean // true → ventaGravada; false → ventaExenta
}

export interface DTEEmisor {
  nombre: string
  nombreComercial?: string
  nit?: string
  nrc?: string
  codActividad?: string
  descActividad?: string
  direccion?: string
  telefono?: string
  email?: string
}

export interface DTEReceptor {
  nombre: string
  tipoDocumento?: string | null // '13'=DUI, '36'=NIT
  numDocumento?: string | null
  nrc?: string | null
  descActividad?: string | null
  correo?: string | null
}

export interface DTEPago {
  codigo: string  // '01'=Efectivo,'02'=Tarjeta,'03'=Transferencia,'04'=QR
  montoPago: number
  vuelto?: number
  referencia?: string
}

export interface BuildDTEInput {
  tipoDte: '01' | '03' | '05'
  numeroControl: string
  fecEmi: string    // YYYY-MM-DD
  horEmi: string    // HH:MM:SS
  emisor: DTEEmisor
  receptor: DTEReceptor
  items: DTEItem[]
  pagos: DTEPago[]
  esContribuyente: boolean // true → aplica IVA
  simulada?: boolean
  ventaOriginal?: { numeroControl: string; codigoGeneracion: string; fecEmi: string } // para NC
}

export interface DTEJson {
  identificacion: {
    version: number
    tipoDte: string
    codigoGeneracion: string
    numeroControl: string
    fecEmi: string
    horEmi: string
    tipoMoneda: string
  }
  emisor: DTEEmisor & { codEstableMH: string; codPuntoVentaMH: string }
  receptor: DTEReceptor
  cuerpoDocumento: Array<DTEItem & {
    ventaNoSuj: number
    ventaExenta: number
    ventaGravada: number
    ivaItem: number
  }>
  resumen: {
    totalNoSuj: number
    totalExenta: number
    totalGravada: number
    subTotalVentas: number
    totalDescu: number
    subTotal: number
    totalIva: number
    totalPagar: number
    totalLetras: string
    condicionOperacion: number
    pagos: DTEPago[]
    tributos: Array<{ codigo: string; descripcion: string; valor: number }>
  }
  simulada: boolean
  documentoRelacionado?: object
}

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildDTE(input: BuildDTEInput): DTEJson {
  const { tipoDte, numeroControl, fecEmi, horEmi, emisor, receptor, items, pagos, esContribuyente, simulada } = input

  const IVA_RATE = 0.13
  const codigoGeneracion = randomUUID().toUpperCase()

  // Calcular totales por ítem
  let totalExenta = 0
  let totalGravada = 0
  let totalDescu = 0

  const cuerpo = items.map((item) => {
    const bruto = item.precioUni * item.cantidad
    const descu = item.montoDescu || 0
    const neto = bruto - descu
    totalDescu += descu

    let ventaExenta = 0
    let ventaGravada = 0
    let ivaItem = 0

    if (esContribuyente && item.esGravado) {
      // Para factura CF: IVA está incluido en el precio
      if (tipoDte === '01') {
        ventaGravada = parseFloat((neto / 1.13).toFixed(2))
        ivaItem = parseFloat((ventaGravada * IVA_RATE).toFixed(2))
      }
      // Para CCF: IVA se suma al precio
      else if (tipoDte === '03') {
        ventaGravada = parseFloat(neto.toFixed(2))
        ivaItem = parseFloat((ventaGravada * IVA_RATE).toFixed(2))
      }
      totalGravada += ventaGravada
    } else {
      ventaExenta = parseFloat(neto.toFixed(2))
      totalExenta += ventaExenta
    }

    return {
      ...item,
      montoDescu: parseFloat(descu.toFixed(2)),
      ventaNoSuj: 0,
      ventaExenta: parseFloat(ventaExenta.toFixed(2)),
      ventaGravada: parseFloat(ventaGravada.toFixed(2)),
      ivaItem: parseFloat(ivaItem.toFixed(2)),
    }
  })

  totalExenta = parseFloat(totalExenta.toFixed(2))
  totalGravada = parseFloat(totalGravada.toFixed(2))
  totalDescu = parseFloat(totalDescu.toFixed(2))

  const subTotalVentas = parseFloat((totalExenta + totalGravada).toFixed(2))
  const subTotal = parseFloat((subTotalVentas - totalDescu).toFixed(2))
  const totalIva = esContribuyente ? parseFloat((totalGravada * IVA_RATE).toFixed(2)) : 0
  const totalPagar = parseFloat((subTotal + (tipoDte === '03' ? totalIva : 0)).toFixed(2))

  const tributos = esContribuyente && totalGravada > 0
    ? [{ codigo: '20', descripcion: 'IVA 13%', valor: totalIva }]
    : []

  return {
    identificacion: {
      version: 1,
      tipoDte,
      codigoGeneracion,
      numeroControl,
      fecEmi,
      horEmi,
      tipoMoneda: 'USD',
    },
    emisor: {
      ...emisor,
      codEstableMH: '0001',
      codPuntoVentaMH: '0001',
    },
    receptor: {
      nombre: receptor.nombre || 'Consumidor Final',
      tipoDocumento: receptor.tipoDocumento || null,
      numDocumento: receptor.numDocumento || null,
      nrc: receptor.nrc || null,
      descActividad: receptor.descActividad || null,
      correo: receptor.correo || null,
    },
    cuerpoDocumento: cuerpo,
    resumen: {
      totalNoSuj: 0,
      totalExenta,
      totalGravada,
      subTotalVentas,
      totalDescu,
      subTotal,
      totalIva,
      totalPagar,
      totalLetras: numberToWords(totalPagar),
      condicionOperacion: 1, // contado
      pagos: pagos.map(p => ({ ...p, montoPago: parseFloat(p.montoPago.toFixed(2)) })),
      tributos,
    },
    simulada: simulada !== false,
    ...(input.ventaOriginal ? {
      documentoRelacionado: {
        tipoDocumento: tipoDte,
        numeroDocumento: input.ventaOriginal.numeroControl,
        codigoGeneracion: input.ventaOriginal.codigoGeneracion,
        fechaEmision: input.ventaOriginal.fecEmi,
      }
    } : {}),
  }
}

// ─── Guardar JSON en disco ────────────────────────────────────────────────────

import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

export function saveDTEJson(dte: DTEJson): void {
  try {
    const dir = join(process.cwd(), 'json_dte')
    mkdirSync(dir, { recursive: true })
    const filePath = join(dir, `${dte.identificacion.codigoGeneracion}.json`)
    writeFileSync(filePath, JSON.stringify(dte, null, 2), 'utf-8')
  } catch (e) {
    console.error('[DTE] Error guardando JSON:', e)
  }
}

// ─── Números a letras (USD) ───────────────────────────────────────────────────

function numberToWords(amount: number): string {
  const units = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
    'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE']
  const tens = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
  const hundreds = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
    'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS']

  function toWords(n: number): string {
    if (n === 0) return 'CERO'
    if (n === 100) return 'CIEN'
    if (n < 20) return units[n]
    if (n < 100) {
      const t = Math.floor(n / 10)
      const u = n % 10
      return u === 0 ? tens[t] : tens[t] + ' Y ' + units[u]
    }
    const h = Math.floor(n / 100)
    const rest = n % 100
    return hundreds[h] + (rest > 0 ? ' ' + toWords(rest) : '')
  }

  const cents = Math.round((amount % 1) * 100)
  const integer = Math.floor(amount)
  return `${toWords(integer)} DÓLARES CON ${String(cents).padStart(2, '0')}/100`
}
