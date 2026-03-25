'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Heart, ShoppingBag } from 'lucide-react'
import { useCart } from '@/context/cart-context'
import { useWishlist } from '@/context/wishlist-context'

const ALL_PRODUCTS = [
  { id: 1,   productId: '00000000-0000-0000-0000-000000000001', name: 'Vestido Midi Terracota',      price: 'RD$ 4,800', priceNum: 4800, bg: '#C9A9A6' },
  { id: 2,   productId: '00000000-0000-0000-0000-000000000002', name: 'Set Lino Champagne',           price: 'RD$ 5,400', priceNum: 5400, bg: '#C8B89A' },
  { id: 3,   productId: '00000000-0000-0000-0000-000000000003', name: 'Blusa Seda Nude',              price: 'RD$ 2,900', priceNum: 2900, bg: '#DBBDAF' },
  { id: 4,   productId: '00000000-0000-0000-0000-000000000004', name: 'Pantalón Palazzo Beige',       price: 'RD$ 3,600', priceNum: 3600, bg: '#BCA88E' },
  { id: 101, productId: '00000000-0000-0000-0000-000000000101', name: 'Vestido Lino Blush',           price: 'RD$ 5,200', priceNum: 5200, bg: '#D4B5B0' },
  { id: 102, productId: '00000000-0000-0000-0000-000000000102', name: 'Set Satén Champagne',          price: 'RD$ 6,100', priceNum: 6100, bg: '#C8B99A' },
  { id: 103, productId: '00000000-0000-0000-0000-000000000103', name: 'Blusa Bordada Ivory',          price: 'RD$ 3,100', priceNum: 3100, bg: '#E0D0C4' },
  { id: 104, productId: '00000000-0000-0000-0000-000000000104', name: 'Pantalón Culotte Terracota',   price: 'RD$ 3,800', priceNum: 3800, bg: '#BF8E88' },
  { id: 105, productId: '00000000-0000-0000-0000-000000000105', name: 'Vestido Mini Nude',            price: 'RD$ 4,400', priceNum: 4400, bg: '#CDBDB5' },
  { id: 106, productId: '00000000-0000-0000-0000-000000000106', name: 'Co-ord Pastel Sand',           price: 'RD$ 5,700', priceNum: 5700, bg: '#C5AE96' },
  { id: 107, productId: '00000000-0000-0000-0000-000000000107', name: 'Blusa Off-Shoulder Rosa',      price: 'RD$ 2,800', priceNum: 2800, bg: '#D8B2AC' },
  { id: 108, productId: '00000000-0000-0000-0000-000000000108', name: 'Falda Midi Plisada',           price: 'RD$ 3,400', priceNum: 3400, bg: '#B9A898' },
]

interface SearchOverlayProps {
  open: boolean
  onClose: () => void
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { addItem } = useCart()
  const { toggle, isWishlisted } = useWishlist()

  // Autofocus & reset query on open
  useEffect(() => {
    if (open) {
      setQuery('')
      const t = setTimeout(() => inputRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const trimmed = query.trim()
  const results = trimmed.length > 1
    ? ALL_PRODUCTS.filter((p) =>
        p.name.toLowerCase().includes(trimmed.toLowerCase())
      )
    : []

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-brand-deep/40 z-50 backdrop-blur-sm"
          />

          {/* Panel slides down from top */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="fixed top-0 left-0 right-0 z-50 bg-brand-ivory shadow-2xl shadow-brand-deep/10"
          >
            {/* Input bar */}
            <div className="max-w-3xl mx-auto px-6 lg:px-8 pt-7 pb-4">
              <div className="flex items-center gap-3 border-b-2 border-brand-primary pb-3">
                <Search size={18} className="text-brand-primary shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar piezas…"
                  className="flex-1 bg-transparent font-heading text-2xl lg:text-3xl text-brand-deep placeholder:text-brand-border/70 outline-none"
                />
                <button
                  onClick={onClose}
                  aria-label="Cerrar búsqueda"
                  className="text-brand-muted hover:text-brand-deep transition-colors duration-200 shrink-0"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="max-w-3xl mx-auto px-6 lg:px-8 pb-8 overflow-y-auto max-h-[60vh]">
              {trimmed.length <= 1 && (
                <p className="text-center text-sm text-brand-muted font-sans py-8 tracking-wide">
                  Escribe el nombre de la pieza que buscas
                </p>
              )}

              {trimmed.length > 1 && results.length === 0 && (
                <p className="text-center text-sm text-brand-muted font-sans py-8">
                  No encontramos piezas para{' '}
                  <span className="text-brand-deep font-medium">"{trimmed}"</span>
                </p>
              )}

              {results.length > 0 && (
                <motion.ul
                  initial="hidden"
                  animate="visible"
                  variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
                  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pt-5"
                >
                  {results.map((product) => (
                    <motion.li
                      key={product.id}
                      variants={{
                        hidden: { opacity: 0, y: 14 },
                        visible: { opacity: 1, y: 0 },
                      }}
                      className="group"
                    >
                      {/* Card */}
                      <div
                        className="relative aspect-[3/4] rounded-sm mb-2.5 overflow-hidden"
                        style={{ backgroundColor: product.bg }}
                      >
                        {/* Wishlist */}
                        <button
                          onClick={(e) => { e.preventDefault(); toggle(product) }}
                          aria-label="Favorito"
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 flex items-center justify-center transition-all duration-200 hover:scale-110"
                        >
                          <Heart
                            size={13}
                            className={
                              isWishlisted(product.id)
                                ? 'fill-brand-primary text-brand-primary'
                                : 'text-brand-muted'
                            }
                          />
                        </button>

                        {/* Add to cart */}
                        <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
                          <button
                            onClick={() => {
                              addItem({
                                id: product.id,
                                productId: product.productId,
                                name: product.name,
                                price: product.price,
                                priceNum: product.priceNum,
                                bg: product.bg,
                              })
                              onClose()
                            }}
                            className="w-full py-2 bg-brand-ivory/95 text-brand-deep text-[10px] tracking-[0.1em] uppercase font-sans hover:bg-brand-primary hover:text-brand-ivory transition-colors duration-300 flex items-center justify-center gap-1.5"
                          >
                            <ShoppingBag size={11} />
                            Agregar
                          </button>
                        </div>
                      </div>

                      <p className="font-heading text-sm text-brand-deep leading-tight">
                        {product.name}
                      </p>
                      <p className="text-xs text-brand-muted font-sans mt-0.5">
                        {product.price}
                      </p>
                    </motion.li>
                  ))}
                </motion.ul>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
