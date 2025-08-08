// src/app/api/auth/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { EmailOtpType } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const token_hash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null
  const redirectTo = url.searchParams.get('redirectTo') ?? '/'

  // Missing params → go to sign-in
  if (!token_hash || !type) {
    return NextResponse.redirect(
      new URL(`/auth/sign-in?redirectTo=${redirectTo}`, url),
      303
    )
  }

  const supabase = createRouteHandlerClient({ cookies })
  const { data } = await supabase.auth.verifyOtp({ type, token_hash })

  // Prepare redirect response
  const response = NextResponse.redirect(new URL(redirectTo, url), 303)

  if (data?.session) {
    response.cookies.set('sb-access-token', data.session.access_token, {
      path: '/',
      httpOnly: true,
      secure: true,
    })
    response.cookies.set('sb-refresh-token', data.session.refresh_token, {
      path: '/',
      httpOnly: true,
      secure: true,
    })
  }

  return response
}
