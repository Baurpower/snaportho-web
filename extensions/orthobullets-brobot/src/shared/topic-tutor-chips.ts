import type { OrthobulletsTopicAction, OrthobulletsPageContext } from './types.js';

/**
 * The 8 primary Orthobullets Page Mode actions. Deliberately separate from
 * ROCK's curriculum-chips.ts: ROCK chips ask the model to teach/expand a
 * concept, these ask BroBot to quiz/retrieve/validate against THIS page.
 */
export const TOPIC_TUTOR_PRIMARY_ACTIONS: Array<{ action: OrthobulletsTopicAction; label: string }> = [
  { action: 'quiz_me', label: 'Quiz me from this page' },
  { action: 'find_answer', label: 'Ask me to find answers on the page' },
  { action: 'explain_section', label: 'Explain this section' },
  { action: 'what_tested', label: 'What would be tested?' },
  { action: 'attending_question', label: 'What would an attending ask?' },
  { action: 'explain_images', label: 'Explain the images' },
  { action: 'board_traps', label: 'Show board traps' },
  { action: 'save_missed', label: 'Save missed concepts' },
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
