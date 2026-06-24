import type { BroBotChatMode } from './types';

// Cross-cutting curated skeletons. These apply regardless of mode (a
// classification or indications question is the same shape whether it arrives
// in or_prep, oite, clinic, or general), so they are resolved as a fallback for
// any mode when the per-mode table has no entry.
const CLASSIFICATION_RUBRIC = [
  'classification system name',
  'defining features of each category',
  'imaging clues',
  'treatment implications',
  'common traps',
  'OITE/oral-board pearls',
];

const INDICATIONS_RUBRIC = [
  'primary indications',
  'contraindications',
  'alternatives to compare against',
  'patient/anatomic factors that change the decision',
  'complication profile',
  'evidence-supported vs commonly taught',
];

const COMPLICATION_RUBRIC = [
  'most common complications',
  'mechanism / why it happens',
  'how to recognize it',
  'how to prevent it',
  'how to manage or bail out',
  'tested/board-relevant association',
];

const PATIENT_EXPLANATION_RUBRIC = [
  'what it is in plain language',
  'why it matters',
  'treatment options',
  'warning signs',
  'what to expect',
];

const OITE_TRAP_RUBRIC = [
  'likely stem',
  'correct answer',
  'why the correct answer is correct',
  'why common distractors are wrong',
  'classic trap',
  'memory hook',
];

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
  surgical_approach: [
    'approach options',
    'indications for each approach',
    'positioning',
    'incision landmarks',
    'internervous/intermuscular plane',
    'deep dissection sequence',
    'structures at risk',
    'how to extend the approach',
    'common mistakes',
    'what the attending will care about',
    'OITE/oral-board pearls',
    'commonly taught vs evidence-supported',
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
  classification: CLASSIFICATION_RUBRIC,
  treatment_algorithm: [
    'first decision point',
    'nonoperative vs operative threshold',
    'sequence of management',
    'exception or contraindication',
    'tested complication',
  ],
  oite_traps: OITE_TRAP_RUBRIC,
  test_traps: OITE_TRAP_RUBRIC,
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

// Curated subintents whose skeleton is the same regardless of mode. Used as a
// fallback so these always resolve to a rubric — including in general mode and
// in modes whose own table has no matching entry (e.g. indications in or_prep).
const GENERAL_RUBRICS: Record<string, string[]> = {
  surgical_approach: OR_PREP_RUBRICS.surgical_approach,
  classification: CLASSIFICATION_RUBRIC,
  indications: INDICATIONS_RUBRIC,
  complication: COMPLICATION_RUBRIC,
  patient_explanation: PATIENT_EXPLANATION_RUBRIC,
  oite_traps: OITE_TRAP_RUBRIC,
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
    if (/approach|exposure|incision|internervous|interval|portal/.test(key)) {
      return OR_PREP_RUBRICS.surgical_approach;
    }
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

const RUBRIC_TABLE_BY_MODE: Partial<Record<BroBotChatMode, Record<string, string[]>>> = {
  or_prep: OR_PREP_RUBRICS,
  consult: CONSULT_RUBRICS,
  oite: OITE_RUBRICS,
  clinic: CLINIC_RUBRICS,
  research: RESEARCH_RUBRICS,
};

export function getAnswerRubric(input: {
  mode: BroBotChatMode;
  selectedBranchId?: string;
  selectedBranchLabel?: string;
  subintent?: string;
}): string[] | null {
  const mode = input.mode === 'fracture_call' ? 'consult' : input.mode;

  const table = RUBRIC_TABLE_BY_MODE[mode];
  const perMode = table
    ? findRubric(table, input.selectedBranchId, input.selectedBranchLabel, input.subintent)
    : null;
  if (perMode) return perMode;

  // Fallback: resolve cross-cutting curated subintents regardless of mode. This
  // covers general mode (which has no per-mode table) and curated subintents
  // that have no entry in the active mode's table.
  return findRubric(
    GENERAL_RUBRICS,
    input.selectedBranchId,
    input.selectedBranchLabel,
    input.subintent
  );
}

export function formatRubricForPrompt(rubric: string[] | null): string {
  if (!rubric?.length) return '';
  return rubric.map((item) => `- ${item}`).join('\n');
}
