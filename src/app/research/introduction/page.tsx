import type { Metadata } from 'next';
import IntroductionWriterWorkspace from './workspace';

export const metadata: Metadata = { title: 'Writing a Great Introduction | Research Playbook', description: 'Learn the argument behind a compelling scientific introduction, then evaluate your draft with BroBot.' };

export default function Page() { return <IntroductionWriterWorkspace />; }
