// src/app/api/auth/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient }             from '@/utils/supabase/server'
import type { EmailOtpType }        from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const url        = new URL(request.url)
    const token_hash = url.searchParams.get('token_hash')
    const type       = url.searchParams.get('type') as EmailOtpType | null

    // If missing params, just bail back to sign-in (or wherever)
    if (!token_hash || !type) {
      return NextResponse.redirect('/auth/sign-in', { status: 307 })
    }

    // Verify the OTP
    const supabase = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash })

    // On failure, bounce to some public page
    if (error || !data.session) {
      return NextResponse.redirect('/learn', { status: 307 })
    }

    // On success: set the cookies and redirect to onboarding
    const res = NextResponse.redirect('/learn', { status: 307 })

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
    const message = err instanceof Error ? (err.stack ?? err.message) : String(err)
    console.error('❌ /api/auth/confirm error:', message)
    return new Response(`Internal Server Error\n\n${message}`, {
      status: 500,
      headers: { 'content-type': 'text/plain' }
    })
  }
}
