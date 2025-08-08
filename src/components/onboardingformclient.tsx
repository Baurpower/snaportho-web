// src/components/onboardingformclient.tsx
'use client'

import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import ProfileForm from '@/components/profileform'

type Props = { initialSession: Session }

const summarizeSession = (s: Session | null) =>
  !s
    ? null
    : {
        userId: s.user?.id,
        email: s.user?.email,
        accessLen: s.access_token?.length ?? 0,
        refreshLen: s.refresh_token?.length ?? 0,
        expiresAt: s.expires_at,
      }

export default function OnboardingFormClient({ initialSession }: Props) {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [debug, setDebug] = useState<Record<string, unknown>>({
    mounted: true,
    initialSession: summarizeSession(initialSession),
  })

  useEffect(() => {
    let unsubscribe: (() => void) | null = null

    ;(async () => {
      try {
        console.log('[onboarding] initialSession', summarizeSession(initialSession))

        // rename to avoid shadowing setErr
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: initialSession.access_token,
          refresh_token: initialSession.refresh_token,
        })
        if (setSessionError) {
          console.warn('[onboarding] setSession error', setSessionError)
          setErr(setSessionError.message)
        } else {
          console.log('[onboarding] setSession OK')
        }

        const { data: sessAfter } = await supabase.auth.getSession()
        console.log('[onboarding] getSession after setSession', summarizeSession(sessAfter.session))
        setDebug((d) => ({ ...d, sessionAfterSet: summarizeSession(sessAfter.session) }))

        const { data: userRes, error: getUserError } = await supabase.auth.getUser()
        if (getUserError) {
          console.warn('[onboarding] getUser error', getUserError)
          setErr(getUserError.message)
        }
        setUser(userRes?.user ?? null)
        console.log('[onboarding] getUser', { id: userRes?.user?.id, email: userRes?.user?.email })

        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
          console.log('[onboarding] onAuthStateChange', event, summarizeSession(session))
          setDebug((d) => ({ ...d, lastAuthEvent: event, lastSession: summarizeSession(session) }))
          setUser(session?.user ?? null)
        })
        unsubscribe = listener?.subscription?.unsubscribe ?? null
      } catch (e: unknown) {
  console.error('[onboarding] hydration failed', e)
  if (e instanceof Error) {
    setErr(e.message)
  } else {
    setErr('unknown error')
  }
}
 finally {
        setReady(true)
      }
    })()

    return () => {
      if (unsubscribe) {
        try { unsubscribe() } catch {}
      }
    }
  }, [initialSession.access_token, initialSession.refresh_token])

  if (!ready) {
    return <div className="p-4 text-sm text-midnight/70">Hydrating session in browser…</div>
  }

  return (
    <>
      <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
        <div><strong>User:</strong> {user ? `${user.id} · ${user.email}` : 'null'}</div>
        <div><strong>Error:</strong> {err ?? 'none'}</div>
        <pre className="mt-2 whitespace-pre-wrap break-words">
{JSON.stringify(debug, null, 2)}
        </pre>
      </div>

      <ProfileForm mode="onboarding" />
    </>
  )
}
