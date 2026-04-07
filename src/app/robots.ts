import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/checkout', '/api/'],
      },
    ],
    sitemap: 'https://pret-a-porter-eta.vercel.app/sitemap.xml',
    host: 'https://pret-a-porter-eta.vercel.app',
  }
}
