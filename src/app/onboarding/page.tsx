// src/app/onboarding/page.tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import OnboardingFormClient from '@/components/onboardingformclient'

export default async function OnboardingPage() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    redirect('/auth/sign-in?redirectTo=/onboarding')
  }

  // Pass the session down so the browser client can hydrate
  return (
    <main className="max-w-2xl mx-auto py-12 px-4">
      <OnboardingFormClient initialSession={session} />
    </main>
  )
}
