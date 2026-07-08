export type BroBotProductTabId = 'caseprep' | 'chat';

export type BroBotProductTab = {
  id: BroBotProductTabId;
  label: 'CasePrep' | 'Chat';
  href: '/brobot' | '/brobot/chat';
  description: string;
};

export const broBotProductTabs = [
  {
    id: 'caseprep',
    label: 'CasePrep',
    href: '/brobot',
    description: 'Structured case prep',
  },
  {
    id: 'chat',
    label: 'Chat',
    href: '/brobot/chat',
    description: 'Open-ended ortho help',
  },
] satisfies BroBotProductTab[];

export function isBroBotProductTabActive(pathname: string | null, tab: BroBotProductTab) {
  if (!pathname) return false;

  if (tab.id === 'caseprep') {
    return pathname === tab.href;
  }

  return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
}
