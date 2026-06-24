export type CasePrepReviewerRole =
  | "viewer"
  | "resident_reviewer"
  | "attending_reviewer"
  | "certifier"
  | "content_admin";

export type RegistryHealth = {
  status: "ok" | "degraded" | "unavailable";
  registry_available: boolean;
  procedure_count: number;
  certified_count: number;
  index_generated_at: string | null;
  schema_version: string;
};

export type ProcedureSummary = {
  slug: string;
  display_name: string;
  specialty: string;
  body_region: string;
  procedure_family: string;
  content_status: string;
  review_status: string;
  coverage_score: number;
  is_live: boolean;
  deprecated: boolean;
  replacement_slug: string | null;
  has_modules: boolean;
  open_validation_count: number;
};

export type RegistryIndex = {
  generated_at: string | null;
  counts_by_content_status: Record<string, number>;
  counts_by_review_status: Record<string, number>;
  procedures: ProcedureSummary[];
};

export type ClinicalSectionItem =
  | { kind: "bullet"; text: string; source_urls?: string[] }
  | { kind: "text"; text: string }
  | {
      kind: "structure_at_risk";
      structure: string;
      why_at_risk: string;
      how_to_avoid_injury: string;
      consequence_of_injury: string;
      approach_context?: string | null;
      source_urls?: string[];
    }
  | {
      kind: "surgical_layer";
      layer_name: string;
      what_user_should_know: string;
      key_structures: string[];
      structures_at_risk: string[];
      surgical_relevance: string;
      source_urls?: string[];
    }
  | { kind: "pimp_question"; question: string; answer: string }
  | {
      kind: "source";
      source_type: string;
      title?: string | null;
      url: string;
      consumed: boolean;
    };

export type ClinicalSection = {
  key: string;
  label: string;
  content_type: string;
  is_required: boolean;
  is_empty: boolean;
  coverage_weight: number;
  items: ClinicalSectionItem[];
};

export type CasePrepSource = {
  id: string;
  source_type: string;
  title: string | null;
  url: string;
  consumed: boolean;
  linked_section_keys: string[];
};

export type ValidationWarning = {
  code: string;
  severity: "info" | "warning" | "blocking";
  section_key: string | null;
  message: string;
  detail?: string | null;
};

export type ProcedureDetail = {
  slug: string;
  display_name: string;
  specialty: string;
  body_region: string;
  procedure_family: string;
  content_status: string;
  review_status: string;
  version: string;
  coverage_score: number;
  is_live: boolean;
  deprecated: boolean;
  replacement_slug: string | null;
  reviewer: string | null;
  certified_at: string | null;
  last_reviewed_at: string | null;
  aliases: string[];
  sections: ClinicalSection[];
  sources: CasePrepSource[];
  validation_warnings: ValidationWarning[];
  review_notes_excerpt: string | null;
  runtime_enabled: boolean;
};

// ── Phase 2: section review state ────────────────────────────────────────────

export type SectionReviewStatus = "unreviewed" | "needs_improvement" | "approved";

export type CasePrepSectionReview = {
  id: string;
  procedure_slug: string;
  section_key: string;
  reviewer_id: string;
  reviewer_display_name: string | null;
  status: SectionReviewStatus;
  comment: string | null;
  reviewed_at: string;
  updated_at: string;
};

export type SectionEditRequest = {
  items: ClinicalSectionItem[];
};

export type SectionEditResponse = {
  section: ClinicalSection;
  validation_warnings: ValidationWarning[];
  coverage_score: number;
};

// ── Reviewer context ──────────────────────────────────────────────────────────

export type CasePrepReviewerContext = {
  userId: string;
  email: string | undefined;
  role: CasePrepReviewerRole;
  displayName: string | null;
  specialty: string | null;
};