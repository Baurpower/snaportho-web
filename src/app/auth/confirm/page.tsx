import { Suspense } from 'react'
import ConfirmClient from './confirmclient'

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-700">Loading confirmation...</p>
      </div>
    }>
      <ConfirmClient />
    </Suspense>
  )
}