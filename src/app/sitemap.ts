// app/sitemap.ts
import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://snap-ortho.com'

  return [
    { url: `${base}/`, lastModified: new Date() },
    { url: `${base}/learn`, lastModified: new Date() },
    { url: `${base}/practice`, lastModified: new Date() },
    { url: `${base}/fund`, lastModified: new Date() },
    { url: `${base}/signup`, lastModified: new Date() },
    // Add more pages if needed
  ]
}
