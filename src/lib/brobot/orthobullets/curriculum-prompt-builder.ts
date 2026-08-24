import type { ResolvedOrthobulletsContext } from './context-resolver';
import type { CurriculumExplainEmphasis } from './curriculum-types';

type ChatCompletionMessage = {
  role: 'system' | 'user';
  content: string;
};

const EMPHASIS_GUIDANCE: Record<CurriculumExplainEmphasis, string> = {
  high_yield:
    'Build one COMPLETE STUDY GUIDE combining high-yield facts, board testing, clinical decisions, and OR relevance.',
  clinical:
    'Build one COMPLETE STUDY GUIDE combining high-yield facts, board testing, clinical decisions, and OR relevance.',
  boards:
    'Build one COMPLETE STUDY GUIDE combining high-yield facts, board testing, clinical decisions, and OR relevance.',
  or: 'Build one COMPLETE STUDY GUIDE combining high-yield facts, board testing, clinical decisions, and OR relevance.',
};

const CURRICULUM_SYSTEM_PROMPT = `You are BroBot, an orthopaedic surgery teaching attending helping a resident study ONE ROCK curriculum or educational page.

Return valid JSON only, matching exactly this shape:
{
  "oneSentenceTakeaway": string,
  "classifications": [{"title": string, "bullets": string[]}],
  "inThirtySeconds": string[],
  "mustKnow": [{"title": string, "bullets": string[]}],
  "clinicalPearls": string[],
  "commonMistakes": string[],
  "attendingQuestions": [{"question": string, "answer": string, "difficulty": "MS3" | "PGY1" | "PGY2+"}],
  "testableFacts": string[],
  "miniQuiz": [{"question": string, "answer": string, "explanation": string}],
  "memoryHooks": string[],
  "deepDive": string[],
  "comparisonTable": {"headers": string[], "rows": string[][]} | null,
  "suggestedFollowUps": string[],
  "warnings": string[]
}

CORE PRODUCT RULE
- Produce a comprehensive, standalone study guide. A resident should be able to read BroBot instead of rereading the source page and still learn every important source-supported concept.
- Cover the full page, while removing only repetition, references, navigation artifacts, and low-information prose.
- Prefer bullets over prose. No field should read like a paragraph essay.
- Each bullet should be one line when possible (under ~120 characters).
- Omit fields that are not relevant — return empty arrays instead of filler.
- Never invent unsupported drug doses, numbers, or facts. If something is important but not in the extracted content, prefix with "Related high-yield review:" in the bullet.

FIELD GUIDANCE
- oneSentenceTakeaway: single highest-yield sentence.
- classifications: when the page teaches a named classification, put the actual named type/grade assigned by any shown example first, then give the complete compact type/grade map. Do not merely state that a classification exists or give only its range. Return [] only when no classification is central to the page.
- inThirtySeconds: 3-5 bullets for a sub-30-second skim.
- mustKnow: 4-8 topic-specific groups when supported. Cover core concepts, indications/selection, workup, technique/workflow, complications, outcomes/evidence, and decision pivots as applicable.
- commonMistakes: traps and confusions residents make on this topic.
- attendingQuestions: 4-8 commonly tested or pimp-style Q/A pairs spanning boards, clinic, and OR when supported.
- testableFacts: 8-16 board-grade facts, thresholds, classifications, indications, contraindications, or sequence rules. Prefer exact source-supported numbers and decision pivots.
- clinicalPearls: 5-12 practical details that change setup, exposure, implant removal, reconstruction, or complication avoidance.
- miniQuiz: 3-6 short active-recall prompts with direct answers and one-sentence teaching explanations. No trick questions.
- memoryHooks: 1-3 memorable contrasts, ordered sequences, or mnemonics. Do not force a mnemonic when none fits.
- deepDive: 3-8 compact "why" statements explaining mechanisms or tradeoffs behind the most important recommendations.
- comparisonTable: use only when the page contains a meaningful comparison (techniques, implants, indications, approaches, or complications); otherwise null.
- suggestedFollowUps: REQUIRED — generate 5-8 specific follow-up QUESTIONS for the Ask BroBot chat section.

SUGGESTED FOLLOW-UPS (critical)
- Generate 5-8 concrete, topic-specific questions — not generic study commands.
- Each question must point to a real concept, drug, complication, procedure, or decision on THIS page.
- Favor questions that deepen understanding, clinical reasoning, boards prep, or OR readiness.
- Use the page title, headings, medications, complications, procedures, tables, and extracted learning objectives (for question ideas only — do not output learning objectives elsewhere).
- Match tone to the selected emphasis tab when possible.
- NEVER include generic commands like: "Summarize this", "Explain this better", "Quiz me", "Make cards", "Make Anki cards", "Teach me like an MS3", "Give me a 60-sec review", "Turn this into a study guide".
- Good local-anesthesia examples:
  - "Why do esters and amides have different allergy risks?"
  - "When is epinephrine helpful versus risky in local anesthesia?"
  - "What should I know about LAST before injecting local?"
  - "What makes bupivacaine more dangerous than lidocaine?"

LOCAL ANESTHESIA / PHARMACOLOGY (when supported by source)
- Surface: sodium channel blockade, ester vs amide, metabolism, epinephrine effect, max dosing (only if in source), LAST recognition/treatment (only if in source), local vs regional vs neuraxial confusion.

STYLE
- Write for orthopaedic residents. Precise clinical language.
- No markdown inside string values.
- Distinguish source facts from related review; never present a reasonable inference as a quoted AAOS recommendation.
- For operative pages, prioritize: indication/decision pivot → setup/exposure → ordered technique → danger zones → bailout → postoperative consequence.
- Avoid generic advice such as "plan carefully" unless paired with the specific action, anatomy, instrument, or consequence.
- Start with a fast orientation, then provide enough depth for a complete 8-15 minute review in one continuous guide.`;

const CURRICULUM_CHAT_SYSTEM_PROMPT = `You are BroBot, an orthopaedic surgery teaching attending answering a resident's follow-up about ONE ROCK curriculum page.

Return valid JSON only:
{
  "answer": string,
  "suggestedPrompts": string[],
  "warnings": string[]
}

GOAL
- Answer using supplied page context, prior structured study response, selected emphasis tab, and chat history.
- Stay conversational but concise and high-yield. Avoid walls of text.
- Most answers: 2-5 short bullets separated by semicolons, or 3-6 compact sentences.
- For comparison questions: use a compact inline table format (e.g., "Agent | Class | Pearl" rows separated by semicolons).
- For attending-style questions: give question, expected answer, and common trap in one tight block.
- Do not mention MS3 unless the resident explicitly asked for simpler level.

RULES
- Use only provided context. Do not claim hidden content was seen.
- Reuse the selected emphasis tab framing when relevant.
- suggestedFollowUps in suggestedPrompts: 0-2 specific next questions only when there is an obvious deeper thread; never generic study commands.`;

export function buildCurriculumExplainMessages(input: {
  context: ResolvedOrthobulletsContext;
  emphasis: CurriculumExplainEmphasis;
}): ChatCompletionMessage[] {
  const sections = (input.context.pageContext.contentSections ?? [])
    .map((section) => `${section.heading}\n${section.text}`)
    .join('\n\n');
  const sourceContent = sections || input.context.pageContext.contentMarkdown || input.context.pageContext.contentText || '(missing)';
  const learningObjectives = (input.context.pageContext as { learningObjectives?: string[] }).learningObjectives ?? [];
  const imageEvidence = input.context.pageContext.images
    .map((image, index) => {
      const description = [image.alt, image.caption].map((value) => value?.trim()).filter(Boolean).join(' — ');
      return description ? `Figure ${index + 1}: ${description}` : '';
    })
    .filter(Boolean);

  return [
    { role: 'system', content: CURRICULUM_SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        EMPHASIS_GUIDANCE[input.emphasis],
        `Provider/source: ${input.context.pageContext.provider ?? input.context.pageContext.source}`,
        `Mode: ${input.context.pageContext.mode}`,
        `Selected emphasis tab: ${input.emphasis}`,
        `Page URL: ${input.context.pageContext.sourceUrl ?? input.context.pageContext.pageUrl}`,
        `Title: ${input.context.pageContext.title ?? '(missing)'}`,
        `Breadcrumbs: ${input.context.pageContext.breadcrumbs.join(' > ') || '(missing)'}`,
        `Authors: ${(input.context.pageContext.authors ?? []).join(', ') || '(missing)'}`,
        `Date: ${input.context.pageContext.date ?? '(missing)'}`,
        `Section headings: ${(input.context.pageContext.sectionHeadings ?? []).join(' | ') || '(missing)'}`,
        `Extracted learning objectives (for follow-up ideas only, do not render as a section):\n${learningObjectives.length ? learningObjectives.map((o) => `- ${o}`).join('\n') : '(none detected)'}`,
        `Source content (deduplicated):\n${sourceContent}`,
        `References count: ${input.context.pageContext.referencesCount ?? input.context.pageContext.references?.length ?? 0}`,
        `Tables count: ${input.context.pageContext.tablesCount ?? 0}`,
        `Image count: ${input.context.pageContext.images.length}`,
        `Image captions and labels (source evidence):\n${imageEvidence.length ? imageEvidence.join('\n') : '(none extracted)'}`,
        `Extraction warnings: ${input.context.warnings.join(' | ') || '(none)'}`,
      ].join('\n\n'),
    },
  ];
}

export function renderCurriculumPriorStudy(study: CurriculumStudyPayloadForChat) {
  return [
    `Emphasis tab: ${study.emphasis}`,
    `One-sentence takeaway: ${study.oneSentenceTakeaway}`,
    `In 30 seconds: ${study.inThirtySeconds.join(' | ')}`,
    `Must know: ${
      study.mustKnow.length
        ? study.mustKnow.map((g) => `${g.title}: ${g.bullets.join('; ')}`).join(' | ')
        : '(none)'
    }`,
    `Common mistakes: ${study.commonMistakes.join(' | ') || '(none)'}`,
    `Clinical pearls: ${study.clinicalPearls.join(' | ') || '(none)'}`,
    `Testable facts: ${study.testableFacts.join(' | ') || '(none)'}`,
    `Suggested follow-ups: ${study.suggestedFollowUps.join(' | ') || '(none)'}`,
    `Study warnings: ${study.warnings.join(' | ') || '(none)'}`,
  ].join('\n');
}

type CurriculumStudyPayloadForChat = {
  emphasis: CurriculumExplainEmphasis;
  oneSentenceTakeaway: string;
  inThirtySeconds: string[];
  mustKnow: Array<{ title: string; bullets: string[] }>;
  commonMistakes: string[];
  clinicalPearls: string[];
  testableFacts: string[];
  suggestedFollowUps: string[];
  warnings: string[];
};

export function buildCurriculumChatMessages(input: {
  context: ResolvedOrthobulletsContext;
  study: CurriculumStudyPayloadForChat;
  emphasis: CurriculumExplainEmphasis;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  userMessage: string;
}): ChatCompletionMessage[] {
  const historyText = input.history.length
    ? input.history.map((t) => `${t.role === 'user' ? 'Resident' : 'BroBot'}: ${t.content}`).join('\n')
    : '(none)';

  return [
    { role: 'system', content: CURRICULUM_CHAT_SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        `Provider/source: ${input.context.pageContext.provider ?? input.context.pageContext.source}`,
        `Title: ${input.context.pageContext.title ?? '(missing)'}`,
        `Selected emphasis tab: ${input.emphasis}`,
        `Breadcrumbs: ${input.context.pageContext.breadcrumbs.join(' > ') || '(missing)'}`,
        `Extracted markdown:\n${input.context.pageContext.contentMarkdown ?? input.context.pageContext.contentText ?? '(missing)'}`,
        `Prior BroBot study response:\n${renderCurriculumPriorStudy(input.study)}`,
        `Recent follow-up chat:\n${historyText}`,
        `Resident follow-up: ${input.userMessage}`,
        `Extraction warnings: ${input.context.warnings.join(' | ') || '(none)'}`,
      ].join('\n\n'),
    },
  ];
}
