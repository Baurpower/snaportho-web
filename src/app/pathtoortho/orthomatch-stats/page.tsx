import OrthoMatchStatsPageClient from './orthomatchstatspageclient';

export const metadata = {
  title: 'Orthopaedic Surgery Match Statistics',
  description:
    'Explore orthopaedic surgery match trends, compare Step 2 outcomes by applicant type, and understand dual applying.',
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
      'Orthopaedic surgery match trends with an interactive Step 2 outcome explorer and dual-applying guidance.',
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
