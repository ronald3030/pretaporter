'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  User,
  Phone,
  Mail,
  Map,
  Truck,
  Store,
  CheckCircle2,
  Tag,
  X,
  Cake,
} from 'lucide-react'
import {
  GoogleMap,
  useJsApiLoader,
} from '@react-google-maps/api'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import { GooglePayButton } from '@/components/google-pay-button'
import { ApplePayButton } from '@/components/apple-pay-button'
import Image from 'next/image'
import { useCart } from '@/context/cart-context'
import { saveOrder } from '@/app/actions/save-order'
import { validateDiscount } from '@/app/actions/validate-discount'

/* ─── Constantes ─────────────────────────────────────────────────────────── */
const STORE_LAT = 18.4680522
const STORE_LNG = -69.9313699
const STORE_CENTER = { lat: STORE_LAT, lng: STORE_LNG }

const LIBRARIES: 'places'[] = ['places']

const DAY_NAMES: string[] = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']
const MONTH_NAMES: string[] = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC',
]

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDOP(n: number) {
  return 'RD$ ' + n.toLocaleString('es-DO')
}

function getNextDays(count: number): Date[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d
  })
}

const NEXT_DAYS = getNextDays(14)

const SHIPPING_ZONES = [
  { id: 'distrito_nacional', label: 'Distrito Nacional', costDop: 250 },
  { id: 'interior',          label: 'Interior Del País', costDop: 450 },
  { id: 'sd_este',           label: 'SD Este',           costDop: 500 },
  { id: 'sd_norte',          label: 'SD Norte',          costDop: 500 },
]

/* ─── Component ───────────────────────────────────────────────────────────── */
export function CheckoutForm() {
  const { items, totalPrice, clear } = useCart()
  const router = useRouter()

  // Map
  const [mapVisible, setMapVisible] = useState(true)
  const [selectedPos, setSelectedPos] = useState<{ lat: number; lng: number } | null>(null)
  const [address, setAddress] = useState('')
  const [references, setReferences] = useState('')
  const [distance, setDistance] = useState<number | null>(null)

  // Address search
  const [searchText, setSearchText] = useState('')
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Customer
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerBirthday, setCustomerBirthday] = useState('')

  // Exchange rate (fetched live)
  const [dopPerUsd, setDopPerUsd] = useState(60.5)

  // Date picker
  const [selectedDateIdx, setSelectedDateIdx] = useState(0)
  const [dateOffset, setDateOffset] = useState(0)

  // UI toggles
  const [summaryOpen, setSummaryOpen] = useState(false)

  // Shipping
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('delivery')
  const [shippingZone, setShippingZone] = useState<string | null>(null)

  // Descuento
  const [codigoDescuento, setCodigoDescuento] = useState('')
  const [descuentoAplicado, setDescuentoAplicado] = useState<{
    porcentaje: number; codigo: string; descripcion: string | null
  } | null>(null)
  const [descuentoError, setDescuentoError] = useState<string | null>(null)
  const [validandoCodigo, setValidandoCodigo] = useState(false)

  // Order result
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)

  const searchWrapperRef = useRef<HTMLDivElement>(null)
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)

  /* ── Live exchange rate ── */
  useEffect(() => {
    fetch('/api/exchange-rate')
      .then((r) => r.json())
      .then((d: { dopPerUsd: number }) => {
        if (d.dopPerUsd > 0) setDopPerUsd(d.dopPerUsd)
      })
      .catch(() => undefined)
  }, [])

  /* ── Google Maps loader ── */
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    libraries: LIBRARIES,
  })

  /* ── Debounced address search ── */
  useEffect(() => {
    if (!isLoaded || searchText.trim().length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    const timer = setTimeout(async () => {
      try {
        sessionTokenRef.current ??= new google.maps.places.AutocompleteSessionToken()
        const res = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: searchText,
          sessionToken: sessionTokenRef.current,
        })
        setSuggestions(res.suggestions)
        setShowSuggestions(res.suggestions.length > 0)
      } catch {
        setSuggestions([])
      }
    }, 320)
    return () => clearTimeout(timer)
  }, [searchText, isLoaded])

  /* ── Click-outside closes suggestion dropdown ── */
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  /* ── Select a suggestion ── */
  const handleSelectSuggestion = useCallback(async (s: google.maps.places.AutocompleteSuggestion) => {
    const pred = s.placePrediction
    if (!pred) return
    const place = pred.toPlace()
    await place.fetchFields({ fields: ['location', 'formattedAddress'] })
    const lat = place.location?.lat()
    const lng = place.location?.lng()
    if (lat !== undefined && lng !== undefined) {
      mapRef.current?.panTo({ lat, lng })
      mapRef.current?.setZoom(16)
      setSelectedPos({ lat, lng })
      setAddress(place.formattedAddress ?? '')
      setDistance(haversineKm(STORE_LAT, STORE_LNG, lat, lng))
    }
    setSearchText(pred.mainText?.text ?? pred.text?.text ?? '')
    setSuggestions([])
    setShowSuggestions(false)
    sessionTokenRef.current = null
  }, [])

  /* ── Map drag handler ── */
  const handleMapDragEnd = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const center = map.getCenter()
    if (!center) return
    const lat = center.lat()
    const lng = center.lng()
    setSelectedPos({ lat, lng })
    setDistance(haversineKm(STORE_LAT, STORE_LNG, lat, lng))
    new google.maps.Geocoder().geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        setAddress(results[0].formatted_address)
      }
    })
  }, [])

  /* ── Descuento handlers ── */
  async function handleValidarCodigo() {
    const code = codigoDescuento.trim()
    if (!code) return
    setValidandoCodigo(true)
    setDescuentoError(null)
    const result = await validateDiscount(code, totalPrice)
    setValidandoCodigo(false)
    if (result.valid) {
      setDescuentoAplicado({ porcentaje: result.porcentaje, codigo: code.toUpperCase(), descripcion: result.descripcion })
    } else {
      setDescuentoAplicado(null)
      setDescuentoError(result.message)
    }
  }

  function quitarDescuento() {
    setDescuentoAplicado(null)
    setCodigoDescuento('')
    setDescuentoError(null)
  }

  /* ── Derived ── */
  const shippingCostDop =
    deliveryType === 'delivery'
      ? (SHIPPING_ZONES.find((z) => z.id === shippingZone)?.costDop ?? 0)
      : 0
  const discountAmountDop = descuentoAplicado
    ? Math.round(totalPrice * descuentoAplicado.porcentaje / 100)
    : 0
  const grandTotalDop = totalPrice + shippingCostDop - discountAmountDop
  const totalUSD = (grandTotalDop / dopPerUsd).toFixed(2)
  const totalQty = items.reduce((s, i) => s + i.quantity, 0)
  const canPay =
    customerName.trim().length >= 2 &&
    customerPhone.trim().length >= 4 &&
    customerEmail.trim().includes('@') &&
    (deliveryType === 'pickup' || (selectedPos !== null && shippingZone !== null))

  const visibleDays = NEXT_DAYS.slice(dateOffset, dateOffset + 5)

  /* ── Pay hint helper ── */
  function getPayHint() {
    if (customerName.trim().length < 2) return 'Ingresa tu nombre completo.'
    if (customerPhone.trim().length < 4) return 'Ingresa tu teléfono / WhatsApp.'
    if (!customerEmail.trim().includes('@')) return 'Ingresa un correo electrónico válido.'
    if (deliveryType === 'delivery' && shippingZone === null) return 'Selecciona un método de envío.'
    if (deliveryType === 'delivery' && selectedPos === null) return 'Arrastra el mapa para ubicar la flecha en tu dirección.'
    return ''
  }

  /* ── Save order ── */
  async function handleSaveOrder(paypalOrderId: string) {
    const isPickup = deliveryType === 'pickup'
    if (!isPickup && !selectedPos) return
    setSaving(true)
    setOrderError(null)
    const deliveryDate = NEXT_DAYS[selectedDateIdx].toISOString().split('T')[0]

    const itemsForOrder = items.map(item => ({
      ...item,
      size: (item.size === 'S' || item.size === 'M' || item.size === 'L' ? item.size : undefined) as 'S' | 'M' | 'L' | undefined,
    }))
    const result = await saveOrder({
      paypalOrderId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim(),
      address: isPickup ? 'Recoger en tienda — Prêt à Porter' : address,
      addressReference: isPickup ? undefined : (references.trim() || undefined),
      lat: isPickup ? STORE_LAT : selectedPos!.lat,
      lng: isPickup ? STORE_LNG : selectedPos!.lng,
      distanceKm: isPickup ? 0 : Number.parseFloat((distance ?? 0).toFixed(2)),
      deliveryDate,
      shippingMethod: deliveryType,
      shippingZone: shippingZone ?? undefined,
      shippingCostDop,
      items: itemsForOrder,
      totalDop: grandTotalDop,
      totalUsd: Number.parseFloat(totalUSD),
      codigoDescuento:          descuentoAplicado?.codigo,
      descuentoPorcentaje:      descuentoAplicado?.porcentaje,
      descuentoMontoDop:        discountAmountDop > 0 ? discountAmountDop : undefined,
      clienteFechaNacimiento:   customerBirthday || undefined,
    })

    setSaving(false)

    if (!result.success) {
      setOrderError(result.error)
      return
    }

    clear()
    setSuccessOrderId(result.orderId ?? null)
    setOrderSuccess(true)
  }

  /* ── Success screen ── */
  if (orderSuccess) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h2 className="font-heading text-3xl text-brand-deep mb-2">¡Pedido confirmado!</h2>
          <p className="text-brand-muted font-sans text-sm leading-relaxed mb-6">
            Tu orden fue procesada exitosamente.
            Te contactaremos para coordinar la entrega.
          </p>

          {/* Botón de factura PDF */}
          {successOrderId && (
            <a
              href={`/api/factura/${successOrderId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mb-5 px-5 py-2.5 bg-brand-deep text-white text-xs font-sans font-medium tracking-wide rounded-sm hover:bg-brand-primary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              Descargar factura PDF
            </a>
          )}

          <div>
            <button
              onClick={() => router.push('/')}
              className="text-xs tracking-[0.12em] uppercase font-sans text-brand-primary underline underline-offset-4 hover:text-brand-deep transition-colors"
            >
              Volver a la tienda
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  /* ── Empty cart ── */
  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="font-heading text-2xl text-brand-deep mb-4">Tu carrito está vacío</p>
          <button
            onClick={() => router.push('/')}
            className="text-xs tracking-[0.12em] uppercase font-sans text-brand-primary underline underline-offset-4"
          >
            Volver a la tienda
          </button>
        </div>
      </div>
    )
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? 'test',
        currency: 'USD',
        intent: 'capture',
        'enable-funding': 'venmo',
        ...(process.env.NEXT_PUBLIC_PAYPAL_ENV !== 'live' && { 'buyer-country': 'US' }),
        components: 'buttons,googlepay,applepay',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-10 w-full flex flex-col-reverse lg:flex-row lg:items-start gap-8">

        {/* ══ LEFT — Formulario (original) ════════════════════════════════════ */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-4">
            <h1 className="font-heading text-4xl text-brand-deep text-center mb-2">
              Finalizar pedido
            </h1>

            {/* ── Datos del cliente ── */}
            <section className="bg-white rounded-sm border border-brand-border p-6">
              <p className="text-[10px] tracking-[0.2em] uppercase font-sans text-brand-muted mb-4">
                Datos del cliente
              </p>
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nombre completo"
                    className="w-full pl-9 pr-4 py-3 border border-brand-border rounded-sm font-sans text-sm text-brand-deep placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
                  />
                </div>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
                  <input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Teléfono / WhatsApp *"
                    type="tel"
                    required
                    className="w-full pl-9 pr-4 py-3 border border-brand-border rounded-sm font-sans text-sm text-brand-deep placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
                  />
                </div>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
                  <input
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="Correo electrónico *"
                    type="email"
                    required
                    className="w-full pl-9 pr-4 py-3 border border-brand-border rounded-sm font-sans text-sm text-brand-deep placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
                  />
                </div>

                {/* Fecha de nacimiento (opcional) */}
                <div className="relative">
                  <Cake size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
                  <input
                    value={customerBirthday}
                    onChange={(e) => setCustomerBirthday(e.target.value)}
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    min="1920-01-01"
                    className="w-full pl-9 pr-4 py-3 border border-brand-border rounded-sm font-sans text-sm text-brand-deep placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] tracking-[0.1em] uppercase font-sans text-brand-muted pointer-events-none">
                    Cumpleaños (opcional)
                  </span>
                </div>
                <p className="text-[9px] font-sans text-brand-muted/70 -mt-1 pl-1">
                  Ingresa tu fecha de nacimiento para recibir promociones especiales por tu mes.
                </p>
              </div>
            </section>

            {/* ── Envío ── */}
            <section className="bg-white rounded-sm border border-brand-border p-6">
              <div className="flex items-center gap-2 mb-5">
                <Truck size={18} className="text-brand-primary" />
                <h2 className="font-heading text-2xl text-brand-deep">Envío</h2>
              </div>

              <div className="flex rounded-sm border border-brand-border overflow-hidden mb-5">
                <button
                  type="button"
                  onClick={() => setDeliveryType('delivery')}
                  className={`flex-1 py-3 text-[11px] tracking-[0.12em] uppercase font-sans transition-colors flex items-center justify-center gap-2 ${
                    deliveryType === 'delivery'
                      ? 'bg-brand-primary text-white'
                      : 'bg-white text-brand-muted hover:bg-brand-ivory'
                  }`}
                >
                  <Truck size={13} />
                  Envío
                </button>
                <button
                  type="button"
                  onClick={() => { setDeliveryType('pickup'); setShippingZone(null) }}
                  className={`flex-1 py-3 text-[11px] tracking-[0.12em] uppercase font-sans transition-colors flex items-center justify-center gap-2 ${
                    deliveryType === 'pickup'
                      ? 'bg-brand-primary text-white'
                      : 'bg-white text-brand-muted hover:bg-brand-ivory'
                  }`}
                >
                  <Store size={13} />
                  Recoger en Tienda
                </button>
              </div>

              {deliveryType === 'delivery' && (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] tracking-[0.18em] uppercase font-sans text-brand-muted mb-1">
                    Método de envío
                  </p>
                  {SHIPPING_ZONES.map((zone) => (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => setShippingZone(zone.id)}
                      className={`w-full flex items-center justify-between px-4 py-3.5 rounded-sm border transition-colors ${
                        shippingZone === zone.id
                          ? 'border-brand-primary bg-brand-primary/5'
                          : 'border-brand-border hover:border-brand-primary/40'
                      }`}
                    >
                      <span className={`font-sans text-sm ${shippingZone === zone.id ? 'text-brand-primary font-medium' : 'text-brand-deep'}`}>
                        {zone.label}
                      </span>
                      <span className={`font-sans text-sm ${shippingZone === zone.id ? 'text-brand-primary font-medium' : 'text-brand-muted'}`}>
                        {formatDOP(zone.costDop)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {deliveryType === 'pickup' && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-sm flex items-start gap-3">
                  <Store size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-sans text-sm font-medium text-green-800">Recogida en tienda — Gratis</p>
                    <p className="font-sans text-xs text-green-700 mt-0.5">Av. Gustavo Mejía Ricart, Zona Rosa, Santo Domingo</p>
                  </div>
                </div>
              )}
            </section>

            {/* ── Ubicación ── */}
            {deliveryType === 'delivery' && (
              <section className="bg-white rounded-sm border border-brand-border p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Map size={18} className="text-brand-primary" />
                  <h2 className="font-heading text-2xl text-brand-deep">
                    ¿Dónde y cuándo entregamos?
                  </h2>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] tracking-[0.18em] uppercase font-sans text-brand-muted flex items-center gap-1.5">
                    <MapPin size={11} />
                    Arrastra el mapa · la flecha marca tu dirección
                  </p>
                  <button
                    onClick={() => setMapVisible((v) => !v)}
                    className="text-[10px] tracking-[0.1em] uppercase font-sans text-brand-primary flex items-center gap-1 hover:text-brand-deep transition-colors"
                  >
                    {mapVisible ? 'Contraer mapa' : 'Expandir mapa'}
                    {mapVisible ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {mapVisible && (
                    <motion.div
                      key="map"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 260, opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden rounded-sm mb-3 border border-brand-border"
                    >
                      {isLoaded ? (
                        <div className="relative w-full h-[260px]">
                          <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center">
                            <MapPin size={38} className="text-brand-primary drop-shadow-lg" style={{ marginBottom: '-19px' }} />
                            <div className="w-2 h-2 rounded-full bg-brand-primary/40" />
                          </div>
                          <GoogleMap
                            mapContainerStyle={{ width: '100%', height: '260px' }}
                            center={STORE_CENTER}
                            zoom={14}
                            onLoad={(map) => { mapRef.current = map }}
                            onDragEnd={handleMapDragEnd}
                            options={{
                              zoomControl: true,
                              fullscreenControl: true,
                              streetViewControl: false,
                              mapTypeControl: false,
                              clickableIcons: false,
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-full h-[260px] bg-gray-100 flex items-center justify-center">
                          <p className="text-xs text-brand-muted font-sans">
                            {loadError ? 'Configura NEXT_PUBLIC_GOOGLE_MAPS_API_KEY' : 'Cargando mapa…'}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={searchWrapperRef} className="relative mb-4">
                  <Search size={14} className="absolute left-3 top-[14px] text-brand-muted pointer-events-none z-10" />
                  <input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    placeholder="Buscar dirección…"
                    className="w-full pl-9 pr-4 py-3 border border-brand-border rounded-sm font-sans text-sm text-brand-deep placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors bg-white"
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <ul className="absolute z-50 w-full bg-white border border-brand-border rounded-sm shadow-lg mt-1 max-h-60 overflow-auto">
                      {suggestions.map((s) => (
                        <li key={s.placePrediction?.placeId ?? s.placePrediction?.text?.text} className="border-b border-brand-border/50 last:border-b-0">
                          <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); void handleSelectSuggestion(s) }}
                            className="w-full text-left px-4 py-3 font-sans hover:bg-brand-ivory transition-colors flex flex-col gap-0.5"
                          >
                            <span className="text-sm text-brand-deep">{s.placePrediction?.mainText?.text}</span>
                            {s.placePrediction?.secondaryText?.text && (
                              <span className="text-xs text-brand-muted">{s.placePrediction.secondaryText.text}</span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <p className="text-[10px] tracking-[0.18em] uppercase font-sans text-brand-muted mb-3">
                  Detalles exactos de entrega
                </p>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Dirección completa"
                  className="w-full px-4 py-3 border border-brand-border rounded-sm font-sans text-sm text-brand-deep placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors mb-3"
                />
                <textarea
                  value={references}
                  onChange={(e) => setReferences(e.target.value)}
                  placeholder="Referencias (Color de fachada, portón, entre calles…)"
                  rows={3}
                  className="w-full px-4 py-3 border border-brand-border rounded-sm font-sans text-sm text-brand-deep placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors resize-none"
                />

                {distance !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 flex items-center gap-3 p-4 rounded-sm border bg-green-50 border-green-200"
                  >
                    <MapPin size={18} className="text-green-600 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-sans font-bold tracking-[0.15em] uppercase text-green-700">
                        Distancia: {distance.toFixed(1)} km desde la tienda
                      </p>
                      <p className="text-xs text-green-600 font-sans mt-0.5 truncate">{address}</p>
                    </div>
                  </motion.div>
                )}

                <button
                  onClick={() => setSummaryOpen((v) => !v)}
                  className="w-full mt-5 py-3 border-t border-brand-border text-[10px] tracking-[0.12em] uppercase font-sans text-brand-deep flex items-center justify-center gap-1.5 hover:text-brand-primary transition-colors"
                >
                  Ver resumen
                  {summaryOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>

                <AnimatePresence>
                  {summaryOpen && (
                    <motion.div
                      key="summary"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <ul className="pt-3 flex flex-col gap-2.5">
                        {items.map((item) => (
                          <li key={item.id} className="flex items-center justify-between text-sm font-sans gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="relative w-10 h-12 rounded-sm flex-shrink-0 overflow-hidden" style={{ backgroundColor: item.bg }}>
                                {item.image && <Image src={item.image} alt={item.name} fill sizes="40px" className="object-cover" />}
                              </div>
                              <span className="text-brand-deep truncate">{item.name} × {item.quantity}</span>
                            </div>
                            <span className="text-brand-muted flex-shrink-0">{formatDOP(item.priceNum * item.quantity)}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            )}

            {/* ── Fecha de entrega ── */}
            <section className="bg-white rounded-sm border border-brand-border p-6">
              <p className="text-[10px] tracking-[0.18em] uppercase font-sans text-brand-muted mb-4 flex items-center gap-1.5">
                📅 Fecha de entrega
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDateOffset((o) => Math.max(0, o - 1))}
                  disabled={dateOffset === 0}
                  className="p-1.5 text-brand-muted hover:text-brand-deep disabled:opacity-30 transition-colors flex-shrink-0"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex-1 flex gap-2 overflow-hidden">
                  {visibleDays.map((date, idx) => {
                    const globalIdx = dateOffset + idx
                    const isToday = globalIdx === 0
                    const isSelected = selectedDateIdx === globalIdx
                    return (
                      <button
                        key={globalIdx}
                        onClick={() => setSelectedDateIdx(globalIdx)}
                        className={`flex-1 flex flex-col items-center py-3 rounded-sm border transition-colors ${
                          isSelected
                            ? 'border-brand-primary bg-brand-primary/5 text-brand-primary'
                            : 'border-brand-border text-brand-deep hover:border-brand-primary/40'
                        }`}
                      >
                        <span className="text-[8px] tracking-widest uppercase font-sans opacity-70 leading-none mb-0.5">
                          {DAY_NAMES[date.getDay()]}
                        </span>
                        {isToday && (
                          <span className="text-[7px] bg-brand-primary text-white px-1 py-0.5 rounded leading-none mb-0.5">
                            HOY
                          </span>
                        )}
                        <span className="font-heading text-xl leading-none">{date.getDate()}</span>
                        <span className="text-[8px] uppercase font-sans opacity-60 mt-0.5">
                          {MONTH_NAMES[date.getMonth()]}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => setDateOffset((o) => Math.min(NEXT_DAYS.length - 5, o + 1))}
                  disabled={dateOffset >= NEXT_DAYS.length - 5}
                  className="p-1.5 text-brand-muted hover:text-brand-deep disabled:opacity-30 transition-colors flex-shrink-0"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </section>

            {/* ── Pago ── */}
            <section className="bg-white rounded-sm border border-brand-border p-6">
              {canPay && !saving && (
                <>
                  <PayPalButtons
                    style={{ layout: 'vertical', color: 'black', shape: 'rect', label: 'pay', height: 48 }}
                    createOrder={(_data, actions) =>
                      actions.order.create({
                        intent: 'CAPTURE',
                        purchase_units: [{
                          amount: { currency_code: 'USD', value: totalUSD },
                          description: `Prêt à Porter — ${items.map((i) => i.name).join(', ')}`,
                        }],
                      })
                    }
                    onApprove={async (data, actions) => {
                      await actions.order?.capture()
                      await handleSaveOrder(data.orderID)
                    }}
                  />
                  <GooglePayButton totalUSD={totalUSD} itemNames={items.map((i) => i.name).join(', ')} onSuccess={handleSaveOrder} />
                  <ApplePayButton totalUSD={totalUSD} itemNames={items.map((i) => i.name).join(', ')} onSuccess={handleSaveOrder} />
                </>
              )}
            </section>
          </div>
        </div>

        {/* ══ RIGHT — Resumen del pedido ════════════════════════════════════ */}
        <div className="lg:w-[360px] lg:min-w-[360px] bg-brand-ivory border border-brand-border rounded-sm px-6 py-7 lg:sticky lg:top-24">

          {/* Items */}
          <ul className="flex flex-col gap-5 mb-7">
            {items.map((item) => (
              <li key={`${item.id}-${item.size ?? ''}`} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Thumbnail + qty badge */}
                  <div className="relative flex-shrink-0">
                    <div
                      className="relative w-16 h-16 rounded-sm overflow-hidden border border-brand-border"
                      style={{ backgroundColor: item.bg }}
                    >
                      {item.image && (
                        <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />
                      )}
                    </div>
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-brand-deep text-brand-ivory text-[10px] font-medium flex items-center justify-center leading-none">
                      {item.quantity}
                    </span>
                  </div>
                  {/* Name + size */}
                  <div className="min-w-0">
                    <p className="font-heading text-base text-brand-deep leading-tight truncate">{item.name}</p>
                    {item.size && (
                      <p className="text-xs font-sans text-brand-muted mt-0.5 tracking-[0.06em] uppercase">{item.size}</p>
                    )}
                  </div>
                </div>
                <span className="font-sans text-sm text-brand-deep flex-shrink-0 font-medium">
                  {formatDOP(item.priceNum * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          {/* Separador */}
          <div className="border-t border-brand-border mb-5" />

          {/* Código de descuento */}
          <div className="mb-5">
            <p className="text-[10px] tracking-[0.18em] uppercase font-sans text-brand-muted mb-3 flex items-center gap-1.5">
              <Tag size={11} />
              Código de descuento
            </p>
            {!descuentoAplicado ? (
              <>
                <div className="flex gap-2">
                  <input
                    value={codigoDescuento}
                    onChange={(e) => { setCodigoDescuento(e.target.value.toUpperCase()); setDescuentoError(null) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleValidarCodigo() }}
                    placeholder="Ej: PRET-AB3K9"
                    maxLength={20}
                    className="flex-1 px-4 py-2.5 border border-brand-border rounded-sm font-mono text-sm text-brand-deep placeholder:text-brand-muted placeholder:font-sans focus:outline-none focus:border-brand-primary transition-colors tracking-wider bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => void handleValidarCodigo()}
                    disabled={validandoCodigo || codigoDescuento.trim().length < 4}
                    className="px-4 py-2.5 border border-brand-border rounded-sm text-[11px] tracking-[0.08em] uppercase font-sans text-brand-deep bg-white hover:bg-white hover:border-brand-primary hover:text-brand-primary transition-colors disabled:opacity-40 whitespace-nowrap"
                  >
                    {validandoCodigo ? '…' : 'Aplicar'}
                  </button>
                </div>
                {descuentoError && (
                  <p className="mt-2 text-xs text-red-600 font-sans">{descuentoError}</p>
                )}
              </>
            ) : (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-sm">
                <div>
                  <p className="text-xs font-sans font-semibold text-green-800">
                    {descuentoAplicado.porcentaje}% de descuento aplicado
                  </p>
                  <p className="text-[10px] text-green-700 font-mono mt-0.5">
                    {descuentoAplicado.codigo}
                    {descuentoAplicado.descripcion && ` · ${descuentoAplicado.descripcion}`}
                  </p>
                  <p className="text-[10px] text-green-600 font-sans mt-1">
                    Ahorro: −{formatDOP(discountAmountDop)}
                  </p>
                </div>
                <button type="button" onClick={quitarDescuento} className="text-green-600 hover:text-green-800 transition-colors p-1">
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Separador */}
          <div className="border-t border-brand-border mb-4" />

          {/* Totales */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="font-sans text-sm text-brand-muted">
                Subtotal · {totalQty} {totalQty === 1 ? 'pieza' : 'piezas'}
              </span>
              <span className="font-sans text-sm text-brand-deep">{formatDOP(totalPrice)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-sans text-sm text-brand-muted">Envío</span>
              <span className="font-sans text-sm text-brand-deep">
                {deliveryType === 'pickup' ? 'Gratis' : shippingCostDop > 0 ? formatDOP(shippingCostDop) : '—'}
              </span>
            </div>
            {discountAmountDop > 0 && (
              <div className="flex items-center justify-between">
                <span className="font-sans text-sm text-green-600">Descuento {descuentoAplicado?.porcentaje}%</span>
                <span className="font-sans text-sm text-green-600">−{formatDOP(discountAmountDop)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-3 border-t border-brand-border mt-1">
              <span className="font-heading text-xl text-brand-deep">Total</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] font-sans text-brand-muted tracking-[0.12em] uppercase">DOP</span>
                <span className="font-heading text-3xl text-brand-deep">{formatDOP(grandTotalDop)}</span>
              </div>
            </div>
            <p className="text-[9px] font-sans text-brand-muted/60 text-right leading-tight">
              Precio final · ITBIS no aplica (Régimen RST)
            </p>
          </div>

          {/* Estado del pago */}
          {saving && (
            <p className="mt-4 text-center text-xs text-brand-muted font-sans">Procesando pedido…</p>
          )}
          {orderError && !saving && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-sm text-xs text-red-600 font-sans text-center">
              {orderError}
            </div>
          )}
          {!canPay && !saving && getPayHint() && (
            <p className="mt-4 text-center text-xs text-brand-primary font-sans">
              {getPayHint()}
            </p>
          )}
        </div>

      </div>
    </PayPalScriptProvider>
  )
}
