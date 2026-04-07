'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { MapPin, Truck, Sparkles, Users } from 'lucide-react'

const stats = [
  { icon: MapPin, title: 'Tienda física', desc: 'Plaza Castilla, Santo Domingo' },
  { icon: Truck, title: 'Envíos en toda RD', desc: 'Rápido y seguro a tu puerta' },
  { icon: Sparkles, title: 'Piezas elegantes', desc: 'Selección curada con estilo' },
  { icon: Users, title: '+20K clientas felices', desc: 'Tu satisfacción, nuestra prioridad' },
]

const reviews = [
  {
    name: 'Aris Bautista',
    text: 'Pret a Porter es mucho más que una tienda de ropa; es un reflejo del amor y dedicación en cada detalle. Es el lugar donde siempre encuentro todo lo que necesito para sentirme elegante y bien representada sin importar la ocasión.',
  },
  {
    name: 'Jame Vargas',
    text: 'Excelente servicio, me encanta que sea cual sea la ocasión tienen lo que necesito y te orientan según tu actividad, no solo es la ropa es la asesoría! Ropa hermosa y de excelente calidad a buen precio!',
  },
  {
    name: 'Aneudy Berliza Leyba',
    text: 'Como hombre, necesitamos un lugar donde encontremos regalos para nuestras chicas según el gusto deseado. Fui a esta tienda y la calidad y elegancia no faltan. Me encanta.',
  },
  {
    name: 'Eddy Santiago',
    text: 'Excelente servicio y experiencia. Me encanta el trato y siempre están a la moda. ♥️',
  },
  {
    name: 'Gisselle Tejeda',
    text: 'Pret a porter es la tienda de ropa de mujer más innovadora en Santo Domingo. Un lugar super acogedor, te ofrecen de beber y te asesoran en lo que andas buscando, sin dudas mi tienda favorita!',
  },
  {
    name: 'Jessica Ramírez',
    text: 'Es un lugar súper acogedor, donde encuentras piezas únicas y para cada estilo, con un servicio personalizado, único e inigualable y la calidad de la ropa es excelente.',
  },
  {
    name: 'Cityandariega',
    text: 'Ha sido mi salvación a la hora de vestir para diferentes eventos. Una tienda vanguardista con servicio y asesoría excepcional y ubicación céntrica.',
  },
  {
    name: 'Margarita German',
    text: 'Me encanta Pret à Porter, excelente servicio, una tienda donde encuentras prendas exclusivas y para toda ocasión.',
  },
  {
    name: 'Melany Brito Feliz',
    text: 'Hermosas piezas de vestir, pero lo más importante es el servicio que ofrecen, el trato amable y los detalles con las clientas.',
  },
  {
    name: 'Vanessa Sant',
    text: 'Hermosa tienda con excelente servicio y buenos precios, mi tienda favorita. 100% recomendada.',
  },
  {
    name: 'Delfy Pantaleon',
    text: 'Excelente servicio y trato personalizado, buena ubicación, buena calidad, buen precio y siempre a la vanguardia.',
  },
  {
    name: 'Yary Margarita De Lancer',
    text: 'Excelente servicio al cliente, la dueña siempre está en su negocio atendiendo por igual 😍',
  },
  {
    name: 'Miguel Clase',
    text: 'La Tienda más contemporánea, con un excelente servicio personalizado. 10/10',
  },
]




function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

export function TrustBar() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section ref={ref} className="bg-brand-deep py-14 lg:py-20 overflow-hidden">
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          display: flex;
          width: max-content;
          animation: marquee 40s linear infinite;
        }
        .marquee-track:hover { animation-play-state: paused; }
      `}</style>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-14">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((item, i) => {
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
                  <p className="font-heading text-lg text-brand-ivory leading-tight">{item.title}</p>
                  <p className="text-xs text-brand-soft/70 mt-0.5 font-sans">{item.desc}</p>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Divider */}
        <div className="border-t border-brand-ivory/10" />

        {/* Reviews header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
        >
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-brand-accent mb-3 font-sans">
              Lo que dicen nuestras clientas
            </p>
            <div className="flex items-center gap-3">
              {/* Google badge */}
              <div className="flex items-center gap-2 bg-white/8 border border-white/10 rounded-full px-3 py-1.5">
                <GoogleIcon />
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} className="w-3.5 h-3.5 fill-yellow-400" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-brand-ivory/70 text-xs font-sans">5.0 · 13 reseñas</span>
              </div>
            </div>
          </div>
          <a
            href="https://www.google.com/maps/place/Tienda+Pret+a+Porter/@18.4680564,-69.9313722,17z/data=!4m8!3m7!1s0x8eaf8947d9374991:0xe0f198545cfda88!8m2!3d18.4680522!4d-69.9313699!9m1!1b1!16s%2Fg%2F11ss6jhy7q?entry=ttu&g_ep=EgoyMDI2MDMyNC4wIKXMDSoASAFQAw%3D%3D"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs tracking-[0.12em] uppercase text-brand-accent/60 hover:text-brand-accent transition-colors font-sans flex items-center gap-1.5"
          >
            Ver en Google Maps
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z" clipRule="evenodd" />
            </svg>
          </a>
        </motion.div>
      </div>

      {/* Marquee — full width, outside the constrained container */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="mt-10 -mx-6 lg:-mx-8 overflow-hidden"
      >
        <div className="marquee-track">
          {[...reviews, ...reviews].map((r, i) => (
            <div
              key={i}
              className="mx-5 w-72 flex-shrink-0 bg-brand-ivory/5 border border-brand-ivory/10 rounded-sm p-6 flex flex-col gap-2"
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-1">
                {Array.from({ length: 5 }).map((_, j) => (
                  <svg key={j} className="w-3.5 h-3.5 fill-brand-accent" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              {/* Quote */}
              <p className="text-brand-ivory/80 text-sm font-sans leading-relaxed italic flex-1">
                &ldquo;{r.text}&rdquo;
              </p>
              {/* Name */}
              <div className="pt-3 border-t border-brand-ivory/10 flex items-center justify-between">
                <p className="text-brand-accent text-xs tracking-wider uppercase font-sans">{r.name}</p>
                <div className="flex items-center gap-1 opacity-40">
                  <GoogleIcon />
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

    </section>
  )
}

