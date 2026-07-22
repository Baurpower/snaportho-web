import { getAnswerRubric } from './answer-rubrics';
import type { BroBotConversationState } from './conversation-state';
import type { BroBotFactoredIntent, BroBotFactoredSetting, BroBotFactoredTask } from './factored-intent';
import type { BroBotInteractionConstraints } from './interaction-constraints';
import { questionSimilarity } from './interaction-constraints';
import type { BroBotChatIntent, BroBotResponseDepth, BroBotTrainingLevel } from './types';
import { AUDIENCE_FACTS, SETTING_FACTS, TASK_PLAN_TEMPLATES } from './answer-plan-templates';

export const BROBOT_ANSWER_PLAN_VERSION = 'answer-plan-v1';
export type BroBotAnswerPlan = {
  version: string;
  task: BroBotFactoredTask;
  setting: BroBotFactoredSetting;
  directAnswerObjective: string;
  decisionPivots: string[];
  requiredFacts: string[];
  evidenceQueries: string[];
  uncertainty: string[];
  optionalSections: string[];
  teachingPoint?: string;
  prohibitedContent: string[];
  requestedFormat: { answerOnly: boolean; concise: boolean; stagedQuiz: boolean; comparison: boolean };
  sources: {
    task: 'factored_intent' | 'interaction_constraint' | 'legacy_fallback';
    setting: 'factored_intent' | 'legacy_fallback';
    format: 'interaction_constraint' | 'response_depth' | 'legacy_fallback';
    facets: 'deterministic_template' | 'legacy_rubric' | 'fallback';
  };
  confidence: number;
};

export type BuildBroBotAnswerPlanInput = {
  message: string;
  factoredIntent: BroBotFactoredIntent;
  interactionConstraints: BroBotInteractionConstraints;
  conversationState: BroBotConversationState;
  legacyIntent: BroBotChatIntent;
  responseDepth: BroBotResponseDepth;
  trainingLevel: BroBotTrainingLevel;
  selectedBranch?: { id?: string; label?: string };
};

const TASKS = new Set(Object.keys(TASK_PLAN_TEMPLATES));
const SETTINGS = new Set(Object.keys(SETTING_FACTS));
const unique = (items: string[]) => [...new Set(items.filter(Boolean))];
const legacyTask = (subintent: string): BroBotFactoredTask => /quiz|trap/.test(subintent) ? 'quiz' : /evidence|research|reference/.test(subintent) ? 'retrieve_evidence' : /compare|brand/.test(subintent) ? 'compare' : /indication|algorithm|treatment/.test(subintent) ? 'decide' : /step|approach|implant|consult/.test(subintent) ? 'plan' : /patient_explanation/.test(subintent) ? 'counsel' : 'explain';
const legacySetting = (mode: string): BroBotFactoredSetting => ({ or_prep: 'or', oite: 'boards', clinic: 'clinic', consult: 'consult', fracture_call: 'consult', research: 'research' } as Record<string, BroBotFactoredSetting>)[mode] ?? 'general';

export function buildBroBotAnswerPlan(input: BuildBroBotAnswerPlanInput): BroBotAnswerPlan {
  const raw = input.factoredIntent as Partial<BroBotFactoredIntent>;
  let task = TASKS.has(String(raw.task)) ? raw.task as BroBotFactoredTask : legacyTask(input.legacyIntent.subintent);
  let setting = SETTINGS.has(String(raw.setting)) ? raw.setting as BroBotFactoredSetting : legacySetting(input.legacyIntent.mode);
  const taskFallback = !TASKS.has(String(raw.task));
  const settingFallback = !SETTINGS.has(String(raw.setting));
  const constraints = input.interactionConstraints;
  if (constraints.stagedQuiz) task = 'quiz';
  else if (constraints.compare) task = 'compare';
  else if (/\bindications?\b/i.test(input.message) && !/\b(articles?|papers?|citations?|references?)\b/i.test(input.message)) task = 'decide';
  const template = TASK_PLAN_TEMPLATES[task];
  const audience = raw.audience && raw.audience in AUDIENCE_FACTS ? raw.audience : input.trainingLevel === 'attending' ? 'attending' : /pgy[45]/.test(input.trainingLevel) ? 'senior_resident' : /pgy[12]/.test(input.trainingLevel) ? 'junior_resident' : 'student';
  const narrowDuration = /\b(how long|duration|operative time|surgical time|time does|time will)\b/i.test(input.message);
  const caseSpecific = raw.patientSpecificity === 'case_specific';
  const selectedLabel = input.selectedBranch?.label ?? '';
  const branchConsistent = Boolean(selectedLabel) && questionSimilarity(input.message, selectedLabel) >= 0.35;
  let requiredFacts = [...template.requiredFacts];
  let pivots = [...template.decisionPivots];
  let optional = [...template.optionalSections];
  const evidence = [...template.evidenceQueries];
  const prohibited = [...template.prohibitedContent];

  if (narrowDuration) {
    requiredFacts = ['expected operative-duration range or variability', 'factors that increase or decrease operative duration'];
    pivots = ['case and procedural complexity affecting duration'];
    optional = ['brief note on preparation factors'];
    prohibited.push('fluoroscopy checklist as the main answer', 'full OR preparation template');
  } else if (setting === 'consult' && !caseSpecific && (task === 'decide' || task === 'explain' || task === 'compare')) {
    // A selected Consult tab is fallback context, not permission to invent a patient case.
    setting = 'general';
  } else if (setting !== 'general') {
    requiredFacts.push(...SETTING_FACTS[setting]);
  }

  if (/posterior malleol/i.test(input.message) && task === 'decide') requiredFacts.push('morphology-based decision factors', 'articular reduction quality', 'incisural or syndesmotic stability');
  if (/\btka\b|total knee/i.test(input.message) && /implant|categor/i.test(input.message)) requiredFacts.push('constraint categories', 'bearing categories', 'fixation categories');
  if (task === 'compare') requiredFacts.push('preferred option by scenario', 'biomechanics and tradeoffs');
  if (constraints.evidenceRequest || raw.evidenceNeed === 'required' || raw.evidenceNeed === 'current' || task === 'retrieve_evidence') evidence.push(raw.evidenceNeed === 'current' || /recent|current|latest/i.test(input.message) ? 'current verified evidence with citations' : 'verified evidence with citations');
  if (raw.urgency === 'emergent') {
    requiredFacts.unshift('immediate escalation and time-critical priorities', 'focused diagnostic or monitoring categories', 'urgent disposition');
    pivots.unshift('findings requiring immediate action');
    optional = [];
  }
  if (constraints.stagedQuiz) {
    requiredFacts.unshift('one question at a time', 'defer explanation until after the learner responds');
    prohibited.push('revealing the answer before the learner responds');
  }
  if (constraints.explicitCorrection || input.conversationState.correctedClaims.length) {
    requiredFacts.unshift('acknowledge the correction and provide a complete corrected answer');
    prohibited.push('superseded claims from prior answers', ...input.conversationState.correctedClaims.map((claim) => `superseded claim: ${claim.originalClaim}`).filter((value) => value.length > 20));
  }
  if (constraints.repeatedQuestion) {
    requiredFacts.unshift('materially different explanation of the concept');
    pivots.unshift('missing dimension or focused clarification');
    prohibited.push('substantially identical prior explanation');
  }
  if (branchConsistent) requiredFacts.push('selected branch focus when consistent with the newest question');
  else if (selectedLabel) prohibited.push('stale selected branch content');
  requiredFacts.push(...(narrowDuration ? AUDIENCE_FACTS[audience].slice(0, 1) : AUDIENCE_FACTS[audience]));

  const concise = constraints.shortAnswer || input.responseDepth === 'quick';
  if (constraints.answerOnly) { optional = []; requiredFacts = requiredFacts.slice(0, 3); pivots = pivots.slice(0, 1); }
  else if (concise) { optional = optional.slice(0, 1); requiredFacts = requiredFacts.slice(0, 7); pivots = pivots.slice(0, 3); }
  else if (input.responseDepth === 'deep') optional.push('expanded complications, alternatives, and edge cases');

  let facets: BroBotAnswerPlan['sources']['facets'] = taskFallback || settingFallback ? 'fallback' : 'deterministic_template';
  if (!requiredFacts.length) {
    const rubric = getAnswerRubric({ mode: input.legacyIntent.mode, subintent: input.legacyIntent.subintent, selectedBranchId: input.selectedBranch?.id, selectedBranchLabel: branchConsistent ? selectedLabel : undefined });
    if (rubric?.length) { requiredFacts = rubric; facets = 'legacy_rubric'; }
  }
  return {
    version: BROBOT_ANSWER_PLAN_VERSION, task, setting,
    directAnswerObjective: narrowDuration ? 'Directly answer the question about operative duration and its variability.' : template.objective,
    decisionPivots: unique(pivots), requiredFacts: unique(requiredFacts), evidenceQueries: unique(evidence),
    uncertainty: unique(template.uncertainty), optionalSections: unique(optional),
    teachingPoint: constraints.answerOnly ? undefined : `${audience.replace('_', ' ')}-appropriate teaching point`,
    prohibitedContent: unique(prohibited),
    requestedFormat: { answerOnly: constraints.answerOnly, concise, stagedQuiz: constraints.stagedQuiz, comparison: constraints.compare || task === 'compare' },
    sources: { task: constraints.stagedQuiz || constraints.compare ? 'interaction_constraint' : taskFallback ? 'legacy_fallback' : 'factored_intent', setting: settingFallback ? 'legacy_fallback' : 'factored_intent', format: constraints.answerOnly || constraints.shortAnswer || constraints.stagedQuiz || constraints.compare ? 'interaction_constraint' : input.responseDepth ? 'response_depth' : 'legacy_fallback', facets },
    confidence: Math.max(0, Math.min(1, Number.isFinite(Number(raw.confidence)) ? Number(raw.confidence) : 0.35)),
  };
}
