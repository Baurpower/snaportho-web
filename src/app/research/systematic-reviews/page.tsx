import type { Metadata } from 'next';
import SystematicReviewWorkspace from './workspace';

export const metadata: Metadata = { title: 'Systematic Review Playbook | Research 101', description: 'Plan and execute a transparent, reproducible, PRISMA-aligned systematic review.' };
export default function Page() { return <SystematicReviewWorkspace />; }
