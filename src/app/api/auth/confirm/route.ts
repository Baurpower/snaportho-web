// src/app/api/auth/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const token_hash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null
  const email = url.searchParams.get('email') // must be passed in the link
  const raw = url.searchParams.get('redirectTo') ?? '/'
  const redirectTo = raw.startsWith('/') ? raw : '/'

  if (!token_hash || !type || !email) {
    return NextResponse.redirect(
      new URL(`/auth/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`, url),
      303
    )
  }

  const supabase = createRouteHandlerClient({ cookies })
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    type,
    token_hash
  })

  const dest = error || !data?.session
    ? `/auth/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`
    : redirectTo

  return NextResponse.redirect(new URL(dest, url), 303)
}

