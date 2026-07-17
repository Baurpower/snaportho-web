export type KgProductionEntity = {
  id: string;
  slug: string | null;
  entityType: string;
  preferredLabel: string;
  description: string | null;
  publicationStatus: "beta_active" | "reviewed_active";
  reviewTier: "automated_beta" | "curator_reviewed" | "attending_reviewed";
  provenanceStatus: "complete" | "partial" | "missing" | "disputed";
  riskTier: "low" | "moderate" | "high";
  verificationHash: string;
  sourceRecordIds: string[];
};

export type KgProductionRelationship = {
  id: string;
  subjectEntityId: string;
  predicate: string;
  objectEntityId: string;
  publicationStatus: "beta_active" | "reviewed_active";
  reviewTier: "automated_beta" | "curator_reviewed" | "attending_reviewed";
  provenanceStatus: "complete" | "partial" | "missing" | "disputed";
  riskTier: "low" | "moderate" | "high";
  verificationHash: string;
  sourceRecordIds: string[];
};

export type KgProductionNeighborhood = {
  releaseId: string;
  neighborhoodSlug: string;
  publicationStatus: "beta_active" | "reviewed_active";
  lifecycleState: "production_beta_active" | "production_active";
  reviewTier: "automated_beta" | "curator_reviewed" | "attending_reviewed";
  coverageStatus: "full" | "partial";
  verificationHash: string;
  activatedAt: string;
  entities: KgProductionEntity[];
  relationships: KgProductionRelationship[];
  curriculumBridges: Array<Record<string, unknown>>;
  claims: Array<Record<string, unknown>>;
  decisionPoints: Array<Record<string, unknown>>;
  excludedObjectCount: number;
};

type RpcClient = {
  rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
};

export async function getProductionKgNeighborhood(
  supabase: RpcClient,
  neighborhoodSlug: string
): Promise<KgProductionNeighborhood | null> {
  const slug = neighborhoodSlug.trim();
  if (!slug) return null;
  const { data, error } = await supabase.rpc("get_kg_production_neighborhood", {
    p_neighborhood_slug: slug,
  });
  if (error) throw new Error(`Production KG lookup failed: ${error.message}`);
  return (data as KgProductionNeighborhood | null) ?? null;
}

export type KgProductionTopicMatch = {
  release_id: string;
  neighborhood_slug: string;
  coverage_status: "full" | "partial";
  review_tier: "automated_beta" | "curator_reviewed" | "attending_reviewed";
  matched_entity_id: string;
  matched_slug: string | null;
  matched_label: string;
};

export async function findProductionKgTopics(
  supabase: RpcClient,
  query: string,
  limit = 10
): Promise<KgProductionTopicMatch[]> {
  const normalized = query.trim();
  if (!normalized) return [];
  const { data, error } = await supabase.rpc("find_kg_production_topics", {
    p_query: normalized,
    p_limit: Math.min(Math.max(limit, 1), 50),
  });
  if (error) throw new Error(`Production KG topic lookup failed: ${error.message}`);
  return (data as KgProductionTopicMatch[] | null) ?? [];
}
