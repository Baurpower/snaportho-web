import InterviewsPageClient from './interviewspageclient';

export const metadata = {
  title: 'Ortho Residency Interviews',
  description:
    'A practical guide to understanding Universal Offer Day and crushing your orthopaedic surgery interviews.',
  keywords: [
    'orthopaedics',
    'orthopaedic surgery',
    'education',
    'SnapOrtho',
    'residency interviews',
    'ERAS',
    'Universal Offer Day',
    'match ortho',
    'medical student resources',
    'interview prep',
  ],
  openGraph: {
    title: 'Ortho Residency Interviews',
    description:
      'Everything you need to know to navigate Universal Offer Day and perform confidently on ortho residency interviews.',
    url: 'https://snap-ortho.com/pathtoortho/interviews',
    siteName: 'SnapOrtho',
    images: [
      {
        url: 'https://snap-ortho.com/og-image-interviews.png',
        width: 1200,
        height: 630,
        alt: 'SnapOrtho Ortho Interviews OG Image',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ortho Interview Guide',
    description:
      'Your guide to Universal Offer Day and orthopaedic surgery residency interviews.',
    images: ['https://snap-ortho.com/og-image-interviews.png'],
  },
};

export default function Page() {
  return <InterviewsPageClient />; // ✅ render the client component
}
