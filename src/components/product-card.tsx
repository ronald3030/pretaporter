'use client'

import { motion } from 'framer-motion'
import Image      from 'next/image'
import Link       from 'next/link'
import { Heart }  from 'lucide-react'
import { useWishlist } from '@/context/wishlist-context'

export interface ProductCardData {
  id:       number | string
  nombre:   string
  precio:   number
  foto_url: string | null
  bg:       string
  talla_s?: number
  talla_m?: number
  talla_l?: number
}

interface ProductCardProps {
  product: ProductCardData
  index?:  number
}

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { toggle, isWishlisted } = useWishlist()

  const numId = typeof product.id === 'string'
    ? product.id.split('-').reduce((acc, p) => acc ^ parseInt(p, 16), 0)
    : product.id

  const priceStr = `RD$ ${Number(product.precio).toLocaleString('es-DO')}`

  const totalStock =
    (product.talla_s ?? 0) + (product.talla_m ?? 0) + (product.talla_l ?? 0)
  const agotado = product.talla_s !== undefined && totalStock === 0

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07 }}
    >
      <Link href={`/productos/${product.id}`} className="group block">

        {/* ── Imagen ─────────────────────────────────────── */}
        <div
          className="relative overflow-hidden rounded-sm aspect-[3/4] mb-4"
          style={{ backgroundColor: product.bg }}
        >
          {product.foto_url ? (
            <Image
              src={product.foto_url}
              alt={`${product.nombre} — Prêt à Porter Santo Domingo`}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[9px] text-brand-ivory/30 tracking-widest uppercase rotate-90 select-none">
                {product.nombre}
              </span>
            </div>
          )}

          {/* Overlay hover */}
          <div className="absolute inset-0 bg-brand-deep/0 group-hover:bg-brand-deep/10 transition-colors duration-500" />

          {/* Badge agotado */}
          {agotado && (
            <div className="absolute inset-0 bg-brand-deep/30 flex items-center justify-center pointer-events-none">
              <span className="text-brand-ivory text-[10px] tracking-widest uppercase font-sans bg-brand-deep/60 px-3 py-1.5 rounded-sm">
                Agotado
              </span>
            </div>
          )}

          {/* Wishlist */}
          <button
            onClick={(e) => {
              e.preventDefault()
              toggle({
                id:       numId,
                productId: String(product.id),
                name:     product.nombre,
                price:    priceStr,
                priceNum: product.precio,
                bg:       product.bg,
                image:    product.foto_url ?? undefined,
              })
            }}
            aria-label="Agregar a favoritos"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center transition-all duration-200 hover:scale-110 opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
          >
            <Heart
              size={14}
              className={
                isWishlisted(numId)
                  ? 'fill-brand-primary text-brand-primary'
                  : 'text-brand-muted'
              }
            />
          </button>

          {/* "Ver pieza" hover */}
          <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-0 lg:translate-y-full lg:group-hover:translate-y-0 transition-transform duration-300 ease-out">
            <div className="w-full py-2.5 bg-brand-ivory/95 text-brand-deep text-xs tracking-[0.1em] uppercase font-sans text-center">
              Ver pieza
            </div>
          </div>
        </div>

        {/* ── Info ───────────────────────────────────────── */}
        <p className="font-heading text-lg text-brand-deep group-hover:text-brand-primary transition-colors duration-300 leading-tight mb-1">
          {product.nombre}
        </p>
        <span className="text-sm text-brand-deep font-sans font-medium">
          {priceStr}
        </span>
      </Link>
    </motion.article>
  )
}
