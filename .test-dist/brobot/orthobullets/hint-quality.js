"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateOrthobulletsHintDraft = validateOrthobulletsHintDraft;
const DIRECT_ANSWER_LANGUAGE = /\b(?:the\s+)?(?:correct\s+)?answer\s+is\b|\b(?:choose|pick|select)\b/i;
const CONTRAST_LANGUAGE = /\b(?:rather than|more than|less than|compared with|compared to|versus|while|whereas|stronger|weaker|distinguish|separate|combine|combination|relative)\b/i;
const STOP_WORDS = new Set([
    'about', 'after', 'again', 'also', 'among', 'because', 'before', 'being', 'consider',
    'could', 'from', 'have', 'into', 'might', 'patient', 'patients', 'question', 'should',
    'that', 'their', 'these', 'think', 'this', 'those', 'what', 'when', 'which', 'with',
]);
function normalize(value) {
    return value
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
}
function meaningfulTokens(value) {
    return new Set(normalize(value)
        .split(' ')
        .filter((token) => token.length >= 4 && !STOP_WORDS.has(token)));
}
function jaccardSimilarity(left, right) {
    const a = meaningfulTokens(left);
    const b = meaningfulTokens(right);
    if (!a.size || !b.size)
        return 0;
    const intersection = [...a].filter((token) => b.has(token)).length;
    return intersection / (a.size + b.size - intersection);
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function validateOrthobulletsHintDraft(input) {
    const issues = [];
    const visible = `${input.draft.title} ${input.draft.hint}`;
    const normalizedVisible = normalize(visible);
    if (DIRECT_ANSWER_LANGUAGE.test(visible)) {
        issues.push('uses direct answer-selection language');
    }
    for (const choice of input.pageContext.answerChoices) {
        const normalizedChoice = normalize(choice.text);
        if (normalizedChoice.length >= 10 && normalizedVisible.includes(normalizedChoice)) {
            issues.push(`reproduces complete answer choice ${choice.key ?? ''}`.trim());
            break;
        }
        if (choice.key) {
            const key = escapeRegExp(choice.key);
            if (new RegExp(`\\b(?:choice|option|answer)\\s*#?\\s*${key}\\b`, 'i').test(visible)) {
                issues.push('reveals an answer-choice key');
                break;
            }
        }
    }
    for (const prior of input.priorHints) {
        if (normalize(input.draft.title) === normalize(prior.title)) {
            issues.push(`repeats the title of Hint ${prior.hintLevel}`);
        }
        if (jaccardSimilarity(input.draft.hint, prior.hint) >= 0.62) {
            issues.push(`substantially repeats Hint ${prior.hintLevel}`);
        }
    }
    if (input.hintLevel === 2 && !CONTRAST_LANGUAGE.test(input.draft.hint)) {
        issues.push('Hint 2 does not explicitly contrast stronger and weaker paths');
    }
    return [...new Set(issues)];
}
