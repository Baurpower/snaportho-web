import type { InferredQuestionState, QuestionTutorPrimaryAction } from './question-review-state.js';
import type { OrthobulletsImageMetadata, OrthobulletsPageContext } from './types.js';

export type QuestionFingerprintParts = {
  questionId: string;
  stemHash: string;
  answerChoiceHash: string;
  imageHash: string;
  positionKey: string;
};

export function hashText(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function hashAnswerChoices(choices: Array<{ key?: string; text: string }>): string {
  const normalized = choices
    .map((choice, index) => `${(choice.key ?? String.fromCharCode(65 + index)).trim()}:${choice.text.trim().toLowerCase()}`)
    .sort()
    .join('|');
  return hashText(normalized);
}

export function hashImages(images: OrthobulletsImageMetadata[]): string {
  if (!images.length) return '';
  const normalized = images
    .map((image, index) => {
      const src = (image.src ?? '').trim().toLowerCase();
      const alt = (image.alt ?? '').trim().toLowerCase();
      return `${index}:${src}|${alt}`;
    })
    .sort()
    .join('||');
  return hashText(normalized);
}

export function extractPositionKey(
  context: Pick<OrthobulletsPageContext, 'pageUrl' | 'sourceUrl' | 'questionId'>
): string {
  const url = (context.pageUrl ?? context.sourceUrl ?? '').trim();
  if (!url) return '';

  const testId =
    /\/currenttest\b/i.test(url) ? 'currenttest' : /\/testview\b/i.test(url) ? 'testview' : '';
  const questionFromUrl =
    url.match(/[?&](?:questionId|question_id|qid)=([^&]+)/i)?.[1]?.trim().toLowerCase() ?? '';
  const questionNumberFromPath = url.match(/\/(?:question|questions)\/(\d+)/i)?.[1] ?? '';

  return [testId, questionFromUrl || questionNumberFromPath, (context.questionId ?? '').trim().toLowerCase()]
    .filter(Boolean)
    .join(':');
}

export function buildQuestionFingerprint(parts: QuestionFingerprintParts): string {
  return [parts.questionId, parts.stemHash, parts.answerChoiceHash, parts.imageHash, parts.positionKey]
    .filter((part) => part.length > 0)
    .join('|');
}

export function fingerprintPartsFromPageContext(
  context: Pick<
    OrthobulletsPageContext,
    'questionId' | 'stem' | 'answerChoices' | 'images' | 'pageUrl' | 'sourceUrl'
  >
): QuestionFingerprintParts {
  const stem = (context.stem ?? '').trim().toLowerCase();
  const questionId = (context.questionId ?? '').trim() || hashText(stem) || 'unknown-question';
  const imageHash = hashImages(context.images ?? []);
  const positionKey = extractPositionKey(context);
  const unstableQuestionId = !context.questionId?.trim() || questionId === hashText(stem);

  return {
    questionId,
    stemHash: hashText(stem),
    answerChoiceHash: hashAnswerChoices(context.answerChoices ?? []),
    imageHash: imageHash || (unstableQuestionId && (context.images?.length ?? 0) > 0 ? `alt-count:${context.images?.length ?? 0}` : ''),
    positionKey,
  };
}

export function fingerprintFromPageContext(
  context: Pick<
    OrthobulletsPageContext,
    'questionId' | 'stem' | 'answerChoices' | 'images' | 'pageUrl' | 'sourceUrl'
  >
): string {
  return buildQuestionFingerprint(fingerprintPartsFromPageContext(context));
}

export type QuestionRefreshSource = 'automatic' | 'manual';

export type QuestionRefreshDiagnostics = {
  currentFingerprint: string | null;
  previousFingerprint: string | null;
  questionRefreshReason: string | null;
  questionTutorEngaged: boolean;
  hasSelectedAnswer: boolean;
  hasCorrectAnswer: boolean;
  hasExplanation: boolean;
  hasVisibleExplanation: boolean;
  hasVisibleReviewMarker: boolean;
  hasSubmittedAnswerState: boolean;
  inferredQuestionState: InferredQuestionState;
  primaryAction: QuestionTutorPrimaryAction;
  refreshSource: QuestionRefreshSource;
  autoStateBlockedReason: string | null;
  previousQuestionId: string | null;
  newQuestionId: string | null;
  newFingerprint: string | null;
  reasonForRefresh: string;
  refreshTimestamp: string;
};