import type { Metadata } from 'next'
import { Navbar } from '@/components/navbar'
import { Hero } from '@/components/hero'
import { TrustBar } from '@/components/trust-bar'
import { EditorialSection } from '@/components/editorial-section'
import { InstagramSection } from '@/components/instagram-section'
import { Footer } from '@/components/footer'

export const metadata: Metadata = {
  title: 'Prêt à Porter | Boutique de Ropa Femenina en Santo Domingo',
  description:
    'Prêt à Porter — boutique de ropa femenina en Plaza Castilla, Santo Domingo. Vestidos elegantes, blusas y conjuntos para la mujer moderna. Envíos a toda República Dominicana y EE.UU.',
  keywords: [
    'ropa femenina Santo Domingo',
    'boutique ropa mujer RD',
    'vestidos elegantes Santo Domingo',
    'moda mujer República Dominicana',
    'ropa de mujer Santo Domingo',
    'tienda ropa femenina RD',
    'Plaza Castilla boutique',
    'Prêt à Porter Santo Domingo',
  ],
  alternates: {
    canonical: 'https://pret-a-porter-eta.vercel.app',
  },
  openGraph: {
    title: 'Prêt à Porter | Boutique de Ropa Femenina en Santo Domingo',
    description:
      'Boutique de ropa femenina en Santo Domingo. Vestidos, blusas y conjuntos elegantes. Envíos a toda RD y EE.UU. +20K clientas felices.',
    url: 'https://pret-a-porter-eta.vercel.app',
    type: 'website',
    locale: 'es_DO',
    siteName: 'Prêt à Porter',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Prêt à Porter — Boutique de ropa femenina en Santo Domingo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prêt à Porter | Boutique de Ropa Femenina en Santo Domingo',
    description:
      'Boutique de ropa femenina en Santo Domingo. Vestidos, blusas y conjuntos elegantes. Envíos a toda RD y EE.UU.',
    images: ['/og-image.jpg'],
  },
}

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <EditorialSection />
        <InstagramSection />
        <TrustBar />
      </main>
      <Footer />
    </>
  )
}
