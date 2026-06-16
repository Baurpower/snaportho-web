import { getAnswerRubric } from './answer-rubrics';
import type {
  BroBotChatMode,
  BroBotResponseDepth,
} from './types';

export type BroBotQualityGateResult = {
  passed: boolean;
  warnings: string[];
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenHits(answer: string, terms: string[]) {
  const normalized = normalize(answer);
  return terms.filter((term) => normalized.includes(normalize(term))).length;
}

function branchTerms(label: string): string[] {
  return label
    .split(/\s+|\/|-/)
    .map((term) => term.replace(/[^a-z0-9]/gi, '').trim())
    .filter((term) => term.length >= 4);
}

export function runBroBotQualityGate(input: {
  answer: string;
  mode: BroBotChatMode;
  responseDepth: BroBotResponseDepth;
  selectedBranchId?: string;
  selectedBranchLabel?: string;
  subintent?: string;
}): BroBotQualityGateResult {
  const warnings: string[] = [];
  const answer = input.answer.trim();
  const selectedBranchLabel = input.selectedBranchLabel?.trim();

  if (selectedBranchLabel) {
    const hits = tokenHits(answer, branchTerms(selectedBranchLabel));
    if (hits === 0 && !/general/i.test(selectedBranchLabel)) {
      warnings.push('selected_branch_terms_missing');
    }
  }

  if (input.responseDepth !== 'quick' && answer.length < 450) {
    warnings.push('answer_short_for_depth');
  }

  if (
    input.mode === 'or_prep' &&
    tokenHits(answer, [
      'approach',
      'exposure',
      'reduction',
      'implant',
      'fluoro',
      'landmark',
      'nerve',
      'vessel',
      'pitfall',
      'postop',
    ]) < 3
  ) {
    warnings.push('limited_concrete_ortho_detail');
  }

  if (input.mode === 'consult' && tokenHits(answer, ['missing', 'red flag', 'exam', 'imaging', 'urgent', 'present']) < 2) {
    warnings.push('consult_framework_weak');
  }

  const rubric = getAnswerRubric({
    mode: input.mode,
    selectedBranchId: input.selectedBranchId,
    selectedBranchLabel: input.selectedBranchLabel,
    subintent: input.subintent,
  });

  if (rubric?.length) {
    const hits = tokenHits(answer, rubric);
    if (hits < Math.min(3, rubric.length)) {
      warnings.push('branch_rubric_coverage_low');
    }
  }

  return {
    passed: warnings.length === 0,
    warnings,
  };
}
