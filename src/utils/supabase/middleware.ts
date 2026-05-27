import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  if (!user && !isAuthPage && !isPublicBroBotPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/sign-in'
    return NextResponse.redirect(url)
  }

  return response
}