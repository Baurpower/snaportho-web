// app/sitemap.ts
import { MetadataRoute } from 'next'
import { globby } from 'globby'


const baseUrl = 'https://snap-ortho.com'

export default async function generateSitemap(): Promise<MetadataRoute.Sitemap> {
  const pagePaths = await globby([
    'src/app/**/page.tsx',
    '!**/(api|admin|auth|_)*',
    '!**/layout.tsx',
    '!**/template.tsx',
    '!**/not-found.tsx',
    '!**/error.tsx',
  ])

  const urls = pagePaths.map((path) => {
    const route = path
      .replace(/^src\/app/, '')
      .replace(/\/page\.tsx$/, '')
      .replace(/\/index$/, '')
      || '/'
    return {
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
    }
  })

  return urls
}
