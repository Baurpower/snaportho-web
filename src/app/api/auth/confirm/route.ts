// src/app/api/auth/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const token_hash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null

  // Missing params → straight to sign-in with redirect back to onboarding
  if (!token_hash || !type) {
    return NextResponse.redirect(
      new URL('/auth/sign-in?redirectTo=/onboarding', url),
      303
    )
  }

  const supabase = createRouteHandlerClient({ cookies })

  // Just verify the OTP — no need to store the return values
  await supabase.auth.verifyOtp({
    type,
    token_hash,
  })

  // Always send to onboarding; it will handle the auth check
  return NextResponse.redirect(new URL('/onboarding', url), 303)
}
