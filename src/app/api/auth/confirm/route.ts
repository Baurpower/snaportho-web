// src/app/api/auth/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const token_hash = url.searchParams.get('token_hash')
  const raw = url.searchParams.get('redirectTo') ?? '/'
  const redirectTo = raw.startsWith('/') ? raw : '/'

  // Must have token_hash, otherwise bounce to sign-in
  if (!token_hash) {
    return NextResponse.redirect(
      new URL(`/auth/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`, url),
      303
    )
  }

  const supabase = createRouteHandlerClient({ cookies })

  // For signup confirmation, type = 'signup' and no email param is required
  const { data, error } = await supabase.auth.verifyOtp({
    type: 'signup',
    token_hash
  })

  const dest =
    error || !data?.session
      ? `/auth/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`
      : redirectTo

  return NextResponse.redirect(new URL(dest, url), 303)
}
