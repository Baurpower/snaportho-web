import type { BroBotChatIntent, BroBotChatMode, BroBotModelMessage } from './types';

export type BroBotAnswerRoute =
  | 'answer_now'
  | 'answer_with_assumption'
  | 'ask_clarification'
  | 'offer_branches';

type RouteInput = {
  message: string;
  intent: BroBotChatIntent;
  selectedMode?: BroBotChatMode;
  history?: BroBotModelMessage[];
  answerNow?: boolean;
  selectedBranchId?: string;
  selectedBranchLabel?: string;
};

const CONSULT_CRITICAL_CONTEXT = [
  'age',
  'mechanism',
  'open',
  'closed',
  'neurovascular',
  'imaging',
  'reduction',
  'wound',
  'esr',
  'crp',
  'labs',
  'fever',
  'aspiration',
];

const NAMED_NARROW_PATTERN =
  /\b(what is|what are|define|classification|blood supply|muscles? attach|origin|insertion|innervation|course|start(?:ing)? point|neutralization plate|monteggia|garden|hawkins|pauwels|weber|laugehansen|lauge-hansen|schatzker|talus|greater trochanter)\b/i;

const BROAD_ANSWERABLE_PATTERN =
  /\b(teach me|explain|approach|pearls?|pimp|attendings?|what should i know|overview|walk me through)\b/i;

const STUDY_PLANNING_PATTERN =
  /\b(what should i study|study tonight|learning path|choose what to study|what do i need to know before clinic|clinic tomorrow|prepare me for clinic)\b/i;

const GENERIC_GUESSED_TOPIC_PATTERN =
  /^(orthopaedics?|orthopedics?|general orthopaedics?|general orthopedics?|orthopaedic study|orthopedic study|orthopaedic surgery|orthopedic surgery|study(?:ing)?|study plan|studying orthopaedics?|studying orthopedics?|general topic|general study|general review|exam prep|board prep|ortho)$/i;

/**
 * The intent classifier almost never returns an empty procedureOrTopic string —
 * it guesses something even for genuinely open-ended prompts like "what should
 * I study tonight?". Those guesses are filler ("orthopaedic study", "studying")
 * rather than an actionable topic, so treat them the same as an empty topic.
 */
function isActionableTopic(topic: string) {
  const trimmed = topic.trim();
  if (!trimmed) return false;
  return !GENERIC_GUESSED_TOPIC_PATTERN.test(trimmed);
}

const UNSPECIFIED_PROCEDURE_PATTERN =
  /^\s*(what are|what're|give me|walk me through|how do i do|how do you do)?\s*(the\s*)?(surgical\s*)?steps\s*\??\s*$/i;

function hasRecoverableHistory(history: BroBotModelMessage[] | undefined) {
  return Boolean(history?.some((message) => /\b(fracture|orif|arthroplasty|scope|acl|tka|tha|tsa|infection|consult)\b/i.test(message.content)));
}

function consultMissingCriticalDetails(intent: BroBotChatIntent) {
  if (intent.mode !== 'consult') return false;
  if (intent.subintent === 'urgent_red_flags') return false;
  const missingText = intent.missingContext.join(' ').toLowerCase();
  return CONSULT_CRITICAL_CONTEXT.some((term) => missingText.includes(term));
}

function isNarrowAnswerable(message: string, intent: BroBotChatIntent) {
  if (NAMED_NARROW_PATTERN.test(message)) return true;
  if (intent.ambiguity === 'low' && !intent.requiresBranchSelection) return true;
  if (
    intent.procedureOrTopic.trim() &&
    ['classification', 'anatomy_at_risk', 'implant_options', 'indications'].includes(intent.subintent)
  ) {
    return true;
  }
  return false;
}

function isBroadButAnswerable(message: string, intent: BroBotChatIntent) {
  if (intent.ambiguity === 'moderate' && !consultMissingCriticalDetails(intent)) return true;
  if (BROAD_ANSWERABLE_PATTERN.test(message) && intent.procedureOrTopic.trim()) return true;
  return false;
}

export function routeBroBotAnswer(input: RouteInput): BroBotAnswerRoute {
  const message = input.message.trim();

  if (input.answerNow || input.selectedBranchId || input.selectedBranchLabel) {
    return 'answer_now';
  }

  if (STUDY_PLANNING_PATTERN.test(message)) {
    return isActionableTopic(input.intent.procedureOrTopic) ? 'offer_branches' : 'ask_clarification';
  }

  if (UNSPECIFIED_PROCEDURE_PATTERN.test(message) && !hasRecoverableHistory(input.history)) {
    return 'ask_clarification';
  }

  if (consultMissingCriticalDetails(input.intent) && input.intent.ambiguity !== 'low') {
    return 'ask_clarification';
  }

  if (input.intent.ambiguity === 'high') {
    return input.intent.branchOptions?.length ? 'offer_branches' : 'ask_clarification';
  }

  if (isNarrowAnswerable(message, input.intent)) {
    return 'answer_now';
  }

  if (input.intent.requiresBranchSelection && input.intent.branchOptions?.length) {
    return 'offer_branches';
  }

  if (isBroadButAnswerable(message, input.intent)) {
    return 'answer_with_assumption';
  }

  return 'answer_now';
}

export function buildBroBotRouteClarifyingQuestions(input: {
  message: string;
  intent: BroBotChatIntent;
  answerRoute: BroBotAnswerRoute;
}): string[] {
  if (input.answerRoute !== 'ask_clarification') return [];

  if (input.intent.mode === 'consult') {
    const missing = input.intent.missingContext.map((item) => item.toLowerCase()).join(' ');
    if (missing.includes('neurovascular') || missing.includes('open') || missing.includes('imaging')) {
      return [
        'What are the age, mechanism, open/closed status, and neurovascular exam?',
        'What imaging findings and reduction status do you have?',
      ];
    }
    return [
      'What is the patient age, story, exam, and imaging?',
      'Is this urgent, routine, or are there red flags?',
    ];
  }

  if (UNSPECIFIED_PROCEDURE_PATTERN.test(input.message)) {
    return [
      'What procedure or fracture are you asking about?',
      'Do you want setup, exposure, key steps, or complications?',
    ];
  }

  if (STUDY_PLANNING_PATTERN.test(input.message)) {
    return [
      'What rotation or case list are you preparing for tonight?',
      'OITE review, clinic prep, consult prep, or OR prep for tomorrow?',
      'Is there a specific fracture, procedure, or topic you keep missing?',
    ];
  }

  return input.intent.branchOptions?.slice(0, 3).map((branch) => branch.label) ?? [
    'What specific topic or clinical scenario should I anchor this to?',
  ];
}

/** Max characters allowed for an ask_clarification answer body before it is trimmed. */
export const CLARIFICATION_ANSWER_MAX_LENGTH = 280;

/**
 * The prompt instructs the model to keep the ask_clarification answer to a
 * brief 1-2 sentence framing line (or empty) and let the clarifying
 * questions/focus options carry the rest. That instruction isn't reliably
 * followed, so this is the deterministic server-side backstop: if the model
 * still returns a full generic answer, cut it down to a short framing line
 * instead of shipping it alongside the clarifying questions.
 */
export function enforceClarificationAnswerBrevity(answer: string): string {
  const trimmed = answer.trim();
  if (!trimmed || trimmed.length <= CLARIFICATION_ANSWER_MAX_LENGTH) return trimmed;

  const sentences = trimmed.match(/[^.!?\n]+[.!?]?/g) ?? [trimmed];
  const framingLine = sentences.slice(0, 2).join(' ').trim();
  if (framingLine && framingLine.length <= CLARIFICATION_ANSWER_MAX_LENGTH) {
    return framingLine;
  }

  return `${trimmed.slice(0, CLARIFICATION_ANSWER_MAX_LENGTH).trim()}...`;
}
