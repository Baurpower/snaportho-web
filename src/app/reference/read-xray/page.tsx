import XrayPageClient from './xraypageclient';

export const metadata = {
  title: 'How to Read an Ortho X-Ray | SnapOrtho',
  description:
    'A no-fluff, step-by-step template for fracture conference or dictation—learn the views, location, key descriptors, and finish in a single polished sentence.',
  openGraph: {
    title: 'How to Read an Ortho X-Ray | SnapOrtho',
    description:
      'Simple 5-step format for fast, clear fracture dictations. Perfect for med-students and residents.',
    images: [
      {
        url: 'https://snap-ortho.com/og-image-reference-readxray.png',
        width: 1200,
        height: 630,
        alt: 'SnapOrtho – Read X-Ray Page OG Image',
      },
    ],
    type: 'article',
  },
  keywords: [
    'orthopaedic x-ray',
    'fracture conference',
    'dictation template',
    'radiograph interpretation',
    'SnapOrtho learn',
    'Read Xrays',
    'How to Read Xrays',
    'How to Read Ortho Xrays'
  ],
};

export default function LearnPage() {
  return <XrayPageClient />;
}
