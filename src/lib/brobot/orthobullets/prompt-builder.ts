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

const SYSTEM_PROMPT = `You are BroBot, an orthopaedic surgery teaching attending reviewing a single orthopaedic question-bank question with a resident, right after they answered it.

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
- Use only the provided provider/source, stem, choices, percent data, explanation text, and KG metadata. Never claim to have seen images, hidden content, or other pages from the source.
- If the provided explanation is missing or thin, reason from orthopaedic first principles and clinical knowledge instead of inventing facts; add a note to "warnings" if you had to do this.

YOUR JOB IS TO TEACH THE CONCEPT, NOT SUMMARIZE THE PAGE
- The resident has already read the visible source explanation when one is provided. Repeating its claims in different words has zero value, even if you reword every sentence — a paraphrase is still a summary.
- "whyCorrect" must lead with ONE of these four angles — vary your phrasing naturally, but the substance must be one of these, not a restatement of what's already given:
  (1) Mechanism: the anatomic/biomechanical/pathophysiologic reason the correct choice works, one level deeper than what the explanation said.
  (2) Distinguishing feature: the specific finding/fact that separates this diagnosis from the next-most-likely mimic, especially if the explanation didn't frame it as a comparison.
  (3) Classic reference: the relevant named study, eponym, or classification system the explanation didn't cite.
  (4) Transferable pattern: the general rule for this question archetype that applies beyond this one instance, not just this question.
  Pick whichever genuinely fits; do not force one that adds nothing real, and do not announce which one you picked — just teach it. Do not literally write "the distinguishing feature is," "mechanistically," "classically," or "the pattern here is" as a stock opener — express it in plain language specific to this question instead of a template phrase.
- Never quote the source explanation verbatim, and never just reorder the same 1-2 facts the explanation already gave as your entire answer.

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

const CHAT_SYSTEM_PROMPT = `You are BroBot, an orthopaedic surgery teaching attending answering a resident's follow-up question about ONE orthopaedic question-bank question they just reviewed.

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
- Use only the provided page context, prior explanation, and follow-up chat history. Do not claim you saw anything else on the source site.
- Do not quote or paraphrase the source explanation at length. Build on it.
- Resolve short follow-ups like "why not bone scan?" or "make this simpler" against the prior explanation and chat history.
- If the user asks for simplification, keep the same medical accuracy but use plainer language.
- If the user asks for an Anki card, return the answer as a compact Q/A style card inside the answer string.
- No markdown bullets or headers inside "answer".
- "suggestedPrompts" should contain 0-3 short, useful next follow-ups only when there is an obvious next step.`;

const HINT_SYSTEM_PROMPT = `You are BroBot, a senior orthopaedic resident coaching an intern through an unanswered orthopaedic question-bank question.

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
- Do NOT quote the source explanation.
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

const CURRICULUM_SYSTEM_PROMPT = `You are BroBot, an orthopaedic surgery teaching attending explaining a ROCK curriculum or educational page to a resident.

Return valid JSON only, matching exactly this shape:
{
  "bottomLine": string,
  "testedConcept": string,
  "whyCorrect": string,
  "whyWrong": [],
  "boardTrap"?: string,
  "boardPearl": string,
  "studyNext": string[],
  "warnings": string[]
}

GOAL
- Teach the page, not just summarize it.
- Focus on what matters clinically, on OITE/boards, and on the wards.
- Convert long sections into high-yield teaching points rather than repeating the page.

FIELD MEANING
- bottomLine: one-sentence takeaway, then one more sentence on why this matters clinically.
- testedConcept: the page topic as one concise phrase.
- whyCorrect: organized teaching explanation covering high-yield facts, decision points/algorithms if present, common exam traps, and common attending pimp questions. Use short paragraphs separated by semicolons if needed, but no markdown bullets.
- whyWrong: always return an empty array for curriculum pages.
- boardTrap: what students usually miss on this topic.
- boardPearl: one memorable clinical/OITE takeaway.
- studyNext: 2-5 adjacent topics to review next.
- warnings: include a brief warning if the extracted content was sparse, references-heavy, or lacked key sections.

RULES
- Use only the provided normalized visible content. Do not claim you saw hidden content, full HTML, or unprovided images.
- Do not quote long passages. Teach from the extracted content.
- Write for orthopaedic residents using precise clinical language.`;

const CURRICULUM_CHAT_SYSTEM_PROMPT = `You are BroBot, an orthopaedic surgery teaching attending answering a resident's follow-up question about ONE ROCK curriculum or educational page.

Return valid JSON only, matching exactly this shape:
{
  "answer": string,
  "suggestedPrompts": string[],
  "warnings": string[]
}

GOAL
- Answer the follow-up using the supplied page context and prior BroBot explanation.
- Teach at the resident level: concise, specific, and clinically useful.
- Support follow-ups like "What is most testable here?", "Explain this like I'm an MS3", "Give me pimp questions", "What should I memorize?", and "Turn this into a study guide".

RULES
- Use only the provided page context, prior explanation, and follow-up chat history.
- Do not claim you saw hidden content or unprovided images.
- No markdown bullets or headers inside "answer".
- "suggestedPrompts" should contain 0-3 short, useful next follow-ups only when there is an obvious next step.`;

export function buildOrthobulletsExplainMessages(
  context: ResolvedOrthobulletsContext
): ChatCompletionMessage[] {
  if (context.pageContext.mode === 'curriculum_content') {
    const sections = (context.pageContext.contentSections ?? [])
      .map((section) => `${section.heading}\n${section.text}`)
      .join('\n\n');

    return [
      {
        role: 'system',
        content: CURRICULUM_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: [
          `Provider/source: ${context.pageContext.provider ?? context.pageContext.source}`,
          `Mode: ${context.pageContext.mode}`,
          `Page URL: ${context.pageContext.sourceUrl ?? context.pageContext.pageUrl}`,
          `Title: ${context.pageContext.title ?? '(missing)'}`,
          `Breadcrumbs: ${context.pageContext.breadcrumbs.join(' > ') || '(missing)'}`,
          `Authors: ${(context.pageContext.authors ?? []).join(', ') || '(missing)'}`,
          `Date: ${context.pageContext.date ?? '(missing)'}`,
          `Section headings: ${(context.pageContext.sectionHeadings ?? []).join(' | ') || '(missing)'}`,
          `Extracted sections:\n${sections || '(none)'}`,
          `Extracted markdown:\n${context.pageContext.contentMarkdown ?? context.pageContext.contentText ?? '(missing)'}`,
          `References count: ${context.pageContext.referencesCount ?? context.pageContext.references?.length ?? 0}`,
          `Tables count: ${context.pageContext.tablesCount ?? 0}`,
          `Image count: ${context.pageContext.images.length}`,
          `Extraction warnings: ${context.warnings.join(' | ') || '(none)'}`,
        ].join('\n\n'),
      },
    ];
  }

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
        `Provider/source: ${context.pageContext.provider ?? context.pageContext.source}`,
        `Page URL: ${context.pageContext.sourceUrl ?? context.pageContext.pageUrl}`,
        `Question ID: ${context.pageContext.questionId ?? '(missing)'}`,
        `Topic ID: ${context.pageContext.topicId ?? '(missing)'}`,
        `Breadcrumbs: ${context.pageContext.breadcrumbs.join(' > ') || '(missing)'}`,
        `Stem:\n${context.pageContext.stem ?? '(missing)'}`,
        `Answer choices:\n${renderChoices(context)}`,
        `Selected answer: ${context.pageContext.selectedAnswerKey ?? context.pageContext.selectedAnswer ?? '(unknown)'}`,
        `Correct answer: ${context.pageContext.correctAnswerKey ?? context.pageContext.correctAnswer ?? '(unknown)'}`,
        `Percent distribution:\n${renderDistribution(context)}`,
        `Explanation (background only — do not summarize or quote this; reason independently):\n${context.pageContext.explanationText ?? context.pageContext.explanation ?? '(missing)'}`,
        `Source feedback/explanation shown on page:\n${context.pageContext.sourceExplanation ?? context.pageContext.explanationText ?? context.pageContext.explanation ?? '(missing)'}`,
        `Source key reference points shown on page:\n${context.pageContext.sourceKeyPoints ?? '(missing)'}`,
        `Source references shown on page:\n${renderSourceReferences(context)}`,
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

function renderSourceReferences(context: ResolvedOrthobulletsContext) {
  return context.pageContext.sourceReferences || (context.pageContext.references ?? []).join('\n') || '(missing)';
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
  const isCurriculum = input.context.pageContext.mode === 'curriculum_content';

  return [
    {
      role: 'system',
      content: isCurriculum ? CURRICULUM_CHAT_SYSTEM_PROMPT : CHAT_SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: isCurriculum
        ? [
            `Provider/source: ${input.context.pageContext.provider ?? input.context.pageContext.source}`,
            `Mode: ${input.context.pageContext.mode}`,
            `Page URL: ${input.context.pageContext.sourceUrl ?? input.context.pageContext.pageUrl}`,
            `Title: ${input.context.pageContext.title ?? '(missing)'}`,
            `Breadcrumbs: ${input.context.pageContext.breadcrumbs.join(' > ') || '(missing)'}`,
            `Section headings: ${(input.context.pageContext.sectionHeadings ?? []).join(' | ') || '(missing)'}`,
            `Extracted markdown:\n${input.context.pageContext.contentMarkdown ?? input.context.pageContext.contentText ?? '(missing)'}`,
            `Prior BroBot explanation:\n${renderPriorExplanation(input.explanation)}`,
            `Recent follow-up chat:\n${renderChatHistory(input.history)}`,
            `Resident follow-up: ${input.userMessage}`,
            `Extraction warnings: ${input.context.warnings.join(' | ') || '(none)'}`,
          ].join('\n\n')
        : [
            `Provider/source: ${input.context.pageContext.provider ?? input.context.pageContext.source}`,
            `Page URL: ${input.context.pageContext.sourceUrl ?? input.context.pageContext.pageUrl}`,
            `Question ID: ${input.context.pageContext.questionId ?? '(missing)'}`,
            `Breadcrumbs: ${input.context.pageContext.breadcrumbs.join(' > ') || '(missing)'}`,
            `Stem:\n${input.context.pageContext.stem ?? '(missing)'}`,
            `Answer choices:\n${renderChoices(input.context)}`,
            `Selected answer: ${input.context.pageContext.selectedAnswerKey ?? input.context.pageContext.selectedAnswer ?? '(unknown)'}`,
            `Correct answer: ${input.context.pageContext.correctAnswerKey ?? input.context.pageContext.correctAnswer ?? '(unknown)'}`,
            `Source feedback/explanation shown on page:\n${input.context.pageContext.sourceExplanation ?? input.context.pageContext.explanationText ?? input.context.pageContext.explanation ?? '(missing)'}`,
            `Source key reference points shown on page:\n${input.context.pageContext.sourceKeyPoints ?? '(missing)'}`,
            `Source references shown on page:\n${renderSourceReferences(input.context)}`,
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
        `Provider/source: ${input.context.pageContext.provider ?? input.context.pageContext.source}`,
        `Page URL: ${input.context.pageContext.sourceUrl ?? input.context.pageContext.pageUrl}`,
        `Question ID: ${input.context.pageContext.questionId ?? '(missing)'}`,
        `Topic ID: ${input.context.pageContext.topicId ?? '(missing)'}`,
        `Breadcrumbs: ${input.context.pageContext.breadcrumbs.join(' > ') || '(missing)'}`,
        `Stem:\n${input.context.pageContext.stem ?? '(missing)'}`,
        `Answer choices (visible to learner; do not reveal any choice in the hint):\n${renderChoices(input.context)}`,
        `User selected answer so far: ${input.selectedAnswerKey ?? input.context.pageContext.selectedAnswerKey ?? input.context.pageContext.selectedAnswer ?? '(none visible)'}`,
        `Correct answer visibility on page: ${input.context.pageContext.correctAnswerKey || input.context.pageContext.correctAnswer ? 'visible' : 'not visible'}`,
        `Percent distribution:\n${renderDistribution(input.context)}`,
        `Visible explanation text (may be missing; do not quote it):\n${input.context.pageContext.explanationText ?? input.context.pageContext.explanation ?? '(missing)'}`,
        `Source key reference points shown on page:\n${input.context.pageContext.sourceKeyPoints ?? '(missing)'}`,
        `Source references shown on page:\n${renderSourceReferences(input.context)}`,
        `Linked concepts: ${input.context.pageContext.linkedConcepts.map((item) => item.label).join(', ') || '(none)'}`,
        `Image count: ${input.context.pageContext.images.length}`,
        renderKgNotes(input.context),
        `Extraction warnings: ${input.context.warnings.join(' | ') || '(none)'}`,
      ].join('\n\n'),
    },
  ];
}
