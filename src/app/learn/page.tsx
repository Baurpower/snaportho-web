import LearnPageWrapper from './learnpagewrapper';

export const metadata = {
  title: 'Learn | SnapOrtho',
  description:
    'Built for busy med students—SnapOrtho Learn transforms ortho topics into quick, visual lessons that stick',
  keywords: [
    'orthopaedics',
    'education',
    'SnapOrtho',
    'fracture',
    'fracture classification',
    'trauma management',
    'orthopaedic management',
    'x-rays',
    'medical education',
    'future of orthopaedics',
    'medical student',
  ],
  openGraph: {
    title: 'Learn | SnapOrtho',
    description: 'Learn complex orthopaedic concepts faster with visual sketches',
    url: 'https://snap-ortho.com/learn',
    siteName: 'SnapOrtho',
    images: [
      {
        url: 'https://snap-ortho.com/og-image-learn.png',
        width: 1200,
        height: 630,
        alt: 'SnapOrtho Learn OG Image',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SnapOrtho',
    description: 'Master orthopaedics faster—powered by visual learning',
    images: ['https://snap-ortho.com/og-image-learn.png'],
  },
};

export default function LearnPage() {
  return <LearnPageWrapper />;
}
