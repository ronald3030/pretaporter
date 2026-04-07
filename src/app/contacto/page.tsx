import type { Metadata } from 'next'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ContactoContent } from '@/components/contacto-content'

export const metadata: Metadata = {
  title: 'Contacto y Envíos | Prêt à Porter — Plaza Castilla, Santo Domingo',
  description:
    'Visítanos en Plaza Castilla, Abraham Lincoln 617 Local 25A, Santo Domingo. Escríbenos por WhatsApp. Envíos a toda República Dominicana y Estados Unidos.',
  keywords: [
    'contacto boutique Santo Domingo',
    'Plaza Castilla tienda ropa femenina',
    'envíos ropa RD',
    'envíos ropa República Dominicana',
    'boutique Santo Domingo dirección',
    'Prêt à Porter contacto',
    'tienda ropa Abraham Lincoln Santo Domingo',
  ],
  alternates: {
    canonical: 'https://pret-a-porter-eta.vercel.app/contacto',
  },
  openGraph: {
    title: 'Contacto y Envíos | Prêt à Porter',
    description:
      'Visítanos en Plaza Castilla, Santo Domingo. Envíos a toda RD y EE.UU. Escríbenos por WhatsApp.',
    url: 'https://pret-a-porter-eta.vercel.app/contacto',
    type: 'website',
    locale: 'es_DO',
    siteName: 'Prêt à Porter',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Contacto Prêt à Porter — Plaza Castilla, Santo Domingo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contacto y Envíos | Prêt à Porter',
    description:
      'Visítanos en Plaza Castilla, Santo Domingo. Envíos a toda RD y EE.UU.',
    images: ['/og-image.jpg'],
  },
}

export default function ContactoPage() {
  return (
    <>
      <Navbar />
      <main className="pt-20 lg:pt-24">
        <ContactoContent />
      </main>
      <Footer />
    </>
  )
}
