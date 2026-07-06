/**
 * Stage 5 — Agent Orchestration: execute work assignments with dependency ordering,
 * safe parallelism, timeout isolation, and deterministic reproducibility.
 */

import type { ProposalRecord } from "../../../kg-automation-common.ts";
import { expandRequirementsForNeighborhood } from "../kg-compiler/ontology-requirements.ts";
import { mergeNeighborhoodDraft } from "../kg-compiler/merge-engine.ts";
import type { MergedNeighborhoodDraft, NeighborhoodSnapshot, OntologyGap } from "../kg-compiler/types.ts";
import type { AutoReviewReport } from "../kg-compiler/types.ts";
import { buildEvidenceAgentContext, toAgentEvidenceRefs } from "../kg-evidence/evidence-context.ts";
import type { KnowledgeEvidencePacket } from "../kg-evidence/evidence-packet.ts";
import type { AgentInputBundle, AgentResult, CompilerContext, EvidencePacketRef, WorkAssignment } from "./contract.ts";
import { mergeProposalSets } from "./gap-proposal-matcher.ts";
import { getAgentRegistry } from "./registry.ts";
import { registerDefaultAgents } from "./register-default-agents.ts";
import { buildWorkAssignmentsFromGaps } from "./work-assignment.ts";
import { FRAMEWORK_CONTRACT_VERSION, SUPPORTED_ONTOLOGY_VERSION } from "./versioning.ts";

const DEFAULT_AGENT_TIMEOUT_MS = 30_000;
const COMPILER_VERSION = "1.0.0";

export type AgentExecutionEntry = {
  assignmentId: string;
  agentId: string;
  status: AgentResult["status"];
  proposalCount: number;
  executionTimeMs: number;
  errors: string[];
  warnings: string[];
  skipped: boolean;
  timedOut: boolean;
};

export type AgentExecutionReport = {
  generatedAt: string;
  frameworkVersion: typeof FRAMEWORK_CONTRACT_VERSION;
  topicKey: string;
  pilotKey: string;
  executionOrder: string[];
  parallelLayers: string[][];
  entries: AgentExecutionEntry[];
  totalProposalsEmitted: number;
  uniqueProposals: number;
  completedAgents: number;
  failedAgents: number;
  partialAgents: number;
  skippedAgents: number;
  databaseModified: false;
};

export type OrchestrationOptions = {
  topicKey: string;
  pilotKey: string;
  displayName: string;
  primaryEntitySlug: string;
  targetMaturityLevel: number;
  snapshot: NeighborhoodSnapshot;
  gaps: OntologyGap[];
  seedProposals: ProposalRecord[];
  mergedDraft?: MergedNeighborhoodDraft;
  agentTimeoutMs?: number;
  evidencePacket?: KnowledgeEvidencePacket;
};

export type OrchestrationResult = {
  report: AgentExecutionReport;
  results: Map<string, AgentResult>;
  combinedProposals: ProposalRecord[];
  autoReviewReport?: AutoReviewReport;
  publicationOutputs?: Record<string, unknown>;
  qualityMetrics: Record<string, unknown>;
};

function buildCompilerContext(opts: OrchestrationOptions): CompilerContext {
  return {
    topicKey: opts.topicKey,
    pilotKey: opts.pilotKey,
    displayName: opts.displayName,
    primaryEntitySlug: opts.primaryEntitySlug,
    targetMaturityLevel: opts.targetMaturityLevel,
    compilerVersion: COMPILER_VERSION,
    frameworkVersion: FRAMEWORK_CONTRACT_VERSION,
    ontologyVersion: SUPPORTED_ONTOLOGY_VERSION,
    generatedAt: new Date().toISOString(),
  };
}

function buildLegacyEvidenceRefs(
  snapshot: NeighborhoodSnapshot,
  packet?: KnowledgeEvidencePacket
): EvidencePacketRef[] {
  if (packet) return toAgentEvidenceRefs(packet);
  return [
    {
      packetId: `${snapshot.pilotKey}:anki`,
      sourceType: "anki_card",
      sourceIds: [snapshot.sources.curriculumNodeSlug ?? snapshot.topicKey],
      summary: `${snapshot.assets.ankiCardMappings} Anki card mappings`,
      quality: 0.85,
    },
    {
      packetId: `${snapshot.pilotKey}:questions`,
      sourceType: "orthobullets_question",
      sourceIds: [snapshot.sources.prepareTopicId ?? snapshot.topicKey],
      summary: `${snapshot.assets.orthobulletsQuestionMappings} OB question mappings`,
      quality: 0.8,
    },
  ];
}

function computeExecutionLayers(assignments: WorkAssignment[]): WorkAssignment[][] {
  const byId = new Map(assignments.map((a) => [a.id, a]));
  const depth = new Map<string, number>();

  function getDepth(id: string, visiting = new Set<string>()): number {
    if (depth.has(id)) return depth.get(id)!;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const item = byId.get(id);
    if (!item || item.dependencies.length === 0) {
      depth.set(id, 0);
      return 0;
    }
    const d = Math.max(...item.dependencies.map((dep) => getDepth(dep, visiting))) + 1;
    depth.set(id, d);
    return d;
  }

  for (const a of assignments) getDepth(a.id);

  const maxDepth = Math.max(0, ...depth.values());
  const layers: WorkAssignment[][] = [];
  for (let d = 0; d <= maxDepth; d += 1) {
    layers.push(
      assignments
        .filter((a) => depth.get(a.id) === d)
        .sort((a, b) => a.id.localeCompare(b.id))
    );
  }
  return layers.filter((l) => l.length > 0);
}

async function executeWithTimeout(
  execute: () => Promise<AgentResult>,
  timeoutMs: number
): Promise<{ result: AgentResult; timedOut: boolean }> {
  let timedOut = false;
  const timeout = new Promise<AgentResult>((_, reject) => {
    setTimeout(() => {
      timedOut = true;
      reject(new Error("AGENT_TIMEOUT"));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([execute(), timeout]);
    return { result, timedOut: false };
  } catch (error) {
    if (!timedOut) throw error;
    return {
      result: {
        agentId: "unknown",
        assignmentId: "unknown",
        status: "failed",
        proposals: [],
        rawProposals: [],
        confidence: {
          confidence: 0,
          breakdown: {
            evidenceQuantity: 0,
            evidenceQuality: 0,
            sourceAgreement: 0,
            ontologyCompliance: 0,
            relationshipValidity: 0,
            metadataCompleteness: 0,
            conflictScore: 0,
            safetyLevel: 0,
            rulesApplied: ["agent_timeout"],
          },
          recommendedRoute: "REJECT",
          rationale: ["Agent execution timed out"],
        },
        validation: { passed: false, issues: [], categories: {} as AgentResult["validation"]["categories"] },
        warnings: [],
        errors: [
          {
            code: "AGENT_TIMEOUT",
            reason: `Execution exceeded ${timeoutMs}ms`,
            severity: "error",
            recoverability: "retry",
            recommendedNextAction: "Retry with smaller gap batch or increase timeout",
          },
        ],
        metrics: {
          executionTimeMs: timeoutMs,
          proposalCount: 0,
          validationFailureCount: 0,
          escalationCount: 0,
          errorCount: 1,
          dependencyFailureCount: 0,
          confidenceDistribution: {},
          acceptanceRate: 0,
        },
        auditTrail: {
          agentId: "unknown",
          assignmentId: "unknown",
          frameworkVersion: FRAMEWORK_CONTRACT_VERSION,
          entries: [{ stage: "execute", timestamp: new Date().toISOString(), action: "timeout", detail: `${timeoutMs}ms` }],
        },
        outputs: {},
      },
      timedOut: true,
    };
  }
}

function failedResult(agentId: string, assignmentId: string, reason: string): AgentResult {
  return {
    agentId,
    assignmentId,
    status: "failed",
    proposals: [],
    rawProposals: [],
    confidence: {
      confidence: 0,
      breakdown: {
        evidenceQuantity: 0,
        evidenceQuality: 0,
        sourceAgreement: 0,
        ontologyCompliance: 0,
        relationshipValidity: 0,
        metadataCompleteness: 0,
        conflictScore: 0,
        safetyLevel: 0,
        rulesApplied: ["execution_failed"],
      },
      recommendedRoute: "REJECT",
      rationale: [reason],
    },
    validation: { passed: false, issues: [], categories: {} as AgentResult["validation"]["categories"] },
    warnings: [],
    errors: [
      {
        code: "EXECUTION_ERROR",
        reason,
        severity: "error",
        recoverability: "skip",
        recommendedNextAction: "Inspect agent logs; compile continues with other agents",
      },
    ],
    metrics: {
      executionTimeMs: 0,
      proposalCount: 0,
      validationFailureCount: 0,
      escalationCount: 0,
      errorCount: 1,
      dependencyFailureCount: 0,
      confidenceDistribution: {},
      acceptanceRate: 0,
    },
    auditTrail: {
      agentId,
      assignmentId,
      frameworkVersion: FRAMEWORK_CONTRACT_VERSION,
      entries: [
        {
          stage: "execute",
          timestamp: new Date().toISOString(),
          action: "execution_failed",
          detail: reason,
        },
      ],
    },
    outputs: {},
  };
}

export async function executeAgentOrchestration(
  options: OrchestrationOptions
): Promise<OrchestrationResult> {
  registerDefaultAgents();
  const registry = getAgentRegistry();
  const assignments = buildWorkAssignmentsFromGaps(options.gaps);
  const layers = computeExecutionLayers(assignments);
  const executionOrder = layers.flat().map((a) => a.id);
  const parallelLayers = layers.map((l) => l.map((a) => a.id));

  const compiler = buildCompilerContext(options);
  const ontologyRequirements = expandRequirementsForNeighborhood(options.snapshot);
  const evidencePackets = buildLegacyEvidenceRefs(options.snapshot, options.evidencePacket);

  const results = new Map<string, AgentResult>();
  const entries: AgentExecutionEntry[] = [];
  let accumulatedProposals = [...options.seedProposals];
  let mergedDraft = options.mergedDraft;
  let autoReviewReport: AutoReviewReport | undefined;
  const qualityMetrics: Record<string, unknown> = {};
  let publicationOutputs: Record<string, unknown> | undefined;

  const failedAssignmentIds = new Set<string>();

  for (const layer of layers) {
    if (accumulatedProposals.length > 0) {
      mergedDraft = mergeNeighborhoodDraft(options.snapshot, accumulatedProposals);
    }

    await Promise.all(
      layer.map(async (assignment) => {
        const agent = registry.get(assignment.assignedAgentId);
        if (!agent) {
          failedAssignmentIds.add(assignment.id);
          const fr = failedResult(assignment.assignedAgentId, assignment.id, "Agent not registered");
          results.set(assignment.id, fr);
          entries.push({
            assignmentId: assignment.id,
            agentId: assignment.assignedAgentId,
            status: "failed",
            proposalCount: 0,
            executionTimeMs: 0,
            errors: ["Agent not registered"],
            warnings: [],
            skipped: false,
            timedOut: false,
          });
          return;
        }

        if (assignment.dependencies.some((dep) => failedAssignmentIds.has(dep))) {
          const fr = failedResult(
            assignment.assignedAgentId,
            assignment.id,
            "Upstream dependency failed"
          );
          fr.status = "skipped";
          fr.errors[0].code = "DEPENDENCY_FAILURE";
          results.set(assignment.id, fr);
          failedAssignmentIds.add(assignment.id);
          entries.push({
            assignmentId: assignment.id,
            agentId: assignment.assignedAgentId,
            status: "skipped",
            proposalCount: 0,
            executionTimeMs: 0,
            errors: ["Upstream dependency failed"],
            warnings: [],
            skipped: true,
            timedOut: false,
          });
          return;
        }

        const evidenceContext = options.evidencePacket
          ? buildEvidenceAgentContext(options.evidencePacket, assignment)
          : undefined;

        if (evidenceContext) {
          assignment.evidencePacketId = evidenceContext.evidencePacketId;
          assignment.relevantEvidenceItemIds = evidenceContext.relevantEvidenceItemIds;
        }

        const input: AgentInputBundle = {
          neighborhood: options.snapshot,
          ontologyRequirements: {
            entityRequirements: ontologyRequirements.entityRequirements,
            neighborhoodRequirementIds: ontologyRequirements.neighborhoodRequirementIds,
          },
          evidencePackets,
          knowledgeEvidencePacket: options.evidencePacket,
          evidenceContext,
          existingProposals: accumulatedProposals,
          gaps: options.gaps,
          compiler,
          mergedNeighborhoodDraft: mergedDraft,
          autoReviewReport,
          qualityMetrics,
        };

        const started = Date.now();
        let result: AgentResult;
        let timedOut = false;

        try {
          const executed = await executeWithTimeout(
            () => agent.execute(input, assignment),
            options.agentTimeoutMs ?? DEFAULT_AGENT_TIMEOUT_MS
          );
          result = executed.result;
          result.agentId = agent.identity.id;
          result.assignmentId = assignment.id;
          timedOut = executed.timedOut;
        } catch (error) {
          result = failedResult(
            agent.identity.id,
            assignment.id,
            error instanceof Error ? error.message : String(error)
          );
        }

        results.set(assignment.id, result);

        if (result.status === "failed" || timedOut) {
          failedAssignmentIds.add(assignment.id);
        }
        // Quality/review failures are non-blocking for downstream review routing
        if (
          (result.status === "failed" || timedOut) &&
          (assignment.type === "quality_scoring" || assignment.type === "review")
        ) {
          failedAssignmentIds.delete(assignment.id);
        }

        if (result.rawProposals.length > 0) {
          accumulatedProposals = mergeProposalSets(accumulatedProposals, result.rawProposals);
        }

        if (result.outputs.autoReviewReport) {
          autoReviewReport = result.outputs.autoReviewReport as AutoReviewReport;
        }
        if (result.outputs.publicationReadiness) {
          publicationOutputs = result.outputs as Record<string, unknown>;
        }
        if (result.outputs.qualityMetrics) {
          Object.assign(qualityMetrics, result.outputs.qualityMetrics);
        }
        if (result.outputs.duplicateReport) {
          qualityMetrics.duplicateReport = result.outputs.duplicateReport;
        }
        if (result.outputs.conflictReport) {
          qualityMetrics.conflictReport = result.outputs.conflictReport;
        }

        entries.push({
          assignmentId: assignment.id,
          agentId: agent.identity.id,
          status: timedOut ? "failed" : result.status,
          proposalCount: result.rawProposals.length,
          executionTimeMs: Date.now() - started,
          errors: result.errors.map((e) => e.reason),
          warnings: result.warnings.map((w) => w.reason),
          skipped: result.status === "skipped",
          timedOut,
        });
      })
    );
  }

  const report: AgentExecutionReport = {
    generatedAt: new Date().toISOString(),
    frameworkVersion: FRAMEWORK_CONTRACT_VERSION,
    topicKey: options.topicKey,
    pilotKey: options.pilotKey,
    executionOrder,
    parallelLayers,
    entries,
    totalProposalsEmitted: entries.reduce((s, e) => s + e.proposalCount, 0),
    uniqueProposals: accumulatedProposals.length,
    completedAgents: entries.filter((e) => e.status === "completed").length,
    failedAgents: entries.filter((e) => e.status === "failed").length,
    partialAgents: entries.filter((e) => e.status === "partial").length,
    skippedAgents: entries.filter((e) => e.skipped).length,
    databaseModified: false,
  };

  return {
    report,
    results,
    combinedProposals: accumulatedProposals,
    autoReviewReport,
    publicationOutputs,
    qualityMetrics,
  };
}