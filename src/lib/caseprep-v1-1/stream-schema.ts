import { z } from "zod";

/**
 * CasePrep v1.1 packet SSE event contract. Mirrors
 * snaportho-caseprep/caseprep/schemas_v1_1_packet.py — update both together.
 */

export const PACKET_SECTION_IDS = [
  "approach_decision",
  "approach_quick_brief",
  "approach_exposure",
  "approach_safety",
  "approach_strategy",
  "approach_sources",
  "summary",
  "key_takeaways",
  "top_things_to_know",
  "pimp_questions",
  "anatomy",
  "operative_flow",
  "teaching_topics",
  "decision_points",
  "pitfalls",
  "postop",
  "evidence",
  "related_concepts",
  "sources",
] as const;

export type PacketSectionId = (typeof PACKET_SECTION_IDS)[number];

export const PacketItemSchema = z
  .object({
    id: z.string(),
    question: z.string(),
    answer: z.string(),
    supporting_detail: z.string().optional().default(""),
    category: z.string(),
    source_ids: z.array(z.string()).optional().default([]),
    confidence: z.number().nullish().default(0),
    generated: z.boolean().nullish().default(false),
    source: z.string().nullish(),
    // Backend emits these as explicit `null` on RAG-sourced items. `.nullish()`
    // (nullable + optional) is required — a plain `.optional()` enum rejects
    // `null` and drops the whole section event during validation.
    provenance: z
      .enum(["certified", "rag", "generated", "approach_library"])
      .nullish(),
    claim_support: z.enum(["direct", "indirect", "unsupported"]).nullish(),
    procedure_relevance: z
      .enum(["direct", "indirect", "regional", "unknown"])
      .nullish(),
    rank: z.number().nullish(),
    teaching_pearl: z.string().nullish(),
    why_attendings_ask: z.string().nullish(),
    common_mistake: z.string().nullish(),
    difficulty: z.enum(["easy", "medium", "hard"]).nullish(),
  })
  .passthrough();

export const PacketCaseSchema = z
  .object({
    requested_case: z.string(),
    canonical_slug: z.string().nullable(),
    canonical_name: z.string().nullable(),
    requires_clarification: z.boolean().optional().default(false),
    clarification_reason: z.string().nullish(),
  })
  .passthrough();

export const PacketHeaderSchema = z
  .object({
    display_name: z.string(),
    certified: z.boolean(),
    procedure_type: z.string(),
    difficulty: z.string(),
    pgy_level: z.string(),
    est_prep_minutes: z.number(),
    common_attending_focus: z.array(z.string()),
    specialty: z.string().nullish(),
    region: z.string().nullish(),
    coverage_status: z.string().optional(),
    review_status: z.string().optional().default("unreviewed"),
    review_label: z.string().optional().default("Unreviewed"),
    legacy_certification_migrated: z.boolean().optional().default(false),
    approach_coverage: z
      .object({
        known_count: z.number().optional(),
        complete_count: z.number().optional(),
        gap_count: z.number().optional(),
        is_multi_approach: z.boolean().optional(),
        status: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const MetaEventSchema = z.object({
  packet_id: z.string(),
  caseprep_version: z.enum(["v1.1", "v1.2"]),
  engine: z.string(),
  stream_protocol_version: z.number(),
});

export const ProgressEventSchema = z.object({
  phase: z.enum([
    "connecting",
    "resolving",
    "assembling",
    "retrieving",
    "enhancing",
    "finalizing",
  ]),
  label: z.string(),
  progress_min: z.number().min(0).max(100),
  progress_max: z.number().min(0).max(100),
  elapsed_ms: z.number().optional().default(0),
  heartbeat: z.boolean().optional().default(false),
});

export const HeaderEventSchema = z.object({
  case: PacketCaseSchema,
  header: PacketHeaderSchema,
});

export const ClarificationEventSchema = z.object({
  case: PacketCaseSchema,
  clarification_reason: z.string(),
  options: z.array(
    z
      .object({ label: z.string().nullish(), prompt: z.string().nullish() })
      .passthrough(),
  ),
});

export const SectionEventSchema = z
  .object({
    section_id: z.string(),
    status: z.enum(["complete", "partial"]),
    items: z.array(PacketItemSchema).optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
    source: z.string(),
    confidence: z.number().nullish(),
    generated_field_paths: z.array(z.string()).optional().default([]),
    duration_ms: z.number().optional().default(0),
  })
  .passthrough();

export const SectionErrorEventSchema = z.object({
  section_id: z.string(),
  reason: z.string(),
});

export const WarningEventSchema = z.object({ message: z.string() });

export const ResolutionEventSchema = z.object({
  case: PacketCaseSchema,
  unresolved_prompt_tokens: z.array(z.string()).default([]),
  compatibility_status: z.enum(["valid", "needs_clarification"]),
});

export const CoverageEventSchema = z.object({
  coverage_status: z.string(),
  quality_gate: z.string(),
  grounded_percentage: z.number(),
  grounded_count: z.number().optional().default(0),
  generated_count: z.number().optional().default(0),
  omitted_sections: z.array(z.string()).optional().default([]),
});

export const DoneEventSchema = z
  .object({
    pipeline_status: z.record(z.string(), z.unknown()),
    timing: z.record(z.string(), z.unknown()),
    warnings: z.array(z.string()),
  })
  .passthrough();

export const ErrorEventSchema = z.object({ message: z.string() });

export type PacketItem = z.infer<typeof PacketItemSchema>;
export type PacketCase = z.infer<typeof PacketCaseSchema>;
export type PacketHeader = z.infer<typeof PacketHeaderSchema>;
export type SectionEvent = z.infer<typeof SectionEventSchema>;
export type ClarificationEvent = z.infer<typeof ClarificationEventSchema>;
export type DoneEvent = z.infer<typeof DoneEventSchema>;

export type PacketSectionState = {
  status: "complete" | "partial" | "error";
  items: PacketItem[];
  payload?: Record<string, unknown>;
  source: string;
  generatedFieldPaths: string[];
  errorReason?: string;
};

export type CasePrepPacketState = {
  status:
    | "idle"
    | "connecting"
    | "streaming"
    | "done"
    | "error"
    | "clarification"
    | "denied";
  packetId: string | null;
  requestedPrompt: string;
  progress: z.infer<typeof ProgressEventSchema> | null;
  caseIdentity: PacketCase | null;
  header: PacketHeader | null;
  sections: Partial<Record<string, PacketSectionState>>;
  clarification: ClarificationEvent | null;
  warnings: string[];
  errorMessage: string | null;
  deniedMeta: Record<string, unknown> | null;
  timing: Record<string, unknown> | null;
  coverage: z.infer<typeof CoverageEventSchema> | null;
};

export function createInitialPacketState(): CasePrepPacketState {
  return {
    status: "idle",
    packetId: null,
    requestedPrompt: "",
    progress: null,
    caseIdentity: null,
    header: null,
    sections: {},
    clarification: null,
    warnings: [],
    errorMessage: null,
    deniedMeta: null,
    timing: null,
    coverage: null,
  };
}

/** Pure reducer applied per SSE event; unknown events are ignored (forward compatible). */
export function reducePacketEvent(
  state: CasePrepPacketState,
  eventName: string,
  data: unknown,
): CasePrepPacketState {
  switch (eventName) {
    case "meta": {
      const parsed = MetaEventSchema.safeParse(data);
      if (!parsed.success) return state;
      return { ...state, status: "streaming", packetId: parsed.data.packet_id };
    }
    case "progress": {
      const parsed = ProgressEventSchema.safeParse(data);
      if (!parsed.success) return state;
      return {
        ...state,
        status: state.status === "connecting" ? "streaming" : state.status,
        progress: parsed.data,
      };
    }
    case "header": {
      const parsed = HeaderEventSchema.safeParse(data);
      if (!parsed.success) return state;
      return {
        ...state,
        caseIdentity: parsed.data.case,
        header: parsed.data.header,
      };
    }
    case "clarification": {
      const parsed = ClarificationEventSchema.safeParse(data);
      if (!parsed.success) return state;
      return {
        ...state,
        status: "clarification",
        caseIdentity: parsed.data.case,
        clarification: parsed.data,
      };
    }
    case "section": {
      const parsed = SectionEventSchema.safeParse(data);
      if (!parsed.success) return state;
      const section = parsed.data;
      return {
        ...state,
        sections: {
          ...state.sections,
          [section.section_id]: {
            status: section.status,
            items: section.items ?? [],
            payload: section.payload,
            source: section.source,
            generatedFieldPaths: section.generated_field_paths ?? [],
          },
        },
      };
    }
    case "section_error": {
      const parsed = SectionErrorEventSchema.safeParse(data);
      if (!parsed.success) return state;
      const existing = state.sections[parsed.data.section_id];
      // A completed section is never downgraded by a late error.
      if (existing && existing.status !== "error") return state;
      return {
        ...state,
        sections: {
          ...state.sections,
          [parsed.data.section_id]: {
            status: "error",
            items: [],
            source: "none",
            generatedFieldPaths: [],
            errorReason: parsed.data.reason,
          },
        },
      };
    }
    case "warning": {
      const parsed = WarningEventSchema.safeParse(data);
      if (!parsed.success) return state;
      return { ...state, warnings: [...state.warnings, parsed.data.message] };
    }
    case "core_done": {
      const parsed = CoverageEventSchema.safeParse(data);
      return parsed.success ? { ...state, coverage: parsed.data } : state;
    }
    case "done": {
      const parsed = DoneEventSchema.safeParse(data);
      const timing = parsed.success ? parsed.data.timing : null;
      const warnings = parsed.success ? parsed.data.warnings : [];
      const coverage = CoverageEventSchema.safeParse(data);
      return {
        ...state,
        status: state.status === "clarification" ? "clarification" : "done",
        warnings: [...new Set([...state.warnings, ...warnings])],
        timing,
        coverage: coverage.success ? coverage.data : state.coverage,
      };
    }
    case "error": {
      const parsed = ErrorEventSchema.safeParse(data);
      return {
        ...state,
        status: "error",
        errorMessage: parsed.success
          ? parsed.data.message
          : "Case Prep stream failed.",
      };
    }
    default:
      return state;
  }
}
