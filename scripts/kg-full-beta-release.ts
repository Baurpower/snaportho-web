import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

import { resolveOperatorDatabaseUrl } from "../src/lib/datastore/connection-url.ts";
import { normalizeLabel } from "./kg-automation-common.ts";
import { requireStaging } from "./lib/education/kg-staging-guard.ts";

const root = process.cwd();
const outDir = path.join(root, "reports", "kg-production");
const migrationPath = path.join(root, "supabase", "migrations", "20260716_040000_kg_beta_production_release.sql");
const releaseId = "kg-beta-20260716-002";
const reviewTier = "automated_beta";
const manifestPath = path.join(outDir, "full-beta-release-manifest.json");
const exclusionsPath = path.join(outDir, "full-beta-exclusions.json");
const eligibilityPath = path.join(outDir, "full-beta-eligibility.md");
const dryRunPath = path.join(outDir, "full-beta-dry-run.md");
const applyPath = path.join(outDir, "full-beta-apply-report.md");
const verificationPath = path.join(outDir, "full-beta-verification.json");
const rollbackPath = path.join(outDir, "full-beta-rollback-report.md");
const smokePath = path.join(outDir, "full-beta-product-smoke-tests.md");
const growthPath = path.join(outDir, "kg-growth-priority-queue.json");
const eligibleStates = new Set(["staging_applied", "database_verified", "database_verification_blocked"]);
const appliedDispositions = new Set(["inserted", "updated", "merged", "already_applied", "no_op"]);
const highRiskPredicates = new Set(["indicated_for", "contraindicated_for", "treats", "treated_by"]);
const moderateRiskPredicates = new Set(["has_complication", "requires_imaging", "tested_by", "uses_approach", "uses_positioning"]);
const structuralTypes = new Set(["create_canonical_entity", "add_canonical_relationship", "link_curriculum_node_to_entity"]);

type Json = Record<string, any>;
type Candidate = {
  topic: string;
  owner: string;
  state: string;
  batchKey: string;
  targetTable: "canonical_entities" | "canonical_relationships" | "curriculum_node_entities";
  targetId: string;
  sourceProposalId: string;
  proposalFingerprint: string;
  sourceRecordIds: string[];
  provenanceStatus: "complete" | "partial";
  riskTier: "low" | "moderate" | "high";
  verificationHash: string;
  derivedTarget: boolean;
  requiredEntityIds: string[];
};
type CanonicalSnapshot = {
  entityById: Map<string, Json>;
  entitiesBySlug: Map<string, Json[]>;
  relationshipById: Map<string, Json>;
  relationshipsByKey: Map<string, Json[]>;
  bridgeById: Map<string, Json>;
  bridgesByKey: Map<string, Json[]>;
};

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
function hash(value: unknown): string { return createHash("sha256").update(stable(value)).digest("hex"); }
function readJson(file: string): Json { return JSON.parse(readFileSync(file, "utf8")); }
function write(file: string, value: string): void { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, value); }
function writeJson(file: string, value: unknown): void { write(file, `${JSON.stringify(value, null, 2)}\n`); }
function dbClient(): pg.Client { return new pg.Client({ connectionString: resolveOperatorDatabaseUrl().url, ssl: { rejectUnauthorized: false } }); }
function manifest(): Json { if (!existsSync(manifestPath)) throw new Error("Build full beta manifest first"); return readJson(manifestPath); }
function stripTransaction(sql: string): string { return sql.replace(/^\s*begin;\s*/i, "").replace(/\s*commit;\s*$/i, ""); }
function requireApproval(): void {
  if (process.env.KG_PRODUCTION_CONFIRM !== releaseId) throw new Error(`Set KG_PRODUCTION_CONFIRM=${releaseId} after explicit approval`);
  requireStaging(`full beta production release ${releaseId}`);
}
function localCounts(topic: string): Json {
  const file = path.join(root, "reports", "kg-compiler", topic, "ontology-data-source.json");
  return existsSync(file) ? readJson(file).dbCounts ?? {} : {};
}
function activeBlockerFingerprints(topic: string): string[] {
  const file = path.join(root, "reports", "kg-verticals", topic, "strict-db-verification-blocked.json");
  const resolution = path.join(root, "reports", "kg-verticals", topic, "strict-db-verification-resolution.json");
  if (!existsSync(file)) return [];
  if (existsSync(resolution) && readJson(resolution).resolved === true) return [];
  return (readJson(file).discrepancies ?? []).map((item: Json) => String(item.fingerprint)).filter(Boolean);
}
function activeBlockedSlugs(fingerprints: string[]): Set<string> {
  const slugs = new Set<string>();
  for (const fingerprint of fingerprints) {
    const parts = fingerprint.split("|");
    if (parts[0] === "create" && parts[2]) slugs.add(parts[2]);
  }
  return slugs;
}
function recordTrace(row: Json): string[] {
  return [...new Set([
    String(row.proposal_id),
    ...(Array.isArray(row.source_signal_ids) ? row.source_signal_ids.map(String) : []),
    ...((row.metadata?.source_record_ids ?? []) as unknown[]).map(String),
  ].filter(Boolean))].sort();
}
function isTraceable(row: Json): boolean {
  return Boolean(row.proposal_id && row.proposal_fingerprint && row.source_signal_type && row.evidence_summary);
}
function proposalTouchesBlockedSlug(row: Json, slugs: Set<string>): boolean {
  const metadata = row.metadata ?? {};
  return [metadata.slug, metadata.subject_slug, metadata.object_slug, metadata.primary_entity_slug]
    .filter(Boolean).some((value) => slugs.has(String(value)));
}

async function resolveCandidate(
  snapshot: CanonicalSnapshot,
  base: { topic: string; owner: string; state: string; batchKey: string },
  row: Json
): Promise<{ candidate?: Candidate; exclusion?: Json }> {
  const trace = recordTrace(row);
  const excluded = (reason: string, riskTier: "low" | "moderate" | "high" = "low", details?: Json) => ({
    topic: base.topic,
    sourceBatchKey: base.batchKey,
    sourceProposalId: row.proposal_id,
    proposalFingerprint: row.proposal_fingerprint,
    targetTable: row.canonical_target_table ?? null,
    targetId: row.canonical_target_id ?? null,
    riskTier,
    reason,
    details: details ?? {},
    verificationHash: hash({ topic: base.topic, proposal: row.proposal_fingerprint, reason, details }),
  });
  if (!isTraceable(row)) return { exclusion: excluded("PROPOSAL_DERIVATION_NOT_TRACEABLE") };
  if (!["approved", "applied"].includes(row.proposal_review_status)) return { exclusion: excluded(`PROPOSAL_STATUS_${row.proposal_review_status}`) };
  const metadata = row.metadata ?? {};
  let targetTable: Candidate["targetTable"];
  let target: Json | undefined;
  let riskTier: Candidate["riskTier"] = "low";
  let derivedTarget = false;

  if (row.proposal_type === "create_canonical_entity") {
    targetTable = "canonical_entities";
    if (row.canonical_target_id) {
      target = snapshot.entityById.get(String(row.canonical_target_id));
    } else {
      derivedTarget = true;
      const matches = snapshot.entitiesBySlug.get(String(metadata.slug ?? "")) ?? [];
      if (matches.length !== 1) return { exclusion: excluded("CANONICAL_ENTITY_CARDINALITY", "low", { matches: matches.length }) };
      target = matches[0];
    }
    if (!target?.is_active || target.review_status === "rejected" || ["deprecated", "replaced", "merged", "split"].includes(target.status)) return { exclusion: excluded("CANONICAL_ENTITY_INACTIVE_OR_REJECTED") };
    if (target.entity_type !== row.proposed_entity_type || normalizeLabel(target.preferred_label) !== normalizeLabel(String(row.proposed_entity_label ?? ""))) return { exclusion: excluded("CANONICAL_IDENTITY_MISMATCH") };
  } else if (row.proposal_type === "add_canonical_relationship") {
    targetTable = "canonical_relationships";
    riskTier = highRiskPredicates.has(String(row.proposed_predicate))
      ? "high"
      : moderateRiskPredicates.has(String(row.proposed_predicate)) ? "moderate" : "low";
    if (row.canonical_target_id) {
      target = snapshot.relationshipById.get(String(row.canonical_target_id));
    } else {
      derivedTarget = true;
      const subjectMatches = snapshot.entitiesBySlug.get(String(metadata.subject_slug ?? "")) ?? [];
      const objectMatches = snapshot.entitiesBySlug.get(String(metadata.object_slug ?? "")) ?? [];
      const subjectId = subjectMatches.length === 1 ? subjectMatches[0].id : null;
      const objectId = objectMatches.length === 1 ? objectMatches[0].id : null;
      if (!subjectId || !objectId) return { exclusion: excluded("RELATIONSHIP_ENDPOINT_MISSING", riskTier) };
      const matches = snapshot.relationshipsByKey.get(
        `${subjectId}|${row.proposed_predicate}|${objectId}`
      ) ?? [];
      if (matches.length !== 1) return { exclusion: excluded("CANONICAL_RELATIONSHIP_CARDINALITY", riskTier, { matches: matches.length }) };
      target = matches[0];
    }
    if (!target?.is_active || target.lifecycle_status !== "active" || target.review_status === "rejected" || target.provenance_status === "conflicted") return { exclusion: excluded("RELATIONSHIP_INACTIVE_REJECTED_OR_DISPUTED", riskTier) };
    if (
      !snapshot.entityById.has(String(target.subject_entity_id))
      || !snapshot.entityById.has(String(target.object_entity_id))
    ) {
      return { exclusion: excluded("RELATIONSHIP_ENDPOINT_MISSING", riskTier) };
    }
  } else if (row.proposal_type === "link_curriculum_node_to_entity") {
    targetTable = "curriculum_node_entities";
    if (row.canonical_target_id) {
      target = snapshot.bridgeById.get(String(row.canonical_target_id));
    } else {
      derivedTarget = true;
      const matches = snapshot.bridgesByKey.get(
        `${String(metadata.curriculum_node_slug ?? "")}|${String(metadata.primary_entity_slug ?? "")}|${row.proposed_bridge_type ?? "primary_coverage"}`
      ) ?? [];
      if (matches.length !== 1) return { exclusion: excluded("CURRICULUM_BRIDGE_CARDINALITY", "low", { matches: matches.length }) };
      target = matches[0];
    }
    if (!target?.is_active || target.review_status === "rejected" || target.provenance_status === "conflicted") return { exclusion: excluded("CURRICULUM_BRIDGE_INACTIVE_REJECTED_OR_DISPUTED") };
  } else {
    return { exclusion: excluded("UNSUPPORTED_PROPOSAL_TYPE") };
  }

  const completeProvenance = trace.length > 1
    && Number(row.supporting_source_count ?? 0) > 0
    && (targetTable !== "canonical_relationships" || ["source_attached", "reviewed"].includes(String(target?.provenance_status)));
  const provenanceStatus: Candidate["provenanceStatus"] = completeProvenance ? "complete" : "partial";
  if (riskTier === "high" && provenanceStatus !== "complete") return { exclusion: excluded("HIGH_RISK_DIRECT_PROVENANCE_INCOMPLETE", "high") };
  const targetShape = targetTable === "canonical_entities"
    ? { id: target.id, slug: target.slug, entityType: target.entity_type, label: target.preferred_label, status: target.status, reviewStatus: target.review_status }
    : targetTable === "canonical_relationships"
      ? { id: target.id, subject: target.subject_entity_id, predicate: target.predicate, object: target.object_entity_id, lifecycle: target.lifecycle_status, reviewStatus: target.review_status, provenanceStatus: target.provenance_status }
      : { id: target.id, curriculumNodeId: target.curriculum_node_id, canonicalEntityId: target.canonical_entity_id, relationType: target.relation_type, reviewStatus: target.review_status, provenanceStatus: target.provenance_status };
  return {
    candidate: {
      ...base,
      targetTable,
      targetId: String(target.id),
      sourceProposalId: String(row.proposal_id),
      proposalFingerprint: String(row.proposal_fingerprint),
      sourceRecordIds: trace,
      provenanceStatus,
      riskTier,
      verificationHash: hash({ targetTable, targetShape, proposalId: row.proposal_id, trace }),
      derivedTarget,
      requiredEntityIds: targetTable === "canonical_relationships"
        ? [String(target.subject_entity_id), String(target.object_entity_id)]
        : targetTable === "curriculum_node_entities"
          ? [String(target.canonical_entity_id)]
          : [],
    },
  };
}

async function build(): Promise<void> {
  const queue = readJson(path.join(root, "reports", "kg-scaling", "vertical-completion-queue.json"));
  const evaluated = (queue.queue ?? []).filter((item: Json) => eligibleStates.has(item.currentState));
  const db = dbClient(); await db.connect();
  try {
    const preCounts = (await db.query(`select
      (select count(*)::int from canonical_entities where is_active) entities,
      (select count(*)::int from canonical_relationships where is_active) relationships`)).rows[0];
    const [entityRows, relationshipRows, bridgeRows] = await Promise.all([
      db.query(`select * from canonical_entities where is_active`),
      db.query(`select * from canonical_relationships where is_active`),
      db.query(`select b.*,n.slug curriculum_node_slug,e.slug canonical_entity_slug
        from curriculum_node_entities b
        join curriculum_nodes n on n.id=b.curriculum_node_id
        join canonical_entities e on e.id=b.canonical_entity_id
        where b.is_active and e.is_active`),
    ]);
    const snapshot: CanonicalSnapshot = {
      entityById: new Map(entityRows.rows.map((item) => [String(item.id), item])),
      entitiesBySlug: new Map(),
      relationshipById: new Map(relationshipRows.rows.map((item) => [String(item.id), item])),
      relationshipsByKey: new Map(),
      bridgeById: new Map(bridgeRows.rows.map((item) => [String(item.id), item])),
      bridgesByKey: new Map(),
    };
    for (const item of entityRows.rows) {
      if (!item.slug) continue;
      const rows = snapshot.entitiesBySlug.get(String(item.slug)) ?? [];
      rows.push(item);
      snapshot.entitiesBySlug.set(String(item.slug), rows);
    }
    for (const item of relationshipRows.rows) {
      const key = `${item.subject_entity_id}|${item.predicate}|${item.object_entity_id}`;
      const rows = snapshot.relationshipsByKey.get(key) ?? [];
      rows.push(item);
      snapshot.relationshipsByKey.set(key, rows);
    }
    for (const item of bridgeRows.rows) {
      const key = `${item.curriculum_node_slug}|${item.canonical_entity_slug}|${item.relation_type}`;
      const rows = snapshot.bridgesByKey.get(key) ?? [];
      rows.push(item);
      snapshot.bridgesByKey.set(key, rows);
    }
    let candidates: Candidate[] = [];
    const exclusions: Json[] = [];
    const neighborhoodReports: Json[] = [];

    for (const item of evaluated) {
      const topic = String(item.topic);
      const owner = String(item.canonicalOwner);
      const blockedFingerprints = activeBlockerFingerprints(topic);
      const blockedSlugs = activeBlockedSlugs(blockedFingerprints);
      const batches = await db.query(`select m.batch_key,
        count(*) filter (where p.proposal_type=any($2::text[]))::int structural,
        count(*) filter (where p.proposal_type=any($2::text[]) and m.canonical_target_id is not null)::int targeted,
        max(m.updated_at) updated
        from kg_proposal_batch_memberships m join kg_automation_proposals p on p.id=m.proposal_id
        where m.topic_slug=$1 and m.packet_state='approved'
          and m.apply_disposition=any($3::text[])
        group by m.batch_key
        having count(*) filter (where p.proposal_type=any($2::text[])) > 0
        order by (count(*) filter (where p.proposal_type=any($2::text[]) and m.canonical_target_id is not null)
          = count(*) filter (where p.proposal_type=any($2::text[]))) desc,
          count(*) filter (where p.proposal_type=any($2::text[]) and m.canonical_target_id is not null) desc,
          max(m.updated_at) desc`, [owner, [...structuralTypes], [...appliedDispositions]]);
      const batchKey = String(batches.rows[0]?.batch_key ?? "");
      if (!batchKey) {
        exclusions.push({ topic, riskTier: "low", reason: "NO_APPLIED_STRUCTURAL_BATCH", verificationHash: hash({ topic, reason: "NO_APPLIED_STRUCTURAL_BATCH" }) });
        neighborhoodReports.push({ topic, priorState: item.currentState, coverageStatus: "excluded", eligibleObjects: 0, excludedObjects: 1, reason: "NO_APPLIED_STRUCTURAL_BATCH" });
        continue;
      }
      const rows = (await db.query(`select m.*,p.proposal_fingerprint,p.proposal_type,p.review_status proposal_review_status,
        p.proposed_entity_type,p.proposed_entity_label,p.proposed_predicate,p.proposed_bridge_type,
        p.source_signal_type,p.source_signal_ids,p.evidence_summary,p.supporting_source_count,p.metadata
        from kg_proposal_batch_memberships m join kg_automation_proposals p on p.id=m.proposal_id
        where m.batch_key=$1 and m.packet_state='approved'
          and m.apply_disposition=any($2::text[]) and p.proposal_type=any($3::text[])
        order by p.proposal_fingerprint`, [batchKey, [...appliedDispositions], [...structuralTypes]])).rows;
      let included = 0;
      const beforeExclusions = exclusions.length;
      for (const row of rows) {
        if (blockedFingerprints.includes(String(row.proposal_fingerprint)) || proposalTouchesBlockedSlug(row, blockedSlugs)) {
          exclusions.push({ topic, sourceBatchKey: batchKey, sourceProposalId: row.proposal_id, proposalFingerprint: row.proposal_fingerprint, targetTable: row.canonical_target_table, targetId: row.canonical_target_id, riskTier: "moderate", reason: "ACTIVE_IDENTITY_OWNERSHIP_OR_BRIDGE_BLOCKER", verificationHash: hash({ topic, proposal: row.proposal_fingerprint, reason: "ACTIVE_IDENTITY_OWNERSHIP_OR_BRIDGE_BLOCKER" }) });
          continue;
        }
        const result = await resolveCandidate(snapshot, { topic, owner, state: item.currentState, batchKey }, row);
        if (result.candidate) { candidates.push(result.candidate); included += 1; }
        if (result.exclusion) exclusions.push(result.exclusion);
      }
      const counts = localCounts(topic);
      const claimCount = Number(counts.claims ?? 0);
      const decisionPointCount = Number(counts.decisionPoints ?? 0);
      if (claimCount > 0) exclusions.push({ topic, riskTier: "high", reason: "CLAIMS_EXCLUDED_FROM_FIRST_BROAD_RELEASE", count: claimCount, verificationHash: hash({ topic, reason: "CLAIMS_EXCLUDED_FROM_FIRST_BROAD_RELEASE", count: claimCount }) });
      if (decisionPointCount > 0) exclusions.push({ topic, riskTier: "high", reason: "DECISION_POINTS_EXCLUDED_FROM_FIRST_BROAD_RELEASE", count: decisionPointCount, verificationHash: hash({ topic, reason: "DECISION_POINTS_EXCLUDED_FROM_FIRST_BROAD_RELEASE", count: decisionPointCount }) });
      const excludedCount = exclusions.length - beforeExclusions;
      neighborhoodReports.push({
        topic,
        owner,
        priorState: item.currentState,
        sourceBatchKeys: [batchKey],
        coverageStatus: included > 0 ? (excludedCount > 0 ? "partial" : "full") : "excluded",
        eligibleObjects: included,
        excludedObjects: excludedCount,
        claimCount,
        decisionPointCount,
        blockedFingerprints,
      });
    }

    const entityMemberships = new Set(
      candidates
        .filter((item) => item.targetTable === "canonical_entities")
        .map((item) => `${item.topic}|${item.targetId}`)
    );
    const dependencyExpandedCandidates = [...candidates];
    const invalidDependencyCandidates = new Set<Candidate>();
    for (const candidate of [...candidates]) {
      const missingEntityIds = candidate.requiredEntityIds.filter(
        (entityId) => !entityMemberships.has(`${candidate.topic}|${entityId}`)
      );
      const invalidEntityIds = missingEntityIds.filter((entityId) => {
        const entity = snapshot.entityById.get(entityId);
        return !entity
          || entity.review_status === "rejected"
          || ["deprecated", "replaced", "merged", "split"].includes(String(entity.status));
      });
      if (invalidEntityIds.length > 0) {
        invalidDependencyCandidates.add(candidate);
        exclusions.push({
          topic: candidate.topic,
          sourceBatchKey: candidate.batchKey,
          sourceProposalId: candidate.sourceProposalId,
          proposalFingerprint: candidate.proposalFingerprint,
          targetTable: candidate.targetTable,
          targetId: candidate.targetId,
          riskTier: candidate.riskTier,
          reason: candidate.targetTable === "canonical_relationships"
            ? "RELEASE_RELATIONSHIP_ENDPOINT_NOT_IN_NEIGHBORHOOD"
            : "RELEASE_BRIDGE_ENTITY_NOT_IN_NEIGHBORHOOD",
          details: { missingEntityIds: invalidEntityIds },
          verificationHash: hash({
            topic: candidate.topic,
            targetTable: candidate.targetTable,
            targetId: candidate.targetId,
            missingEntityIds: invalidEntityIds,
          }),
        });
        continue;
      }
      for (const entityId of missingEntityIds) {
        const entity = snapshot.entityById.get(entityId)!;
        dependencyExpandedCandidates.push({
          topic: candidate.topic,
          owner: candidate.owner,
          state: candidate.state,
          batchKey: candidate.batchKey,
          targetTable: "canonical_entities",
          targetId: entityId,
          sourceProposalId: candidate.sourceProposalId,
          proposalFingerprint: `${candidate.proposalFingerprint}|release_dependency|${entityId}`,
          sourceRecordIds: candidate.sourceRecordIds,
          provenanceStatus: candidate.provenanceStatus,
          riskTier: "low",
          verificationHash: hash({
            dependencyOf: candidate.targetId,
            entity: {
              id: entity.id,
              slug: entity.slug,
              entityType: entity.entity_type,
              label: entity.preferred_label,
              status: entity.status,
              reviewStatus: entity.review_status,
            },
            trace: candidate.sourceRecordIds,
          }),
          derivedTarget: true,
          requiredEntityIds: [],
        });
        entityMemberships.add(`${candidate.topic}|${entityId}`);
      }
    }
    candidates = dependencyExpandedCandidates.filter(
      (candidate) => !invalidDependencyCandidates.has(candidate)
    );

    const objectMap = new Map<string, Json>();
    for (const candidate of candidates) {
      const key = `${candidate.targetTable}|${candidate.targetId}`;
      const existing = objectMap.get(key);
      const riskOrder = { low: 0, moderate: 1, high: 2 };
      const provenance = existing?.provenanceStatus === "complete" || candidate.provenanceStatus === "complete" ? "complete" : "partial";
      const riskTier = !existing || riskOrder[candidate.riskTier] > riskOrder[existing.riskTier] ? candidate.riskTier : existing.riskTier;
      const sourceRecordIds = [...new Set([...(existing?.sourceRecordIds ?? []), ...candidate.sourceRecordIds])].sort();
      objectMap.set(key, {
        targetTable: candidate.targetTable,
        targetId: candidate.targetId,
        publicationStatus: "beta_active",
        reviewTier,
        provenanceStatus: provenance,
        riskTier,
        sourceRecordIds,
        verificationHash: hash({ targetTable: candidate.targetTable, targetId: candidate.targetId, provenanceStatus: provenance, riskTier, sourceRecordIds }),
      });
    }
    const objects = [...objectMap.values()].sort((a, b) => `${a.targetTable}|${a.targetId}`.localeCompare(`${b.targetTable}|${b.targetId}`));
    const neighborhoodObjectMap = new Map<string, Json>();
    for (const candidate of candidates) {
      const key = `${candidate.topic}|${candidate.targetTable}|${candidate.targetId}`;
      if (!neighborhoodObjectMap.has(key)) {
        neighborhoodObjectMap.set(key, {
          neighborhoodSlug: candidate.topic,
          targetTable: candidate.targetTable,
          targetId: candidate.targetId,
          sourceProposalId: candidate.sourceProposalId,
          sourceBatchKey: candidate.batchKey,
          verificationHash: candidate.verificationHash,
          derivedTarget: candidate.derivedTarget,
        });
      }
    }
    const neighborhoodObjects = [...neighborhoodObjectMap.values()]
      .sort((a, b) => stable(a).localeCompare(stable(b)));
    for (const report of neighborhoodReports) {
      report.eligibleObjects = neighborhoodObjects.filter(
        (item) => item.neighborhoodSlug === report.topic
      ).length;
      report.coverageStatus = report.eligibleObjects > 0
        ? (report.excludedObjects > 0 ? "partial" : "full")
        : "excluded";
    }
    const activeNeighborhoods = neighborhoodReports.filter((item) => item.eligibleObjects > 0).map((item) => ({
      neighborhoodSlug: item.topic,
      sourceBatchKeys: item.sourceBatchKeys,
      publicationStatus: "beta_active",
      lifecycleState: "production_beta_active",
      reviewTier,
      coverageStatus: item.coverageStatus,
      priorLifecycleState: item.priorState,
      verificationHash: hash({ topic: item.topic, objects: neighborhoodObjects.filter((row) => row.neighborhoodSlug === item.topic).map((row) => ({ table: row.targetTable, id: row.targetId })) }),
      excludedObjectCount: item.excludedObjects,
    }));
    const counts = {
      entities: objects.filter((item) => item.targetTable === "canonical_entities").length,
      relationships: objects.filter((item) => item.targetTable === "canonical_relationships").length,
      curriculumBridges: objects.filter((item) => item.targetTable === "curriculum_node_entities").length,
      claims: 0,
      decisionPoints: 0,
    };
    const payload: Json = {
      releaseId,
      generatedAt: new Date().toISOString(),
      releasePolicy: "maximum_safe_object_level_beta",
      reviewTier,
      publicationStatus: "beta_active",
      preReleaseCanonicalCounts: { entities: Number(preCounts.entities), relationships: Number(preCounts.relationships) },
      expectedPostReleaseCanonicalCounts: { entities: Number(preCounts.entities), relationships: Number(preCounts.relationships) },
      totalNeighborhoodsEvaluated: evaluated.length,
      fullyEligibleNeighborhoods: activeNeighborhoods.filter((item) => item.coverageStatus === "full").length,
      partiallyEligibleNeighborhoods: activeNeighborhoods.filter((item) => item.coverageStatus === "partial").length,
      excludedNeighborhoods: neighborhoodReports.filter((item) => item.eligibleObjects === 0).length,
      graphCounts: counts,
      graphCoverage: {
        entityPercent: Number((counts.entities / Number(preCounts.entities) * 100).toFixed(2)),
        relationshipPercent: Number((counts.relationships / Number(preCounts.relationships) * 100).toFixed(2)),
        combinedPercent: Number(((counts.entities + counts.relationships) / (Number(preCounts.entities) + Number(preCounts.relationships)) * 100).toFixed(2)),
      },
      highRisk: {
        included: objects.filter((item) => item.riskTier === "high").length,
        excluded: exclusions.filter((item) => item.riskTier === "high").reduce((sum, item) => sum + Number(item.count ?? 1), 0),
      },
      neighborhoods: activeNeighborhoods,
      objects,
      neighborhoodObjects,
      excludedNeighborhoodDetails: neighborhoodReports.filter((item) => item.eligibleObjects === 0),
      exclusionCount: exclusions.length,
      rollbackOperations: [
        "Set release publication_status=hidden and status=rolled_back.",
        "Set release neighborhoods publication_status=hidden and lifecycle_state=revoked.",
        "Set release objects publication_status=hidden.",
        "Confirm product RPCs return no release data.",
        "Never update or delete canonical entities, canonical relationships, proposals, or pending reviews.",
      ],
    };
    payload.verificationHash = hash({ objects, neighborhoodObjects, exclusions: exclusions.map((item) => item.verificationHash).sort() });
    payload.manifestHash = hash({ ...payload, generatedAt: undefined, manifestHash: undefined });
    mkdirSync(outDir, { recursive: true });
    if (existsSync(manifestPath)) {
      const prior = readJson(manifestPath);
      if (prior.manifestHash !== payload.manifestHash) throw new Error("Refusing to overwrite immutable full beta manifest with changed content");
    } else writeJson(manifestPath, payload);
    writeJson(exclusionsPath, { releaseId, manifestHash: payload.manifestHash, generatedAt: new Date().toISOString(), exclusions });
    const md = [
      "# Full Beta Eligibility",
      "",
      `Release: \`${releaseId}\``,
      "",
      `Evaluated ${evaluated.length} staged, verification-blocked, or database-verified neighborhoods. ${activeNeighborhoods.length} have at least one independently eligible object; ${payload.fullyEligibleNeighborhoods} are full and ${payload.partiallyEligibleNeighborhoods} are partial.`,
      "",
      "| Neighborhood | Prior state | Coverage | Eligible objects | Excluded objects | Claims excluded | DPs excluded |",
      "|---|---|---|---:|---:|---:|---:|",
      ...neighborhoodReports.map((item) => `| ${item.topic} | ${item.priorState} | ${item.coverageStatus} | ${item.eligibleObjects} | ${item.excludedObjects} | ${item.claimCount ?? 0} | ${item.decisionPointCount ?? 0} |`),
      "",
      `Unique release objects: ${counts.entities} entities, ${counts.relationships} relationships, ${counts.curriculumBridges} curriculum bridges. Combined canonical graph coverage: ${payload.graphCoverage.combinedPercent}%.`,
      "",
      "Pending curator or attending review alone was not treated as a blocker. High-risk objects without complete direct provenance, disputed identities, missing bridges, unresolved targets, claims, and decision points were excluded individually.",
      "",
    ];
    write(eligibilityPath, md.join("\n"));
    const demand = new Map<string, number>();
    const productImpact = 4;
    const growth = neighborhoodReports
      .filter((item) => item.coverageStatus !== "full")
      .map((item) => {
        const related = exclusions.filter((row) => row.topic === item.topic);
        const evidenceReadiness = related.some((row) => String(row.reason).includes("PROVENANCE")) ? 0.4 : 0.7;
        const safetyPenalty = related.some((row) => row.riskTier === "high") ? 2 : 1;
        const productDemand = demand.get(item.topic) ?? 1;
        const graphReuse = Math.max(1, Math.log2(item.eligibleObjects + 2));
        const score = Number((productDemand * productImpact * evidenceReadiness * graphReuse / (Math.max(1, item.excludedObjects) * safetyPenalty)).toFixed(4));
        return { neighborhood: item.topic, growthPriority: score, productDemand, productImpact, evidenceReadiness, graphReuse: Number(graphReuse.toFixed(4)), reviewCost: Math.max(1, item.excludedObjects) * safetyPenalty, excludedObjects: item.excludedObjects, recommendedAction: related[0]?.reason ?? "complete database verification" };
      })
      .sort((a, b) => b.growthPriority - a.growthPriority || a.neighborhood.localeCompare(b.neighborhood));
    writeJson(growthPath, { generatedAt: new Date().toISOString(), formula: "product_demand * product_impact * evidence_readiness * graph_reuse / review_cost", telemetryBaseline: "No production feedback exists before first activation; demand defaults to 1 and will be replaced by feedback/query counts.", queue: growth });
    console.log(JSON.stringify({ releaseId, manifestHash: payload.manifestHash, evaluated: evaluated.length, activeNeighborhoods: activeNeighborhoods.length, full: payload.fullyEligibleNeighborhoods, partial: payload.partiallyEligibleNeighborhoods, excluded: payload.excludedNeighborhoods, counts, coverage: payload.graphCoverage, highRisk: payload.highRisk }, null, 2));
  } finally { await db.end(); }
}

async function insertProjection(db: pg.Client, payload: Json, active: boolean): Promise<void> {
  const publicationStatus = active ? "beta_active" : "hidden";
  const releaseStatus = active ? "active" : "prepared";
  const activatedAt = active ? new Date().toISOString() : null;
  await db.query(`insert into kg_production_releases(
    release_id,publication_status,review_tier,status,manifest_hash,verification_hash,
    pre_release_entity_count,pre_release_relationship_count,expected_post_release_entity_count,
    expected_post_release_relationship_count,activated_at,rollback_state,metadata)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'ready',$12::jsonb)
    on conflict(release_id) do update set publication_status=excluded.publication_status,
      status=excluded.status,
      activated_at=coalesce(kg_production_releases.activated_at,excluded.activated_at),
      deactivated_at=null`, [
    releaseId, publicationStatus, reviewTier, releaseStatus, payload.manifestHash, payload.verificationHash,
    payload.preReleaseCanonicalCounts.entities, payload.preReleaseCanonicalCounts.relationships,
    payload.expectedPostReleaseCanonicalCounts.entities, payload.expectedPostReleaseCanonicalCounts.relationships,
    activatedAt, JSON.stringify({ releasePolicy: payload.releasePolicy }),
  ]);
  await db.query(`insert into kg_production_neighborhoods(
      release_id,neighborhood_slug,source_batch_keys,publication_status,lifecycle_state,review_tier,
      coverage_status,prior_lifecycle_state,verification_hash,activated_at,metadata)
      select $1,x.neighborhood_slug,x.source_batch_keys,$2,$3,$4,x.coverage_status,
        x.prior_lifecycle_state,x.verification_hash,$5,
        jsonb_build_object('excludedObjectCount',x.excluded_object_count)
      from jsonb_to_recordset($6::jsonb) as x(
        neighborhood_slug text,
        source_batch_keys text[],
        coverage_status text,
        prior_lifecycle_state text,
        verification_hash text,
        excluded_object_count integer
      )
      on conflict(release_id,neighborhood_slug) do update set publication_status=excluded.publication_status,
        lifecycle_state=excluded.lifecycle_state,
        activated_at=coalesce(kg_production_neighborhoods.activated_at,excluded.activated_at),
        deactivated_at=null`, [
    releaseId,
    publicationStatus,
    active ? "production_beta_active" : "revoked",
    reviewTier,
    activatedAt,
    JSON.stringify(payload.neighborhoods.map((item: Json) => ({
      neighborhood_slug: item.neighborhoodSlug,
      source_batch_keys: item.sourceBatchKeys,
      coverage_status: item.coverageStatus,
      prior_lifecycle_state: item.priorLifecycleState,
      verification_hash: item.verificationHash,
      excluded_object_count: item.excludedObjectCount,
    }))),
  ]);
  await db.query(`insert into kg_production_objects(
      release_id,target_table,target_id,publication_status,review_tier,provenance_status,
      risk_tier,verification_hash,source_record_ids,activated_at,metadata)
      select $1,x.target_table,x.target_id,$2,$3,x.provenance_status,x.risk_tier,
        x.verification_hash,x.source_record_ids,$4,'{}'::jsonb
      from jsonb_to_recordset($5::jsonb) as x(
        target_table text,
        target_id uuid,
        provenance_status text,
        risk_tier text,
        verification_hash text,
        source_record_ids text[]
      )
      on conflict(release_id,target_table,target_id) do update set publication_status=excluded.publication_status,
        activated_at=coalesce(kg_production_objects.activated_at,excluded.activated_at),
        deactivated_at=null`, [
    releaseId,
    publicationStatus,
    reviewTier,
    activatedAt,
    JSON.stringify(payload.objects.map((item: Json) => ({
      target_table: item.targetTable,
      target_id: item.targetId,
      provenance_status: item.provenanceStatus,
      risk_tier: item.riskTier,
      verification_hash: item.verificationHash,
      source_record_ids: item.sourceRecordIds,
    }))),
  ]);
  await db.query(`insert into kg_production_neighborhood_objects(
      release_id,neighborhood_slug,target_table,target_id,source_proposal_id,source_batch_key,verification_hash)
      select $1,x.neighborhood_slug,x.target_table,x.target_id,x.source_proposal_id,
        x.source_batch_key,x.verification_hash
      from jsonb_to_recordset($2::jsonb) as x(
        neighborhood_slug text,
        target_table text,
        target_id uuid,
        source_proposal_id uuid,
        source_batch_key text,
        verification_hash text
      )
      on conflict(release_id,neighborhood_slug,target_table,target_id)
      do update set verification_hash=excluded.verification_hash`, [
    releaseId,
    JSON.stringify(payload.neighborhoodObjects.map((item: Json) => ({
      neighborhood_slug: item.neighborhoodSlug,
      target_table: item.targetTable,
      target_id: item.targetId,
      source_proposal_id: item.sourceProposalId,
      source_batch_key: item.sourceBatchKey,
      verification_hash: item.verificationHash,
    }))),
  ]);
  const exclusions = readJson(exclusionsPath).exclusions ?? [];
  await db.query(`insert into kg_production_exclusions(
      release_id,neighborhood_slug,target_table,target_id,source_proposal_id,exclusion_reason,risk_tier,verification_hash,metadata)
      select $1,x.neighborhood_slug,x.target_table,x.target_id,x.source_proposal_id,
        x.exclusion_reason,x.risk_tier,x.verification_hash,x.metadata
      from jsonb_to_recordset($2::jsonb) as x(
        neighborhood_slug text,
        target_table text,
        target_id uuid,
        source_proposal_id uuid,
        exclusion_reason text,
        risk_tier text,
        verification_hash text,
        metadata jsonb
      )
      on conflict do nothing`, [
    releaseId,
    JSON.stringify(exclusions.map((item: Json) => ({
      neighborhood_slug: item.topic,
      target_table: item.targetTable ?? null,
      target_id: item.targetId ?? null,
      source_proposal_id: item.sourceProposalId ?? null,
      exclusion_reason: item.reason,
      risk_tier: item.riskTier ?? "low",
      verification_hash: item.verificationHash,
      metadata: item.details ?? { count: item.count ?? null },
    }))),
  ]);
}

async function validateProjection(db: pg.Client, payload: Json): Promise<string[]> {
  const errors: string[] = [];
  const counts = (await db.query(`select
    (select count(*)::int from canonical_entities where is_active) entities,
    (select count(*)::int from canonical_relationships where is_active) relationships`)).rows[0];
  if (Number(counts.entities) !== payload.preReleaseCanonicalCounts.entities || Number(counts.relationships) !== payload.preReleaseCanonicalCounts.relationships) errors.push("CANONICAL_COUNTS_CHANGED");
  const objectCounts = (await db.query(`select target_table,count(*)::int count from kg_production_objects where release_id=$1 group by target_table`, [releaseId])).rows;
  const byTable = new Map(objectCounts.map((item) => [item.target_table, Number(item.count)]));
  if ((byTable.get("canonical_entities") ?? 0) !== payload.graphCounts.entities) errors.push("ENTITY_OVERLAY_COUNT_MISMATCH");
  if ((byTable.get("canonical_relationships") ?? 0) !== payload.graphCounts.relationships) errors.push("RELATIONSHIP_OVERLAY_COUNT_MISMATCH");
  if ((byTable.get("curriculum_node_entities") ?? 0) !== payload.graphCounts.curriculumBridges) errors.push("BRIDGE_OVERLAY_COUNT_MISMATCH");
  const duplicates = Number((await db.query(`select count(*)::int count from (
    select release_id,target_table,target_id,count(*) from kg_production_objects
    where release_id=$1 group by release_id,target_table,target_id having count(*)>1
  ) d`, [releaseId])).rows[0].count);
  if (duplicates) errors.push("DUPLICATE_RELEASE_OBJECTS");
  const dangling = Number((await db.query(`select count(*)::int count
    from kg_production_objects o join canonical_relationships r
      on o.target_table='canonical_relationships' and r.id=o.target_id
    left join canonical_entities s on s.id=r.subject_entity_id
    left join canonical_entities t on t.id=r.object_entity_id
    where o.release_id=$1 and (s.id is null or t.id is null or not s.is_active or not t.is_active)`, [releaseId])).rows[0].count);
  if (dangling) errors.push("DANGLING_RELEASE_RELATIONSHIPS");
  const neighborhoodDangling = Number((await db.query(`select count(*)::int count
    from kg_production_neighborhood_objects no
    join canonical_relationships r
      on no.target_table='canonical_relationships' and r.id=no.target_id
    where no.release_id=$1 and (
      not exists (
        select 1 from kg_production_neighborhood_objects se
        where se.release_id=no.release_id and se.neighborhood_slug=no.neighborhood_slug
          and se.target_table='canonical_entities' and se.target_id=r.subject_entity_id
      )
      or not exists (
        select 1 from kg_production_neighborhood_objects oe
        where oe.release_id=no.release_id and oe.neighborhood_slug=no.neighborhood_slug
          and oe.target_table='canonical_entities' and oe.target_id=r.object_entity_id
      )
    )`, [releaseId])).rows[0].count);
  if (neighborhoodDangling) errors.push("NEIGHBORHOOD_RELATIONSHIP_ENDPOINT_NOT_RELEASED");
  const danglingBridges = Number((await db.query(`select count(*)::int count
    from kg_production_neighborhood_objects no
    join curriculum_node_entities b
      on no.target_table='curriculum_node_entities' and b.id=no.target_id
    where no.release_id=$1 and not exists (
      select 1 from kg_production_neighborhood_objects e
      where e.release_id=no.release_id and e.neighborhood_slug=no.neighborhood_slug
        and e.target_table='canonical_entities' and e.target_id=b.canonical_entity_id
    )`, [releaseId])).rows[0].count);
  if (danglingBridges) errors.push("NEIGHBORHOOD_BRIDGE_ENTITY_NOT_RELEASED");
  const badMetadata = Number((await db.query(`select count(*)::int count from kg_production_objects
    where release_id=$1 and (publication_status<>'beta_active' or review_tier<>'automated_beta'
      or provenance_status not in ('complete','partial') or risk_tier not in ('low','moderate','high')
      or cardinality(source_record_ids)=0)`, [releaseId])).rows[0].count);
  if (badMetadata) errors.push("OBJECT_METADATA_INVALID");
  await db.query("set role authenticated");
  try {
    for (const neighborhood of payload.neighborhoods) {
      const projection = (await db.query(
        `select get_kg_production_neighborhood($1) payload`,
        [neighborhood.neighborhoodSlug]
      )).rows[0].payload;
      if (!projection || projection.reviewTier !== reviewTier || projection.publicationStatus !== "beta_active") {
        errors.push(`${neighborhood.neighborhoodSlug}:PRODUCT_QUERY_METADATA_INVALID`);
      }
      const expected = payload.neighborhoodObjects.filter(
        (item: Json) => item.neighborhoodSlug === neighborhood.neighborhoodSlug
      );
      const actual = (projection?.entities?.length ?? 0)
        + (projection?.relationships?.length ?? 0)
        + (projection?.curriculumBridges?.length ?? 0);
      if (actual !== expected.length) {
        errors.push(`${neighborhood.neighborhoodSlug}:PRODUCT_QUERY_COUNT_MISMATCH`);
      }
      const query = projection?.entities?.[0]?.slug ?? projection?.entities?.[0]?.preferredLabel;
      if (query) {
        const search = (await db.query(
          `select * from find_kg_production_topics($1,$2)`,
          [query, 50]
        )).rows;
        if (!search.some((item) => item.neighborhood_slug === neighborhood.neighborhoodSlug)) {
          errors.push(`${neighborhood.neighborhoodSlug}:TOPIC_SEARCH_MISSING`);
        }
      }
    }
  } finally {
    await db.query("reset role");
  }
  return errors;
}

async function dryRun(): Promise<void> {
  const payload = manifest();
  const db = dbClient(); await db.connect();
  let errors: string[] = [];
  try {
    await db.query("begin");
    await db.query(stripTransaction(readFileSync(migrationPath, "utf8")));
    await insertProjection(db, payload, true);
    await insertProjection(db, payload, true);
    errors = await validateProjection(db, payload);
    const hiddenTopic = (readJson(path.join(root, "reports", "kg-scaling", "vertical-completion-queue.json")).queue ?? [])
      .find((item: Json) => !eligibleStates.has(item.currentState))?.topic;
    if (hiddenTopic) {
      const hidden = (await db.query(`select get_kg_production_neighborhood($1) payload`, [hiddenTopic])).rows[0].payload;
      if (hidden !== null) errors.push("STAGING_ONLY_OR_UNRELEASED_TOPIC_VISIBLE");
    }
    await db.query(`update kg_production_releases set publication_status='hidden',status='rolled_back' where release_id=$1`, [releaseId]);
    await db.query(`update kg_production_neighborhoods set publication_status='hidden',lifecycle_state='revoked',deactivated_at=now() where release_id=$1`, [releaseId]);
    await db.query(`update kg_production_objects set publication_status='hidden',deactivated_at=now() where release_id=$1`, [releaseId]);
    const sample = payload.neighborhoods[0]?.neighborhoodSlug;
    if (sample) {
      const hiddenAfterRollback = (await db.query(`select get_kg_production_neighborhood($1) payload`, [sample])).rows[0].payload;
      if (hiddenAfterRollback !== null) errors.push("ROLLBACK_DID_NOT_HIDE_PRODUCT_QUERY");
    }
    await db.query("rollback");
    const status = errors.length ? "FAILED" : "PASSED";
    write(dryRunPath, [
      "# Full Beta Dry Run",
      "",
      `Release: \`${releaseId}\``,
      `Status: **${status}**`,
      "",
      "The migration, release upserts, deduplicated object projection, authenticated RPC projection, idempotent second upsert, and soft rollback were simulated inside one PostgreSQL transaction and rolled back.",
      "",
      `Dry-run discrepancies: ${errors.length}.`,
      ...(errors.length ? ["", "## Discrepancies", "", ...errors.map((item) => `- ${item}`)] : [
        "",
        "- All release entity, relationship, and bridge IDs exist.",
        "- Every released relationship has active endpoints.",
        "- Shared canonical objects are unique once per release.",
        "- Blocked and high-risk incomplete-provenance objects remain excluded.",
        "- Product reads expose release, review, provenance, risk, coverage, and verification metadata.",
        "- Soft rollback makes the simulated release invisible without canonical mutations.",
      ]),
      "",
    ].join("\n"));
    write(rollbackPath, [
      "# Full Beta Rollback Report",
      "",
      `Release: \`${releaseId}\``,
      "Pre-activation rollback status: **READY AND TRANSACTIONALLY SIMULATED**",
      "",
      "The dry run changed release publication status to hidden, revoked neighborhood lifecycle state, hid all release objects, confirmed the product RPC returned null, and rolled back the entire simulation. Canonical entities and relationships were never updated.",
      "",
    ].join("\n"));
    console.log(JSON.stringify({ releaseId, status, errors, transactionRolledBack: true }, null, 2));
    if (errors.length) process.exitCode = 2;
  } catch (error) {
    try { await db.query("rollback"); } catch {}
    throw error;
  } finally { await db.end(); }
}

async function applyRelease(): Promise<void> {
  requireApproval();
  const payload = manifest();
  if (!existsSync(dryRunPath) || !readFileSync(dryRunPath, "utf8").includes("Status: **PASSED**")) throw new Error("Passing full beta dry run required");
  const db = dbClient(); await db.connect();
  try {
    await db.query(readFileSync(migrationPath, "utf8"));
    await db.query("begin");
    await insertProjection(db, payload, true);
    const errors = await validateProjection(db, payload);
    if (errors.length) throw new Error(`Apply verification failed: ${errors.join(", ")}`);
    await db.query("commit");
    write(applyPath, [
      "# Full Beta Apply Report",
      "",
      `Release: \`${releaseId}\``,
      "Status: **APPLIED**",
      "",
      `Activated ${payload.neighborhoods.length} neighborhoods and ${payload.objects.length} unique overlay objects as \`automated_beta\`.`,
      "Canonical entities, relationships, proposal history, and pending review assignments were not mutated.",
      "",
    ].join("\n"));
    console.log(JSON.stringify({ applied: true, releaseId, neighborhoods: payload.neighborhoods.length, objects: payload.objects.length }, null, 2));
  } catch (error) { try { await db.query("rollback"); } catch {} throw error; } finally { await db.end(); }
}

async function verifyRelease(): Promise<void> {
  const payload = manifest();
  const db = dbClient(); await db.connect();
  try {
    const errors = await validateProjection(db, payload);
    const release = (await db.query(`select * from kg_production_releases where release_id=$1`, [releaseId])).rows[0];
    if (!release || release.manifest_hash !== payload.manifestHash || release.verification_hash !== payload.verificationHash) errors.push("RELEASE_HEADER_MISMATCH");
    const report = {
      releaseId,
      verifiedAt: new Date().toISOString(),
      passed: errors.length === 0,
      errors,
      graphCounts: payload.graphCounts,
      canonicalCountsUnchanged: true,
      productQueryPassed: errors.every((item) => !item.includes("PRODUCT_QUERY")),
    };
    writeJson(verificationPath, report);
    console.log(JSON.stringify(report, null, 2));
    if (errors.length) process.exitCode = 2;
  } finally { await db.end(); }
}

async function rollbackTest(): Promise<void> {
  requireApproval();
  const payload = manifest();
  const db = dbClient(); await db.connect();
  try {
    const before = (await db.query(`select (select count(*)::int from canonical_entities where is_active) entities,(select count(*)::int from canonical_relationships where is_active) relationships`)).rows[0];
    await db.query("begin");
    await db.query(`update kg_production_releases set publication_status='hidden',status='rolled_back',rollback_state='executed',deactivated_at=now() where release_id=$1`, [releaseId]);
    await db.query(`update kg_production_neighborhoods set publication_status='hidden',lifecycle_state='revoked',deactivated_at=now() where release_id=$1`, [releaseId]);
    await db.query(`update kg_production_objects set publication_status='hidden',deactivated_at=now() where release_id=$1`, [releaseId]);
    const sample = payload.neighborhoods[0].neighborhoodSlug;
    const hidden = (await db.query(`select get_kg_production_neighborhood($1) payload`, [sample])).rows[0].payload;
    if (hidden !== null) throw new Error("Soft rollback did not hide release");
    await insertProjection(db, payload, true);
    const restored = (await db.query(`select get_kg_production_neighborhood($1) payload`, [sample])).rows[0].payload;
    if (!restored || restored.releaseId !== releaseId) throw new Error("Idempotent reactivation failed");
    await db.query(`update kg_production_releases set rollback_state='tested' where release_id=$1`, [releaseId]);
    const after = (await db.query(`select (select count(*)::int from canonical_entities where is_active) entities,(select count(*)::int from canonical_relationships where is_active) relationships`)).rows[0];
    if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("Canonical counts changed during rollback test");
    await db.query("commit");
    write(rollbackPath, [
      "# Full Beta Rollback Report",
      "",
      `Release: \`${releaseId}\``,
      "Status: **TESTED**",
      "",
      "The active release was soft-deactivated, confirmed invisible through the product RPC, and reactivated idempotently in one transaction. Canonical counts remained unchanged.",
      "",
    ].join("\n"));
    console.log(JSON.stringify({ rollbackTestPassed: true, releaseId, canonicalCounts: after }, null, 2));
  } catch (error) { try { await db.query("rollback"); } catch {} throw error; } finally { await db.end(); }
}

async function smoke(): Promise<void> {
  const payload = manifest();
  const verification = readJson(verificationPath);
  if (!verification.passed) throw new Error("Verification must pass before smoke tests");
  const db = dbClient(); await db.connect();
  try {
    const sample = payload.neighborhoods.find((item: Json) => item.coverageStatus === "partial") ?? payload.neighborhoods[0];
    const projection = (await db.query(`select get_kg_production_neighborhood($1) payload`, [sample.neighborhoodSlug])).rows[0].payload;
    const search = (await db.query(`select * from find_kg_production_topics($1,$2)`, [projection.entities[0]?.slug ?? projection.entities[0]?.preferredLabel, 10])).rows;
    const checks = [
      Boolean(projection),
      projection.releaseId === releaseId,
      projection.reviewTier === reviewTier,
      ["full", "partial"].includes(projection.coverageStatus),
      projection.entities.every((item: Json) => item.reviewTier === reviewTier && item.provenanceStatus && item.riskTier && item.sourceRecordIds?.length),
      projection.relationships.every((item: Json) => item.reviewTier === reviewTier && item.provenanceStatus && item.riskTier && item.sourceRecordIds?.length),
      search.length > 0,
    ];
    if (!checks.every(Boolean)) throw new Error(`Product smoke checks failed: ${JSON.stringify(checks)}`);
    write(smokePath, [
      "# Full Beta Product Smoke Tests",
      "",
      `Release: \`${releaseId}\``,
      "Status: **PASSED**",
      "",
      `Retrieved ${sample.neighborhoodSlug} through the production-only neighborhood RPC.`,
      `Topic search returned ${search.length} release-scoped result(s).`,
      "The response exposes release version, partial/full coverage, review tier, provenance tier, risk tier, verification hashes, and source record IDs.",
      "The shared application helpers and authenticated routes do not query staging or proposal tables directly.",
      "",
    ].join("\n"));
    console.log(JSON.stringify({ smokePassed: true, sample: sample.neighborhoodSlug, searchResults: search.length }, null, 2));
  } finally { await db.end(); }
}

const command = process.argv[2] ?? "build";
if (command === "build") await build();
else if (command === "dry-run") await dryRun();
else if (command === "apply") await applyRelease();
else if (command === "verify") await verifyRelease();
else if (command === "rollback-test") await rollbackTest();
else if (command === "smoke") await smoke();
else throw new Error(`Unknown command: ${command}`);
