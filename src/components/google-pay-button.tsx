'use client'

import { useEffect, useRef, useState } from 'react'
import { usePayPalScriptReducer } from '@paypal/react-paypal-js'
import { createPayPalOrder, capturePayPalOrder } from '@/app/actions/paypal-google-pay'

/* ─── Types ────────────────────────────────────────────────────────────────── */
interface GPConfig {
  apiVersion: number
  apiVersionMinor: number
  allowedPaymentMethods: unknown[]
  merchantInfo: { merchantId?: string; merchantName?: string }
  countryCode: string
}

interface PayPalGooglePay {
  config(): Promise<GPConfig>
  confirmOrder(params: { orderId: string; paymentMethodData: unknown }): Promise<{ status: string }>
}

type TxResult =
  | { transactionState: 'SUCCESS' }
  | { transactionState: 'ERROR'; error: { intent: string; message: string } }

interface GPPaymentsClient {
  isReadyToPay(req: unknown): Promise<{ result: boolean }>
  createButton(opts: {
    buttonColor?: string
    buttonType?: string
    buttonRadius?: number
    onClick: () => void
    allowedPaymentMethods: unknown[]
  }): HTMLElement
  loadPaymentData(req: unknown): void
}

type GooglePayClientConstructor = new (cfg: {
  environment: string
  paymentDataCallbacks: { onPaymentAuthorized: (d: { paymentMethodData: unknown }) => Promise<TxResult> }
}) => GPPaymentsClient

type G = {
  google?: { payments: { api: { PaymentsClient: GooglePayClientConstructor } } }
  paypal?: { Googlepay?: () => PayPalGooglePay }
}
const g = globalThis as unknown as G

function loadGPayScript(): Promise<void> {
  if (g.google?.payments?.api?.PaymentsClient) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://pay.google.com/gp/p/js/pay.js'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('gpay-load-fail'))
    document.head.appendChild(s)
  })
}

/* ─── Props ────────────────────────────────────────────────────────────────── */
interface Props {
  readonly totalUSD: string
  readonly itemNames: string
  readonly onSuccess: (orderId: string) => Promise<void>
}

/* ─── Component ─────────────────────────────────────────────────────────────── */
export function GooglePayButton({ totalUSD, itemNames, onSuccess }: Props) {
  const [{ isResolved: paypalReady }] = usePayPalScriptReducer()
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [gpayAvailable, setGpayAvailable] = useState<boolean | null>(null) // null = still checking

  // Refs — hold live values without re-triggering effects
  const totalRef    = useRef(totalUSD)
  const namesRef    = useRef(itemNames)
  const successRef  = useRef(onSuccess)
  const clientRef   = useRef<GPPaymentsClient | null>(null)
  const configRef   = useRef<GPConfig | null>(null)
  const paypalGPRef = useRef<PayPalGooglePay | null>(null)

  useEffect(() => { totalRef.current   = totalUSD  }, [totalUSD])
  useEffect(() => { namesRef.current   = itemNames }, [itemNames])
  useEffect(() => { successRef.current = onSuccess  }, [onSuccess])

  /* ── Background SDK init (does NOT gate button visibility) ── */
  useEffect(() => {
    if (!paypalReady) return
    let dead = false

    async function authorize(data: { paymentMethodData: unknown }): Promise<TxResult> {
      try {
        const gp = paypalGPRef.current
        if (!gp) throw new Error('no-gp')
        const { orderId } = await createPayPalOrder(totalRef.current, namesRef.current)
        const res = await gp.confirmOrder({ orderId, paymentMethodData: data.paymentMethodData })
        if (res.status !== 'APPROVED') throw new Error('not-approved')
        await capturePayPalOrder(orderId)
        setLoading(false)
        await successRef.current(orderId)
        return { transactionState: 'SUCCESS' }
      } catch {
        setLoading(false)
        setError('No se pudo completar el pago. Intenta de nuevo.')
        return { transactionState: 'ERROR', error: { intent: 'PAYMENT_AUTHORIZATION', message: 'error' } }
      }
    }

    void (async () => {
      try {
        await loadGPayScript()
        if (dead) return

        const GP = g.google?.payments?.api?.PaymentsClient
        if (!GP) {
          console.warn('[GPay] Google Pay JS not available')
          setGpayAvailable(false)
          return
        }

        const paypalGP = g.paypal?.Googlepay?.() ?? null
        paypalGPRef.current = paypalGP

        if (!paypalGP) {
          console.warn('[GPay] paypal.Googlepay() returned null — module not loaded or account not enabled')
        }

        const allowedPaymentMethods = paypalGP
          ? (await paypalGP.config()).allowedPaymentMethods
          : [{ type: 'CARD', parameters: { allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'], allowedCardNetworks: ['AMEX', 'DISCOVER', 'JCB', 'MASTERCARD', 'VISA'] } }]

        if (dead) return

        const client = new GP({
          environment: process.env.NEXT_PUBLIC_PAYPAL_ENV === 'live' ? 'PRODUCTION' : 'TEST',
          paymentDataCallbacks: { onPaymentAuthorized: authorize },
        })
        clientRef.current = client

        // Check if this device/browser actually supports Google Pay
        const { result } = await client.isReadyToPay({
          apiVersion: 2,
          apiVersionMinor: 0,
          allowedPaymentMethods,
        })
        setGpayAvailable(result)
        if (!result) {
          console.warn('[GPay] isReadyToPay returned false')
          return
        }

        if (paypalGP) {
          const cfg = await paypalGP.config()
          configRef.current = cfg
        }
      } catch (err) {
        console.error('[GPay] Init error:', err)
        setGpayAvailable(false)
      }
    })()

    return () => { dead = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paypalReady])

  /* ── Click handler ── */
  function handleClick() {
    setError(null)
    const client  = clientRef.current
    const paypalGP = paypalGPRef.current

    if (!paypalGP || !client) {
      setError('Google Pay no está disponible. Usa otro método de pago.')
      return
    }

    setLoading(true)
    const cfg = configRef.current
    client.loadPaymentData({
      apiVersion: cfg?.apiVersion ?? 2,
      apiVersionMinor: cfg?.apiVersionMinor ?? 0,
      allowedPaymentMethods: cfg?.allowedPaymentMethods ?? [],
      merchantInfo: cfg?.merchantInfo ?? { merchantName: 'Prêt à Porter' },
      transactionInfo: {
        totalPriceStatus: 'FINAL',
        totalPrice: totalRef.current,
        currencyCode: 'USD',
        countryCode: 'DO',
      },
      callbackIntents: ['PAYMENT_AUTHORIZATION'],
    })
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  // Hide entirely if Google Pay is confirmed not available on this device
  if (gpayAvailable === false) return null

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        aria-label="Pagar con Google Pay"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          width: '100%',
          height: 48,
          backgroundColor: loading ? '#1a1a1a' : '#000',
          borderRadius: 4,
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          transition: 'background-color 0.15s, opacity 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1c1c1c' }}
        onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#000' }}
      >
        {loading ? (
          /* Spinner */
          <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />
            <path d="M10 2 a8 8 0 0 1 8 8" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <animateTransform attributeName="transform" type="rotate" from="0 10 10" to="360 10 10" dur="0.75s" repeatCount="indefinite" />
            </path>
          </svg>
        ) : (
          <>
            {/* Official Google "G" mark — exact proportions from brand guidelines */}
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908C16.658 14.195 17.64 11.887 17.64 9.2z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>

            {/* "Pay" wordmark in Google's product sans style */}
            <span style={{
              color: '#fff',
              fontSize: 16,
              fontFamily: '"Google Sans", "Roboto", system-ui, sans-serif',
              fontWeight: 500,
              letterSpacing: 0.25,
              lineHeight: 1,
            }}>
              Pay
            </span>
          </>
        )}
      </button>

      {/* Trust micro-copy */}
      <p style={{
        marginTop: 6,
        textAlign: 'center',
        fontSize: 10,
        letterSpacing: '0.08em',
        color: '#6E625A',
        fontFamily: 'inherit',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
      }}>
        <svg width="9" height="10" viewBox="0 0 9 10" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="0.5" y="3.5" width="8" height="6" rx="1" stroke="#6E625A" strokeWidth="0.8"/>
          <path d="M2.5 3.5V2.5a2 2 0 0 1 4 0v1" stroke="#6E625A" strokeWidth="0.8" strokeLinecap="round"/>
        </svg>
        Pago seguro · cifrado SSL
      </p>

      {error && (
        <p style={{
          marginTop: 6,
          textAlign: 'center',
          fontSize: 11,
          color: '#B56F6A',
          fontFamily: 'inherit',
        }}>
          {error}
        </p>
      )}
    </div>
  )
}
