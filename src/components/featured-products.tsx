'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { useCart } from '@/context/cart-context'
import { useWishlist } from '@/context/wishlist-context'

const products = [
  { id: 1, productId: '00000000-0000-0000-0000-000000000001', name: 'Vestido Midi Terracota', price: 'RD$ 4,800', priceNum: 4800, oldPrice: 'RD$ 6,200', badge: 'Nuevo', bg: '#C9A9A6' },
  { id: 2, productId: '00000000-0000-0000-0000-000000000002', name: 'Set Lino Champagne', price: 'RD$ 5,400', priceNum: 5400, oldPrice: null, badge: null, bg: '#C8B89A' },
  { id: 3, productId: '00000000-0000-0000-0000-000000000003', name: 'Blusa Seda Nude', price: 'RD$ 2,900', priceNum: 2900, oldPrice: 'RD$ 3,500', badge: 'Favorita', bg: '#DBBDAF' },
  { id: 4, productId: '00000000-0000-0000-0000-000000000004', name: 'Pantalón Palazzo Beige', price: 'RD$ 3,600', priceNum: 3600, oldPrice: null, badge: null, bg: '#BCA88E' },
]

export function FeaturedProducts() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const { addItem } = useCart()
  const { toggle, isWishlisted } = useWishlist()

  return (
    <section id="coleccion" ref={ref} className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12 lg:mb-16"
        >
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-brand-primary mb-3 font-sans">
              Colección
            </p>
            <h2 className="font-heading text-4xl lg:text-5xl text-brand-deep">
              Piezas destacadas
            </h2>
          </div>
          <Link
            href="#coleccion"
            className="text-sm tracking-[0.08em] uppercase text-brand-muted hover:text-brand-primary transition-colors duration-300 font-sans self-start sm:self-auto border-b border-brand-border pb-0.5"
          >
            Ver todo
          </Link>
        </motion.div>

        {/* Product grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {products.map((product, i) => (
            <motion.article
              key={product.id}
              initial={{ opacity: 0, y: 28 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Link href={`#producto-${product.id}`} className="group block">
                {/* Image */}
                <div
                  className="relative overflow-hidden rounded-sm aspect-[3/4] mb-4"
                  style={{ backgroundColor: product.bg }}
                >
                  {/* Placeholder text */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[9px] text-brand-ivory/30 tracking-widest uppercase rotate-90 select-none">
                      {product.name} · 600×800px
                    </span>
                  </div>

                  {/* Hover zoom */}
                  <div className="absolute inset-0 scale-100 group-hover:scale-105 transition-transform duration-700 ease-out" />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-brand-deep/0 group-hover:bg-brand-deep/10 transition-colors duration-500" />

                  {/* Badge */}
                  {product.badge && (
                    <div className="absolute top-3 left-3">
                      <span className="inline-block px-2 py-0.5 text-[10px] tracking-[0.1em] uppercase bg-brand-ivory text-brand-primary font-sans">
                        {product.badge}
                      </span>
                    </div>
                  )}

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

                {/* Info */}
                <div>
                  <p className="font-heading text-lg text-brand-deep group-hover:text-brand-primary transition-colors duration-300 leading-tight mb-1">
                    {product.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-brand-deep font-sans font-medium">
                      {product.price}
                    </span>
                    {product.oldPrice && (
                      <span className="text-xs text-brand-muted line-through font-sans">
                        {product.oldPrice}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
