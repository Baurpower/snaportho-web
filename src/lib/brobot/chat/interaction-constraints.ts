import type { BroBotModelMessage } from './types';

export type BroBotInteractionConstraints = {
  stagedQuiz: boolean;
  answerOnly: boolean;
  shortAnswer: boolean;
  compare: boolean;
  evidenceRequest: boolean;
  requestedLearnerLevel?: string;
  explicitCorrection: boolean;
  repeatedQuestion: boolean;
  priorSimilarQuestion?: string;
};

const normalize = (value: string) => value.toLowerCase()
  .replace(/\bversus\b/g, 'vs')
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const tokens = (value: string) => new Set(normalize(value).split(' ').filter((token) => token.length > 2));

export function questionSimilarity(left: string, right: string): number {
  const a = tokens(left); const b = tokens(right);
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / Math.max(a.size, b.size);
}

export function detectBroBotInteractionConstraints(input: {
  message: string;
  history?: BroBotModelMessage[];
}): BroBotInteractionConstraints {
  const message = input.message.trim();
  const priorQuestions = (input.history ?? []).filter((item) => item.role === 'user').map((item) => item.content);
  const priorSimilarQuestion = [...priorQuestions].reverse().find((prior) =>
    normalize(prior) === normalize(message) || questionSimilarity(prior, message) >= 0.8
  );
  const learner = /\b(?:for(?: an?)?|at a|i(?:'m| am) (?:a|an))\s+(med(?:ical)? student|student|pgy[- ]?[1-5]|intern|junior resident|senior resident|fellow|attending)\b/i.exec(message)?.[1];

  return {
    stagedQuiz: /\bquiz me\b/i.test(message) && /\b(after i (?:answer|respond)|wait for my answer|one at a time|do not (?:show|give|reveal) (?:the )?answers?|without (?:the )?answers?)\b/i.test(message),
    answerOnly: /\b(answer only|just (?:the )?answer|no explanation|only the answer)\b/i.test(message),
    shortAnswer: /\b(short answer|briefly|concise|in \d+ (?:words?|sentences?|bullets?)|\d+ minute)\b/i.test(message),
    compare: /\b(compare|versus|vs\.?|difference between|pros and cons)\b/i.test(message),
    evidenceRequest: /\b(articles?|papers?|evidence|citations?|references?|latest|current|recent studies?|pubmed)\b/i.test(message),
    requestedLearnerLevel: learner?.toLowerCase(),
    explicitCorrection: /^(?:no\b|wrong\b|actually\b|that(?:'s| is) (?:not|wrong)|you (?:missed|said|got)|i (?:asked|meant)|correction\b)/i.test(message),
    repeatedQuestion: Boolean(priorSimilarQuestion),
    priorSimilarQuestion,
  };
}

export function formatInteractionConstraintsForPrompt(constraints: BroBotInteractionConstraints): string {
  const rules = ['Newest-user-message priority: answer the newest utterance, not stale branch metadata.'];
  if (constraints.stagedQuiz) rules.push('Staged quiz: ask exactly one short question now and do not reveal the answer or explanation until the user responds.');
  if (constraints.answerOnly) rules.push('Answer-only request: give the answer without explanation or extra sections.');
  if (constraints.shortAnswer) rules.push('Short-answer request: keep the visible answer unusually concise.');
  if (constraints.compare) rules.push('Comparison request: compare the named alternatives directly using shared decision-relevant dimensions.');
  if (constraints.evidenceRequest) rules.push('Evidence request: provide verified sources when retrieval context exists; never substitute generic search advice or fabricate citations.');
  if (constraints.requestedLearnerLevel) rules.push(`Requested learner level: ${constraints.requestedLearnerLevel}. Calibrate terminology and depth accordingly.`);
  if (constraints.explicitCorrection) rules.push('Explicit correction: acknowledge the specific error, replace the incorrect claim, and give a complete corrected answer. Do not repeat the contradicted claim.');
  if (constraints.repeatedQuestion) rules.push('Repeated question: do not repeat the prior answer. Give a materially different explanation or ask what remained unclear.');
  return `Interaction constraints:\n${rules.map((rule) => `- ${rule}`).join('\n')}`;
}
