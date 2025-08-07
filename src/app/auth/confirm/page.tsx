// src/app/auth/confirm/page.tsx
'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function ConfirmClient() {
  // Grab the raw query string (non-null)
  const params = useSearchParams()!.toString()

  useEffect(() => {
    // Hard‐navigate the browser to your API route so cookies stick
    window.location.replace(`/api/auth/confirm?${params}`)
  }, [params])

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-gray-700">Confirming your email…</p>
    </div>
  )
}
