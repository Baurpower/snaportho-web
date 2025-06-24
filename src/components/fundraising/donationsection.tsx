'use client';

import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import DonationForm from './DonationForm';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function DonationSection() {
  return (
    <Elements stripe={stripePromise} options={{ appearance: { theme: 'night' } }}>
      <DonationForm />
    </Elements>
  );
}
