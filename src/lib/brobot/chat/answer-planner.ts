/**
 * Answer planning pass for BroBot Chat.
 *
 * This module provides a hidden planning block that is embedded into the answer
 * model's system prompt. The planning block forces the model to reason through:
 * - prompt type and user intent
 * - assumed context
 * - the must-answer question
 * - required topic-specific pivots
 * - pitfalls to avoid
 * - mode-specific checklist
 * - anti-generic self-check
 *
 * No extra LLM call is needed — the planning is done inline by the answer model
 * before it writes the JSON response.
 */

import type { BroBotChatMode, BroBotChatSubintent } from './types';

/** Per-mode checklists that the model must satisfy before generating JSON. */
const MODE_CHECKLISTS: Partial<Record<Exclude<BroBotChatMode, 'auto' | 'fracture_call'>, string[]>> = {
  or_prep: [
    '[ ] Named operative objective (not just "fix the fracture")',
    '[ ] At least 2 named anatomic structures at risk',
    '[ ] At least 1 exposure landmark or surgical interval',
    '[ ] At least 1 intraoperative decision point or check',
    '[ ] At least 1 pitfall or bailout scenario',
    '[ ] Something the attending is likely to ask',
  ],
  oite: [
    '[ ] Direct answer that resolves the classification/algorithm/diagnosis question',
    '[ ] At least 1 testable threshold, number, or differentiating feature',
    '[ ] At least 1 exam trap or commonly selected wrong answer',
    '[ ] At least 1 competing diagnosis or similar-looking condition',
    '[ ] A memory hook, pattern cue, or mnemonic',
  ],
  consult: [
    '[ ] Urgency framing: emergent, urgent, or routine?',
    '[ ] At least 3 missing clinical data points that would change management',
    '[ ] A brief presentation framework (how to call this up)',
    '[ ] Red flag or must-not-miss finding',
    '[ ] What the senior or attending will ask first',
  ],
  clinic: [
    '[ ] Top 2–3 differential diagnoses with distinguishing features',
    '[ ] Key history elements and exam maneuvers',
    '[ ] Initial imaging recommendation',
    '[ ] First-line treatment approach',
    '[ ] Red flags or escalation triggers',
  ],
  research: [
    '[ ] Study design identified and level of evidence stated',
    '[ ] Primary endpoint and headline result named',
    '[ ] At least 1 major limitation or bias',
    '[ ] Clinical practice implication (does this change practice?)',
    '[ ] Alternative interpretation or ongoing controversy',
  ],
};

/** Subintent-level overrides for specialized answer structures. */
const SUBINTENT_CHECKLISTS: Partial<Record<BroBotChatSubintent, string[]>> = {
  quiz: [
    '[ ] Write the question stem FIRST — do not ask whether to give a question',
    '[ ] Provide 4 labeled answer choices (A, B, C, D)',
    '[ ] State the correct answer clearly',
    '[ ] Explain WHY the correct answer is right (mechanism/rule/threshold)',
    '[ ] Explain why each wrong choice is wrong (not just "incorrect")',
    '[ ] Provide a memory hook or clinical association',
    '[ ] End with an offer for a follow-up question',
  ],
  oite_traps: [
    '[ ] Name the classic OITE trap first',
    '[ ] Describe the distracting wrong answer and why it is chosen',
    '[ ] State the rule, threshold, or pattern that separates correct from wrong',
    '[ ] Give a stem recognition cue for the real exam',
  ],
  surgical_approach: [
    '[ ] Surface landmarks and incision placement',
    '[ ] Surgical interval or internervous plane',
    '[ ] Structures at risk by layer',
    '[ ] Extensile options',
    '[ ] Common exposure mistakes',
  ],
  classification: [
    '[ ] Name the classification system and its purpose',
    '[ ] State the key grades/types with defining features',
    '[ ] Explain what changes with each grade (treatment, prognosis)',
    '[ ] Give the most tested or highest-yield grade',
    '[ ] Name a commonly confused alternative classification',
  ],
  anatomy_at_risk: [
    '[ ] Named structure with course description',
    '[ ] Specific danger zone during this procedure',
    '[ ] Mechanism of injury if not protected',
    '[ ] Protective maneuver or technical trick',
    '[ ] Injury consequence and clinical presentation',
  ],
};

/** Prompt-type classifier description (embedded in planning block). */
const PROMPT_TYPES = [
  'anatomy — asking about a structure, course, or relationship',
  'fracture — asking about fracture pattern, classification, or treatment',
  'procedure — asking about surgical technique, approach, or steps',
  'classification — asking about a named classification system',
  'treatment — asking about treatment algorithm, indications, or options',
  'quiz — asking for active recall or test questions',
  'consult — asking how to work up or present a patient problem',
  'research — asking about a paper, study design, or evidence',
  'general — broad orthopaedic learning not fitting the above',
].join('\n  ');

/**
 * Returns the hidden planning block to embed at the top of the answer-model
 * system prompt. This forces the model to reason through its plan before
 * generating JSON.
 */
export function buildAnswerPlanningBlock(
  mode: BroBotChatMode,
  subintent: BroBotChatSubintent | undefined
): string {
  const normalizedMode = mode === 'fracture_call' ? 'consult' : mode === 'auto' ? 'general' : mode;
  const checklist =
    (subintent && SUBINTENT_CHECKLISTS[subintent]) ??
    MODE_CHECKLISTS[normalizedMode as Exclude<BroBotChatMode, 'auto' | 'fracture_call'>];

  const checklistBlock = checklist
    ? `Mode/subintent checklist (satisfy all before writing JSON):\n${checklist.map((item) => `  ${item}`).join('\n')}`
    : '';

  return [
    'HIDDEN ANSWER PLAN (reasoning only — do not include this section in the JSON output):',
    'Before writing your JSON response, reason through the following:',
    '',
    '1. Prompt type — what category is this?',
    `  ${PROMPT_TYPES}`,
    '',
    '2. User intent — what does the learner actually want to accomplish right now?',
    '   One sentence. Be specific, not generic.',
    '',
    '3. Assumed context — what am I assuming about the clinical or educational situation?',
    '   If nothing is being assumed, write "none."',
    '',
    '4. Must-answer question — what is the single most important question this answer must resolve?',
    '   If the answer does not address this, it has failed.',
    '',
    '5. Required orthopaedic pivots — what topic-specific facts, structures, thresholds, or decisions MUST appear?',
    '   List 3–5 concrete items (e.g., "axillary nerve inferior to deltoid," "Garden I/II = nondisplaced," "tip-apex distance < 25 mm").',
    '',
    '6. Pitfalls to avoid — what generic, vague, or unhelpful answers would a less careful model produce?',
    '   List 1–3 specific failure modes (e.g., "just listing steps without exposure," "saying classification drives treatment without naming the classification").',
    '',
    checklistBlock,
    '',
    '7. Anti-generic check — if I removed the procedure/topic name from this answer, would it still make sense?',
    '   If yes, it is too generic. Add the topic-specific details that make this answer unrepeatable for any other topic.',
    '',
    'Now write the JSON response satisfying the plan above.',
  ].filter((line) => line !== undefined).join('\n');
}

/**
 * Returns quiz-specific generation instructions for the system prompt.
 * Used when subintent is "quiz" or the user explicitly asked to be quizzed.
 */
export function buildQuizInstructions(): string {
  return [
    'Quiz mode instructions:',
    '- Generate the question stem FIRST. Do not preface with "Would you like a question?" — just write the question.',
    '- Format: a realistic OITE-style stem with clinical context (age, presentation, imaging finding, or mechanism).',
    '- Provide 4 labeled answer choices: A, B, C, D. Make the distractors plausible.',
    '- State the correct answer: "Correct answer: X"',
    '- Explain why the correct answer is right (the mechanism, classification rule, or clinical threshold).',
    '- Explain why each wrong choice is wrong. Do not just say "incorrect" — name the distractor trap.',
    '- Memory hook: give one clinical association or mnemonic.',
    '- Offer to continue: end with "Want another question on this topic, or should I shift to [related area]?"',
    '- Put the full quiz answer inside the "answer" field of the JSON.',
    '- Set knowledgeGaps to the concept dependencies this question reveals.',
    '- Set suggestedQuestions to follow-up quiz options and deeper-dive prompts.',
  ].join('\n');
}
