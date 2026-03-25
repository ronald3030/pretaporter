'use client'

import { useEffect, useRef, useState } from 'react'
import { usePayPalScriptReducer } from '@paypal/react-paypal-js'
import { createPayPalOrder, capturePayPalOrder } from '@/app/actions/paypal-google-pay'

/* ─── Minimal types for PayPal Applepay() + ApplePaySession API ─────────── */
interface APConfig {
  isEligible: boolean
  countryCode: string
  merchantCapabilities: string[]
  supportedNetworks: string[]
}

interface PayPalApplePay {
  config(): Promise<APConfig>
  validateMerchant(params: {
    validationUrl: string
    displayName: string
  }): Promise<{ merchantSession: unknown }>
  confirmOrder(params: {
    orderId: string
    token: unknown
    billingContact: unknown
  }): Promise<{ status: string }>
}

interface APSession {
  onvalidatemerchant: ((event: { validationURL: string }) => void) | null
  onpaymentauthorized:
    | ((event: { payment: { token: unknown; billingContact: unknown } }) => void)
    | null
  begin(): void
  completeMerchantValidation(merchantSession: unknown): void
  completePayment(status: number): void
  abort(): void
}

type APSessionConstructor = (new (version: number, request: unknown) => APSession) & {
  canMakePayments(): boolean
  readonly STATUS_SUCCESS: number
  readonly STATUS_FAILURE: number
}

type GlobalWithApplePay = {
  ApplePaySession?: APSessionConstructor
  paypal?: { Applepay?: () => PayPalApplePay }
}

const apThis = globalThis as unknown as GlobalWithApplePay

/* ─── Helper: load Apple Pay JS SDK once (idempotent) ───────────────────── */
function loadApplePayScript(): Promise<void> {
  if (apThis.ApplePaySession) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load Apple Pay SDK'))
    document.head.appendChild(s)
  })
}

/* ─── Props ─────────────────────────────────────────────────────────────── */
interface Props {
  readonly totalUSD: string
  readonly itemNames: string
  readonly onSuccess: (orderId: string) => Promise<void>
}

/**
 * Apple Pay button powered by the PayPal JS SDK + Apple Pay JS SDK.
 * Only renders on Safari / iOS devices that have Apple Pay configured.
 *
 * Payment flow:
 *  1. paypal.Applepay().config()              → eligibility + payment config (cached)
 *  2. onClick → new ApplePaySession(4, req)   → opens payment sheet
 *  3. onvalidatemerchant → paypal.Applepay().validateMerchant()
 *  4. onpaymentauthorized:
 *       createPayPalOrder  → orderId
 *       paypal.Applepay().confirmOrder()  → APPROVED
 *       capturePayPalOrder(orderId)       → COMPLETED
 *       session.completePayment(SUCCESS)  → sheet closes
 *       onSuccess(orderId)                → saves to Supabase
 */
export function ApplePayButton({ totalUSD, itemNames, onSuccess }: Props) {
  const [{ isResolved: paypalReady }] = usePayPalScriptReducer()
  const [eligible, setEligible] = useState<boolean | null>(null)

  // Config cached after eligibility check so session creation stays synchronous
  const configRef = useRef<APConfig | null>(null)

  // Refs so async callbacks always see the latest props
  const totalUSDRef = useRef(totalUSD)
  const itemNamesRef = useRef(itemNames)
  const onSuccessRef = useRef(onSuccess)
  useEffect(() => { totalUSDRef.current = totalUSD }, [totalUSD])
  useEffect(() => { itemNamesRef.current = itemNames }, [itemNames])
  useEffect(() => { onSuccessRef.current = onSuccess }, [onSuccess])

  /* Eligibility check — runs once when PayPal SDK resolves */
  useEffect(() => {
    if (!paypalReady) return
    let cancelled = false

    async function check() {
      await loadApplePayScript()
      if (cancelled) return

      const APS = apThis.ApplePaySession
      if (!APS || !APS.canMakePayments()) { setEligible(false); return }

      const applepay = apThis.paypal?.Applepay?.()
      if (!applepay) { setEligible(false); return }

      const cfg = await applepay.config()
      if (cancelled) return

      configRef.current = cfg
      setEligible(cfg.isEligible)
    }

    check().catch(() => { if (!cancelled) setEligible(false) })
    return () => { cancelled = true }
  }, [paypalReady])

  /* Button click — must create ApplePaySession synchronously from user gesture */
  function handleClick() {
    const APS = apThis.ApplePaySession
    const applepay = apThis.paypal?.Applepay?.()
    const cfg = configRef.current
    if (!APS || !applepay || !cfg) return

    const paymentRequest = {
      countryCode: cfg.countryCode,
      merchantCapabilities: cfg.merchantCapabilities,
      supportedNetworks: cfg.supportedNetworks,
      currencyCode: 'USD',
      total: {
        label: 'Pret a Porter',
        type: 'final',
        amount: totalUSDRef.current,
      },
    }

    const session = new APS(4, paymentRequest)

    session.onvalidatemerchant = (event) => {
      applepay
        .validateMerchant({ validationUrl: event.validationURL, displayName: 'Pret a Porter' })
        .then((res) => session.completeMerchantValidation(res.merchantSession))
        .catch(() => session.abort())
    }

    session.onpaymentauthorized = (event) => {
      void (async () => {
        try {
          const { orderId } = await createPayPalOrder(
            totalUSDRef.current,
            itemNamesRef.current,
          )
          const result = await applepay.confirmOrder({
            orderId,
            token: event.payment.token,
            billingContact: event.payment.billingContact,
          })
          if (result.status !== 'APPROVED') {
            session.completePayment(APS.STATUS_FAILURE)
            return
          }
          await capturePayPalOrder(orderId)
          session.completePayment(APS.STATUS_SUCCESS)
          await onSuccessRef.current(orderId)
        } catch {
          session.completePayment(APS.STATUS_FAILURE)
        }
      })()
    }

    session.begin()
  }

  if (eligible !== true) return null

  return (
    <>
      <div className="flex items-center gap-3 my-3">
        <div className="flex-1 border-t border-brand-border" />
        <span className="text-[10px] text-brand-muted font-sans tracking-[0.08em] uppercase">
          o paga con
        </span>
        <div className="flex-1 border-t border-brand-border" />
      </div>
      {/*
        The -apple-pay-button WebKit appearance renders Apple's official button.
        Only displayed when eligible === true (Safari + Apple Pay configured).
      */}
      <button
        type="button"
        onClick={handleClick}
        aria-label="Pagar con Apple Pay"
        className="w-full block rounded"
        style={
          {
            height: 48,
            WebkitAppearance: '-apple-pay-button',
            cursor: 'pointer',
          } as React.CSSProperties
        }
      />
    </>
  )
}
