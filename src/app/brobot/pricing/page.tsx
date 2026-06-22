import type { Metadata } from 'next';

import BroBotPricingClient from './pricingclient';

export const metadata: Metadata = {
  title: 'BroBot Pricing | Orthopaedic AI Assistant',
  description:
    'View BroBot free and unlimited pricing options for orthopaedic AI learning, OITE prep, OR prep, consults, and case preparation.',
  alternates: {
    canonical: '/brobot/pricing',
  },
};

export default function PricingPage() {
  return <BroBotPricingClient />;
}
