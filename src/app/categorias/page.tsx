import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Categories, type CategoriaItem } from '@/components/categories'

export const metadata: Metadata = {
  title: 'Categorías | Prêt à Porter',
  description:
    'Explora todas las categorías de Prêt à Porter: vestidos, sets, blusas, pantalones y más.',
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
      .select('id, nombre, slug, bg, orden')
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
