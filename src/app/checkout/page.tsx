import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { CheckoutForm } from '@/components/checkout-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Checkout | Prêt à Porter',
  description: 'Completa tu pedido en Prêt à Porter.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function CheckoutPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-brand-ivory pt-20">
        <CheckoutForm />
      </main>
      <Footer />
    </>
  )
}
