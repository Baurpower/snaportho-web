import type { OrthobulletsTopicAction, OrthobulletsPageContext } from './types.js';

/** The focused study actions that earn permanent space in Page Mode. */
export const TOPIC_TUTOR_PRIMARY_ACTIONS: Array<{ action: OrthobulletsTopicAction; label: string }> = [
  { action: 'quiz_me', label: 'Quiz me' },
  { action: 'what_tested', label: 'What would be tested?' },
  { action: 'board_traps', label: 'Board traps' },
  { action: 'attending_question', label: 'Attending questions' },
];

const MAX_CHIPS = 4;

export function resolveTopicTutorChips(modelSuggested: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  modelSuggested.forEach((chip) => {
    const normalized = chip.trim().replace(/\s+/g, ' ');
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) return;
    seen.add(key);
    result.push(normalized);
  });
  return result.slice(0, MAX_CHIPS);
}

export function topicCountsSummary(pageContext: OrthobulletsPageContext) {
  const parts: string[] = [];
  if (pageContext.questionCount != null) parts.push(`${pageContext.questionCount} questions`);
  if (pageContext.cardCount != null) parts.push(`${pageContext.cardCount} cards`);
  if (pageContext.videoCount != null) parts.push(`${pageContext.videoCount} videos`);
  return parts;
}
