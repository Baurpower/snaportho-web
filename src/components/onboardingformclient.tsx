// src/components/onboardingformclient.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import ProfileForm from './profileform'

type Props = {
  // We still accept it, but we won't trust it for tokens.
  initialSession: Session | null
}

// --- helpers ---------------------------------------------------------------

function getProjectRefFromUrl(url: string | undefined): string | null {
  if (!url) return null
  // https://<ref>.supabase.co
  try {
    const u = new URL(url)
    const host = u.hostname // e.g. geznczcokbgyb...supabase.co
    const ref = host.split('.')[0]
    return ref || null
  } catch {
    return null
  }
}

function readCookie(name: string): string | null {
  const all = typeof document !== 'undefined' ? document.cookie : ''
  const parts = all.split('; ').map(s => s.trim())
  const hit = parts.find(p => p.startsWith(`${name}=`))
  if (!hit) return null
  return decodeURIComponent(hit.substring(name.length + 1))
}

function summarizeSession(sess: Session | null) {
  if (!sess) return null
  return {
    userId: sess.user.id,
    email: sess.user.email,
    expiresAt: sess.expires_at,
  }
}

// --- component -------------------------------------------------------------

export default function OnboardingFormClient({ initialSession }: Props) {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [debug, setDebug] = useState<Record<string, unknown>>({ mounted: false })

  const projectRef = useMemo(
    () => getProjectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
    []
  )
  const cookieName = projectRef ? `sb-${projectRef}-auth-token` : null

  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    ;(async () => {
      setDebug(d => ({
        ...d,
        mounted: true,
        projectRef,
        cookieName,
        initialSession: summarizeSession(initialSession),
      }))

      try {
        // 1) Pull real tokens from the helper cookie
        if (!cookieName) {
          setErr('Supabase project ref not found')
          return
        }
        const raw = readCookie(cookieName)
        if (!raw) {
          setErr('Auth cookie missing')
          return
        }

        // Cookie format: ["<access_token>","<refresh_token>",null,null,null]
        let parsed: unknown
        try {
          parsed = JSON.parse(raw)
        } catch {
          setErr('Auth cookie unreadable')
          return
        }
        const arr = Array.isArray(parsed) ? parsed : []
        const access_token = typeof arr[0] === 'string' ? arr[0] : ''
        const refresh_token = typeof arr[1] === 'string' ? arr[1] : ''

        setDebug(d => ({
          ...d,
          accessLen: access_token?.length ?? 0,
          refreshLen: refresh_token?.length ?? 0,
        }))

        if (!access_token || !refresh_token) {
          setErr('Auth tokens missing from cookie')
          return
        }

        // 2) Hydrate supabase-js in the browser with those tokens
        const { error: setSessionError, data: setData } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        })
        if (setSessionError) {
          console.warn('[onboarding] setSession error', setSessionError)
          setErr(setSessionError.message)
          return
        }
        setDebug(d => ({ ...d, setSessionOK: true, setDataPresent: !!setData?.session }))

        // 3) Verify with a fresh read
        const { data: after } = await supabase.auth.getSession()
        setDebug(d => ({ ...d, sessionAfterSet: summarizeSession(after.session) }))

        const { data: ures } = await supabase.auth.getUser()
        setUser(ures?.user ?? null)

        // 4) Keep in sync for refresh/changes
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
          setDebug(d => ({ ...d, lastAuthEvent: event, lastSession: summarizeSession(session) }))
          setUser(session?.user ?? null)
        })
        unsubscribe = () => listener.subscription.unsubscribe()
      } catch (e: unknown) {
        console.error('[onboarding] hydration failed', e)
        setErr(e instanceof Error ? e.message : 'unknown error')
      } finally {
        setReady(true)
      }
    })()

    return () => {
      try {
        unsubscribe?.()
      } catch {}
    }
  }, [cookieName, initialSession, projectRef])

  // Don’t render anything until hydrated (prevents false “not logged in”)
  if (!ready) return null

  // Show a small debug panel (remove later if you want)
  return (
    <div className="space-y-6">
      <div className="p-4 bg-amber-50 border border-amber-200 rounded">
        <div><strong>User:</strong> {user ? `${user.id} · ${user.email}` : 'null'}</div>
        {err && <div className="text-red-600"><strong>Error:</strong> {err}</div>}
        <pre className="mt-2 whitespace-pre-wrap break-words text-xs">
          {JSON.stringify(debug, null, 2)}
        </pre>
      </div>

      {/* Your actual onboarding form */}
      <ProfileForm mode="onboarding" />
    </div>
  )
}
