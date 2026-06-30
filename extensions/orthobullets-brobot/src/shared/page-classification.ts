import type { OrthobulletsPageContext } from './types.js';

export function hasReviewData(context: OrthobulletsPageContext) {
  return Boolean(context.correctAnswerKey) || Boolean(context.explanationText) || context.percentDistribution.length > 0;
}

export function isUnansweredQuestion(context: OrthobulletsPageContext) {
  return context.pageKind === 'current_test' && !hasReviewData(context) && !context.selectedAnswerKey;
}

export function isHintEligible(context: OrthobulletsPageContext) {
  return !hasReviewData(context);
}

export function isExplainEligible(context: OrthobulletsPageContext) {
  return hasReviewData(context);
}
