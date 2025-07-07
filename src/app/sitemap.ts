// app/sitemap.ts
import { MetadataRoute } from 'next'
import fs from 'fs'
import path from 'path'

function getRoutesFromAppDir(dir: string, baseRoute = ''): string[] {
  const routes: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.name.startsWith('_') || entry.name.startsWith('[')) continue // skip dynamic or special routes

    const fullPath = path.join(dir, entry.name)
    const slug = entry.name === 'page.tsx' || entry.name === 'page.ts' ? '' : entry.name
    const fullRoute = path.join(baseRoute, slug)

    if (entry.isDirectory()) {
      const childRoutes = getRoutesFromAppDir(fullPath, fullRoute)
      routes.push(...childRoutes)
    } else if (entry.name === 'page.tsx' || entry.name === 'page.ts') {
      routes.push(baseRoute || '/')
    }
  }

  return routes
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://snap-ortho.com'
  const appDir = path.join(process.cwd(), 'app')
  const routes = getRoutesFromAppDir(appDir)

  const now = new Date()
  return routes.map((route) => ({
    url: `${base}${route.replace(/\/index$/, '')}`, // Clean trailing /index
    lastModified: now,
  }))
}
