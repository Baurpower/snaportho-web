import {
  BroBotChatIntentSchema,
  BROBOT_CHAT_MODES,
  type BroBotChatIntent,
  type BroBotChatMode,
  type BroBotModelMessage,
} from './types';

const CLASSIFIER_CONTRACT = `{
  "mode": "or_prep" | "oite" | "clinic" | "consult" | "research" | "general",
  "subintent": "landmarks" | "surgical_steps" | "diagnostic_sequence" | "implant_options" | "brand_comparison" | "anatomy_at_risk" | "attending_questions" | "treatment_algorithm" | "quiz" | "workup" | "evidence_critique" | "initial_consult" | "presentation_help" | "imaging_review" | "differential" | "treatment_plan" | "operative_indications" | "complication" | "postop_problem" | "fracture" | "infection" | "urgent_red_flags" | "overview" | "other",
  "procedureOrTopic": string,
  "ambiguity": "low" | "moderate" | "high",
  "assumedContext": string,
  "missingContext": string[],
  "clarifyingQuestions": string[],
  "confidence": number
}`;

const MODE_SET = new Set<string>(BROBOT_CHAT_MODES.filter((mode) => mode !== 'auto'));

type ClassifierInput = {
  message: string;
  selectedMode: BroBotChatMode;
  history?: BroBotModelMessage[];
};

export function buildBroBotIntentClassifierMessages(input: ClassifierInput): BroBotModelMessage[] {
  const normalizedSelectedMode =
    input.selectedMode === 'fracture_call' ? 'consult' : input.selectedMode;
  const selectedMode =
    normalizedSelectedMode === 'auto'
      ? 'auto: choose the best mode'
      : `${normalizedSelectedMode}: prefer this mode unless the prompt clearly belongs elsewhere`;
  const recentHistory = (input.history ?? [])
    .slice(-6)
    .map((message) => `${message.role}: ${message.content}`)
    .join('\n');

  return [
    {
      role: 'system',
      content: `
You are a lightweight intent classifier for BroBot Chat.
Classify the user's orthopaedic learning prompt before the answer is generated.
Return valid JSON only. Do not answer the user.

Selected UI mode: ${selectedMode}

Use broad intent reasoning, not procedure-specific keyword lists.
Classify:
- mode: best product mode.
- subintent: the learning task.
- procedureOrTopic: short plain-language topic/procedure.
- ambiguity: low when the request has enough scope, moderate when you can answer with an assumption, high when precision would materially change the answer.
- assumedContext: short sentence if making an assumption, otherwise "".
- missingContext: short missing details, no PHI.
- clarifyingQuestions: 0-3 concise user-facing branches/questions.
- confidence: 0 to 1.

Mode hints:
- or_prep: OR prep, surgical landmarks/steps/implants/anatomy/attending questions.
- oite: boards/OITE/test traps/quiz.
- clinic: outpatient workup, differential, exam, imaging, treatment.
- consult: orthopaedic consults, ED consults, fracture/infection/postop/arthroplasty problems, urgent assessment, missing information, presentation help, operative indications, reduction/splinting.
- research: paper critique, evidence, study design, methods/results.
- general: broad education that does not fit above.
- fracture_call is a legacy alias for consult. Never output fracture_call.

Important examples:
- "diagnostic shoulder scope" or "diagnostic knee scope" often means OR prep. If scope is unclear, subintent diagnostic_sequence or surgical_steps and ambiguity moderate.
- "shoulder pain workup" -> clinic/workup, ambiguity moderate.
- "SCFE OITE" -> oite, usually treatment_algorithm or overview.
- "ankle fracture consult" -> consult/initial_consult.
- "present this consult" -> consult/presentation_help.
- "painful TKA consult" or "postop wound drainage THA" -> consult/postop_problem.
- "compartment syndrome" or "open tibia" -> consult/urgent_red_flags.
- "critique this paper" -> research/evidence_critique and high ambiguity if no paper details are supplied.

Return exactly:
${CLASSIFIER_CONTRACT}
      `.trim(),
    },
    ...(recentHistory
      ? [
          {
            role: 'user' as const,
            content: `Recent conversation context:\n${recentHistory}`,
          },
        ]
      : []),
    {
      role: 'user',
      content: input.message,
    },
  ];
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeMode(value: string, fallbackMode: BroBotChatMode): BroBotChatIntent['mode'] {
  const fallback = fallbackMode === 'fracture_call' ? 'consult' : fallbackMode;
  if (value === 'fracture_call') return 'consult';
  if (MODE_SET.has(value) && value !== 'auto') return value as BroBotChatIntent['mode'];
  return fallback === 'auto' ? 'general' : fallback;
}

function normalizeArray(value: unknown, max: number): string[] {
  const array = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/\n|;/)
      : [];
  const seen = new Set<string>();

  return array
    .map((item) => String(item ?? '').replace(/^[-*]\s*/, '').trim())
    .filter((item) => {
      const key = item.toLowerCase().replace(/\s+/g, ' ');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, max);
}

function extractJsonObject(raw: string): string | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first === -1 || last === -1 || first >= last) return null;
  return cleaned.slice(first, last + 1);
}

export function parseBroBotIntentClassifierResponse(
  raw: unknown,
  fallbackMode: BroBotChatMode
): BroBotChatIntent {
  const parsed =
    typeof raw === 'string'
      ? (() => {
          const json = extractJsonObject(raw);
          if (!json) return null;
          try {
            return record(JSON.parse(json));
          } catch {
            return null;
          }
        })()
      : record(raw);

  if (!parsed) {
    return fallbackBroBotIntent('', fallbackMode);
  }

  const mode = normalizeString(parsed.mode);
  const candidate = {
    mode: normalizeMode(mode, fallbackMode),
    subintent: normalizeString(parsed.subintent) || 'other',
    procedureCategory: normalizeString(parsed.procedureCategory) || 'unknown',
    procedureOrTopic: normalizeString(parsed.procedureOrTopic),
    ambiguity: normalizeString(parsed.ambiguity) || 'low',
    assumedContext: normalizeString(parsed.assumedContext),
    missingContext: normalizeArray(parsed.missingContext, 5),
    clarifyingQuestions: normalizeArray(parsed.clarifyingQuestions, 3),
    confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
  };

  const validation = BroBotChatIntentSchema.safeParse(candidate);
  if (!validation.success) {
    return fallbackBroBotIntent(candidate.procedureOrTopic, fallbackMode);
  }

  return validation.data;
}

export function fallbackBroBotIntent(
  message: string,
  selectedMode: BroBotChatMode
): BroBotChatIntent {
  const lower = message.toLowerCase();
  const selectedFallback =
    selectedMode === 'auto' ? 'general' : selectedMode === 'fracture_call' ? 'consult' : selectedMode;
  let mode: BroBotChatIntent['mode'] = selectedFallback;
  let subintent: BroBotChatIntent['subintent'] = 'overview';
  let ambiguity: BroBotChatIntent['ambiguity'] = 'low';
  let assumedContext = '';
  const clarifyingQuestions: string[] = [];
  const missingContext: string[] = [];

  if (selectedMode === 'auto') {
    if (/\b(oite|boards?|test traps?|quiz)\b/.test(lower)) mode = 'oite';
    else if (
      /\b(fracture call|consult|reduction|splint|ed|open fracture|open tibia|compartment|postop|post-op|wound drainage|painful tka|painful tha|hand infection|septic arthritis)\b/.test(
        lower
      )
    ) mode = 'consult';
    else if (/\b(workup|clinic|shoulder pain|knee pain|hip pain)\b/.test(lower)) mode = 'clinic';
    else if (/\b(paper|study|abstract|methods|results|evidence|critique)\b/.test(lower)) mode = 'research';
    else if (/\b(scope|arthroscopy|orif|nail|plate|approach|incision|portal|implant|attending|scrub)\b/.test(lower)) mode = 'or_prep';
  }

  if (/\bdiagnostic\b.*\b(scope|arthroscopy)\b|\b(scope|arthroscopy)\b.*\bsteps?\b/.test(lower)) {
    mode = selectedMode === 'auto' ? 'or_prep' : mode;
    subintent = 'diagnostic_sequence';
    ambiguity = 'moderate';
    assumedContext = 'I am assuming you mean the OR flow unless you specify the intra-articular diagnostic sequence.';
    clarifyingQuestions.push(
      'I mean the sequence once inside the joint.',
      'Walk me through setup and portal placement.',
      'Give me the full diagnostic checklist.'
    );
  } else if (mode === 'consult' && /\bpresent|presentation|staff|call my attending\b/.test(lower)) {
    subintent = 'presentation_help';
    ambiguity = 'moderate';
    missingContext.push('age', 'mechanism or clinical story', 'exam and imaging findings');
    clarifyingQuestions.push('Help me present this consult.', 'What information do I need first?');
  } else if (mode === 'consult' && /\bcompartment|open fracture|open tibia|pulseless|septic|necrotizing|cauda equina\b/.test(lower)) {
    subintent = 'urgent_red_flags';
    ambiguity = 'moderate';
    missingContext.push('neurovascular exam', 'time course', 'imaging/labs', 'senior involvement');
    clarifyingQuestions.push('What findings make this emergent?', 'What should I do before calling my senior?');
  } else if (mode === 'consult' && /\bpostop|post-op|tka|tha|arthroplasty|drainage|painful implant\b/.test(lower)) {
    subintent = 'postop_problem';
    ambiguity = 'moderate';
    missingContext.push('index surgery and date', 'fever/wound status', 'radiographs', 'ESR/CRP and aspiration status');
  } else if (mode === 'consult' && /\binfection|abscess|septic|wound\b/.test(lower)) {
    subintent = 'infection';
    ambiguity = 'moderate';
    missingContext.push('fever/systemic symptoms', 'wound status', 'ESR/CRP/WBC', 'imaging or aspiration');
  } else if (mode === 'consult' && /\boperative indication|indications?|nonoperative|surgery\b/.test(lower)) {
    subintent = 'operative_indications';
    ambiguity = 'moderate';
    missingContext.push('age/activity', 'imaging pattern', 'soft tissue status', 'neurovascular exam');
  } else if (mode === 'consult' && /\b(image|xray|x-ray|radiograph|ct|mri)\b/.test(lower)) {
    subintent = 'imaging_review';
    ambiguity = 'moderate';
    missingContext.push('imaging findings', 'views available', 'clinical exam');
  } else if (mode === 'consult' && /\bfracture|dislocation|physeal|trauma\b/.test(lower)) {
    subintent = 'fracture';
    ambiguity = 'moderate';
    missingContext.push('age', 'mechanism', 'open/closed status', 'neurovascular exam', 'imaging findings');
    clarifyingQuestions.push(
      'What are the age, mechanism, open/closed status, and neurovascular exam?',
      'What imaging findings or classification do you have?'
    );
  } else if (/\bworkup\b/.test(lower)) {
    subintent = 'workup';
    ambiguity = 'moderate';
    missingContext.push('acute vs chronic', 'trauma history', 'diagnosis focus');
  } else if (/\bcritique|paper|study\b/.test(lower)) {
    mode = selectedMode === 'auto' ? 'research' : mode;
    subintent = 'evidence_critique';
    ambiguity = 'high';
    missingContext.push('abstract/methods/results', 'study design', 'outcome of interest');
    clarifyingQuestions.push('Paste the abstract or methods/results.', 'Tell me the study design and outcome.');
  } else if (/\bimplant|plate|nail|screw|system\b/.test(lower)) {
    subintent = 'implant_options';
  } else if (/\bbrand|versus| vs |synthes|arthrex|stryker\b/.test(lower)) {
    subintent = 'brand_comparison';
  } else if (/\banatomy|nerve|vessel|at risk\b/.test(lower)) {
    subintent = 'anatomy_at_risk';
  } else if (/\bsteps?|sequence|flow\b/.test(lower)) {
    subintent = 'surgical_steps';
  } else if (/\bquiz\b/.test(lower)) {
    subintent = 'quiz';
  }

  return {
    mode,
    subintent,
    procedureCategory: 'unknown',
    procedureOrTopic: message.slice(0, 120),
    ambiguity,
    assumedContext,
    missingContext,
    clarifyingQuestions,
    confidence: selectedMode === 'auto' ? 0.35 : 0.45,
  };
}
