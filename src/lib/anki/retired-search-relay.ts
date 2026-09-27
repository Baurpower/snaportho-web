import { NextResponse, type NextRequest } from 'next/server'

export function retiredAnkiSearchResponse(request: NextRequest) {
  // Installed clients can outlive retired API routes. Respond before session
  // lookup so their timers never redirect to (and render) the sign-in page.
  // An empty successful poll also lets older add-ons enter their idle backoff.
  const retiredPath = request.nextUrl.pathname.replace(/\/$/, '')
  if (retiredPath === '/api/anki/search-requests' ||
      retiredPath.startsWith('/api/anki/search-requests/') ||
      retiredPath === '/api/brobot/extension/anki-search' ||
      retiredPath.startsWith('/api/brobot/extension/anki-search/')) {
    const headers = { 'Cache-Control': 'no-store' }
    if (request.method === 'GET' && retiredPath === '/api/anki/search-requests/pending') {
      return NextResponse.json({ requests: [], retired: true }, { headers })
    }
    return NextResponse.json({
      error: 'Anki search has been retired. Update the SnapOrtho extension and Anki add-on.',
      code: 'anki_search_retired',
    }, { status: 410, headers })
  }
  return null
}
