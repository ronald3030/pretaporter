'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Heart, Trash2, ShoppingBag } from 'lucide-react'
import Image from 'next/image'
import { useWishlist } from '@/context/wishlist-context'
import { useCart } from '@/context/cart-context'

export function WishlistDrawer() {
  const { items, open, closeWishlist, remove } = useWishlist()
  const { addItem, openCart } = useCart()

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeWishlist}
            className="fixed inset-0 bg-brand-deep/30 z-50 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-brand-ivory z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 h-16 border-b border-brand-border shrink-0">
              <div className="flex items-center gap-2.5">
                <Heart size={16} className="text-brand-primary fill-brand-primary/20" />
                <span className="font-heading text-xl tracking-wide text-brand-deep">
                  Favoritos
                </span>
                {items.length > 0 && (
                  <span className="text-xs text-brand-muted font-sans">({items.length})</span>
                )}
              </div>
              <button
                onClick={closeWishlist}
                className="text-brand-muted hover:text-brand-deep transition-colors duration-200"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-5 px-8 text-center">
                  <div className="w-16 h-16 rounded-full border border-brand-border flex items-center justify-center">
                    <Heart size={24} className="text-brand-border" />
                  </div>
                  <div>
                    <p className="font-heading text-2xl text-brand-deep mb-2">
                      Tu lista está vacía
                    </p>
                    <p className="text-sm text-brand-muted font-sans leading-relaxed">
                      Guarda las piezas que te gustan para encontrarlas fácilmente.
                    </p>
                  </div>
                  <button
                    onClick={closeWishlist}
                    className="mt-1 px-6 py-2.5 border border-brand-border text-sm tracking-[0.1em] uppercase text-brand-muted hover:border-brand-primary hover:text-brand-primary transition-colors duration-300 font-sans"
                  >
                    Seguir explorando
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-brand-border/50">
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <motion.li
                        key={item.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.22 }}
                        className="flex items-center gap-4 px-6 py-4 overflow-hidden"
                      >
                        {/* Thumbnail */}
                        <div
                          className="relative w-14 shrink-0 rounded-sm aspect-[3/4] overflow-hidden"
                          style={{ backgroundColor: item.bg }}
                        >
                          {item.image && (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-heading text-base text-brand-deep leading-tight truncate">
                            {item.name}
                          </p>
                          <p className="text-sm text-brand-muted font-sans mt-0.5">
                            {item.price}
                          </p>
                          <button
                            onClick={() => {
                              addItem({
                                id: item.id,
                                productId: item.productId,
                                name: item.name,
                                price: item.price,
                                priceNum: item.priceNum,
                                bg: item.bg,
                                image: item.image,
                              })
                              openCart()
                              closeWishlist()
                            }}
                            className="mt-2 flex items-center gap-1.5 text-xs tracking-[0.08em] uppercase text-brand-primary hover:text-brand-deep font-sans transition-colors duration-200"
                          >
                            <ShoppingBag size={12} />
                            Agregar al carrito
                          </button>
                        </div>

                        {/* Remove */}
                        <button
                          onClick={() => remove(item.id)}
                          aria-label="Quitar de favoritos"
                          className="text-brand-border hover:text-brand-primary transition-colors duration-200 shrink-0"
                        >
                          <Trash2 size={15} />
                        </button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
