'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-brand-sand">
      {/* Background decorative gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-ivory via-brand-sand to-brand-soft opacity-80" />

      {/* Decorative circle */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-brand-primary/8 translate-x-1/3 hidden lg:block" />
      <div className="absolute right-24 top-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full bg-brand-accent/10 hidden lg:block" />

      {/* Logo right side */}
      <div className="absolute right-0 top-0 bottom-0 w-full lg:w-1/2 hidden lg:flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-l from-brand-sand/60 via-brand-soft/30 to-transparent" />
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }}
          className="relative z-10 w-[840px] h-[840px]"
        >
          <Image
            src="/logo.png"
            alt="Prêt à Porter — Boutique de ropa femenina elegante en Santo Domingo, República Dominicana"
            fill
            sizes="420px"
            className="object-contain drop-shadow-xl"
            priority
          />
        </motion.div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 w-full py-24 lg:py-32">
        <div className="max-w-xl text-center lg:text-left">
          {/* Mobile logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
            className="relative w-56 h-56 mx-auto mb-8 lg:hidden"
          >
            <Image src="/logo.png" alt="Prêt à Porter — Boutique de ropa femenina en Santo Domingo" fill className="object-contain drop-shadow-lg" priority />
          </motion.div>

          {/* Eyebrow */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-xs tracking-[0.2em] uppercase text-brand-primary mb-6 font-sans"
          >
            Prêt à Porter · Santo Domingo
          </motion.p>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
            className="font-heading text-4xl sm:text-5xl lg:text-7xl leading-[1.05] text-brand-deep mb-6"
          >
            Elegancia moderna<br />
            <span className="italic text-brand-primary">para mujeres</span>
            <br />
            reales
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="text-base lg:text-lg text-brand-muted leading-relaxed mb-10 max-w-md font-sans"
          >
            Piezas seleccionadas para acompañarte con estilo,
            seguridad y feminidad en cada ocasión.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-wrap gap-4 justify-center lg:justify-start"
          >
            <Link
              href="/coleccion"
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-3.5 bg-brand-primary text-brand-ivory text-sm tracking-[0.08em] uppercase font-sans hover:bg-brand-deep transition-colors duration-300 rounded-sm"
            >
              Comprar colección
            </Link>
            <Link
              href="/contacto"
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-3.5 border border-brand-deep/30 text-brand-deep text-sm tracking-[0.08em] uppercase font-sans hover:border-brand-primary hover:text-brand-primary transition-colors duration-300 rounded-sm"
            >
              Visitar tienda
            </Link>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-10 lg:mt-14 flex items-center gap-4 justify-center lg:justify-start"
          >
            <div className="flex -space-x-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-brand-ivory bg-gradient-to-br from-brand-soft to-brand-primary"
                />
              ))}
            </div>
            <p className="text-sm text-brand-muted font-sans">
              <span className="text-brand-deep font-medium">+20K clientas</span>{' '}
              felices en toda RD
            </p>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="w-px h-10 bg-gradient-to-b from-brand-primary to-transparent"
        />
        <p className="text-[10px] tracking-[0.2em] uppercase text-brand-muted">Descubrir</p>
      </motion.div>
    </section>
  )
}
