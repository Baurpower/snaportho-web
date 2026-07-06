import type { ProposalRecord } from "../../../kg-automation-common.ts";
import type { AgentAssignmentPlan } from "../kg-agent-framework/agent-reports.ts";
import type { AgentExecutionReport } from "../kg-agent-framework/orchestrator.ts";
import type { ConflictReport } from "../kg-compiler/merge-engine.ts";
import type {
  AutoReviewReport,
  CompilerPlan,
  MergedNeighborhoodDraft,
  NeighborhoodPlan,
  OntologyGap,
  PublicationReadinessResult,
  WorkPlan,
} from "../kg-compiler/types.ts";
import type { KnowledgeEvidencePacket } from "../kg-evidence/evidence-packet.ts";

export const AUDITOR_VERSION = "1.0.0";

export type AuditCategoryKey =
  | "ontology_completeness"
  | "evidence_quality"
  | "graph_integrity"
  | "shared_knowledge_reuse"
  | "relationship_quality"
  | "claim_quality"
  | "decision_point_quality"
  | "metadata_quality"
  | "provenance_quality"
  | "review_calibration"
  | "agent_performance"
  | "compiler_quality"
  | "educational_quality"
  | "cross_neighborhood_consistency"
  | "publication_readiness";

export type AuditDeduction = {
  finding: string;
  evidence: string;
  reason: string;
  impact: number;
  suggestedFix: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: AuditCategoryKey;
  affectedSlugs?: string[];
};

export type CategoryAuditResult = {
  category: AuditCategoryKey;
  label: string;
  score: number;
  deductions: AuditDeduction[];
  metrics: Record<string, number | string | boolean>;
  recommendations: string[];
};

export type PublicationAuditResult = {
  status: "READY" | "NOT_READY";
  ready: boolean;
  blockers: string[];
  currentLevel: number;
  requiredLevel: number;
  score: number;
  deductions: AuditDeduction[];
};

export type AgentReportCard = {
  agentId: string;
  assignmentId?: string;
  status: string;
  workload: number;
  successRate: number;
  averageConfidence: number;
  proposalsGenerated: number;
  reviewBurden: number;
  evidenceUsage: number;
  grade: "A" | "B" | "C" | "D" | "F";
  strengths: string[];
  weaknesses: string[];
};

export type CompilerReportCard = {
  gapDetectionScore: number;
  workPlanningScore: number;
  dependencyGraphScore: number;
  mergeCorrectnessScore: number;
  publicationBlockerScore: number;
  overallScore: number;
  deductions: AuditDeduction[];
  metrics: Record<string, number | string | boolean>;
};

export type TopicScorecard = {
  generatedAt: string;
  auditorVersion: typeof AUDITOR_VERSION;
  topicKey: string;
  pilotKey: string;
  displayName: string;
  dataSource: {
    neighborhood: "merged_draft" | "compiler_snapshot" | "database" | "spec";
    reportsLoaded: string[];
    reportsMissing: string[];
  };
  overallScore: number;
  categories: Record<AuditCategoryKey, number>;
  publication: PublicationAuditResult;
  topFindings: AuditDeduction[];
  prioritizedRecommendations: Array<{
    priority: number;
    action: string;
    category: AuditCategoryKey;
    impact: string;
  }>;
  databaseModified: false;
};

export type BatchDefinition = {
  batchKey: string;
  displayName: string;
  topicKeys: string[];
};

export type BatchSummary = {
  generatedAt: string;
  auditorVersion: typeof AUDITOR_VERSION;
  batchKey: string;
  displayName: string;
  neighborhoods: Array<{
    topicKey: string;
    displayName: string;
    overallScore: number;
    publicationStatus: "READY" | "NOT_READY";
    reviewBurden: number;
    blockers: string[];
  }>;
  aggregate: {
    averageOverallScore: number;
    factoryMaturity: number;
    publicationReadyCount: number;
    publicationBlockedCount: number;
    totalReviewBurden: number;
    outstandingBlockers: string[];
    weakestCategory: AuditCategoryKey;
    strongestCategory: AuditCategoryKey;
  };
  rankings: {
    byQuality: string[];
    byPublicationReadiness: string[];
  };
  databaseModified: false;
};

export type OverallDashboard = {
  generatedAt: string;
  auditorVersion: typeof AUDITOR_VERSION;
  neighborhoodCount: number;
  batches: BatchSummary[];
  globalRankings: {
    byQuality: Array<{ topicKey: string; displayName: string; score: number }>;
    byPublicationReadiness: Array<{ topicKey: string; displayName: string; ready: boolean }>;
  };
  systemicWeaknesses: Array<{
    category: AuditCategoryKey;
    averageScore: number;
    frequency: number;
    exampleFinding: string;
  }>;
  agentLeaderboard: Array<{ agentId: string; averageGrade: string; topicsAudited: number }>;
  ontologyViolationFrequency: Array<{ rule: string; count: number }>;
  duplicateConceptHotspots: Array<{ label: string; slugs: string[]; topics: string[] }>;
  databaseModified: false;
};

export type AuditInputBundle = {
  topicKey: string;
  pilotKey: string;
  displayName: string;
  primaryEntitySlug: string;
  targetMaturityLevel: number;
  mergedDraft: MergedNeighborhoodDraft;
  gaps: OntologyGap[];
  workPlan?: WorkPlan;
  compilerPlan?: CompilerPlan;
  neighborhoodPlan?: NeighborhoodPlan;
  autoReview?: AutoReviewReport;
  publication?: PublicationReadinessResult;
  agentExecution?: AgentExecutionReport;
  conflictReport?: ConflictReport;
  assignmentPlan?: AgentAssignmentPlan;
  humanReviewQueue?: Array<Record<string, unknown>>;
  evidencePacket?: KnowledgeEvidencePacket;
  proposals: ProposalRecord[];
  reportsLoaded: string[];
  reportsMissing: string[];
  dataSource: TopicScorecard["dataSource"]["neighborhood"];
};

export type TopicAuditArtifacts = {
  scorecard: TopicScorecard;
  categoryResults: CategoryAuditResult[];
  ontologyAudit: CategoryAuditResult;
  graphIntegrity: CategoryAuditResult;
  relationshipAudit: CategoryAuditResult;
  claimAudit: CategoryAuditResult;
  decisionPointAudit: CategoryAuditResult;
  reviewCalibration: CategoryAuditResult;
  agentReportCards: AgentReportCard[];
  compilerReportCard: CompilerReportCard;
  publicationAudit: PublicationAuditResult;
  crossNeighborhood?: CategoryAuditResult;
};