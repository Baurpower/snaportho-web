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

  if (!token_hash || !type) {
    return NextResponse.redirect(new URL(`/auth/sign-in?redirectTo=${redirectTo}`, url))
  }

  const supabase = createRouteHandlerClient({ cookies })

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash,
  })

  if (error) {
    console.error('verifyOtp error:', error)
    return NextResponse.redirect(new URL('/auth/error', url))
  }

  // Overwrite cookies to ensure we have the right session
  const { data: sessionData } = await supabase.auth.getSession()

  if (!sessionData.session) {
    console.error('No session returned after verifyOtp')
    return NextResponse.redirect(new URL('/auth/error', url))
  }

  // Redirect to onboarding
  return NextResponse.redirect(new URL(redirectTo, url))
}
