import type { BroBotEntityResolution, BroBotResponseTier } from './types';

export type BroBotCriticalRevisionWarning =
  | 'answer_does_not_address_question'
  | 'unresolved_abbreviation_ambiguity'
  | 'urgent_escalation_guidance_missing'
  | 'laterality_mismatch'
  | 'procedure_mismatch';

export function runTierAwareAnswerIntegrityChecks(input: {
  tier: BroBotResponseTier;
  question: string;
  answer: string;
  entityResolution: BroBotEntityResolution;
}): BroBotCriticalRevisionWarning[] {
  const warnings: BroBotCriticalRevisionWarning[] = [];
  const question = input.question.toLowerCase();
  const answer = input.answer.toLowerCase();

  if (input.entityResolution.state === 'ambiguous' && !/clarif|which|do you mean/.test(answer)) {
    warnings.push('unresolved_abbreviation_ambiguity');
  }
  const urgent = /\b(pulseless|neurovascular compromise|compartment syndrome|open fracture|septic joint|cauda equina)\b/.test(question);
  if (urgent && !/\b(emerg|urgent|immediate|escalat|attending|senior|operating room|or\b)/.test(answer)) {
    warnings.push('urgent_escalation_guidance_missing');
  }
  if (/\bleft\b/.test(question) && /\bright\b/.test(answer) && !/left/.test(answer)) {
    warnings.push('laterality_mismatch');
  }
  if (/\bright\b/.test(question) && /\bleft\b/.test(answer) && !/right/.test(answer)) {
    warnings.push('laterality_mismatch');
  }
  const resolvedAbbreviations = input.entityResolution.entities.map((entity) => entity.abbreviation.toLowerCase());
  if (
    resolvedAbbreviations.length > 0 &&
    !resolvedAbbreviations.some((abbreviation) => answer.includes(abbreviation)) &&
    !input.entityResolution.entities.some((entity) => answer.includes(entity.expansion.toLowerCase()))
  ) {
    warnings.push('procedure_mismatch');
  }
  if (input.tier >= 2) {
    const meaningfulQuestionTerms = question
      .split(/[^a-z0-9]+/)
      .filter((term) => term.length >= 5 && !['what', 'which', 'should', 'about'].includes(term));
    if (meaningfulQuestionTerms.length > 0 && !meaningfulQuestionTerms.some((term) => answer.includes(term))) {
      warnings.push('answer_does_not_address_question');
    }
  }
  return [...new Set(warnings)];
}
