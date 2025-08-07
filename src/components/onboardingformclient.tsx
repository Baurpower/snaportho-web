'use client'

import dynamic from 'next/dynamic'

// Dynamically load the actual form UI component
const ProfileForm = dynamic(
  () => import('./profileform'),
  { ssr: false }
)

interface OnboardingFormClientProps {
  mode: 'onboarding'
}

export default function OnboardingFormClient({ mode }: OnboardingFormClientProps) {
  return <ProfileForm mode={mode} />
}
