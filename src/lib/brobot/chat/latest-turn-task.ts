import type { BroBotInteractionConstraints } from './interaction-constraints';

export type BroBotLatestTurnAction =
  | 'explain'
  | 'compare'
  | 'list'
  | 'estimate_duration'
  | 'retrieve_articles'
  | 'quiz'
  | 'correct_prior_answer'
  | 'continue';

export type BroBotLatestTurnTask = {
  action: BroBotLatestTurnAction;
  topic: string;
  requestedFormat?: string;
  interactionContract: 'answer' | 'one_question_at_a_time' | 'clarify';
  mustAnswer: string[];
  mustNotSubstitute: string[];
};

const compact = (value: string) => value.replace(/\s+/g, ' ').trim();

export function deriveBroBotLatestTurnTask(input: {
  message: string;
  topic?: string;
  constraints: BroBotInteractionConstraints;
}): BroBotLatestTurnTask {
  const message = compact(input.message);
  let action: BroBotLatestTurnAction = 'explain';
  if (input.constraints.explicitCorrection) action = 'correct_prior_answer';
  else if (input.constraints.stagedQuiz || /\bquiz me|test me\b/i.test(message)) action = 'quiz';
  else if (input.constraints.evidenceRequest && /\b(?:give|find|show|cite|list|recommend)\b.{0,30}\b(?:articles?|papers?|references?|citations?)\b/i.test(message)) action = 'retrieve_articles';
  else if (/\b(?:how long|duration|operative time|surgical time|time does|time should)\b/i.test(message)) action = 'estimate_duration';
  else if (input.constraints.compare) action = 'compare';
  else if (/^(?:list|name|what are)\b/i.test(message)) action = 'list';
  else if (/^(?:continue|go on|next|more)\b/i.test(message)) action = 'continue';

  const mustAnswer: string[] = [];
  const mustNotSubstitute: string[] = [];
  if (action === 'estimate_duration') {
    mustAnswer.push('a practical duration range', 'the main factors that change the estimate');
    mustNotSubstitute.push('operative steps', 'a fluoroscopy checklist', 'a generic procedure overview');
  } else if (action === 'retrieve_articles') {
    mustAnswer.push('actual verifiable references when retrieval is available, otherwise an explicit retrieval limitation');
    mustNotSubstitute.push('generic search advice presented as the answer', 'invented citations');
  } else if (action === 'quiz') {
    mustAnswer.push(input.constraints.stagedQuiz ? 'exactly one question without its answer' : 'the requested quiz format');
    mustNotSubstitute.push('revealing answers before the learner responds');
  } else if (action === 'correct_prior_answer') {
    mustAnswer.push('the specific corrected claim', 'a complete replacement answer');
    mustNotSubstitute.push('the superseded claim', 'a vague acknowledgment without repair');
  } else if (action === 'compare') {
    mustAnswer.push('both named alternatives', 'shared decision-relevant comparison criteria', 'the factors that favor each option');
    mustNotSubstitute.push('two disconnected summaries', 'a generic topic overview');
  } else if (action === 'list') {
    mustAnswer.push('the requested items directly');
    mustNotSubstitute.push('an unrelated framework');
  } else if (action === 'continue') {
    mustAnswer.push('the next unresolved point without repeating prior material');
    mustNotSubstitute.push('a restart of the prior answer');
  } else {
    mustAnswer.push('the exact question in the opening sentence or bullet');
    mustNotSubstitute.push('stale branch metadata', 'an earlier question from the conversation');
  }

  const requestedFormat = input.constraints.shortAnswer ? 'short answer' : input.constraints.answerOnly ? 'answer only' : undefined;
  return {
    action,
    topic: compact(input.topic || message).slice(0, 160),
    requestedFormat,
    interactionContract: input.constraints.stagedQuiz ? 'one_question_at_a_time' : 'answer',
    mustAnswer,
    mustNotSubstitute,
  };
}

export function formatLatestTurnTaskForPrompt(task: BroBotLatestTurnTask): string {
  return [
    'LATEST USER TASK (highest priority)',
    `- Requested action: ${task.action}`,
    `- Topic: ${task.topic}`,
    `- Interaction contract: ${task.interactionContract}`,
    task.requestedFormat ? `- Requested format: ${task.requestedFormat}` : '',
    '- Must answer:',
    ...task.mustAnswer.map((item) => `  - ${item}`),
    '- Do not substitute:',
    ...task.mustNotSubstitute.map((item) => `  - ${item}`),
    '- The opening sentence or bullet must perform the requested action. History may resolve context but may not replace this task.',
  ].filter(Boolean).join('\n');
}

export type BroBotOrPrepTaskContract = {
  required: string[];
  prohibited: string[];
};

export function getBroBotOrPrepTaskContract(task: BroBotLatestTurnTask, subintent?: string): BroBotOrPrepTaskContract {
  if (task.action === 'estimate_duration') return { required: ['duration_range', 'complexity_modifiers'], prohibited: ['generic_full_or_template'] };
  if (task.action === 'compare') return { required: ['both_options', 'selection_factors', 'tradeoffs', 'failure_modes'], prohibited: ['generic_full_or_template'] };
  if (subintent === 'anatomy_at_risk') return { required: ['named_structure', 'where_encountered', 'protection'], prohibited: [] };
  if (subintent === 'surgical_approach') return { required: ['landmarks', 'interval', 'named_structure', 'extension_or_bailout'], prohibited: [] };
  if (subintent === 'implant_options' || subintent === 'brand_comparison') return { required: ['options', 'selection_factors', 'tradeoffs', 'backup'], prohibited: [] };
  if (subintent === 'attending_questions') return { required: ['case_specific_decisions', 'preferences', 'backup'], prohibited: [] };
  return { required: ['operative_objective', 'exposure', 'named_structure', 'decision_point', 'technical_check', 'pitfall_or_bailout'], prohibited: [] };
}

export function formatOrPrepTaskContractForPrompt(contract: BroBotOrPrepTaskContract): string {
  return [
    'OR PREP TASK CONTRACT',
    `- Required for this specific request: ${contract.required.join(', ')}`,
    contract.prohibited.length ? `- Do not pad this answer with: ${contract.prohibited.join(', ')}` : '',
    '- Include only task-relevant operative content; do not force every OR Prep section into a narrow answer.',
  ].filter(Boolean).join('\n');
}
