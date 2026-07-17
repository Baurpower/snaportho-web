import type {
  NeighborhoodClaim,
  NeighborhoodDecisionPoint,
  NeighborhoodEntity,
  NeighborhoodRelationship,
} from "../kg-compiler/types.ts";
import type { PredicateRule } from "../kg-relationship-registry.ts";

export type FinalizationObjectKind = "entity" | "relationship" | "claim" | "decision_point";
export type FinalizationSeverity = "INFO" | "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
export type FinalizationDisposition =
  | "AUTO_RESOLVED"
  | "REVIEW_INHERITED"
  | "ACTION_REQUIRED"
  | "HUMAN_REVIEW_REQUIRED"
  | "VALID_DEFER"
  | "SYSTEM_BLOCKER"
  | "WARNING";

export type CanonicalRegistryEntry = {
  slug: string;
  entityType: string;
  preferredLabel: string;
  neighborhoodId?: string;
  aliases?: string[];
  metadata?: Record<string, unknown>;
};

export type AliasEntry = {
  alias: string;
  canonicalSlug: string;
  confidence: number;
  source?: string;
};

export type SourceManifestEntry = {
  sourceType?: string;
  sourceIdentifier: string;
  sourceTitle?: string;
  evidenceConfidence?: number;
  reviewStatus?: string;
  objectFingerprints?: string[];
  metadata?: Record<string, unknown>;
};

export type PriorReviewDecision = {
  proposal_fingerprint: string;
  decision: string;
  reviewer?: string;
  reason?: string;
  applied?: boolean;
  reviewedAt?: string;
};

export type NeighborhoodMetadata = {
  topicKey?: string;
  pilotKey?: string;
  displayName?: string;
  primaryEntitySlug?: string;
  inputDirectory?: string;
  generatedAt?: string;
  [key: string]: unknown;
};

export type GraphFinalizationInput = {
  neighborhoodId: string;
  entities: NeighborhoodEntity[];
  relationships: NeighborhoodRelationship[];
  claims: NeighborhoodClaim[];
  decisionPoints: NeighborhoodDecisionPoint[];
  canonicalRegistry: CanonicalRegistryEntry[];
  aliases: AliasEntry[];
  predicateRegistry: Record<string, PredicateRule>;
  sourceManifest: SourceManifestEntry[];
  priorReviewDecisions: PriorReviewDecision[];
  neighborhoodMetadata: NeighborhoodMetadata;
};

export type FinalizationChange = {
  fingerprint: string;
  objectKind: FinalizationObjectKind;
  agent: string;
  reason: string;
  before?: unknown;
  after?: unknown;
  confidence?: number;
};

export type FinalizationEscalation = {
  id: string;
  fingerprint: string;
  objectKind: FinalizationObjectKind;
  agent: string;
  severity: FinalizationSeverity;
  disposition?: FinalizationDisposition;
  reason: string;
  reviewer: "curator" | "clinical_expert" | "attending" | "educator" | "rehabilitation" | "electrodiagnostic_specialist";
  suggestedAction: string;
};

export type FinalizationWarning = {
  id: string;
  agent: string;
  severity: FinalizationSeverity;
  disposition?: FinalizationDisposition;
  message: string;
  fingerprint?: string;
};

export type FinalizationMetrics = {
  duplicatesPrevented: number;
  relationshipsNormalized: number;
  unsupportedEdgesRemoved: number;
  reviewDecisionsInherited: number;
  orphanEntitiesRepaired: number;
  publicationBlockersDetected: number;
  [key: string]: number;
};

export type GraphFinalizationResult = {
  approved: FinalizationChange[];
  modified: FinalizationChange[];
  rejected: FinalizationChange[];
  escalations: FinalizationEscalation[];
  warnings: FinalizationWarning[];
  metrics: FinalizationMetrics;
};

export type GraphFinalizationAgentReport<TArtifacts extends Record<string, unknown> = Record<string, unknown>> = {
  agent: string;
  generatedAt: string;
  result: GraphFinalizationResult;
  artifacts: TArtifacts;
};

export type GraphFinalizationAgent<TArtifacts extends Record<string, unknown> = Record<string, unknown>> = {
  name: string;
  run(input: GraphFinalizationInput, context: GraphFinalizationContext): GraphFinalizationAgentReport<TArtifacts>;
};

export type GraphFinalizationContext = {
  startedAt: string;
  reports: GraphFinalizationAgentReport[];
  fatal: boolean;
  outputDirectory?: string;
};

export const emptyMetrics = (): FinalizationMetrics => ({
  duplicatesPrevented: 0,
  relationshipsNormalized: 0,
  unsupportedEdgesRemoved: 0,
  reviewDecisionsInherited: 0,
  orphanEntitiesRepaired: 0,
  publicationBlockersDetected: 0,
});

export const emptyResult = (): GraphFinalizationResult => ({
  approved: [],
  modified: [],
  rejected: [],
  escalations: [],
  warnings: [],
  metrics: emptyMetrics(),
});
