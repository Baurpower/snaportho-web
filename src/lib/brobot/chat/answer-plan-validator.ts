import type { BuildBroBotAnswerPlanInput, BroBotAnswerPlan } from './answer-plan';

export const BROBOT_ANSWER_PLAN_WARNING_CODES = [
  'direct_answer_objective_missing', 'task_structure_mismatch', 'required_facets_missing',
  'decision_pivots_missing', 'evidence_query_missing', 'current_evidence_requirement_missing',
  'staged_quiz_answer_disclosure_risk', 'correction_prohibition_missing',
  'repetition_strategy_missing', 'emergency_priority_missing', 'comparison_structure_missing',
  'concise_plan_overexpanded', 'stale_branch_dominates_plan', 'unsupported_clinical_claim_in_plan',
] as const;
export type BroBotAnswerPlanWarningCode = typeof BROBOT_ANSWER_PLAN_WARNING_CODES[number];
export type BroBotAnswerPlanValidation = { valid: boolean; warnings: BroBotAnswerPlanWarningCode[] };

const includes = (items: string[], pattern: RegExp) => items.some((item) => pattern.test(item));

export function validateBroBotAnswerPlan(plan: BroBotAnswerPlan, input: BuildBroBotAnswerPlanInput): BroBotAnswerPlanValidation {
  const warnings: BroBotAnswerPlanWarningCode[] = [];
  if (!plan.directAnswerObjective.trim()) warnings.push('direct_answer_objective_missing');
  if (!plan.requiredFacts.length) warnings.push('required_facets_missing');
  if (['compare', 'decide', 'plan'].includes(plan.task) && !plan.decisionPivots.length) warnings.push('decision_pivots_missing');
  if (plan.task !== input.factoredIntent.task && !input.interactionConstraints.stagedQuiz && !input.interactionConstraints.evidenceRequest && !input.interactionConstraints.compare && plan.sources.task !== 'legacy_fallback') warnings.push('task_structure_mismatch');
  if ((input.interactionConstraints.evidenceRequest || plan.task === 'retrieve_evidence') && !plan.evidenceQueries.length) warnings.push('evidence_query_missing');
  if (input.factoredIntent.evidenceNeed === 'current' && !includes(plan.evidenceQueries, /current|recent/i)) warnings.push('current_evidence_requirement_missing');
  if (input.interactionConstraints.stagedQuiz && !includes(plan.prohibitedContent, /reveal|disclos/i)) warnings.push('staged_quiz_answer_disclosure_risk');
  if ((input.interactionConstraints.explicitCorrection || input.conversationState.correctedClaims.length > 0) && !includes(plan.prohibitedContent, /superseded|corrected claim/i)) warnings.push('correction_prohibition_missing');
  if (input.interactionConstraints.repeatedQuestion && !includes([...plan.requiredFacts, ...plan.decisionPivots], /different|missing dimension|clarif/i)) warnings.push('repetition_strategy_missing');
  if (input.factoredIntent.urgency === 'emergent' && !includes(plan.requiredFacts, /immediate escalation|time-critical|urgent disposition/i)) warnings.push('emergency_priority_missing');
  if ((input.interactionConstraints.compare || plan.task === 'compare') && (!plan.requestedFormat.comparison || !includes(plan.requiredFacts, /options being compared|preferred option by scenario/i))) warnings.push('comparison_structure_missing');
  if ((plan.requestedFormat.concise || plan.requestedFormat.answerOnly) && (plan.optionalSections.length > (plan.requestedFormat.answerOnly ? 0 : 1) || plan.requiredFacts.length > (plan.requestedFormat.answerOnly ? 3 : 7))) warnings.push('concise_plan_overexpanded');
  if (input.selectedBranch?.label && includes(plan.requiredFacts, /selected branch/) && plan.prohibitedContent.includes('stale selected branch content')) warnings.push('stale_branch_dominates_plan');
  const planCategories = [...plan.requiredFacts, ...plan.evidenceQueries];
  if (includes(planCategories, /\b\d+(?:\.\d+)?\s*(?:mm|cm|degrees?|%|hours?|minutes?)\b|\b(?:pmid|doi):/i)) warnings.push('unsupported_clinical_claim_in_plan');
  return { valid: warnings.length === 0, warnings: [...new Set(warnings)] };
}
