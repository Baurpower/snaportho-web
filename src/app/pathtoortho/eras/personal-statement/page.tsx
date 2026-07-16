import type { Metadata } from 'next';
import PersonalStatementWorkspace from './personalstatementworkspace';

export const metadata: Metadata = {
  title: 'BroBot Personal Statement Review | SnapOrtho',
  description: 'See whether your personal statement sounds authentically yours—or like generic, machine-polished applicant writing.',
  alternates: { canonical: '/pathtoortho/eras/personal-statement' },
};

export default function PersonalStatementReviewPage() {
  return <PersonalStatementWorkspace />;
}
