import type { Metadata } from 'next'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ContactoContent } from '@/components/contacto-content'

export const metadata: Metadata = {
  title: 'Contacto | Prêt à Porter',
  description:
    'Visítanos en Plaza Castilla, Santo Domingo, o escríbenos por WhatsApp. Envíos a toda República Dominicana y Estados Unidos.',
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
