// src/app/learn/modules/trauma/learntraumapagewrapper.tsx
'use client';

import dynamic from 'next/dynamic';

const TraumaModuleClient = dynamic(() => import('./learntraumapageclient'), {
  ssr: false,
});

export default function TraumaPageWrapper() {
  return <TraumaModuleClient />;
}
