import { getAnswerRubric } from './answer-rubrics';
import { entityToTopic, extractOrthoEntity } from './entity-extractor';
import { CLARIFICATION_ANSWER_MAX_LENGTH } from './answer-router';
import type {
  BroBotClinicalContext,
  BroBotChatMode,
  BroBotResponseDepth,
  BroBotTrainingLevel,
} from './types';
import type { BroBotAnswerRoute } from './answer-router';
import { detectBroBotInteractionConstraints } from './interaction-constraints';
import { deriveBroBotLatestTurnTask } from './latest-turn-task';
import { BROBOT_OR_PREP_TASK_CONTRACT_ENABLED } from '@/lib/brobot/model-config';

export type BroBotQualityGateResult = {
  passed: boolean;
  warnings: string[];
};

// High-yield terms an answer about a known entity should name at least one of.
// Keyed by the canonical topic produced by entityToTopic(). Warning-only.
const ENTITY_EXPECTED_TERMS: Record<string, string[]> = {
  'proximal humerus': ['deltopectoral', 'deltoid', 'axillary', 'greater tuberosity', 'cephalic'],
  'distal radius': ['fcr', 'volar', 'median nerve', 'pronator quadratus', 'watershed'],
  ankle: ['weber', 'lauge-hansen', 'syndesmosis', 'medial clear space', 'malleol'],
  'reverse total shoulder arthroplasty': [
    'glenosphere',
    'baseplate',
    'deltoid',
    'cuff tear arthropathy',
    'notch',
  ],
  'femoral neck': ['garden', 'pauwels', 'avn', 'avascular', 'arthroplasty'],
  'intertrochanteric femur': [
    'cephalomedullary',
    'tip-apex',
    'lag screw',
    'reverse obliquity',
    'cutout',
  ],
};

const JUNIOR_LEVELS = new Set<BroBotTrainingLevel>(['med_student', 'pgy1']);
const SENIOR_LEVELS = new Set<BroBotTrainingLevel>(['pgy4', 'pgy5', 'attending']);

const JUNIOR_SHAPE_TERMS = [
  'orient',
  'landmark',
  'identify',
  'first',
  'start',
  'next',
  'step',
  'retractor',
  'position',
  'where',
];

const SENIOR_SHAPE_TERMS = [
  'judgment',
  'judgement',
  'alternative',
  'bailout',
  'tradeoff',
  'trade off',
  'salvage',
  'revision',
  'consider',
  'depends',
  'nuance',
  'controversy',
  'versus',
];

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

function hasEmptyCaveat(answer: string) {
  return /depends on (patient|clinical|individual) factors|patient-specific factors|management varies|use clinical judgment/i.test(answer);
}

function hasDecisionSignal(answer: string) {
  return tokenHits(answer, [
    'because',
    'why',
    'therefore',
    'threshold',
    'pivot',
    'changes management',
    'changes treatment',
    'indication',
    'operative',
    'nonoperative',
    'stability',
    'unstable',
    'if',
    'when',
  ]) >= 1;
}

function hasPearlSignal(answer: string) {
  return tokenHits(answer, [
    'attending',
    'pitfall',
    'mistake',
    'trap',
    'pearl',
    'miss',
    'avoid',
    'bailout',
    'classic',
  ]) >= 1;
}

function hasKnownTopic(context?: BroBotClinicalContext) {
  if (!context) return false;
  return Object.values(context.entities).some(Boolean);
}

function genericTopicSignal(answer: string) {
  return tokenHits(answer, [
    'patient factors',
    'patient-specific',
    'understand the anatomy',
    'know the complications',
    'appropriate imaging',
    'treatment options',
    'clinical judgment',
    'depends',
    'general principles',
  ]);
}

function entitySpecificHits(answer: string, context?: BroBotClinicalContext) {
  if (!context) return 0;
  const terms = Object.values(context.entities)
    .filter((value): value is string => typeof value === 'string' && value.length > 2)
    .flatMap((value) => value.split(/\s+|-/).filter((part) => part.length >= 4));
  return tokenHits(answer, terms);
}

// Subintents where OITE board-specific language checks are inappropriate.
// Quiz format uses Q&A pairs that don't naturally contain trap/comparison/pearl language.
// Anatomy-at-risk is a factual recall task, not a board strategy task.
const OITE_BOARD_CHECKS_EXEMPT = new Set([
  'quiz',
  'oite_traps',
  'anatomy_at_risk',
  'patient_explanation',
]);

// Subintents where clinic framework check should not fire.
// Indications and classification answers don't need history/exam/imaging mentions.
const CLINIC_FRAMEWORK_EXEMPT = new Set([
  'indications',
  'operative_indications',
  'classification',
  'treatment_algorithm',
  'treatment_plan',
]);

export function runBroBotQualityGate(input: {
  answer: string;
  mode: BroBotChatMode;
  responseDepth: BroBotResponseDepth;
  selectedBranchId?: string;
  selectedBranchLabel?: string;
  subintent?: string;
  trainingLevel?: BroBotTrainingLevel;
  procedureOrTopic?: string;
  answerRoute?: BroBotAnswerRoute;
  clinicalContext?: BroBotClinicalContext;
  question?: string;
}): BroBotQualityGateResult {
  const warnings: string[] = [];
  const answer = input.answer.trim();
  const selectedBranchLabel = input.selectedBranchLabel?.trim();
  const latestTask = input.question
    ? deriveBroBotLatestTurnTask({
        message: input.question,
        topic: input.procedureOrTopic,
        constraints: detectBroBotInteractionConstraints({ message: input.question }),
      })
    : null;
  const narrowOrPrepTask = BROBOT_OR_PREP_TASK_CONTRACT_ENABLED && input.mode === 'or_prep' &&
    (latestTask?.action === 'estimate_duration' || latestTask?.action === 'retrieve_articles' || latestTask?.action === 'quiz');

  // ask_clarification answers are supposed to be a brief framing line (or
  // empty) with the clarifying questions/focus options carrying the rest.
  // None of the "richness" checks below make sense against a short
  // clarification framing line, so gate on brevity only.
  if (input.answerRoute === 'ask_clarification') {
    const clarificationWarnings: string[] = [];
    if (answer.length > CLARIFICATION_ANSWER_MAX_LENGTH) {
      clarificationWarnings.push('ask_clarification_answer_too_long');
    }
    return {
      passed: clarificationWarnings.length === 0,
      warnings: clarificationWarnings,
    };
  }

  if (selectedBranchLabel) {
    const hits = tokenHits(answer, branchTerms(selectedBranchLabel));
    if (hits === 0 && !/general/i.test(selectedBranchLabel)) {
      warnings.push('selected_branch_terms_missing');
    }
  }

  if (input.responseDepth !== 'quick' && answer.length < 450 && !narrowOrPrepTask) {
    warnings.push('answer_short_for_depth');
  }

  if (hasEmptyCaveat(answer)) {
    warnings.push('empty_caveat_without_concrete_pivots');
  }

  if (!hasDecisionSignal(answer) && input.responseDepth !== 'quick' && !narrowOrPrepTask) {
    warnings.push('decision_making_missing');
  }

  if (
    input.responseDepth !== 'quick' &&
    !OITE_BOARD_CHECKS_EXEMPT.has(input.subintent ?? '') &&
    ((input.mode === 'or_prep' && !narrowOrPrepTask) ||
      input.mode === 'oite' ||
      input.mode === 'consult' ||
      input.subintent === 'fracture' ||
      input.subintent === 'classification' ||
      input.subintent === 'treatment_algorithm' ||
      input.subintent === 'workup')
  ) {
    if (!hasPearlSignal(answer)) {
      warnings.push('attending_or_exam_pearl_missing');
    }
  }

  if (
    input.mode === 'or_prep' && !narrowOrPrepTask &&
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

  if (input.mode === 'or_prep' && !narrowOrPrepTask) {
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

    if (input.subintent === 'surgical_approach') {
      if (tokenHits(answer, ['incision', 'landmark', 'positioning', 'position']) < 1) {
        warnings.push('surgical_approach_incision_landmark_missing');
      }

      if (tokenHits(answer, ['interval', 'internervous', 'plane']) < 1) {
        warnings.push('surgical_approach_plane_missing');
      }

      if (
        tokenHits(answer, [
          'structures at risk',
          'nerve',
          'vessel',
          'artery',
          'vein',
        ]) < 1
      ) {
        warnings.push('surgical_approach_structures_at_risk_missing');
      }

      if (
        tokenHits(answer, [
          'extend',
          'extensile',
          'extension',
          'proximal extension',
          'distal extension',
        ]) < 1
      ) {
        warnings.push('surgical_approach_extension_missing');
      }
    }
  }

  if (input.clinicalContext) {
    const requirements = input.clinicalContext.coverageRequirements;

    if (requirements.includes('exposure_or_approach') && tokenHits(answer, [
      'approach',
      'exposure',
      'incision',
      'portal',
      'interval',
      'landmark',
      'corridor',
    ]) < 1) {
      warnings.push('facet_or_prep_exposure_missing');
    }

    if (requirements.includes('named_anatomy') && tokenHits(answer, [
      'nerve',
      'vessel',
      'artery',
      'vein',
      'tendon',
      'cartilage',
      'radial',
      'ulnar',
      'median',
      'axillary',
      'peroneal',
      'femoral',
      'saphenous',
      'sciatic',
    ]) < 1) {
      warnings.push('facet_named_anatomy_missing');
    }

    if (requirements.includes('pitfalls_or_bailout') && tokenHits(answer, [
      'pitfall',
      'bailout',
      'avoid',
      'mistake',
      'failure',
      'complication',
      'trap',
    ]) < 1) {
      warnings.push('facet_pitfall_layer_missing');
    }

    if (requirements.includes('trap_or_distractor') && tokenHits(answer, [
      'trap',
      'distractor',
      'wrong answer',
      'except',
      'confuse',
      'tempting',
    ]) < 1) {
      warnings.push('facet_oite_trap_distractor_missing');
    }

    if (requirements.includes('algorithm_or_threshold') && tokenHits(answer, [
      'algorithm',
      'threshold',
      'classification',
      'stable',
      'unstable',
      'operative',
      'nonoperative',
      'indication',
      'treatment',
    ]) < 1) {
      warnings.push('facet_algorithm_threshold_missing');
    }

    if (requirements.includes('red_flags') && tokenHits(answer, [
      'red flag',
      'urgent',
      'emergent',
      'open',
      'neurovascular',
      'compartment',
      'septic',
      'fever',
    ]) < 1) {
      warnings.push('facet_consult_red_flags_missing');
    }

    if (
      requirements.includes('definitive_management_or_disposition') &&
      tokenHits(answer, [
        'disposition',
        'admit',
        'follow-up',
        'follow up',
        'operative',
        'nonoperative',
        'definitive',
        'clinic',
        'recommend',
        'refer',
        'discharge',
        'splint',
        'reduction',
      ]) < 1
    ) {
      warnings.push('facet_consult_disposition_missing');
    }

    if (requirements.includes('differential') && tokenHits(answer, [
      'differential',
      'diagnosis',
      'consider',
      'mimic',
      'versus',
      'vs',
    ]) < 1) {
      warnings.push('facet_clinic_differential_missing');
    }

    if (hasKnownTopic(input.clinicalContext) && genericTopicSignal(answer) >= 2 && entitySpecificHits(answer, input.clinicalContext) === 0) {
      warnings.push('answer_too_generic_for_known_topic');
    }
  }

  // Consult framework check: any one of these signals is sufficient to avoid the warning.
  // The old threshold of 2 was too strict and fired even for good disposition-focused answers.
  if (
    input.mode === 'consult' &&
    tokenHits(answer, [
      'missing',
      'red flag',
      'exam',
      'imaging',
      'urgent',
      'present',
      'assessment',
      'management',
      'treatment',
      'plan',
      'disposition',
      'escalate',
      'attending',
    ]) < 1
  ) {
    warnings.push('consult_framework_weak');
  }

  if (
    (input.subintent === 'fracture' || input.procedureOrTopic?.toLowerCase().includes('fracture')) &&
    tokenHits(answer, ['classification', 'stability', 'unstable', 'imaging', 'operative', 'fixation', 'complication']) < 3
  ) {
    warnings.push('fracture_framework_weak');
  }

  // Indications, classification, treatment algorithm, and treatment plan are structured
  // answers that don't need history/exam/imaging terms to be high-quality. Only fire
  // clinic_framework_weak for workup-shaped prompts (workup, overview, differential).
  if (
    (input.mode === 'clinic' || input.subintent === 'workup') &&
    !CLINIC_FRAMEWORK_EXEMPT.has(input.subintent ?? '') &&
    tokenHits(answer, [
      'history',
      'exam',
      'imaging',
      'x-ray',
      'xray',
      'mri',
      'treatment',
      'red flag',
      'counsel',
      'differential',
      'diagnosis',
      'diagnos',
      'physical',
      'conservative',
      'surgery',
      'consider',
    ]) < 3
  ) {
    warnings.push('clinic_framework_weak');
  }

  if (
    input.subintent === 'anatomy_at_risk' &&
    tokenHits(answer, ['course', 'origin', 'insertion', 'branch', 'danger', 'surgical', 'injury', 'at risk']) < 2
  ) {
    warnings.push('anatomy_surgical_relevance_weak');
  }

  if (input.mode === 'oite' && !OITE_BOARD_CHECKS_EXEMPT.has(input.subintent ?? '')) {
    if (tokenHits(answer, ['trap', 'distractor', 'wrong answer', 'commonly miss', 'except']) < 1) {
      warnings.push('oite_trap_missing');
    }

    // classification answers (e.g. "What is the Garden classification?") don't need
    // explicit comparison language — the categories themselves distinguish entities.
    if (
      input.subintent !== 'classification' &&
      input.subintent !== 'overview' &&
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
        'high-yield',
        'key',
        'important',
      ]) < 1
    ) {
      warnings.push('oite_board_pearl_missing');
    }

    // Definition-style prompts (classification, overview) use explanation language,
    // not test-taking language, so broaden the signal vocabulary accordingly.
    if (
      tokenHits(answer, [
        'stem',
        'clue',
        'answer choice',
        'eliminate',
        'recognize',
        'buzzword',
        'test',
        'question',
        'answer',
        'choose',
        'pick',
      ]) < 1
    ) {
      warnings.push('oite_test_taking_signal_missing');
    }

    if (tokenHits(answer, ['memory', 'mnemonic', 'remember', 'hook', 'classic', 'think', 'note']) < 1) {
      warnings.push('oite_memory_hook_missing');
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

  // Entity specificity: for a recognized high-yield entity, the answer should
  // name at least one expected topic-specific term. Warning-only.
  if (input.procedureOrTopic) {
    const topic = entityToTopic(extractOrthoEntity(input.procedureOrTopic));
    const expectedTerms = topic ? ENTITY_EXPECTED_TERMS[topic] : undefined;
    if (expectedTerms && tokenHits(answer, expectedTerms) < 1) {
      warnings.push('entity_not_named');
    }
  }

  // Level-shape: junior answers should sound like orientation/next-steps;
  // senior answers should include judgment/tradeoff/bailout language. Low
  // brittleness — only checks for the presence of any one signal.
  if (input.trainingLevel) {
    if (JUNIOR_LEVELS.has(input.trainingLevel) && tokenHits(answer, JUNIOR_SHAPE_TERMS) < 1) {
      warnings.push('level_junior_orientation_missing');
    }
    if (SENIOR_LEVELS.has(input.trainingLevel) && tokenHits(answer, SENIOR_SHAPE_TERMS) < 1) {
      warnings.push('level_senior_judgment_missing');
    }
  }

  return {
    passed: warnings.length === 0,
    warnings,
  };
}
