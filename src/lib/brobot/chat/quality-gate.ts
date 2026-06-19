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

function lineCountMatching(answer: string, patterns: RegExp[]) {
  return answer
    .split(/\n+/)
    .filter((line) => patterns.some((pattern) => pattern.test(line))).length;
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

  if (input.mode === 'or_prep') {
    if (
      tokenHits(answer, [
        'exposure',
        'approach',
        'incision',
        'portal',
        'interval',
        'corridor',
        'landmark',
        'retractor',
        'visualization',
      ]) < 2
    ) {
      warnings.push('or_prep_exposure_terms_missing');
    }

    if (
      tokenHits(answer, [
        'nerve',
        'vessel',
        'artery',
        'vein',
        'tendon',
        'cartilage',
        'physis',
        'dura',
        'radial',
        'ulnar',
        'median',
        'sciatic',
        'peroneal',
        'femoral',
        'axillary',
        'saphenous',
      ]) < 1
    ) {
      warnings.push('or_prep_named_anatomy_missing');
    }

    if (
      tokenHits(answer, [
        'decide',
        'decision',
        'choice',
        'if',
        'when',
        'check',
        'confirm',
        'fluoro',
        'stability',
      ]) < 1
    ) {
      warnings.push('or_prep_decision_point_missing');
    }

    if (tokenHits(answer, ['pitfall', 'bailout', 'troubleshoot', 'mistake', 'avoid']) < 1) {
      warnings.push('or_prep_pitfall_bailout_missing');
    }

    if (
      tokenHits(answer, [
        'student',
        'intern',
        'pgy',
        'resident',
        'learner',
        'attending',
        'ask',
        'expect',
      ]) < 1
    ) {
      warnings.push('or_prep_learner_level_signal_missing');
    }

    if (
      lineCountMatching(answer, [
        /^\s*(?:[-*]|\d+[.)])\s*(?:then|next|after|start|close|place|make)\b/i,
        /^\s*(?:[-*]|\d+[.)])\s*(?:step\s*)?\d+\b/i,
      ]) >= 5 &&
      tokenHits(answer, ['objective', 'exposure', 'decision', 'pitfall', 'bailout']) < 3
    ) {
      warnings.push('or_prep_generic_chronology_dominant');
    }
  }

  if (input.mode === 'consult' && tokenHits(answer, ['missing', 'red flag', 'exam', 'imaging', 'urgent', 'present']) < 2) {
    warnings.push('consult_framework_weak');
  }

  if (input.mode === 'oite') {
    if (tokenHits(answer, ['trap', 'distractor', 'wrong answer', 'commonly miss', 'except']) < 1) {
      warnings.push('oite_trap_missing');
    }

    if (
      tokenHits(answer, [
        'differentiate',
        'distinguish',
        'versus',
        'vs',
        'compare',
        'similar',
        'mimic',
      ]) < 1
    ) {
      warnings.push('oite_comparison_missing');
    }

    if (
      tokenHits(answer, [
        'algorithm',
        'treatment',
        'management',
        'threshold',
        'indication',
        'operative',
        'nonoperative',
      ]) < 1
    ) {
      warnings.push('oite_algorithm_missing');
    }

    if (
      tokenHits(answer, [
        'board',
        'oite',
        'classic',
        'tested',
        'pearl',
        'stem',
        'high yield',
      ]) < 1
    ) {
      warnings.push('oite_board_pearl_missing');
    }

    if (
      tokenHits(answer, [
        'stem',
        'clue',
        'answer choice',
        'eliminate',
        'recognize',
        'buzzword',
        'test',
      ]) < 1
    ) {
      warnings.push('oite_test_taking_signal_missing');
    }
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
