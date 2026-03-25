import { InstagramGrid } from '@/components/instagram-grid'

export function InstagramSection() {
  return (
    <section className="py-20 lg:py-28 bg-white" id="instagram">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-xs tracking-[0.2em] uppercase text-brand-primary mb-3 font-sans">
            Síguenos
          </p>
          <h2 className="font-heading text-4xl lg:text-5xl text-brand-deep mb-4">
            @pretaporter_rd
          </h2>
          <p className="text-brand-muted font-sans">
            Inspírate con los últimos looks de nuestra comunidad
          </p>
        </div>

        <InstagramGrid />
      </div>
    </section>
  )
}
