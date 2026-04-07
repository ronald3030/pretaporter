import type { Metadata }  from 'next'
import { createClient }    from '@supabase/supabase-js'
import { Navbar }          from '@/components/navbar'
import { Footer }          from '@/components/footer'
import { ProductCard, type ProductCardData } from '@/components/product-card'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Nueva Colección de Ropa Femenina | Prêt à Porter',
  description:
    'Descubre la nueva colección de Prêt à Porter. Vestidos, blusas y conjuntos elegantes para la mujer moderna en Santo Domingo. Envíos a toda República Dominicana y EE.UU.',
  keywords: [
    'nueva colección ropa femenina Santo Domingo',
    'colección moda mujer RD',
    'vestidos nueva temporada República Dominicana',
    'ropa femenina nueva colección',
    'boutique nueva temporada Santo Domingo',
    'Prêt à Porter colección',
  ],
  alternates: {
    canonical: 'https://pret-a-porter-eta.vercel.app/coleccion',
  },
  openGraph: {
    title: 'Nueva Colección de Ropa Femenina | Prêt à Porter',
    description:
      'Vestidos, blusas y conjuntos elegantes de la nueva temporada. Boutique femenina en Santo Domingo.',
    url: 'https://pret-a-porter-eta.vercel.app/coleccion',
    type: 'website',
    locale: 'es_DO',
    siteName: 'Prêt à Porter',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Nueva Colección — Prêt à Porter Santo Domingo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nueva Colección de Ropa Femenina | Prêt à Porter',
    description:
      'Vestidos, blusas y conjuntos elegantes de la nueva temporada. Boutique femenina en Santo Domingo.',
    images: ['/og-image.jpg'],
  },
}

function serverClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

async function getColeccion(): Promise<ProductCardData[]> {
  const { data } = await serverClient()
    .from('productos')
    .select('id, nombre, precio, foto_url, talla_s, talla_m, talla_l, categorias(bg)')
    .eq('categoria', 'nueva_coleccion')
    .eq('activo', true)
    .order('created_at', { ascending: false })

  return (data ?? []).map((p) => ({
    id:       p.id,
    nombre:   p.nombre,
    precio:   p.precio,
    foto_url: p.foto_url,
    talla_s:  p.talla_s,
    talla_m:  p.talla_m,
    talla_l:  p.talla_l,
    bg:       (Array.isArray(p.categorias) ? p.categorias?.[0]?.bg : (p.categorias as { bg: string } | null)?.bg) ?? '#D8B7AF',
  }))
}

export default async function ColeccionPage() {
  const productos = await getColeccion()

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-brand-ivory pt-20 lg:pt-24">

        {/* ── Hero ─────────────────────────────────────────── */}
        <div className="w-full py-16 lg:py-24 px-6 lg:px-8 bg-[#D8B7AF]">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs tracking-[0.2em] uppercase text-brand-ivory/70 mb-3 font-sans">
              Colección
            </p>
            <h1 className="font-heading text-5xl lg:text-7xl text-brand-ivory">
              Nueva Colección
            </h1>
          </div>
        </div>

        {/* ── Productos ────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-6 lg:px-8 py-16 lg:py-20">
          {productos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <p className="font-heading text-3xl text-brand-deep/30">Próximamente</p>
              <p className="text-sm text-brand-muted font-sans tracking-wide">
                Estamos preparando la nueva colección
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs tracking-[0.15em] uppercase text-brand-muted font-sans mb-10">
                {productos.length} {productos.length === 1 ? 'pieza' : 'piezas'}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
                {productos.map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </div>
            </>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}
