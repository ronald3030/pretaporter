import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Leer la orden
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    return new NextResponse('Orden no encontrada', { status: 404 })
  }

  // Leer el comprobante e-CF si existe
  const { data: comprobante } = await supabase
    .from('comprobantes_ecf')
    .select('encf, estado, track_id')
    .eq('venta_id', orderId)
    .maybeSingle()

  // Leer config de la empresa
  const { data: empresa } = await supabase
    .from('configuracion_empresa')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const negocio = {
    nombre    : empresa?.nombre_comercial ?? 'Prêt à Porter',
    razon     : empresa?.razon_social     ?? 'Inversiones Mdelancer SRL',
    rnc       : empresa?.rnc              ?? '132866088',
    direccion : empresa?.direccion        ?? 'Abraham Lincoln 617, Local 25A, Plaza Castilla',
    telefono  : empresa?.telefono         ?? '+1 (829) 000-0000',
    correo    : empresa?.correo           ?? 'info@pretaporter.com',
    web       : empresa?.sitio_web        ?? 'pretaporter.com',
  }

  // Formatear datos
  const fecha       = new Date(order.created_at)
  const fechaFmt    = fecha.toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' })
  const horaFmt     = fecha.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
  const items       = (order.items ?? []) as Array<{ name: string; size?: string; quantity: number; priceNum: number; bg: string }>
  const encf        = order.encf ?? comprobante?.encf ?? null
  const ecfEstado   = order.ecf_estado ?? comprobante?.estado ?? null

  const subtotal    = items.reduce((s: number, i) => s + i.priceNum * i.quantity, 0)
  const shipping    = (order.shipping_cost_dop ?? 0) as number
  const discount    = (order.descuento_monto_dop ?? 0) as number
  const total       = order.total_dop as number

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 2 }).format(n)

  const itemsHTML = items.map((item) => `
    <tr>
      <td class="item-name">${escHtml(item.name)}${item.size ? ` <span class="size-badge">Talla ${item.size}</span>` : ''}</td>
      <td class="item-qty">${item.quantity}</td>
      <td class="item-price">${fmt(item.priceNum)}</td>
      <td class="item-total">${fmt(item.priceNum * item.quantity)}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Factura · ${negocio.nombre} · ${orderId.substring(0, 8).toUpperCase()}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --deep:    #2B2623;
      --primary: #B56F6A;
      --muted:   #6E625A;
      --border:  #E6D8CC;
      --ivory:   #F7F3EE;
      --sand:    #E9DED2;
    }

    body {
      font-family: 'Inter', sans-serif;
      background: white;
      color: var(--deep);
      font-size: 13px;
      line-height: 1.6;
    }

    .page {
      max-width: 680px;
      margin: 0 auto;
      padding: 48px 40px;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 28px;
      border-bottom: 2px solid var(--deep);
      margin-bottom: 32px;
    }
    .brand-name {
      font-family: 'Cormorant Garamond', serif;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--deep);
    }
    .brand-tagline {
      font-size: 10px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--muted);
      margin-top: 2px;
    }
    .invoice-label {
      text-align: right;
    }
    .invoice-label h2 {
      font-family: 'Cormorant Garamond', serif;
      font-size: 22px;
      font-weight: 600;
      color: var(--primary);
    }
    .invoice-label .order-id {
      font-size: 11px;
      color: var(--muted);
      letter-spacing: 0.05em;
      margin-top: 2px;
    }

    /* Info grid */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 32px;
    }
    .info-box h3 {
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 8px;
    }
    .info-box p {
      font-size: 12.5px;
      color: var(--deep);
      line-height: 1.7;
    }
    .info-box .label { color: var(--muted); font-size: 11px; }

    /* NCF badge */
    .ncf-banner {
      background: var(--ivory);
      border: 1px solid var(--border);
      border-left: 4px solid var(--primary);
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .ncf-banner .ncf-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .ncf-banner .ncf-value {
      font-family: 'Cormorant Garamond', serif;
      font-size: 20px;
      font-weight: 700;
      color: var(--deep);
      letter-spacing: 0.05em;
    }
    .ncf-banner .ncf-estado {
      font-size: 11px;
      font-weight: 500;
      color: #15803d;
      background: #dcfce7;
      border: 1px solid #86efac;
      border-radius: 20px;
      padding: 2px 10px;
    }

    /* Items table */
    .section-title {
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    thead th {
      background: var(--deep);
      color: white;
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 9px 12px;
      text-align: left;
    }
    thead th:last-child,
    thead th:nth-child(2),
    thead th:nth-child(3) { text-align: right; }

    tbody tr { border-bottom: 1px solid var(--border); }
    tbody tr:last-child { border-bottom: none; }
    tbody td { padding: 10px 12px; }

    .item-name { color: var(--deep); font-weight: 500; }
    .size-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 400;
      color: var(--muted);
      background: var(--sand);
      border-radius: 4px;
      padding: 1px 6px;
      margin-left: 6px;
    }
    .item-qty, .item-price, .item-total { text-align: right; color: var(--muted); }
    .item-total { color: var(--deep); font-weight: 500; }

    /* Totals */
    .totals-wrap {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 28px;
    }
    .totals-box {
      width: 260px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      font-size: 12.5px;
      color: var(--muted);
    }
    .totals-row.discount { color: #15803d; }
    .totals-divider { border: none; border-top: 1px solid var(--border); margin: 8px 0; }
    .totals-row.total {
      font-weight: 600;
      font-size: 16px;
      color: var(--deep);
      padding-top: 8px;
    }

    /* Footer */
    .footer-divider {
      border: none;
      border-top: 1px solid var(--border);
      margin: 24px 0 16px;
    }
    .footer-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      font-size: 11px;
      color: var(--muted);
      line-height: 1.7;
    }
    .rst-note {
      margin-top: 20px;
      padding: 12px 16px;
      background: var(--ivory);
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 10.5px;
      color: var(--muted);
      text-align: center;
    }
    .rst-note strong { color: var(--deep); }

    /* Print */
    @media print {
      body { background: white; }
      .page { padding: 24px 28px; }
      .no-print { display: none !important; }
    }

    /* Download button (no se imprime) */
    .download-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--deep);
      padding: 14px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      z-index: 100;
    }
    .download-bar span { color: #c8b8b0; font-size: 12px; }
    .btn-print {
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 10px 22px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      letter-spacing: 0.03em;
      font-family: 'Inter', sans-serif;
    }
    .btn-print:hover { opacity: 0.9; }
  </style>
</head>
<body>

<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div>
      <div class="brand-name">${escHtml(negocio.nombre)}</div>
      <div class="brand-tagline">${escHtml(negocio.razon)}</div>
    </div>
    <div class="invoice-label">
      <h2>Factura</h2>
      <div class="order-id"># ${orderId.substring(0, 8).toUpperCase()}</div>
      <div class="order-id">${fechaFmt} · ${horaFmt}</div>
    </div>
  </div>

  <!-- INFO GRID -->
  <div class="info-grid">
    <div class="info-box">
      <h3>Emisor</h3>
      <p>
        <strong>${escHtml(negocio.razon)}</strong><br/>
        RNC: ${escHtml(negocio.rnc)}<br/>
        ${escHtml(negocio.direccion)}<br/>
        ${escHtml(negocio.telefono)}<br/>
        ${escHtml(negocio.correo)}
      </p>
    </div>
    <div class="info-box">
      <h3>Cliente</h3>
      <p>
        <strong>${escHtml(order.customer_name ?? '')}</strong><br/>
        ${order.customer_phone ? escHtml(order.customer_phone) + '<br/>' : ''}
        ${order.customer_email ? escHtml(order.customer_email) + '<br/>' : ''}
        <span class="label">Entrega: ${order.delivery_date ?? ''}</span><br/>
        <span class="label">${escHtml(order.address ?? '')}</span>
        ${order.address_reference ? `<br/><span class="label">${escHtml(order.address_reference)}</span>` : ''}
      </p>
    </div>
  </div>

  <!-- NCF BANNER -->
  ${encf ? `
  <div class="ncf-banner">
    <div>
      <div class="ncf-label">Comprobante Fiscal Electrónico</div>
      <div class="ncf-value">${escHtml(encf)}</div>
    </div>
    ${ecfEstado ? `<div class="ncf-estado">${escHtml(ecfEstado)}</div>` : ''}
  </div>` : ''}

  <!-- ITEMS -->
  <div class="section-title">Detalle de productos</div>
  <table>
    <thead>
      <tr>
        <th>Producto</th>
        <th>Cant.</th>
        <th>P. Unit.</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
    </tbody>
  </table>

  <!-- TOTALES -->
  <div class="totals-wrap">
    <div class="totals-box">
      <div class="totals-row"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
      ${shipping > 0 ? `<div class="totals-row"><span>Envío</span><span>${fmt(shipping)}</span></div>` : '<div class="totals-row"><span>Envío</span><span>—</span></div>'}
      ${discount > 0 ? `<div class="totals-row discount"><span>Descuento</span><span>-${fmt(discount)}</span></div>` : ''}
      <hr class="totals-divider"/>
      <div class="totals-row total"><span>Total</span><span>${fmt(total)}</span></div>
      ${order.total_usd ? `<div class="totals-row"><span style="font-size:11px">≈ USD</span><span style="font-size:11px">$${Number(order.total_usd).toFixed(2)}</span></div>` : ''}
    </div>
  </div>

  <!-- FOOTER -->
  <hr class="footer-divider"/>
  <div class="footer-grid">
    <div>
      <strong>Método de pago</strong><br/>PayPal
    </div>
    <div style="text-align:right">
      <strong>${escHtml(negocio.web)}</strong><br/>
      ${escHtml(negocio.telefono)}
    </div>
  </div>

  <div class="rst-note">
    <strong>Régimen Simplificado de Tributación (RST)</strong> ·
    ITBIS no aplica · Precio final al consumidor
    ${encf ? `· e-NCF: ${escHtml(encf)}` : ''}
  </div>

</div>

<!-- BARRA DE DESCARGA (no se imprime) -->
<div class="download-bar no-print">
  <span>Tu factura está lista · ${negocio.nombre}</span>
  <button class="btn-print" onclick="window.print()">
    ⬇ Guardar como PDF
  </button>
</div>

<script>
  // Cuando el usuario imprime, el diálogo se abre automáticamente
  // Puedes quitarlo si prefieres que abran el diálogo manualmente
</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function escHtml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
