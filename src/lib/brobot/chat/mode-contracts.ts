/**
 * Mode-specific response contracts for BroBot Chat.
 *
 * Each contract defines:
 * - requiredElements: the answer must contain at least one token from each group
 * - forbiddenPhrases: phrases that mark a generic, low-value answer
 * - minBullets / maxBullets: expected bullet range
 * - clarifyWhen: prose description of when to ask for clarification
 * - followUpSuggestion: how follow-up chips should feel for this mode
 *
 * These are imported by both prompt-builder (to strengthen system prompts) and
 * quality-gate (to validate answer content).
 */

import type { BroBotChatMode } from './types';

export type ModeContract = {
  name: string;
  requiredElementGroups: string[][];
  forbiddenPhrases: string[];
  minBullets: number;
  maxBullets: number;
  clarifyWhen: string;
  followUpSuggestion: string;
};

export const MODE_CONTRACTS: Partial<Record<Exclude<BroBotChatMode, 'auto' | 'fracture_call'>, ModeContract>> = {
  or_prep: {
    name: 'OR Prep',
    requiredElementGroups: [
      // Must name an approach/exposure element
      ['approach', 'exposure', 'incision', 'portal', 'interval', 'landmark', 'corridor'],
      // Must name at least one structure at risk
      ['nerve', 'vessel', 'artery', 'vein', 'tendon', 'cartilage', 'radial', 'ulnar', 'median', 'axillary', 'peroneal', 'femoral', 'saphenous', 'sciatic'],
      // Must include a decision or check
      ['decision', 'check', 'confirm', 'fluoro', 'reduce', 'reduction', 'stability', 'if', 'when'],
      // Must include attending / learner relevance or pitfall
      ['attending', 'pitfall', 'bailout', 'mistake', 'avoid', 'common error', 'resident'],
    ],
    forbiddenPhrases: [
      'depends on patient factors',
      'consider patient-specific factors',
      'management varies',
      'use clinical judgment',
      'anatomy familiarity',
      'complications awareness',
      'post-op care',
      'know the anatomy',
      'understand the procedure',
      'here are the key points',
      'here is a concise overview',
    ],
    minBullets: 4,
    maxBullets: 8,
    clarifyWhen:
      'Clarify when the prompt gives no procedure name and history cannot recover one. Do not clarify broad procedure prompts — offer branch options instead.',
    followUpSuggestion:
      'Chips should deepen the operative answer: anatomy at risk, fluoro checks, reduction technique, implant choice, attending questions, or complications.',
  },
  oite: {
    name: 'OITE',
    requiredElementGroups: [
      // Must give a direct answer or classification
      ['classification', 'algorithm', 'treatment', 'diagnosis', 'management', 'indication', 'operative', 'nonoperative', 'stable', 'unstable'],
      // Must name a threshold, number, or differentiating feature
      ['percent', '%', 'degree', 'threshold', 'grade', 'type', 'versus', 'vs', 'distinguish', 'compare'],
      // Must include a board exam signal
      ['trap', 'distractor', 'wrong answer', 'classic', 'pearl', 'stem', 'oite', 'board', 'tested', 'high yield', 'high-yield'],
      // Must include a memory or pattern signal
      ['remember', 'memory', 'hook', 'mnemonic', 'classic', 'recognize', 'pattern', 'clue'],
    ],
    forbiddenPhrases: [
      'depends on patient factors',
      'it is important to',
      'there are many factors',
      'this is a complex topic',
      'consult a specialist',
      'here are the key points',
      'here is a concise overview',
    ],
    minBullets: 4,
    maxBullets: 7,
    clarifyWhen:
      'Clarify only if the topic is completely absent from the message and cannot be inferred. For broad OITE questions, answer with a useful overview and offer study-path chips.',
    followUpSuggestion:
      'Chips should sharpen board performance: distractors, thresholds, similar diagnoses, algorithm pivots, or quiz mode.',
  },
  consult: {
    name: 'Consult',
    requiredElementGroups: [
      // Must address urgency or missing info
      ['urgency', 'emergent', 'urgent', 'routine', 'red flag', 'missing', 'exam', 'imaging', 'labs'],
      // Must include a presentation or assessment element
      ['assessment', 'present', 'presentation', 'chief complaint', 'mechanism', 'history'],
      // Must include a management or recommendation element
      ['management', 'treatment', 'splint', 'reduction', 'consult', 'imaging', 'xray', 'x-ray', 'mri', 'ct', 'aspiration'],
      // Must flag attending/senior relevance
      ['attending', 'senior', 'escalate', 'call', 'operative', 'nonoperative', 'indication'],
    ],
    forbiddenPhrases: [
      'depends on patient factors',
      'use clinical judgment',
      'it is important to communicate',
      'here are the key points',
      'here is a concise overview',
    ],
    minBullets: 3,
    maxBullets: 7,
    clarifyWhen:
      'Clarify when critical consult context (age, mechanism, open/closed, neurovascular exam, imaging) is missing and would materially change the answer.',
    followUpSuggestion:
      'Chips should support the consult workflow: presentation script, missing information, imaging interpretation, operative indications, attending questions.',
  },
  clinic: {
    name: 'Clinic',
    requiredElementGroups: [
      // Must name a differential or diagnosis
      ['differential', 'diagnosis', 'diagnos', 'consider', 'presentation', 'pain', 'acute', 'chronic'],
      // Must name an exam or workup element
      ['exam', 'history', 'imaging', 'x-ray', 'xray', 'mri', 'ultrasound', 'test', 'workup'],
      // Must name a treatment element
      ['treatment', 'nonoperative', 'operative', 'therapy', 'injection', 'nsaid', 'splint', 'cast', 'refer'],
      // Must name a red flag or escalation
      ['red flag', 'escalate', 'urgent', 'surgery', 'indication', 'failure', 'worse', 'nerve'],
    ],
    forbiddenPhrases: [
      'depends on patient factors',
      'use clinical judgment',
      'here are the key points',
    ],
    minBullets: 3,
    maxBullets: 6,
    clarifyWhen:
      'Clarify when the complaint is so vague that the differential or exam approach would be entirely different depending on the answer.',
    followUpSuggestion:
      'Chips should cover the diagnostic workup: differential, exam maneuvers, imaging, conservative treatment, surgical indications.',
  },
  research: {
    name: 'Research',
    requiredElementGroups: [
      // Must identify study design or evidence type
      ['randomized', 'rct', 'cohort', 'retrospective', 'prospective', 'systematic review', 'meta-analysis', 'case series', 'level i', 'level ii', 'level iii', 'level iv', 'design'],
      // Must name an endpoint or result
      ['endpoint', 'outcome', 'result', 'finding', 'significant', 'p value', 'p-value', 'confidence interval', 'odds ratio', 'relative risk'],
      // Must name a limitation or bias
      ['limitation', 'bias', 'confound', 'selection', 'follow-up', 'sample size', 'power', 'underpowered', 'generalizab'],
      // Must state clinical relevance
      ['practice', 'clinical', 'application', 'implication', 'change', 'takeaway', 'translate'],
    ],
    forbiddenPhrases: [
      'depends on patient factors',
      'more research is needed',
      'the evidence is mixed',
      'here are the key points',
    ],
    minBullets: 3,
    maxBullets: 6,
    clarifyWhen:
      'Clarify when no paper/abstract/methods are provided and the question is about critiquing a specific study. For general evidence questions, answer directly.',
    followUpSuggestion:
      'Chips should cover study critique: design strength, statistics, limitations, clinical takeaway, journal club discussion questions.',
  },
};

/** Normalized contract lookup — also handles fracture_call → consult alias. */
export function getModeContract(mode: BroBotChatMode): ModeContract | null {
  const key = mode === 'fracture_call' ? 'consult' : mode;
  return MODE_CONTRACTS[key as Exclude<BroBotChatMode, 'auto' | 'fracture_call'>] ?? null;
}

// Subintents where the full OITE board-strategy contract is counterproductive.
// Quiz prompts produce Q&A pairs; anatomy-at-risk prompts are factual recall.
// Forcing trap/comparison/board-pearl language into these degrades answer quality.
const OITE_LIGHTWEIGHT_CONTRACT_SUBINTENTS = new Set([
  'quiz',
  'oite_traps',
  'anatomy_at_risk',
  'patient_explanation',
]);

// Subintents where only the diagnostic + treatment elements of the clinic contract apply.
const CLINIC_PARTIAL_CONTRACT_SUBINTENTS = new Set([
  'indications',
  'operative_indications',
  'classification',
  'treatment_algorithm',
  'treatment_plan',
]);

/** Format mode contract as a prompt block, conditional on subintent. */
export function formatModeContractForPrompt(mode: BroBotChatMode, subintent?: string): string {
  const contract = getModeContract(mode);
  if (!contract) return '';

  const normalizedMode = mode === 'fracture_call' ? 'consult' : mode;
  const sub = subintent ?? '';

  // OITE quiz/anatomy: drop the four board-strategy required element groups.
  // Only enforce the forbidden phrases so the model doesn't produce generic filler.
  if (normalizedMode === 'oite' && OITE_LIGHTWEIGHT_CONTRACT_SUBINTENTS.has(sub)) {
    return [
      `${contract.name} mode (${sub} subintent — lightweight contract):`,
      `Focus on teaching the learning objective directly. Board framing is secondary for this subintent.`,
      `Forbidden phrases (do not use):`,
      contract.forbiddenPhrases.map((phrase) => `  - "${phrase}"`).join('\n'),
      `Answer length: ${contract.minBullets}–${contract.maxBullets} bullets or equivalent.`,
      `Follow-up chips should: ${contract.followUpSuggestion}`,
    ].join('\n');
  }

  // Clinic indications/classification: only require the diagnostic and treatment groups.
  if (normalizedMode === 'clinic' && CLINIC_PARTIAL_CONTRACT_SUBINTENTS.has(sub)) {
    const partialGroups = contract.requiredElementGroups.slice(0, 2);
    return [
      `${contract.name} mode response contract (${sub} subintent):`,
      `Required elements (answer must include at least one from each group):`,
      partialGroups.map((group, i) => `  Group ${i + 1}: ${group.slice(0, 5).join(' | ')}`).join('\n'),
      `Forbidden phrases (do not use):`,
      contract.forbiddenPhrases.map((phrase) => `  - "${phrase}"`).join('\n'),
      `Answer length: ${contract.minBullets}–${contract.maxBullets} bullets or equivalent.`,
      `Follow-up chips should: ${contract.followUpSuggestion}`,
    ].join('\n');
  }

  // Default: full contract for all other mode/subintent combinations.
  return [
    `${contract.name} mode response contract:`,
    `Required elements (answer must include at least one from each group):`,
    contract.requiredElementGroups.map((group, i) => `  Group ${i + 1}: ${group.slice(0, 5).join(' | ')}`).join('\n'),
    `Forbidden phrases (these signal a generic answer — do not use):`,
    contract.forbiddenPhrases.map((phrase) => `  - "${phrase}"`).join('\n'),
    `Answer length: ${contract.minBullets}–${contract.maxBullets} bullets or equivalent.`,
    `When to clarify: ${contract.clarifyWhen}`,
    `Follow-up chips should: ${contract.followUpSuggestion}`,
  ].join('\n');
}
