import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Categories, type CategoriaItem } from '@/components/categories'

export const metadata: Metadata = {
  title: 'Categorías de Ropa Femenina | Prêt à Porter',
  description:
    'Explora todas las categorías de ropa femenina en Prêt à Porter: vestidos elegantes, sets, blusas, pantalones y más. Boutique en Santo Domingo, República Dominicana.',
  keywords: [
    'categorías ropa femenina Santo Domingo',
    'vestidos mujer RD',
    'blusas elegantes República Dominicana',
    'sets ropa femenina',
    'pantalones mujer Santo Domingo',
    'boutique categorías ropa',
  ],
  alternates: {
    canonical: 'https://pret-a-porter-eta.vercel.app/categorias',
  },
  openGraph: {
    title: 'Categorías de Ropa Femenina | Prêt à Porter',
    description:
      'Explora vestidos, sets, blusas, pantalones y más en nuestra boutique de Santo Domingo.',
    url: 'https://pret-a-porter-eta.vercel.app/categorias',
    type: 'website',
    locale: 'es_DO',
    siteName: 'Prêt à Porter',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Categorías de ropa femenina — Prêt à Porter',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Categorías de Ropa Femenina | Prêt à Porter',
    description:
      'Vestidos, sets, blusas, pantalones y más en nuestra boutique de Santo Domingo.',
    images: ['/og-image.jpg'],
  },
}

// Revalidar cada 60 segundos para reflejar cambios del admin
export const revalidate = 60

async function getCategorias(): Promise<CategoriaItem[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data, error } = await supabase
      .from('categorias')
      .select('id, nombre, slug, bg, orden, foto_url')
      .order('orden', { ascending: true })

    if (error) throw error
    return (data ?? []) as CategoriaItem[]
  } catch {
    // Si la tabla aún no existe, devolver array vacío
    return []
  }
}

export default async function CategoriasPage() {
  const categories = await getCategorias()

  return (
    <>
      <Navbar />
      <main className="pt-20 lg:pt-24">
        <Categories categories={categories} />
      </main>
      <Footer />
    </>
  )
}
