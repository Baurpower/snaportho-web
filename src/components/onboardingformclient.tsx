// src/components/onboardingformclient.tsx
'use client'

import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

type Props = { initialSession: Session }

export default function OnboardingFormClient({ initialSession }: Props) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let unsubscribe = () => {}

    ;(async () => {
      // Hydrate the browser client so supabase-js has tokens locally
      await supabase.auth.setSession({
        access_token: initialSession.access_token,
        refresh_token: initialSession.refresh_token,
      })

      // Keep local auth state in sync (even if tokens refresh)
      const { data } = supabase.auth.onAuthStateChange(() => {})
      unsubscribe = () => data.subscription.unsubscribe()

      setReady(true)
    })()

    return () => unsubscribe()
  }, [initialSession])

  // Don’t render until the client is hydrated
  if (!ready) return null

  return (
    <form>
      {/* your onboarding fields + submit */}
    </form>
  )
}
