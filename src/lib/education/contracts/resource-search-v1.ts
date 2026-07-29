export const RESOURCE_SEARCH_CONTRACT_VERSION = "snaportho-resource-search.v1" as const;
export const RESOURCE_SEARCH_MAX_RESULTS = 50 as const;

export type ResourceSearchResolutionStatus =
  | "resolved"
  | "not_registered"
  | "unmapped"
  | "concept_searched"
  | "ambiguous";

export type ResourceSearchRequestV1 = {
  contractVersion: typeof RESOURCE_SEARCH_CONTRACT_VERSION;
  query: {
    kind: "external_question" | "topic_page";
    provider: "orthobullets";
    nativeId: string;
    testedConcept?: string;
    conceptSummary?: string;
    searchKeywords?: string[];
    sections?: Array<{
      id: string;
      heading: string;
      concepts: string[];
      priority: number;
    }>;
  };
  scopes: ["direct"] | ["direct", "latest_deck_concept"];
  limit: number;
};

export type ResourceSearchEntityV1 = {
  canonicalEntityId: string;
  label: string;
  mappingRole: "tests";
  reviewConfidence: number;
  relevanceScore?: number;
  matchedSectionIds?: string[];
};

export type ResourceSearchCardV1 = {
  canonicalCardId: string;
  canonicalCardVersionId: string;
  contentHash: string;
  noteGuid: string;
  cardOrdinal: number;
  tier: "direct_reviewed" | "latest_deck_concept";
  mappingRole: "tests" | "teaches" | "explains" | "demonstrates";
  sharedCanonicalEntityIds: string[];
  reasonCodes: ["reviewed_exact_entity_overlap"] | ["latest_deck_concept_coverage"];
  reviewConfidence: number;
};

export type ResourceSearchResponseV1 = {
  contractVersion: typeof RESOURCE_SEARCH_CONTRACT_VERSION;
  resolution: {
    status: ResourceSearchResolutionStatus;
    provider: "orthobullets";
    nativeId: string;
    externalQuestionId: string | null;
    canonicalEntities: ResourceSearchEntityV1[];
  };
  results: ResourceSearchCardV1[];
  discovery: {
    status: "not_needed" | "review_required" | "unavailable";
    reason:
      | null
      | "question_not_registered"
      | "question_mapping_missing"
      | "card_mapping_missing";
  };
  trace: {
    searchId: string;
    algorithmVersion: "precision_first_direct_or_thresholded_concept.v3";
  };
};

const SAFE_NATIVE_ID = /^[A-Za-z0-9._:-]{1,200}$/;
const ORTHOBULLETS_DISPLAY_ID = /^(OBQ\d{2})[.-](\d+)$/i;

export function normalizeResourceSearchNativeId(
  provider: "orthobullets",
  nativeId: string,
): string {
  const trimmed = nativeId.trim();
  if (provider !== "orthobullets") return trimmed;
  const match = ORTHOBULLETS_DISPLAY_ID.exec(trimmed);
  return match ? `${match[1].toUpperCase()}-${match[2]}` : trimmed;
}

export function isResourceSearchRequestV1(value: unknown): value is ResourceSearchRequestV1 {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  const query = row.query as Record<string, unknown> | undefined;
  return row.contractVersion === RESOURCE_SEARCH_CONTRACT_VERSION
    && (query?.kind === "external_question" || query?.kind === "topic_page")
    && query.provider === "orthobullets"
    && typeof query.nativeId === "string"
    && SAFE_NATIVE_ID.test(query.nativeId)
    && (query.testedConcept === undefined
      || (typeof query.testedConcept === "string" && query.testedConcept.trim().length >= 3 && query.testedConcept.length <= 300))
    && (query.conceptSummary === undefined
      || (typeof query.conceptSummary === "string" && query.conceptSummary.trim().length >= 3 && query.conceptSummary.length <= 600))
    && (query.searchKeywords === undefined
      || (Array.isArray(query.searchKeywords)
        && query.searchKeywords.length <= 24
        && query.searchKeywords.every((value) => typeof value === "string" && value.trim().length >= 3 && value.length <= 80)))
    && (query.sections === undefined
      || (Array.isArray(query.sections)
        && query.sections.length <= 30
        && query.sections.every((section) => {
          if (!section || typeof section !== "object") return false;
          const item = section as Record<string, unknown>;
          return typeof item.id === "string" && item.id.trim().length >= 1 && item.id.length <= 80
            && typeof item.heading === "string" && item.heading.trim().length >= 1 && item.heading.length <= 240
            && Array.isArray(item.concepts) && item.concepts.length >= 1 && item.concepts.length <= 12
            && item.concepts.every((concept) => typeof concept === "string" && concept.trim().length >= 2 && concept.length <= 80)
            && Number.isInteger(item.priority) && Number(item.priority) >= 1 && Number(item.priority) <= 5;
        })))
    && (query.kind !== "topic_page" || (Array.isArray(query.sections) && query.sections.length > 0))
    && Array.isArray(row.scopes)
    && (row.scopes.length === 1 || row.scopes.length === 2)
    && row.scopes[0] === "direct"
    && (row.scopes.length === 1 || row.scopes[1] === "latest_deck_concept")
    && (row.scopes.length === 1
      || (typeof query.testedConcept === "string" && query.testedConcept.trim().length >= 3))
    && Number.isInteger(row.limit)
    && Number(row.limit) >= 1
    && Number(row.limit) <= RESOURCE_SEARCH_MAX_RESULTS;
}
