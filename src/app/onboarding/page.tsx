// src/app/onboarding/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import OnboardingFormClient from '@/components/onboardingformclient'

export default function OnboardingPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.replace('/auth/sign-in?redirectTo=/onboarding')
    }
  }, [user, router])

  // Don’t flash the form while redirecting
  if (!user) return null

  return (
    <main className="max-w-2xl mx-auto py-12 px-4">
      <OnboardingFormClient />
    </main>
  )
}
