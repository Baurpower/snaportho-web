import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { ProposalRecord } from "../../../kg-automation-common.ts";
import type { AgentAssignmentPlan } from "../kg-agent-framework/agent-reports.ts";
import type { AgentExecutionReport } from "../kg-agent-framework/orchestrator.ts";
import { loadDbNeighborhoodSnapshot } from "../kg-compiler/db-snapshot.ts";
import type { ConflictReport } from "../kg-compiler/merge-engine.ts";
import { mergeNeighborhoodDraft } from "../kg-compiler/merge-engine.ts";
import { resolveTopic } from "../kg-compiler/topic-registry.ts";
import type {
  AutoReviewReport,
  CompilerPlan,
  MergedNeighborhoodDraft,
  NeighborhoodPlan,
  OntologyGap,
  PublicationReadinessResult,
  WorkPlan,
} from "../kg-compiler/types.ts";
import { loadEvidencePacketFromFile } from "../kg-evidence/load-evidence-packet.ts";
import type { KnowledgeEvidencePacket } from "../kg-evidence/evidence-packet.ts";
import { loadPilotProposals } from "../kg-factory/persist.ts";
import type { AuditInputBundle } from "./types.ts";

export type LoadAuditInputOptions = {
  topic: string;
  compilerDir?: string;
  evidenceDir?: string;
  pilotDir?: string;
  dbBacked?: boolean;
  strictDb?: boolean;
  batchKey?: string;
};

const COMPILER_ARTIFACTS = [
  "ontology-compiler-plan.json",
  "ontology-gap-report.json",
  "ontology-work-plan.json",
  "agent-execution-report.json",
  "merged-neighborhood-draft.json",
  "publication-readiness.json",
  "ontology-auto-review.json",
  "ontology-human-review-queue.json",
  "conflict-report.json",
  "agent-assignment-plan.json",
  "ontology-neighborhood-plan.json",
  "ontology-data-source.json",
] as const;

function readJson<T>(filePath: string): T | undefined {
  if (!existsSync(filePath)) return undefined;
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function compilerPath(base: string, topicKey: string, name: string): string {
  return path.join(base, topicKey, name);
}

function snapshotToMergedDraft(
  topicKey: string,
  pilotKey: string,
  snapshot: ReturnType<NonNullable<ReturnType<typeof resolveTopic>>["loadSnapshot"]>
): MergedNeighborhoodDraft {
  return {
    topicKey,
    pilotKey,
    generatedAt: new Date().toISOString(),
    entities: snapshot.entities,
    relationships: snapshot.relationships,
    claims: snapshot.claims,
    decisionPoints: snapshot.decisionPoints,
    conflicts: [],
    stats: {
      entityCount: snapshot.entities.length,
      relationshipCount: snapshot.relationships.length,
      claimCount: snapshot.claims.length,
      decisionPointCount: snapshot.decisionPoints.length,
      bridgeCount: 0,
      duplicateEntitiesResolved: 0,
      conflictingRelationships: 0,
      metadataMerged: 0,
      provenanceAttached: 0,
    },
  };
}

export async function loadAuditInput(options: LoadAuditInputOptions): Promise<AuditInputBundle> {
  const topicDef = resolveTopic(options.topic);
  if (!topicDef) {
    throw new Error(`Unknown topic: ${options.topic}`);
  }

  const compilerBase = path.join(process.cwd(), options.compilerDir ?? "reports/kg-compiler");
  const evidenceBase = path.join(process.cwd(), options.evidenceDir ?? "reports/kg-evidence");
  const pilotBase = path.join(process.cwd(), options.pilotDir ?? "reports/kg-pilots");

  const reportsLoaded: string[] = [];
  const reportsMissing: string[] = [];

  function loadArtifact<T>(name: string): T | undefined {
    const file = compilerPath(compilerBase, topicDef.topicKey, name);
    const data = readJson<T>(file);
    if (data) {
      reportsLoaded.push(name);
      return data;
    }
    reportsMissing.push(name);
    return undefined;
  }

  const compilerPlan = loadArtifact<CompilerPlan>("ontology-compiler-plan.json");
  const gapReport = loadArtifact<{ gaps: OntologyGap[] }>("ontology-gap-report.json");
  const workPlan = loadArtifact<WorkPlan>("ontology-work-plan.json");
  const agentExecution = loadArtifact<AgentExecutionReport>("agent-execution-report.json");
  const mergedDraft = loadArtifact<MergedNeighborhoodDraft>("merged-neighborhood-draft.json");
  let publication =
    loadArtifact<PublicationReadinessResult>("publication-readiness.json") ??
    loadArtifact<PublicationReadinessResult>("ontology-publication-readiness.json");
  const autoReview = loadArtifact<AutoReviewReport>("ontology-auto-review.json");
  const humanReviewQueue = loadArtifact<Array<Record<string, unknown>>>("ontology-human-review-queue.json");
  const conflictReport = loadArtifact<ConflictReport>("conflict-report.json");
  const assignmentPlan = loadArtifact<AgentAssignmentPlan>("agent-assignment-plan.json");
  const neighborhoodPlan = loadArtifact<NeighborhoodPlan>("ontology-neighborhood-plan.json");

  let evidencePacket: KnowledgeEvidencePacket | undefined;
  const evidencePath = path.join(evidenceBase, topicDef.topicKey, "evidence-packet.json");
  if (existsSync(evidencePath)) {
    evidencePacket = loadEvidencePacketFromFile(evidencePath);
    reportsLoaded.push("evidence-packet.json");
  } else {
    reportsMissing.push("evidence-packet.json");
  }

  let proposals: ProposalRecord[] = [];
  if (options.dbBacked) {
    const fromDb = await loadPilotProposals(topicDef.pilotKey, options.batchKey);
    if (fromDb.length > 0) {
      proposals = fromDb;
      reportsLoaded.push("database-proposals");
    }
    if (options.strictDb && fromDb.length === 0) throw new Error(`Strict DB audit requires persisted proposals for ${topicDef.topicKey}`);
  }
  if (proposals.length === 0 && evidencePacket?.existingProposals.length) {
    proposals = evidencePacket.existingProposals;
  }
  if (proposals.length === 0) {
    const curatedPath = path.join(pilotBase, `${topicDef.topicKey}-curated-proposals.json`);
    const curated = readJson<{ proposals: ProposalRecord[] }>(curatedPath);
    if (curated?.proposals.length) {
      proposals = curated.proposals;
      reportsLoaded.push(`${topicDef.topicKey}-curated-proposals.json`);
    }
  }
  if (proposals.length === 0) {
    proposals = await topicDef.buildProposals();
    reportsLoaded.push("spec-proposals");
  }

  let resolvedDraft = mergedDraft;
  let dataSource: AuditInputBundle["dataSource"] = "merged_draft";

  if (options.dbBacked) {
      const dbSnapshot = await loadDbNeighborhoodSnapshot(topicDef, proposals, { strictDb: options.strictDb, batchKey: options.batchKey });
      if (dbSnapshot.loaded) {
        resolvedDraft = snapshotToMergedDraft(topicDef.topicKey, topicDef.pilotKey, dbSnapshot.snapshot);
        dataSource = "database";
        reportsLoaded.push("database-neighborhood-snapshot");
        if (publication && dbSnapshot.snapshot.entities.length > 0) {
          const blockers = publication.blockers.filter(
            (blocker) => blocker !== "No approved canonical entities in database yet — proposals remain offline/spec."
          );
          if (blockers.length !== publication.blockers.length) {
            publication = { ...publication, blockers };
            reportsLoaded.push("publication-readiness-database-state-reconciled");
          }
        }
      }
  }

  if (options.strictDb && dataSource !== "database") throw new Error(`Strict DB audit refused file/spec fallback for ${topicDef.topicKey}`);

  if (!resolvedDraft) {
    const snapshot = topicDef.loadSnapshot();
    if (proposals.length > 0) {
      resolvedDraft = mergeNeighborhoodDraft(snapshot, proposals);
      dataSource = "compiler_snapshot";
    } else {
      resolvedDraft = snapshotToMergedDraft(topicDef.topicKey, topicDef.pilotKey, snapshot);
      dataSource = "spec";
      reportsMissing.push("merged-neighborhood-draft.json");
    }
  }

  return {
    topicKey: topicDef.topicKey,
    pilotKey: topicDef.pilotKey,
    displayName: topicDef.displayName,
    primaryEntitySlug: topicDef.primaryEntitySlug,
    targetMaturityLevel: topicDef.targetMaturityLevel,
    mergedDraft: resolvedDraft,
    gaps: gapReport?.gaps ?? [],
    workPlan,
    compilerPlan,
    neighborhoodPlan,
    autoReview,
    publication,
    agentExecution,
    conflictReport,
    assignmentPlan,
    humanReviewQueue,
    evidencePacket,
    proposals,
    reportsLoaded,
    reportsMissing,
    dataSource,
  };
}
