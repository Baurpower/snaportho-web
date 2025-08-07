// src/app/api/auth/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { serialize }  from 'cookie'
import { createClient } from '@/utils/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const url        = new URL(request.url)
  const token_hash = url.searchParams.get('token_hash')
  const type       = url.searchParams.get('type') as EmailOtpType | null
  const nextPage   = url.searchParams.get('next') ?? '/onboarding'

  // If missing or invalid, send them to your fallback (e.g. /learn)
  if (!token_hash || !type) {
    return NextResponse.redirect('/learn', 307)
  }

  // Verify the OTP
  const supabase = await createClient()
  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash })

  if (error || !data.session) {
    return NextResponse.redirect('/learn', 307)
  }

  // Build our 3xx response with two Set-Cookie headers
  const res = NextResponse.redirect(nextPage, 307)

  res.headers.append(
    'Set-Cookie',
    serialize('sb-access-token', data.session.access_token, {
      path: '/', httpOnly: true, secure: true, sameSite: 'lax',
      // optionally: maxAge: data.session.expires_in
    })
  )
  res.headers.append(
    'Set-Cookie',
    serialize('sb-refresh-token', data.session.refresh_token, {
      path: '/', httpOnly: true, secure: true, sameSite: 'lax',
    })
  )

  return res
}
