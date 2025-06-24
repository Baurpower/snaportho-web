import { Suspense } from 'react';
import ClientThankYou from './client-thankyou';

export default function ThankYouPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ClientThankYou />
    </Suspense>
  );
}
