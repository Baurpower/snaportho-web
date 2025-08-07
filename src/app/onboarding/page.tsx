// src/app/onboarding/page.tsx
import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import OnboardingFormClient from '@/components/onboardingformclient'

export default async function OnboardingPage() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    // kick unauthenticated users back to sign-in, then return here
    redirect('/auth/sign-in?redirectTo=/onboarding')
  }

  return (
    <main className="max-w-2xl mx-auto py-12 px-4">
      <OnboardingFormClient />
    </main>
  )
}
