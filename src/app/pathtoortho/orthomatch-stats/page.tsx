import OrthoMatchStatsPageClient from './orthomatchstatspageclient';

export const metadata = {
  title: 'Orthopaedic Surgery Match Statistics',
  description:
    'Explore orthopaedic surgery match trends over time, including overall match rates, MD vs DO outcomes, and applicant breakdowns.',
  alternates: {
    canonical: '/pathtoortho/match-statistics',
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
      'A clear, easy-to-understand breakdown of orthopaedic surgery match trends, including overall, MD, and DO match rates.',
    url: 'https://snap-ortho.com/pathtoortho/match-statistics',
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