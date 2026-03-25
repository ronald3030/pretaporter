'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { useCart } from '@/context/cart-context'

function formatPrice(num: number) {
  return 'RD$ ' + num.toLocaleString('es-DO')
}

export function CartDrawer() {
  const { items, open, totalItems, totalPrice, removeItem, updateQty, clear, closeCart } = useCart()

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="cart-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeCart}
            className="fixed inset-0 bg-brand-deep/40 z-50 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.aside
            key="cart-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-[420px] bg-brand-ivory z-50 flex flex-col shadow-2xl"
            aria-label="Carrito de compras"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 h-16 border-b border-brand-border flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <ShoppingBag size={18} className="text-brand-primary" />
                <span className="font-heading text-xl tracking-widest uppercase text-brand-deep">
                  Carrito
                </span>
                {totalItems > 0 && (
                  <span className="text-xs font-sans text-brand-muted">
                    ({totalItems} {totalItems === 1 ? 'pieza' : 'piezas'})
                  </span>
                )}
              </div>
              <button
                onClick={closeCart}
                aria-label="Cerrar carrito"
                className="text-brand-muted hover:text-brand-deep transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto py-6 px-6">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <ShoppingBag size={40} className="text-brand-border" />
                  <p className="font-heading text-2xl text-brand-deep">Tu carrito está vacío</p>
                  <p className="text-sm text-brand-muted font-sans">
                    Agrega piezas desde la colección o novedades.
                  </p>
                  <button
                    onClick={closeCart}
                    className="mt-2 text-xs tracking-[0.1em] uppercase font-sans text-brand-primary underline underline-offset-4 hover:text-brand-deep transition-colors"
                  >
                    Seguir comprando
                  </button>
                </div>
              ) : (
                <ul className="flex flex-col gap-5">
                  {items.map((item) => (
                    <li
                      key={`${item.id}-${item.size ?? ''}`}
                      className="flex gap-4 pb-5 border-b border-brand-border last:border-0 last:pb-0"
                    >
                      {/* Color swatch thumbnail */}
                      <div
                        className="w-20 h-24 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: item.bg }}
                      />

                      <div className="flex-1 min-w-0">
                        <p className="font-heading text-lg text-brand-deep leading-tight mb-0.5 truncate">
                          {item.name}
                        </p>
                        {item.size && (
                          <p className="text-xs font-sans text-brand-muted tracking-[0.08em] uppercase mb-1">
                            Talla {item.size}
                          </p>
                        )}
                        <p className="text-sm font-sans text-brand-muted mb-3">{item.price}</p>

                        {/* Qty controls */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQty(item.id, item.size, item.quantity - 1)}
                            aria-label="Reducir cantidad"
                            className="w-7 h-7 rounded-full border border-brand-border flex items-center justify-center text-brand-muted hover:border-brand-primary hover:text-brand-primary transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-6 text-center text-sm font-sans text-brand-deep">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQty(item.id, item.size, item.quantity + 1)}
                            aria-label="Aumentar cantidad"
                            className="w-7 h-7 rounded-full border border-brand-border flex items-center justify-center text-brand-muted hover:border-brand-primary hover:text-brand-primary transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                          <button
                            onClick={() => removeItem(item.id, item.size)}
                            aria-label="Eliminar del carrito"
                            className="ml-auto text-brand-muted hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="flex-shrink-0 border-t border-brand-border px-6 py-6 flex flex-col gap-4">
                {/* Total */}
                <div className="flex items-center justify-between">
                  <span className="text-sm tracking-[0.06em] uppercase font-sans text-brand-muted">
                    Total
                  </span>
                  <span className="font-heading text-2xl text-brand-deep">
                    {formatPrice(totalPrice)}
                  </span>
                </div>

                {/* Checkout */}
                <Link
                  href="/checkout"
                  onClick={closeCart}
                  className="w-full flex items-center justify-center gap-2.5 py-4 bg-brand-deep text-white text-sm tracking-[0.08em] uppercase font-sans rounded-sm hover:bg-brand-primary transition-colors duration-300"
                >
                  Proceder al pago
                </Link>

                {/* Clear cart */}
                <button
                  onClick={clear}
                  className="text-xs text-center text-brand-muted hover:text-red-400 font-sans transition-colors uppercase tracking-widest"
                >
                  Vaciar carrito
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
