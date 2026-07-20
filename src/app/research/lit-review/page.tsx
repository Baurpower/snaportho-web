import type { Metadata } from 'next';
import LiteratureReviewWorkspace from './workspace';

export const metadata: Metadata = {
  title: 'Literature Review | Research Playbook',
  description: 'Learn how to search, evaluate, synthesize, and identify a publishable knowledge gap, then evaluate your review with BroBot.',
};

export default function Page() { return <LiteratureReviewWorkspace />; }
