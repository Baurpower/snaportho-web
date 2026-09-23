import {
  buildQuestionSourceIdentity,
  isQuestionSourceIdentityV1,
  type QuestionReviewCaptureState,
  type QuestionSourceIdentityV1,
  type QuestionSourceProvider,
} from './question-source-identity.js';
import type { OrthobulletsPageContext } from './types.js';

export type ExtractedQuestion = {
  provider: QuestionSourceProvider;
  pageKind: string;
  nativeQuestionId: string | null;
  hasStem: boolean;
  choiceCount: number;
  imageCount: number;
};

export type ReviewOutcome = {
  reviewState: QuestionReviewCaptureState;
  selectedAnswerKey: string | null;
  correctAnswerKey: string | null;
  correct: boolean | null;
  explanationAvailable: boolean;
};

export type SourceContext = {
  pageUrl: string;
  sourceUrl: string;
  topicId: string | null;
  hierarchy: string[];
  testId: string | null;
  chapterId: string | null;
  assessmentDefinitionId: string | null;
  assessmentType: 'pretest' | 'posttest' | null;
};

export type QuestionSourceAdapter = {
  readonly provider: QuestionSourceProvider;
  extractQuestion(): ExtractedQuestion;
  extractReviewOutcome(): ReviewOutcome | null;
  stableIdentity(): QuestionSourceIdentityV1;
  context(): SourceContext;
};

function adapterProvider(page: OrthobulletsPageContext): QuestionSourceProvider {
  return page.provider === 'orthobullets' ? 'orthobullets' : 'rock_himalaya';
}

function searchParam(url: string, key: string): string | null {
  try {
    return new URL(url).searchParams.get(key);
  } catch {
    return url.match(new RegExp(`[?&]${key}=([^&]+)`, 'i'))?.[1] ?? null;
  }
}

export function parseSourceHierarchy(pageUrl: string): Pick<
  SourceContext,
  'testId' | 'chapterId' | 'assessmentDefinitionId' | 'assessmentType'
> {
  const path = pageUrl.toLowerCase();
  const typeParam = (searchParam(pageUrl, 'type') ?? '').toLowerCase();
  const assessmentType = /pretest/.test(`${path} ${typeParam}`)
    ? 'pretest'
    : /posttest/.test(`${path} ${typeParam}`)
      ? 'posttest'
      : null;
  return {
    testId: searchParam(pageUrl, 'test') ?? searchParam(pageUrl, 'testId'),
    chapterId: searchParam(pageUrl, 'chapterId') ?? searchParam(pageUrl, 'id'),
    assessmentDefinitionId: searchParam(pageUrl, 'did'),
    assessmentType,
  };
}

export function readAttachedIdentity(page: OrthobulletsPageContext): QuestionSourceIdentityV1 | null {
  const attached = page.raw?.providerSpecific?.sourceIdentity;
  return isQuestionSourceIdentityV1(attached) ? attached : null;
}

export function detectSourceFingerprintDrift(previousHash: string, currentHash: string): boolean {
  return previousHash !== currentHash;
}

export function createQuestionSourceAdapter(page: OrthobulletsPageContext): QuestionSourceAdapter {
  const provider = adapterProvider(page);
  const stableIdentity = (): QuestionSourceIdentityV1 => {
    const attached = readAttachedIdentity(page);
    if (attached) return attached;
    const specific = page.raw?.providerSpecific ?? {};
    return buildQuestionSourceIdentity({
      provider,
      pageRole: page.pageKind === 'test_results' ? 'results' : 'question',
      definitionId: page.questionId,
      attemptId: typeof specific.questionAttemptId === 'number' || typeof specific.questionAttemptId === 'string'
        ? specific.questionAttemptId
        : null,
      stem: page.stem,
      choices: page.answerChoices,
      reviewVisible: page.pageKind === 'review' || Boolean(page.explanationText) || Boolean(page.correctAnswerKey),
      correct: page.selectedAnswerKey && page.correctAnswerKey
        ? page.selectedAnswerKey === page.correctAnswerKey
        : null,
    });
  };

  return {
    provider,
    extractQuestion(): ExtractedQuestion {
      const identity = stableIdentity();
      return {
        provider,
        pageKind: String(page.pageKind),
        nativeQuestionId: identity.nativeQuestionId,
        hasStem: Boolean(page.stem && page.stem.length > 0),
        choiceCount: page.answerChoices.length,
        imageCount: page.images.length,
      };
    },
    extractReviewOutcome(): ReviewOutcome | null {
      const identity = stableIdentity();
      if (identity.reviewState !== 'answered_review') return null;
      return {
        reviewState: identity.reviewState,
        selectedAnswerKey: page.selectedAnswerKey ?? null,
        correctAnswerKey: page.correctAnswerKey ?? null,
        correct: identity.correct,
        explanationAvailable: Boolean(page.explanationText),
      };
    },
    stableIdentity,
    context(): SourceContext {
      const hierarchy = parseSourceHierarchy(page.pageUrl);
      const specific = page.raw?.providerSpecific ?? {};
      return {
        pageUrl: page.pageUrl,
        sourceUrl: page.sourceUrl,
        topicId: page.topicId ?? null,
        hierarchy: page.breadcrumbs ?? [],
        testId: page.testReview?.testId ?? hierarchy.testId,
        chapterId: typeof specific.chapterId === 'string' ? specific.chapterId : hierarchy.chapterId,
        assessmentDefinitionId: typeof specific.assessmentDefinitionId === 'string'
          ? specific.assessmentDefinitionId
          : hierarchy.assessmentDefinitionId,
        assessmentType: specific.assessmentType === 'pretest' || specific.assessmentType === 'posttest'
          ? specific.assessmentType
          : hierarchy.assessmentType,
      };
    },
  };
}
