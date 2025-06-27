import CaseprepPageClient from './casepreppageclient';

export const metadata = {
  title: 'Case Prep',
  description:
    'Quickly prepare for cases!',
  openGraph: {
    title: 'Case Prep',
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
  return <CaseprepPageClient />;
}
