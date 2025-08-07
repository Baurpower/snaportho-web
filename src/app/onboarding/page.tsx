// src/app/onboarding/page.tsx
import { redirect }                    from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies }                     from 'next/headers'
import dynamic                         from 'next/dynamic'

// Load your client-only wrapper for the form
const OnboardingFormClient = dynamic(
  () => import('@/components/onboardingformclient'),
  { ssr: false }
)

export default async function OnboardingPage() {
  // 1) Create a cookie-aware Supabase client
  const supabase = createServerComponentClient({ cookies })

  // 2) Fetch current session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // 3) If not signed in, send them to sign-in (with redirect back here)
  if (!session) {
    redirect(`/auth/sign-in?redirectTo=/onboarding`)
  }

  // 4) Authenticated → show the onboarding form
  return (
    <main className="max-w-2xl mx-auto py-12 px-4">
      <OnboardingFormClient mode="onboarding" />
    </main>
  )
}
