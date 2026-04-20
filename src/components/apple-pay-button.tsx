'use client'

import { useEffect, useRef, useState } from 'react'
import { usePayPalScriptReducer } from '@paypal/react-paypal-js'
import { createPayPalOrder, capturePayPalOrder } from '@/app/actions/paypal-google-pay'

interface APConfig {
  isEligible: boolean
  countryCode: string
  merchantCapabilities: string[]
  supportedNetworks: string[]
}

interface PayPalApplePay {
  config(): Promise<APConfig>
  validateMerchant(params: { validationUrl: string; displayName: string }): Promise<{ merchantSession: unknown }>
  confirmOrder(params: { orderId: string; token: unknown; billingContact: unknown }): Promise<{ status: string }>
}

interface APSession {
  onvalidatemerchant: ((event: { validationURL: string }) => void) | null
  onpaymentauthorized: ((event: { payment: { token: unknown; billingContact: unknown } }) => void) | null
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

interface Props {
  readonly totalUSD: string
  readonly itemNames: string
  readonly onSuccess: (orderId: string) => Promise<void>
}

export function ApplePayButton({ totalUSD, itemNames, onSuccess }: Props) {
  const [{ isResolved: paypalReady }] = usePayPalScriptReducer()
  const [error, setError] = useState<string | null>(null)
  const [isSafari, setIsSafari] = useState(false)

  const configRef = useRef<APConfig | null>(null)
  const totalUSDRef = useRef(totalUSD)
  const itemNamesRef = useRef(itemNames)
  const onSuccessRef = useRef(onSuccess)
  useEffect(() => { totalUSDRef.current = totalUSD }, [totalUSD])
  useEffect(() => { itemNamesRef.current = itemNames }, [itemNames])
  useEffect(() => { onSuccessRef.current = onSuccess }, [onSuccess])

  useEffect(() => {
    // Detect Safari for native button rendering
    const ua = navigator.userAgent
    setIsSafari(/Safari/.test(ua) && !/Chrome/.test(ua))
  }, [])

  useEffect(() => {
    if (!paypalReady) return
    async function prefetch() {
      try {
        await loadApplePayScript()
        const applepay = apThis.paypal?.Applepay?.()
        if (!applepay) return
        const cfg = await applepay.config()
        configRef.current = cfg
      } catch { /* silent */ }
    }
    prefetch()
  }, [paypalReady])

  function handleClick() {
    setError(null)
    const APS = apThis.ApplePaySession
    const applepay = apThis.paypal?.Applepay?.()

    if (!APS) {
      setError('Apple Pay solo está disponible en Safari.')
      return
    }
    if (!APS.canMakePayments()) {
      setError('Configura una tarjeta en Apple Wallet para continuar.')
      return
    }
    if (!applepay) {
      setError('Apple Pay no está disponible en este momento.')
      return
    }

    const cfg = configRef.current
    const session = new APS(4, {
      countryCode: cfg?.countryCode ?? 'US',
      merchantCapabilities: cfg?.merchantCapabilities ?? ['supports3DS'],
      supportedNetworks: cfg?.supportedNetworks ?? ['visa', 'masterCard', 'amex'],
      currencyCode: 'USD',
      total: { label: 'Prêt à Porter', type: 'final', amount: totalUSDRef.current },
    })

    session.onvalidatemerchant = (event) => {
      applepay
        .validateMerchant({ validationUrl: event.validationURL, displayName: 'Prêt à Porter' })
        .then((res) => session.completeMerchantValidation(res.merchantSession))
        .catch(() => session.abort())
    }

    session.onpaymentauthorized = (event) => {
      void (async () => {
        try {
          const { orderId } = await createPayPalOrder(totalUSDRef.current, itemNamesRef.current)
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

  return (
    <div className="mt-2">
      {isSafari ? (
        /* Native Apple Pay button — Safari renders this perfectly */
        <button
          type="button"
          onClick={handleClick}
          aria-label="Pagar con Apple Pay"
          style={{
            display: 'block',
            width: '100%',
            height: 48,
            WebkitAppearance: '-apple-pay-button',
            ApplePayButtonType: 'pay',
            ApplePayButtonStyle: 'black',
            cursor: 'pointer',
            borderRadius: 4,
            border: 'none',
          } as React.CSSProperties}
        />
      ) : (
        /* Fallback for Chrome/Firefox — Apple Pay logo + text */
        <button
          type="button"
          onClick={handleClick}
          aria-label="Pagar con Apple Pay"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            width: '100%',
            height: 48,
            backgroundColor: '#000',
            borderRadius: 4,
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1a1a1a' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#000' }}
        >
          {/* Apple logo */}
          <svg width="14" height="17" viewBox="0 0 14 17" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="white">
            <path d="M13.17 12.52c-.26.6-.57 1.15-.93 1.66-.49.7-.89 1.18-1.2 1.44-.48.44-1 .66-1.55.67-.4 0-.87-.11-1.43-.34-.56-.23-1.07-.34-1.54-.34-.49 0-1.01.11-1.58.34-.57.23-1.03.35-1.38.36-.53.02-1.06-.21-1.6-.68-.34-.28-.76-.78-1.27-1.5C.7 13.36.29 12.44.03 11.4c-.27-1.1-.4-2.16-.4-3.19 0-1.18.26-2.2.77-3.05A4.5 4.5 0 0 1 2 3.48a4.37 4.37 0 0 1 2.2-.62c.43 0 1 .13 1.7.4.7.26 1.15.4 1.35.4.15 0 .65-.16 1.5-.47.8-.3 1.47-.42 2.02-.37 1.5.12 2.62.7 3.36 1.75-1.34.81-2 1.96-1.98 3.43.01 1.14.43 2.09 1.24 2.84.37.35.78.62 1.24.8-.1.29-.2.57-.32.84zM10.07.36c0 .9-.33 1.74-.98 2.52-.79.92-1.74 1.45-2.77 1.37a2.8 2.8 0 0 1-.02-.34c0-.86.37-1.78 1.03-2.53C7.69.74 8.08.44 8.57.2 9.06-.04 9.52-.16 9.96-.17c.02.18.03.35.03.53H10.07z"/>
          </svg>
          <span style={{ color: '#fff', fontSize: 15, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', fontWeight: 500, letterSpacing: 0 }}>
            Pay
          </span>
        </button>
      )}
      {error && <p className="mt-1 text-xs text-red-500 text-center font-sans">{error}</p>}
    </div>
  )
}
