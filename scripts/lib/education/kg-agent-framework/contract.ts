/**
 * Knowledge Factory Agent Contract — core types.
 * Operating-system specification for all factory agents.
 */

import type { ProposalRecord, ProposalType } from "../../../kg-automation-common.ts";
import type {
  GapKind,
  GapPriority,
  NeighborhoodSnapshot,
  OntologyGap,
  RequiredReviewer,
} from "../kg-compiler/types.ts";
import type { EntityShapeRequirements } from "../kg-compiler/ontology-requirements.ts";
import type { AgentVersionInfo } from "./versioning.ts";

// ---------------------------------------------------------------------------
// Capability vocabulary
// ---------------------------------------------------------------------------

export const PRODUCES = [
  "entities",
  "relationships",
  "claims",
  "decision_points",
  "metadata",
  "provenance",
  "asset_links",
  "review_report",
  "publication_report",
  "quality_metrics",
] as const;
export type ProducesCapability = (typeof PRODUCES)[number];

export const CONSUMES = [
  "neighborhood_snapshot",
  "ontology_requirements",
  "evidence_packets",
  "work_assignment",
  "canonical_objects",
  "proposal_packets",
  "merged_neighborhood_draft",
  "auto_review_report",
  "gap_report",
  "quality_metrics",
] as const;
export type ConsumesCapability = (typeof CONSUMES)[number];

/** Curator-compatible review routes — deterministic and explainable. */
export type ReviewRoute =
  | "AUTO_APPROVED_LOW_RISK"
  | "AUTO_REVISED"
  | "HUMAN_REVIEW"
  | "ATTENDING_REVIEW"
  | "REJECT"
  | "CONFLICTED";

export type FailureSeverity = "info" | "warning" | "error" | "critical";
export type FailureRecoverability = "retry" | "escalate" | "skip" | "blocked";

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export type AgentIdentity = {
  id: string;
  name: string;
  version: string;
  description: string;
  owner: string;
  supportedOntologyVersion: string;
  versions: AgentVersionInfo;
};

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

export type AgentCapability = {
  produces: ProducesCapability[];
  consumes: ConsumesCapability[];
  /** Gap kinds this agent can attempt to resolve. */
  handlesGapKinds: GapKind[];
  /** Optional entity-type filter for missing_entity gaps. */
  handlesEntityTypes?: string[];
  /** Ontology rule prefixes (e.g. anatomy., condition.) — opt-in prefix specialization. */
  handlesOntologyRulePrefixes?: string[];
  /** When true, matches only after all specialized agents fail for a gap. */
  isGenericFallback?: boolean;
  /** Agent ids that must complete before this agent runs. */
  requires: string[];
  /** Typical confidence band for outputs. */
  confidenceRange: { min: number; max: number };
  /** Predicates or patterns eligible for auto-approval routing. */
  autoApprovalPatterns?: string[];
  /** Predicates or patterns that always escalate. */
  escalationPatterns?: string[];
  validationCategories: ValidationCategory[];
  /** Proposal types this agent may emit. */
  proposalTypes: ProposalType[];
};

/** @deprecated Use AgentCapability — kept for backward compatibility. */
export type AgentCapabilities = AgentCapability;

export type AgentSafetyProfile = {
  maxAutoApprovalConfidence: number;
  attendingGatedProposalTypes: ProposalType[];
  blockedVerifiedDrafts: boolean;
  maxProposalsPerAssignment: number;
  requiresHumanReviewAboveSafety: number;
  escalationPatterns: string[];
  autoApprovalPatterns: string[];
};

export type ValidationCategory =
  | "schema"
  | "ontology"
  | "relationship"
  | "duplicate"
  | "metadata"
  | "provenance"
  | "safety"
  | "publication";

// ---------------------------------------------------------------------------
// Compiler context & inputs
// ---------------------------------------------------------------------------

export type EvidencePacketRef = {
  packetId: string;
  sourceType: string;
  sourceIds: string[];
  summary: string;
  quality: number;
  evidenceItemId?: string;
};

/** @deprecated Use EvidencePacketRef — kept for backward compatibility. */
export type EvidencePacket = EvidencePacketRef;

export type CompilerContext = {
  topicKey: string;
  pilotKey: string;
  displayName: string;
  primaryEntitySlug: string;
  targetMaturityLevel: number;
  compilerVersion: string;
  frameworkVersion: string;
  ontologyVersion: string;
  generatedAt: string;
};

export type OntologyRequirementsContext = {
  entityRequirements: Array<{
    entitySlug: string;
    requirements: EntityShapeRequirements;
  }>;
  neighborhoodRequirementIds: string[];
};

export type AgentInputBundle = {
  neighborhood: NeighborhoodSnapshot;
  ontologyRequirements?: OntologyRequirementsContext;
  evidencePackets?: EvidencePacketRef[];
  /** Full Knowledge Factory evidence packet when compiler runs with --use-evidence. */
  knowledgeEvidencePacket?: import("../kg-evidence/evidence-packet.ts").KnowledgeEvidencePacket;
  /** Assignment-scoped evidence references derived from knowledgeEvidencePacket. */
  evidenceContext?: import("../kg-evidence/evidence-packet.ts").EvidenceAgentContext;
  existingProposals?: ProposalRecord[];
  gaps?: OntologyGap[];
  compiler: CompilerContext;
  /** Populated after merge stage during orchestration. */
  mergedNeighborhoodDraft?: import("../kg-compiler/types.ts").MergedNeighborhoodDraft;
  /** Populated after review-assistant during orchestration. */
  autoReviewReport?: import("../kg-compiler/types.ts").AutoReviewReport;
  /** Populated by quality agents during orchestration. */
  qualityMetrics?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Work assignment
// ---------------------------------------------------------------------------

export type WorkAssignmentType =
  | "gap_resolution"
  | "review"
  | "publication_validation"
  | "quality_scoring"
  | "merge";

export type WorkAssignment = {
  id: string;
  type: WorkAssignmentType;
  priority: number;
  dependencies: string[];
  requiredInputs: ConsumesCapability[];
  requiredOutputs: ProducesCapability[];
  estimatedComplexity: "low" | "medium" | "high";
  estimatedConfidence: number;
  ontologyReferences: string[];
  validationRules: string[];
  requiredReviewer: RequiredReviewer;
  publicationImpact: number;
  gapIds: string[];
  gaps: OntologyGap[];
  assignedAgentId: string;
  evidencePacketId?: string;
  relevantEvidenceItemIds?: string[];
};

// ---------------------------------------------------------------------------
// Confidence
// ---------------------------------------------------------------------------

export type ConfidenceBreakdown = {
  evidenceQuantity: number;
  evidenceQuality: number;
  sourceAgreement: number;
  ontologyCompliance: number;
  relationshipValidity: number;
  metadataCompleteness: number;
  conflictScore: number;
  safetyLevel: number;
  rulesApplied: string[];
};

export type ConfidenceResult = {
  confidence: number;
  breakdown: ConfidenceBreakdown;
  recommendedRoute: ReviewRoute;
  rationale: string[];
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ValidationIssue = {
  category: ValidationCategory;
  code: string;
  message: string;
  severity: FailureSeverity;
  recoverable: FailureRecoverability;
  proposalFingerprint?: string;
};

export type ValidationResult = {
  passed: boolean;
  issues: ValidationIssue[];
  categories: Record<ValidationCategory, { passed: boolean; issueCount: number }>;
};

// ---------------------------------------------------------------------------
// Failures
// ---------------------------------------------------------------------------

export type AgentFailure = {
  code: string;
  reason: string;
  severity: FailureSeverity;
  recoverability: FailureRecoverability;
  recommendedNextAction: string;
  context?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Review recommendation (curator-compatible)
// ---------------------------------------------------------------------------

export type ReviewRecommendation = {
  route: ReviewRoute;
  confidence: number;
  safetyScore: number;
  evidenceScore: number;
  ontologyComplianceScore: number;
  duplicateRisk: number;
  conflictRisk: number;
  reason: string;
  rationale: string[];
  requiredReviewerRole: RequiredReviewer;
};

// ---------------------------------------------------------------------------
// Proposal contract (envelope over ProposalRecord)
// ---------------------------------------------------------------------------

export type ProposalEnvelope = {
  schemaVersion: string;
  proposalId: string;
  proposal: ProposalRecord;
  target: {
    objectType: ProposalType;
    label: string;
    slug?: string;
    predicate?: string;
  };
  supportingEvidence: {
    summary: string;
    sourceIds: string[];
    cardCount: number;
    questionCount: number;
  };
  confidence: number;
  confidenceExplanation: string[];
  confidenceBreakdown: ConfidenceBreakdown;
  provenance: {
    sourceSignalType: string;
    sourceSignalIds: string[];
    evidenceSummary: string;
  };
  reviewRecommendation: ReviewRecommendation;
  validation: ValidationResult;
  ontologyCompliance: number;
  duplicateProbability: number;
  conflictScore: number;
  publicationEligible: boolean;
};

/** @deprecated Use ProposalEnvelope — kept for backward compatibility. */
export type FactoryProposal = ProposalEnvelope;

// ---------------------------------------------------------------------------
// Agent output
// ---------------------------------------------------------------------------

export type AuditTrailEntry = {
  stage: string;
  timestamp: string;
  action: string;
  detail: string;
};

export type AuditTrail = {
  agentId: string;
  assignmentId: string;
  frameworkVersion: string;
  entries: AuditTrailEntry[];
};

export type AgentMetrics = {
  executionTimeMs: number;
  proposalCount: number;
  validationFailureCount: number;
  escalationCount: number;
  errorCount: number;
  dependencyFailureCount: number;
  confidenceDistribution: Record<string, number>;
  acceptanceRate: number;
};

export type AgentResult = {
  agentId: string;
  assignmentId: string;
  status: "completed" | "partial" | "failed" | "skipped";
  proposals: ProposalEnvelope[];
  rawProposals: ProposalRecord[];
  confidence: ConfidenceResult;
  validation: ValidationResult;
  warnings: AgentFailure[];
  errors: AgentFailure[];
  metrics: AgentMetrics;
  auditTrail: AuditTrail;
  /** Immutable output for downstream agents — never mutated by consumers. */
  outputs: Record<string, unknown>;
};

/** @deprecated Use AgentResult — kept for backward compatibility. */
export type AgentExecutionResult = AgentResult;

// ---------------------------------------------------------------------------
// Agent contract interface
// ---------------------------------------------------------------------------

export interface KnowledgeFactoryAgent {
  readonly identity: AgentIdentity;
  readonly capabilities: AgentCapability;
  readonly safetyProfile: AgentSafetyProfile;

  /** Deterministic capability match — used by registry for discovery. */
  canHandle(assignment: Pick<WorkAssignment, "gaps" | "type">): boolean;

  /** Validate inputs before execute — lifecycle stage 2. */
  validateInputs(input: AgentInputBundle, assignment: WorkAssignment): ValidationResult;

  /** Core domain work — lifecycle stage 3–7. */
  execute(input: AgentInputBundle, assignment: WorkAssignment): Promise<AgentResult>;
}