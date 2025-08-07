// src/app/auth/confirm/route.ts
import { NextResponse }               from 'next/server'
import type { NextRequest }           from 'next/server'
import { serialize }                  from 'cookie'
import { createClient }               from '@/utils/supabase/server'
import type { EmailOtpType }          from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const url        = new URL(request.url)
  const token_hash = url.searchParams.get('token_hash')
  const type       = url.searchParams.get('type') as EmailOtpType | null
  const nextPage   = url.searchParams.get('next') ?? '/onboarding'

  // missing params -> error
  if (!token_hash || !type) {
    return NextResponse.redirect(new URL('/error', request.url))
  }

  // verify the OTP with your vanilla client
  const supabase = await createClient()
  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash })

  // failed verification -> error
  if (error || !data.session) {
    return NextResponse.redirect(new URL('/error', request.url))
  }

  // success -> set Supabase’s cookies and redirect
  const res = NextResponse.redirect(new URL(nextPage, request.url))
  res.headers.append(
    'Set-Cookie',
    serialize('sb-access-token',  data.session.access_token,  { path: '/', httpOnly: true })
  )
  res.headers.append(
    'Set-Cookie',
    serialize('sb-refresh-token', data.session.refresh_token, { path: '/', httpOnly: true })
  )
  return res
}
