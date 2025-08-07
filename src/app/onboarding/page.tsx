// src/app/onboarding/page.tsx
import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import OnboardingFormClient from '@/components/onboardingformclient'

export default async function OnboardingPage() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    // no session cookie → kick back to sign-in
    redirect('/auth/sign-in')
  }

  // session exists → render the form
  return (
    <main className="max-w-2xl mx-auto py-12 px-4">
      <OnboardingFormClient mode="onboarding" />
    </main>
  )
}
