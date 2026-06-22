import type { Metadata } from 'next';
import { Suspense } from 'react';

import WelcomeClient from './welcomeclient';

export const metadata: Metadata = {
  title: 'Welcome to BroBot | SnapOrtho',
  description: 'Create your SnapOrtho account to start using your BroBot subscription.',
};

export default function WelcomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-midnight" />}>
      <WelcomeClient />
    </Suspense>
  );
}
