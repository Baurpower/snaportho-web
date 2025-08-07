// src/app/api/auth/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { serialize }  from 'cookie'
import { createClient } from '@/utils/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const url        = new URL(request.url)
  const token_hash = url.searchParams.get('token_hash')
  const type       = url.searchParams.get('type') as EmailOtpType | null
  const nextPage   = url.searchParams.get('next') ?? '/onboarding'

  if (!token_hash || !type) {
    return new Response(null, {
      status: 307,
      headers: { Location: '/learn' }
    })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash })

  if (error || !data.session) {
    return new Response(null, {
      status: 307,
      headers: { Location: '/learn' }
    })
  }

  // build headers object all at once
  const headers = new Headers({
    Location: nextPage,
  })

  const cookieOpts = {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    domain: '.snap-ortho.com',    // ← so it works on both www and non‐www
    // maxAge: data.session.expires_in   // optional
  }

  headers.append(
    'Set-Cookie',
    serialize('sb-access-token', data.session.access_token, cookieOpts)
  )
  headers.append(
    'Set-Cookie',
    serialize('sb-refresh-token', data.session.refresh_token, cookieOpts)
  )

  // return a single 307 with cookies + Location
  return new Response(null, {
    status: 307,
    headers
  })
}
