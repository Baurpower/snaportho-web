import { z } from "zod";

export const CasePrepCitationSchema = z.object({
  source_id: z.string(),
  title: z.string().nullish(),
  url: z.string().nullish(),
  section: z.string().nullish(),
  chunk_id: z.string().nullish(),
});

export const CasePrepAlternativeSchema = z.object({
  slug: z.string(),
  name: z.string(),
  entity_kind: z.enum(["procedure", "approach"]),
  approach: z.string().nullish(),
  confidence: z.number().nullish(),
});

export const CasePrepV2NormalizedSchema = z.object({
  requested_case: z.string(),
  raw_query: z.string().nullish(),
  canonical_slug: z.string().nullish(),
  canonical_name: z.string().nullish(),
  entity_kind: z.enum(["procedure", "approach"]).nullish(),
  requested_approach: z.string().nullish(),
  source_type: z.enum(["curated", "rag_fallback", "unavailable"]),
  content_status: z.string().nullish(),
  review_status: z.string().nullish(),
  runtime_enabled: z.boolean(),
  revision_id: z.string().nullish(),
  payload_hash: z.string().nullish(),
  resolver_method: z.string().nullish(),
  confidence: z.number().nullish(),
  alternatives: z.array(CasePrepAlternativeSchema),
  requires_clarification: z.boolean(),
  clarification_reason: z.string().nullish(),
  fallback_used: z.boolean(),
  fallback_reason: z.string().nullish(),
  citations: z.array(CasePrepCitationSchema),
  warnings: z.array(z.string()),
  payload: z.unknown().nullable(),
});

export type CasePrepV2Normalized = z.infer<typeof CasePrepV2NormalizedSchema>;

export const CasePrepV2EnvelopeSchema = z.object({
  caseprep_version: z.literal("v2"),
  engine: z.string(),
  case_prep: CasePrepV2NormalizedSchema,
});
