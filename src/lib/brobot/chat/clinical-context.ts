import { extractOrthoEntity } from './entity-extractor';
import type {
  BroBotChatIntent,
  BroBotChatMode,
  BroBotChatSubintent,
  BroBotClinicalCaseSlots,
  BroBotClinicalContext,
  BroBotClinicalCoverageRequirement,
  BroBotClinicalEntities,
  BroBotClinicalTaskFacet,
  BroBotProcedureCategory,
} from './types';

type BuildClinicalContextInput = {
  message: string;
  mode: BroBotChatMode;
  subintent: BroBotChatSubintent;
  procedureCategory: BroBotProcedureCategory;
  procedureOrTopic: string;
  selectedBranch?: {
    id?: string;
    label?: string;
  };
};

function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items.filter(Boolean)));
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function normalizeMode(mode: BroBotChatMode): Exclude<BroBotChatMode, 'auto' | 'fracture_call'> {
  if (mode === 'fracture_call') return 'consult';
  if (mode === 'auto') return 'general';
  return mode;
}

function textFor(input: BuildClinicalContextInput) {
  return [
    input.message,
    input.procedureOrTopic,
    input.selectedBranch?.id,
    input.selectedBranch?.label,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function extractAge(text: string): string | undefined {
  const match =
    text.match(/\b(\d{1,3})\s*(?:yo|y\/o|year[-\s]?old|year old)\b/i) ??
    text.match(/\b(?:age|aged)\s*(\d{1,3})\b/i);
  return match?.[1] ? `${match[1]} years old` : undefined;
}

function extractCaseSlots(text: string): BroBotClinicalCaseSlots {
  const imaging = uniq([
    /\bx-?ray|radiograph/.test(text) ? 'radiographs' : '',
    /\bct\b/.test(text) ? 'CT' : '',
    /\bmri\b/.test(text) ? 'MRI' : '',
    /\bultrasound\b|\bus\b/.test(text) ? 'ultrasound' : '',
    /\bfluoro|fluoroscopy\b/.test(text) ? 'fluoroscopy' : '',
  ]);
  const labs = uniq([
    /\besr\b/.test(text) ? 'ESR' : '',
    /\bcrp\b/.test(text) ? 'CRP' : '',
    /\bwbc\b|\bwhite count\b/.test(text) ? 'WBC' : '',
    /\baspirat/.test(text) ? 'aspiration' : '',
    /\bculture/.test(text) ? 'cultures' : '',
  ]);

  return {
    age: extractAge(text),
    mechanism: /\bfall|mvc|mva|twist|inversion|trauma|sports injury\b/.test(text)
      ? 'mechanism mentioned'
      : undefined,
    acuity: /\bacute|today|tonight|tomorrow|ed\b/.test(text)
      ? 'acute'
      : /\bchronic|months?|years?\b/.test(text)
        ? 'chronic'
        : undefined,
    openClosed: /\bopen\b/.test(text) ? 'open' : /\bclosed\b/.test(text) ? 'closed' : undefined,
    neurovascularStatus: /\bnv\b|\bneurovascular\b|\bpulses?\b|\bsensation\b|\bmotor\b/.test(text)
      ? 'mentioned'
      : undefined,
    imaging: imaging.length ? imaging : undefined,
    labs: labs.length ? labs : undefined,
    reduction: /\breduced|reduction|splint/.test(text) ? 'mentioned' : undefined,
    priorSurgery: /\bprior surgery|revision|postop|post-op|arthroplasty|tka|tha|tsa\b/.test(text)
      ? 'mentioned'
      : undefined,
    woundStatus: /\bwound|drainage|erythema|dehisc|open fracture\b/.test(text) ? 'mentioned' : undefined,
  };
}

function facetsFromSubintent(
  subintent: BroBotChatSubintent,
  text: string
): BroBotClinicalTaskFacet[] {
  const facets: BroBotClinicalTaskFacet[] = [];

  if (subintent === 'anatomy_at_risk' || /\banatomy|nerve|vessel|at risk\b/.test(text)) {
    facets.push('anatomy');
  }
  if (subintent === 'classification' || /\bclassification|classify|garden|weber|schatzker|pauwels\b/.test(text)) {
    facets.push('classification');
  }
  if (subintent === 'workup' || /\bworkup|diagnostic\b/.test(text)) facets.push('workup');
  if (subintent === 'imaging_review' || /\bimaging|x-?ray|radiograph|ct|mri|fluoro\b/.test(text)) {
    facets.push('imaging');
  }
  if (subintent === 'indications' || subintent === 'operative_indications' || /\bindications?\b/.test(text)) {
    facets.push('indications');
  }
  if (subintent === 'treatment_algorithm' || subintent === 'treatment_plan' || /\btreatment|algorithm|manage/.test(text)) {
    facets.push('treatmentAlgorithm');
  }
  if (subintent === 'surgical_approach' || /\bapproach|exposure|incision|interval|portal\b/.test(text)) {
    facets.push('exposure', 'anatomy');
  }
  if (subintent === 'surgical_steps' || subintent === 'diagnostic_sequence' || /\bsteps?|sequence|flow\b/.test(text)) {
    facets.push('steps', 'exposure');
  }
  if (subintent === 'implant_options' || /\bimplant|plate|nail|screw|graft|anchor\b/.test(text)) {
    facets.push('implants');
  }
  if (subintent === 'complication' || /\bcomplication|pitfall|failure|avoid\b/.test(text)) {
    facets.push('complications', 'pitfalls');
  }
  if (subintent === 'oite_traps' || /\boite|board|trap|distractor|quiz\b/.test(text)) {
    facets.push('testTraps', 'distractors');
  }
  if (/\bdisposition|admit|follow.?up|dc|discharge\b/.test(text)) facets.push('disposition');

  return facets;
}

function facetsForMode(
  mode: Exclude<BroBotChatMode, 'auto' | 'fracture_call'>,
  procedureCategory: BroBotProcedureCategory
): BroBotClinicalTaskFacet[] {
  if (mode === 'or_prep') {
    return ['exposure', 'anatomy', 'steps', 'implants', 'complications', 'pitfalls'];
  }
  if (mode === 'oite') {
    return ['classification', 'treatmentAlgorithm', 'testTraps', 'distractors'];
  }
  if (mode === 'consult') {
    return ['workup', 'imaging', 'classification', 'treatmentAlgorithm', 'complications', 'disposition'];
  }
  if (mode === 'clinic') {
    return ['workup', 'imaging', 'indications', 'treatmentAlgorithm', 'complications'];
  }
  if (procedureCategory === 'fracture_orif') {
    return ['classification', 'imaging', 'treatmentAlgorithm', 'complications'];
  }
  return [];
}

function requirementsForMode(
  mode: Exclude<BroBotChatMode, 'auto' | 'fracture_call'>,
  facets: BroBotClinicalTaskFacet[]
): BroBotClinicalCoverageRequirement[] {
  if (mode === 'or_prep') {
    return [
      'exposure_or_approach',
      'named_anatomy',
      'key_steps_or_checks',
      'decision_points',
      'pitfalls_or_bailout',
    ];
  }
  if (mode === 'oite') {
    return ['tested_concept', 'stem_clues', 'trap_or_distractor', 'algorithm_or_threshold'];
  }
  if (mode === 'consult') {
    return ['red_flags', 'missing_information', 'workup', 'temporizing_care', 'definitive_management_or_disposition'];
  }
  if (mode === 'clinic') {
    return ['differential', 'history_exam', 'workup', 'first_line_management', 'escalation'];
  }

  const fallbackRequirements: Array<BroBotClinicalCoverageRequirement | undefined> = [
    facets.includes('classification') ? 'algorithm_or_threshold' : undefined,
    facets.includes('anatomy') ? 'named_anatomy' : undefined,
    facets.includes('workup') ? 'workup' : undefined,
    facets.includes('complications') ? 'pitfalls_or_bailout' : undefined,
  ];

  return uniq(fallbackRequirements.filter(isDefined));
}

function missingCriticalSlotsFor(input: {
  mode: Exclude<BroBotChatMode, 'auto' | 'fracture_call'>;
  caseSlots: BroBotClinicalCaseSlots;
  text: string;
}): string[] {
  if (input.mode !== 'consult') return [];

  const missing: string[] = [];
  if (!input.caseSlots.age) missing.push('age');
  if (!input.caseSlots.mechanism && /\bfracture|dislocation|trauma|ankle|wrist|hip\b/.test(input.text)) {
    missing.push('mechanism');
  }
  if (!input.caseSlots.openClosed && /\bfracture|trauma|wound\b/.test(input.text)) {
    missing.push('open/closed status');
  }
  if (!input.caseSlots.neurovascularStatus && /\bfracture|dislocation|compartment|trauma\b/.test(input.text)) {
    missing.push('neurovascular exam');
  }
  if (!input.caseSlots.imaging?.length && /\bfracture|painful|arthroplasty|tka|tha|infection\b/.test(input.text)) {
    missing.push('imaging findings');
  }
  if (!input.caseSlots.labs?.length && /\binfection|septic|pji|drainage|fever\b/.test(input.text)) {
    missing.push('ESR/CRP/WBC and aspiration status');
  }
  if (!input.caseSlots.woundStatus && /\bopen|infection|pji|drainage|postop|post-op\b/.test(input.text)) {
    missing.push('wound status');
  }
  return missing;
}

export function buildBroBotClinicalContext(input: BuildClinicalContextInput): BroBotClinicalContext {
  const text = textFor(input);
  const entity = extractOrthoEntity(`${input.message} ${input.procedureOrTopic}`);
  const mode = normalizeMode(input.mode);
  const caseSlots = extractCaseSlots(text);
  const taskFacets = uniq([
    ...facetsForMode(mode, input.procedureCategory),
    ...facetsFromSubintent(input.subintent, text),
  ]);

  const entities: BroBotClinicalEntities = {
    region: entity.region,
    bone: entity.bone,
    joint: entity.joint,
    diagnosis: entity.diagnosis,
    procedure: entity.procedure,
    fracturePattern: entity.fracturePattern,
    laterality: entity.laterality,
    implant: entity.implant,
    classification: entity.classification,
  };

  return {
    entities,
    caseSlots,
    taskFacets,
    missingCriticalSlots: missingCriticalSlotsFor({ mode, caseSlots, text }),
    coverageRequirements: requirementsForMode(mode, taskFacets),
  };
}

export function buildBroBotClinicalContextFromIntent(input: {
  message: string;
  intent: BroBotChatIntent;
  selectedBranch?: {
    id?: string;
    label?: string;
  };
}): BroBotClinicalContext {
  return buildBroBotClinicalContext({
    message: input.message,
    mode: input.intent.mode,
    subintent: input.intent.subintent,
    procedureCategory: input.intent.procedureCategory,
    procedureOrTopic: input.intent.procedureOrTopic,
    selectedBranch: input.selectedBranch,
  });
}

export function formatClinicalContextForPrompt(context?: BroBotClinicalContext): string {
  if (!context) return '';
  const entityLines = Object.entries(context.entities)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
  const slotLines = Object.entries(context.caseSlots)
    .filter(([, value]) => Array.isArray(value) ? value.length > 0 : Boolean(value))
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
    .join('; ');

  return [
    'Structured clinical context:',
    `- entities: ${entityLines || 'none detected'}`,
    `- caseSlots: ${slotLines || 'none detected'}`,
    `- taskFacets: ${context.taskFacets.join(', ') || 'none'}`,
    `- missingCriticalSlots: ${context.missingCriticalSlots.join(', ') || 'none'}`,
    `- coverageRequirements: ${context.coverageRequirements.join(', ') || 'none'}`,
  ].join('\n');
}
