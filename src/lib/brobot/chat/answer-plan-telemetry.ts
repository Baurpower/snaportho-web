import type { BroBotAnswerPlannerMode } from '@/lib/brobot/model-config';
import { BROBOT_ANSWER_PLAN_VERSION, type BroBotAnswerPlan } from './answer-plan';
import type { BroBotFactoredIntent } from './factored-intent';
import type { BroBotAnswerPlanValidation } from './answer-plan-validator';

export const BROBOT_ANSWER_PLAN_EVENT = 'brobot_answer_plan_shadow';
export type AnswerPlanTelemetryMetadata = {
  answer_plan_version: string; feature_mode: Exclude<BroBotAnswerPlannerMode, 'off'>;
  factored_setting: string; factored_task: string; factored_audience: string; factored_depth: string;
  factored_evidence_need: string; factored_urgency: string; factored_interaction: string; factored_patient_specificity: string;
  direct_objective_present: boolean; decision_pivot_count: number; required_facet_count: number;
  evidence_query_count: number; uncertainty_count: number; optional_section_count: number; prohibited_content_count: number;
  requested_format: BroBotAnswerPlan['requestedFormat']; plan_sources: BroBotAnswerPlan['sources'];
  validation_warning_codes: BroBotAnswerPlanValidation['warnings']; plan_valid: boolean;
  derivation_latency_ms: number; validation_latency_ms: number; fallback_reason: string | null;
};
const latency = (value: number) => Math.max(0, Math.round(value * 100) / 100);
export function buildAnswerPlanTelemetry(input: { featureMode: Exclude<BroBotAnswerPlannerMode, 'off'>; factoredIntent: BroBotFactoredIntent; plan: BroBotAnswerPlan; validation: BroBotAnswerPlanValidation; derivationLatencyMs: number; validationLatencyMs: number; fallbackReason?: string | null }): AnswerPlanTelemetryMetadata {
  const { factoredIntent: intent, plan } = input;
  return { answer_plan_version: BROBOT_ANSWER_PLAN_VERSION, feature_mode: input.featureMode,
    factored_setting: intent.setting, factored_task: intent.task, factored_audience: intent.audience, factored_depth: intent.depth,
    factored_evidence_need: intent.evidenceNeed, factored_urgency: intent.urgency, factored_interaction: intent.interaction, factored_patient_specificity: intent.patientSpecificity,
    direct_objective_present: Boolean(plan.directAnswerObjective), decision_pivot_count: plan.decisionPivots.length,
    required_facet_count: plan.requiredFacts.length, evidence_query_count: plan.evidenceQueries.length,
    uncertainty_count: plan.uncertainty.length, optional_section_count: plan.optionalSections.length,
    prohibited_content_count: plan.prohibitedContent.length, requested_format: plan.requestedFormat, plan_sources: plan.sources,
    validation_warning_codes: input.validation.warnings, plan_valid: input.validation.valid,
    derivation_latency_ms: latency(input.derivationLatencyMs), validation_latency_ms: latency(input.validationLatencyMs), fallback_reason: input.fallbackReason ?? null };
}
export async function recordAnswerPlanTelemetrySafely(input: { mode: BroBotAnswerPlannerMode; metadata: AnswerPlanTelemetryMetadata; record: (event: { eventType: typeof BROBOT_ANSWER_PLAN_EVENT; metadata: AnswerPlanTelemetryMetadata }) => Promise<void>; log?: (message: string, error: unknown) => void }): Promise<void> {
  if (input.mode === 'off') return;
  try { await input.record({ eventType: BROBOT_ANSWER_PLAN_EVENT, metadata: input.metadata }); }
  catch (error) { input.log?.('[brobot] answer-plan telemetry failed (non-fatal)', error); }
}
