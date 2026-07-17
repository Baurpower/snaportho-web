export const KG_FEEDBACK_TYPES = [
  "incorrect_entity",
  "incorrect_relationship",
  "missing_entity",
  "missing_relationship",
  "duplicate_concept",
  "weak_retrieval",
  "unsupported_answer",
  "provenance_concern",
  "outdated_content",
  "confusing_terminology",
  "inappropriate_curriculum_placement",
  "useful_traversal",
  "successful_answer",
  "user_correction",
  "expert_correction",
] as const;

export type KgFeedbackType = (typeof KG_FEEDBACK_TYPES)[number];
export type KgProductSurface =
  | "brobot"
  | "prepare"
  | "path_to_ortho"
  | "browser_extension"
  | "admin"
  | "other";

export type KgFeedbackInput = {
  productSurface: KgProductSurface;
  releaseId?: string | null;
  responseOrRetrievalId?: string | null;
  neighborhoodSlugs?: string[];
  entityIds?: string[];
  relationshipIds?: string[];
  feedbackType: KgFeedbackType;
  severity?: "low" | "moderate" | "high" | "critical";
  userQuery?: string | null;
  explanation?: string | null;
  userRole?: string | null;
  supportingSource?: string | null;
  productContext?: Record<string, unknown>;
};

type InsertClient = {
  from: (table: string) => {
    insert: (value: Record<string, unknown>) => {
      select: (columns: string) => {
        single: () => PromiseLike<{ data: { id: string; created_at: string } | null; error: { message: string } | null }>;
      };
    };
  };
};

export function sanitizeKgFeedbackText(value: string | null | undefined, maxLength: number): string | null {
  if (!value) return null;
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
    .replace(/\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g, "[redacted-phone]")
    .replace(/\b\d{7,}\b/g, "[redacted-identifier]")
    .slice(0, maxLength);
}

export function sanitizeKgProductContext(
  value: Record<string, unknown> | undefined
): Record<string, unknown> {
  const forbiddenKey = /(patient|mrn|medical.?record|date.?of.?birth|\bdob\b|email|phone|address)/i;
  const visit = (input: unknown, depth: number): unknown => {
    if (depth > 4) return "[truncated]";
    if (typeof input === "string") return sanitizeKgFeedbackText(input, 1000);
    if (Array.isArray(input)) return input.slice(0, 50).map((item) => visit(item, depth + 1));
    if (!input || typeof input !== "object") return input;
    return Object.fromEntries(
      Object.entries(input as Record<string, unknown>)
        .filter(([key]) => !forbiddenKey.test(key))
        .slice(0, 100)
        .map(([key, item]) => [key, visit(item, depth + 1)])
    );
  };
  return visit(value ?? {}, 0) as Record<string, unknown>;
}

export async function submitKgGraphFeedback(
  supabase: InsertClient,
  userId: string,
  input: KgFeedbackInput
): Promise<{ id: string; createdAt: string }> {
  const { data, error } = await supabase
    .from("kg_graph_feedback_events")
    .insert({
      product_surface: input.productSurface,
      release_id: input.releaseId ?? null,
      response_or_retrieval_id: input.responseOrRetrievalId ?? null,
      neighborhood_slugs: input.neighborhoodSlugs ?? [],
      entity_ids: input.entityIds ?? [],
      relationship_ids: input.relationshipIds ?? [],
      feedback_type: input.feedbackType,
      severity: input.severity ?? "low",
      user_query: sanitizeKgFeedbackText(input.userQuery, 2000),
      explanation: sanitizeKgFeedbackText(input.explanation, 4000),
      user_role: input.userRole ?? null,
      supporting_source: sanitizeKgFeedbackText(input.supportingSource, 1000),
      product_context: sanitizeKgProductContext(input.productContext),
      created_by: userId,
    })
    .select("id,created_at")
    .single();
  if (error || !data) throw new Error(`KG feedback submission failed: ${error?.message ?? "missing result"}`);
  return { id: data.id, createdAt: data.created_at };
}
