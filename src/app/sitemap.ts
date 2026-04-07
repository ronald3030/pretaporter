import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const BASE_URL = 'https://pret-a-porter-eta.vercel.app'

function serverClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = serverClient()

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/coleccion`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/novedades`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/categorias`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/contacto`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ]

  // Dynamic category routes
  let categoryRoutes: MetadataRoute.Sitemap = []
  try {
    const { data: categorias } = await supabase
      .from('categorias')
      .select('slug, updated_at')
      .order('orden', { ascending: true })

    categoryRoutes = (categorias ?? []).map((cat) => ({
      url: `${BASE_URL}/categorias/${cat.slug}`,
      lastModified: cat.updated_at ? new Date(cat.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  } catch {
    // If table doesn't exist yet, skip
  }

  // Dynamic product routes
  let productRoutes: MetadataRoute.Sitemap = []
  try {
    const { data: productos } = await supabase
      .from('productos')
      .select('id, updated_at')
      .eq('activo', true)

    productRoutes = (productos ?? []).map((p) => ({
      url: `${BASE_URL}/productos/${p.id}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))
  } catch {
    // If table doesn't exist yet, skip
  }

  return [...staticRoutes, ...categoryRoutes, ...productRoutes]
}
