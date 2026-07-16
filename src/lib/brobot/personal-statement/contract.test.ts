import assert from 'node:assert/strict';
import {
  countWords,
  hashStatement,
  normalizeStatementText,
  parseAndVerifyReview,
  validateStatementLength,
} from './contract';

const normalized = normalizeStatementText('  First   paragraph.\r\n\r\n\r\n Second\tparagraph.  ');
assert.equal(normalized, 'First paragraph.\n\nSecond paragraph.');
assert.equal(countWords(normalized), 4);
assert.equal(hashStatement('One  two\r\n\r\nthree'), hashStatement('One two\n\nthree'));
assert.equal(validateStatementLength('short statement').ok, false);
assert.equal(validateStatementLength(Array.from({ length: 150 }, () => 'word').join(' ')).ok, true);
assert.equal(validateStatementLength(Array.from({ length: 1501 }, () => 'word').join(' ')).ok, false);

const reviewFinding = (verifiedQuote: string | null) => ({ id: 'finding-1', title: 'Generic opening', explanation: 'The opening is broad.', confidence: 'broadly_applicable', verifiedQuote, paragraphNumber: 1, tradeoff: 'Clarity versus voice.', whatToPreserve: 'The core message.', revisionPrinciple: 'Use a concrete moment.' });
const aiFinding = (excerpt: string) => ({ id: `ai-${excerpt}`, patternLabel: 'Excessive polish', evidenceExcerpts: [excerpt], category: 'excessive_polish', severity: 'worth_reviewing', detectedCount: 1, metric: 'Detected once', repetition: 'isolated', whyAssociatedWithAi: 'Balanced resolutions are common in assistant-polished prose.', readerReaction: 'This may feel too neatly resolved.', authenticCounterbalance: 'The underlying experience remains personal.', recommendation: 'Keep the experience and state the insight more plainly.' });
const assessment = { level: 'worth_reviewing', explanation: 'Some patterned language.' };
const lens = { likelyReaction: 'A credible but familiar draft.', strengths: ['Clear message.'], concerns: ['Familiar language.'], overallRead: 'mixed' };
const review = {
  version: '3.1.0', promptVersion: 'ps-review-3.1.0',
  overview: { authenticityConclusion: 'mixed_personal_and_machine_polished', writingPatternConcern: 'worth_reviewing', distinctiveness: 'mixed', evidenceStrength: 'mixed', themeClarity: 'generally_strong', reviewerRisk: 'mixed', readiness: 'mixed', coreMessage: 'Reliability through action.', strongestElement: 'A concrete example.', biggestConcern: 'Polished abstraction.', reviewerPreferenceWarning: 'Narrative and traditional readers may differ.' },
  aiLikeWriting: { disclaimer: 'This review identifies style patterns, not authorship. It cannot determine whether AI was used.', overallSummary: 'One polished pattern is worth reviewing.', categories: { emDashOveruse: assessment, aiNarrativeArc: assessment, repeatedReflectionLanguage: assessment, tedTalkCadence: assessment, sentenceUniformity: assessment, threePartLists: assessment, contrastStructures: assessment, excessivePolish: assessment, abstractVirtueDensity: assessment, consultantLanguage: assessment, marketingLanguage: assessment, genericOrthopaedicPatterns: assessment, overlyCleanChronology: assessment, voiceHomogeneity: assessment }, findings: [aiFinding('exact source words'), aiFinding('invented quotation')] },
  authenticStrengths: [reviewFinding('exact source words')], broadlyApplicableFindings: [reviewFinding('invented quotation')],
  preferenceDependentFindings: [{ id: 'pref-1', topic: 'Vulnerability', traditionalReviewerReaction: 'May prefer restraint.', narrativeReviewerReaction: 'May value openness.', tradeoff: 'Memorability versus risk.', recommendation: 'Keep the fact and trim interpretation.' }],
  themeAnalysis: { primaryThemes: ['Reliability'], repeatedThemes: [], unclearThemes: [], claimedQualities: [], demonstratedQualities: [] },
  genericLanguage: { phrases: [], familiarNarratives: [], overallDistinctiveness: 'mixed' },
  reviewerLenses: { balanced: lens, traditional: lens, narrativeFocused: lens, skepticalProgramDirector: lens },
  revisionPriorities: [1,2,3].map((rank) => ({ rank, title: `Priority ${rank}`, whyItMatters: 'It improves credibility.', tradeoff: 'Do not remove the voice.', action: 'Add a concrete action.', preserve: 'Keep the central message.' })),
  coachingPrompts: [{ target: 'Opening', explanation: 'The opening is abstract.', questions: ['What happened?'], strategies: ['Name one action.'], goal: 'Add specificity.', restrainedExample: null, factBoundary: 'Use only the stated experience.' }],
};
const verified = parseAndVerifyReview(review, 'These are the exact source words from the statement.');
assert.deepEqual(verified.aiLikeWriting.findings[0].evidenceExcerpts, ['exact source words']);
assert.equal(verified.aiLikeWriting.findings.length, 1);
assert.equal(verified.broadlyApplicableFindings[0].verifiedQuote, null);
assert.match(verified.broadlyApplicableFindings[0].explanation, /paraphrased concern/);

console.log('personal statement contract tests passed');
