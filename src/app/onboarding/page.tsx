// src/app/onboarding/page.tsx
import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import OnboardingFormClient from '@/components/onboardingformclient'

export default async function OnboardingPage() {
  const { data: { session } } = await createServerComponentClient({ cookies })
    .auth.getSession()

  if (!session) redirect('/auth/sign-in')

  return (
    <main className="max-w-2xl mx-auto py-12 px-4">
      <OnboardingFormClient />
    </main>
  )
}
