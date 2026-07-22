import type { BroBotInteractionConstraints } from './interaction-constraints';
import { questionSimilarity } from './interaction-constraints';
import { deriveBroBotLatestTurnTask, getBroBotOrPrepTaskContract } from './latest-turn-task';

export type BroBotRelevanceWarning =
  | 'newest_question_not_answered'
  | 'staged_quiz_answer_revealed'
  | 'evidence_request_without_sources'
  | 'correction_not_repaired'
  | 'repeated_answer_not_reframed'
  | 'comparison_not_completed'
  | 'or_prep_task_contract_missing';

export type BroBotRelevanceResult = { passed: boolean; warnings: BroBotRelevanceWarning[] };

export function evaluateBroBotResponseRelevance(input: {
  question: string;
  answer: string;
  constraints: BroBotInteractionConstraints;
  priorAnswer?: string;
  mode?: string;
  subintent?: string;
}): BroBotRelevanceResult {
  const warnings: BroBotRelevanceWarning[] = [];
  const answer = input.answer.trim();
  if (/\b(how long|duration|time does|minutes?|hours?)\b/i.test(input.question) && !/\b\d+(?:\s*[-–]\s*\d+)?\s*(?:minutes?|mins?|hours?|hrs?)\b/i.test(answer)) warnings.push('newest_question_not_answered');
  if (input.constraints.stagedQuiz && /\b(correct answer|answer\s*:|explanation\s*:|why .* (?:correct|wrong))\b/i.test(answer)) warnings.push('staged_quiz_answer_revealed');
  if (input.constraints.evidenceRequest && /\b(search (?:pubmed|google scholar)|use (?:specific )?keywords?|consider searching|search terms?)\b/i.test(answer) && !/(?:https?:\/\/|doi\b|pmid\b|\bet al\.)/i.test(answer)) warnings.push('evidence_request_without_sources');
  if (input.constraints.explicitCorrection && !/\b(you(?:'re| are) (?:right|correct)|i was (?:wrong|incorrect)|correction|corrected)\b/i.test(answer)) warnings.push('correction_not_repaired');
  if (input.constraints.repeatedQuestion && input.priorAnswer && questionSimilarity(input.priorAnswer, answer) >= 0.8) warnings.push('repeated_answer_not_reframed');
  const task = deriveBroBotLatestTurnTask({ message: input.question, constraints: input.constraints });
  if (task.action === 'compare') {
    const comparisonSignals = /\b(?:whereas|compared with|in contrast|advantage|disadvantage|trade-?off|favor|prefer|versus|\bvs\b)\b/i;
    if (!comparisonSignals.test(answer)) warnings.push('comparison_not_completed');
  }
  if (input.mode === 'or_prep') {
    const contract = getBroBotOrPrepTaskContract(task, input.subintent);
    const missing = contract.required.some((requirement) => {
      if (requirement === 'duration_range') return !/\b\d+(?:\s*[-–]\s*\d+)?\s*(?:minutes?|mins?|hours?|hrs?)\b/i.test(answer);
      if (requirement === 'complexity_modifiers') return !/\b(?:complex|modifier|setup|position|revision|comminution|exposure|experience|implant|imaging|tourniquet)\b/i.test(answer);
      if (requirement === 'both_options') return !/\b(?:vs\.?|versus|whereas|both|compared)\b/i.test(answer);
      if (requirement === 'selection_factors') return !/\b(?:choose|choice|select|favor|depends|indication|factor)\b/i.test(answer);
      if (requirement === 'tradeoffs' || requirement === 'failure_modes') return !/\b(?:trade-?off|advantage|disadvantage|risk|failure|pitfall|complication)\b/i.test(answer);
      if (requirement === 'named_structure') return !/\b(?:nerve|artery|vein|tendon|ligament|muscle|capsule|cartilage|physis)\b/i.test(answer);
      if (requirement === 'where_encountered') return !/\b(?:deep|superficial|radial|ulnar|medial|lateral|proximal|distal|beneath|between|interval|layer)\b/i.test(answer);
      if (requirement === 'protection') return !/\b(?:protect|retract|avoid|safe)\b/i.test(answer);
      if (requirement === 'landmarks') return !/\b(?:landmark|incision|portal|position)\b/i.test(answer);
      if (requirement === 'interval' || requirement === 'exposure') return !/\b(?:interval|plane|approach|exposure|corridor)\b/i.test(answer);
      if (requirement === 'decision_point') return !/\b(?:if|when|decision|choose|depends|confirm)\b/i.test(answer);
      if (requirement === 'technical_check') return !/\b(?:check|confirm|fluoro|imaging|stability|alignment)\b/i.test(answer);
      if (requirement === 'pitfall_or_bailout' || requirement === 'extension_or_bailout' || requirement === 'backup') return !/\b(?:pitfall|bailout|backup|extend|avoid|salvage|alternative)\b/i.test(answer);
      return false;
    });
    if (missing) warnings.push('or_prep_task_contract_missing');
  }
  return { passed: warnings.length === 0, warnings };
}
