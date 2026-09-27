import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { isPublicProviderWebhookPath } from '@/lib/auth/public-provider-webhook-path'
import { isMarketingAppPath } from '@/lib/marketing/links'

export async function updateSession(request: NextRequest) {
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
  // Apple must fetch association files without authentication or redirects.
  if (request.nextUrl.pathname === '/.well-known/apple-app-site-association' ||
      request.nextUrl.pathname === '/apple-app-site-association') {
    return NextResponse.next({ request })
  }
  // The Anki addon launch poller authenticates itself with a device token
  // and never carries browser session cookies, so the Supabase session
  // lookup below is a wasted Auth API round-trip on every poll (every ~4s
  // per linked device). The route rejects unauthenticated callers with 401
  // JSON itself.
  if (request.nextUrl.pathname === '/api/brobot-anki/launch/pending') {
    return NextResponse.next({ request })
  }
  let response = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          response = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  const isAuthPage =
    pathname.startsWith('/auth') || pathname.startsWith('/auth/sign-in')

  // Phase 1: Allow public access to the BroBot guest surface and its secure proxy.
  // The proxy itself performs authentication (user or signed guest cookie).
  // This unblocks the "Continue as Guest" flow that was previously dead due to this middleware.
  const isPublicBroBotPath =
    isMarketingAppPath(pathname) ||
    pathname === '/brobot' ||
    pathname.startsWith('/brobot/') ||
    pathname.startsWith('/api/brobot/')

  // MyCases Rotation Playbook share links — public landing pages and API routes.
  // Share codes are unguessable (base62, 8 chars); no auth required to read or import.
  const isPublicMyCasesPlaybookPath =
    pathname.startsWith('/mycases/playbook/') ||
    pathname.startsWith('/api/mycases/')

  const isPublicMyCasesLandingPath = pathname === '/mycases/landing'

  const isPublicCheckoutSuccessPath = pathname === '/checkout/success'

  const isProviderWebhook = isPublicProviderWebhookPath(pathname, request.method)
  // These handlers validate signed tokens/webhook signatures themselves.
  const isPublicMarketingPath =
    (pathname === '/api/email/preferences' && ['GET', 'POST'].includes(request.method)) ||
    (pathname === '/api/webhooks/resend' && request.method === 'POST')

  if (
    !user &&
    !isAuthPage &&
    !isPublicBroBotPath &&
    !isPublicMyCasesPlaybookPath &&
    !isPublicMyCasesLandingPath &&
    !isPublicCheckoutSuccessPath &&
    !isProviderWebhook &&
    !isPublicMarketingPath
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/sign-in'

    // Preserve the FULL original URL (pathname + search) so query params like success=true survive
    const fullOriginal = pathname + (request.nextUrl.search || '')
    url.searchParams.set('redirectTo', fullOriginal)

    if (process.env.NODE_ENV !== 'production') {
      console.log('[middleware] Redirecting unauthenticated request to sign-in', {
        original: fullOriginal,
        redirectTo: url.searchParams.get('redirectTo'),
      });
    }

    return NextResponse.redirect(url)
  }

  return response
}
