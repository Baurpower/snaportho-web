"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCurriculumExplainMessages = buildCurriculumExplainMessages;
exports.renderCurriculumPriorStudy = renderCurriculumPriorStudy;
exports.buildCurriculumChatMessages = buildCurriculumChatMessages;
const EMPHASIS_GUIDANCE = {
    high_yield: 'Emphasis: HIGH YIELD — fastest useful review. Prioritize In 30 Seconds, Must Know, and common learner traps. Keep bullets ultra-scannable.',
    clinical: 'Emphasis: CLINICAL — real patient care and safety. Prioritize practical pearls, decision points, complications/danger zones, and attending-style questions.',
    boards: 'Emphasis: BOARDS — OITE/boards style. Prioritize testable facts, common traps, and attending/boards-style questions.',
    or: 'Emphasis: OR — intraoperative relevance. Prioritize what attendings ask, resident role/scripts, and procedure/anesthesia implications.',
};
const CURRICULUM_SYSTEM_PROMPT = `You are BroBot, an orthopaedic surgery teaching attending helping a resident study ONE ROCK curriculum or educational page.

Return valid JSON only, matching exactly this shape:
{
  "oneSentenceTakeaway": string,
  "inThirtySeconds": string[],
  "mustKnow": [{"title": string, "bullets": string[]}],
  "clinicalPearls": string[],
  "commonMistakes": string[],
  "attendingQuestions": [{"question": string, "answer": string, "difficulty": "MS3" | "PGY1" | "PGY2+"}],
  "testableFacts": string[],
  "suggestedFollowUps": string[],
  "warnings": string[]
}

CORE PRODUCT RULE
- Do NOT summarize the whole page. Identify what is worth remembering, testable, clinically important, and what students usually miss.
- Be selective. Prefer bullets over prose. No field should read like a paragraph essay.
- Each bullet should be one line when possible (under ~120 characters).
- Omit fields that are not relevant — return empty arrays instead of filler.
- Never invent unsupported drug doses, numbers, or facts. If something is important but not in the extracted content, prefix with "Related high-yield review:" in the bullet.

FIELD GUIDANCE
- oneSentenceTakeaway: single highest-yield sentence.
- inThirtySeconds: 3-5 bullets for a sub-30-second skim.
- mustKnow: 1-3 compact groups with 2-4 bullets each.
- commonMistakes: traps and confusions residents make on this topic.
- attendingQuestions: 2-4 pimp-style Q/A pairs when relevant to the emphasis tab (OR/clinical/boards).
- testableFacts: only for boards-heavy or clearly testable pages; otherwise empty.
- clinicalPearls: only for clinical/OR emphasis or when pearls are clearly supported.
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
- Whole response should be scannable in under 60 seconds for high_yield emphasis.`;
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
function buildCurriculumExplainMessages(input) {
    const sections = (input.context.pageContext.contentSections ?? [])
        .map((section) => `${section.heading}\n${section.text}`)
        .join('\n\n');
    const learningObjectives = input.context.pageContext.learningObjectives ?? [];
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
                `Extracted sections:\n${sections || '(none)'}`,
                `Extracted markdown:\n${input.context.pageContext.contentMarkdown ?? input.context.pageContext.contentText ?? '(missing)'}`,
                `References count: ${input.context.pageContext.referencesCount ?? input.context.pageContext.references?.length ?? 0}`,
                `Tables count: ${input.context.pageContext.tablesCount ?? 0}`,
                `Image count: ${input.context.pageContext.images.length}`,
                `Extraction warnings: ${input.context.warnings.join(' | ') || '(none)'}`,
            ].join('\n\n'),
        },
    ];
}
function renderCurriculumPriorStudy(study) {
    return [
        `Emphasis tab: ${study.emphasis}`,
        `One-sentence takeaway: ${study.oneSentenceTakeaway}`,
        `In 30 seconds: ${study.inThirtySeconds.join(' | ')}`,
        `Must know: ${study.mustKnow.length
            ? study.mustKnow.map((g) => `${g.title}: ${g.bullets.join('; ')}`).join(' | ')
            : '(none)'}`,
        `Common mistakes: ${study.commonMistakes.join(' | ') || '(none)'}`,
        `Clinical pearls: ${study.clinicalPearls.join(' | ') || '(none)'}`,
        `Testable facts: ${study.testableFacts.join(' | ') || '(none)'}`,
        `Suggested follow-ups: ${study.suggestedFollowUps.join(' | ') || '(none)'}`,
        `Study warnings: ${study.warnings.join(' | ') || '(none)'}`,
    ].join('\n');
}
function buildCurriculumChatMessages(input) {
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
