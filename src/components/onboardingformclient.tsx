'use client'

import dynamic from 'next/dynamic'

// Dynamically import your real form UI (so it can use hooks, etc)
const ProfileForm = dynamic(() => import('./profileform'), { ssr: false })

export default function OnboardingFormClient() {
  return <ProfileForm mode="onboarding" />
}