'use server'

import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

const PAYPAL_BASE =
  process.env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'

/* ─── Zod schema ─────────────────────────────────────────────────────────── */
const CartItemSchema = z.object({
  id:        z.number(),
  productId: z.string().uuid(),                       // UUID real del producto
  name:      z.string().min(1).max(200),
  price:     z.string().max(50),
  priceNum:  z.number().positive(),
  bg:        z.string().regex(/^#[0-9a-fA-F]{3,8}$/),
  size:      z.enum(['S', 'M', 'L']).optional(),      // talla seleccionada
  quantity:  z.number().int().positive().max(99),
})

const OrderSchema = z.object({
  paypalOrderId: z.string().min(1).max(100),
  customerName: z.string().min(2).max(100).trim(),
  customerPhone: z.string().min(4).max(30).trim(),
  customerEmail: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email').max(200).trim(),
  address: z.string().min(5).max(500).trim(),
  addressReference: z.string().max(500).trim().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  distanceKm: z.number().min(0).max(5000),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shippingMethod: z.enum(['pickup', 'delivery']),
  shippingZone: z.string().max(100).trim().optional(),
  shippingCostDop: z.number().min(0),
  items: z.array(CartItemSchema).min(1).max(50),
  totalDop: z.number().positive(),
  totalUsd: z.number().positive(),
})

export type SaveOrderInput = z.infer<typeof OrderSchema>

/* ─── Result type ─────────────────────────────────────────────────────────── */
export type SaveOrderResult =
  | { success: true; orderId: string }
  | { success: false; error: string }

/* ─── PayPal helpers ──────────────────────────────────────────────────────── */
async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_SECRET

  if (!clientId || !secret) {
    throw new Error('PayPal credentials not configured')
  }

  const credentials = Buffer.from(`${clientId}:${secret}`).toString('base64')

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error('Failed to authenticate with PayPal')
  }

  const data = (await res.json()) as { access_token: string }
  return data.access_token
}

async function verifyPayPalCapture(
  orderId: string,
  expectedUsd: string,
): Promise<boolean> {
  const token = await getPayPalAccessToken()

  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })

  if (!res.ok) return false

  const order = (await res.json()) as {
    status: string
    purchase_units?: Array<{
      payments?: {
        captures?: Array<{ amount: { value: string; currency_code: string } }>
      }
    }>
  }

  if (order.status !== 'COMPLETED') return false

  const captured = order.purchase_units?.[0]?.payments?.captures?.[0]
  if (!captured) return false

  if (captured.amount.currency_code !== 'USD') return false

  // Allow ±$0.02 tolerance for rounding
  const diff = Math.abs(Number.parseFloat(captured.amount.value) - Number.parseFloat(expectedUsd))
  return diff <= 0.02
}

/* ─── Server Action ───────────────────────────────────────────────────────── */
export async function saveOrder(input: SaveOrderInput): Promise<SaveOrderResult> {
  // 1. Validate all inputs server-side with Zod
  const parsed = OrderSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Datos de orden inválidos.' }
  }

  const data = parsed.data

  // 2. Verify payment server-side with PayPal API (prevents fraud)
  const totalUsdStr = data.totalUsd.toFixed(2)
  const paymentVerified = await verifyPayPalCapture(data.paypalOrderId, totalUsdStr)
  if (!paymentVerified) {
    return { success: false, error: 'No se pudo verificar el pago con PayPal.' }
  }

  // 3. Save to Supabase using service role key (server-only — bypasses RLS safely)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )

  const { data: inserted, error } = await supabase
    .from('orders')
    .insert({
      customer_name: data.customerName,
      customer_phone: data.customerPhone,
      customer_email: data.customerEmail,
      address: data.address,
      address_reference: data.addressReference ?? null,
      lat: data.lat,
      lng: data.lng,
      distance_km: Number.parseFloat(data.distanceKm.toFixed(2)),
      delivery_date: data.deliveryDate,
      shipping_method: data.shippingMethod,
      shipping_zone: data.shippingZone ?? null,
      shipping_cost_dop: data.shippingCostDop,
      items: data.items,
      total_dop: data.totalDop,
      total_usd: Number.parseFloat(totalUsdStr),
      paypal_order_id: data.paypalOrderId,
      status: 'paid',
    })
    .select('id')
    .single()

  if (error) {
    // Only log server-side — never expose DB errors to client
    console.error('[saveOrder] Supabase error:', error.message)
    return { success: false, error: 'Error al guardar el pedido. Inténtalo de nuevo.' }
  }

  // 4. Descontar stock por talla en productos
  //    Usamos la función RPC descontar_stock definida en la BD.
  //    Si falla no revertimos la orden (el pago ya está capturado),
  //    pero lo registramos para revisión manual.
  const stockItems = data.items
    .filter((i) => i.productId && i.size)
    .map((i) => ({ productId: i.productId, size: i.size, quantity: i.quantity }))

  if (stockItems.length > 0) {
    const { error: stockErr } = await supabase.rpc('descontar_stock', {
      p_items: stockItems,
    })
    if (stockErr) {
      console.error('[saveOrder] Stock decrement error:', stockErr.message)
      // No retornamos error al cliente — la orden quedó guardada y pagada
    }
  }

  return { success: true, orderId: inserted.id as string }
}
