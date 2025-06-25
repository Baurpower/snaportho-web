import FundPageClient from './fundpageclient';

export const metadata = {
  title: 'Fundraising | SnapOrtho',
  description: 'Support us in building the orthopaedic resource every med student deserves',
  keywords: [
    'orthopaedics',
    'education',
    'SnapOrtho',
    'fracture',
    'x-rays',
    'support medical education',
    'future of orthopaedics',
    'medical student resources',
  ],
  openGraph: {
    title: 'Fundraising | SnapOrtho',
    description: 'Support the future of orthopaedic learning with SnapOrtho',
    url: 'https://snap-ortho.com/fundraising',
    siteName: 'SnapOrtho',
    images: [
      {
        url: 'https://snap-ortho.com/og-image-fundraising.png',
        width: 1200,
        height: 630,
        alt: 'SnapOrtho Fundraising OG Image',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SnapOrtho',
    description: 'Support the future of orthopaedic learning with SnapOrtho',
    images: ['https://snap-ortho.com/og-image-fundraising.png'],
  },
};

export default function FundraisingPage() {
  return <FundPageClient />;
}
