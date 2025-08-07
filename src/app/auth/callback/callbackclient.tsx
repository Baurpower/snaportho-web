'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCallbackClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const finalizeSignIn = async () => {
      try {
        // Extract auth code from URL query string
        const url = new URL(window.location.href)
        const authCode = url.searchParams.get('code')

        if (!authCode) {
          setError('Missing authentication code.')
          setLoading(false)
          return
        }

        // Exchange the auth code for a session
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode)
        if (exchangeError) {
          console.error('exchangeCodeForSession error:', exchangeError)
          setError('Authentication failed. Please try again.')
          setLoading(false)
          return
        }

        // Get the current user from the session
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          console.error('getUser error:', userError)
          setError('User not found. Please try signing in again.')
          setLoading(false)
          return
        }

        // Redirect to onboarding or dashboard page
        router.replace('/onboarding')

      } catch (err) {
        console.error('Unexpected error:', err)
        setError('An unexpected error occurred. Please try again.')
        setLoading(false)
      }
    }

    finalizeSignIn()
  }, [router])

  if (loading && !error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Finalizing your sign-in…</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-red-600">{error}</p>
    </div>
  )
}
