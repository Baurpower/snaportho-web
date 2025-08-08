// src/components/onboardingformclient.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import ProfileForm from './profileform'

type Props = { initialSession: Session | null }

// --- helpers ---------------------------------------------------------------

function getProjectRefFromUrl(url?: string): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    return u.hostname.split('.')[0] || null // <ref>.supabase.co
  } catch {
    return null
  }
}

function readCookie(name: string): string | null {
  const all = typeof document !== 'undefined' ? document.cookie : ''
  const hit = all.split('; ').find(p => p.startsWith(`${name}=`))
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null
}

// --- component -------------------------------------------------------------

export default function OnboardingFormClient({ initialSession }: Props) {
  const [ready, setReady] = useState(false)

  const projectRef = useMemo(
    () => getProjectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
    []
  )
  const baseCookie = projectRef ? `sb-${projectRef}-auth-token` : null

  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    ;(async () => {
      // If we can’t determine the cookie name, bounce to sign-in
      if (!baseCookie) {
        window.location.replace('/auth/sign-in?redirectTo=/onboarding')
        return
      }

      // Read main helper cookie (array payload)
      const raw = readCookie(baseCookie)
      if (!raw) {
        window.location.replace('/auth/sign-in?redirectTo=/onboarding')
        return
      }

      // Cookie format: ["<access_token>","<refresh_token or shortKey>",null,null,null]
      let arr: unknown
      try {
        arr = JSON.parse(raw)
      } catch {
        window.location.replace('/auth/sign-in?redirectTo=/onboarding')
        return
      }

      const tuple = Array.isArray(arr) ? arr : []
      const access0 = typeof tuple[0] === 'string' ? tuple[0] : ''
      let refresh1 = typeof tuple[1] === 'string' ? tuple[1] : ''

      // If second entry is a short key, the real refresh token lives in a secondary cookie
      if (refresh1 && refresh1.length < 80) {
        const secondaryName = `${baseCookie}.${refresh1}`
        const secondaryVal = readCookie(secondaryName)
        if (secondaryVal) refresh1 = secondaryVal
      }

      if (!access0 || !refresh1) {
        window.location.replace('/auth/sign-in?redirectTo=/onboarding')
        return
      }

      // Hydrate supabase-js with the tokens
      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: access0,
        refresh_token: refresh1,
      })

      if (setSessionError) {
        window.location.replace('/auth/sign-in?redirectTo=/onboarding')
        return
      }

      // Keep in sync for future refreshes
      const { data: listener } = supabase.auth.onAuthStateChange(() => {})
      unsubscribe = () => listener.subscription.unsubscribe()

      setReady(true)
    })()

    return () => {
      try { unsubscribe?.() } catch {}
    }
  }, [baseCookie, initialSession, projectRef])

  // Don’t render until hydrated
  if (!ready) return null

  return <ProfileForm mode="onboarding" />
}
