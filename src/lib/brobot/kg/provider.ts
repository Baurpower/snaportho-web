import { createAdminClient } from "@/lib/supabase/admin";
import { buildBroBotClinicalContextFromIntent } from "@/lib/brobot/chat/clinical-context";
import { BoundedTtlCache, normalizeKgQuery } from "./cache";
import { BROBOT_KG_RETRIEVAL_DEADLINE_MS, getBroBotKgFeatureMode } from "./config";
import {
  BROBOT_KG_PACKET_SCHEMA_VERSION,
  BROBOT_KG_PINNED_RELEASE_ID,
  BROBOT_KG_POLICY_VERSION,
  type BroBotKgCandidate,
  type BroBotKgFact,
  type BroBotKgPacket,
  type BroBotKgRetrievalInput,
  type BroBotKgShadowResult,
} from "./contracts";
import { classifyBroBotKgGaps } from "./gaps";
import { getBroBotKgModePolicy } from "./mode-policies";
import { decideBroBotKgRetrieval } from "./policy";

type RpcPayload = {
  releaseId: string;
  coverage: "full" | "partial" | "unknown";
  candidates: BroBotKgCandidate[];
  facts: BroBotKgFact[];
  neighborhoodSlugs: string[];
  limitations?: string[];
};

const packetCache = new BoundedTtlCache<RpcPayload>(500, 30 * 60_000);

function estimateTokens(payload: RpcPayload) {
  const chars = JSON.stringify({
    candidates: payload.candidates,
    facts: payload.facts,
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
      neighborhoodSlugs: [],
      predicateFamilies: [],
      cacheStatus: "not_applicable",
      stageTimingsMs: input.timings ?? {},
      packetTokenEstimate: 0,
      status: input.status,
      failureReason: input.failureReason,
      policyVersion: BROBOT_KG_POLICY_VERSION,
      packetSchemaVersion: BROBOT_KG_PACKET_SCHEMA_VERSION,
      gaps: [],
    },
  };
}

export async function retrieveBroBotKgShadow(
  input: Omit<BroBotKgRetrievalInput, "clinicalContext"> & {
    clinicalContext?: BroBotKgRetrievalInput["clinicalContext"];
  }
): Promise<BroBotKgShadowResult> {
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

  if (mode === "off" || decision.action === "bypass") {
    return emptyResult({ requestId: input.requestId, retrievalId, mode, decision, status: "bypass", timings: stageTimingsMs });
  }

  const policy = getBroBotKgModePolicy(input.intent.mode);
  const normalizedQuery = normalizeKgQuery(
    [input.intent.procedureOrTopic, input.selectedBranch?.label, input.query].filter(Boolean).join(" ")
  ).slice(0, 240);
  const cacheKey = [
    BROBOT_KG_PINNED_RELEASE_ID,
    BROBOT_KG_POLICY_VERSION,
    BROBOT_KG_PACKET_SCHEMA_VERSION,
    normalizedQuery,
    input.intent.mode,
    input.intent.subintent,
    input.responseDepth,
  ].join(":");
  const cached = packetCache.get(cacheKey);
  let payload: RpcPayload;
  let cacheStatus = "hit";

  try {
    if (cached) {
      payload = cached;
      stageTimingsMs.kg_candidate_generation = 0;
      stageTimingsMs.kg_subgraph_retrieval = 0;
    } else {
      cacheStatus = "miss";
      const retrievalStarted = performance.now();
      try {
        const rpcPromise = createAdminClient().rpc("retrieve_brobot_kg_shadow", {
            p_release_id: BROBOT_KG_PINNED_RELEASE_ID,
            p_query: normalizedQuery,
            p_entity_types: policy.entityTypes,
            p_neighborhood_hints: [],
            p_predicates: policy.predicateFamilies,
            p_max_candidates: 8,
            p_max_entities: policy.maxEntitiesByDepth[input.responseDepth],
            p_max_relationships: decision.action === "lightweight_resolve"
              ? 0
              : policy.maxRelationshipsByDepth[input.responseDepth],
            p_max_neighborhoods: policy.maxNeighborhoodsByDepth[input.responseDepth],
          });
        const timeoutPromise = new Promise<never>((_resolve, reject) => {
          setTimeout(
            () => reject(new DOMException("KG retrieval deadline exceeded", "AbortError")),
            BROBOT_KG_RETRIEVAL_DEADLINE_MS
          );
        });
        const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);
        if (error) throw new Error(error.message);
        payload = data as RpcPayload;
        if (!payload || payload.releaseId !== BROBOT_KG_PINNED_RELEASE_ID) {
          throw new Error("KG release pin mismatch");
        }
      } finally {
        stageTimingsMs.kg_subgraph_retrieval =
          Math.round((performance.now() - retrievalStarted) * 100) / 100;
      }
      packetCache.set(cacheKey, payload);
    }

    const assemblyStarted = performance.now();
    const status =
      payload.candidates.length === 0
        ? "miss"
        : payload.facts.length === 0 || payload.coverage === "partial"
          ? "partial"
          : "hit";
    const anchors = payload.candidates.slice(0, policy.maxAnchorsByDepth[input.responseDepth]);
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
      neighborhoodSlugs: payload.neighborhoodSlugs.slice(0, policy.maxNeighborhoodsByDepth[input.responseDepth]),
      coverage: payload.coverage,
      limitations: [
        ...(payload.limitations ?? []),
        "Shadow only: packet was not supplied to answer generation.",
        "Active release contains no claims or decision points.",
      ],
      tokenEstimate: bounded.tokenEstimate,
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
        selectedEntityIds: packet.anchors.map((candidate) => candidate.entityId),
        selectedRelationshipIds: packet.facts.map((fact) => fact.relationshipId),
        neighborhoodSlugs: packet.neighborhoodSlugs,
        predicateFamilies: policy.predicateFamilies,
        cacheStatus,
        stageTimingsMs,
        packetTokenEstimate: bounded.tokenEstimate,
        status,
        policyVersion: BROBOT_KG_POLICY_VERSION,
        packetSchemaVersion: BROBOT_KG_PACKET_SCHEMA_VERSION,
        gaps,
      },
    };
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    return emptyResult({
      requestId: input.requestId,
      retrievalId,
      mode,
      decision,
      status: timedOut ? "timeout" : "error",
      failureReason: error instanceof Error ? error.message : "Unknown KG retrieval failure",
      timings: stageTimingsMs,
    });
  }
}
