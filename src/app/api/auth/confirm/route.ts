// src/app/api/auth/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)

  // Supabase confirm links usually include both, but be defensive
  const token_hash = url.searchParams.get('token_hash')
  const type = (url.searchParams.get('type') as EmailOtpType) || 'signup'
  const redirectTo = url.searchParams.get('redirectTo') || '/onboarding'

  // No token? bounce to sign-in (we’ll send them back to onboarding after)
  if (!token_hash) {
    return NextResponse.redirect(
      new URL('/auth/sign-in?redirectTo=/onboarding', url),
      303
    )
  }

  const supabase = createRouteHandlerClient({ cookies })

  // 1) Verify the magic link / email OTP
  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash })

  // Failed verify → go sign in
  if (error || !data?.session) {
    return NextResponse.redirect(
      new URL('/auth/sign-in?redirectTo=/onboarding', url),
      303
    )
  }

  // 2) Persist session cookies for the browser (writes both cookies)
  await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  })

  // 3) Build the redirect response
  const res = NextResponse.redirect(new URL(redirectTo, url), 303)

  // 4) Optional: remove any legacy/raw tokens if they exist (clean slate)
  res.cookies.delete('sb-access-token')
  res.cookies.delete('sb-refresh-token')

  return res
}
