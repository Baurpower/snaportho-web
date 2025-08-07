// src/app/auth/confirm/route.ts
import { NextRequest } from 'next/server'
import { serialize }  from 'cookie'
import { createClient } from '@/utils/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const url        = new URL(request.url)
  const token_hash = url.searchParams.get('token_hash')
  const type       = url.searchParams.get('type') as EmailOtpType | null
  const nextPage   = url.searchParams.get('next') ?? '/onboarding'

  if (!token_hash || !type) {
    return Response.redirect(new URL('/error', request.url))
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash })

  if (error || !data.session) {
    return Response.redirect(new URL('/error', request.url))
  }

  // Build headers: 2 Set-Cookie + content-type
  const headers = new Headers()
  headers.append(
    'Set-Cookie',
    serialize('sb-access-token',  data.session.access_token,  { path: '/', httpOnly: true })
  )
  headers.append(
  'Set-Cookie',
  serialize('sb-access-token', data.session.access_token, {
    path: '/',
    httpOnly: true,
    secure: true,       // only send over HTTPS
    sameSite: 'lax',    // recommended for auth cookies
  })
)

headers.append(
  'Set-Cookie',
  serialize('sb-refresh-token', data.session.refresh_token, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
  })
)


  // Return a minimal HTML page that runs a real window.location.replace
  const html = `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><title>Confirming…</title></head>
  <body>
    <p style="font-family:sans-serif;padding:1rem;">Confirming your email…</p>
    <script>
      // Full browser navigation (so cookies stick) to your next page
      window.location.replace(${JSON.stringify(nextPage)});
    </script>
  </body>
</html>`

  return new Response(html, { status: 200, headers })
}
