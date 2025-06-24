'use client';

import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import DonationForm from '@/components/fundraising/donationform';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function DonationFormWrapper() {
  return (
    <Elements stripe={stripePromise}>
      <DonationForm />
    </Elements>
  );
}
