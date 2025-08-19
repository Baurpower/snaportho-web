import ERASPageClient from './eraspageclient';

export const metadata = {
  title: 'ERAS Applications | SnapOrtho',
  description: 'Our guide to ortho ERAS applications',
  keywords: [
    'orthopaedics',
    'education',
    'SnapOrtho',
    'residency applications',
    'ERAS',
    'match ortho',
    'future of orthopaedics',
    'medical student resources',
  ],
  openGraph: {
    title: 'ERAS Applications | SnapOrtho',
    description: 'Everything you need to know about ortho ERAS applications.',
    url: 'https://snap-ortho.com/pathtoortho/eras',
    siteName: 'SnapOrtho',
    images: [
      {
        url: 'https://snap-ortho.com/og-image-eras.png',
        width: 1200,
        height: 630,
        alt: 'SnapOrtho ERAS OG Image',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ERAS Application Guide',
    description: 'Your guide to ortho residency applications (ERAS).',
    images: ['https://snap-ortho.com/og-image-eras.png'],
  },
};

export default function Page() {
  return <ERASPageClient />; // ✅ render the client component
}
