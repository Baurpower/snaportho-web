import type { BroBotFactoredIntent } from './factored-intent';
import { BROBOT_FACTORED_INTENT_VERSION, mapFactoredIntentToLegacy } from './factored-intent';
import type { BroBotFactoredIntentMode } from '@/lib/brobot/model-config';

export const BROBOT_FACTORED_INTENT_EVENT = 'brobot_factored_intent_shadow';

export type FactoredIntentTelemetryMetadata = {
  factored_intent_version: string;
  feature_mode: Exclude<BroBotFactoredIntentMode, 'off'>;
  legacy_mode: string;
  legacy_subintent: string;
  factored_setting: string;
  factored_task: string;
  factored_audience: string;
  factored_depth: string;
  factored_evidence_need: string;
  factored_urgency: string;
  factored_interaction: string;
  factored_patient_specificity: string;
  confidence: number;
  dimension_sources: BroBotFactoredIntent['sources'];
  mapped_factored_mode: string;
  mapped_factored_subintent: string;
  legacy_factored_mode_agreement: boolean;
  classification_latency_ms: number;
  fallback_reason: string | null;
};

export function buildFactoredIntentTelemetry(input: {
  featureMode: Exclude<BroBotFactoredIntentMode, 'off'>;
  legacyMode: string;
  legacySubintent: string;
  factoredIntent: BroBotFactoredIntent;
  latencyMs: number;
  fallbackReason?: string | null;
}): FactoredIntentTelemetryMetadata {
  const mapped = mapFactoredIntentToLegacy(input.factoredIntent);
  const normalizedLegacyMode = input.legacyMode === 'fracture_call' ? 'consult' : input.legacyMode;
  return {
    factored_intent_version: BROBOT_FACTORED_INTENT_VERSION,
    feature_mode: input.featureMode,
    legacy_mode: input.legacyMode,
    legacy_subintent: input.legacySubintent,
    factored_setting: input.factoredIntent.setting,
    factored_task: input.factoredIntent.task,
    factored_audience: input.factoredIntent.audience,
    factored_depth: input.factoredIntent.depth,
    factored_evidence_need: input.factoredIntent.evidenceNeed,
    factored_urgency: input.factoredIntent.urgency,
    factored_interaction: input.factoredIntent.interaction,
    factored_patient_specificity: input.factoredIntent.patientSpecificity,
    confidence: input.factoredIntent.confidence,
    dimension_sources: input.factoredIntent.sources,
    mapped_factored_mode: mapped.mode,
    mapped_factored_subintent: mapped.subintent,
    legacy_factored_mode_agreement: normalizedLegacyMode === mapped.mode,
    classification_latency_ms: Math.max(0, Math.round(input.latencyMs * 100) / 100),
    fallback_reason: input.fallbackReason ?? null,
  };
}

export async function recordFactoredIntentTelemetrySafely(input: {
  mode: BroBotFactoredIntentMode;
  metadata: FactoredIntentTelemetryMetadata;
  record: (event: { eventType: typeof BROBOT_FACTORED_INTENT_EVENT; metadata: FactoredIntentTelemetryMetadata }) => Promise<void>;
  log?: (message: string, error: unknown) => void;
}): Promise<void> {
  if (input.mode === 'off') return;
  try {
    await input.record({ eventType: BROBOT_FACTORED_INTENT_EVENT, metadata: input.metadata });
  } catch (error) {
    input.log?.('[brobot] factored-intent telemetry failed (non-fatal)', error);
  }
}
