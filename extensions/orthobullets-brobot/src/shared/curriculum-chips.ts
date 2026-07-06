import type { CurriculumExplainEmphasis, CurriculumStudyResponse, OrthobulletsPageContext } from './types.js';

const MAX_CHIPS = 8;

const BANNED_CHIP_PATTERNS = [
  /^teach me like an ms3/i,
  /^make anki cards?/i,
  /^make cards/i,
  /^give me a 60-sec/i,
  /^quiz me/i,
  /^explain (this|it) (better|simpler)/i,
  /^summarize/i,
  /^turn this into a study guide/i,
  /^how do i recognize\/manage this\?/i,
  /^show key anatomy/i,
];

const FALLBACK_GENERIC = [
  'What is most testable here?',
  'What would an attending ask?',
  'What are the common traps?',
  'How does this matter clinically?',
] as const;

const MINIMAL_GENERIC = ['What is most testable?', 'Ask me pimp questions'] as const;

export function contentSignals(context: OrthobulletsPageContext) {
  const haystack = [
    context.title ?? '',
    ...(context.sectionHeadings ?? []),
    context.contentText ?? '',
    context.contentMarkdown ?? '',
    ...(context.breadcrumbs ?? []),
  ]
    .join(' ')
    .toLowerCase();

  return {
    pharmacology: /\b(anesthetic|anesthesia|drug|dose|pharmac|lidocaine|bupivacaine|ropivacaine|epinephrine|ester|amide)\b/.test(haystack),
    complication: /\b(complication|toxicity|infection|bleed|nerve injury|compartment|embolism|failure|last\b|systemic toxicity)\b/.test(haystack),
    procedure: /\b(procedure|surgical|incision|fixation|arthroscop|intraoperative|implant|arthroplasty|carpal tunnel)\b/.test(haystack),
    anatomy: /\b(anatomy|anatomic|landmark|nerve|vessel|muscle|bone|ligament)\b/.test(haystack),
    referencesHeavy: (context.referencesCount ?? context.references?.length ?? 0) >= 3,
    hasTables: (context.tablesCount ?? 0) > 0,
  };
}

function isBannedChip(chip: string) {
  const trimmed = chip.trim();
  if (!trimmed) return true;
  return BANNED_CHIP_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function normalizeChip(chip: string) {
  return chip.trim().replace(/\s+/g, ' ');
}

function dedupeChips(chips: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  chips.forEach((chip) => {
    const normalized = normalizeChip(chip);
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key) || isBannedChip(normalized)) return;
    seen.add(key);
    result.push(normalized);
  });
  return result;
}

function conditionalChips(context: OrthobulletsPageContext, existing: string[]) {
  const signals = contentSignals(context);
  const chips: string[] = [];
  const haystack = existing.join(' ').toLowerCase();

  if (signals.pharmacology && !/compare.*drug/i.test(haystack)) {
    chips.push('Compare the drugs');
  }
  if (signals.complication && !/danger sign/i.test(haystack)) {
    chips.push('What are the danger signs?');
  }
  if (signals.procedure && !/matter in the or/i.test(haystack)) {
    chips.push('How does this matter in the OR?');
  }
  if (signals.anatomy && !/anatomy matters/i.test(haystack)) {
    chips.push('What anatomy matters most here?');
  }
  if (signals.referencesHeavy && !/references suggest/i.test(haystack)) {
    chips.push('What do these references suggest?');
  }

  return chips;
}

export function resolveCurriculumChatChips(
  context: OrthobulletsPageContext,
  study?: Pick<CurriculumStudyResponse, 'suggestedFollowUps'> | null
): string[] {
  const chips: string[] = [];

  if (study?.suggestedFollowUps?.length) {
    chips.push(...study.suggestedFollowUps);
  }

  let merged = dedupeChips(chips);

  for (const conditional of conditionalChips(context, merged)) {
    if (merged.length >= MAX_CHIPS) break;
    merged = dedupeChips([...merged, conditional]);
  }

  if (merged.length < 3) {
    for (const fallback of FALLBACK_GENERIC) {
      if (merged.length >= MAX_CHIPS) break;
      merged = dedupeChips([...merged, fallback]);
    }
  }

  if (merged.length === 0) {
    merged = dedupeChips([...MINIMAL_GENERIC]);
  }

  return merged.slice(0, MAX_CHIPS);
}

/** @deprecated Use resolveCurriculumChatChips(context, study) */
export function buildCurriculumFollowUpChips(context: OrthobulletsPageContext): string[] {
  return resolveCurriculumChatChips(context, null);
}

export const CURRICULUM_EMPHASIS_TABS: Array<{ id: CurriculumExplainEmphasis; label: string }> = [
  { id: 'high_yield', label: 'High Yield' },
  { id: 'clinical', label: 'Clinical' },
  { id: 'boards', label: 'Boards' },
  { id: 'or', label: 'OR' },
];

export function estimateStudyMinutes(context: OrthobulletsPageContext) {
  const words = (context.contentText ?? context.contentMarkdown ?? '').split(/\s+/).filter(Boolean).length;
  if (!words) return null;
  return Math.max(1, Math.min(15, Math.round(words / 180)));
}

export function detectTopicLabel(context: OrthobulletsPageContext) {
  if (context.breadcrumbs.length >= 2) {
    return context.breadcrumbs[context.breadcrumbs.length - 1];
  }
  if (context.topicId) return context.topicId;
  return null;
}

export function isClinicallyImportantWarning(warning: string) {
  const normalized = warning.toLowerCase();
  if (/compact fallback|parse|structured curriculum json/i.test(normalized)) return false;
  return true;
}