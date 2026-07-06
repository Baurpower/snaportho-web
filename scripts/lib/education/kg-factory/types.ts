import type { ProposalRecord, ProposalReviewStatus } from "../../../kg-automation-common.ts";

export const CURATION_ROUTES = [
  "AUTO_APPROVED_LOW_RISK",
  "AUTO_REVISED",
  "HUMAN_REVIEW",
  "ATTENDING_REVIEW",
  "REJECTED",
] as const;

export type CurationRoute = (typeof CURATION_ROUTES)[number];

export type CurationScores = {
  confidence: number;
  evidence: number;
  ambiguity: number;
  safety: number;
  completeness: number;
};

export type CuratorDecision = {
  route: CurationRoute;
  scores: CurationScores;
  recommendation: string;
  rationale: string[];
  alternatives: string[];
  reviewerDecisionRequired: string | null;
  revisions: Partial<ProposalRecord>;
  audit: {
    curator: "kg-factory-rules-v1";
    evaluatedAt: string;
    rulesTriggered: string[];
    optionalLlmUsed: boolean;
  };
};

export type FactoryProposalPacket = {
  generatedAt: string;
  pilotKey: string;
  proposals: ProposalRecord[];
  validationErrors: string[];
};

export type CurationReport = {
  generatedAt: string;
  pilotKey: string;
  summary: Record<CurationRoute, number>;
  decisions: Array<{
    proposal_fingerprint: string;
    proposal_type: string;
    route: CurationRoute;
    scores: CurationScores;
    recommendation: string;
    rationale: string[];
    reviewerDecisionRequired: string | null;
    revised: boolean;
    final_review_status: ProposalReviewStatus;
  }>;
};

export type DryRunMutation = {
  kind: string;
  proposal_fingerprint: string;
  description: string;
  payload: Record<string, unknown>;
};

export type ValidationIssue = {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  proposal_fingerprint?: string;
  autoRepaired: boolean;
};

export type ValidationReport = {
  generatedAt: string;
  pilotKey: string;
  issues: ValidationIssue[];
  passed: boolean;
};

export type PublicationReadinessReport = {
  generatedAt: string;
  pilotKey: string;
  ready: boolean;
  estimatedMaturityLevel: number;
  blockers: string[];
  recommendedActions: string[];
  metrics: Record<string, number | string | boolean>;
};