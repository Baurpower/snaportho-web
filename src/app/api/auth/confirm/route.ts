// src/app/api/auth/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const token_hash = url.searchParams.get('token_hash')

  // Must have token_hash, otherwise bounce to sign-in
  if (!token_hash) {
    return NextResponse.redirect(
      new URL(`/auth/sign-in?redirectTo=/onboarding`, url),
      303
    )
  }

  const supabase = createRouteHandlerClient({ cookies })

  // Signup confirmation only
  const { data, error } = await supabase.auth.verifyOtp({
    type: 'signup',
    token_hash
  })

  // If verification worked → go to /onboarding
  // If it failed → send to sign-in with redirect back to /onboarding
  const dest = error || !data?.session
    ? `/auth/sign-in?redirectTo=/onboarding`
    : `/onboarding`

  return NextResponse.redirect(new URL(dest, url), 303)
}
