import type { BroBotChatMode, BroBotProcedureCategory } from './types';

export type BroBotCertifiedContext = {
  source: 'caseprep';
  title: string;
  sections: Array<{
    label: string;
    content: string;
  }>;
} | null;

export async function getCasePrepCertifiedContext(input: {
  procedureOrTopic: string;
  procedureCategory: BroBotProcedureCategory;
  mode: BroBotChatMode;
  selectedBranchLabel?: string;
}): Promise<BroBotCertifiedContext> {
  void input;
  // Scaffold only. Future integration should read certified CasePrep context
  // through a dedicated read-only adapter and inject only branch-relevant snippets.
  return null;
}
