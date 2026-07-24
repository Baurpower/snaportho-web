// Client + normalizer for the te6 REST API.
//
// This is the primary Himalaya extraction path. It returns the same question
// content the page renders, but structured, so BroBot no longer depends on
// AAOS's CSS class names. `himalaya-extractor.ts` remains as the fallback for
// when this payload shape changes or the bridge cannot reach the Angular scope.

import {
  HIMALAYA_REST_BASE_PATH,
  type Te6Answer,
  type Te6QuestionAttempt,
} from './himalaya-te6-types.js';
import type { HimalayaAnswerChoice } from './himalaya-types.js';

export const HIMALAYA_API_VERSION = '2026-07-23-himalaya-api-v1';

/** Normalized form of one te6 question attempt, ready for prompt building. */
export type HimalayaApiQuestion = {
  questionAttemptId: number;
  questionNumber: number | null;
  type: string | null;
  stem: string;
  choices: HimalayaAnswerChoice[];
  selectedChoiceIds: string[];
  correctChoiceIds: string[];
  /** True/false when known; null while an attempt is still in progress. */
  isCorrect: boolean | null;
  /** AAOS "Discussion" tab. */
  explanation: string | null;
  /** AAOS "Recommended Readings" tab. */
  references: string | null;
  keyReferencePoints: string | null;
  additionalFeedback: Array<{ title: string; text: string }>;
  images: Array<{ src: string; alt: string | null; caption: string | null }>;
  tags: string[];
  averagePeerPercent: number | null;
  /** False during a live attempt — the answer key must stay hidden. */
  reviewAvailable: boolean;
};

export type HimalayaApiFetchResult =
  | { ok: true; questions: HimalayaApiQuestion[] }
  | { ok: false; reason: string; status?: number };

const MAX_FIELD_CHARS = 20000;

/**
 * te6 returns HTML strings for stem/answer/feedback. Convert to plain text
 * without an HTML parser dependency, preserving block boundaries as newlines so
 * lists and paragraphs do not run together.
 */
export function htmlToText(value: string | null | undefined): string {
  if (!value) return '';
  let text = String(value);
  text = text.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/(p|div|li|tr|h[1-6]|section|article)\s*>/gi, '\n');
  text = text.replace(/<li[^>]*>/gi, '\n• ');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => String.fromCharCode(parseInt(code, 16)));
  return text
    .replace(/[ \t\f\v ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_FIELD_CHARS);
}

/**
 * te6 gives choices a `displayNumber` ("A", "1", …) only sometimes. Fall back to
 * positional letters so downstream prompts and the UI always have a stable key.
 */
function choiceLabel(answer: Te6Answer, index: number) {
  const explicit = typeof answer.displayNumber === 'string' ? answer.displayNumber.trim() : '';
  if (explicit) return explicit.replace(/[^A-Za-z0-9]/g, '').slice(0, 3) || String(index + 1);
  return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[index] ?? String(index + 1);
}

function normalizeQuestion(entry: Te6QuestionAttempt, fallbackIndex: number): HimalayaApiQuestion | null {
  const question = entry.question;
  if (!question) return null;
  const questionAttemptId = typeof question.questionAttemptId === 'number' ? question.questionAttemptId : null;
  const stem = htmlToText(question.stem);
  if (!questionAttemptId || !stem) return null;

  const remediation = entry.remediation ?? null;
  // During a live attempt te6 withholds remediation; without it we must not
  // infer or expose an answer key.
  const reviewAvailable = entry.showCorrectAnswer === true && Boolean(remediation);
  const correctIds = new Set((remediation?.correctAnswerIds ?? []).map((id) => String(id)));
  const selectedIds = new Set(
    [
      ...(Array.isArray(question.selectedAnswers) ? question.selectedAnswers : []),
      ...(question.selectedAnswer != null ? [question.selectedAnswer] : []),
    ].map((id) => String(id))
  );

  const answers = Array.isArray(question.answers) ? question.answers : [];
  const choices = answers
    .map((answer, index): HimalayaAnswerChoice | null => {
      const text = htmlToText(answer.text);
      if (!text) return null;
      const id = answer.id != null ? String(answer.id) : `idx-${index}`;
      const label = choiceLabel(answer, index);
      const correct = reviewAvailable
        ? correctIds.has(id) || answer.correctResponse === true
        : undefined;
      return {
        id: label,
        label,
        text,
        selected: selectedIds.has(id) || answer.selectedFlag === true,
        correct,
      };
    })
    .filter((choice): choice is HimalayaAnswerChoice => choice != null);

  const images = (Array.isArray(question.medias) ? question.medias : [])
    .map((media) => ({
      src: typeof media?.url === 'string' ? media.url : '',
      alt: typeof media?.description === 'string' ? media.description : null,
      caption: typeof media?.name === 'string' ? media.name : null,
    }))
    .filter((image) => /^https?:\/\//i.test(image.src));

  return {
    questionAttemptId,
    questionNumber: typeof question.displayOrder === 'number' ? question.displayOrder : fallbackIndex + 1,
    type: typeof question.type === 'string' ? question.type : null,
    stem,
    choices,
    selectedChoiceIds: choices.filter((choice) => choice.selected).map((choice) => choice.id),
    correctChoiceIds: choices.filter((choice) => choice.correct === true).map((choice) => choice.id),
    isCorrect: reviewAvailable ? remediation?.correctResponse === true : null,
    explanation: reviewAvailable ? htmlToText(remediation?.feedback) || null : null,
    references: reviewAvailable ? htmlToText(remediation?.reference) || null : null,
    keyReferencePoints: reviewAvailable ? htmlToText(remediation?.keyReferencePoints) || null : null,
    additionalFeedback: reviewAvailable
      ? (remediation?.additionalFeedbacks ?? [])
          .map((feedback) => ({
            title: htmlToText(feedback?.title),
            text: htmlToText(feedback?.description),
          }))
          .filter((feedback) => feedback.text)
      : [],
    images,
    tags: (Array.isArray(question.tags) ? question.tags : []).filter((tag): tag is string => typeof tag === 'string'),
    averagePeerPercent: typeof remediation?.averagePeerPercent === 'number' ? remediation.averagePeerPercent : null,
    reviewAvailable,
  };
}

export function normalizeHimalayaAttempts(payload: unknown): HimalayaApiQuestion[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((entry, index) => normalizeQuestion((entry ?? {}) as Te6QuestionAttempt, index))
    .filter((question): question is HimalayaApiQuestion => question != null)
    .sort((a, b) => (a.questionNumber ?? 0) - (b.questionNumber ?? 0));
}

type FetchLike = (input: string, init: {
  method: string;
  headers: Record<string, string>;
  body: string;
  credentials: 'include' | 'same-origin';
}) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/**
 * te6 answers with a Java error string unless an explicit JSON Accept header is
 * sent, so both headers are mandatory here.
 */
export async function fetchHimalayaAttempts(input: {
  testAttemptId: number;
  archived: boolean;
  origin?: string;
  fetchImpl?: FetchLike;
}): Promise<HimalayaApiFetchResult> {
  const fetchImpl = (input.fetchImpl ?? (globalThis.fetch as unknown as FetchLike)) ?? null;
  if (!fetchImpl) return { ok: false, reason: 'fetch_unavailable' };
  const url = `${input.origin ?? ''}${HIMALAYA_REST_BASE_PATH}/all-question-attempts/`;

  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ testAttemptId: input.testAttemptId, archived: input.archived }),
      credentials: 'include',
    });
    if (!response.ok) return { ok: false, reason: 'http_error', status: response.status };
    const questions = normalizeHimalayaAttempts(await response.json());
    if (!questions.length) return { ok: false, reason: 'empty_payload', status: response.status };
    return { ok: true, questions };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'network_error' };
  }
}
