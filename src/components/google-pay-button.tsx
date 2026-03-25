'use client'

import { useEffect, useRef, useState } from 'react'
import { usePayPalScriptReducer } from '@paypal/react-paypal-js'
import { createPayPalOrder, capturePayPalOrder } from '@/app/actions/paypal-google-pay'

/* ─── Minimal types for PayPal Googlepay() + Google Pay JS API ──────────── */
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
  createButton(opts: { onClick: () => void }): HTMLElement
  loadPaymentData(req: unknown): void
}

type GooglePayClientConstructor = new (cfg: {
  environment: string
  paymentDataCallbacks: {
    onPaymentAuthorized: (data: { paymentMethodData: unknown }) => Promise<TxResult>
  }
}) => GPPaymentsClient

// Typed accessor for the Google Pay JS SDK on globalThis (avoids conflict with @types/google.maps)
type GlobalWithGooglePay = {
  google?: { payments: { api: { PaymentsClient: GooglePayClientConstructor } } }
}
const gThis = globalThis as unknown as GlobalWithGooglePay

/* ─── Helper: load Google Pay JS SDK once (idempotent) ──────────────────── */
function loadGooglePayScript(): Promise<void> {
  if (gThis.google?.payments?.api?.PaymentsClient) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://pay.google.com/gp/p/js/pay.js'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load Google Pay SDK'))
    document.head.appendChild(s)
  })
}

/* ─── Props ───────────────────────────────────────────────────────────────── */
interface Props {
  readonly totalUSD: string
  readonly itemNames: string
  readonly onSuccess: (orderId: string) => Promise<void>
}

/**
 * Google Pay button powered by the PayPal JS SDK.
 * Renders only when Google Pay is available on the user's device/browser.
 *
 * Payment flow:
 *  1. createPayPalOrder  → orderId  (server action)
 *  2. paypal.Googlepay().confirmOrder() → APPROVED  (PayPal processes Google Pay token)
 *  3. capturePayPalOrder(orderId)   → COMPLETED  (server action)
 *  4. onSuccess(orderId) → saves order to Supabase via existing saveOrder action
 */
export function GooglePayButton({ totalUSD, itemNames, onSuccess }: Props) {
  const [{ isResolved: paypalReady }] = usePayPalScriptReducer()
  const containerRef = useRef<HTMLDivElement>(null)
  const [supported, setSupported] = useState<boolean | null>(null)

  // Refs keep callbacks current without re-running the initialization effect
  const totalUSDRef = useRef(totalUSD)
  const itemNamesRef = useRef(itemNames)
  const onSuccessRef = useRef(onSuccess)
  useEffect(() => { totalUSDRef.current = totalUSD }, [totalUSD])
  useEffect(() => { itemNamesRef.current = itemNames }, [itemNames])
  useEffect(() => { onSuccessRef.current = onSuccess }, [onSuccess])

  useEffect(() => {
    if (!paypalReady) return
    let cancelled = false

    async function onPaymentAuthorized(data: { paymentMethodData: unknown }): Promise<TxResult> {
      try {
        const { orderId } = await createPayPalOrder(totalUSDRef.current, itemNamesRef.current)
      const paypalSDK = globalThis as unknown as { paypal?: { Googlepay?: () => PayPalGooglePay } }
      const paypalGP = paypalSDK.paypal?.Googlepay?.()
        if (!paypalGP) throw new Error('PayPal Googlepay unavailable')
        const result = await paypalGP.confirmOrder({ orderId, paymentMethodData: data.paymentMethodData })
        if (result.status !== 'APPROVED') {
          return { transactionState: 'ERROR', error: { intent: 'PAYMENT_AUTHORIZATION', message: 'Pago no aprobado por PayPal' } }
        }
        await capturePayPalOrder(orderId)
        await onSuccessRef.current(orderId)
        return { transactionState: 'SUCCESS' }
      } catch {
        return { transactionState: 'ERROR', error: { intent: 'PAYMENT_AUTHORIZATION', message: 'Error al procesar el pago' } }
      }
    }

    async function init() {
      await loadGooglePayScript()
      if (cancelled) return

      const paypalSDK2 = globalThis as unknown as { paypal?: { Googlepay?: () => PayPalGooglePay } }
      const paypalGP = paypalSDK2.paypal?.Googlepay?.()
      if (!paypalGP) { setSupported(false); return }

      const config = await paypalGP.config()
      if (cancelled) return

      const isProd = process.env.NEXT_PUBLIC_PAYPAL_ENV === 'live'
      const googlePay = gThis.google
      if (!googlePay) { setSupported(false); return }
      const GooglePayClient = googlePay.payments.api.PaymentsClient
      const client = new GooglePayClient({
        environment: isProd ? 'PRODUCTION' : 'TEST',
        paymentDataCallbacks: { onPaymentAuthorized },
      })

      const isReady = await client.isReadyToPay({
        apiVersion: config.apiVersion,
        apiVersionMinor: config.apiVersionMinor,
        allowedPaymentMethods: config.allowedPaymentMethods,
      })
      if (cancelled) return
      if (!isReady.result) { setSupported(false); return }

      setSupported(true)
      const btn = client.createButton({
        onClick: () => {
          client.loadPaymentData({
            apiVersion: config.apiVersion,
            apiVersionMinor: config.apiVersionMinor,
            allowedPaymentMethods: config.allowedPaymentMethods,
            merchantInfo: config.merchantInfo,
            transactionInfo: {
              totalPriceStatus: 'FINAL',
              totalPrice: totalUSDRef.current,
              currencyCode: 'USD',
              countryCode: 'DO',
            },
            callbackIntents: ['PAYMENT_AUTHORIZATION'],
          })
        },
      })
      if (containerRef.current && !cancelled) {
        containerRef.current.innerHTML = ''
        containerRef.current.appendChild(btn)
      }
    }

    init().catch(() => { if (!cancelled) setSupported(false) })
    return () => { cancelled = true }
  }, [paypalReady])

  return (
    <>
      {supported === true && (
        <div className="flex items-center gap-3 my-3">
          <div className="flex-1 border-t border-brand-border" />
          <span className="text-[10px] text-brand-muted font-sans tracking-[0.08em] uppercase">
            o paga con
          </span>
          <div className="flex-1 border-t border-brand-border" />
        </div>
      )}
      {/* Container always in DOM so appendChild works before setSupported triggers re-render */}
      <div ref={containerRef} className={supported === true ? '' : 'hidden'} />
    </>
  )
}
