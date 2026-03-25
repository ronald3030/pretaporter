'use client'

import { useState, useCallback } from 'react'
import Image    from 'next/image'
import Link     from 'next/link'
import { ArrowLeft, Heart, Share2, Check, ShoppingBag } from 'lucide-react'
import { useCart }     from '@/context/cart-context'
import { useWishlist } from '@/context/wishlist-context'
import type { ProductoFull } from '@/app/productos/[id]/page'

interface Props {
  producto: ProductoFull
}

type Talla = 'S' | 'M' | 'L'

const TALLAS: Talla[] = ['S', 'M', 'L']

function stockDe(producto: ProductoFull, talla: Talla): number {
  if (talla === 'S') return producto.talla_s
  if (talla === 'M') return producto.talla_m
  return producto.talla_l
}

export function ProductDetail({ producto }: Props) {
  const { addItem }              = useCart()
  const { toggle, isWishlisted } = useWishlist()

  const [selectedTalla, setSelectedTalla] = useState<Talla | null>(null)
  const [copied, setCopied]               = useState(false)
  const [added, setAdded]                 = useState(false)

  const priceStr = `RD$ ${Number(producto.precio).toLocaleString('es-DO')}`

  // Numeric id derivado del UUID para cart/wishlist
  const numId = producto.id
    .split('-')
    .reduce((acc, part) => acc ^ parseInt(part, 16), 0)

  const handleShare = useCallback(async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: producto.nombre, url }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(url).catch(() => {})
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }, [producto.nombre])

  const handleAddToCart = useCallback(() => {
    if (!selectedTalla) return
    addItem({
      id:        numId,
      productId: producto.id,   // UUID real para descontar stock
      name:      `${producto.nombre} — Talla ${selectedTalla}`,
      price:     priceStr,
      priceNum:  producto.precio,
      bg:        producto.bg,
      size:      selectedTalla,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }, [selectedTalla, addItem, numId, producto, priceStr])

  const agotado = producto.talla_s === 0 && producto.talla_m === 0 && producto.talla_l === 0

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-16">

      {/* ── Breadcrumb ────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-xs tracking-[0.12em] uppercase font-sans text-brand-muted mb-10">
        <Link href="/" className="hover:text-brand-primary transition-colors">Inicio</Link>
        <span>/</span>
        {producto.categoria_slug && (
          <>
            <Link
              href={`/categorias/${producto.categoria_slug}`}
              className="hover:text-brand-primary transition-colors"
            >
              {producto.categoria_nombre ?? producto.categoria_slug}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-brand-deep">{producto.nombre}</span>
      </nav>

      {/* ── Layout principal ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20">

        {/* Imagen */}
        <div
          className="relative aspect-[3/4] rounded-sm overflow-hidden w-full"
          style={{ backgroundColor: producto.bg }}
        >
          {producto.foto_url ? (
            <Image
              src={producto.foto_url}
              alt={producto.nombre}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-brand-ivory/30 text-xs tracking-widest uppercase rotate-90 select-none">
                {producto.nombre}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-6 lg:pt-4">

          {/* Nombre + precio */}
          <div>
            <h1 className="font-heading text-4xl lg:text-5xl text-brand-deep leading-tight mb-3">
              {producto.nombre}
            </h1>
            <p className="font-heading text-2xl text-brand-primary">
              {priceStr}
            </p>
          </div>

          {/* Descripción */}
          {producto.descripcion && (
            <p className="text-sm font-sans text-brand-muted leading-relaxed">
              {producto.descripcion}
            </p>
          )}

          {/* Separador */}
          <div className="border-t border-brand-border" />

          {/* Selector de talla */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs tracking-[0.15em] uppercase font-sans text-brand-muted">
                Talla
              </span>
              {selectedTalla && (
                <span className="text-xs font-sans text-brand-deep">
                  Seleccionada: <strong>{selectedTalla}</strong>
                </span>
              )}
            </div>

            {agotado ? (
              <p className="text-sm font-sans text-brand-muted italic">
                Este producto está agotado temporalmente.
              </p>
            ) : (
              <div className="flex gap-3">
                {TALLAS.map((talla) => {
                  const stock     = stockDe(producto, talla)
                  const sinStock  = stock === 0
                  const selected  = selectedTalla === talla

                  return (
                    <button
                      key={talla}
                      disabled={sinStock}
                      onClick={() => setSelectedTalla(selected ? null : talla)}
                      className={[
                        'relative w-14 h-14 rounded-sm border text-sm font-sans font-medium transition-all duration-200',
                        sinStock
                          ? 'border-brand-border text-brand-border cursor-not-allowed'
                          : selected
                            ? 'border-brand-deep bg-brand-deep text-brand-ivory'
                            : 'border-brand-border text-brand-deep hover:border-brand-primary hover:text-brand-primary',
                      ].join(' ')}
                    >
                      {talla}
                      {sinStock && (
                        /* Línea diagonal "agotado" */
                        <span
                          className="absolute inset-0 flex items-center justify-center pointer-events-none"
                          aria-hidden
                        >
                          <span className="block w-[1px] h-[60%] bg-brand-border rotate-45 origin-center" />
                        </span>
                      )}
                      {!sinStock && (
                        <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-brand-ivory text-brand-muted px-1 rounded-sm border border-brand-border leading-none">
                          {stock}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Botón agregar al carrito */}
          <button
            onClick={handleAddToCart}
            disabled={!selectedTalla || agotado}
            className={[
              'w-full py-4 flex items-center justify-center gap-3 text-sm tracking-[0.1em] uppercase font-sans rounded-sm transition-all duration-300',
              !selectedTalla || agotado
                ? 'bg-brand-border text-brand-muted cursor-not-allowed'
                : added
                  ? 'bg-green-600 text-white'
                  : 'bg-brand-deep text-white hover:bg-brand-primary',
            ].join(' ')}
          >
            {added ? (
              <>
                <Check size={16} />
                Agregado al carrito
              </>
            ) : (
              <>
                <ShoppingBag size={16} />
                {!selectedTalla ? 'Selecciona una talla' : 'Agregar al carrito'}
              </>
            )}
          </button>

          {/* Acciones secundarias */}
          <div className="flex gap-4">
            <button
              onClick={() => toggle({
                id:       numId,
                productId: producto.id,
                name:     producto.nombre,
                price:    priceStr,
                priceNum: producto.precio,
                bg:       producto.bg,
              })}
              className="flex items-center gap-2 text-xs tracking-[0.1em] uppercase font-sans text-brand-muted hover:text-brand-primary transition-colors"
            >
              <Heart
                size={15}
                className={isWishlisted(numId) ? 'fill-brand-primary text-brand-primary' : ''}
              />
              {isWishlisted(numId) ? 'En favoritos' : 'Guardar'}
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-2 text-xs tracking-[0.1em] uppercase font-sans text-brand-muted hover:text-brand-primary transition-colors"
            >
              {copied ? (
                <>
                  <Check size={15} className="text-green-600" />
                  <span className="text-green-600">¡Link copiado!</span>
                </>
              ) : (
                <>
                  <Share2 size={15} />
                  Compartir
                </>
              )}
            </button>
          </div>

          {/* Separador */}
          <div className="border-t border-brand-border" />

          {/* Volver */}
          {producto.categoria_slug && (
            <Link
              href={`/categorias/${producto.categoria_slug}`}
              className="flex items-center gap-2 text-xs tracking-[0.12em] uppercase font-sans text-brand-muted hover:text-brand-primary transition-colors w-fit"
            >
              <ArrowLeft size={14} />
              Volver a {producto.categoria_nombre ?? producto.categoria_slug}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
