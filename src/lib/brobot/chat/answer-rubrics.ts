import type { BroBotChatMode } from './types';

const OR_PREP_RUBRICS: Record<string, string[]> = {
  surgical_steps: [
    'positioning',
    'approach/exposure',
    'reduction or critical maneuver',
    'fixation/implant or key technical step',
    'imaging/checks',
    'common pitfalls',
    'closure/postop basics',
  ],
  general_or_flow: [
    'positioning',
    'approach/exposure',
    'critical sequence',
    'implants or equipment',
    'imaging/checks',
    'pitfalls',
    'closure/postop basics',
  ],
  anatomy_at_risk: [
    'named structures',
    'where they are encountered',
    'how they are injured',
    'how to avoid injury',
    'attending pearl',
  ],
  structures_at_risk: [
    'named structures',
    'where they are encountered',
    'how they are injured',
    'how to avoid injury',
    'attending pearl',
  ],
  implant_options: [
    'options',
    'indications',
    'tradeoffs',
    'what drives choice',
    'what to ask attending/rep',
  ],
  implant_fixation_options: [
    'options',
    'indications',
    'tradeoffs',
    'what drives choice',
    'what to ask attending/rep',
  ],
  fluoroscopy_checklist: [
    'required views',
    'what each view confirms',
    'common miss',
    'final acceptable checks',
  ],
  fluoro_intraop_checks: [
    'required views',
    'what each view confirms',
    'common miss',
    'final acceptable checks',
  ],
  imaging_review: [
    'required views',
    'what each view confirms',
    'common miss',
    'final acceptable checks',
  ],
  attending_questions: [
    'classification/indication',
    'decision points',
    'bailout plan',
    'complications',
    'postop restrictions',
  ],
};

const CONSULT_RUBRICS: Record<string, string[]> = {
  presentation_help: [
    'one-liner',
    'injury/problem summary',
    'exam',
    'imaging/labs',
    'assessment',
    'plan',
    'question for attending',
  ],
  missing_information: [
    'what is missing',
    'why it matters',
    'how it changes management',
  ],
  immediate_priorities: [
    'safety checks',
    'red flags',
    'immediate interventions',
    'escalation points',
  ],
};

const OITE_RUBRICS: Record<string, string[]> = {
  high_yield_review: [
    'core tested concept',
    'classic stem clue',
    'management or diagnosis pivot',
    'board-style pearl',
    'common trap',
  ],
  board_pearls: [
    'core tested concept',
    'classic stem clue',
    'management or diagnosis pivot',
    'board-style pearl',
    'common trap',
  ],
  classification: [
    'classification system',
    'thresholds or categories',
    'how category changes treatment',
    'classic complication or prognosis',
    'common misclassification trap',
  ],
  treatment_algorithm: [
    'first decision point',
    'nonoperative vs operative threshold',
    'sequence of management',
    'exception or contraindication',
    'tested complication',
  ],
  test_traps: [
    'classic traps',
    'differentiators',
    'wrong-answer patterns',
    'memorization anchor',
  ],
  compare_diagnoses: [
    'similar diagnoses',
    'key differentiating clue',
    'imaging or exam discriminator',
    'management difference',
    'wrong-answer trap',
  ],
  quiz_me: [
    'short questions',
    'answers/explanations',
    'difficulty level',
    'trap explanation',
  ],
};

const CLINIC_RUBRICS: Record<string, string[]> = {
  history_exam: [
    'key history',
    'physical exam maneuvers',
    'red flags',
    'interpretation',
  ],
  treatment_algorithm: [
    'first-line nonop',
    'injections/therapy',
    'surgical indications',
    'follow-up',
  ],
};

const RESEARCH_RUBRICS: Record<string, string[]> = {
  study_critique: [
    'design',
    'bias/confounding',
    'outcome validity',
    'applicability',
    'practice-changing threshold',
  ],
};

function normalize(value: string | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function findRubric(
  table: Record<string, string[]>,
  selectedBranchId?: string,
  selectedBranchLabel?: string,
  subintent?: string
): string[] | null {
  const keys = [
    normalize(selectedBranchId),
    normalize(selectedBranchLabel),
    normalize(subintent),
  ].filter(Boolean);

  for (const key of keys) {
    if (table[key]) return table[key];
    if (/fluoro|intraop_checks/.test(key)) return OR_PREP_RUBRICS.fluoroscopy_checklist;
    if (/implant|fixation/.test(key)) return OR_PREP_RUBRICS.implant_options;
    if (/anatomy|structure.*risk/.test(key)) return OR_PREP_RUBRICS.anatomy_at_risk;
    if (/attending/.test(key)) return OR_PREP_RUBRICS.attending_questions;
    if (/presentation/.test(key)) return CONSULT_RUBRICS.presentation_help;
    if (/missing/.test(key)) return CONSULT_RUBRICS.missing_information;
    if (/immediate|priority|red_flag/.test(key)) return CONSULT_RUBRICS.immediate_priorities;
    if (/trap/.test(key)) return OITE_RUBRICS.test_traps;
    if (/quiz/.test(key)) return OITE_RUBRICS.quiz_me;
    if (/classification|classify/.test(key)) return OITE_RUBRICS.classification;
    if (/treatment|algorithm|management/.test(key)) return OITE_RUBRICS.treatment_algorithm;
    if (/compare|diagnos|similar|differenti/.test(key)) return OITE_RUBRICS.compare_diagnoses;
    if (/board|pearl|high_yield|yield/.test(key)) return OITE_RUBRICS.high_yield_review;
    if (/history|exam/.test(key)) return CLINIC_RUBRICS.history_exam;
    if (/treatment|algorithm/.test(key)) return CLINIC_RUBRICS.treatment_algorithm;
    if (/critique/.test(key)) return RESEARCH_RUBRICS.study_critique;
    if (/step|flow|sequence/.test(key)) return OR_PREP_RUBRICS.surgical_steps;
  }

  return null;
}

export function getAnswerRubric(input: {
  mode: BroBotChatMode;
  selectedBranchId?: string;
  selectedBranchLabel?: string;
  subintent?: string;
}): string[] | null {
  const mode = input.mode === 'fracture_call' ? 'consult' : input.mode;

  if (mode === 'or_prep') {
    return findRubric(
      OR_PREP_RUBRICS,
      input.selectedBranchId,
      input.selectedBranchLabel,
      input.subintent
    );
  }
  if (mode === 'consult') {
    return findRubric(
      CONSULT_RUBRICS,
      input.selectedBranchId,
      input.selectedBranchLabel,
      input.subintent
    );
  }
  if (mode === 'oite') {
    return findRubric(
      OITE_RUBRICS,
      input.selectedBranchId,
      input.selectedBranchLabel,
      input.subintent
    );
  }
  if (mode === 'clinic') {
    return findRubric(
      CLINIC_RUBRICS,
      input.selectedBranchId,
      input.selectedBranchLabel,
      input.subintent
    );
  }
  if (mode === 'research') {
    return findRubric(
      RESEARCH_RUBRICS,
      input.selectedBranchId,
      input.selectedBranchLabel,
      input.subintent
    );
  }

  return null;
}

export function formatRubricForPrompt(rubric: string[] | null): string {
  if (!rubric?.length) return '';
  return rubric.map((item) => `- ${item}`).join('\n');
}
