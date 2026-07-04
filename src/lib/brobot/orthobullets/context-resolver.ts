import type {
  OrthobulletsKgLookupResult,
  OrthobulletsPageContext,
} from './types';

type ResolvedOrthobulletsContext = {
  pageContext: OrthobulletsPageContext;
  kgLookup: OrthobulletsKgLookupResult | null;
  warnings: string[];
};

function dedupe(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function inferChoiceKey(choice: OrthobulletsPageContext['answerChoices'][number], index: number) {
  if (choice.key) return choice.key;
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return alpha[index] ?? String(index + 1);
}

export function resolveOrthobulletsContext(input: {
  pageContext: OrthobulletsPageContext;
  kgLookup: OrthobulletsKgLookupResult | null;
}): ResolvedOrthobulletsContext {
  const pageContext: OrthobulletsPageContext = {
    ...input.pageContext,
    breadcrumbs: dedupe(input.pageContext.breadcrumbs),
    authors: dedupe(input.pageContext.authors ?? []),
    sectionHeadings: dedupe(input.pageContext.sectionHeadings ?? []),
    contentSections: (input.pageContext.contentSections ?? []).slice(0, 20),
    linkedConcepts: input.pageContext.linkedConcepts.slice(0, 10),
    images: input.pageContext.images.slice(0, 8),
    answerChoices: input.pageContext.answerChoices.map((choice, index) => ({
      ...choice,
      key: inferChoiceKey(choice, index),
    })),
  };

  const warnings = [...pageContext.extractionWarnings];

  if (pageContext.mode === 'curriculum_content') {
    if (!pageContext.contentText) warnings.push('curriculum_content_not_visible');
  } else {
    if (!pageContext.stem) warnings.push('stem_not_visible');
    if (pageContext.answerChoices.length === 0) warnings.push('answer_choices_not_visible');
    if (!pageContext.explanationText && !pageContext.explanation) warnings.push('explanation_not_visible');
    if (!pageContext.questionId) warnings.push('question_id_not_visible');
  }

  return {
    pageContext: {
      ...pageContext,
      extractionWarnings: dedupe(warnings),
    },
    kgLookup: input.kgLookup,
    warnings: dedupe(warnings),
  };
}

export type { ResolvedOrthobulletsContext };
