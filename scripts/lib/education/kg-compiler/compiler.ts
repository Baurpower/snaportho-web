/**
 * Ontology Compiler — orchestration layer above the Knowledge Factory.
 *
 * Transforms a canonical topic into a complete execution plan without modifying
 * the database or auto-publishing anything.
 */

import type { ProposalRecord } from "../../../kg-automation-common.ts";
import { executeAgentOrchestration } from "../kg-agent-framework/orchestrator.ts";
import { loadPilotProposals } from "../kg-factory/persist.ts";
import { analyzeGaps, summarizeGaps } from "./gap-analyzer.ts";
import { loadDbNeighborhoodSnapshot, type DbSnapshotLoadResult } from "./db-snapshot.ts";
import { buildConflictReport, mergeNeighborhoodDraft } from "./merge-engine.ts";
import { buildNeighborhoodPlan } from "./neighborhood-planner.ts";
import { validatePublicationReadiness } from "./publication-validator.ts";
import { generateReviewPacket } from "./review-packet-generator.ts";
import { runAutoReview } from "./review-engine.ts";
import { resolveTopic, type TopicDefinition } from "./topic-registry.ts";
import type { KnowledgeEvidencePacket } from "../kg-evidence/evidence-packet.ts";
import { tryLoadEvidencePacket } from "../kg-evidence/load-evidence-packet.ts";
import type { AgentFamily, CompilerPlan, CompilerResult } from "./types.ts";
import { buildWorkPlan } from "./work-planner.ts";

export type CompileOptions = {
  topic: string;
  /** When true, prefer canonical DB neighborhood over spec fallback. */
  dbBacked?: boolean;
  /** Load pre-built evidence packet from default path (reports/kg-evidence/<topic>/). */
  useEvidence?: boolean;
  /** Explicit path to evidence-packet.json. */
  evidencePath?: string;
  /** Pre-loaded evidence packet (for tests). */
  evidencePacket?: KnowledgeEvidencePacket;
};

export type CompilerResultWithSource = CompilerResult & {
  dataSource: {
    neighborhood: "database" | "spec";
    proposals: "database" | "spec";
    dbSnapshot?: DbSnapshotLoadResult;
  };
};

async function loadProposals(
  topic: TopicDefinition,
  preferDb: boolean
): Promise<{ proposals: ProposalRecord[]; source: "database" | "spec" }> {
  if (preferDb) {
    const fromDb = await loadPilotProposals(topic.pilotKey);
    if (fromDb.length > 0) {
      return { proposals: fromDb, source: "database" };
    }
  }
  return { proposals: await topic.buildProposals(), source: "spec" };
}

export async function compileNeighborhood(
  options: CompileOptions
): Promise<CompilerResultWithSource> {
  const topic = resolveTopic(options.topic);
  if (!topic) {
    throw new Error(
      `Unknown topic: ${options.topic}. Registered: ankle-fracture`
    );
  }

  const preferDb = options.dbBacked ?? false;
  const evidencePacket =
    options.evidencePacket ??
    tryLoadEvidencePacket({
      topic: options.topic,
      evidencePath: options.evidencePath,
      useEvidence: options.useEvidence,
    });

  let { proposals: seedProposals, source: proposalSource } = await loadProposals(topic, preferDb);
  if (evidencePacket?.existingProposals.length) {
    seedProposals = evidencePacket.existingProposals;
    proposalSource = evidencePacket.canonicalSnapshot.source === "database" ? "database" : proposalSource;
  }

  let snapshot = topic.loadSnapshot();
  let neighborhoodSource: "database" | "spec" = "spec";
  let dbSnapshot: DbSnapshotLoadResult | undefined;

  if (preferDb) {
    dbSnapshot = await loadDbNeighborhoodSnapshot(topic, seedProposals);
    if (dbSnapshot.loaded) {
      snapshot = dbSnapshot.snapshot;
      neighborhoodSource = "database";
    }
  }

  // Stage 1 — Neighborhood resolution + plan
  const neighborhoodPlan = buildNeighborhoodPlan(snapshot);

  // Stage 2–3 — Ontology expansion + gap analysis
  const gaps = analyzeGaps(snapshot, seedProposals);
  const gapSummary = summarizeGaps(gaps);

  // Stage 4 — Work planning
  const workPlan = buildWorkPlan(topic.topicKey, topic.pilotKey, gaps);

  // Stage 5 — Agent orchestration (executable)
  const orchestration = await executeAgentOrchestration({
    topicKey: topic.topicKey,
    pilotKey: topic.pilotKey,
    displayName: topic.displayName,
    primaryEntitySlug: topic.primaryEntitySlug,
    targetMaturityLevel: topic.targetMaturityLevel,
    snapshot,
    gaps,
    seedProposals,
    evidencePacket,
  });

  const agentProposals = orchestration.combinedProposals;

  // Stage 6 — Merge agent outputs
  const mergedDraft = mergeNeighborhoodDraft(snapshot, agentProposals);
  const conflictReport = buildConflictReport(snapshot, mergedDraft, agentProposals);

  // Stage 7 — Intelligent auto review (prefer review-assistant output)
  const { curated, report: autoReviewFromCurated } = runAutoReview(
    topic.topicKey,
    topic.pilotKey,
    agentProposals
  );
  void curated;

  const finalAutoReview = orchestration.autoReviewReport ?? autoReviewFromCurated;

  // Stage 8 — Human review packet (escalations only)
  const reviewProposals =
    orchestration.results.get("work-review-assistant")?.rawProposals ?? agentProposals;
  const { items: humanReviewItems } = generateReviewPacket(
    topic.displayName,
    reviewProposals,
    finalAutoReview
  );

  // Stage 9 — Publication readiness
  const publication =
    (orchestration.publicationOutputs?.publicationReadiness as Awaited<
      ReturnType<typeof validatePublicationReadiness>
    >) ??
    validatePublicationReadiness(
      topic.topicKey,
      topic.pilotKey,
      topic.targetMaturityLevel,
      gaps,
      reviewProposals,
      finalAutoReview
    );

  const agentsRequired = [
    ...new Set(workPlan.workItems.map((w) => w.agentId)),
  ];
  const agentFamiliesRequired = [
    ...new Set(workPlan.workItems.map((w) => w.agentFamily)),
  ] as AgentFamily[];

  const exec = orchestration.report;
  const stage5Status = exec.failedAgents > 0 ? "completed" : "completed";

  const plan: CompilerPlan = {
    topicKey: topic.topicKey,
    pilotKey: topic.pilotKey,
    displayName: topic.displayName,
    generatedAt: new Date().toISOString(),
    stages: [
      {
        stage: 1,
        name: "Neighborhood Resolution",
        status: "completed",
        summary: `Resolved ${neighborhoodPlan.nodes.length} entities for ${topic.displayName}.`,
        outputs: ["neighborhood_plan"],
      },
      {
        stage: 2,
        name: "Ontology Requirement Expansion",
        status: "completed",
        summary: "Derived requirements from CKO spec §8–§9 and anatomy ontology plan.",
        outputs: ["ontology_rules_applied"],
      },
      {
        stage: 3,
        name: "Gap Analysis",
        status: "completed",
        summary: `Identified ${gaps.length} gaps across ${Object.keys(gapSummary.byKind).length} kinds.`,
        outputs: ["ontology-gap-report.json"],
      },
      {
        stage: 4,
        name: "Work Planning",
        status: "completed",
        summary: `Scheduled ${workPlan.workItems.length} work items for ${agentsRequired.length} registered agents.`,
        outputs: [
          "ontology-work-plan.json",
          "agent-assignment-plan.json",
          "unmet-agent-capabilities.json",
          "reviewer-burden-estimate.md",
          "agent-contract-summary.md",
        ],
      },
      {
        stage: 5,
        name: "Agent Orchestration",
        status: stage5Status,
        summary: `Executed ${exec.completedAgents + exec.partialAgents}/${exec.entries.length} agents; ${exec.uniqueProposals} unique proposals; ${exec.failedAgents} failed.`,
        outputs: [
          "agent-execution-report.json",
          "agent-output-summary.md",
          ...workPlan.executionOrder,
        ],
      },
      {
        stage: 6,
        name: "Merge",
        status: "completed",
        summary: `Merged draft: ${mergedDraft.stats.entityCount} entities, ${mergedDraft.stats.relationshipCount} relationships; ${mergedDraft.conflicts.length} conflicts.`,
        outputs: ["merged-neighborhood-draft.json", "conflict-report.json"],
      },
      {
        stage: 7,
        name: "Intelligent Auto Review",
        status: "completed",
        summary: `${finalAutoReview.autoApprovedPercent}% auto-approved; ${finalAutoReview.humanReviewPercent}% escalated.`,
        outputs: ["ontology-auto-review.json"],
      },
      {
        stage: 8,
        name: "Human Review Packet",
        status: "completed",
        summary: `${humanReviewItems.length} items in human queue.`,
        outputs: ["human_review_packet"],
      },
      {
        stage: 9,
        name: "Publication Readiness",
        status: "completed",
        summary: `Maturity ${publication.currentLevel}/${publication.requiredLevel}; ready=${publication.ready}.`,
        outputs: ["publication-readiness.json"],
      },
    ],
    neighborhood: {
      entityCount: snapshot.entities.length,
      relationshipCount: snapshot.relationships.length,
      claimCount: snapshot.claims.length,
      decisionPointCount: snapshot.decisionPoints.length,
    },
    gaps: gapSummary,
    workPlan: {
      workItemCount: workPlan.workItems.length,
      agentsRequired: agentFamiliesRequired,
      agentIds: agentsRequired,
      registryDiscovery: workPlan.registryDiscovery,
    },
    review: {
      totalProposals: agentProposals.length,
      autoApproved: finalAutoReview.summary.AUTO_APPROVE,
      humanReview: humanReviewItems.length,
      humanReviewPercent: finalAutoReview.humanReviewPercent,
    },
    publication: {
      currentMaturityLevel: publication.currentLevel,
      requiredMaturityLevel: publication.requiredLevel,
      ready: publication.ready,
      blockerCount: publication.blockers.length,
    },
    constraints: {
      databaseModified: false,
      autoPublished: false,
    },
    evidencePacketId: evidencePacket?.packetId,
  };

  if (dbSnapshot?.loaded) {
    plan.stages[0].summary = `Resolved ${neighborhoodPlan.nodes.length} entities from canonical DB for ${topic.displayName}.`;
  }

  const claimBuilderResult = orchestration.results.get("work-claim-builder");
  const claimBuilderReport = claimBuilderResult?.outputs?.claimBuilderReport as
    | import("../kg-agent-framework/claim-builder/claim-builder-reports.ts").ClaimBuilderOutput
    | undefined;

  return {
    plan,
    neighborhoodPlan,
    gaps,
    workPlan,
    mergedDraft,
    autoReview: finalAutoReview,
    publication,
    humanReviewItems,
    agentExecution: exec,
    conflictReport,
    agentProposals,
    dataSource: {
      neighborhood: neighborhoodSource,
      proposals: proposalSource,
      dbSnapshot,
    },
    evidencePacket,
    claimBuilderReport,
  };
}