import { NextResponse, type NextRequest } from 'next/server'
import { retiredAnkiSearchResponse } from '@/lib/anki/retired-search-relay'

// With src/app, Next.js discovers middleware here. Keep retirement handling
// scoped to these APIs; other routes retain their existing authentication.
export function middleware(request: NextRequest) {
  return retiredAnkiSearchResponse(request) ?? NextResponse.next()
}

export const config = {
  matcher: [
    '/api/anki/search-requests/:path*',
    '/api/brobot/extension/anki-search/:path*',
  ],
}
