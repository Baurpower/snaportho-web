import OrthoMatchStatsPageClient from './orthomatchstatspageclient';

export const metadata = {
  title: 'Orthopaedic Surgery Match Statistics',
  description:
    'Explore orthopaedic surgery match trends, 2026 board score outcomes, dual applying patterns, and MD vs DO results.',
  alternates: {
    canonical: '/pathtoortho/orthomatch-stats',
  },
  keywords: [
    'orthopaedics',
    'orthopaedic surgery',
    'match statistics',
    'ortho match rates',
    'residency match ortho',
    'MD vs DO match',
    'IMG match ortho',
    'SnapOrtho',
    'medical student resources',
    'orthopaedic residency competitiveness',
  ],
  openGraph: {
    title: 'Orthopaedic Surgery Match Statistics',
    description:
      'Orthopaedic surgery match trends with 2026 board score outcomes, dual applying patterns, and MD vs DO match rates.',
    url: 'https://snap-ortho.com/pathtoortho/orthomatch-stats',
    siteName: 'SnapOrtho',
    images: [
      {
        url: 'https://snap-ortho.com/og-image-orthomatch-stats.png', // update if you create a custom image
        width: 1200,
        height: 630,
        alt: 'SnapOrtho Ortho Match Statistics',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Orthopaedic Match Statistics',
    description:
      'See orthopaedic match rates and trends across recent years — including MD, DO, and IMG outcomes.',
    images: ['https://snap-ortho.com/og-image-orthomatch-stats.png'],
  },
};

export default function Page() {
  return <OrthoMatchStatsPageClient />; // ✅ render the client component
}
