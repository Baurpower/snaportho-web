// src/components/onboardingformclient.tsx
'use client'

import { useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

type Props = { initialSession: Session }

export default function OnboardingFormClient({ initialSession }: Props) {
  useEffect(() => {
    if (!initialSession) return
    supabase.auth
      .setSession({
        access_token: initialSession.access_token,
        refresh_token: initialSession.refresh_token,
      })
      .catch(() => {})
  }, [initialSession])

  // ⬇️ return your actual form UI here (whatever you had before)
  return (
    <form>
      {/* ...your onboarding fields and submit button... */}
    </form>
  )
}
