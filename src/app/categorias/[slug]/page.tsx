import type { Metadata } from 'next'
import { notFound }       from 'next/navigation'
import { createClient }   from '@supabase/supabase-js'
import Link               from 'next/link'
import { ArrowLeft }      from 'lucide-react'
import { Navbar }         from '@/components/navbar'
import { Footer }         from '@/components/footer'
import { ProductCard, type ProductCardData } from '@/components/product-card'

export const revalidate = 60

// ── Supabase server client ────────────────────────────────────
function serverClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// ── Tipos ─────────────────────────────────────────────────────
interface CategoriaRow {
  id:     string
  nombre: string
  slug:   string
  bg:     string
}

// ── generateStaticParams (pre-renderiza las rutas conocidas) ──
export async function generateStaticParams() {
  const supabase = serverClient()
  const { data } = await supabase
    .from('categorias')
    .select('slug')
  return (data ?? []).map((c) => ({ slug: c.slug }))
}

// ── Metadata dinámica ─────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const supabase = serverClient()
  const { data } = await supabase
    .from('categorias')
    .select('nombre')
    .eq('slug', slug)
    .single()

  const nombre = data?.nombre ?? slug
  return {
    title:       `${nombre} | Prêt à Porter`,
    description: `Descubre nuestra colección de ${nombre} en Prêt à Porter.`,
  }
}

// ── Fetchers ──────────────────────────────────────────────────
async function getCategoria(slug: string): Promise<CategoriaRow | null> {
  const { data } = await serverClient()
    .from('categorias')
    .select('id, nombre, slug, bg')
    .eq('slug', slug)
    .single()
  return data ?? null
}

async function getProductos(slug: string): Promise<ProductCardData[]> {
  const { data } = await serverClient()
    .from('productos')
    .select('id, nombre, precio, foto_url, talla_s, talla_m, talla_l')
    .eq('categoria_slug', slug)
    .eq('activo', true)
    .order('created_at', { ascending: false })
  return (data ?? []) as ProductCardData[]
}

// ── Page ──────────────────────────────────────────────────────
export default async function CategoriaSlugPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug }   = await params
  const categoria  = await getCategoria(slug)
  if (!categoria)  notFound()

  const productos  = await getProductos(slug)

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-brand-ivory pt-20 lg:pt-24">

        {/* ── Hero de categoría ─────────────────────────── */}
        <div
          className="w-full py-16 lg:py-24 flex items-end px-6 lg:px-8"
          style={{ backgroundColor: categoria.bg }}
        >
          <div className="max-w-7xl mx-auto w-full">
            <p className="text-xs tracking-[0.2em] uppercase text-brand-ivory/70 mb-3 font-sans">
              Categorías
            </p>
            <h1 className="font-heading text-5xl lg:text-7xl text-brand-ivory">
              {categoria.nombre}
            </h1>
          </div>
        </div>

        {/* ── Productos ─────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-6 lg:px-8 py-16 lg:py-20">

          {/* Volver a categorías */}
          <Link
            href="/categorias"
            className="inline-flex items-center gap-2 text-xs tracking-[0.12em] uppercase font-sans text-brand-muted hover:text-brand-primary transition-colors mb-10"
          >
            <ArrowLeft size={14} />
            Todas las categorías
          </Link>

          {productos.length === 0 ? (
            /* Estado vacío */
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <p className="font-heading text-3xl text-brand-deep/30">
                Próximamente
              </p>
              <p className="text-sm text-brand-muted font-sans tracking-wide">
                Estamos preparando piezas para esta categoría
              </p>
            </div>
          ) : (
            <>
              {/* Conteo */}
              <p className="text-xs tracking-[0.15em] uppercase text-brand-muted font-sans mb-10">
                {productos.length} {productos.length === 1 ? 'pieza' : 'piezas'}
              </p>

              {/* Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
                {productos.map((p, i) => (
                  <ProductCard
                    key={p.id}
                    product={{ ...p, bg: p.bg ?? categoria.bg }}
                    index={i}
                  />
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
