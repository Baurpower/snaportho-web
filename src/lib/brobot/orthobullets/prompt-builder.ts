import type {
  OrthobulletsChatTurn,
  OrthobulletsExplainResponse,
  OrthobulletsHintRequest,
} from './types';
import type { ResolvedOrthobulletsContext } from './context-resolver';

type ChatCompletionMessage = {
  role: 'system' | 'user';
  content: string;
};

function renderChoices(context: ResolvedOrthobulletsContext) {
  if (!context.pageContext.answerChoices.length) return '(no answer choices detected)';

  return context.pageContext.answerChoices
    .map((choice) => {
      const flags = [
        choice.isSelected ? 'selected' : null,
        choice.isCorrect ? 'correct' : null,
      ].filter(Boolean);
      return `- ${choice.key ?? '?'}: ${choice.text}${flags.length ? ` [${flags.join(', ')}]` : ''}`;
    })
    .join('\n');
}

function renderDistribution(context: ResolvedOrthobulletsContext) {
  if (!context.pageContext.percentDistribution.length) return '(not visible)';

  return context.pageContext.percentDistribution
    .map((row) => `- ${row.answerKey ?? row.label ?? '?'}: ${row.percent ?? '?'}%`)
    .join('\n');
}

const SYSTEM_PROMPT = `You are BroBot, an orthopaedic surgery teaching attending reviewing a single Orthobullets question with a resident, right after they answered it.

Return valid JSON only, matching exactly this shape:
{
  "bottomLine": string,
  "testedConcept": string,
  "whyCorrect": string,
  "whyWrong": [{"choiceKey"?: string, "reason": string, "isClassicTrap"?: boolean}],
  "boardTrap"?: string,
  "boardPearl": string,
  "studyNext": string[],
  "warnings": string[]
}

SCOPE
- Use only the provided stem, choices, percent data, explanation text, and KG metadata. Never claim to have seen images, hidden content, or other Orthobullets pages.
- If the provided explanation is missing or thin, reason from orthopaedic first principles and clinical knowledge instead of inventing facts; add a note to "warnings" if you had to do this.

YOUR JOB IS TO TEACH THE CONCEPT, NOT SUMMARIZE THE PAGE
- The resident has already read the Orthobullets explanation. Repeating its claims in different words has zero value, even if you reword every sentence — a paraphrase is still a summary.
- "whyCorrect" must lead with ONE of these four angles — vary your phrasing naturally, but the substance must be one of these, not a restatement of what's already given:
  (1) Mechanism: the anatomic/biomechanical/pathophysiologic reason the correct choice works, one level deeper than what the explanation said.
  (2) Distinguishing feature: the specific finding/fact that separates this diagnosis from the next-most-likely mimic, especially if the explanation didn't frame it as a comparison.
  (3) Classic reference: the relevant named study, eponym, or classification system the explanation didn't cite.
  (4) Transferable pattern: the general rule for this question archetype that applies beyond this one instance, not just this question.
  Pick whichever genuinely fits; do not force one that adds nothing real, and do not announce which one you picked — just teach it. Do not literally write "the distinguishing feature is," "mechanistically," "classically," or "the pattern here is" as a stock opener — express it in plain language specific to this question instead of a template phrase.
- Never quote the Orthobullets explanation verbatim, and never just reorder the same 1-2 facts the explanation already gave as your entire answer.

CONTENT REQUIREMENTS (map directly to the JSON fields)
- testedConcept: name the ONE concept being tested, concretely (e.g. "reverse obliquity intertrochanteric fracture fixation," not "hip fractures"). One short phrase, not a sentence.
- bottomLine: 1-2 sentences. The direct answer: what's going on clinically and which choice wins. A resident skimming only this should get the core takeaway.
- whyCorrect: the mechanism/reasoning that makes the correct choice right, going at least one level deeper than the provided explanation (see above) — not just restating what it is.
- whyWrong: one bullet per distractor (skip the correct choice). Each reason is ONE sentence — the specific flaw, not a restatement of the choice. Flag exactly one distractor as "isClassicTrap": true — the choice residents most often pick incorrectly. When percent-distribution data is provided, that's empirical evidence: the trap is whichever WRONG choice has the highest selection percentage, even if it's not the one you'd intuitively guess — defer to the data over your own intuition. Without distribution data, use medical-education judgment instead. If no distractor is a real trap, omit the flag entirely (do not force one).
- boardTrap: optional. Name the single trap in 1-2 sentences: why a smart resident gets baited and the key clue that rescues them. Omit this field if there is no meaningful trap beyond the whyWrong bullets.
- boardPearl: ONE memorable, high-yield sentence — a generalizable rule or distinguishing feature the resident could apply to a DIFFERENT question testing this same concept. It must not just restate this question's specific answer (that's what bottomLine is for); it should still be true even if the choices or clinical scenario were different.
- studyNext: 2-4 short, concrete next-study ideas. These should be tightly adjacent topics a resident should review next, not generic advice like "read more." Examples: "reverse obliquity fracture fixation", "dynamic hip screw failure patterns", "OTA intertrochanteric fracture stability".

STYLE CONSTRAINTS
- Prefer accuracy over completeness: a shorter, fully accurate answer beats a longer one that pads with hedged or generic filler.
- Zero repetition: never make the same point in two fields. Each field earns its place.
- No generic AI phrasing: never write "In conclusion," "It's important to note," "Let's break this down," "Overall," "Additionally," or similar filler. Start sentences with the substance.
- Write for orthopaedic residents: use precise clinical and anatomic terminology without defining basic terms; do not over-explain things a PGY-2+ already knows.
- Whole response should read in well under 500 words unless the question genuinely has unusual complexity (e.g. many distractors or multi-step reasoning) — most should be much shorter than that ceiling.
- No markdown formatting inside string values (no asterisks, headers, or bullets within a field) — the client renders structure from the JSON fields themselves.`;

const CHAT_SYSTEM_PROMPT = `You are BroBot, an orthopaedic surgery teaching attending answering a resident's follow-up question about ONE Orthobullets question they just reviewed.

Return valid JSON only, matching exactly this shape:
{
  "answer": string,
  "suggestedPrompts": string[],
  "warnings": string[]
}

GOAL
- Answer the resident's follow-up using the supplied question context plus the prior BroBot explanation.
- Teach at the resident level: concise, specific, and clinically useful.
- Most answers should be 2-6 sentences. Go shorter when the question is simple.

RULES
- Use only the provided page context, prior explanation, and follow-up chat history. Do not claim you saw anything else on Orthobullets.
- Do not quote or paraphrase the Orthobullets explanation at length. Build on it.
- Resolve short follow-ups like "why not bone scan?" or "make this simpler" against the prior explanation and chat history.
- If the user asks for simplification, keep the same medical accuracy but use plainer language.
- If the user asks for an Anki card, return the answer as a compact Q/A style card inside the answer string.
- No markdown bullets or headers inside "answer".
- "suggestedPrompts" should contain 0-3 short, useful next follow-ups only when there is an obvious next step.`;

const HINT_SYSTEM_PROMPT = `You are BroBot, a senior orthopaedic resident coaching an intern through an unanswered Orthobullets-style question.

Return valid JSON only, matching exactly this shape:
{
  "title": string,
  "hint": string,
  "warnings": string[]
}

GOAL
- Help the learner solve the question themselves through progressive hints.
- Teach clinical reasoning, not memorized recall.
- Keep the hint concise and useful. The "hint" field must stay under 120 words.

NON-NEGOTIABLE SAFETY RULES
- Do NOT reveal the correct answer choice, answer number, or answer text.
- Do NOT say "the correct answer is", "choose", "pick", "the answer is", or any equivalent.
- Do NOT quote the Orthobullets explanation.
- Do NOT give away the final management/test/diagnosis in Hint 1 or Hint 2.

HINT LADDER
- Hint 1 ("Recognize the pattern"): identify the key clue, syndrome, injury pattern, or diagnosis category. Point the learner toward the right frame without naming the answer choice.
- Hint 2 ("Narrow the differential"): explain the decisive mechanism, anatomy, imaging finding, or management principle that rules out 1-2 tempting wrong paths. Still avoid naming the answer choice.
- Hint 3 ("Decision point"): point directly to the deciding test, treatment principle, anatomy, classification, or complication that should drive the choice. Still do not reveal the answer choice text or answer number.

STYLE
- Sound like a smart senior resident on rounds: direct, practical, and clinically grounded.
- Prefer one compact paragraph over a list.
- Use only the provided stem, choices, visible explanation state, and KG metadata. Never imply you saw hidden content.
- If key review-only fields are missing, that is expected; use the visible clue pattern and add a warning only if the missing information materially limits the hint.`;

export function buildOrthobulletsExplainMessages(
  context: ResolvedOrthobulletsContext
): ChatCompletionMessage[] {
  const kgNotes = context.kgLookup
    ? [
        `KG specialty: ${context.kgLookup.sourceSpecialty ?? '(unknown)'}`,
        `KG source topic: ${context.kgLookup.sourceTopicRaw ?? context.kgLookup.sourceTopicSlug ?? '(unknown)'}`,
        `KG curriculum node: ${context.kgLookup.curriculumNodeTitle ?? context.kgLookup.curriculumNodeSlug ?? '(none)'}`,
      ].join('\n')
    : 'KG match: none';

  return [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: [
        `Page URL: ${context.pageContext.pageUrl}`,
        `Question ID: ${context.pageContext.questionId ?? '(missing)'}`,
        `Topic ID: ${context.pageContext.topicId ?? '(missing)'}`,
        `Breadcrumbs: ${context.pageContext.breadcrumbs.join(' > ') || '(missing)'}`,
        `Stem:\n${context.pageContext.stem ?? '(missing)'}`,
        `Answer choices:\n${renderChoices(context)}`,
        `Selected answer: ${context.pageContext.selectedAnswerKey ?? '(unknown)'}`,
        `Correct answer: ${context.pageContext.correctAnswerKey ?? '(unknown)'}`,
        `Percent distribution:\n${renderDistribution(context)}`,
        `Explanation (background only — do not summarize or quote this; reason independently):\n${context.pageContext.explanationText ?? '(missing)'}`,
        `Linked concepts: ${
          context.pageContext.linkedConcepts.map((item) => item.label).join(', ') || '(none)'
        }`,
        `Image count: ${context.pageContext.images.length}`,
        kgNotes,
        `Extraction warnings: ${context.warnings.join(' | ') || '(none)'}`,
      ].join('\n\n'),
    },
  ];
}

function renderKgNotes(context: ResolvedOrthobulletsContext) {
  return context.kgLookup
    ? [
        `KG specialty: ${context.kgLookup.sourceSpecialty ?? '(unknown)'}`,
        `KG source topic: ${context.kgLookup.sourceTopicRaw ?? context.kgLookup.sourceTopicSlug ?? '(unknown)'}`,
        `KG curriculum node: ${context.kgLookup.curriculumNodeTitle ?? context.kgLookup.curriculumNodeSlug ?? '(none)'}`,
      ].join('\n')
    : 'KG match: none';
}

function renderChatHistory(history: OrthobulletsChatTurn[]) {
  if (!history.length) return '(none)';
  return history
    .map((turn) => `${turn.role === 'user' ? 'Resident' : 'BroBot'}: ${turn.content}`)
    .join('\n');
}

function renderPriorExplanation(explanation: Omit<OrthobulletsExplainResponse, 'explanationId' | 'usage'>) {
  return [
    `Bottom line: ${explanation.bottomLine}`,
    `Tested concept: ${explanation.testedConcept}`,
    `Why correct: ${explanation.whyCorrect}`,
    `Why wrong: ${
      explanation.whyWrong.length
        ? explanation.whyWrong.map((item) => `${item.choiceKey ?? '?'} - ${item.reason}`).join(' | ')
        : '(none)'
    }`,
    `Board trap: ${explanation.boardTrap ?? '(none)'}`,
    `Board pearl: ${explanation.boardPearl}`,
    `Study next: ${explanation.studyNext.join(' | ') || '(none)'}`,
    `Explanation warnings: ${explanation.warnings.join(' | ') || '(none)'}`,
  ].join('\n');
}

export function buildOrthobulletsChatMessages(input: {
  context: ResolvedOrthobulletsContext;
  explanation: Omit<OrthobulletsExplainResponse, 'explanationId' | 'usage'>;
  history: OrthobulletsChatTurn[];
  userMessage: string;
}): ChatCompletionMessage[] {
  return [
    {
      role: 'system',
      content: CHAT_SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: [
        `Page URL: ${input.context.pageContext.pageUrl}`,
        `Question ID: ${input.context.pageContext.questionId ?? '(missing)'}`,
        `Breadcrumbs: ${input.context.pageContext.breadcrumbs.join(' > ') || '(missing)'}`,
        `Stem:\n${input.context.pageContext.stem ?? '(missing)'}`,
        `Answer choices:\n${renderChoices(input.context)}`,
        `Selected answer: ${input.context.pageContext.selectedAnswerKey ?? '(unknown)'}`,
        `Correct answer: ${input.context.pageContext.correctAnswerKey ?? '(unknown)'}`,
        `Prior BroBot explanation:\n${renderPriorExplanation(input.explanation)}`,
        `Recent follow-up chat:\n${renderChatHistory(input.history)}`,
        `Resident follow-up: ${input.userMessage}`,
        `Extraction warnings: ${input.context.warnings.join(' | ') || '(none)'}`,
      ].join('\n\n'),
    },
  ];
}

export function buildOrthobulletsHintMessages(input: {
  context: ResolvedOrthobulletsContext;
  hintLevel: OrthobulletsHintRequest['hintLevel'];
  selectedAnswerKey?: string;
}): ChatCompletionMessage[] {
  const ladderLabel =
    input.hintLevel === 1
      ? 'Hint 1 - Recognize the pattern'
      : input.hintLevel === 2
        ? 'Hint 2 - Narrow the differential'
        : 'Hint 3 - Decision point';

  return [
    {
      role: 'system',
      content: HINT_SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: [
        `Hint level requested: ${ladderLabel}`,
        `Page URL: ${input.context.pageContext.pageUrl}`,
        `Question ID: ${input.context.pageContext.questionId ?? '(missing)'}`,
        `Topic ID: ${input.context.pageContext.topicId ?? '(missing)'}`,
        `Breadcrumbs: ${input.context.pageContext.breadcrumbs.join(' > ') || '(missing)'}`,
        `Stem:\n${input.context.pageContext.stem ?? '(missing)'}`,
        `Answer choices (visible to learner; do not reveal any choice in the hint):\n${renderChoices(input.context)}`,
        `User selected answer so far: ${input.selectedAnswerKey ?? input.context.pageContext.selectedAnswerKey ?? '(none visible)'}`,
        `Correct answer visibility on page: ${input.context.pageContext.correctAnswerKey ? 'visible' : 'not visible'}`,
        `Percent distribution:\n${renderDistribution(input.context)}`,
        `Visible explanation text (may be missing; do not quote it):\n${input.context.pageContext.explanationText ?? '(missing)'}`,
        `Linked concepts: ${input.context.pageContext.linkedConcepts.map((item) => item.label).join(', ') || '(none)'}`,
        `Image count: ${input.context.pageContext.images.length}`,
        renderKgNotes(input.context),
        `Extraction warnings: ${input.context.warnings.join(' | ') || '(none)'}`,
      ].join('\n\n'),
    },
  ];
}
