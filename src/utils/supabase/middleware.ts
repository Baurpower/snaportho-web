import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { isPublicProviderWebhookPath } from '@/lib/auth/public-provider-webhook-path'

export async function updateSession(request: NextRequest) {
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

  if (
    !user &&
    !isAuthPage &&
    !isPublicBroBotPath &&
    !isPublicMyCasesPlaybookPath &&
    !isPublicMyCasesLandingPath &&
    !isPublicCheckoutSuccessPath &&
    !isProviderWebhook
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
