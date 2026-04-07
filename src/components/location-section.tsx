'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { MapPin, Clock, MessageCircle } from 'lucide-react'

export function LocationSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  const whatsappMessage = encodeURIComponent(
    '¡Hola! Vi su tienda en línea y me gustaría obtener más información.'
  )

  return (
    <section id="contacto" ref={ref} className="py-20 lg:py-28 bg-brand-ivory">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14 lg:mb-20"
        >
          <p className="text-xs tracking-[0.2em] uppercase text-brand-primary mb-3 font-sans">
            Visítanos
          </p>
          <h2 className="font-heading text-4xl lg:text-5xl text-brand-deep">
            Nuestra tienda en Santo Domingo
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Google Maps embed */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7 }}
            className="relative rounded-sm overflow-hidden h-80 lg:h-96 border border-brand-border shadow-sm"
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

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="flex flex-col gap-8"
          >
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
                  href="https://www.google.com/maps/place/Tienda+Pret+a+Porter/@18.4680564,-69.9313722,17z/data=!4m8!3m7!1s0x8eaf8947d9374991:0xe0f198545cfda88!8m2!3d18.4680522!4d-69.9313699!9m1!1b1!16s%2Fg%2F11ss6jhy7q?entry=ttu&g_ep=EgoyMDI2MDMyNC4wIKXMDSoASAFQAw%3D%3D"
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
                  <p>Lunes – Viernes: 10:00am – 7:00pm</p>
                  <p>Sábado: 10:00am – 5:00pm</p>
                  <p>Domingo: Cerrado</p>
                </div>
              </div>
            </div>

            {/* WhatsApp CTA */}
            <div className="pt-2">
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

            <p className="text-xs text-brand-muted/70 font-sans">
              Envíos a toda República Dominicana y Estados Unidos.{' '}
              <a href="/contacto" className="underline underline-offset-2 hover:text-brand-primary transition-colors">
                Ver zonas y tarifas →
              </a>
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
