import { createAdminClient } from "@/lib/supabase/admin";
import { buildBroBotClinicalContextFromIntent } from "@/lib/brobot/chat/clinical-context";
import { BoundedTtlCache, normalizeKgQuery } from "./cache";
import {
  BROBOT_KG_RETRIEVAL_DEADLINE_MS,
  getBroBotClaimsGroundingMode,
  getBroBotKgFeatureMode,
  getBroBotKnowledgeRetrievalVersion,
} from "./config";
import {
  BROBOT_KG_PINNED_RELEASE_ID,
  BROBOT_KNOWLEDGE_PACKET_SCHEMA_VERSION,
  BROBOT_KNOWLEDGE_POLICY_VERSION,
  BROBOT_KNOWLEDGE_POLICY_VERSION_V3,
  type BroBotKgCandidate,
  type BroBotKgFact,
  type BroBotKgPacket,
  type BroBotKnowledgeCardCandidate,
  type BroBotKnowledgeClaim,
  type BroBotKgRetrievalInput,
  type BroBotKgShadowResult,
} from "./contracts";
import { classifyBroBotKgGaps } from "./gaps";
import { getBroBotKgModePolicy } from "./mode-policies";
import { decideBroBotKgRetrieval } from "./policy";
import { buildQueryUnderstanding } from "./query-understanding";
import { rerankClaims, type BroBotRerankCandidate } from "./rerank";

type RpcPayload = {
  releaseId: string;
  coverage: "full" | "partial" | "unknown";
  candidates: BroBotKgCandidate[];
  facts: BroBotKgFact[];
  claims?: BroBotKnowledgeClaim[];
  cardCandidates?: BroBotKnowledgeCardCandidate[];
  neighborhoodSlugs: string[];
  limitations?: string[];
  channelCounts?: Record<string, number>;
  termIdf?: Array<{ term: string; idf: number }>;
};

/** v3 pool rows carry pool-score fields beyond the packet claim shape. */
type V3PoolRow = BroBotKnowledgeClaim & {
  poolScore?: unknown;
  channels?: unknown;
  graphDistance?: unknown;
  mentionCoherence?: unknown;
  components?: unknown;
};

function toFiniteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Maps v3 pool rows to rerank candidates. Malformed rows are dropped, never fatal. */
export function mapV3PoolToCandidates(
  rows: BroBotKnowledgeClaim[],
): BroBotRerankCandidate[] {
  const candidates: BroBotRerankCandidate[] = [];
  for (const row of rows) {
    const c = row as V3PoolRow;
    if (
      typeof c.claimId !== "string" ||
      !c.claimId ||
      typeof c.claimText !== "string" ||
      !c.claimText
    )
      continue;
    const comp = (c.components ?? {}) as Record<string, unknown>;
    candidates.push({
      claimId: c.claimId,
      claimVersionId:
        typeof c.claimVersionId === "string" ? c.claimVersionId : "",
      claimText: c.claimText,
      claimType: typeof c.claimType === "string" ? c.claimType : "",
      predicate: typeof c.predicate === "string" ? c.predicate : "",
      objectText: c.objectText ?? null,
      qualifiers: c.qualifiers,
      importanceLevel: c.importanceLevel ?? null,
      primaryEntityId: c.primaryEntityId ?? null,
      primaryEntityLabel: c.primaryEntityLabel ?? null,
      approvalMethod: c.approvalMethod ?? null,
      reviewStatus: c.reviewStatus ?? null,
      contentSource: c.contentSource ?? null,
      algorithmVersion: c.algorithmVersion ?? null,
      trustTier: c.trustTier === "A" ? "A" : "B",
      poolScore: toFiniteNumber(c.poolScore ?? c.score),
      channels: Array.isArray(c.channels)
        ? c.channels.filter(
            (entry): entry is string => typeof entry === "string",
          )
        : [],
      graphDistance: toFiniteNumber(c.graphDistance),
      mentionCoherence:
        c.mentionCoherence === "anchor" ||
        c.mentionCoherence === "related" ||
        c.mentionCoherence === "unrelated"
          ? c.mentionCoherence
          : "none",
      components: {
        ftsRank: toFiniteNumber(comp.ftsRank),
        trigram: toFiniteNumber(comp.trigram),
        termCoverage: toFiniteNumber(comp.termCoverage),
        idfCoverage: toFiniteNumber(comp.idfCoverage),
        termMatched: toFiniteNumber(comp.termMatched),
        phraseBonus: toFiniteNumber(comp.phraseBonus),
        entityScore: toFiniteNumber(comp.entityScore),
        relScore: toFiniteNumber(comp.relScore),
        cardFtsRank: toFiniteNumber(comp.cardFtsRank),
        cardCoverage: toFiniteNumber(comp.cardCoverage),
        modeFit: toFiniteNumber(comp.modeFit),
        facetFit: toFiniteNumber(comp.facetFit),
        trust: toFiniteNumber(comp.trust),
        importance: toFiniteNumber(comp.importance),
        qualityPenalty: toFiniteNumber(comp.qualityPenalty),
      },
    });
  }
  return candidates;
}

const packetCache = new BoundedTtlCache<RpcPayload>(500, 30 * 60_000);

type KnowledgeCacheKeyInput = {
  retrievalVersion: string;
  policyVersion: string;
  normalizedQuery: string;
  mode: string;
  subintent: string;
  responseDepth: string;
  queryUnderstanding?: {
    variants: string[];
    terms: string[];
    facets: string[];
  } | null;
};

/**
 * Cache identity for every value that changes the retrieval RPC. Arrays are
 * sorted so semantically equivalent query-understanding output shares a hit,
 * while the same short prompt in a different conversation cannot collide.
 */
export function buildBroBotKnowledgeCacheKey(
  input: KnowledgeCacheKeyInput,
): string {
  const stable = (values: string[] | undefined) => [...(values ?? [])].sort();
  return JSON.stringify({
    releaseId: BROBOT_KG_PINNED_RELEASE_ID,
    retrievalVersion: input.retrievalVersion,
    policyVersion: input.policyVersion,
    packetSchemaVersion: BROBOT_KNOWLEDGE_PACKET_SCHEMA_VERSION,
    normalizedQuery: input.normalizedQuery,
    mode: input.mode,
    subintent: input.subintent,
    responseDepth: input.responseDepth,
    variants: stable(input.queryUnderstanding?.variants),
    terms: stable(input.queryUnderstanding?.terms),
    facets: stable(input.queryUnderstanding?.facets),
  });
}

function estimateTokens(payload: RpcPayload) {
  const chars = JSON.stringify({
    candidates: payload.candidates,
    facts: payload.facts,
    claims: payload.claims,
    cardCandidates: payload.cardCandidates,
    limitations: payload.limitations,
  }).length;
  return Math.min(1200, Math.ceil(chars / 4));
}

function boundFacts(input: {
  payload: RpcPayload;
  anchors: BroBotKgCandidate[];
  maxEntities: number;
  maxRelationships: number;
  tokenBudget: number;
}): { facts: BroBotKgFact[]; tokenEstimate: number } {
  const entityIds = new Set(input.anchors.map((anchor) => anchor.entityId));
  const facts: BroBotKgFact[] = [];

  for (const fact of input.payload.facts) {
    if (facts.length >= input.maxRelationships) break;
    const nextIds = new Set(entityIds);
    nextIds.add(fact.subjectId);
    nextIds.add(fact.objectId);
    if (nextIds.size > input.maxEntities) continue;
    const nextFacts = [...facts, fact];
    const nextEstimate = estimateTokens({
      ...input.payload,
      candidates: input.anchors,
      facts: nextFacts,
    });
    if (nextEstimate > input.tokenBudget) break;
    facts.push(fact);
    nextIds.forEach((id) => entityIds.add(id));
  }

  return {
    facts,
    tokenEstimate: estimateTokens({
      ...input.payload,
      candidates: input.anchors,
      facts,
    }),
  };
}

function emptyResult(input: {
  requestId: string;
  retrievalId: string;
  mode: ReturnType<typeof getBroBotKgFeatureMode>;
  decision: ReturnType<typeof decideBroBotKgRetrieval>;
  status: "bypass" | "error" | "timeout";
  failureReason?: string;
  timings?: Record<string, number>;
  elapsedLatencyMs: number;
  timeoutStage?: BroBotKgShadowResult["trace"]["timeoutStage"];
  rpcStarted?: boolean;
  rpcCompleted?: boolean;
  safeErrorCode?: string;
  safeErrorStage?: string;
  policyVersion?: string;
}): BroBotKgShadowResult {
  return {
    mode: input.mode,
    packet: null,
    trace: {
      requestId: input.requestId,
      retrievalId: input.retrievalId,
      decision: input.decision,
      candidates: [],
      selectedEntityIds: [],
      selectedRelationshipIds: [],
      selectedClaimIds: [],
      candidateCardIds: [],
      neighborhoodSlugs: [],
      predicateFamilies: [],
      cacheStatus: "not_applicable",
      stageTimingsMs: input.timings ?? {},
      configuredDeadlineMs: BROBOT_KG_RETRIEVAL_DEADLINE_MS,
      elapsedLatencyMs: input.elapsedLatencyMs,
      timeoutStage: input.timeoutStage,
      rpcStarted: input.rpcStarted ?? false,
      rpcCompleted: input.rpcCompleted ?? false,
      safeErrorCode: input.safeErrorCode,
      safeErrorStage: input.safeErrorStage,
      answerInfluenced: false,
      retrievalMode:
        getBroBotClaimsGroundingMode() === "enabled" ? "enabled" : "shadow",
      packetTokenEstimate: 0,
      status: input.status,
      failureReason: input.failureReason,
      policyVersion: input.policyVersion ?? BROBOT_KNOWLEDGE_POLICY_VERSION,
      packetSchemaVersion: BROBOT_KNOWLEDGE_PACKET_SCHEMA_VERSION,
      gaps: [],
    },
  };
}

export async function retrieveBroBotKgShadow(
  input: Omit<BroBotKgRetrievalInput, "clinicalContext"> & {
    clinicalContext?: BroBotKgRetrievalInput["clinicalContext"];
  },
): Promise<BroBotKgShadowResult> {
  const overallStarted = performance.now();
  const mode = getBroBotKgFeatureMode();
  const retrievalId = crypto.randomUUID();
  const clinicalContext =
    input.clinicalContext ??
    buildBroBotClinicalContextFromIntent({
      message: input.query,
      intent: input.intent,
      selectedBranch: input.selectedBranch,
    });
  const decisionStarted = performance.now();
  const decision = decideBroBotKgRetrieval({
    query: input.query,
    mode: input.intent.mode,
    intent: input.intent,
    clinicalContext,
    responseDepth: input.responseDepth,
    selectedBranch: input.selectedBranch,
    conversationTopic: input.conversationTopic,
  });
  const stageTimingsMs: Record<string, number> = {
    kg_decision: Math.round((performance.now() - decisionStarted) * 100) / 100,
  };

  const retrievalVersion = getBroBotKnowledgeRetrievalVersion();
  const policyVersion =
    retrievalVersion === "v3"
      ? BROBOT_KNOWLEDGE_POLICY_VERSION_V3
      : BROBOT_KNOWLEDGE_POLICY_VERSION;
  const maxClaims =
    input.responseDepth === "quick"
      ? 5
      : input.responseDepth === "deep"
        ? 12
        : 8;

  if (mode === "off" || decision.action === "bypass") {
    return emptyResult({
      requestId: input.requestId,
      retrievalId,
      mode,
      decision,
      status: "bypass",
      timings: stageTimingsMs,
      elapsedLatencyMs:
        Math.round((performance.now() - overallStarted) * 100) / 100,
      policyVersion,
    });
  }

  const policy = getBroBotKgModePolicy(input.intent.mode);
  const normalizedQuery = normalizeKgQuery(
    [input.intent.procedureOrTopic, input.selectedBranch?.label, input.query]
      .filter(Boolean)
      .join(" "),
  ).slice(0, 240);
  let queryUnderstanding: ReturnType<typeof buildQueryUnderstanding> | null =
    null;
  if (retrievalVersion === "v3") {
    const quStarted = performance.now();
    queryUnderstanding = buildQueryUnderstanding({
      message: input.query,
      intent: input.intent,
      clinicalContext,
      selectedBranch: input.selectedBranch,
      conversationContext: input.conversationTopic,
    });
    stageTimingsMs.kg_query_understanding =
      Math.round((performance.now() - quStarted) * 100) / 100;
  }
  const cacheKey = buildBroBotKnowledgeCacheKey({
    retrievalVersion,
    policyVersion,
    normalizedQuery,
    mode: input.intent.mode,
    subintent: input.intent.subintent,
    responseDepth: input.responseDepth,
    queryUnderstanding,
  });
  const cached = packetCache.get(cacheKey);
  let payload: RpcPayload;
  let cacheStatus = "hit";
  let rpcStarted = false;
  let rpcCompleted = false;
  let activeStage = "cache_lookup";

  try {
    if (cached) {
      payload = cached;
      stageTimingsMs.kg_candidate_generation = 0;
      stageTimingsMs.kg_subgraph_retrieval = 0;
    } else {
      cacheStatus = "miss";
      activeStage = "supabase_client_initialization";
      const clientStarted = performance.now();
      const supabase = createAdminClient();
      stageTimingsMs.kg_supabase_client_initialization =
        Math.round((performance.now() - clientStarted) * 100) / 100;
      const retrievalStarted = performance.now();
      const abortController = new AbortController();
      let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
      try {
        activeStage = "rpc_network_call";
        rpcStarted = true;
        const rpcPromise = (
          retrievalVersion === "v3" && queryUnderstanding
            ? supabase.rpc("retrieve_brobot_knowledge_v3", {
                p_release_id: BROBOT_KG_PINNED_RELEASE_ID,
                p_query: normalizedQuery,
                p_variants: queryUnderstanding.variants,
                p_terms: queryUnderstanding.terms,
                p_facets: queryUnderstanding.facets,
                p_entity_types: policy.entityTypes,
                p_predicates: policy.predicateFamilies,
                p_max_candidates: 8,
                p_max_entities: policy.maxEntitiesByDepth[input.responseDepth],
                p_max_relationships:
                  decision.action === "lightweight_resolve"
                    ? 0
                    : policy.maxRelationshipsByDepth[input.responseDepth],
                p_max_neighborhoods:
                  policy.maxNeighborhoodsByDepth[input.responseDepth],
                p_mode: input.intent.mode,
                p_subintent: input.intent.subintent,
                p_max_claims: maxClaims,
                p_max_cards: 8,
                p_pool_size: 48,
              })
            : supabase.rpc("retrieve_brobot_knowledge_v2", {
                p_release_id: BROBOT_KG_PINNED_RELEASE_ID,
                p_query: normalizedQuery,
                p_entity_types: policy.entityTypes,
                p_neighborhood_hints: [],
                p_predicates: policy.predicateFamilies,
                p_max_candidates: 8,
                p_max_entities: policy.maxEntitiesByDepth[input.responseDepth],
                p_max_relationships:
                  decision.action === "lightweight_resolve"
                    ? 0
                    : policy.maxRelationshipsByDepth[input.responseDepth],
                p_max_neighborhoods:
                  policy.maxNeighborhoodsByDepth[input.responseDepth],
                p_mode: input.intent.mode,
                p_subintent: input.intent.subintent,
                p_max_claims: maxClaims,
                p_max_cards: 8,
              })
        ).abortSignal(abortController.signal);
        const timeoutPromise = new Promise<never>((_resolve, reject) => {
          deadlineTimer = setTimeout(() => {
            abortController.abort();
            reject(
              new DOMException("KG retrieval deadline exceeded", "AbortError"),
            );
          }, BROBOT_KG_RETRIEVAL_DEADLINE_MS);
        });
        const { data, error } = await Promise.race([
          rpcPromise,
          timeoutPromise,
        ]);
        rpcCompleted = true;
        if (error) throw new Error(error.message);
        activeStage = "response_parse";
        payload = data as RpcPayload;
        if (!payload || payload.releaseId !== BROBOT_KG_PINNED_RELEASE_ID) {
          throw new Error("KG release pin mismatch");
        }
      } finally {
        if (deadlineTimer) clearTimeout(deadlineTimer);
        stageTimingsMs.kg_subgraph_retrieval =
          Math.round((performance.now() - retrievalStarted) * 100) / 100;
      }
      packetCache.set(cacheKey, payload);
    }

    activeStage = "packet_construction";
    const assemblyStarted = performance.now();
    const shadowNote =
      getBroBotClaimsGroundingMode() === "enabled"
        ? []
        : ["Shadow only: claims were not supplied to answer generation."];
    let packetClaims: BroBotKnowledgeClaim[];
    let packetCoverage: BroBotKgPacket["coverage"];
    let packetLimitations: string[];
    let claimConflicts: BroBotKgPacket["claimConflicts"];
    let claimScoreComponents:
      | NonNullable<BroBotKgShadowResult["trace"]["claimScoreComponents"]>
      | undefined;
    let exclusionReasons: string[] | undefined;
    let rerankVersion: string | undefined;
    let poolSize: number | undefined;
    if (retrievalVersion === "v3" && queryUnderstanding) {
      const rerankStarted = performance.now();
      const candidates = mapV3PoolToCandidates(payload.claims ?? []);
      poolSize = candidates.length;
      const reranked = rerankClaims({
        query: normalizedQuery,
        terms: queryUnderstanding.terms,
        facets: queryUnderstanding.facets,
        candidates,
        termIdf: payload.termIdf,
        anchors: payload.candidates,
        unsupportedTopic: queryUnderstanding.unsupportedTopic,
        supportLevel: queryUnderstanding.support.level,
        params: { maxClaims },
      });
      stageTimingsMs.kg_rerank =
        Math.round((performance.now() - rerankStarted) * 100) / 100;
      packetClaims = reranked.selected.map((claim) => ({
        claimId: claim.claimId,
        claimVersionId: claim.claimVersionId,
        claimText: claim.claimText,
        claimType: claim.claimType,
        predicate: claim.predicate,
        objectText: claim.objectText ?? "",
        qualifiers:
          claim.qualifiers && typeof claim.qualifiers === "object"
            ? (claim.qualifiers as Record<string, unknown>)
            : {},
        importanceLevel: claim.importanceLevel ?? "",
        primaryEntityId: claim.primaryEntityId ?? "",
        primaryEntityLabel: claim.primaryEntityLabel ?? "",
        approvalMethod: claim.approvalMethod ?? "",
        reviewStatus: claim.reviewStatus ?? "",
        contentSource: claim.contentSource ?? "",
        algorithmVersion: claim.algorithmVersion ?? "",
        trustTier: claim.trustTier,
        score: claim.finalScore,
        selectionReasons: claim.channels,
      }));
      packetCoverage = reranked.coverage;
      packetLimitations = [
        ...(payload.limitations ?? []),
        ...reranked.limitations,
        ...shadowNote,
      ];
      claimConflicts = reranked.conflicts;
      rerankVersion = reranked.version;
      claimScoreComponents = reranked.selected.map((claim) => ({
        claimId: claim.claimId,
        finalScore: claim.finalScore,
        parts: claim.scoreParts,
      }));
      const reasonCounts = new Map<string, number>();
      for (const dropped of reranked.dropped) {
        reasonCounts.set(
          dropped.reason,
          (reasonCounts.get(dropped.reason) ?? 0) + 1,
        );
      }
      exclusionReasons = [...reasonCounts.entries()].map(
        ([reason, count]) => `${reason}:${count}`,
      );
    } else {
      packetClaims = (payload.claims ?? []).slice(0, maxClaims);
      packetCoverage = payload.coverage;
      packetLimitations = [...(payload.limitations ?? []), ...shadowNote];
    }
    const status =
      retrievalVersion === "v3"
        ? packetClaims.length === 0
          ? (poolSize ?? 0) === 0
            ? "miss"
            : "partial"
          : packetCoverage === "full"
            ? "hit"
            : "partial"
        : payload.candidates.length === 0
          ? "miss"
          : payload.facts.length === 0 || payload.coverage === "partial"
            ? "partial"
            : "hit";
    const anchors = payload.candidates.slice(
      0,
      policy.maxAnchorsByDepth[input.responseDepth],
    );
    const bounded = boundFacts({
      payload,
      anchors,
      maxEntities: policy.maxEntitiesByDepth[input.responseDepth],
      maxRelationships: policy.maxRelationshipsByDepth[input.responseDepth],
      tokenBudget: policy.tokenBudgetByDepth[input.responseDepth],
    });
    const packet: BroBotKgPacket = {
      retrievalId,
      releaseId: payload.releaseId,
      status,
      anchors,
      facts: bounded.facts,
      claims: packetClaims,
      cardCandidates: (payload.cardCandidates ?? []).slice(0, 8),
      neighborhoodSlugs: payload.neighborhoodSlugs.slice(
        0,
        policy.maxNeighborhoodsByDepth[input.responseDepth],
      ),
      coverage: packetCoverage,
      limitations: packetLimitations,
      tokenEstimate: bounded.tokenEstimate,
      claimConflicts,
    };
    stageTimingsMs.kg_packet_assembly =
      Math.round((performance.now() - assemblyStarted) * 100) / 100;
    const gaps = classifyBroBotKgGaps({
      query: normalizedQuery,
      status,
      candidates: payload.candidates,
      facts: payload.facts,
      coverage: payload.coverage,
      requiredPredicateFamilies: policy.predicateFamilies,
    });
    return {
      mode,
      packet,
      trace: {
        requestId: input.requestId,
        retrievalId,
        releaseId: payload.releaseId,
        decision,
        candidates: payload.candidates,
        selectedEntityIds: packet.anchors.map(
          (candidate) => candidate.entityId,
        ),
        selectedRelationshipIds: packet.facts.map(
          (fact) => fact.relationshipId,
        ),
        selectedClaimIds: packet.claims.map((claim) => claim.claimId),
        candidateCardIds: packet.cardCandidates.map((card) => card.cardId),
        neighborhoodSlugs: packet.neighborhoodSlugs,
        predicateFamilies: policy.predicateFamilies,
        cacheStatus,
        stageTimingsMs,
        configuredDeadlineMs: BROBOT_KG_RETRIEVAL_DEADLINE_MS,
        elapsedLatencyMs:
          Math.round((performance.now() - overallStarted) * 100) / 100,
        rpcStarted,
        rpcCompleted,
        answerInfluenced:
          getBroBotClaimsGroundingMode() === "enabled" &&
          packet.claims.length > 0,
        retrievalMode:
          getBroBotClaimsGroundingMode() === "enabled" ? "enabled" : "shadow",
        packetTokenEstimate: bounded.tokenEstimate,
        status,
        policyVersion,
        packetSchemaVersion: BROBOT_KNOWLEDGE_PACKET_SCHEMA_VERSION,
        gaps,
        queryVariants: queryUnderstanding?.variants,
        requestedFacets: queryUnderstanding?.facets,
        supportLevel: queryUnderstanding?.support.level,
        retrievalChannels: payload.channelCounts,
        exclusionReasons,
        rerankVersion,
        poolSize,
        claimScoreComponents,
      },
    };
  } catch (error) {
    const timedOut =
      error instanceof DOMException && error.name === "AbortError";
    const timeoutStage = timedOut
      ? activeStage === "rpc_network_call"
        ? "rpc_timeout"
        : activeStage === "response_parse"
          ? "response_parse_timeout"
          : activeStage === "packet_construction"
            ? "packet_construction_timeout"
            : activeStage === "supabase_client_initialization"
              ? "deadline_before_rpc"
              : "unknown_timeout"
      : undefined;
    return emptyResult({
      requestId: input.requestId,
      retrievalId,
      mode,
      decision,
      status: timedOut ? "timeout" : "error",
      failureReason:
        error instanceof Error ? error.message : "Unknown KG retrieval failure",
      timings: stageTimingsMs,
      elapsedLatencyMs:
        Math.round((performance.now() - overallStarted) * 100) / 100,
      timeoutStage,
      rpcStarted,
      rpcCompleted,
      safeErrorCode: timedOut ? "KG_RETRIEVAL_DEADLINE" : "KG_RPC_ERROR",
      safeErrorStage: activeStage,
      policyVersion,
    });
  }
}

/**
 * Builds a trace-compatible bypass result without touching cache or storage.
 * The tiered fast path uses this so downstream telemetry contracts remain
 * stable while KG work is moved to the durable enrichment queue.
 */
export function createBroBotKgBypassResult(
  input: Omit<BroBotKgRetrievalInput, "clinicalContext"> & {
    clinicalContext?: BroBotKgRetrievalInput["clinicalContext"];
  },
): BroBotKgShadowResult {
  const clinicalContext =
    input.clinicalContext ??
    buildBroBotClinicalContextFromIntent({
      message: input.query,
      intent: input.intent,
      selectedBranch: input.selectedBranch,
    });
  const decision = decideBroBotKgRetrieval({
    query: input.query,
    mode: input.intent.mode,
    intent: input.intent,
    clinicalContext,
    responseDepth: input.responseDepth,
    selectedBranch: input.selectedBranch,
    conversationTopic: input.conversationTopic,
  });
  return emptyResult({
    requestId: input.requestId,
    retrievalId: crypto.randomUUID(),
    mode: getBroBotKgFeatureMode(),
    decision: {
      ...decision,
      action: "bypass",
      eligible: false,
      reasons: ["bypass:tier1_fast_path"],
    },
    status: "bypass",
    failureReason: "tier1_fast_path",
    elapsedLatencyMs: 0,
    timings: { kg_decision: 0 },
  });
}
