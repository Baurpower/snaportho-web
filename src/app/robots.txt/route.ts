// app/robots.txt/route.ts
export function GET() {
  const content = `
User-agent: *
Allow: /

Sitemap: https://snap-ortho.com/sitemap.xml
  `.trim()

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}
