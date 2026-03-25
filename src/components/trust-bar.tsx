'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { MapPin, Truck, Users, Sparkles } from 'lucide-react'

const items = [
  {
    icon: MapPin,
    title: 'Tienda física',
    desc: 'Plaza Castilla, Santo Domingo',
  },
  {
    icon: Truck,
    title: 'Envíos en toda RD',
    desc: 'Rápido y seguro a tu puerta',
  },
  {
    icon: Users,
    title: '+20K clientas felices',
    desc: 'Tu satisfacción, nuestra prioridad',
  },
  {
    icon: Sparkles,
    title: 'Piezas elegantes',
    desc: 'Selección curada con estilo',
  },
]

export function TrustBar() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section ref={ref} className="bg-brand-deep py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {items.map((item, i) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex flex-col items-start gap-3"
              >
                <div className="w-9 h-9 flex items-center justify-center rounded-full border border-brand-accent/40">
                  <Icon size={16} className="text-brand-accent" />
                </div>
                <div>
                  <p className="font-heading text-lg text-brand-ivory leading-tight">
                    {item.title}
                  </p>
                  <p className="text-xs text-brand-soft/70 mt-0.5 font-sans">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
