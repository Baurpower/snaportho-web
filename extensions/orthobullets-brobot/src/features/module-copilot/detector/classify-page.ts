import type { ModulePageType, QuizQuestion } from '../types/module-state.js';

export const ATTESTATION_PHRASES = [
  'i certify',
  'i attest',
  'i acknowledge',
  'i agree',
  'i have reviewed',
  'i have completed',
  'i understand',
  'electronic signature',
  'signature',
  'by clicking submit',
];

export const COMPLETION_PHRASES = [
  'course complete',
  'training completed',
  'congratulations',
  'you passed',
  'passed',
  'certificate',
  'completion recorded',
  'you have completed',
];

export const KNOWLEDGE_CHECK_PHRASES = ['knowledge check', 'check your knowledge', 'quick check'];

export const QUIZ_PHRASES = ['quiz', 'assessment', 'question', 'select the best', 'choose the correct'];

export function includesPhrase(text: string, phrases: string[]) {
  const lower = text.toLowerCase();
  return phrases.filter((phrase) => lower.includes(phrase));
}

export function classifyModulePage(input: {
  text: string;
  hasNextOrContinue: boolean;
  hasAnswerControls: boolean;
  hasVideo: boolean;
  question: QuizQuestion | null;
}): { pageType: ModulePageType; reasons: string[] } {
  const text = input.text.replace(/\s+/g, ' ').trim();
  const attestationHits = includesPhrase(text, ATTESTATION_PHRASES);
  if (attestationHits.length) {
    return { pageType: 'attestation', reasons: attestationHits.slice(0, 3) };
  }

  const completionHits = includesPhrase(text, COMPLETION_PHRASES);
  if (completionHits.length && !input.hasAnswerControls) {
    return { pageType: 'completion', reasons: completionHits.slice(0, 3) };
  }

  const knowledgeHits = includesPhrase(text, KNOWLEDGE_CHECK_PHRASES);
  if (input.question || input.hasAnswerControls) {
    return {
      pageType: knowledgeHits.length ? 'knowledge_check' : 'quiz',
      reasons: knowledgeHits.length ? knowledgeHits : ['answer controls found'],
    };
  }

  if (input.hasVideo) {
    return { pageType: 'video', reasons: ['video player found'] };
  }

  const substantialText = text.length >= 80;
  if (substantialText && input.hasNextOrContinue && !input.hasAnswerControls && !attestationHits.length) {
    return { pageType: 'instruction', reasons: ['instructional text with navigation'] };
  }

  if (substantialText) {
    return { pageType: 'instruction', reasons: ['substantial instructional text'] };
  }

  return { pageType: 'unknown', reasons: ['insufficient module signals'] };
}
