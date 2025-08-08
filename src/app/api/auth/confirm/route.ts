// src/app/api/auth/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const token_hash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null
  const redirectTo = url.searchParams.get('redirectTo') ?? '/onboarding'

  if (!token_hash || !type) {
    return NextResponse.redirect(
      new URL('/auth/sign-in?redirectTo=/onboarding', url),
      303
    )
  }

  const supabase = createRouteHandlerClient({ cookies })
  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash })

  const res = NextResponse.redirect(new URL(redirectTo, url), 303)

  if (!error && data?.session) {
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })
    // remove legacy/raw cookies so only the helper cookie remains
    res.cookies.delete('sb-access-token')
    res.cookies.delete('sb-refresh-token')
    // (or use the force-expire version above)
  }

  return res
}
