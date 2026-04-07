import Link from 'next/link'
import { MessageCircle } from 'lucide-react'

// Instagram SVG (lucide Instagram is deprecated)
function InstagramIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

const footerLinks = {
  Tienda: [
    { label: 'Nueva Colección', href: '#coleccion' },
    { label: 'Novedades', href: '/novedades' },
    { label: 'Vestidos', href: '#vestidos' },
    { label: 'Sets', href: '#sets' },
    { label: 'Blusas', href: '#blusas' },
  ],
  Envíos: [
    { label: 'República Dominicana', href: '/contacto' },
    { label: 'Estados Unidos', href: '/contacto' },
    { label: 'Política de cambios', href: '#cambios' },
    { label: 'Guía de tallas', href: '#tallas' },
  ],
  Empresa: [
    { label: 'Sobre nosotras', href: '#nosotras' },
    { label: 'Contacto', href: '/contacto' },
    { label: 'Trabaja con nosotras', href: '#careers' },
  ],
}

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-brand-deep text-brand-ivory/80">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          {/* Brand column */}
          <div className="col-span-2 lg:col-span-1">
            <Link
              href="/"
              className="font-heading text-2xl tracking-[0.12em] uppercase text-brand-ivory hover:text-brand-soft transition-colors duration-300 block mb-5"
            >
              Prêt à Porter
            </Link>
            <p className="text-sm leading-relaxed text-brand-ivory/60 mb-6 font-sans">
              Ropa elegante y moderna para mujeres reales. Boutique en el
              corazón de Santo Domingo.
            </p>

            {/* Socials */}
            <div className="flex items-center gap-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-full border border-brand-ivory/20 flex items-center justify-center hover:border-brand-accent hover:text-brand-accent transition-colors duration-300"
              >
                <InstagramIcon size={15} />
              </a>
              <a
                href="https://wa.me/18091234567"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="w-9 h-9 rounded-full border border-brand-ivory/20 flex items-center justify-center hover:border-brand-accent hover:text-brand-accent transition-colors duration-300"
              >
                <MessageCircle size={15} />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <p className="text-xs tracking-[0.2em] uppercase text-brand-ivory mb-5 font-sans">
                {section}
              </p>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-brand-ivory/55 hover:text-brand-ivory transition-colors duration-300 font-sans"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-brand-ivory/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-brand-ivory/40 font-sans">
            © {year} Prêt à Porter · Santo Domingo, República Dominicana
          </p>

          {/* Dirección + Métodos de pago */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <p className="text-xs text-brand-ivory/40 font-sans">
              Abraham Lincoln 617, Local 25A, Plaza Castilla
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-brand-ivory/25 font-sans uppercase tracking-wider hidden sm:block">|</span>
              <div className="flex flex-wrap items-center gap-2">
                {['AZUL', 'PayPal', 'G Pay', 'Apple Pay', 'VISA · MC'].map((m) => (
                  <span
                    key={m}
                    className="text-[10px] text-brand-ivory/40 font-sans border border-brand-ivory/15 rounded px-2 py-0.5"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
