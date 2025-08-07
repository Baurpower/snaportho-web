// src/app/auth/confirm/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  // 1) Create a mutable response so Supabase can set cookies
  const response = NextResponse.next()

  // 2) Bind Supabase to this req/res pair using the two-arg overload.
  //    We disable the explicit-any rule here because this overload
  //    signature mismatch is out of our control.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createRouteHandlerClient(request as any, response as any)

  // 3) Parse the OTP from the URL
  const url        = new URL(request.url)
  const token_hash = url.searchParams.get('token_hash')!
  const type       = url.searchParams.get('type') as EmailOtpType
  const nextPage   = url.searchParams.get('next') ?? '/onboarding'

  // 4) Exchange the OTP for a session cookie (sets Set-Cookie on `response`)
  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash })

  // 5) Grab the raw Set-Cookie header that Supabase attached
  const setCookie = response.headers.get('set-cookie')

  // 6a) On error, redirect to /error and include any cookie header
  if (error || !data.session) {
    return NextResponse.redirect(
      new URL('/error', request.url),
      setCookie
        ? { headers: { 'set-cookie': setCookie } }
        : {}
    )
  }

  // 6b) On success, redirect to nextPage, carrying forward the cookie
  return NextResponse.redirect(
    new URL(nextPage, request.url),
    setCookie
      ? { headers: { 'set-cookie': setCookie } }
      : {}
  )
}
