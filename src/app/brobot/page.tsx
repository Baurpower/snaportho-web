import BroBotPageWrapper from './brobotpagewrapper';

export const metadata = {
  title: 'Ortho BroBot: Prep for Cases Faster',
  description:
    'Quickly prepare for cases!',
  openGraph: {
    title: 'Ortho BroBot: Prep for Cases Faster',
    description:
      'Ortho BroBot highlights the most relevant questions to know before your case.',
    images: [
      {
        url: 'https://snap-ortho.com/og-image-reference-caseprep.png',
        width: 1200,
        height: 630,
        alt: 'SnapOrtho – Read X-Ray Page OG Image',
      },
    ],
    type: 'article',
  },
  keywords: [
    'orthopaedic rotations',
    'OR prep',
    'case prep',
    'Learn orthopaedics',
    'SnapOrtho reference',
    'Prepare faster',
    'ortho',
    'medical student'
  ],
};

export default function LearnPage() {
  return <BroBotPageWrapper />;
}
