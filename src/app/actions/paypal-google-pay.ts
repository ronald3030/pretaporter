'use server'

const PAYPAL_BASE =
  process.env.NEXT_PUBLIC_PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'

async function getAccessToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_SECRET
  if (!clientId || !secret) throw new Error('PayPal credentials not configured')

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
  if (!res.ok) throw new Error('Failed to get PayPal access token')
  const data = (await res.json()) as { access_token: string }
  return data.access_token
}

/**
 * Creates a PayPal order and returns the orderId.
 * Called from the client before Google Pay completes payment authorization.
 */
export async function createPayPalOrder(
  totalUsd: string,
  description: string,
): Promise<{ orderId: string }> {
  const token = await getAccessToken()
  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: { currency_code: 'USD', value: totalUsd },
          description: `Prêt à Porter — ${description}`,
        },
      ],
    }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Failed to create PayPal order')
  const data = (await res.json()) as { id: string }
  return { orderId: data.id }
}

/**
 * Captures an APPROVED PayPal order (after Google Pay authorization).
 * Must be called server-side to keep credentials secure.
 */
export async function capturePayPalOrder(orderId: string): Promise<void> {
  const token = await getAccessToken()
  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Failed to capture PayPal order')
}
