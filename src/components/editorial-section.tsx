'use client'

import Image from 'next/image'
import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import Link from 'next/link'

export function EditorialSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const [imgError, setImgError] = useState(false)

  return (
    <section ref={ref} className="py-20 lg:py-0 bg-brand-sand overflow-hidden">
      <div className="max-w-7xl mx-auto lg:grid lg:grid-cols-2 lg:min-h-[640px]">

        {/* Image side */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative min-h-[420px] lg:min-h-0 overflow-hidden"
          style={imgError ? {
            background: 'linear-gradient(160deg, #B56F6A 0%, #C9918C 40%, #D8B7AF 80%, #E9DED2 100%)',
          } : undefined}
        >
          {!imgError && (
            <Image
              src="/editorial-pool.jpg"
              alt="Prêt à Porter — Piezas para cada ocasión"
              fill
              className="object-cover object-center"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
              onError={() => setImgError(true)}
            />
          )}
        </motion.div>

        {/* Text side */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
          className="flex flex-col justify-center px-6 py-16 lg:px-16 lg:py-20"
        >
          <p className="text-xs tracking-[0.2em] uppercase text-brand-primary mb-6 font-sans">
            Nuestra filosofía
          </p>

          <h2 className="font-heading text-4xl lg:text-5xl text-brand-deep leading-[1.1] mb-8">
            Piezas para{' '}
            <span className="italic text-brand-primary">cada ocasión</span>
          </h2>

          <p className="text-brand-muted leading-relaxed mb-6 font-sans text-base lg:text-lg">
            Desde looks refinados para el día a día hasta opciones ideales para
            eventos y salidas especiales. En Prêt à Porter entendemos que la
            moda no es solo ropa — es cómo te sientes cuando entras a una
            habitación.
          </p>

          <p className="text-brand-muted leading-relaxed mb-10 font-sans">
            Cada pieza es seleccionada con cuidado para mujeres que aprecian la
            calidad, el detalle y la elegancia sin esfuerzo.
          </p>

          <Link
            href="/coleccion"
            className="self-start inline-flex items-center gap-3 text-sm tracking-[0.1em] uppercase text-brand-deep font-sans group"
          >
            <span className="border-b border-brand-primary pb-0.5 group-hover:text-brand-primary transition-colors duration-300">
              Descubrir colección
            </span>
            <span className="w-8 h-px bg-brand-primary group-hover:w-12 transition-all duration-300" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
