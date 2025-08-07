// src/app/onboarding/page.tsx
import { redirect }                    from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies }                     from 'next/headers'
import OnboardingFormClient            from '@/components/onboardingformclient'

export default async function OnboardingPage() {
  // 1) Create a Supabase client that reads cookies
  const supabase = createServerComponentClient({ cookies })

  // 2) Re-validate and fetch the user (safer than getSession())
  const { data: { user }, error } = await supabase.auth.getUser()

  // 3) If not signed in, send them to sign-in (with redirect back here)
  if (error || !user) {
    redirect(`/auth/sign-in?redirectTo=/onboarding`)
  }

  // 4) Authenticated → show the onboarding form
  return (
    <main className="max-w-2xl mx-auto py-12 px-4">
      <OnboardingFormClient mode="onboarding" />
    </main>
  )
}
