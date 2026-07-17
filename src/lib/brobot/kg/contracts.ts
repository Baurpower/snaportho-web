import type {
  BroBotChatIntent,
  BroBotChatMode,
  BroBotClinicalContext,
  BroBotResponseDepth,
  BroBotTrainingLevel,
} from "@/lib/brobot/chat/types";

export const BROBOT_KG_POLICY_VERSION = "brobot-kg-shadow-v1";
export const BROBOT_KG_PACKET_SCHEMA_VERSION = "brobot-kg-packet-v1";
export const BROBOT_KG_PINNED_RELEASE_ID = "kg-beta-20260716-002";

export type BroBotKgFeatureMode = "off" | "shadow" | "enabled";
export type BroBotKgRetrievalStatus =
  | "hit"
  | "partial"
  | "miss"
  | "bypass"
  | "error"
  | "timeout";

export type BroBotKgDecision = {
  eligible: boolean;
  action: "retrieve" | "lightweight_resolve" | "bypass";
  score: number;
  reasons: string[];
  bypassReason?: string;
};

export type BroBotKgCandidate = {
  entityId: string;
  label: string;
  entityType: string;
  neighborhoodSlugs: string[];
  lexicalScore: number;
  aliasScore: number;
  sessionScore: number;
  modeScore: number;
  coverageScore: number;
  finalScore: number;
};

export type BroBotKgFact = {
  relationshipId: string;
  subjectId: string;
  subjectLabel: string;
  predicate: string;
  objectId: string;
  objectLabel: string;
  score: number;
  reviewTier: string;
  riskTier: string;
  provenanceStatus: string;
};

export type BroBotKgPacket = {
  retrievalId: string;
  releaseId: string;
  status: BroBotKgRetrievalStatus;
  anchors: BroBotKgCandidate[];
  facts: BroBotKgFact[];
  neighborhoodSlugs: string[];
  coverage: "full" | "partial" | "unknown";
  limitations: string[];
  tokenEstimate: number;
};

export type BroBotKgGapType =
  | "missing_neighborhood"
  | "missing_entity"
  | "missing_alias"
  | "missing_relationship"
  | "missing_predicate_family"
  | "weak_candidate_ranking"
  | "irrelevant_traversal"
  | "empty_packet_after_filtering"
  | "partial_neighborhood_coverage"
  | "missing_claim"
  | "missing_decision_point"
  | "missing_provenance"
  | "review_tier_limitation";

export type BroBotKgGapSignal = {
  gapType: BroBotKgGapType;
  normalizedConcept: string;
  candidateEntityId?: string;
  candidateNeighborhood?: string;
  confidence: number;
  reasons: string[];
};

export type BroBotKgTrace = {
  requestId: string;
  retrievalId: string;
  releaseId?: string;
  decision: BroBotKgDecision;
  candidates: BroBotKgCandidate[];
  selectedEntityIds: string[];
  selectedRelationshipIds: string[];
  neighborhoodSlugs: string[];
  predicateFamilies: string[];
  cacheStatus: string;
  stageTimingsMs: Record<string, number>;
  configuredDeadlineMs: number;
  elapsedLatencyMs: number;
  timeoutStage?:
    | "deadline_before_rpc"
    | "rpc_timeout"
    | "rpc_completed_after_deadline"
    | "response_parse_timeout"
    | "packet_construction_timeout"
    | "unknown_timeout";
  rpcStarted: boolean;
  rpcCompleted: boolean;
  safeErrorCode?: string;
  safeErrorStage?: string;
  answerInfluenced: false;
  retrievalMode: "shadow";
  packetTokenEstimate: number;
  status: BroBotKgRetrievalStatus;
  failureReason?: string;
  policyVersion: string;
  packetSchemaVersion: string;
  gaps: BroBotKgGapSignal[];
};

export type BroBotKgRetrievalInput = {
  requestId: string;
  query: string;
  intent: BroBotChatIntent;
  clinicalContext: BroBotClinicalContext;
  responseDepth: BroBotResponseDepth;
  trainingLevel: BroBotTrainingLevel;
  selectedBranch?: { id?: string; label?: string };
  conversationTopic?: string | null;
};

export type BroBotKgShadowResult = {
  mode: BroBotKgFeatureMode;
  packet: BroBotKgPacket | null;
  trace: BroBotKgTrace;
};

export type BroBotKgModePolicy = {
  entityTypes: string[];
  predicateFamilies: string[];
  maxAnchorsByDepth: Record<BroBotResponseDepth, number>;
  maxEntitiesByDepth: Record<BroBotResponseDepth, number>;
  maxRelationshipsByDepth: Record<BroBotResponseDepth, number>;
  maxNeighborhoodsByDepth: Record<BroBotResponseDepth, number>;
  tokenBudgetByDepth: Record<BroBotResponseDepth, number>;
};

export type BroBotKgDecisionInput = {
  query: string;
  mode: Exclude<BroBotChatMode, "auto">;
  intent: BroBotChatIntent;
  clinicalContext: BroBotClinicalContext;
  responseDepth: BroBotResponseDepth;
  selectedBranch?: { id?: string; label?: string };
  conversationTopic?: string | null;
};
