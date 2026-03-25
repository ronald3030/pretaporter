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
} from 'lucide-react'
import {
  GoogleMap,
  useJsApiLoader,
} from '@react-google-maps/api'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import { GooglePayButton } from '@/components/google-pay-button'
import { ApplePayButton } from '@/components/apple-pay-button'
import { useCart } from '@/context/cart-context'
import { saveOrder } from '@/app/actions/save-order'

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

  // Order result
  const [orderSuccess, setOrderSuccess] = useState(false)
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

  /* ── Debounced address search (Places New API — no legacy Autocomplete) ── */
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

  /* ── Map drag handler — captures center as delivery point ── */
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

  /* ── Derived ── */
  const shippingCostDop =
    deliveryType === 'delivery'
      ? (SHIPPING_ZONES.find((z) => z.id === shippingZone)?.costDop ?? 0)
      : 0
  const grandTotalDop = totalPrice + shippingCostDop
  const totalUSD = (grandTotalDop / dopPerUsd).toFixed(2)
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

  /* ── Save order (via Server Action — validates + verifies PayPal server-side) ── */
  async function handleSaveOrder(paypalOrderId: string) {
    const isPickup = deliveryType === 'pickup'
    if (!isPickup && !selectedPos) return
    setSaving(true)
    setOrderError(null)
    const deliveryDate = NEXT_DAYS[selectedDateIdx].toISOString().split('T')[0]

    // Map size to 'S' | 'M' | 'L' | undefined for type safety
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
    })

    setSaving(false)

    if (!result.success) {
      setOrderError(result.error)
      return
    }

    clear()
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
          <button
            onClick={() => router.push('/')}
            className="text-xs tracking-[0.12em] uppercase font-sans text-brand-primary underline underline-offset-4 hover:text-brand-deep transition-colors"
          >
            Volver a la tienda
          </button>
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
        // In sandbox set buyer-country to US so Google Pay / Apple Pay eligibility checks pass.
        // PayPal's wallet APMs (Google Pay, Apple Pay) don't support DO as buyer-country.
        // In production the parameter is omitted — PayPal auto-detects from the buyer's IP.
        ...(process.env.NEXT_PUBLIC_PAYPAL_ENV !== 'live' && { 'buyer-country': 'US' }),
        components: 'buttons,googlepay,applepay',
      }}
    >
      <div className="py-10 px-4">
        <div className="max-w-lg mx-auto flex flex-col gap-4">
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
                <User
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none"
                />
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nombre completo"
                  className="w-full pl-9 pr-4 py-3 border border-brand-border rounded-sm font-sans text-sm text-brand-deep placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
                />
              </div>
              <div className="relative">
                <Phone
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none"
                />
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
                <Mail
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none"
                />
                <input
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Correo electrónico *"
                  type="email"
                  required
                  className="w-full pl-9 pr-4 py-3 border border-brand-border rounded-sm font-sans text-sm text-brand-deep placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
                />
              </div>
            </div>
          </section>

          {/* ── Envío ── */}
          <section className="bg-white rounded-sm border border-brand-border p-6">
            <div className="flex items-center gap-2 mb-5">
              <Truck size={18} className="text-brand-primary" />
              <h2 className="font-heading text-2xl text-brand-deep">Envío</h2>
            </div>

            {/* Toggle: Envío / Recoger en Tienda */}
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

            {/* Selector de zona */}
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
                    <span className={`font-sans text-sm ${
                      shippingZone === zone.id ? 'text-brand-primary font-medium' : 'text-brand-deep'
                    }`}>
                      {zone.label}
                    </span>
                    <span className={`font-sans text-sm ${
                      shippingZone === zone.id ? 'text-brand-primary font-medium' : 'text-brand-muted'
                    }`}>
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
            {/* Título */}
            <div className="flex items-center gap-2 mb-5">
              <Map size={18} className="text-brand-primary" />
              <h2 className="font-heading text-2xl text-brand-deep">
                ¿Dónde y cuándo entregamos?
              </h2>
            </div>

            {/* Toggle mapa */}
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

            {/* Mapa */}
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
                      {/* Centered crosshair — this is the delivery pin */}
                      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center">
                        <MapPin
                          size={38}
                          className="text-brand-primary drop-shadow-lg"
                          style={{ marginBottom: '-19px' }}
                        />
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

            {/* Buscador de dirección — input estilizado con dropdown propio */}
            <div ref={searchWrapperRef} className="relative mb-4">
              <Search
                size={14}
                className="absolute left-3 top-[14px] text-brand-muted pointer-events-none z-10"
              />
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
                        <span className="text-sm text-brand-deep">
                          {s.placePrediction?.mainText?.text}
                        </span>
                        {s.placePrediction?.secondaryText?.text && (
                          <span className="text-xs text-brand-muted">
                            {s.placePrediction.secondaryText.text}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Detalles exactos de entrega */}
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

            {/* Indicador de distancia */}
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

            {/* Ver resumen */}
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
                      <li
                        key={item.id}
                        className="flex items-center justify-between text-sm font-sans gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-5 h-5 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: item.bg }}
                          />
                          <span className="text-brand-deep truncate">
                            {item.name} × {item.quantity}
                          </span>
                        </div>
                        <span className="text-brand-muted flex-shrink-0">
                          {formatDOP(item.priceNum * item.quantity)}
                        </span>
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
                aria-label="Fecha anterior"
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
                      <span className="font-heading text-xl leading-none">
                        {date.getDate()}
                      </span>
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
                aria-label="Fecha siguiente"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </section>

          {/* ── Total y pago ── */}
          <section className="bg-white rounded-sm border border-brand-border p-6">
            <div className="flex flex-col gap-2 mb-6">
              <div className="flex items-baseline justify-between">
                <span className="text-xs tracking-[0.08em] uppercase font-sans text-brand-muted">
                  Subtotal
                </span>
                <span className="font-sans text-sm text-brand-deep">
                  {formatDOP(totalPrice)}
                </span>
              </div>
              {(() => {
                    let shippingLabel = '—'
                    if (deliveryType === 'pickup') shippingLabel = 'Gratis'
                    else if (shippingCostDop > 0) shippingLabel = formatDOP(shippingCostDop)
                    return (
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs tracking-[0.08em] uppercase font-sans text-brand-muted">
                          Envío
                        </span>
                        <span className="font-sans text-sm text-brand-deep">{shippingLabel}</span>
                      </div>
                    )
                  })()}
              <div className="flex items-baseline justify-between pt-2 border-t border-brand-border">
                <span className="text-xs tracking-[0.08em] uppercase font-sans text-brand-muted">
                  Total
                </span>
                <span className="font-heading text-3xl text-brand-deep">
                  {formatDOP(grandTotalDop)}
                </span>
              </div>
            </div>

            {saving && (
              <div className="text-center text-xs text-brand-muted font-sans py-4">
                Procesando pedido…
              </div>
            )}

            {orderError && !saving && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-sm text-xs text-red-600 font-sans text-center">
                {orderError}
              </div>
            )}

            {!canPay && !saving && (
              <div className="text-center">
                <p className="text-xs text-brand-muted font-sans">{getPayHint()}</p>
              </div>
            )}

            {canPay && !saving && (
              <>
                <PayPalButtons
                  style={{
                    layout: 'vertical',
                    color: 'black',
                    shape: 'rect',
                    label: 'pay',
                    height: 48,
                  }}
                  createOrder={(_data, actions) =>
                    actions.order.create({
                      intent: 'CAPTURE',
                      purchase_units: [
                        {
                          amount: {
                            currency_code: 'USD',
                            value: totalUSD,
                          },
                          description: `Prêt à Porter — ${items.map((i) => i.name).join(', ')}`,
                        },
                      ],
                    })
                  }
                  onApprove={async (data, actions) => {
                    await actions.order?.capture()
                    await handleSaveOrder(data.orderID)
                  }}
                />
                <GooglePayButton
                  totalUSD={totalUSD}
                  itemNames={items.map((i) => i.name).join(', ')}
                  onSuccess={handleSaveOrder}
                />
                <ApplePayButton
                  totalUSD={totalUSD}
                  itemNames={items.map((i) => i.name).join(', ')}
                  onSuccess={handleSaveOrder}
                />
              </>
            )}
          </section>
        </div>
      </div>
    </PayPalScriptProvider>
  )
}
