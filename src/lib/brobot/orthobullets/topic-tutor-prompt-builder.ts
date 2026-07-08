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
    'Requested action: "Quiz me from this page". Ask ONE new page-grounded question the learner has not already been asked in this conversation, following the tier ladder below.',
  find_answer:
    'Requested action: "Ask me to find answers on the page". Pose a "Find the bullet that explains ___" retrieval question that points at a specific section/heading without revealing the answer.',
  explain_section:
    'Requested action: "Explain this section". Pick the current or most recently discussed section and ask the learner to state its clinical significance BEFORE you confirm or expand on it — do not just explain it unprompted.',
  what_tested:
    'Requested action: "What would be tested?". Ask the learner what detail on this page is most likely to appear on OITE/boards, and let them answer first before you confirm.',
  attending_question:
    'Requested action: "What would an attending ask?". Ask a pimp-style question a PGY2+ attending would ask right after reading this page.',
  explain_images:
    'Requested action: "Explain the images". Reference the provided image alt/caption metadata and ask what diagnosis or principle it illustrates before confirming. If no images were extracted, say so plainly and offer another action instead of inventing image content.',
  board_traps:
    'Requested action: "Show board traps". Ask the learner to identify the trap/pitfall implied by this page before you reveal it.',
  save_missed:
    'Requested action: "Save missed concepts". Do not ask a new question. Briefly name the concept(s) from the recent conversation the learner struggled with (conceptStatus="missed", conceptTag set), confirm it is saved for review, and set message to a short confirmation.',
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

CORE RULE — GROUNDING
- Every question or judgment must be answerable ONLY from the extracted title/breadcrumbs/headings/bullets/tables/images/references provided below. Never invent facts, numbers, doses, or classifications that are not present in the extracted content.
- If the extracted content is too thin to support the requested action, set "insufficientContent": true, briefly say what's missing in "message", and ask whether the learner wants you to answer using general orthopaedic knowledge instead. Do NOT answer from general knowledge unless the learner's immediately preceding message said yes (check chat history).

ACTION HANDLING
${Object.values(ACTION_INSTRUCTIONS).map((line) => `- ${line}`).join('\n')}
- If no action is given, treat the learner's message as an ANSWER ATTEMPT to the most recent question BroBot asked in chat history, and judge it.

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
- "suggestedChips": 2-4 short next-step labels (reuse the 8 primary action labels verbatim when relevant: "Quiz me from this page", "Ask me to find answers on the page", "Explain this section", "What would be tested?", "What would an attending ask?", "Explain the images", "Show board traps", "Save missed concepts").

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
