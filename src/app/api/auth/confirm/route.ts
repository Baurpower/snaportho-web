// src/app/api/auth/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const token_hash = url.searchParams.get('token_hash')

  // No token_hash? → go to sign-in, redirecting back to onboarding after login
  if (!token_hash) {
    return NextResponse.redirect(
      new URL('/auth/sign-in?redirectTo=/onboarding', url),
      303
    )
  }

  const supabase = createRouteHandlerClient({ cookies })

  // This route only handles signup confirmations
  const { data, error } = await supabase.auth.verifyOtp({
    type: 'signup',
    token_hash
  })

  // Success → onboarding, Fail → sign-in (with redirect back to onboarding)
  const destination =
    error || !data?.session
      ? '/auth/sign-in?redirectTo=/onboarding'
      : '/onboarding'

  return NextResponse.redirect(new URL(destination, url), 303)
}
