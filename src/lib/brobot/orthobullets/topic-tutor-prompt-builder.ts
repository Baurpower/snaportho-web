import type { ResolvedOrthobulletsContext } from './context-resolver';
import type {
  OrthobulletsTopicAction,
  OrthobulletsTopicProgress,
  OrthobulletsTopicTutorTurn,
} from './topic-tutor-types';

type ChatCompletionMessage = {
  role: 'system' | 'user';
  content: string;
};

const ACTION_INSTRUCTIONS: Record<OrthobulletsTopicAction, string> = {
  quiz_me:
    'Requested action: "Quiz me". Ask ONE high-yield question grounded in the page. Prefer clinical application or discrimination over copying a bullet. Do not reveal the answer until the learner responds.',
  what_tested:
    'Requested action: "What would be tested?". Give 3-5 concrete, prioritized OITE/board testable takeaways from this page. For each, state the likely question angle in one sentence. End with one optional board-style question.',
  attending_question:
    'Requested action: "Attending questions". Ask ONE practical PGY2+ pimp question tied to diagnosis, workup, treatment, complications, or operative decision-making on this page. Wait for the answer, then grade it and escalate the follow-up.',
  board_traps:
    'Requested action: "Board traps". Give the 2-4 highest-value traps supported by this page. For each, contrast the tempting wrong idea with the clue or rule that rescues the learner. End with one short discrimination question.',
};

const TOPIC_TUTOR_SYSTEM_PROMPT = `You are BroBot, acting as an ACTIVE-READING TUTOR for a single Orthobullets topic page — not a lecturer and not a summarizer.

Orthobullets topic pages are concise bullet-based references. Your job is to make the learner read, retrieve, and reason through the page's OWN content — never to summarize it for them.

Return valid JSON only, matching exactly this shape:
{
  "message": string,
  "citedHeading": string | null,
  "citedQuote": string | null,
  "verdict": "correct" | "partial" | "incorrect" | null,
  "clinicalWhyItMatters": string | null,
  "followUpQuestion": string | null,
  "conceptTag": string | null,
  "conceptStatus": "missed" | "mastered" | null,
  "sectionCompleted": string | null,
  "tier": 1 | 2 | 3 | 4 | 5,
  "insufficientContent": boolean,
  "suggestedChips": string[],
  "warnings": string[]
}

GROUNDING AND NORMAL CHAT
- Use the extracted page as the primary context and never claim the page says something absent from it.
- You may use established orthopaedic knowledge to answer a learner's free-form question normally. Clearly distinguish added clinical context from facts explicitly present on the page.
- If an action cannot be supported because extraction is thin, set "insufficientContent": true and say what is missing. For a normal free-form question, still give the best concise answer you can and add a warning when uncertainty matters.

ACTION HANDLING
${Object.values(ACTION_INSTRUCTIONS).map((line) => `- ${line}`).join('\n')}
- If no action is given and the most recent BroBot message asked a question, treat a short learner reply as an answer attempt and judge it.
- Otherwise, treat the learner's message as a normal chat question or request. Answer it directly and conversationally; do not grade it, force a quiz, or redirect the learner to the page.

QUESTION TIERS — cycle upward through the conversation; report which one this turn represents in "tier":
1. Recall from page — direct retrieval of a bullet/fact ("Find the bullet that explains...").
2. Interpretation — what a bullet implies or means clinically.
3. Clinical application — how it changes management or decision-making.
4. Board-style trap — the distractor/pitfall pattern on this page.
5. Attending-level follow-up — open-ended reasoning an attending would probe.

JUDGING A LEARNER'S ANSWER
- Briefly judge correctness in "verdict".
- Cite the exact page section: "citedHeading" is the section heading, "citedQuote" is a short quote/paraphrase PULLED FROM the provided contentSections/tablesMarkdown — never a quote that isn't actually in the extracted content.
- "clinicalWhyItMatters": one tight sentence on why this matters clinically (boards, call, clinic, or OR).
- "followUpQuestion": ask a logical next question, ideally the next tier up. Also mirror it into "message" so it displays in the conversation.
- If the learner missed or partially missed it, set "conceptStatus": "missed" and "conceptTag" to a short label (e.g. "OKC vs OC labral tear signs"). If they nailed it, "conceptStatus": "mastered".
- If this turn wraps up everything under one heading, set "sectionCompleted" to that heading's exact text.

SUGGESTED CHIPS
- "suggestedChips": 0-4 useful next steps. Prefer these primary labels verbatim: "Quiz me", "What would be tested?", "Board traps", "Attending questions". A specific conversational follow-up is also allowed when it fits the discussion.

STYLE
- Concise and conversational: 2-5 sentences plus the question, never a wall of text.
- No markdown headers or bullet characters inside "message" — plain conversational text.
- Never fabricate. Never claim to have seen page content that was not provided below.`;

function renderContentSections(context: ResolvedOrthobulletsContext) {
  const sections = context.pageContext.contentSections ?? [];
  if (!sections.length) return '(none extracted)';
  return sections.map((section) => `## ${section.heading}\n${section.text}`).join('\n\n');
}

function renderImages(context: ResolvedOrthobulletsContext) {
  const images = context.pageContext.images;
  if (!images.length) return '(no images extracted)';
  return images
    .map((image, index) => `${index + 1}. alt/caption: ${image.alt ?? image.caption ?? '(none)'}`)
    .join('\n');
}

function renderCounts(context: ResolvedOrthobulletsContext) {
  const parts: string[] = [];
  if (context.pageContext.questionCount != null) parts.push(`${context.pageContext.questionCount} questions`);
  if (context.pageContext.cardCount != null) parts.push(`${context.pageContext.cardCount} cards`);
  if (context.pageContext.videoCount != null) parts.push(`${context.pageContext.videoCount} videos`);
  return parts.length ? parts.join(', ') : '(not visible)';
}

function renderProgress(progress: OrthobulletsTopicProgress) {
  return [
    `Current tier: ${progress.tier}`,
    `Sections completed: ${progress.sectionsCompleted.join(', ') || '(none)'}`,
    `Concepts mastered: ${progress.conceptsMastered.join(', ') || '(none)'}`,
    `Concepts missed (weak spots): ${progress.conceptsMissed.join(', ') || '(none)'}`,
    `Saved pearls: ${progress.savedPearls.join(', ') || '(none)'}`,
  ].join('\n');
}

function renderHistory(history: OrthobulletsTopicTutorTurn[]) {
  if (!history.length) return '(none — this is the first turn)';
  return history.map((turn) => `${turn.role === 'user' ? 'Learner' : 'BroBot'}: ${turn.content}`).join('\n');
}

export function buildTopicTutorMessages(input: {
  context: ResolvedOrthobulletsContext;
  action?: OrthobulletsTopicAction;
  progress: OrthobulletsTopicProgress;
  history: OrthobulletsTopicTutorTurn[];
  userMessage?: string;
}): ChatCompletionMessage[] {
  const { pageContext } = input.context;

  return [
    { role: 'system', content: TOPIC_TUTOR_SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        `Page URL: ${pageContext.sourceUrl ?? pageContext.pageUrl}`,
        `Topic title: ${pageContext.title ?? '(missing)'}`,
        `Breadcrumbs: ${pageContext.breadcrumbs.join(' > ') || '(missing)'}`,
        `Section headings: ${(pageContext.sectionHeadings ?? []).join(' | ') || '(missing)'}`,
        `Extracted sections (headings + bullets — the ONLY source of truth for this page):\n${renderContentSections(input.context)}`,
        `Extracted tables:\n${(pageContext.tablesMarkdown ?? []).join('\n\n') || '(none)'}`,
        `Extracted image alt/captions:\n${renderImages(input.context)}`,
        `References count: ${pageContext.referencesCount ?? pageContext.references?.length ?? 0}`,
        `Study counts on this page: ${renderCounts(input.context)}`,
        `Requested action: ${input.action ? ACTION_INSTRUCTIONS[input.action] : '(none — treat learner message as an answer attempt, or open with a Tier 1 recall question if history is empty)'}`,
        `Learner progress so far:\n${renderProgress(input.progress)}`,
        `Recent conversation:\n${renderHistory(input.history)}`,
        `Learner's current message: ${input.userMessage ?? '(none — learner just clicked an action button)'}`,
        `Extraction warnings: ${input.context.warnings.join(' | ') || '(none)'}`,
      ].join('\n\n'),
    },
  ];
}
