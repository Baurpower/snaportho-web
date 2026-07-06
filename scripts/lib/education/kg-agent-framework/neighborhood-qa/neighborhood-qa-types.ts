import type { ProposalRecord } from "../../../../kg-automation-common.ts";
import type { ConflictReport } from "../../kg-compiler/merge-engine.ts";
import type {
  AutoReviewReport,
  MergedNeighborhoodDraft,
  NeighborhoodSnapshot,
  OntologyGap,
  PublicationReadinessResult,
  WorkPlan,
} from "../../kg-compiler/types.ts";
import type { KnowledgeEvidencePacket } from "../../kg-evidence/evidence-packet.ts";

export type QADimensionKey =
  | "clinical_completeness"
  | "relationship_completeness"
  | "anatomy_completeness"
  | "decision_point_completeness"
  | "claim_quality"
  | "educational_usefulness"
  | "reasoning_depth"
  | "metadata_completeness"
  | "provenance_completeness"
  | "safety_readiness"
  | "product_readiness"
  | "graph_health";

export type QADimensionScore = {
  dimension: QADimensionKey;
  score: number;
  explanation: string;
  findings: string[];
};

export type ProductReadinessKey = "BroBot" | "Prepare" | "CasePrep" | "OITE" | "Adaptive learning";

export type ProductReadinessScore = {
  product: ProductReadinessKey;
  ready: boolean;
  requiredMaturityLevel: number;
  currentMaturityLevel: number;
  blockers: string[];
  missingGraphElements: string[];
  unsafeAssumptions: string[];
  suggestedNextWork: string[];
};

export type QAFinding = {
  code: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  message: string;
  affectedSlugs?: string[];
};

export type QANextAction = {
  priority: number;
  action: string;
  owner: "human_reviewer" | "attending_reviewer" | "curator" | "agent" | "factory";
  agentHint?: string;
  rationale: string;
};

export type NeighborhoodQAReport = {
  generatedAt: string;
  agentId: string;
  agentVersion: string;
  topicKey: string;
  pilotKey: string;
  evidencePacketId?: string;
  overallNeighborhoodScore: number;
  maturityLevelEstimate: number;
  confidenceInScore: number;
  estimatedHumanReviewMinutes: number;
  publicationBlocked: boolean;
  stagedDraftOnly: boolean;
  dimensionScores: QADimensionScore[];
  productReadiness: ProductReadinessScore[];
  findings: QAFinding[];
  criticalBlockers: string[];
  missingRelationshipCategories: string[];
  missingEducationalContent: string[];
  safetyConcerns: string[];
  nextBestActions: QANextAction[];
  databaseModified: false;
};

export type NeighborhoodQAInput = {
  topicKey: string;
  pilotKey: string;
  displayName: string;
  primaryEntitySlug: string;
  targetMaturityLevel: number;
  snapshot: NeighborhoodSnapshot;
  mergedDraft: MergedNeighborhoodDraft;
  gaps: OntologyGap[];
  workPlan: WorkPlan;
  autoReview: AutoReviewReport;
  publication: PublicationReadinessResult;
  conflictReport?: ConflictReport;
  proposals: ProposalRecord[];
  evidencePacket?: KnowledgeEvidencePacket;
  qualityMetrics?: Record<string, unknown>;
  humanReviewQueueSize: number;
};