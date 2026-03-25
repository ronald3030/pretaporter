'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShoppingBag, Search, Heart, Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '@/context/cart-context'
import { useWishlist } from '@/context/wishlist-context'
import { CartDrawer } from '@/components/cart-drawer'
import { WishlistDrawer } from '@/components/wishlist-drawer'
import { SearchOverlay } from '@/components/search-overlay'

const navLinks = [
  { label: 'Nueva Colección', href: '/coleccion' },
  { label: 'Categorías', href: '/categorias' },
  { label: 'Novedades', href: '/novedades' },
  { label: 'Contacto', href: '/contacto' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { totalItems, openCart } = useCart()
  const { total: totalWishlist, openWishlist } = useWishlist()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-md shadow-[0_1px_0_0_#E6D8CC]'
            : 'bg-transparent'
        }`}
      >
        <nav className="max-w-7xl mx-auto px-6 lg:px-8 h-16 lg:h-20 flex items-center justify-between gap-8">
          {/* Logo */}
          <Link
            href="/"
            className="flex-shrink-0 font-heading text-xl lg:text-2xl tracking-[0.12em] uppercase text-brand-deep hover:text-brand-primary transition-colors duration-300"
          >
            Prêt à Porter
          </Link>

          {/* Desktop nav links */}
          <ul className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="text-sm tracking-[0.06em] uppercase text-brand-muted hover:text-brand-deep transition-colors duration-300 relative group"
                >
                  {link.label}
                  <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-brand-primary transition-all duration-300 group-hover:w-full" />
                </Link>
              </li>
            ))}
          </ul>

          {/* Icons */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              aria-label="Buscar"
              onClick={() => setSearchOpen(true)}
              className="flex text-brand-muted hover:text-brand-deep transition-colors duration-300"
            >
              <Search size={18} />
            </button>
            <button
              aria-label={`Favoritos — ${totalWishlist} piezas`}
              onClick={openWishlist}
              className="flex relative text-brand-muted hover:text-brand-deep transition-colors duration-300"
            >
              <Heart size={18} />
              {totalWishlist > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-brand-primary text-[9px] text-white font-sans flex items-center justify-center leading-none">
                  {totalWishlist}
                </span>
              )}
            </button>
            <button
              aria-label={`Carrito — ${totalItems} piezas`}
              onClick={openCart}
              className="relative text-brand-muted hover:text-brand-deep transition-colors duration-300"
            >
              <ShoppingBag size={18} />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-brand-primary text-[9px] text-white font-sans flex items-center justify-center leading-none">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Mobile hamburger */}
            <button
              aria-label="Menú"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-brand-deep"
            >
              <Menu size={22} />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile menu */}
      <CartDrawer />
      <WishlistDrawer />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-brand-deep/40 z-50 backdrop-blur-sm"
            />
            <motion.nav
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 bottom-0 w-72 bg-brand-ivory z-50 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-6 h-16 border-b border-brand-border">
                <span className="font-heading text-xl tracking-widest uppercase text-brand-deep">
                  Menú
                </span>
                <button onClick={() => setMobileOpen(false)} className="text-brand-muted hover:text-brand-deep">
                  <X size={22} />
                </button>
              </div>
              <ul className="flex flex-col gap-1 p-6">
                {navLinks.map((link, i) => (
                  <motion.li
                    key={link.label}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="block py-3 text-sm tracking-widest uppercase text-brand-muted hover:text-brand-deep border-b border-brand-border/50 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </motion.li>
                ))}
              </ul>
              <div className="mt-auto border-t border-brand-border">
                <div className="px-6 py-4 flex items-center gap-5">
                  <button
                    onClick={() => { setMobileOpen(false); setSearchOpen(true) }}
                    className="flex items-center gap-2 text-xs tracking-widest uppercase text-brand-muted hover:text-brand-deep transition-colors"
                  >
                    <Search size={14} />
                    Buscar
                  </button>
                  <span className="text-brand-border select-none">·</span>
                  <button
                    onClick={() => { setMobileOpen(false); openWishlist() }}
                    className="flex items-center gap-2 text-xs tracking-widest uppercase text-brand-muted hover:text-brand-deep transition-colors"
                  >
                    <Heart size={14} />
                    Favoritos{totalWishlist > 0 ? ` (${totalWishlist})` : ''}
                  </button>
                </div>
                <div className="px-6 pb-5 border-t border-brand-border/50">
                  <p className="text-xs tracking-widest uppercase text-brand-muted">Santo Domingo, RD</p>
                </div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
