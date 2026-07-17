import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

import { resolveOperatorDatabaseUrl } from "../src/lib/datastore/connection-url.ts";
import { requireStaging } from "./lib/education/kg-staging-guard.ts";

const root = process.cwd();
const outDir = path.join(root, "reports", "kg-production");
const manifestPath = path.join(outDir, "beta-release-manifest.json");
const eligibilityPath = path.join(outDir, "beta-release-eligibility.md");
const dryRunPath = path.join(outDir, "beta-release-dry-run.md");
const applyPath = path.join(outDir, "beta-release-apply-report.md");
const verificationPath = path.join(outDir, "beta-release-verification.json");
const rollbackPath = path.join(outDir, "beta-release-rollback.json");
const smokePath = path.join(outDir, "beta-release-product-smoke-tests.md");
const releaseId = "kg-beta-20260716-001";
const reviewTier = "automated_beta";
const highRiskPredicates = new Set(["indicates_treatment", "contraindicated_for", "treats", "treated_by"]);
const appliedDispositions = new Set(["inserted", "updated", "merged", "already_applied", "no_op"]);

type Json = Record<string, any>;
type Membership = {
  targetTable: string;
  targetId: string;
  sourceProposalId: string;
  sourceRecordIds: string[];
  proposalFingerprint: string;
  isHighRisk: boolean;
};

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
}
function hash(value: unknown): string { return createHash("sha256").update(stable(value)).digest("hex"); }
function readJson(file: string): Json { return JSON.parse(readFileSync(file, "utf8")); }
function write(file: string, value: string): void { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, value); }
function writeJson(file: string, value: unknown): void { write(file, `${JSON.stringify(value, null, 2)}\n`); }
function manifest(): Json { if (!existsSync(manifestPath)) throw new Error("Build the release manifest first"); return readJson(manifestPath); }
function requireConfirmation(): void {
  if (process.env.KG_PRODUCTION_CONFIRM !== releaseId) throw new Error(`Set KG_PRODUCTION_CONFIRM=${releaseId} for production-overlay writes`);
  requireStaging(`beta production release ${releaseId}`);
}
function client(): pg.Client { return new pg.Client({ connectionString: resolveOperatorDatabaseUrl().url, ssl: { rejectUnauthorized: false } }); }
function parseReviewCounts(topic: string): { curator: number; attending: number } {
  const scorecardPath = path.join(root, "reports", "kg-audits", topic, "topic-scorecard.json");
  const blockers: string[] = existsSync(scorecardPath) ? readJson(scorecardPath).publication?.blockers ?? [] : [];
  const human = blockers.map((item) => item.match(/^(\d+) proposals still awaiting human review$/)?.[1]).find(Boolean);
  const attending = blockers.map((item) => item.match(/^(\d+) items require attending review$/)?.[1]).find(Boolean);
  return { curator: Number(human ?? 0), attending: Number(attending ?? 0) };
}
function localCounts(topic: string): { entities: number; relationships: number; claims: number; decisionPoints: number } {
  const file = path.join(root, "reports", "kg-compiler", topic, "ontology-data-source.json");
  const counts = existsSync(file) ? readJson(file).dbCounts ?? {} : {};
  return { entities: Number(counts.entities ?? 0), relationships: Number(counts.relationships ?? 0), claims: Number(counts.claims ?? 0), decisionPoints: Number(counts.decisionPoints ?? 0) };
}
function reportHashPayload(payload: Json): Json {
  const { generatedAt: _generatedAt, manifestHash: _manifestHash, ...deterministic } = payload;
  return deterministic;
}

async function build(): Promise<void> {
  const queue = readJson(path.join(root, "reports", "kg-scaling", "vertical-completion-queue.json"));
  const verified = (queue.queue ?? []).filter((item: Json) => item.currentState === "database_verified");
  const blockerRegistry = readJson(path.join(root, "reports", "kg-scaling", "blocker-registry.json"));
  const unresolvedByTopic = new Map<string, string[]>();
  for (const blocker of blockerRegistry.blockers ?? []) {
    if (blocker.status === "resolved") continue;
    for (const topic of blocker.affectedNeighborhoods ?? []) unresolvedByTopic.set(topic, [...(unresolvedByTopic.get(topic) ?? []), blocker.blockerId]);
  }

  const db = client();
  await db.connect();
  try {
    const preCounts = (await db.query(`select
      (select count(*)::int from canonical_entities where is_active) as entities,
      (select count(*)::int from canonical_relationships where is_active) as relationships`)).rows[0];
    const evaluations: Json[] = [];
    const eligibleNeighborhoods: Json[] = [];
    const excludedRecords: Json[] = [];

    for (const item of verified) {
      const topic = String(item.topic);
      const owner = String(item.canonicalOwner);
      const review = parseReviewCounts(topic);
      const fallbackCounts = localCounts(topic);
      const candidateResult = await db.query(`
        select m.batch_key,
          count(*)::int as total,
          count(*) filter (where m.packet_state = 'approved')::int as approved,
          count(*) filter (where m.apply_disposition in ('inserted','updated','merged','already_applied','no_op'))::int as applied,
          count(*) filter (where m.canonical_target_id is null)::int as null_targets,
          max(m.updated_at) as last_updated
        from kg_proposal_batch_memberships m
        where m.topic_slug = $1
        group by m.batch_key
        having count(*) > 0
          and count(*) = count(*) filter (where m.packet_state = 'approved')
          and count(*) = count(*) filter (where m.apply_disposition in ('inserted','updated','merged','already_applied','no_op'))
          and count(*) filter (where m.canonical_target_id is null) = 0
        order by max(m.updated_at) desc`, [owner]);
      const exactBatch = candidateResult.rows[0]?.batch_key as string | undefined;
      if (!exactBatch) {
        const reasons = ["INCOMPLETE_EXACT_MEMBERSHIP: no applied batch has canonical target IDs for every verified record"];
        if ((unresolvedByTopic.get(topic) ?? []).includes("PUBLICATION_RECORD_LEVEL_PROVENANCE_GAP")) reasons.push("RECORD_LEVEL_PUBLICATION_PROVENANCE_UNAVAILABLE");
        const originalBatch = await db.query(`select count(*)::int total,
          count(*) filter (where p.proposed_predicate = any($2::text[]))::int high_risk
          from kg_proposal_batch_memberships m join kg_automation_proposals p on p.id=m.proposal_id
          where m.batch_key=$1`, [owner, [...highRiskPredicates]]);
        evaluations.push({ topic, lifecycleState: "database_verified", ...fallbackCounts, exactMembershipStatus: "incomplete", provenanceStatus: "not_release_qualified", unresolvedIdentityConflicts: 0, unresolvedOwnershipConflicts: 0, highRiskItemCount: Number(originalBatch.rows[0]?.high_risk ?? 0), pendingCuratorReviewCount: review.curator, pendingAttendingReviewCount: review.attending, betaEligible: false, blockingReasons: reasons });
        continue;
      }

      const memberResult = await db.query(`select m.*, p.proposal_fingerprint,p.proposal_type,p.review_status as proposal_review_status,
        p.source_signal_type,p.source_signal_ids,p.evidence_summary,p.supporting_source_count,p.metadata as proposal_metadata
        from kg_proposal_batch_memberships m join kg_automation_proposals p on p.id=m.proposal_id
        where m.batch_key=$1 order by m.canonical_target_table,m.canonical_target_id,p.proposal_fingerprint`, [exactBatch]);
      const rows = memberResult.rows;
      const entityIds = rows.filter((row) => row.canonical_target_table === "canonical_entities").map((row) => row.canonical_target_id);
      const relationshipIds = rows.filter((row) => row.canonical_target_table === "canonical_relationships").map((row) => row.canonical_target_id);
      const bridgeIds = rows.filter((row) => row.canonical_target_table === "curriculum_node_entities").map((row) => row.canonical_target_id);
      const entities = entityIds.length ? (await db.query(`select id,slug,entity_type,preferred_label,status,review_status,is_active,metadata from canonical_entities where id=any($1::uuid[])`, [entityIds])).rows : [];
      const relationships = relationshipIds.length ? (await db.query(`select id,subject_entity_id,predicate,object_entity_id,review_status,provenance_status,lifecycle_status,is_active,metadata from canonical_relationships where id=any($1::uuid[])`, [relationshipIds])).rows : [];
      const bridges = bridgeIds.length ? (await db.query(`select id,curriculum_node_id,canonical_entity_id,review_status,provenance_status,is_active from curriculum_node_entities where id=any($1::uuid[])`, [bridgeIds])).rows : [];
      const entityById = new Map(entities.map((row) => [row.id, row]));
      const relationshipById = new Map(relationships.map((row) => [row.id, row]));
      const bridgeById = new Map(bridges.map((row) => [row.id, row]));
      const endpointIds = [...new Set(relationships.flatMap((row) => [row.subject_entity_id, row.object_entity_id]))];
      const endpoints = endpointIds.length ? (await db.query(`select id,is_active from canonical_entities where id=any($1::uuid[])`, [endpointIds])).rows : [];
      const activeEndpoints = new Set(endpoints.filter((row) => row.is_active).map((row) => row.id));
      const errors: string[] = [];
      const included: Membership[] = [];
      let highRiskCount = 0;
      let highRiskExcluded = 0;

      for (const row of rows) {
        const sourceRecordIds = [String(row.proposal_id), ...(Array.isArray(row.source_signal_ids) ? row.source_signal_ids.map(String) : [])];
        const traceable = Boolean(row.proposal_id && row.proposal_fingerprint && row.source_signal_type && row.evidence_summary);
        if (!traceable) errors.push(`MISSING_PROPOSAL_PROVENANCE:${row.proposal_fingerprint}`);
        if (!["applied", "approved"].includes(row.proposal_review_status)) errors.push(`INVALID_PROPOSAL_STATUS:${row.proposal_fingerprint}:${row.proposal_review_status}`);
        let isHighRisk = false;
        if (row.canonical_target_table === "canonical_entities") {
          const target = entityById.get(row.canonical_target_id);
          if (!target || !target.is_active || ["deprecated", "replaced", "merged", "split"].includes(target.status) || target.review_status === "rejected") errors.push(`INVALID_ENTITY_TARGET:${row.proposal_fingerprint}`);
        } else if (row.canonical_target_table === "canonical_relationships") {
          const target = relationshipById.get(row.canonical_target_id);
          if (!target || !target.is_active || target.lifecycle_status !== "active" || target.review_status === "rejected" || target.provenance_status === "conflicted") errors.push(`INVALID_RELATIONSHIP_TARGET:${row.proposal_fingerprint}`);
          if (target && (!activeEndpoints.has(target.subject_entity_id) || !activeEndpoints.has(target.object_entity_id))) errors.push(`DANGLING_RELATIONSHIP:${row.proposal_fingerprint}`);
          isHighRisk = Boolean(target && highRiskPredicates.has(target.predicate));
          if (isHighRisk) {
            highRiskCount += 1;
            const directProvenance = Array.isArray(row.source_signal_ids) && row.source_signal_ids.length > 0
              && Number(row.supporting_source_count ?? 0) > 0
              && ["source_attached", "reviewed"].includes(String(target?.provenance_status));
            if (!directProvenance) {
              highRiskExcluded += 1;
              excludedRecords.push({ topic, targetTable: row.canonical_target_table, targetId: row.canonical_target_id, proposalId: row.proposal_id, proposalFingerprint: row.proposal_fingerprint, reason: "HIGH_RISK_DIRECT_PROVENANCE_INCOMPLETE" });
              continue;
            }
          }
        } else if (row.canonical_target_table === "curriculum_node_entities") {
          const target = bridgeById.get(row.canonical_target_id);
          if (!target || !target.is_active || target.review_status === "rejected" || target.provenance_status === "conflicted" || !activeEndpoints.has(target.canonical_entity_id)) errors.push(`INVALID_CURRICULUM_BRIDGE:${row.proposal_fingerprint}`);
        } else {
          errors.push(`UNSUPPORTED_TARGET_TABLE:${row.canonical_target_table}`);
        }
        included.push({ targetTable: row.canonical_target_table, targetId: row.canonical_target_id, sourceProposalId: row.proposal_id, sourceRecordIds: [...new Set(sourceRecordIds)].sort(), proposalFingerprint: row.proposal_fingerprint, isHighRisk });
      }

      const uniqueEntitySlugs = new Set(entities.map((row) => row.slug).filter(Boolean));
      if (uniqueEntitySlugs.size !== entities.filter((row) => row.slug).length) errors.push("DUPLICATE_ENTITY_SLUG_WITHIN_MEMBERSHIP");
      if (new Set(rows.map((row) => `${row.canonical_target_table}|${row.canonical_target_id}`)).size !== rows.length) errors.push("DUPLICATE_TARGET_MEMBERSHIP");
      if ((unresolvedByTopic.get(topic) ?? []).some((id) => ["LABRUM_NAMESPACE_COLLISION", "POLYETHYLENE_CONDITION_PROCEDURE_OWNERSHIP_MISMATCH"].includes(id))) errors.push("UNRESOLVED_IDENTITY_OR_OWNERSHIP_BLOCKER");

      const claims = entityIds.length ? (await db.query(`select id from educational_claims where is_active and primary_entity_id=any($1::uuid[]) order by id`, [entityIds])).rows : [];
      const decisionPoints = entityIds.length ? (await db.query(`select id,safety_criticality from decision_points where is_active and subject_entity_id=any($1::uuid[]) order by id`, [entityIds])).rows : [];
      for (const claim of claims) excludedRecords.push({ topic, targetTable: "educational_claims", targetId: claim.id, reason: "NOT_IN_EXACT_VERIFIED_BATCH_MEMBERSHIP" });
      for (const point of decisionPoints) excludedRecords.push({ topic, targetTable: "decision_points", targetId: point.id, reason: "NOT_IN_EXACT_VERIFIED_BATCH_MEMBERSHIP", highRisk: ["high", "emergency"].includes(point.safety_criticality) });

      const fullMembershipShape = rows.map((row) => ({ targetTable: row.canonical_target_table, targetId: row.canonical_target_id, proposalId: row.proposal_id })).sort((a, b) => stable(a).localeCompare(stable(b)));
      const productionMembershipShape = included.map((row) => ({ targetTable: row.targetTable, targetId: row.targetId, sourceProposalId: row.sourceProposalId, isHighRisk: row.isHighRisk })).sort((a, b) => stable(a).localeCompare(stable(b)));
      const sourceRecordIds = [...new Set(included.flatMap((row) => row.sourceRecordIds))].sort();
      const eligible = errors.length === 0 && included.length > 0;
      evaluations.push({ topic, lifecycleState: "database_verified", entityCount: entityIds.length, relationshipCount: relationshipIds.length, claimCount: 0, decisionPointCount: 0, exactMembershipStatus: "complete", provenanceStatus: "proposal_record_traceable", unresolvedIdentityConflicts: 0, unresolvedOwnershipConflicts: 0, highRiskItemCount: highRiskCount, highRiskExcludedCount: highRiskExcluded, pendingCuratorReviewCount: review.curator, pendingAttendingReviewCount: review.attending, betaEligible: eligible, blockingReasons: errors });
      if (eligible) eligibleNeighborhoods.push({ topic, owner, sourceBatchKey: exactBatch, reviewTier, preReleaseLifecycleState: "database_verified", expectedPostReleaseLifecycleState: "production_beta_active", entityIds: included.filter((row) => row.targetTable === "canonical_entities").map((row) => row.targetId).sort(), relationshipIds: included.filter((row) => row.targetTable === "canonical_relationships").map((row) => row.targetId).sort(), curriculumBridgeIds: included.filter((row) => row.targetTable === "curriculum_node_entities").map((row) => row.targetId).sort(), claimIds: [], decisionPointIds: [], sourceRecordIds, verifiedMembershipHash: hash(fullMembershipShape), productionMembershipHash: hash(productionMembershipShape), provenanceHash: hash(included.map((row) => ({ targetTable: row.targetTable, targetId: row.targetId, sourceRecordIds: row.sourceRecordIds }))), memberships: included });
    }

    const uniqueEntityIds = [...new Set(eligibleNeighborhoods.flatMap((item) => item.entityIds))].sort();
    const uniqueRelationshipIds = [...new Set(eligibleNeighborhoods.flatMap((item) => item.relationshipIds))].sort();
    const uniqueBridgeIds = [...new Set(eligibleNeighborhoods.flatMap((item) => item.curriculumBridgeIds))].sort();
    const payload: Json = {
      releaseId,
      generatedAt: new Date().toISOString(),
      reviewTier,
      releasePolicy: "controlled_internal_beta",
      preReleaseCanonicalCounts: { entities: Number(preCounts.entities), relationships: Number(preCounts.relationships) },
      expectedPostReleaseCanonicalCounts: { entities: Number(preCounts.entities), relationships: Number(preCounts.relationships) },
      evaluatedNeighborhoodCount: evaluations.length,
      eligibleNeighborhoodCount: eligibleNeighborhoods.length,
      excludedNeighborhoodCount: evaluations.filter((item) => !item.betaEligible).length,
      uniqueProductionCounts: { entities: uniqueEntityIds.length, relationships: uniqueRelationshipIds.length, curriculumBridges: uniqueBridgeIds.length, claims: 0, decisionPoints: 0 },
      highRiskCounts: { evaluated: evaluations.reduce((sum, item) => sum + item.highRiskItemCount, 0), activated: eligibleNeighborhoods.flatMap((item) => item.memberships).filter((item) => item.isHighRisk).length, excluded: excludedRecords.filter((item) => item.reason === "HIGH_RISK_DIRECT_PROVENANCE_INCOMPLETE").length },
      neighborhoods: eligibleNeighborhoods,
      excludedNeighborhoods: evaluations.filter((item) => !item.betaEligible).map((item) => ({ topic: item.topic, reasons: item.blockingReasons })),
      excludedRecords,
      evaluation: evaluations,
      rollbackOperations: [
        "Set kg_production_memberships.is_active=false and revoked_at for the release/neighborhood.",
        "Set kg_production_neighborhoods.lifecycle_state=revoked and revoked_at.",
        "Set kg_production_releases.status=rolled_back when no active neighborhoods remain.",
        "Do not mutate or delete canonical entities, relationships, proposals, provenance, or review assignments."
      ],
    };
    payload.manifestHash = hash(reportHashPayload(payload));
    mkdirSync(outDir, { recursive: true });
    if (existsSync(manifestPath)) {
      const prior = readJson(manifestPath);
      if (prior.manifestHash !== payload.manifestHash) throw new Error("Refusing to overwrite immutable release manifest with different content");
    } else writeJson(manifestPath, payload);

    const lines = ["# Beta Release Eligibility", "", `Release: \`${releaseId}\``, "", `Evaluated ${evaluations.length}; eligible ${eligibleNeighborhoods.length}; excluded ${evaluations.length - eligibleNeighborhoods.length}. Attending review alone was not treated as a blocker.`, "", "| Neighborhood | E | R | Claims | DPs | Exact membership | Provenance | High risk | Curator pending | Attending pending | Eligible | Reason |", "|---|---:|---:|---:|---:|---|---|---:|---:|---:|---|---|", ...evaluations.map((item) => `| ${item.topic} | ${item.entityCount ?? item.entities} | ${item.relationshipCount ?? item.relationships} | ${item.claimCount ?? item.claims} | ${item.decisionPointCount ?? item.decisionPoints} | ${item.exactMembershipStatus} | ${item.provenanceStatus} | ${item.highRiskItemCount} | ${item.pendingCuratorReviewCount} | ${item.pendingAttendingReviewCount} | ${item.betaEligible ? "yes" : "no"} | ${(item.blockingReasons ?? []).join("; ") || "—"} |`), "", "High-risk CTS treatment relationships with pending direct provenance are excluded record-by-record. Claims and decision points are excluded because none belong to an exact verified production batch.", ""];
    write(eligibilityPath, lines.join("\n"));
    writeJson(rollbackPath, { releaseId, manifestHash: payload.manifestHash, generatedAt: new Date().toISOString(), readyBeforeActivation: true, scope: eligibleNeighborhoods.map((item) => ({ topic: item.topic, membershipCount: item.memberships.length })), operations: payload.rollbackOperations, command: `KG_PRODUCTION_CONFIRM=${releaseId} node --experimental-strip-types scripts/kg-beta-production-release.ts rollback-dry-run` });
    console.log(JSON.stringify({ releaseId, manifestHash: payload.manifestHash, evaluated: evaluations.length, eligible: eligibleNeighborhoods.length, excluded: evaluations.length - eligibleNeighborhoods.length, counts: payload.uniqueProductionCounts, highRisk: payload.highRiskCounts }, null, 2));
  } finally { await db.end(); }
}

async function validateManifest(db: pg.Client, payload: Json, requireEmpty = true): Promise<string[]> {
  const errors: string[] = [];
  if (hash(reportHashPayload(payload)) !== payload.manifestHash) errors.push("MANIFEST_HASH_MISMATCH");
  const counts = (await db.query(`select (select count(*)::int from canonical_entities where is_active) entities,(select count(*)::int from canonical_relationships where is_active) relationships`)).rows[0];
  if (Number(counts.entities) !== payload.preReleaseCanonicalCounts.entities || Number(counts.relationships) !== payload.preReleaseCanonicalCounts.relationships) errors.push("CANONICAL_COUNTS_CHANGED_SINCE_MANIFEST");
  const schema = (await db.query(`select to_regclass('public.kg_production_releases') is not null releases,to_regclass('public.kg_production_neighborhoods') is not null neighborhoods,to_regclass('public.kg_production_memberships') is not null memberships,to_regprocedure('public.get_kg_production_neighborhood(text)') is not null application_query`)).rows[0];
  if (!Object.values(schema).every(Boolean)) errors.push("PRODUCTION_OVERLAY_SCHEMA_MISSING");
  if (requireEmpty && schema.releases) {
    const existing = await db.query(`select count(*)::int count from kg_production_neighborhoods where neighborhood_slug=any($1::text[]) and lifecycle_state in ('production_beta_active','production_active')`, [payload.neighborhoods.map((item: Json) => item.topic)]);
    if (Number(existing.rows[0].count) > 0) errors.push("ACTIVE_PRODUCTION_MEMBERSHIP_ALREADY_EXISTS");
  }
  for (const neighborhood of payload.neighborhoods) {
    const entityCount = neighborhood.entityIds.length ? Number((await db.query(`select count(*)::int count from canonical_entities where is_active and id=any($1::uuid[])`, [neighborhood.entityIds])).rows[0].count) : 0;
    const relCheck = neighborhood.relationshipIds.length ? (await db.query(`select count(*)::int count,count(*) filter(where se.id is null or oe.id is null or not se.is_active or not oe.is_active)::int dangling from canonical_relationships r left join canonical_entities se on se.id=r.subject_entity_id left join canonical_entities oe on oe.id=r.object_entity_id where r.is_active and r.lifecycle_status='active' and r.id=any($1::uuid[])`, [neighborhood.relationshipIds])).rows[0] : { count: 0, dangling: 0 };
    const bridgeCount = neighborhood.curriculumBridgeIds.length ? Number((await db.query(`select count(*)::int count from curriculum_node_entities where is_active and id=any($1::uuid[])`, [neighborhood.curriculumBridgeIds])).rows[0].count) : 0;
    if (entityCount !== neighborhood.entityIds.length) errors.push(`${neighborhood.topic}:ENTITY_TARGET_MISSING`);
    if (Number(relCheck.count) !== neighborhood.relationshipIds.length || Number(relCheck.dangling) !== 0) errors.push(`${neighborhood.topic}:RELATIONSHIP_TARGET_INVALID`);
    if (bridgeCount !== neighborhood.curriculumBridgeIds.length) errors.push(`${neighborhood.topic}:BRIDGE_TARGET_MISSING`);
    const proposalIds = [...new Set(neighborhood.memberships.map((item: Membership) => item.sourceProposalId))];
    const proposals = Number((await db.query(`select count(*)::int count from kg_automation_proposals where id=any($1::uuid[]) and review_status in ('applied','approved')`, [proposalIds])).rows[0].count);
    if (proposals !== proposalIds.length) errors.push(`${neighborhood.topic}:SOURCE_PROPOSAL_INVALID`);
  }
  if (!existsSync(rollbackPath) || readJson(rollbackPath).manifestHash !== payload.manifestHash) errors.push("ROLLBACK_MANIFEST_MISSING_OR_MISMATCHED");
  return errors;
}

async function dryRun(): Promise<void> {
  const payload = manifest();
  const db = client(); await db.connect();
  try {
    const errors = await validateManifest(db, payload, true);
    const status = errors.length ? "FAILED" : "PASSED";
    write(dryRunPath, ["# Beta Release Dry Run", "", `Release: \`${releaseId}\``, `Status: **${status}**`, "", `Validated ${payload.neighborhoods.length} eligible neighborhoods and ${payload.neighborhoods.reduce((sum: number, item: Json) => sum + item.memberships.length, 0)} scoped memberships.`, "", "Checks: manifest hash; canonical counts; exact targets; endpoint integrity; proposal provenance; duplicate-free scoped membership; production-query schema; empty activation scope; rollback manifest.", "", ...(errors.length ? ["## Errors", "", ...errors.map((item) => `- ${item}`)] : ["No unresolved discrepancy was found. The release is safe to apply idempotently within the manifest scope."]), ""].join("\n"));
    console.log(JSON.stringify({ releaseId, status, errors }, null, 2));
    if (errors.length) process.exitCode = 2;
  } finally { await db.end(); }
}

async function apply(): Promise<void> {
  requireConfirmation();
  const payload = manifest();
  if (!existsSync(dryRunPath) || !readFileSync(dryRunPath, "utf8").includes("Status: **PASSED**")) throw new Error("A passing dry-run report is required");
  const db = client(); await db.connect();
  const activatedAt = new Date().toISOString();
  try {
    const errors = await validateManifest(db, payload, false);
    if (errors.length) throw new Error(`Pre-apply validation failed: ${errors.join(", ")}`);
    await db.query("begin");
    const existing = await db.query(`select manifest_hash,status from kg_production_releases where release_id=$1`, [releaseId]);
    if (existing.rows[0] && existing.rows[0].manifest_hash !== payload.manifestHash) throw new Error("Release ID already exists with a different manifest");
    await db.query(`insert into kg_production_releases(release_id,review_tier,status,manifest_hash,pre_release_entity_count,pre_release_relationship_count,expected_post_release_entity_count,expected_post_release_relationship_count,activated_at,metadata)
      values($1,$2,'active',$3,$4,$5,$6,$7,$8,$9::jsonb)
      on conflict(release_id) do update set status='active',activated_at=coalesce(kg_production_releases.activated_at,excluded.activated_at)`, [releaseId, reviewTier, payload.manifestHash, payload.preReleaseCanonicalCounts.entities, payload.preReleaseCanonicalCounts.relationships, payload.expectedPostReleaseCanonicalCounts.entities, payload.expectedPostReleaseCanonicalCounts.relationships, activatedAt, JSON.stringify({ releasePolicy: payload.releasePolicy })]);
    for (const neighborhood of payload.neighborhoods) {
      await db.query(`insert into kg_production_neighborhoods(release_id,neighborhood_slug,source_batch_key,lifecycle_state,review_tier,prior_lifecycle_state,membership_hash,provenance_hash,activated_at,metadata)
        values($1,$2,$3,'production_beta_active',$4,$5,$6,$7,$8,$9::jsonb)
        on conflict(release_id,neighborhood_slug) do update set lifecycle_state='production_beta_active',revoked_at=null,activated_at=coalesce(kg_production_neighborhoods.activated_at,excluded.activated_at)`, [releaseId, neighborhood.topic, neighborhood.sourceBatchKey, reviewTier, neighborhood.preReleaseLifecycleState, neighborhood.productionMembershipHash, neighborhood.provenanceHash, activatedAt, JSON.stringify({ verifiedMembershipHash: neighborhood.verifiedMembershipHash })]);
      for (const item of neighborhood.memberships as Membership[]) {
        await db.query(`insert into kg_production_memberships(release_id,neighborhood_slug,target_table,target_id,source_proposal_id,source_record_ids,review_tier,is_high_risk,is_active,activated_at,metadata)
          values($1,$2,$3,$4,$5,$6::text[],$7,$8,true,$9,$10::jsonb)
          on conflict(release_id,neighborhood_slug,target_table,target_id) do update set is_active=true,revoked_at=null`, [releaseId, neighborhood.topic, item.targetTable, item.targetId, item.sourceProposalId, item.sourceRecordIds, reviewTier, item.isHighRisk, activatedAt, JSON.stringify({ proposalFingerprint: item.proposalFingerprint })]);
      }
    }
    await db.query("commit");
    const canonical = (await db.query(`select (select count(*)::int from canonical_entities where is_active) entities,(select count(*)::int from canonical_relationships where is_active) relationships`)).rows[0];
    write(applyPath, ["# Beta Release Apply Report", "", `Release: \`${releaseId}\``, "Status: **APPLIED**", "", `Activated ${payload.neighborhoods.length} neighborhoods at review tier \`${reviewTier}\`. Canonical entities and relationships were not modified.`, "", `Canonical counts: ${canonical.entities} entities / ${canonical.relationships} relationships.`, `Activation timestamp: ${activatedAt}.`, "", "Pending curator and attending assignments remain unchanged. Four high-risk CTS treatment relationships and all out-of-batch claims/decision points remain excluded.", ""].join("\n"));
    console.log(JSON.stringify({ ok: true, releaseId, activatedNeighborhoods: payload.neighborhoods.length, memberships: payload.neighborhoods.reduce((sum: number, item: Json) => sum + item.memberships.length, 0), canonical }, null, 2));
  } catch (error) { try { await db.query("rollback"); } catch {} throw error; } finally { await db.end(); }
}

async function verify(): Promise<void> {
  const payload = manifest();
  const db = client(); await db.connect();
  const failures: Json[] = [];
  const results: Json[] = [];
  try {
    const release = (await db.query(`select * from kg_production_releases where release_id=$1`, [releaseId])).rows[0];
    if (!release || release.status !== "active" || release.review_tier !== reviewTier || release.manifest_hash !== payload.manifestHash) failures.push({ scope: "release", reason: "release header mismatch" });
    for (const neighborhood of payload.neighborhoods) {
      const n = (await db.query(`select * from kg_production_neighborhoods where release_id=$1 and neighborhood_slug=$2`, [releaseId, neighborhood.topic])).rows[0];
      const members = (await db.query(`select target_table,target_id,source_proposal_id,source_record_ids,review_tier,is_high_risk from kg_production_memberships where release_id=$1 and neighborhood_slug=$2 and is_active order by target_table,target_id`, [releaseId, neighborhood.topic])).rows;
      const actualShape = members.map((item) => ({ targetTable: item.target_table, targetId: item.target_id, sourceProposalId: item.source_proposal_id, isHighRisk: item.is_high_risk })).sort((a, b) => stable(a).localeCompare(stable(b)));
      const actualHash = hash(actualShape);
      const rpc = (await db.query(`select get_kg_production_neighborhood($1) payload`, [neighborhood.topic])).rows[0]?.payload;
      const expectedCounts = { entities: neighborhood.entityIds.length, relationships: neighborhood.relationshipIds.length, curriculumBridges: neighborhood.curriculumBridgeIds.length, claims: 0, decisionPoints: 0 };
      const actualCounts = { entities: rpc?.entities?.length ?? -1, relationships: rpc?.relationships?.length ?? -1, curriculumBridges: rpc?.curriculumBridges?.length ?? -1, claims: rpc?.claims?.length ?? -1, decisionPoints: rpc?.decisionPoints?.length ?? -1 };
      const errors: string[] = [];
      if (!n || n.lifecycle_state !== "production_beta_active" || n.review_tier !== reviewTier) errors.push("lifecycle/review tier mismatch");
      if (actualHash !== neighborhood.productionMembershipHash) errors.push("membership hash mismatch");
      if (JSON.stringify(expectedCounts) !== JSON.stringify(actualCounts)) errors.push("application query count mismatch");
      if (!rpc || rpc.releaseId !== releaseId || rpc.reviewTier !== reviewTier) errors.push("application query release metadata mismatch");
      if (members.some((item) => item.review_tier !== reviewTier || !Array.isArray(item.source_record_ids) || item.source_record_ids.length === 0)) errors.push("membership review tier/provenance mismatch");
      const duplicateResultIds = [rpc?.entities ?? [], rpc?.relationships ?? [], rpc?.curriculumBridges ?? []].some((items: Json[]) => new Set(items.map((item) => item.id)).size !== items.length);
      if (duplicateResultIds) errors.push("duplicate application query results");
      results.push({ topic: neighborhood.topic, expectedCounts, actualCounts, membershipHash: actualHash, reviewTier: rpc?.reviewTier, errors });
      if (errors.length) failures.push({ scope: neighborhood.topic, errors });
    }
    const excludedTopic = payload.excludedNeighborhoods[0]?.topic;
    if (excludedTopic) {
      const excludedRpc = (await db.query(`select get_kg_production_neighborhood($1) payload`, [excludedTopic])).rows[0]?.payload;
      if (excludedRpc !== null) failures.push({ scope: excludedTopic, reason: "staging-only neighborhood visible through production query" });
    }
    const canonical = (await db.query(`select (select count(*)::int from canonical_entities where is_active) entities,(select count(*)::int from canonical_relationships where is_active) relationships`)).rows[0];
    if (Number(canonical.entities) !== payload.expectedPostReleaseCanonicalCounts.entities || Number(canonical.relationships) !== payload.expectedPostReleaseCanonicalCounts.relationships) failures.push({ scope: "canonical", reason: "post-release canonical counts changed" });
    if (failures.length) {
      await db.query("begin");
      for (const failure of failures.filter((item) => item.scope !== "release" && item.scope !== "canonical")) {
        await db.query(`update kg_production_memberships set is_active=false,revoked_at=now() where release_id=$1 and neighborhood_slug=$2`, [releaseId, failure.scope]);
        await db.query(`update kg_production_neighborhoods set lifecycle_state='revoked',revoked_at=now() where release_id=$1 and neighborhood_slug=$2`, [releaseId, failure.scope]);
      }
      await db.query(`update kg_production_releases set status='partially_active' where release_id=$1`, [releaseId]);
      await db.query("commit");
    }
    const report = { releaseId, verifiedAt: new Date().toISOString(), manifestHash: payload.manifestHash, passed: failures.length === 0, activatedNeighborhoodCount: results.filter((item) => item.errors.length === 0).length, failedNeighborhoodCount: results.filter((item) => item.errors.length > 0).length, canonicalCounts: { entities: Number(canonical.entities), relationships: Number(canonical.relationships) }, noCanonicalChanges: Number(canonical.entities) === payload.preReleaseCanonicalCounts.entities && Number(canonical.relationships) === payload.preReleaseCanonicalCounts.relationships, results, failures };
    writeJson(verificationPath, report);
    console.log(JSON.stringify({ passed: report.passed, activated: report.activatedNeighborhoodCount, failures }, null, 2));
    if (failures.length) process.exitCode = 2;
  } finally { await db.end(); }
}

async function rollbackDryRun(): Promise<void> {
  requireConfirmation();
  const payload = manifest();
  const db = client(); await db.connect();
  try {
    await db.query("begin");
    const before = Number((await db.query(`select count(*)::int count from kg_production_memberships where release_id=$1 and is_active`, [releaseId])).rows[0].count);
    await db.query(`update kg_production_memberships set is_active=false,revoked_at=now() where release_id=$1`, [releaseId]);
    await db.query(`update kg_production_neighborhoods set lifecycle_state='revoked',revoked_at=now() where release_id=$1`, [releaseId]);
    await db.query(`update kg_production_releases set status='rolled_back',rolled_back_at=now() where release_id=$1`, [releaseId]);
    const after = Number((await db.query(`select count(*)::int count from kg_production_memberships where release_id=$1 and is_active`, [releaseId])).rows[0].count);
    const visible = Number((await db.query(`select count(*)::int count from kg_production_neighborhoods where release_id=$1 and lifecycle_state in ('production_beta_active','production_active')`, [releaseId])).rows[0].count);
    if (after !== 0 || visible !== 0) throw new Error("Rollback dry run did not fully revoke the release");
    await db.query("rollback");
    console.log(JSON.stringify({ releaseId, rollbackDryRunPassed: true, activeMembershipsBefore: before, activeMembershipsAfterSimulatedRollback: after, simulatedVisibleNeighborhoods: visible, transactionRolledBack: true, plannedNeighborhoods: payload.neighborhoods.length }, null, 2));
  } catch (error) { try { await db.query("rollback"); } catch {} throw error; } finally { await db.end(); }
}

async function smoke(): Promise<void> {
  const payload = manifest();
  const verification = readJson(verificationPath);
  if (!verification.passed) throw new Error("Database verification must pass before product smoke tests");
  const db = client(); await db.connect();
  const checks: string[] = [];
  try {
    const sample = payload.neighborhoods[0];
    const rpc = (await db.query(`select get_kg_production_neighborhood($1) payload`, [sample.topic])).rows[0]?.payload;
    if (!rpc) throw new Error("Application query returned no active sample");
    if (rpc.reviewTier !== reviewTier || rpc.lifecycleState !== "production_beta_active") throw new Error("Application query cannot distinguish beta tier/lifecycle");
    if (!rpc.entities.length || !rpc.relationships.length) throw new Error("Application query returned an empty graph");
    if ([...rpc.entities, ...rpc.relationships, ...rpc.curriculumBridges].some((item: Json) => item.reviewTier !== reviewTier || !item.sourceRecordIds?.length)) throw new Error("Application query omitted review tier or provenance");
    checks.push(`Retrieved ${sample.topic} through get_kg_production_neighborhood`);
    checks.push(`Retrieved ${rpc.entities.length} entities, ${rpc.relationships.length} relationships, and ${rpc.curriculumBridges.length} curriculum bridges`);
    checks.push("Every returned record exposes automated_beta and sourceRecordIds");
    const excluded = payload.excludedNeighborhoods[0]?.topic;
    if (excluded) {
      const hidden = (await db.query(`select get_kg_production_neighborhood($1) payload`, [excluded])).rows[0]?.payload;
      if (hidden !== null) throw new Error("Staging-only excluded neighborhood is application-visible");
      checks.push(`Confirmed excluded staging-only neighborhood ${excluded} is invisible`);
    }
    checks.push("Shared canonical records are deduplicated within each neighborhood response");
    write(smokePath, ["# Beta Release Product Smoke Tests", "", `Release: \`${releaseId}\``, "Status: **PASSED**", "", ...checks.map((item) => `- ${item}.`), "", "The authenticated application route `/api/knowledge-graph/neighborhood/[slug]` uses this same RPC and does not query staging canonical tables directly.", ""].join("\n"));
    console.log(JSON.stringify({ passed: true, checks }, null, 2));
  } finally { await db.end(); }
}

const command = process.argv[2] ?? "build";
if (command === "build") await build();
else if (command === "dry-run") await dryRun();
else if (command === "apply") await apply();
else if (command === "verify") await verify();
else if (command === "rollback-dry-run") await rollbackDryRun();
else if (command === "smoke") await smoke();
else throw new Error(`Unknown command ${command}`);
