import type { CanonicalEntityType } from "../kg-relationship-registry.ts";
import type { CurationRoute } from "../kg-factory/types.ts";

export type GapPriority = "critical" | "high" | "medium" | "low";
export type RequiredReviewer = "none" | "curator" | "clinical_expert" | "attending";

export type GapKind =
  | "missing_entity"
  | "missing_relationship"
  | "missing_claim"
  | "missing_decision_point"
  | "missing_metadata"
  | "missing_asset_link"
  | "missing_provenance";

export type OntologyGap = {
  id: string;
  kind: GapKind;
  priority: GapPriority;
  confidence: number;
  reason: string;
  requiredReviewer: RequiredReviewer;
  maturityImpact: number;
  ontologyRule: string;
  subjectSlug?: string;
  predicate?: string;
  objectSlug?: string;
  entityType?: CanonicalEntityType | string;
  entitySlug?: string;
  claimType?: string;
  decisionPointPattern?: string;
  metadataField?: string;
  anchorEntitySlug?: string;
};

export type NeighborhoodEntity = {
  slug: string;
  entityType: CanonicalEntityType | string;
  preferredLabel: string;
  description?: string;
  metadata: Record<string, unknown>;
  source: "spec" | "database" | "proposal";
};

export type NeighborhoodRelationship = {
  subjectSlug: string;
  predicate: string;
  objectSlug: string;
  metadata?: Record<string, unknown>;
  source: "spec" | "database" | "proposal";
};

export type NeighborhoodClaim = {
  draftId: string;
  claimType: string;
  claimText: string;
  primaryEntitySlug: string;
  importanceLevel: "L1" | "L2" | "L3" | "L4";
  contentSource: string;
  reviewStatus: string;
  metadata?: Record<string, unknown>;
};

export type NeighborhoodDecisionPoint = {
  draftId: string;
  subjectEntitySlug: string;
  patternType: string;
  trigger: string;
  action: string;
  urgency: string;
  safetyCriticality: string;
  requiresAttendingReview: boolean;
};

export type NeighborhoodSnapshot = {
  topicKey: string;
  pilotKey: string;
  displayName: string;
  primaryEntitySlug: string;
  targetMaturityLevel: number;
  entities: NeighborhoodEntity[];
  relationships: NeighborhoodRelationship[];
  claims: NeighborhoodClaim[];
  decisionPoints: NeighborhoodDecisionPoint[];
  assets: {
    ankiCardMappings: number;
    orthobulletsQuestionMappings: number;
    linkedCardProposals: number;
    linkedQuestionProposals: number;
  };
  sources: Record<string, string>;
};

export type NeighborhoodRole =
  | "primary_condition"
  | "neighboring_anatomy"
  | "procedure"
  | "classification"
  | "imaging"
  | "complication"
  | "decision_point_anchor"
  | "claim_anchor"
  | "biomechanics"
  | "fixation"
  | "supporting";

export type NeighborhoodPlanNode = {
  slug: string;
  entityType: string;
  preferredLabel: string;
  role: NeighborhoodRole;
  isPrimary: boolean;
  inboundEdgeCount: number;
  outboundEdgeCount: number;
};

export type NeighborhoodPlan = {
  topicKey: string;
  pilotKey: string;
  primaryEntitySlug: string;
  displayName: string;
  generatedAt: string;
  nodes: NeighborhoodPlanNode[];
  edgeCount: number;
  claimCount: number;
  decisionPointCount: number;
  roles: Record<NeighborhoodRole, string[]>;
};

export type AgentFamily =
  | "Anatomy Builder"
  | "Clinical Entity Builder"
  | "Relationship Builder"
  | "Claim Builder"
  | "Decision Point Builder"
  | "Metadata Builder"
  | "Asset Linker"
  | "Provenance Builder"
  | "Conflict Resolver"
  | "Quality Scorer"
  | "Review Assistant"
  | "Publication Validator";

export type WorkItem = {
  id: string;
  /** Registry agent id — source of truth for orchestration. */
  agentId: string;
  /** Legacy display family — derived from registry, not hardcoded by compiler. */
  agentFamily: AgentFamily;
  assignedAgentId: string;
  workType?: string;
  title: string;
  gapIds: string[];
  dependencies: string[];
  estimatedConfidence: number;
  requiredInputs: string[];
  requiredOutputs: string[];
  validationRules: string[];
  priority: number;
  publicationImpact?: number;
  requiredReviewer?: RequiredReviewer;
};

export type WorkPlan = {
  topicKey: string;
  pilotKey: string;
  generatedAt: string;
  workItems: WorkItem[];
  agentSummary: Record<AgentFamily, number>;
  executionOrder: string[];
  /** Agents discovered from registry at plan time. */
  registryDiscovery?: Array<{
    id: string;
    name: string;
    produces: string[];
    consumes: string[];
    requires: string[];
    handlesGapKinds: string[];
  }>;
};

export type AutoReviewCategory = "AUTO_APPROVE" | "SAFE_REVIEW" | "EXPERT_REVIEW" | "REJECT";

export type AutoReviewDecision = {
  proposal_fingerprint: string;
  proposal_type: string;
  category: AutoReviewCategory;
  curationRoute: CurationRoute;
  confidence: number;
  evidenceQuality: number;
  ontologyConsistency: number;
  relationshipValidity: number;
  duplicateProbability: number;
  safetyCriticality: number;
  publicationReadiness: number;
  humanReviewerType: RequiredReviewer;
  rationale: string[];
  rulesTriggered: string[];
};

export type AutoReviewReport = {
  topicKey: string;
  pilotKey: string;
  generatedAt: string;
  summary: Record<AutoReviewCategory, number>;
  humanReviewPercent: number;
  autoApprovedPercent: number;
  decisions: AutoReviewDecision[];
};

export type MergeStats = {
  entityCount: number;
  relationshipCount: number;
  claimCount: number;
  decisionPointCount: number;
  bridgeCount: number;
  duplicateEntitiesResolved: number;
  conflictingRelationships: number;
  metadataMerged: number;
  provenanceAttached: number;
};

export type MergedNeighborhoodDraft = {
  topicKey: string;
  pilotKey: string;
  generatedAt: string;
  entities: NeighborhoodEntity[];
  relationships: NeighborhoodRelationship[];
  claims: NeighborhoodClaim[];
  decisionPoints: NeighborhoodDecisionPoint[];
  conflicts: Array<{ kind: string; description: string }>;
  stats: MergeStats;
};

export type CompilerPlan = {
  topicKey: string;
  pilotKey: string;
  displayName: string;
  generatedAt: string;
  stages: Array<{
    stage: number;
    name: string;
    status: "completed" | "planned";
    summary: string;
    outputs: string[];
  }>;
  neighborhood: {
    entityCount: number;
    relationshipCount: number;
    claimCount: number;
    decisionPointCount: number;
  };
  gaps: {
    total: number;
    byKind: Record<GapKind, number>;
    byPriority: Record<GapPriority, number>;
  };
  workPlan: {
    workItemCount: number;
    agentsRequired: AgentFamily[];
    agentIds?: string[];
    registryDiscovery?: WorkPlan["registryDiscovery"];
  };
  review: {
    totalProposals: number;
    autoApproved: number;
    humanReview: number;
    humanReviewPercent: number;
  };
  publication: {
    currentMaturityLevel: number;
    requiredMaturityLevel: number;
    ready: boolean;
    blockerCount: number;
  };
  constraints: {
    databaseModified: false;
    autoPublished: false;
  };
  evidencePacketId?: string;
};

export type PublicationReadinessResult = {
  topicKey: string;
  pilotKey: string;
  generatedAt: string;
  currentLevel: number;
  requiredLevel: number;
  ready: boolean;
  blockers: string[];
  remainingWork: string[];
  productReadiness: {
    traversalSmokeTest: boolean;
    prepareReady: boolean;
    brobotReady: boolean;
  };
  estimatedEffort: {
    gapsRemaining: number;
    humanReviewItems: number;
    attendingReviewItems: number;
    effortBand: "low" | "medium" | "high";
  };
  dimensionScores: Record<string, number>;
};

export type CompilerResult = {
  plan: CompilerPlan;
  neighborhoodPlan: NeighborhoodPlan;
  gaps: OntologyGap[];
  workPlan: WorkPlan;
  mergedDraft: MergedNeighborhoodDraft;
  autoReview: AutoReviewReport;
  publication: PublicationReadinessResult;
  humanReviewItems: Array<Record<string, unknown>>;
  agentExecution?: import("../kg-agent-framework/orchestrator.ts").AgentExecutionReport;
  conflictReport?: import("./merge-engine.ts").ConflictReport;
  agentProposals?: import("../../../kg-automation-common.ts").ProposalRecord[];
  evidencePacket?: import("../kg-evidence/evidence-packet.ts").KnowledgeEvidencePacket;
  claimBuilderReport?: import("../kg-agent-framework/claim-builder/claim-builder-reports.ts").ClaimBuilderOutput;
};