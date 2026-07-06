import { Suspense } from 'react';

import CheckoutSuccessClient from './checkoutsuccessclient';

export const metadata = {
  title: 'BroBot Unlimited — Checkout Success',
  description: 'Your BroBot Unlimited subscription is being activated after checkout.',
};

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-midnight text-white flex items-center justify-center">
          <p className="text-sm text-white/70">Loading your subscription...</p>
        </main>
      }
    >
      <CheckoutSuccessClient />
    </Suspense>
  );
}