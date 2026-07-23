import { z } from "zod";

/**
 * CasePrep v1.1 packet SSE event contract. Mirrors
 * snaportho-caseprep/caseprep/schemas_v1_1_packet.py — update both together.
 */

export const PACKET_SECTION_IDS = [
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
    confidence: z.number().optional().default(0),
    generated: z.boolean().optional().default(false),
    source: z.string().optional(),
    rank: z.number().optional(),
    teaching_pearl: z.string().optional(),
    why_attendings_ask: z.string().optional(),
    common_mistake: z.string().optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
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
  })
  .passthrough();

export const MetaEventSchema = z.object({
  packet_id: z.string(),
  caseprep_version: z.literal("v1.1"),
  engine: z.string(),
  stream_protocol_version: z.number(),
});

export const HeaderEventSchema = z.object({
  case: PacketCaseSchema,
  header: PacketHeaderSchema,
});

export const ClarificationEventSchema = z.object({
  case: PacketCaseSchema,
  clarification_reason: z.string(),
  options: z.array(
    z.object({ label: z.string().nullish(), prompt: z.string().nullish() }).passthrough()
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
  status: "idle" | "connecting" | "streaming" | "done" | "error" | "clarification" | "denied";
  packetId: string | null;
  caseIdentity: PacketCase | null;
  header: PacketHeader | null;
  sections: Partial<Record<string, PacketSectionState>>;
  clarification: ClarificationEvent | null;
  warnings: string[];
  errorMessage: string | null;
  deniedMeta: Record<string, unknown> | null;
  timing: Record<string, unknown> | null;
};

export function createInitialPacketState(): CasePrepPacketState {
  return {
    status: "idle",
    packetId: null,
    caseIdentity: null,
    header: null,
    sections: {},
    clarification: null,
    warnings: [],
    errorMessage: null,
    deniedMeta: null,
    timing: null,
  };
}

/** Pure reducer applied per SSE event; unknown events are ignored (forward compatible). */
export function reducePacketEvent(
  state: CasePrepPacketState,
  eventName: string,
  data: unknown
): CasePrepPacketState {
  switch (eventName) {
    case "meta": {
      const parsed = MetaEventSchema.safeParse(data);
      if (!parsed.success) return state;
      return { ...state, status: "streaming", packetId: parsed.data.packet_id };
    }
    case "header": {
      const parsed = HeaderEventSchema.safeParse(data);
      if (!parsed.success) return state;
      return { ...state, caseIdentity: parsed.data.case, header: parsed.data.header };
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
    case "done": {
      const parsed = DoneEventSchema.safeParse(data);
      const timing = parsed.success ? parsed.data.timing : null;
      const warnings = parsed.success ? parsed.data.warnings : [];
      return {
        ...state,
        status: state.status === "clarification" ? "clarification" : "done",
        warnings: [...new Set([...state.warnings, ...warnings])],
        timing,
      };
    }
    case "error": {
      const parsed = ErrorEventSchema.safeParse(data);
      return {
        ...state,
        status: "error",
        errorMessage: parsed.success ? parsed.data.message : "Case Prep stream failed.",
      };
    }
    default:
      return state;
  }
}
