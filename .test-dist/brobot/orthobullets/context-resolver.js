"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveOrthobulletsContext = resolveOrthobulletsContext;
function dedupe(values) {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
function inferChoiceKey(choice, index) {
    if (choice.key)
        return choice.key;
    const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return alpha[index] ?? String(index + 1);
}
function resolveOrthobulletsContext(input) {
    const pageContext = {
        ...input.pageContext,
        breadcrumbs: dedupe(input.pageContext.breadcrumbs),
        authors: dedupe(input.pageContext.authors ?? []),
        sectionHeadings: dedupe(input.pageContext.sectionHeadings ?? []),
        references: dedupe(input.pageContext.references ?? []).slice(0, 40),
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
        if (!pageContext.contentText)
            warnings.push('curriculum_content_not_visible');
    }
    else {
        if (!pageContext.stem)
            warnings.push('stem_not_visible');
        if (pageContext.answerChoices.length === 0)
            warnings.push('answer_choices_not_visible');
        if (!pageContext.explanationText && !pageContext.explanation)
            warnings.push('explanation_not_visible');
        if (!pageContext.questionId)
            warnings.push('question_id_not_visible');
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
