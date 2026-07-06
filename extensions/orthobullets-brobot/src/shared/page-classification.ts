import type { OrthobulletsPageContext, PageClassification } from './types.js';

const MIN_EDUCATIONAL_TEXT_CHARS = 500;
const MIN_REFERENCES_HEAVY_TEXT_CHARS = 180;
const MIN_REFERENCES_FOR_HEAVY_PAGE = 3;

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

export function getReadableTextLength(context: OrthobulletsPageContext) {
  return (
    context.contentMarkdown?.trim().length ??
    context.contentText?.trim().length ??
    0
  );
}

export function hasValidQuestionStructure(context: OrthobulletsPageContext) {
  const hasStem = Boolean(context.stem?.trim());
  const answerChoiceCount = context.answerChoices.length;
  return hasStem && answerChoiceCount >= 2;
}

export function hasEducationalContent(context: OrthobulletsPageContext) {
  const readableTextLength = getReadableTextLength(context);
  const referencesCount = context.referencesCount ?? context.references?.length ?? 0;
  const referencesHeavy =
    referencesCount >= MIN_REFERENCES_FOR_HEAVY_PAGE &&
    readableTextLength >= MIN_REFERENCES_HEAVY_TEXT_CHARS;

  return readableTextLength >= MIN_EDUCATIONAL_TEXT_CHARS || referencesHeavy;
}

export function classifyPage(context: OrthobulletsPageContext): PageClassification {
  const hasStem = Boolean(context.stem?.trim());
  const answerChoiceCount = context.answerChoices.length;
  const readableTextLength = getReadableTextLength(context);
  const headings = context.sectionHeadings ?? [];
  const referencesCount = context.referencesCount ?? context.references?.length ?? 0;
  const tablesCount = context.tablesCount ?? 0;
  const imagesCount = context.images.length;
  const activeUrl = context.pageUrl ?? context.sourceUrl;
  const title = context.title ?? null;

  const validQuestion = hasValidQuestionStructure(context);
  const educational = hasEducationalContent(context);

  let pageKind: PageClassification['pageKind'];
  let confidence: number;
  let reason: string;

  if (validQuestion && educational) {
    pageKind = 'mixed';
    confidence = 0.82;
    reason = 'Visible question stem and answer choices coexist with substantial educational text.';
  } else if (validQuestion) {
    pageKind = 'question';
    confidence = answerChoiceCount >= 3 ? 0.94 : 0.86;
    reason = 'Detected a question stem with at least two answer choices.';
  } else if (educational) {
    pageKind = 'educational_content';
    if (referencesCount >= MIN_REFERENCES_FOR_HEAVY_PAGE && readableTextLength < MIN_EDUCATIONAL_TEXT_CHARS) {
      confidence = 0.78;
      reason = 'Page is mostly references and citations, but BroBot can still summarize key themes.';
    } else {
      confidence = readableTextLength >= 1200 ? 0.92 : 0.84;
      reason = 'Detected substantial readable educational content without a valid question structure.';
    }
  } else if (hasStem || answerChoiceCount > 0 || readableTextLength > 0) {
    pageKind = 'unreadable';
    confidence = 0.55;
    if (hasStem && answerChoiceCount < 2) {
      reason = 'Could not detect a question: stem visible but fewer than two answer choices.';
    } else if (!hasStem && answerChoiceCount > 0) {
      reason = 'Could not detect a question: answer-like elements without a visible stem.';
    } else if (readableTextLength > 0 && readableTextLength < MIN_REFERENCES_HEAVY_TEXT_CHARS) {
      reason = 'Could not extract enough page text for Explain mode yet.';
    } else {
      reason = 'Page content is partially visible but not enough for Question Tutor or Explain mode.';
    }
  } else {
    pageKind = 'unreadable';
    confidence = 0.9;
    reason = 'No readable question structure or educational text was detected on this page.';
  }

  if (context.mode === 'curriculum_content' && pageKind === 'unreadable' && readableTextLength > 0) {
    pageKind = 'educational_content';
    confidence = 0.72;
    reason = 'Curriculum-style page with limited extracted text; Explain mode may still help.';
  }

  return {
    pageKind,
    confidence,
    reason,
    detected: {
      hasStem,
      answerChoiceCount,
      readableTextLength,
      headings: headings.slice(0, 12),
      referencesCount,
      tablesCount,
      imagesCount,
      activeUrl,
      title,
    },
  };
}

export function isPageUsable(context: OrthobulletsPageContext, options: { forceQuestionMode?: boolean } = {}) {
  const classification = context.classification ?? classifyPage(context);
  if (options.forceQuestionMode) {
    return classification.pageKind === 'question' || classification.pageKind === 'mixed';
  }
  return classification.pageKind !== 'unreadable';
}

export function preferredBrobotMode(context: OrthobulletsPageContext): 'question_tutor' | 'explain_page' {
  const classification = context.classification ?? classifyPage(context);
  if (classification.pageKind === 'educational_content') return 'explain_page';
  if (classification.pageKind === 'mixed') return 'question_tutor';
  if (classification.pageKind === 'question') return 'question_tutor';
  return context.mode === 'curriculum_content' ? 'explain_page' : 'question_tutor';
}

/** @deprecated Use buildCurriculumFollowUpChips(pageContext) for context-aware chips. */
export const CURRICULUM_FOLLOW_UP_PROMPTS = [
  'Teach me like an MS3',
  'What is most testable?',
  'Ask me pimp questions',
  'Make Anki cards',
  'Give me a 60-sec review',
  'Quiz me',
];