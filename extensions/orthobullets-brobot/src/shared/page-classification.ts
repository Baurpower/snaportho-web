import type { OrthobulletsPageContext } from './types.js';

export function hasReviewData(context: OrthobulletsPageContext) {
  if (context.mode === 'curriculum_content') return true;
  return Boolean(context.correctAnswerKey ?? context.correctAnswer) || Boolean(context.explanationText ?? context.explanation) || context.percentDistribution.length > 0;
}

export function isUnansweredQuestion(context: OrthobulletsPageContext) {
  if (context.mode !== 'question') return false;
  return (context.pageKind === 'current_test' || context.pageKind === 'question') && !hasReviewData(context) && !context.selectedAnswerKey && !context.selectedAnswer;
}

export function isHintEligible(context: OrthobulletsPageContext) {
  if (context.mode !== 'question') return false;
  return !hasReviewData(context);
}

export function isExplainEligible(context: OrthobulletsPageContext) {
  return context.mode === 'curriculum_content' || hasReviewData(context);
}
