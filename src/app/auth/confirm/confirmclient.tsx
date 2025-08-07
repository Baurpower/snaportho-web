'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function ConfirmClient() {
  const params = useSearchParams()!.toString()

  useEffect(() => {
    window.location.replace(`/api/auth/confirm?${params}`)
  }, [params])

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-gray-700">Confirming your email…</p>
    </div>
  )
}
