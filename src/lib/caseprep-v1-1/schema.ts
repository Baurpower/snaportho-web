import { z } from "zod";

export const CasePrepHighYieldQuestionSchema = z.object({
  record_id: z.string(),
  question: z.string(),
  answer: z.string(),
  additional_info: z.string(),
  source: z.string(),
  specialties: z.array(z.string()),
  region: z.string(),
  subregion: z.string(),
  diagnoses: z.array(z.string()),
  procedures: z.array(z.string()),
  approaches: z.array(z.string()),
  vector_score: z.number(),
  retrieval_branch: z.string(),
  retrieval_score: z.number(),
});

export const CasePrepV11ItemSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  supporting_detail: z.string(),
  category: z.string(),
  source_ids: z.array(z.string()),
  confidence: z.number(),
  generated: z.boolean(),
});

const CaseIdentitySchema = z.object({
  requested_case: z.string(),
  canonical_slug: z.string().nullable(),
  canonical_name: z.string().nullable(),
  diagnosis: z.string().nullable(),
  approach: z.string().nullable(),
  specialty: z.string().nullable(),
  region: z.string().nullable(),
  subregion: z.string().nullable(),
  laterality: z.string().nullable(),
  patient_age: z.number().int().nullable(),
  resolver_method: z.string(),
  confidence: z.number(),
  requires_clarification: z.boolean(),
  clarification_reason: z.string().nullish(),
});

const PipelineStatusSchema = z.object({
  status: z.enum(["complete", "partial", "unavailable", "failed"]),
  item_count: z.number().int().nonnegative(),
  duration_ms: z.number().int().nonnegative(),
});

export const CasePrepWebV11Schema = z.object({
  caseprep_version: z.literal("v1.1"),
  engine: z.literal("web_parallel_rag"),
  content_status: z.enum(["preview", "clarification"]),
  case: CaseIdentitySchema,
  high_yield_questions: z.array(CasePrepV11ItemSchema),
  sections: z.object({
    indications: z.array(CasePrepV11ItemSchema),
    anatomy: z.array(CasePrepV11ItemSchema),
    approach: z.array(CasePrepV11ItemSchema),
    operative_steps: z.array(CasePrepV11ItemSchema),
    complications: z.array(CasePrepV11ItemSchema),
    postoperative_care: z.array(CasePrepV11ItemSchema),
  }),
  case_specific_pearls: z.array(z.string()),
  sources: z.array(z.object({
    source_id: z.string(),
    url: z.string(),
    title: z.string(),
  })),
  pipeline_status: z.record(z.string(), PipelineStatusSchema),
  timing: z.object({
    preflight_ms: z.number().int().nonnegative(),
    total_ms: z.number().int().nonnegative(),
  }),
  highYieldQuestions: z.array(CasePrepHighYieldQuestionSchema),
  pimpQuestions: z.array(z.string()),
  otherUsefulFacts: z.array(z.string()),
  anatomy: z.unknown().nullable(),
  warnings: z.array(z.string()),
  retrieval: z.object({
    strategy: z.literal("single_embedding_parallel_scoped_queries"),
    candidate_count: z.number().int().nonnegative(),
    embedding_count: z.number().int().nonnegative(),
    embedding_ms: z.number().int().nonnegative(),
    pinecone_query_ms: z.number().int().nonnegative(),
    branch_count: z.number().int().nonnegative(),
    branch_candidate_counts: z.record(z.string(), z.number().int().nonnegative()),
    failed_branches: z.array(z.string()),
    raw_candidate_count: z.number().int().nonnegative(),
    selected_count: z.number().int().nonnegative(),
  }),
});

export type CasePrepWebV11 = z.infer<typeof CasePrepWebV11Schema>;
export type CasePrepV11Item = z.infer<typeof CasePrepV11ItemSchema>;
