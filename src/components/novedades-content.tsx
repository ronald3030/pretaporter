'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { useCart } from '@/context/cart-context'
import { useWishlist } from '@/context/wishlist-context'

const novedades = [
  { id: 101, productId: '00000000-0000-0000-0000-000000000101', name: 'Vestido Lino Blush', price: 'RD$ 5,200', priceNum: 5200, badge: 'Nuevo', bg: '#D4B5B0' },
  { id: 102, productId: '00000000-0000-0000-0000-000000000102', name: 'Set Satén Champagne', price: 'RD$ 6,100', priceNum: 6100, badge: 'Nuevo', bg: '#C8B99A' },
  { id: 103, productId: '00000000-0000-0000-0000-000000000103', name: 'Blusa Bordada Ivory', price: 'RD$ 3,100', priceNum: 3100, badge: 'Nuevo', bg: '#E0D0C4' },
  { id: 104, productId: '00000000-0000-0000-0000-000000000104', name: 'Pantalón Culotte Terracota', price: 'RD$ 3,800', priceNum: 3800, badge: 'Nuevo', bg: '#BF8E88' },
  { id: 105, productId: '00000000-0000-0000-0000-000000000105', name: 'Vestido Mini Nude', price: 'RD$ 4,400', priceNum: 4400, badge: 'Nuevo', bg: '#CDBDB5' },
  { id: 106, productId: '00000000-0000-0000-0000-000000000106', name: 'Co-ord Pastel Sand', price: 'RD$ 5,700', priceNum: 5700, badge: 'Nuevo', bg: '#C5AE96' },
  { id: 107, productId: '00000000-0000-0000-0000-000000000107', name: 'Blusa Off-Shoulder Rosa', price: 'RD$ 2,800', priceNum: 2800, badge: 'Nuevo', bg: '#D8B2AC' },
  { id: 108, productId: '00000000-0000-0000-0000-000000000108', name: 'Falda Midi Plisada', price: 'RD$ 3,400', priceNum: 3400, badge: 'Nuevo', bg: '#B9A898' },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

export function NovedadesContent() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  const { addItem } = useCart()
  const { toggle, isWishlisted } = useWishlist()

  return (
    <section className="py-16 lg:py-24 bg-brand-ivory min-h-screen">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12 lg:mb-16"
        >
          <p className="text-xs tracking-[0.2em] uppercase text-brand-primary mb-3 font-sans">
            Recién llegados
          </p>
          <h1 className="font-heading text-5xl lg:text-6xl text-brand-deep mb-4">
            Novedades
          </h1>
          <p className="text-brand-muted font-sans max-w-lg">
            Las piezas más frescas de nuestra colección. Nuevos ingresos cada semana
            seleccionados para la mujer elegante y moderna.
          </p>
        </motion.div>

        {/* Grid */}
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6"
        >
          {novedades.map((product) => (
            <motion.article key={product.id} variants={itemVariants}>
              <Link href={`#producto-${product.id}`} className="group block">
                {/* Image */}
                <div
                  className="relative overflow-hidden rounded-sm aspect-[3/4] mb-4"
                  style={{ backgroundColor: product.bg }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[9px] text-brand-ivory/30 tracking-widest uppercase rotate-90 select-none">
                      {product.name} · 600×800px
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-brand-deep/0 group-hover:bg-brand-deep/10 transition-colors duration-500" />
                  <div className="absolute inset-0 scale-100 group-hover:scale-105 transition-transform duration-700 ease-out" />

                  {/* Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="inline-block px-2 py-0.5 text-[10px] tracking-[0.1em] uppercase bg-brand-ivory text-brand-primary font-sans">
                      {product.badge}
                    </span>
                  </div>

                  {/* Wishlist */}
                  <button
                    onClick={(e) => { e.preventDefault(); toggle({ id: product.id, productId: product.productId, name: product.name, price: product.price, priceNum: product.priceNum, bg: product.bg }) }}
                    aria-label="Agregar a favoritos"
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center transition-all duration-200 hover:scale-110 opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                  >
                    <Heart
                      size={14}
                      className={isWishlisted(product.id) ? 'fill-brand-primary text-brand-primary' : 'text-brand-muted'}
                    />
                  </button>

                  {/* Quick add */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-0 lg:translate-y-full lg:group-hover:translate-y-0 transition-transform duration-300 ease-out">
                    <button
                      onClick={(e) => { e.preventDefault(); addItem({ id: product.id, productId: product.productId, name: product.name, price: product.price, priceNum: product.priceNum, bg: product.bg }) }}
                      className="w-full py-2.5 bg-brand-ivory/95 text-brand-deep text-xs tracking-[0.1em] uppercase font-sans hover:bg-brand-primary hover:text-brand-ivory transition-colors duration-300"
                    >
                      Agregar al carrito
                    </button>
                  </div>
                </div>

                <p className="font-heading text-lg text-brand-deep group-hover:text-brand-primary transition-colors duration-300 leading-tight mb-1">
                  {product.name}
                </p>
                <span className="text-sm text-brand-deep font-sans font-medium">
                  {product.price}
                </span>
              </Link>
            </motion.article>
          ))}
        </motion.div>

        {/* Back link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-16 text-center"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-sm tracking-[0.1em] uppercase text-brand-muted hover:text-brand-primary font-sans transition-colors duration-300"
          >
            <span className="w-6 h-px bg-brand-border" />
            Volver al inicio
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
