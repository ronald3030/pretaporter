'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { MapPin, Clock, MessageCircle, Plane, Truck } from 'lucide-react'
import Link from 'next/link'

const shippingZones = [
  {
    icon: Truck,
    title: 'República Dominicana',
    lines: [
      'Envíos a todo el país',
      'Santo Domingo: 1–2 días hábiles',
      'Interior del país: 2–4 días hábiles',
      'Costo según zona — consultar por WhatsApp',
    ],
    accent: 'border-brand-primary/30',
  },
  {
    icon: Plane,
    title: 'Estados Unidos',
    lines: [
      'Envíos a todo USA',
      'Tiempo estimado: 5–10 días hábiles',
      'Envío por courier internacional',
      'Costo calculado al momento del pedido',
    ],
    accent: 'border-brand-accent/40',
  },
]

export function ContactoContent() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  const whatsappMessage = encodeURIComponent(
    '¡Hola! Vi su tienda en línea y me gustaría obtener más información.'
  )

  return (
    <div className="bg-brand-ivory min-h-screen">
      {/* Page header */}
      <div className="py-16 lg:py-20 bg-brand-sand">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs tracking-[0.2em] uppercase text-brand-primary mb-3 font-sans">
              Estamos aquí para ti
            </p>
            <h1 className="font-heading text-5xl lg:text-6xl text-brand-deep">
              Contacto & Envíos
            </h1>
          </motion.div>
        </div>
      </div>

      {/* Tienda física */}
      <section ref={ref} className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-start">
            {/* Map placeholder */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.7 }}
              className="rounded-sm overflow-hidden h-80 lg:h-[420px] border border-brand-border shadow-sm"
          >
            <iframe
              src="https://maps.google.com/maps?q=18.4680522,-69.9313699&z=17&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Prêt à Porter - Plaza Castilla, Santo Domingo"
            />
          </motion.div>

            {/* Store info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="flex flex-col gap-8"
            >
              {/* Section label */}
              <div>
                <p className="text-xs tracking-[0.2em] uppercase text-brand-primary mb-2 font-sans">
                  Tienda física
                </p>
                <h2 className="font-heading text-3xl lg:text-4xl text-brand-deep">
                  Visítanos en Santo Domingo
                </h2>
              </div>

              {/* Address */}
              <div className="flex gap-4">
                <div className="w-10 h-10 flex-shrink-0 rounded-full border border-brand-border flex items-center justify-center">
                  <MapPin size={16} className="text-brand-primary" />
                </div>
                <div>
                  <p className="font-heading text-xl text-brand-deep mb-1">Dirección</p>
                  <p className="text-brand-muted font-sans leading-relaxed">
                    Abraham Lincoln 617, Local 25A
                    <br />
                    Plaza Castilla
                    <br />
                    Santo Domingo, República Dominicana
                  </p>
                  <a
                    href="https://www.google.com/maps/place/Tienda+Pret+a+Porter/@18.4679497,-69.9311998,20z"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-xs text-brand-primary hover:underline font-sans"
                  >
                    <MapPin size={11} />
                    Ver en Google Maps →
                  </a>
                </div>
              </div>

              {/* Hours */}
              <div className="flex gap-4">
                <div className="w-10 h-10 flex-shrink-0 rounded-full border border-brand-border flex items-center justify-center">
                  <Clock size={16} className="text-brand-primary" />
                </div>
                <div>
                  <p className="font-heading text-xl text-brand-deep mb-1">Horarios</p>
                  <div className="text-brand-muted font-sans space-y-1">
                    <p>Lunes – Sábado: 9:00am – 8:00pm</p>
                    <p>Domingos: 10:00am – 5:00pm</p>
                  </div>
                </div>
              </div>

              {/* WhatsApp */}
              <div>
                <a
                  href={`https://wa.me/18091234567?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-8 py-4 bg-[#25D366] text-white text-sm tracking-[0.08em] uppercase font-sans rounded-sm hover:bg-[#20b856] transition-colors duration-300"
                >
                  <MessageCircle size={18} />
                  Escribirnos por WhatsApp
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Shipping zones */}
      <section className="py-16 lg:py-20 bg-white border-t border-brand-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-12"
          >
            <p className="text-xs tracking-[0.2em] uppercase text-brand-primary mb-3 font-sans">
              Llevamos la moda hasta tu puerta
            </p>
            <h2 className="font-heading text-4xl lg:text-5xl text-brand-deep">
              Zonas de envío
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {shippingZones.map((zone, i) => {
              const Icon = zone.icon
              return (
                <motion.div
                  key={zone.title}
                  initial={{ opacity: 0, y: 24 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.12 }}
                  className={`border ${zone.accent} rounded-sm p-8 bg-brand-ivory`}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full border border-brand-border flex items-center justify-center">
                      <Icon size={18} className="text-brand-primary" />
                    </div>
                    <h3 className="font-heading text-2xl text-brand-deep">{zone.title}</h3>
                  </div>
                  <ul className="space-y-2">
                    {zone.lines.map((line) => (
                      <li key={line} className="flex items-start gap-2">
                        <span className="mt-2 w-1 h-1 rounded-full bg-brand-accent flex-shrink-0" />
                        <p className="text-brand-muted font-sans text-sm leading-relaxed">
                          {line}
                        </p>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )
            })}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-10 p-6 bg-brand-sand rounded-sm border border-brand-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
          >
            <div>
              <p className="font-heading text-xl text-brand-deep mb-1">
                ¿Tienes preguntas sobre tu envío?
              </p>
              <p className="text-sm text-brand-muted font-sans">
                Escríbenos y te respondemos en minutos.
              </p>
            </div>
            <a
              href={`https://wa.me/18091234567?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 inline-flex items-center gap-2.5 px-6 py-3 bg-brand-primary text-brand-ivory text-sm tracking-[0.08em] uppercase font-sans rounded-sm hover:bg-brand-deep transition-colors duration-300"
            >
              <MessageCircle size={16} />
              Contactar ahora
            </a>
          </motion.div>
        </div>
      </section>

      {/* Back link */}
      <div className="py-10 text-center border-t border-brand-border">
        <Link
          href="/"
          className="inline-flex items-center gap-3 text-sm tracking-[0.1em] uppercase text-brand-muted hover:text-brand-primary font-sans transition-colors duration-300"
        >
          <span className="w-6 h-px bg-brand-border" />
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
