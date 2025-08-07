// src/app/api/auth/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient }             from '@/utils/supabase/server'
import type { EmailOtpType }        from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const url        = new URL(request.url)
    const token_hash = url.searchParams.get('token_hash')
    const type       = url.searchParams.get('type') as EmailOtpType | null
    const nextPage   = url.searchParams.get('next') ?? '/onboarding'

    if (!token_hash || !type) {
      return NextResponse.redirect('/learn', 307)
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash })

    if (error || !data.session) {
      return NextResponse.redirect('/learn', 307)
    }

    const res = NextResponse.redirect(nextPage, 307)
    const cookieOpts = {
      path:       '/',
      httpOnly:   true,
      secure:     true,
      sameSite:   'lax' as const,
      domain:     '.snap-ortho.com',
      // maxAge: data.session.expires_in,
    }

    res.cookies.set('sb-access-token',  data.session.access_token,  cookieOpts)
    res.cookies.set('sb-refresh-token', data.session.refresh_token, cookieOpts)
    return res

  } catch (err: unknown) {
    // Narrow the unknown to string or Error for logging
    const message = err instanceof Error ? err.stack ?? err.message : String(err)
    console.error('Error in /api/auth/confirm:', message)
    return new Response('Internal Server Error', { status: 500 })
  }
}
