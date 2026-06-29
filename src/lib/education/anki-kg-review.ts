import { createAdminClient } from "@/lib/supabase/admin";
import { requireCasePrepReviewer } from "@/lib/caseprep-review/access-control";
import { buildReviewGroupKeys } from "@/lib/education/anki-import/review-grouping";

export type ReviewConfidenceBand = "all" | "high" | "medium" | "low";
export type ReviewMappedState = "all" | "applied" | "needs_review" | "unmapped";
export type ReviewSourceTagMode = "all" | "has_source_tags" | "source_only";

export type AnkiKgReviewFilters = {
  batchId?: string | null;
  runId?: string | null;
  deckBranch?: string | null;
  tag?: string | null;
  confidenceBand?: ReviewConfidenceBand;
  mappedState?: ReviewMappedState;
  sourceTagMode?: ReviewSourceTagMode;
  curriculumNodeSlug?: string | null;
  reviewStatus?: string | null;
};

export type ReviewActionType =
  | "approve_candidate"
  | "reject_candidate"
  | "needs_alias"
  | "wrong_node"
  | "bulk_approve_high_confidence_branch"
  | "bulk_reject_source_only";

export type ReviewActionInput = {
  action: ReviewActionType;
  runId: string;
  candidateId?: string | null;
  deckBranch?: string | null;
  rationale?: string | null;
  previewOnly?: boolean;
};

export type MappingSummaryRow = {
  mapping_run_id: string;
  import_batch_id: string;
  mapper_version: string;
  run_mode: string;
  status: string;
  min_confidence: number;
  deck_prefix: string | null;
  limit_count: number | null;
  total_cards: number;
  mapped_cards: number;
  unmapped_cards: number;
  needs_review_candidates: number;
  applied_links: number;
  approved_links: number;
  rejected_candidates: number;
  coverage_percentage: number;
  created_at: string;
  updated_at: string;
};

export type ReviewCandidateRow = {
  mapping_run_id: string;
  import_batch_id: string;
  candidate_id: string;
  canonical_card_id: string;
  source_note_id: string;
  source_card_id: string;
  anki_note_id: number | null;
  anki_card_id: number | null;
  anki_guid: string | null;
  deck_name: string | null;
  deck_branch: string | null;
  model_name: string | null;
  field_text: string | null;
  tags: string[];
  media_ref_count: number;
  card_review_status: string | null;
  weak_tag_reason: string | null;
  source_only_tag_count: number;
  broad_tag_count: number;
  likely_topic_tag_count: number;
  has_source_provenance_tags: boolean;
  specialty_id: string | null;
  curriculum_node_id: string | null;
  curriculum_node_slug: string | null;
  curriculum_node_title: string | null;
  curriculum_node_type: string | null;
  concept_id: string | null;
  candidate_rank: number;
  mapping_confidence: number;
  review_status: string;
  mapper_type: string;
  is_selected: boolean;
  matched_labels: unknown;
  evidence: unknown;
  questionable_reasons: unknown;
  comments: string | null;
  created_at: string;
  updated_at: string;
};

export type AppliedMappingRow = {
  mapping_run_id: string;
  import_batch_id: string;
  card_knowledge_link_id: string;
  canonical_card_id: string;
  source_note_id: string;
  source_card_id: string;
  anki_note_id: number | null;
  anki_card_id: number | null;
  anki_guid: string | null;
  deck_name: string | null;
  deck_branch: string | null;
  model_name: string | null;
  field_text: string | null;
  tags: string[];
  media_ref_count: number;
  card_review_status: string | null;
  weak_tag_reason: string | null;
  source_only_tag_count: number;
  broad_tag_count: number;
  likely_topic_tag_count: number;
  has_source_provenance_tags: boolean;
  specialty_id: string | null;
  curriculum_node_id: string | null;
  curriculum_node_slug: string | null;
  curriculum_node_title: string | null;
  curriculum_node_type: string | null;
  learning_objective_id: string | null;
  concept_id: string | null;
  mapping_confidence: number;
  review_status: string;
  link_method: string;
  is_primary: boolean;
  matched_labels: unknown;
  evidence: unknown;
  comments: string | null;
  created_at: string;
  updated_at: string;
};

export type UnmappedCardRow = {
  mapping_run_id: string;
  import_batch_id: string;
  canonical_card_id: string;
  source_note_id: string;
  source_card_id: string;
  anki_note_id: number | null;
  anki_card_id: number | null;
  anki_guid: string | null;
  deck_name: string | null;
  deck_branch: string | null;
  model_name: string | null;
  field_text: string | null;
  tags: string[];
  media_ref_count: number;
  card_review_status: string | null;
  weak_tag_reason: string | null;
  source_only_tag_count: number;
  broad_tag_count: number;
  likely_topic_tag_count: number;
  has_source_provenance_tags: boolean;
};

export type CoverageByDeckBranchRow = {
  mapping_run_id: string;
  import_batch_id: string;
  deck_branch: string | null;
  total_cards: number;
  mapped_cards: number;
  unmapped_cards: number;
  needs_review_cards: number;
  approved_cards: number;
  rejected_cards: number;
  coverage_percentage: number;
};

export type CoverageByTagRow = {
  mapping_run_id: string;
  import_batch_id: string;
  tag_name: string;
  total_cards: number;
  mapped_cards: number;
  unmapped_cards: number;
  needs_review_cards: number;
  coverage_percentage: number;
};

export type AliasSuggestionRow = {
  mapping_run_id: string;
  curriculum_node_id: string;
  curriculum_node_slug: string;
  curriculum_node_title: string;
  curriculum_node_type: string;
  suggested_alias: string;
  normalized_alias: string;
  card_count: number;
  avg_confidence: number;
};

export type ReviewDashboardPayload = {
  filters: NormalizedAnkiKgReviewFilters;
  summary: MappingSummaryRow;
  appliedMappings: AppliedMappingRow[];
  needsReviewCandidates: ReviewCandidateRow[];
  unmappedCards: UnmappedCardRow[];
  coverageByDeckBranch: CoverageByDeckBranchRow[];
  coverageByTag: CoverageByTagRow[];
  aliasSuggestions: AliasSuggestionRow[];
  recommendedFirstReviewBranch: string | null;
};

type SupabaseAdmin = ReturnType<typeof createAdminClient>;
type NormalizedAnkiKgReviewFilters = {
  batchId: string;
  runId: string;
  deckBranch: string;
  tag: string;
  confidenceBand: ReviewConfidenceBand;
  mappedState: ReviewMappedState;
  sourceTagMode: ReviewSourceTagMode;
  curriculumNodeSlug: string;
  reviewStatus: string;
};

const DEFAULT_BATCH_ID = "4bc171ba-2264-4805-918c-762b5b5d19c6";
const DEFAULT_RUN_ID = "e54c3fbb-e027-4ffb-8b32-84d255b45c6d";

function normalizeFilters(input: AnkiKgReviewFilters): NormalizedAnkiKgReviewFilters {
  return {
    batchId: input.batchId ?? DEFAULT_BATCH_ID,
    runId: input.runId ?? DEFAULT_RUN_ID,
    deckBranch: input.deckBranch ?? "",
    tag: input.tag ?? "",
    confidenceBand: input.confidenceBand ?? "all",
    mappedState: input.mappedState ?? "all",
    sourceTagMode: input.sourceTagMode ?? "all",
    curriculumNodeSlug: input.curriculumNodeSlug ?? "",
    reviewStatus: input.reviewStatus ?? "",
  };
}

function appendComment(existing: string | null | undefined, next: string): string {
  const trimmedExisting = existing?.trim();
  return trimmedExisting ? `${trimmedExisting}\n${next}` : next;
}

function confidenceRange(confidenceBand: ReviewConfidenceBand) {
  if (confidenceBand === "high") {
    return { min: 0.95, max: null as number | null };
  }
  if (confidenceBand === "medium") {
    return { min: 0.8, max: 0.949 };
  }
  if (confidenceBand === "low") {
    return { min: null as number | null, max: 0.799 };
  }
  return { min: null as number | null, max: null as number | null };
}

async function resolveRun(filters: NormalizedAnkiKgReviewFilters) {
  const supabase = createAdminClient();

  if (filters.runId) {
    const { data, error } = await supabase
      .from("anki_kg_mapping_runs")
      .select("id, import_batch_id")
      .eq("id", filters.runId)
      .maybeSingle();
    if (error) {
      throw new Error(`Unable to load mapping run ${filters.runId}: ${error.message}`);
    }
    if (data?.id && data.import_batch_id) {
      return { runId: String(data.id), batchId: String(data.import_batch_id) };
    }
  }

  const { data, error } = await supabase
    .from("anki_kg_mapping_runs")
    .select("id, import_batch_id")
    .eq("status", "completed")
    .eq("import_batch_id", filters.batchId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(`Unable to resolve mapping run: ${error.message}`);
  }
  if (data?.id && data.import_batch_id) {
    return { runId: String(data.id), batchId: String(data.import_batch_id) };
  }

  return { runId: DEFAULT_RUN_ID, batchId: filters.batchId };
}

function applySharedRowFilters<T extends { [key: string]: unknown }>(
  rows: T[],
  filters: NormalizedAnkiKgReviewFilters
): T[] {
  const range = confidenceRange(filters.confidenceBand);
  return rows.filter((row) => {
    if (filters.deckBranch && String(row.deck_branch ?? "") !== filters.deckBranch) {
      return false;
    }
    if (filters.tag) {
      const tags = Array.isArray(row.tags) ? (row.tags as string[]) : [];
      if (!tags.includes(filters.tag)) {
        return false;
      }
    }
    if (filters.curriculumNodeSlug && String(row.curriculum_node_slug ?? "") !== filters.curriculumNodeSlug) {
      return false;
    }
    if (filters.reviewStatus && String(row.review_status ?? "") !== filters.reviewStatus) {
      return false;
    }
    if (filters.sourceTagMode === "has_source_tags" && !Boolean(row.has_source_provenance_tags)) {
      return false;
    }
    if (
      filters.sourceTagMode === "source_only" &&
      String(row.weak_tag_reason ?? "") !== "source_only_tags"
    ) {
      return false;
    }
    const confidence = typeof row.mapping_confidence === "number" ? row.mapping_confidence : null;
    if (range.min != null && (confidence == null || confidence < range.min)) {
      return false;
    }
    if (range.max != null && (confidence == null || confidence > range.max)) {
      return false;
    }
    return true;
  });
}

function chooseRecommendedBranch(branches: CoverageByDeckBranchRow[]): string | null {
  const ranked = [...branches]
    .filter((row) => row.total_cards > 0)
    .sort((left, right) => {
      const leftSignal = left.needs_review_cards * 3 + left.unmapped_cards * 2 + left.total_cards;
      const rightSignal = right.needs_review_cards * 3 + right.unmapped_cards * 2 + right.total_cards;
      return rightSignal - leftSignal;
    });
  return ranked[0]?.deck_branch ?? null;
}

export async function fetchAnkiKgReviewDashboard(
  input: AnkiKgReviewFilters
): Promise<ReviewDashboardPayload> {
  const filters = normalizeFilters(input);
  const resolved = await resolveRun(filters);
  const effectiveFilters: NormalizedAnkiKgReviewFilters = {
    ...filters,
    batchId: resolved.batchId,
    runId: resolved.runId,
  };

  const supabase = createAdminClient();

  const [
    summaryResult,
    appliedResult,
    candidatesResult,
    unmappedResult,
    branchCoverageResult,
    tagCoverageResult,
    aliasSuggestionResult,
  ] = await Promise.all([
    supabase
      .from("v_anki_kg_mapping_summary")
      .select("*")
      .eq("mapping_run_id", effectiveFilters.runId)
      .single(),
    supabase
      .from("v_anki_kg_applied_mappings")
      .select("*")
      .eq("mapping_run_id", effectiveFilters.runId)
      .order("mapping_confidence", { ascending: false })
      .limit(60),
    supabase
      .from("v_anki_kg_review_candidates")
      .select("*")
      .eq("mapping_run_id", effectiveFilters.runId)
      .in("review_status", ["needs_review", "auto_mapped"])
      .order("mapping_confidence", { ascending: false })
      .limit(120),
    supabase
      .from("v_anki_kg_unmapped_cards")
      .select("*")
      .eq("mapping_run_id", effectiveFilters.runId)
      .order("deck_branch", { ascending: true })
      .limit(120),
    supabase
      .from("v_anki_kg_coverage_by_deck_branch")
      .select("*")
      .eq("mapping_run_id", effectiveFilters.runId)
      .order("unmapped_cards", { ascending: false })
      .order("needs_review_cards", { ascending: false })
      .limit(60),
    supabase
      .from("v_anki_kg_coverage_by_tag")
      .select("*")
      .eq("mapping_run_id", effectiveFilters.runId)
      .order("needs_review_cards", { ascending: false })
      .order("total_cards", { ascending: false })
      .limit(80),
    supabase
      .from("v_anki_kg_alias_suggestions")
      .select("*")
      .eq("mapping_run_id", effectiveFilters.runId)
      .order("card_count", { ascending: false })
      .order("avg_confidence", { ascending: false })
      .limit(80),
  ]);

  for (const result of [
    summaryResult,
    appliedResult,
    candidatesResult,
    unmappedResult,
    branchCoverageResult,
    tagCoverageResult,
    aliasSuggestionResult,
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const appliedMappings = applySharedRowFilters(
    effectiveFilters.mappedState === "needs_review" || effectiveFilters.mappedState === "unmapped"
      ? []
      : ((appliedResult.data ?? []) as AppliedMappingRow[]),
    effectiveFilters
  );

  const needsReviewCandidates = applySharedRowFilters(
    ((candidatesResult.data ?? []) as ReviewCandidateRow[]).filter((row) => {
      if (effectiveFilters.mappedState === "applied") {
        return row.review_status === "auto_mapped";
      }
      if (effectiveFilters.mappedState === "needs_review") {
        return row.review_status === "needs_review";
      }
      if (effectiveFilters.mappedState === "unmapped") {
        return false;
      }
      return true;
    }),
    effectiveFilters
  );

  const unmappedCards = ((unmappedResult.data ?? []) as UnmappedCardRow[]).filter((row) => {
    if (effectiveFilters.deckBranch && row.deck_branch !== effectiveFilters.deckBranch) {
      return false;
    }
    if (effectiveFilters.tag && !row.tags.includes(effectiveFilters.tag)) {
      return false;
    }
    if (
      effectiveFilters.sourceTagMode === "has_source_tags" &&
      !Boolean(row.has_source_provenance_tags)
    ) {
      return false;
    }
    if (
      effectiveFilters.sourceTagMode === "source_only" &&
      row.weak_tag_reason !== "source_only_tags"
    ) {
      return false;
    }
    return effectiveFilters.mappedState === "all" || effectiveFilters.mappedState === "unmapped";
  });

  const coverageByDeckBranch = ((branchCoverageResult.data ?? []) as CoverageByDeckBranchRow[]).filter(
    (row) => !effectiveFilters.deckBranch || row.deck_branch === effectiveFilters.deckBranch
  );

  const coverageByTag = ((tagCoverageResult.data ?? []) as CoverageByTagRow[]).filter((row) => {
    if (effectiveFilters.tag && row.tag_name !== effectiveFilters.tag) {
      return false;
    }
    if (effectiveFilters.deckBranch) {
      return true;
    }
    return true;
  });

  const aliasSuggestions = ((aliasSuggestionResult.data ?? []) as AliasSuggestionRow[]).filter((row) => {
    if (effectiveFilters.curriculumNodeSlug && row.curriculum_node_slug !== effectiveFilters.curriculumNodeSlug) {
      return false;
    }
    return true;
  });

  return {
    filters: effectiveFilters,
    summary: summaryResult.data as MappingSummaryRow,
    appliedMappings,
    needsReviewCandidates,
    unmappedCards,
    coverageByDeckBranch,
    coverageByTag,
    aliasSuggestions,
    recommendedFirstReviewBranch: chooseRecommendedBranch(coverageByDeckBranch),
  };
}

async function fetchActionCandidates(input: ReviewActionInput): Promise<ReviewCandidateRow[]> {
  const supabase = createAdminClient();

  if (input.candidateId) {
    const { data, error } = await supabase
      .from("v_anki_kg_review_candidates")
      .select("*")
      .eq("candidate_id", input.candidateId)
      .eq("mapping_run_id", input.runId)
      .limit(1);
    if (error) {
      throw new Error(error.message);
    }
    return (data ?? []) as ReviewCandidateRow[];
  }

  let query = supabase
    .from("v_anki_kg_review_candidates")
    .select("*")
    .eq("mapping_run_id", input.runId)
    .eq("candidate_rank", 1);

  if (input.action === "bulk_approve_high_confidence_branch") {
    query = query
      .eq("review_status", "needs_review")
      .gte("mapping_confidence", 0.95)
      .not("deck_branch", "is", null);
    if (input.deckBranch) {
      query = query.eq("deck_branch", input.deckBranch);
    }
  }

  if (input.action === "bulk_reject_source_only") {
    query = query
      .in("review_status", ["needs_review", "auto_mapped"])
      .eq("weak_tag_reason", "source_only_tags");
    if (input.deckBranch) {
      query = query.eq("deck_branch", input.deckBranch);
    }
  }

  const { data, error } = await query.limit(500);
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as ReviewCandidateRow[];
}

function buildDecisionComment(action: ReviewActionType, rationale?: string | null) {
  const suffix = rationale?.trim() ? ` Rationale: ${rationale.trim()}` : "";
  if (action === "approve_candidate" || action === "bulk_approve_high_confidence_branch") {
    return `Approved via Anki KG review workflow.${suffix}`;
  }
  if (action === "needs_alias") {
    return `Flagged for alias follow-up via Anki KG review workflow.${suffix}`;
  }
  if (action === "wrong_node") {
    return `Rejected as wrong curriculum node via Anki KG review workflow.${suffix}`;
  }
  return `Rejected via Anki KG review workflow.${suffix}`;
}

async function recordReviewAction(
  supabase: SupabaseAdmin,
  input: {
    mappingRunId: string;
    canonicalCardId: string;
    candidateId: string | null;
    cardKnowledgeLinkId: string | null;
    reviewerUserId: string;
    decision: ReviewActionType;
    rationale: string | null;
    previousStatus: string | null;
    newStatus: string | null;
    reviewGroupKey: string | null;
    metadata: Record<string, unknown>;
  }
) {
  const { data, error } = await supabase
    .from("anki_kg_review_actions")
    .insert({
      mapping_run_id: input.mappingRunId,
      canonical_card_id: input.canonicalCardId,
      candidate_id: input.candidateId,
      card_knowledge_link_id: input.cardKnowledgeLinkId,
      reviewer_user_id: input.reviewerUserId,
      decision: input.decision,
      rationale: input.rationale,
      previous_status: input.previousStatus,
      new_status: input.newStatus,
      review_group_key: input.reviewGroupKey,
      metadata: input.metadata,
      comments: input.rationale?.trim() || null,
      is_active: true,
    })
    .select("id")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return String(data.id);
}

async function findMatchingLinks(supabase: SupabaseAdmin, candidate: ReviewCandidateRow) {
  let query = supabase
    .from("card_knowledge_links")
    .select("*")
    .eq("canonical_card_id", candidate.canonical_card_id)
    .eq("curriculum_node_id", candidate.curriculum_node_id)
    .eq("link_method", "deterministic");
  query = candidate.concept_id ? query.eq("concept_id", candidate.concept_id) : query.is("concept_id", null);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as Array<Record<string, unknown>>;
}

async function approveCandidate(
  supabase: SupabaseAdmin,
  candidate: ReviewCandidateRow,
  reviewerUserId: string,
  action: ReviewActionType,
  rationale: string | null
) {
  const matchedLabels = Array.isArray(candidate.matched_labels) ? candidate.matched_labels : [];
  const evidence = Array.isArray(candidate.evidence) ? candidate.evidence : [];
  const reviewGroupKey =
    buildReviewGroupKeys({
      deckName: candidate.deck_name,
      modelName: candidate.model_name,
      tags: candidate.tags,
      fieldText: candidate.field_text,
      mediaRefCount: candidate.media_ref_count,
    })[0] ?? null;

  const existingLinks = await findMatchingLinks(supabase, candidate);
  const existingLink = existingLinks[0] ?? null;

  const { error: demoteError } = await supabase
    .from("card_knowledge_links")
    .update({ is_primary: false })
    .eq("canonical_card_id", candidate.canonical_card_id)
    .eq("is_active", true)
    .neq("id", existingLink?.id ?? "00000000-0000-0000-0000-000000000000");
  if (demoteError) {
    throw new Error(demoteError.message);
  }

  let cardKnowledgeLinkId: string | null = existingLink ? String(existingLink.id) : null;

  const linkPayload = {
    canonical_card_id: candidate.canonical_card_id,
    specialty_id: candidate.specialty_id,
    curriculum_node_id: candidate.curriculum_node_id,
    learning_objective_id: null,
    concept_id: candidate.concept_id,
    mapping_confidence: Math.max(Number(existingLink?.mapping_confidence ?? 0), candidate.mapping_confidence),
    review_status: "approved",
    link_method: existingLink?.link_method ?? "deterministic",
    is_primary: true,
    is_active: true,
    metadata: {
      ...(typeof existingLink?.metadata === "object" && existingLink?.metadata ? existingLink.metadata : {}),
      mapping_run_id: candidate.mapping_run_id,
      matched_labels: matchedLabels,
      evidence,
      reviewer_user_id: reviewerUserId,
      reviewer_action: action,
    },
    comments: appendComment(existingLink?.comments as string | null | undefined, buildDecisionComment(action, rationale)),
  };

  if (existingLink) {
    const { error } = await supabase.from("card_knowledge_links").update(linkPayload).eq("id", existingLink.id);
    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { data, error } = await supabase
      .from("card_knowledge_links")
      .insert(linkPayload)
      .select("id")
      .single();
    if (error) {
      throw new Error(error.message);
    }
    cardKnowledgeLinkId = String(data.id);
  }

  const previousStatus = candidate.review_status;
  const { error: candidateError } = await supabase
    .from("anki_kg_mapping_candidates")
    .update({
      review_status: "approved",
      is_selected: true,
      comments: appendComment(candidate.comments, buildDecisionComment(action, rationale)),
    })
    .eq("id", candidate.candidate_id);
  if (candidateError) {
    throw new Error(candidateError.message);
  }

  await recordReviewAction(supabase, {
    mappingRunId: candidate.mapping_run_id,
    canonicalCardId: candidate.canonical_card_id,
    candidateId: candidate.candidate_id,
    cardKnowledgeLinkId,
    reviewerUserId,
    decision: action,
    rationale,
    previousStatus,
    newStatus: "approved",
    reviewGroupKey,
    metadata: {
      curriculum_node_id: candidate.curriculum_node_id,
      curriculum_node_slug: candidate.curriculum_node_slug,
      matched_labels: matchedLabels,
    },
  });
}

async function rejectCandidateLike(
  supabase: SupabaseAdmin,
  candidate: ReviewCandidateRow,
  reviewerUserId: string,
  action: ReviewActionType,
  rationale: string | null
) {
  const reviewGroupKey =
    buildReviewGroupKeys({
      deckName: candidate.deck_name,
      modelName: candidate.model_name,
      tags: candidate.tags,
      fieldText: candidate.field_text,
      mediaRefCount: candidate.media_ref_count,
    })[0] ?? null;

  const existingLinks = await findMatchingLinks(supabase, candidate);
  let cardKnowledgeLinkId: string | null = null;

  for (const link of existingLinks) {
    cardKnowledgeLinkId = String(link.id);
    const { error } = await supabase
      .from("card_knowledge_links")
      .update({
        review_status: "rejected",
        is_primary: false,
        is_active: false,
        comments: appendComment(link.comments as string | null | undefined, buildDecisionComment(action, rationale)),
        metadata: {
          ...(typeof link.metadata === "object" && link.metadata ? link.metadata : {}),
          reviewer_user_id: reviewerUserId,
          reviewer_action: action,
        },
      })
      .eq("id", link.id);
    if (error) {
      throw new Error(error.message);
    }
  }

  const previousStatus = candidate.review_status;
  const { error: candidateError } = await supabase
    .from("anki_kg_mapping_candidates")
    .update({
      review_status: "rejected",
      is_selected: false,
      comments: appendComment(candidate.comments, buildDecisionComment(action, rationale)),
    })
    .eq("id", candidate.candidate_id);
  if (candidateError) {
    throw new Error(candidateError.message);
  }

  await recordReviewAction(supabase, {
    mappingRunId: candidate.mapping_run_id,
    canonicalCardId: candidate.canonical_card_id,
    candidateId: candidate.candidate_id,
    cardKnowledgeLinkId,
    reviewerUserId,
    decision: action,
    rationale,
    previousStatus,
    newStatus: "rejected",
    reviewGroupKey,
    metadata: {
      curriculum_node_id: candidate.curriculum_node_id,
      curriculum_node_slug: candidate.curriculum_node_slug,
      questionable_reasons: candidate.questionable_reasons,
    },
  });
}

async function markNeedsAlias(
  supabase: SupabaseAdmin,
  candidate: ReviewCandidateRow,
  reviewerUserId: string,
  rationale: string | null
) {
  const reviewGroupKey =
    buildReviewGroupKeys({
      deckName: candidate.deck_name,
      modelName: candidate.model_name,
      tags: candidate.tags,
      fieldText: candidate.field_text,
      mediaRefCount: candidate.media_ref_count,
    })[0] ?? null;

  const { error: candidateError } = await supabase
    .from("anki_kg_mapping_candidates")
    .update({
      review_status: "needs_review",
      comments: appendComment(candidate.comments, buildDecisionComment("needs_alias", rationale)),
    })
    .eq("id", candidate.candidate_id);
  if (candidateError) {
    throw new Error(candidateError.message);
  }

  await recordReviewAction(supabase, {
    mappingRunId: candidate.mapping_run_id,
    canonicalCardId: candidate.canonical_card_id,
    candidateId: candidate.candidate_id,
    cardKnowledgeLinkId: null,
    reviewerUserId,
    decision: "needs_alias",
    rationale,
    previousStatus: candidate.review_status,
    newStatus: "needs_review",
    reviewGroupKey,
    metadata: {
      curriculum_node_id: candidate.curriculum_node_id,
      curriculum_node_slug: candidate.curriculum_node_slug,
      matched_labels: candidate.matched_labels,
    },
  });
}

export async function previewAnkiKgReviewAction(input: ReviewActionInput) {
  await requireCasePrepReviewer();
  const candidates = await fetchActionCandidates(input);
  return {
    matchedCount: candidates.length,
    sampleCandidateIds: candidates.slice(0, 10).map((row) => row.candidate_id),
    sampleDeckBranches: [...new Set(candidates.slice(0, 10).map((row) => row.deck_branch).filter(Boolean))],
  };
}

export async function applyAnkiKgReviewAction(input: ReviewActionInput) {
  const reviewer = await requireCasePrepReviewer();
  const candidates = await fetchActionCandidates(input);

  if (input.previewOnly) {
    return {
      matchedCount: candidates.length,
      updatedCount: 0,
      candidateIds: candidates.map((row) => row.candidate_id),
    };
  }

  const supabase = createAdminClient();

  for (const candidate of candidates) {
    if (input.action === "approve_candidate" || input.action === "bulk_approve_high_confidence_branch") {
      await approveCandidate(supabase, candidate, reviewer.userId, input.action, input.rationale ?? null);
      continue;
    }
    if (input.action === "reject_candidate" || input.action === "bulk_reject_source_only") {
      await rejectCandidateLike(supabase, candidate, reviewer.userId, input.action, input.rationale ?? null);
      continue;
    }
    if (input.action === "wrong_node") {
      await rejectCandidateLike(supabase, candidate, reviewer.userId, input.action, input.rationale ?? null);
      continue;
    }
    if (input.action === "needs_alias") {
      await markNeedsAlias(supabase, candidate, reviewer.userId, input.rationale ?? null);
    }
  }

  return {
    matchedCount: candidates.length,
    updatedCount: candidates.length,
    candidateIds: candidates.map((row) => row.candidate_id),
  };
}
