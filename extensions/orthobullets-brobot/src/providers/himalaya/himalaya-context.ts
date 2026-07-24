// Builds OrthobulletsPageContext from te6 API data.
//
// This mirrors the DOM extractor's output contract exactly so the side panel,
// prompt builders, and backend see no difference between the two paths — only
// `debug.extractorVersion` and `raw.providerSpecific.source` reveal which ran.

import { hashText } from '../../shared/question-fingerprint.js';
import type { OrthobulletsPageContext } from '../../shared/types.js';
import type { HimalayaApiQuestion } from './himalaya-api.js';
import { HIMALAYA_API_VERSION } from './himalaya-api.js';
import type { HimalayaBridgeState } from './himalaya-te6-types.js';

export type HimalayaReviewBoardEntry = {
  questionAttemptId: number;
  questionNumber: number | null;
  isCorrect: boolean | null;
  stemPreview: string;
  selectedAnswer: string | null;
  correctAnswer: string | null;
  hasExplanation: boolean;
};

export function buildHimalayaFingerprint(question: HimalayaApiQuestion) {
  return `himalaya:${hashText(
    JSON.stringify({
      questionAttemptId: question.questionAttemptId,
      stem: question.stem.toLowerCase(),
      choices: question.choices.map((choice) => `${choice.label}:${choice.text.toLowerCase()}`),
    })
  )}`;
}

/**
 * Compact per-question rows for the results board. Deliberately excludes
 * explanation bodies so the overview stays cheap to render and to transport.
 */
export function buildHimalayaReviewBoard(questions: HimalayaApiQuestion[]): HimalayaReviewBoardEntry[] {
  return questions.map((question) => {
    const selected = question.choices.find((choice) => choice.selected);
    const correct = question.choices.find((choice) => choice.correct === true);
    return {
      questionAttemptId: question.questionAttemptId,
      questionNumber: question.questionNumber,
      isCorrect: question.isCorrect,
      stemPreview: question.stem.replace(/\s+/g, ' ').slice(0, 180),
      selectedAnswer: selected ? `${selected.label}. ${selected.text}` : null,
      correctAnswer: correct ? `${correct.label}. ${correct.text}` : null,
      hasExplanation: Boolean(question.explanation),
    };
  });
}

export function buildHimalayaApiPageContext(input: {
  question: HimalayaApiQuestion;
  bridgeState: HimalayaBridgeState | null;
  allQuestions: HimalayaApiQuestion[];
  pageUrl: string;
  documentTitle?: string | null;
}): OrthobulletsPageContext {
  const { question, bridgeState, pageUrl } = input;
  const isReview = question.reviewAvailable;
  const selected = question.choices.find((choice) => choice.selected);
  const correct = question.choices.find((choice) => choice.correct === true);
  const explanation = question.explanation;
  const fingerprint = buildHimalayaFingerprint(question);
  const totalQuestions = bridgeState?.openModal?.total
    ?? bridgeState?.liveQuestion?.totalQuestions
    ?? (input.allQuestions.length || null);

  return {
    source: 'himalaya',
    provider: 'himalaya',
    mode: 'question',
    pageUrl,
    sourceUrl: pageUrl,
    pageKind: isReview ? 'review' : 'current_test',
    supportedPageKind: isReview ? 'rock_himalaya_review' : 'rock_himalaya_question',
    questionId: String(question.questionAttemptId),
    title: bridgeState?.assessmentTitle ?? input.documentTitle ?? 'AAOS Himalaya assessment',
    breadcrumbs: ['AAOS', 'Himalaya Assessment'],
    stem: question.stem,
    answerChoices: question.choices.map((choice) => ({
      key: choice.id,
      label: choice.label ?? choice.id,
      text: choice.text,
      isSelected: choice.selected,
      isCorrect: choice.correct ?? null,
    })),
    selectedAnswerKey: selected?.id ?? null,
    correctAnswerKey: correct?.id ?? null,
    selectedAnswer: selected?.text ?? null,
    correctAnswer: correct?.text ?? null,
    percentDistribution: [],
    explanationText: explanation ?? null,
    explanation: explanation ?? null,
    sourceExplanation: explanation ?? null,
    sourceKeyPoints: question.keyReferencePoints ?? null,
    sourceReferences: question.references ?? null,
    references: question.references ? [question.references] : [],
    referencesCount: question.references ? 1 : 0,
    linkedConcepts: [],
    images: question.images.map((image) => ({
      src: image.src,
      alt: image.alt ?? undefined,
      caption: image.caption ?? undefined,
    })),
    raw: {
      providerSpecific: {
        adapter: 'himalaya',
        source: 'te6-api',
        pageMode: isReview ? 'reviewed-question' : 'active-question',
        reviewState: isReview ? 'answered_review' : selected ? 'selected' : 'unanswered',
        fingerprint,
        questionAttemptId: question.questionAttemptId,
        testAttemptId: bridgeState?.testAttemptId ?? null,
        assessmentTitle: bridgeState?.assessmentTitle ?? null,
        questionNumber: question.questionNumber != null ? String(question.questionNumber) : null,
        totalQuestions: totalQuestions != null ? String(totalQuestions) : null,
        questionType: question.type,
        tags: question.tags,
        averagePeerPercent: question.averagePeerPercent,
        additionalFeedback: question.additionalFeedback,
        sourceMaterial: {
          explanation: explanation ?? null,
          keyReferencePoints: question.keyReferencePoints ?? null,
          references: question.references ?? null,
        },
        reviewBoard: buildHimalayaReviewBoard(input.allQuestions),
        attemptScore: bridgeState?.score ?? null,
        attemptMaxScore: bridgeState?.maxScore ?? null,
      },
    },
    extractionWarnings: [
      !selected ? 'selected_answer_not_visible' : '',
      !correct && isReview ? 'correct_answer_not_visible' : '',
      !explanation && isReview ? 'explanation_not_visible' : '',
      !question.references && isReview ? 'references_not_visible' : '',
    ].filter(Boolean),
    questionReviewSignals: {
      hasVisibleExplanation: Boolean(explanation),
      hasVisibleReviewMarker: isReview,
      hasSubmittedAnswerState: isReview,
      visibleUnansweredPrompt: !isReview && !selected,
      unansweredOverrideApplied: false,
      reviewScore: isReview ? 3 : 0,
      unansweredScore: !isReview && !selected ? 3 : 0,
      reviewEvidence: [
        explanation ? 'te6_api_feedback' : '',
        question.references ? 'te6_api_reference' : '',
        isReview ? 'te6_api_show_correct_answer' : '',
      ].filter(Boolean),
      unansweredEvidence: !isReview && !selected ? ['te6_api_no_remediation', 'te6_api_no_selection'] : [],
      visiblePreferredResponseActive: Boolean(explanation),
      visiblePreferredResponseEnabled: Boolean(explanation),
      visibleExplanationTextLength: explanation?.length ?? 0,
      visibleSelectedAnswerReviewClass: Boolean(selected),
      visibleCorrectAnswerReviewClass: Boolean(correct),
      visibleDistributionRows: 0,
    },
    classification: {
      pageKind: 'question',
      confidence: 0.99,
      reason: 'Loaded directly from the AAOS te6 assessment API.',
      detected: {
        hasStem: true,
        answerChoiceCount: question.choices.length,
        readableTextLength: question.stem.length + (explanation?.length ?? 0),
        headings: ['AAOS Himalaya Assessment'],
        referencesCount: question.references ? 1 : 0,
        tablesCount: 0,
        imagesCount: question.images.length,
        activeUrl: pageUrl,
        title: bridgeState?.assessmentTitle ?? input.documentTitle ?? null,
      },
    },
    debug: {
      matchedSelectors: { himalayaSource: ['te6-api'] },
      extractorVersion: HIMALAYA_API_VERSION,
    },
  };
}

/**
 * Results page with no question open: an empty-state context that carries the
 * review board so the panel can render the overview without opening anything.
 */
export function buildHimalayaOverviewContext(input: {
  bridgeState: HimalayaBridgeState | null;
  allQuestions: HimalayaApiQuestion[];
  pageUrl: string;
  documentTitle?: string | null;
}): OrthobulletsPageContext {
  const board = buildHimalayaReviewBoard(input.allQuestions);
  const missedCount = board.filter((entry) => entry.isCorrect === false).length;

  return {
    source: 'himalaya',
    provider: 'himalaya',
    mode: 'curriculum_content',
    pageUrl: input.pageUrl,
    sourceUrl: input.pageUrl,
    pageKind: 'results-overview',
    title: input.bridgeState?.assessmentTitle ?? input.documentTitle ?? 'AAOS Himalaya results',
    breadcrumbs: ['AAOS', 'Himalaya Assessment'],
    contentText: null,
    contentMarkdown: null,
    answerChoices: [],
    percentDistribution: [],
    linkedConcepts: [],
    images: [],
    questionCount: board.length,
    extractionWarnings: board.length ? [] : ['himalaya_results_overview_no_active_question'],
    raw: {
      providerSpecific: {
        adapter: 'himalaya',
        source: 'te6-api',
        pageMode: 'results-overview',
        testAttemptId: input.bridgeState?.testAttemptId ?? null,
        assessmentTitle: input.bridgeState?.assessmentTitle ?? null,
        attemptScore: input.bridgeState?.score ?? null,
        attemptMaxScore: input.bridgeState?.maxScore ?? null,
        missedCount,
        reviewBoard: board,
      },
    },
    classification: {
      pageKind: board.length ? 'mixed' : 'unreadable',
      confidence: board.length ? 0.95 : 0.9,
      reason: board.length
        ? `Loaded ${board.length} questions from the AAOS te6 assessment API.`
        : 'Select a question to review it with BroBot.',
      detected: {
        hasStem: false,
        answerChoiceCount: 0,
        readableTextLength: 0,
        headings: ['Results', 'Questions'],
        referencesCount: 0,
        tablesCount: 0,
        imagesCount: 0,
        activeUrl: input.pageUrl,
        title: input.bridgeState?.assessmentTitle ?? input.documentTitle ?? null,
      },
    },
    debug: {
      matchedSelectors: { himalayaSource: ['te6-api'] },
      extractorVersion: HIMALAYA_API_VERSION,
    },
  };
}
