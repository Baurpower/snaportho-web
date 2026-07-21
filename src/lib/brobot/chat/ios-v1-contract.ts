const IOS_V1_SUPPORTED_SUBINTENTS = new Set([
  'landmarks',
  'surgical_steps',
  'diagnostic_sequence',
  'implant_options',
  'brand_comparison',
  'anatomy_at_risk',
  'attending_questions',
  'treatment_algorithm',
  'quiz',
  'workup',
  'evidence_critique',
  'initial_consult',
  'presentation_help',
  'imaging_review',
  'differential',
  'treatment_plan',
  'operative_indications',
  'complication',
  'postop_problem',
  'fracture',
  'infection',
  'urgent_red_flags',
  'overview',
  'other',
]);

const IOS_V1_SUBINTENT_FALLBACKS: Record<string, string> = {
  surgical_approach: 'landmarks',
  classification: 'overview',
  indications: 'operative_indications',
  patient_explanation: 'overview',
  oite_traps: 'quiz',
};

type IntentResponse = Record<string, unknown> & { subintent?: string };

/** Keep the shipped native v1 decoder isolated from newer backend enum cases. */
export function serializeBroBotIntentForClient<T extends IntentResponse>(
  result: T,
  chatVersionHeader: string | null
): T {
  if (chatVersionHeader?.trim().toLowerCase() !== 'v1') return result;
  if (!result.subintent || IOS_V1_SUPPORTED_SUBINTENTS.has(result.subintent)) return result;

  return {
    ...result,
    subintent: IOS_V1_SUBINTENT_FALLBACKS[result.subintent] ?? 'other',
  };
}

export function isIosV1SupportedSubintent(value: unknown): value is string {
  return typeof value === 'string' && IOS_V1_SUPPORTED_SUBINTENTS.has(value);
}
