// src/app/api/auth/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient }             from '@/utils/supabase/server'
import type { EmailOtpType }        from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const url         = new URL(request.url)
    const token_hash  = url.searchParams.get('token_hash')
    const type        = url.searchParams.get('type') as EmailOtpType | null
    // pull off any redirectTo (e.g. `/onboarding`, `/learn`, `/brobot`)
    const rawRedirect = url.searchParams.get('redirectTo') ?? '/'
    // only allow internal paths
    const redirectTo  = rawRedirect.startsWith('/') ? rawRedirect : '/'

    // missing params? send back to sign-in with the same redirectTo
    if (!token_hash || !type) {
      return NextResponse.redirect(
        new URL(`/auth/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`, request.url),
        307
      )
    }

    const supabase       = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash })

    // bad OTP? back to sign-in again
    if (error || !data.session) {
      return NextResponse.redirect(
        new URL(`/auth/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`, request.url),
        307
      )
    }

    // success → set cookies + send them to redirectTo
    const res = NextResponse.redirect(
      new URL(redirectTo, request.url),
      307
    )

    const cookieOpts = {
      path:     '/',
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      domain:   '.snap-ortho.com',
    }
    res.cookies.set('sb-access-token',  data.session.access_token,  cookieOpts)
    res.cookies.set('sb-refresh-token', data.session.refresh_token, cookieOpts)

    return res

  } catch (err: unknown) {
    console.error('❌ /api/auth/confirm error:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
