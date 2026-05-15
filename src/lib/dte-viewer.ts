/**
 * dte-viewer.ts — Generadores de HTML para visualización de DTE.
 * Uso exclusivo cliente (browser). Abre una nueva pestaña con la factura.
 * No genera PDF — el usuario puede usar Ctrl+P > "Guardar como PDF".
 */

export interface DTEJsonViewer {
  identificacion: {
    tipoDte: string
    codigoGeneracion: string
    numeroControl: string
    fecEmi: string
    horEmi: string
  }
  emisor: {
    nombre: string
    direccion?: string
    telefono?: string
    email?: string
    codEstableMH?: string
    codPuntoVentaMH?: string
  }
  receptor: {
    nombre?: string
    tipoDocumento?: string | null
    numDocumento?: string | null
    nrc?: string | null
  }
  cuerpoDocumento: Array<{
    numItem: number
    descripcion: string
    barberoNombre: string
    cantidad: number
    precioUni: number
    montoDescu: number
    ventaExenta: number
    ventaGravada: number
    ivaItem: number
  }>
  resumen: {
    totalExenta: number
    totalGravada: number
    totalDescu: number
    totalIva: number
    totalPagar: number
    totalLetras: string
    pagos: Array<{ codigo: string; montoPago: number; vuelto?: number; referencia?: string }>
  }
  simulada: boolean
}

const TIPO_LABEL: Record<string, string> = {
  '01': 'FACTURA',
  '03': 'CRÉDITO FISCAL',
  '05': 'NOTA DE CRÉDITO',
}

const METODO_LABEL: Record<string, string> = {
  '01': 'Efectivo',
  '02': 'Tarjeta',
  '03': 'Transferencia',
  '04': 'QR / Pago Electrónico',
}

const fmt = (n: number) => `$${Number(n || 0).toFixed(2)}`

// ─── Abrir en nueva pestaña ───────────────────────────────────────────────────

export function abrirFacturaCompleta(dte: DTEJsonViewer) {
  const html = generarHtmlFactura(dte)
  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close() }
}

export function abrirTicket(dte: DTEJsonViewer) {
  const html = generarHtmlTicket(dte)
  const win = window.open('', '_blank', 'width=420,height=750,scrollbars=yes')
  if (win) { win.document.write(html); win.document.close() }
}

// ─── Factura completa (A4) ────────────────────────────────────────────────────

function generarHtmlFactura(dte: DTEJsonViewer): string {
  const { identificacion, emisor, receptor, cuerpoDocumento, resumen, simulada } = dte
  const tipoLabel = TIPO_LABEL[identificacion.tipoDte] || identificacion.tipoDte

  const itemsHtml = cuerpoDocumento.map(item => `
    <tr>
      <td style="text-align:center">${item.numItem}</td>
      <td>
        <strong>${item.descripcion}</strong>
        <br><span style="color:#666;font-size:10px">✂ ${item.barberoNombre}</span>
      </td>
      <td style="text-align:center">${item.cantidad}</td>
      <td style="text-align:right">${fmt(item.precioUni)}</td>
      <td style="text-align:right">${item.montoDescu > 0 ? fmt(item.montoDescu) : '—'}</td>
      <td style="text-align:right;font-weight:600">
        ${fmt(item.ventaExenta > 0 ? item.ventaExenta : item.ventaGravada)}
      </td>
    </tr>`).join('')

  const pagosHtml = resumen.pagos.map(p => `
    <tr>
      <td>${METODO_LABEL[p.codigo] || p.codigo}</td>
      <td style="text-align:right">${fmt(p.montoPago)}</td>
      <td style="color:#777;font-size:10px">${p.vuelto ? `Vuelto: ${fmt(p.vuelto)}` : ''}</td>
      <td style="color:#777;font-size:10px">${p.referencia || ''}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${tipoLabel} — ${identificacion.numeroControl || identificacion.codigoGeneracion}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#222;background:#e5e7eb}
    @media print{
      body{background:#fff}
      .no-print{display:none!important}
      @page{size:A4;margin:10mm}
    }
    .toolbar{background:#1f2937;color:#fff;padding:10px 20px;display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:10}
    .toolbar span{flex:1;font-size:13px;font-weight:600}
    .btn{padding:7px 18px;border:none;border-radius:6px;font-size:13px;cursor:pointer;font-weight:600}
    .btn-print{background:#0d9488;color:#fff}
    .btn-close{background:#6b7280;color:#fff}
    .page{width:210mm;min-height:297mm;background:#fff;margin:20px auto;padding:14mm;box-shadow:0 4px 16px rgba(0,0,0,0.15)}
    /* Watermark */
    .simulada-banner{background:#fef3c7;border:2px dashed #d97706;border-radius:6px;padding:8px 14px;text-align:center;font-weight:700;color:#92400e;font-size:12px;margin-bottom:14px;letter-spacing:.5px}
    /* Header */
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;padding-bottom:14px;border-bottom:3px solid #0d9488}
    .emisor-nombre{font-size:20px;font-weight:800;color:#0d9488;margin-bottom:4px}
    .emisor-datos{font-size:11px;color:#555;line-height:1.7}
    .dte-box{border:2px solid #0d9488;border-radius:8px;padding:12px 16px;text-align:right;min-width:210px}
    .dte-tipo{font-size:14px;font-weight:800;color:#0d9488;letter-spacing:.5px}
    .dte-num{font-size:9px;color:#888;word-break:break-all;margin-top:3px;font-family:monospace}
    .dte-fecha{font-size:12px;font-weight:600;margin-top:6px;color:#333}
    /* Receptor */
    .receptor{background:#f8fafc;border-left:4px solid #0d9488;border-radius:0 6px 6px 0;padding:10px 14px;margin-bottom:16px}
    .rfield{display:inline-block;margin-right:28px;margin-bottom:4px}
    .rlabel{font-size:9px;color:#888;text-transform:uppercase;font-weight:700;letter-spacing:.5px}
    .rvalue{font-size:12px;font-weight:600;color:#111}
    /* Tabla */
    table{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:11px}
    th{background:#0d9488;color:#fff;padding:7px 8px;text-align:left;font-size:10px;letter-spacing:.3px}
    td{padding:7px 8px;border-bottom:1px solid #f0f0f0;vertical-align:top}
    tr:nth-child(even) td{background:#fafafa}
    /* Totales */
    .totales{display:flex;justify-content:flex-end;margin-bottom:14px}
    .totales-inner{width:250px}
    .trow{display:flex;justify-content:space-between;padding:4px 0;font-size:11px;border-bottom:1px solid #f0f0f0}
    .trow:last-child{border-bottom:none}
    .trow.final{border-top:2px solid #0d9488;margin-top:6px;padding-top:8px;font-size:15px;font-weight:800;color:#0d9488}
    /* Letras */
    .letras{background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:8px 12px;font-size:10px;color:#555;font-style:italic;margin-bottom:14px}
    /* Pagos */
    .pagos-title{font-size:10px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
    .pagos-tabla th{background:#6b7280}
    /* Footer */
    .footer{margin-top:24px;padding-top:10px;border-top:1px dashed #d1d5db;text-align:center;color:#9ca3af;font-size:9px;line-height:1.8}
    .footer .codigo{font-family:monospace;font-size:8px;word-break:break-all;margin-top:3px}
  </style>
</head>
<body>
  <div class="toolbar no-print">
    <span>📄 ${tipoLabel} — ${identificacion.numeroControl || '—'}</span>
    <button class="btn btn-print" onclick="window.print()">🖨️ Imprimir / PDF</button>
    <button class="btn btn-close" onclick="window.close()">✕ Cerrar</button>
  </div>

  <div class="page">
    ${simulada ? `<div class="simulada-banner">⚠️ DOCUMENTO SIMULADO — Sin validez fiscal ante el Ministerio de Hacienda</div>` : ''}

    <div class="header">
      <div>
        <div class="emisor-nombre">${emisor.nombre}</div>
        <div class="emisor-datos">
          ${emisor.direccion ? `📍 ${emisor.direccion}<br>` : ''}
          ${emisor.telefono ? `📞 ${emisor.telefono}` : ''}
          ${emisor.telefono && emisor.email ? ' &nbsp;|&nbsp; ' : ''}
          ${emisor.email ? `✉️ ${emisor.email}` : ''}
        </div>
      </div>
      <div class="dte-box">
        <div class="dte-tipo">${tipoLabel}</div>
        <div class="dte-num">${identificacion.numeroControl || '—'}</div>
        <div class="dte-fecha">${identificacion.fecEmi}<br><span style="font-size:11px;color:#666">${identificacion.horEmi}</span></div>
        ${emisor.codEstableMH ? `<div class="dte-num" style="margin-top:4px">Estab: ${emisor.codEstableMH} | PV: ${emisor.codPuntoVentaMH}</div>` : ''}
      </div>
    </div>

    <div class="receptor">
      <div class="rfield"><div class="rlabel">Cliente</div><div class="rvalue">${receptor.nombre || 'Consumidor Final'}</div></div>
      ${receptor.numDocumento ? `<div class="rfield"><div class="rlabel">${receptor.tipoDocumento === '36' ? 'NIT' : 'DUI'}</div><div class="rvalue">${receptor.numDocumento}</div></div>` : ''}
      ${receptor.nrc ? `<div class="rfield"><div class="rlabel">NRC</div><div class="rvalue">${receptor.nrc}</div></div>` : ''}
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:30px;text-align:center">#</th>
          <th>Servicio / Descripción</th>
          <th style="width:45px;text-align:center">Cant.</th>
          <th style="width:75px;text-align:right">P. Unit.</th>
          <th style="width:70px;text-align:right">Descu.</th>
          <th style="width:80px;text-align:right">Subtotal</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>

    <div class="totales">
      <div class="totales-inner">
        ${resumen.totalExenta > 0 ? `<div class="trow"><span>Ventas exentas</span><span>${fmt(resumen.totalExenta)}</span></div>` : ''}
        ${resumen.totalGravada > 0 ? `<div class="trow"><span>Ventas gravadas</span><span>${fmt(resumen.totalGravada)}</span></div>` : ''}
        ${resumen.totalDescu > 0 ? `<div class="trow"><span>(-) Descuentos</span><span>${fmt(resumen.totalDescu)}</span></div>` : ''}
        ${resumen.totalIva > 0 ? `<div class="trow"><span>IVA (13%)</span><span>${fmt(resumen.totalIva)}</span></div>` : ''}
        <div class="trow final"><span>TOTAL A PAGAR</span><span>${fmt(resumen.totalPagar)}</span></div>
      </div>
    </div>

    <div class="letras">Son: <em>${resumen.totalLetras}</em></div>

    <div class="pagos-title">Forma de pago</div>
    <table class="pagos-tabla" style="width:auto;min-width:280px">
      <thead><tr><th>Método</th><th style="text-align:right">Monto</th><th>Vuelto</th><th>Referencia</th></tr></thead>
      <tbody>${pagosHtml}</tbody>
    </table>

    <div class="footer">
      <div>Gracias por su visita — <strong>${emisor.nombre}</strong></div>
      <div class="codigo">Código de generación: ${identificacion.codigoGeneracion}</div>
    </div>
  </div>
</body>
</html>`
}

// ─── Factura Ticket (80mm térmica) ───────────────────────────────────────────

function generarHtmlTicket(dte: DTEJsonViewer): string {
  const { identificacion, emisor, receptor, cuerpoDocumento, resumen, simulada } = dte
  const tipoLabel = TIPO_LABEL[identificacion.tipoDte] || identificacion.tipoDte

  const itemsHtml = cuerpoDocumento.map(item => `
    <div class="item">
      <div class="item-nom">${item.descripcion}</div>
      <div class="item-barb">✂ ${item.barberoNombre}</div>
      <div class="item-sub">
        <span>${item.cantidad > 1 ? `${item.cantidad} x ${fmt(item.precioUni)}` : ''}</span>
        <span>${fmt(item.ventaExenta > 0 ? item.ventaExenta : item.ventaGravada)}</span>
      </div>
      ${item.montoDescu > 0 ? `<div class="item-sub muted"><span>Descuento</span><span>-${fmt(item.montoDescu)}</span></div>` : ''}
    </div>`).join('<div class="sep-dotted"></div>')

  const pagosHtml = resumen.pagos.map(p => `
    <div class="fila"><span>${METODO_LABEL[p.codigo] || p.codigo}</span><span>${fmt(p.montoPago)}</span></div>
    ${p.vuelto ? `<div class="fila muted"><span>  Vuelto entregado</span><span>${fmt(p.vuelto)}</span></div>` : ''}
    ${p.referencia ? `<div class="muted" style="font-size:9px;text-align:right">Ref: ${p.referencia}</div>` : ''}`).join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Ticket — ${identificacion.numeroControl || identificacion.codigoGeneracion}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Courier New',Courier,monospace;font-size:12px;color:#111;background:#d1d5db}
    @media print{
      body{background:#fff;color:#000!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .no-print{display:none!important}
      @page{size:80mm auto;margin:3mm 2mm}
    }
    .toolbar{background:#1f2937;color:#fff;padding:8px 12px;display:flex;align-items:center;gap:8px;position:sticky;top:0}
    .toolbar span{flex:1;font-size:12px}
    .btn{padding:6px 14px;border:none;border-radius:5px;font-size:12px;cursor:pointer;font-weight:600}
    .btn-print{background:#0d9488;color:#fff}
    .btn-close{background:#6b7280;color:#fff}
    .ticket{width:302px;background:#fff;margin:16px auto;padding:12px 10px;box-shadow:0 3px 10px rgba(0,0,0,0.2)}
    .simulada{text-align:center;font-size:9px;font-weight:700;color:#92400e;background:#fef3c7;border:1px dashed #d97706;padding:4px 6px;margin-bottom:8px}
    .c{text-align:center}
    .bold{font-weight:700}
    .muted{color:#777;font-size:10px}
    .sep{border:none;border-top:1px solid #ccc;margin:8px 0}
    .sep-dotted{border:none;border-top:1px dashed #ddd;margin:5px 0}
    /* Header */
    .local-nom{font-size:15px;font-weight:800;text-align:center;color:#0d9488;letter-spacing:.5px}
    .tipo-dte{font-size:12px;font-weight:700;text-align:center;margin:4px 0}
    .info{display:flex;justify-content:space-between;font-size:10px;margin:2px 0}
    /* Items */
    .item{margin:5px 0}
    .item-nom{font-weight:700;font-size:11px}
    .item-barb{font-size:9px;color:#888;margin-bottom:2px}
    .item-sub{display:flex;justify-content:space-between;font-size:11px}
    /* Totales */
    .fila{display:flex;justify-content:space-between;margin:2px 0;font-size:11px}
    .total-final{display:flex;justify-content:space-between;font-size:14px;font-weight:800;margin-top:4px;padding-top:4px;border-top:2px solid #0d9488}
    /* Footer */
    .codigo{font-size:7px;color:#bbb;text-align:center;word-break:break-all;margin-top:6px;font-family:monospace}
  </style>
</head>
<body>
  <div class="toolbar no-print">
    <span>🧾 Ticket — ${identificacion.numeroControl || '—'}</span>
    <button class="btn btn-print" onclick="window.print()">🖨️ Imprimir</button>
    <button class="btn btn-close" onclick="window.close()">✕</button>
  </div>

  <div class="ticket">
    ${simulada ? `<div class="simulada">⚠ SIMULADO — Sin validez fiscal</div>` : ''}

    <div class="local-nom">${emisor.nombre}</div>
    ${emisor.direccion ? `<div class="c muted">${emisor.direccion}</div>` : ''}
    ${emisor.telefono ? `<div class="c muted">Tel: ${emisor.telefono}</div>` : ''}

    <hr class="sep">

    <div class="tipo-dte">${tipoLabel}</div>
    <div class="info"><span>No. Control:</span><span>${identificacion.numeroControl || '—'}</span></div>
    <div class="info"><span>Fecha:</span><span>${identificacion.fecEmi} ${identificacion.horEmi.slice(0,5)}</span></div>
    <div class="info"><span>Cliente:</span><span>${receptor.nombre || 'Consumidor Final'}</span></div>
    ${receptor.numDocumento ? `<div class="info"><span>${receptor.tipoDocumento === '36' ? 'NIT' : 'DUI'}:</span><span>${receptor.numDocumento}</span></div>` : ''}

    <hr class="sep">

    ${itemsHtml}

    <hr class="sep">

    ${resumen.totalExenta > 0 ? `<div class="fila muted"><span>Exento</span><span>${fmt(resumen.totalExenta)}</span></div>` : ''}
    ${resumen.totalGravada > 0 ? `<div class="fila muted"><span>Gravado</span><span>${fmt(resumen.totalGravada)}</span></div>` : ''}
    ${resumen.totalDescu > 0 ? `<div class="fila muted"><span>(-) Descuento</span><span>${fmt(resumen.totalDescu)}</span></div>` : ''}
    ${resumen.totalIva > 0 ? `<div class="fila muted"><span>IVA 13%</span><span>${fmt(resumen.totalIva)}</span></div>` : ''}
    <div class="total-final"><span>TOTAL</span><span>${fmt(resumen.totalPagar)}</span></div>

    <hr class="sep">

    <div class="muted bold" style="margin-bottom:4px">FORMA DE PAGO</div>
    ${pagosHtml}

    <hr class="sep">

    <div class="c muted">Son: ${resumen.totalLetras}</div>
    <div class="c bold" style="margin-top:10px;font-size:13px">¡Gracias por su visita!</div>

    <div class="codigo">${identificacion.codigoGeneracion}</div>
  </div>
</body>
</html>`
}
