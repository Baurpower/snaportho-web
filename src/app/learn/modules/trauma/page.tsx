import TraumaPageWrapper from './learntraumapagewrapper';

export const metadata = {
  title: 'Trauma Module | SnapOrtho Learn',
  description:
    'Master orthopaedic trauma with high-yield, visual-first lessons for med students and residents.',
  keywords: [
    'orthopaedics',
    'trauma module',
    'fracture classification',
    'AO classification',
    'SnapOrtho Learn',
    'orthopaedic trauma education',
    'trauma surgery',
    'medical student orthopaedics',
  ],
  openGraph: {
    title: 'Trauma Module | SnapOrtho Learn',
    description: 'Learn trauma visually — from AO classification to fixation principles.',
    url: 'https://snap-ortho.com/learn/modules/trauma',
    siteName: 'SnapOrtho',
    images: [
      {
        url: 'https://snap-ortho.com/og-image-learn.png',
        width: 1200,
        height: 630,
        alt: 'SnapOrtho Trauma OG Image',
      },
    ],
    locale: 'en_US',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trauma Module | SnapOrtho Learn',
    description: 'Master trauma faster. Visual orthopaedics built for med students.',
    images: ['https://snap-ortho.com/og-image-learn.png'],
  },
};

export default function TraumaPage() {
  return <TraumaPageWrapper />;
}
