import type { Metadata } from 'next'
import { notFound }       from 'next/navigation'
import { createClient }   from '@supabase/supabase-js'
import { Navbar }         from '@/components/navbar'
import { Footer }         from '@/components/footer'
import { ProductDetail }  from '@/components/product-detail'

export const revalidate = 60

function serverClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export interface ProductoFull {
  id:              string
  nombre:          string
  descripcion:     string | null
  precio:          number
  foto_url:        string | null
  talla_s:         number
  talla_m:         number
  talla_l:         number
  categoria_slug:  string | null
  bg:              string
  categoria_nombre: string | null
}

// ── Pre-renderiza todas las rutas conocidas ───────────────────
export async function generateStaticParams() {
  const { data } = await serverClient()
    .from('productos')
    .select('id')
    .eq('activo', true)
  return (data ?? []).map((p) => ({ id: p.id }))
}

// ── Metadata dinámica ─────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const { data } = await serverClient()
    .from('productos')
    .select('nombre, descripcion')
    .eq('id', id)
    .single()

  if (!data) return { title: 'Prêt à Porter' }

  return {
    title:       `${data.nombre} | Prêt à Porter`,
    description: data.descripcion ?? `${data.nombre} — Prêt à Porter`,
    openGraph: {
      title:       `${data.nombre} | Prêt à Porter`,
      description: data.descripcion ?? `${data.nombre} — Prêt à Porter`,
    },
  }
}

// ── Fetcher ───────────────────────────────────────────────────
async function getProducto(id: string): Promise<ProductoFull | null> {
  const { data } = await serverClient()
    .from('productos')
    .select(`
      id, nombre, descripcion, precio, foto_url,
      talla_s, talla_m, talla_l, categoria_slug,
      categorias ( bg, nombre )
    `)
    .eq('id', id)
    .eq('activo', true)
    .single()

  if (!data) return null

  const cat = Array.isArray(data.categorias) ? data.categorias?.[0] as { bg: string; nombre: string } | null : data.categorias as { bg: string; nombre: string } | null

  return {
    id:              data.id,
    nombre:          data.nombre,
    descripcion:     data.descripcion,
    precio:          data.precio,
    foto_url:        data.foto_url,
    talla_s:         data.talla_s ?? 0,
    talla_m:         data.talla_m ?? 0,
    talla_l:         data.talla_l ?? 0,
    categoria_slug:  data.categoria_slug,
    bg:              cat?.bg ?? '#D8B7AF',
    categoria_nombre: cat?.nombre ?? null,
  }
}

// ── Page ──────────────────────────────────────────────────────
export default async function ProductoPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id }   = await params
  const producto = await getProducto(id)
  if (!producto)  notFound()

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-brand-ivory pt-20 lg:pt-24">
        <ProductDetail producto={producto} />
      </main>
      <Footer />
    </>
  )
}
