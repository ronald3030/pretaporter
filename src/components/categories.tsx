'use client'

import Image       from 'next/image'
import { motion, useInView } from 'framer-motion'
import { useRef }  from 'react'
import Link        from 'next/link'

export interface CategoriaItem {
  id:        string
  nombre:    string
  slug:      string
  bg:        string
  orden:     number
  foto_url?: string | null
}

interface CategoriesProps {
  categories: CategoriaItem[]
}

export function Categories({ categories }: CategoriesProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  if (categories.length === 0) return null

  const colsClass =
    categories.length <= 3
      ? 'grid-cols-2 lg:grid-cols-3'
      : categories.length === 4
      ? 'grid-cols-2 lg:grid-cols-4'
      : 'grid-cols-2 lg:grid-cols-5'

  return (
    <section id="categorias" ref={ref} className="py-20 lg:py-28 bg-brand-ivory">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-12 lg:mb-16"
        >
          <p className="text-xs tracking-[0.2em] uppercase text-brand-primary mb-3 font-sans">
            Explora
          </p>
          <h2 className="font-heading text-4xl lg:text-5xl text-brand-deep">
            Nuestras categorías
          </h2>
        </motion.div>

        {/* Grid — columnas adaptables según cantidad */}
        <div className={`grid ${colsClass} gap-3 lg:gap-4`}>
          {categories.map((cat, i) => {
            const isLastOdd =
              categories.length % 2 !== 0 && i === categories.length - 1
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 24 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={isLastOdd ? 'col-span-2 lg:col-span-1' : ''}
              >
                <Link href={`/categorias/${cat.slug}`} className="group block">
                  {/* Contenedor de imagen */}
                  <div
                    className="relative overflow-hidden rounded-sm aspect-[3/4] mb-3"
                    style={{ backgroundColor: cat.bg }}
                  >
                    {/* Imagen real si existe */}
                    {cat.foto_url && (
                      <Image
                        src={cat.foto_url}
                        alt={`${cat.nombre} — ropa femenina Prêt à Porter Santo Domingo`}
                        fill
                        sizes="(max-width: 768px) 50vw, 20vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    )}

                    {/* Overlay gradiente */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-60" />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-brand-deep/0 group-hover:bg-brand-deep/15 transition-colors duration-500" />

                    {/* Placeholder si no hay foto */}
                    {!cat.foto_url && (
                      <div className="absolute inset-0 scale-100 group-hover:scale-105 transition-transform duration-700 ease-out">
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-[10px] text-brand-ivory/30 tracking-widest uppercase rotate-90 select-none">
                            {cat.nombre} · 600×800
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="font-heading text-xl text-brand-deep group-hover:text-brand-primary transition-colors duration-300">
                    {cat.nombre}
                  </p>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
