import { Navbar } from '@/components/navbar'
import { Hero } from '@/components/hero'
import { TrustBar } from '@/components/trust-bar'
import { EditorialSection } from '@/components/editorial-section'
import { InstagramSection } from '@/components/instagram-section'
import { Footer } from '@/components/footer'

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
