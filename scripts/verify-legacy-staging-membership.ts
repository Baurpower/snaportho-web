import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { ProposalRecord } from "./kg-automation-common.ts";
import { chunkArray, createServiceRoleClient, normalizeLabel } from "./kg-automation-common.ts";
import { resolveTopic } from "./lib/education/kg-compiler/topic-registry.ts";
import { semanticMismatch, semanticProposalShape } from "./lib/education/kg-proposal-membership.ts";
import { PREDICATE_REGISTRY } from "./lib/education/kg-relationship-registry.ts";
import { requireStaging } from "./lib/education/kg-staging-guard.ts";

type StructuralProposal = ProposalRecord & {
  proposal_type: "create_canonical_entity" | "add_canonical_relationship" | "link_curriculum_node_to_entity";
};

type Target = {
  table: "canonical_entities" | "canonical_relationships" | "curriculum_node_entities";
  id: string;
};

type Discrepancy = {
  fingerprint: string;
  kind: string;
  expected: string;
  observed: string;
};

function arg(name: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? "" : "";
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hash(value: unknown): string {
  return createHash("sha256").update(stable(value)).digest("hex");
}

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeBlockedMarkdown(filePath: string, report: any): void {
  const lines = [
    `# ${report.displayName} — Strict Database Verification Blocked`,
    "",
    `Run date: ${report.runDate}. Prior state: \`staging_applied\`; resulting state: \`database_verification_blocked\`.`,
    "",
    `The exact legacy apply membership was reconstructed from ${report.expected.structuralProposals} recorded structural fingerprints. Database fallback was disabled. ${report.discrepancyCount} staging-integrity discrepancy(s) prevented membership repair and strict audit.`,
    "",
    "## Discrepancies",
    "",
    ...report.discrepancies.map((item: Discrepancy) => `- \`${item.fingerprint}\`: ${item.kind}; expected ${item.expected}; observed ${item.observed}.`),
    "",
    `Automatic repair attempted: no. Exact next action: \`${report.exactNextAction}\`.`,
    "",
  ];
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, lines.join("\n"));
}

const topicKey = arg("--topic");
const repairMembership = process.argv.includes("--repair-membership");
const reconstructAggregateCreated = process.argv.includes("--reconstruct-aggregate-created");
if (!topicKey) throw new Error("Usage: --topic <topic-key> [--repair-membership] [--reconstruct-aggregate-created]");

const topic = resolveTopic(topicKey);
if (!topic) throw new Error(`Unknown topic: ${topicKey}`);
const guard = requireStaging(`verify legacy staging membership for ${topicKey}`);

const pilotDir = path.join(process.cwd(), "reports", "kg-pilots");
const applyPath = path.join(pilotDir, `${topicKey}-staging-apply-result.json`);
const curatedPath = path.join(pilotDir, `${topicKey}-curated-proposals.json`);
if (!existsSync(applyPath) || !existsSync(curatedPath)) {
  throw new Error(`Missing legacy apply or curated proposal artifact for ${topicKey}`);
}

const applyResult = JSON.parse(readFileSync(applyPath, "utf8")) as any;
const curated = JSON.parse(readFileSync(curatedPath, "utf8")) as { proposals: ProposalRecord[] };
if (applyResult.topicKey !== topicKey || applyResult.pilotKey !== topic.pilotKey) {
  throw new Error(`Legacy apply identity mismatch for ${topicKey}`);
}
if (applyResult.dryRun || applyResult.errors?.length || !applyResult.guard?.allowed) {
  throw new Error(`Legacy apply report is not a successful guarded staging apply for ${topicKey}`);
}

const byFingerprint = new Map<string, ProposalRecord[]>();
for (const proposal of curated.proposals) {
  const rows = byFingerprint.get(proposal.proposal_fingerprint) ?? [];
  rows.push(proposal);
  byFingerprint.set(proposal.proposal_fingerprint, rows);
}

const recordedFingerprints = (applyResult.skipped ?? []).map((item: any) => String(item.fingerprint));
if (new Set(recordedFingerprints).size !== recordedFingerprints.length) {
  throw new Error(`Duplicate recorded apply fingerprint for ${topicKey}`);
}

const discrepancies: Discrepancy[] = [];
const structuralProposals: StructuralProposal[] = [];
for (const fingerprint of recordedFingerprints) {
  const candidates = byFingerprint.get(fingerprint) ?? [];
  if (candidates.length === 0) {
    discrepancies.push({ fingerprint, kind: "membership_manifest_missing", expected: "one matching curated structural proposal", observed: "zero" });
    continue;
  }
  const first = candidates[0];
  for (const duplicate of candidates.slice(1)) {
    const mismatch = semanticMismatch(first, duplicate);
    if (mismatch) discrepancies.push({ fingerprint, kind: "competing_membership_semantics", expected: "identical duplicate references", observed: mismatch });
  }
  if (!["create_canonical_entity", "add_canonical_relationship", "link_curriculum_node_to_entity"].includes(first.proposal_type)) {
    discrepancies.push({ fingerprint, kind: "unexpected_recorded_apply_type", expected: "structural proposal", observed: first.proposal_type });
    continue;
  }
  structuralProposals.push(first as StructuralProposal);
}

const unrecordedCreatedStructural = Number(applyResult.applied?.entities ?? 0)
  + Number(applyResult.applied?.relationships ?? 0)
  + Number(applyResult.applied?.bridges ?? 0);
let aggregateCreatedReconstructed = false;
if (unrecordedCreatedStructural > 0 && reconstructAggregateCreated) {
  const recorded = new Set(recordedFingerprints);
  const candidates = curated.proposals.filter((proposal) =>
    ["approved", "applied"].includes(String(proposal.review_status))
    && ["create_canonical_entity", "add_canonical_relationship", "link_curriculum_node_to_entity"].includes(proposal.proposal_type)
    && !recorded.has(proposal.proposal_fingerprint)
  ) as StructuralProposal[];
  const expectedByType = {
    create_canonical_entity: Number(applyResult.applied?.entities ?? 0),
    add_canonical_relationship: Number(applyResult.applied?.relationships ?? 0),
    link_curriculum_node_to_entity: Number(applyResult.applied?.bridges ?? 0),
  };
  const observedByType = {
    create_canonical_entity: candidates.filter((item) => item.proposal_type === "create_canonical_entity").length,
    add_canonical_relationship: candidates.filter((item) => item.proposal_type === "add_canonical_relationship").length,
    link_curriculum_node_to_entity: candidates.filter((item) => item.proposal_type === "link_curriculum_node_to_entity").length,
  };
  const uniqueFingerprints = new Set(candidates.map((item) => item.proposal_fingerprint)).size;
  if (candidates.length === unrecordedCreatedStructural
    && uniqueFingerprints === candidates.length
    && stable(expectedByType) === stable(observedByType)) {
    structuralProposals.push(...candidates);
    aggregateCreatedReconstructed = true;
  } else {
    discrepancies.push({
      fingerprint: "apply-report",
      kind: "aggregate_reconstruction_cardinality",
      expected: stable({ total: unrecordedCreatedStructural, byType: expectedByType }),
      observed: stable({ total: candidates.length, uniqueFingerprints, byType: observedByType }),
    });
  }
}

const accounted = recordedFingerprints.length
  + Number(applyResult.applied?.entities ?? 0)
  + Number(applyResult.applied?.relationships ?? 0)
  + Number(applyResult.applied?.bridges ?? 0)
  + Number(applyResult.applied?.claims_draft ?? 0)
  + Number(applyResult.applied?.decision_points_draft ?? 0);
if (accounted !== Number(applyResult.approvedLoaded ?? 0)) {
  discrepancies.push({
    fingerprint: "apply-report",
    kind: "unreconstructable_apply_membership",
    expected: `${applyResult.approvedLoaded} accounted proposals`,
    observed: `${accounted}`,
  });
}
if (unrecordedCreatedStructural > 0 && !aggregateCreatedReconstructed) {
  discrepancies.push({
    fingerprint: "apply-report",
    kind: "unreconstructable_created_structural_membership",
    expected: "fingerprint-level outcomes for every created structural object",
    observed: `${unrecordedCreatedStructural} created structural object(s) recorded only as aggregate counts`,
  });
}

const supabase = createServiceRoleClient();
for (const table of ["kg_automation_proposals", "kg_proposal_batch_memberships", "canonical_entities", "canonical_relationships", "curriculum_nodes", "curriculum_node_entities"]) {
  const result = await supabase.from(table).select("id").limit(1);
  if (result.error) throw new Error(`Required table ${table}: ${result.error.message}`);
}

const entityProposals = structuralProposals.filter((item) => item.proposal_type === "create_canonical_entity");
const relationshipProposals = structuralProposals.filter((item) => item.proposal_type === "add_canonical_relationship");
const bridgeProposals = structuralProposals.filter((item) => item.proposal_type === "link_curriculum_node_to_entity");
const requiredSlugs = [...new Set([
  ...entityProposals.map((item) => String(item.metadata?.slug ?? "")),
  ...relationshipProposals.flatMap((item) => [String(item.metadata?.subject_slug ?? ""), String(item.metadata?.object_slug ?? "")]),
  ...bridgeProposals.map((item) => String(item.metadata?.primary_entity_slug ?? "")),
].filter(Boolean))];

const entityRows: any[] = [];
for (const slugs of chunkArray(requiredSlugs, 75)) {
  const result = await supabase.from("canonical_entities")
    .select("id,slug,entity_type,preferred_label,is_active")
    .in("slug", slugs)
    .eq("is_active", true);
  if (result.error) throw result.error;
  entityRows.push(...(result.data ?? []));
}
const entitiesBySlug = Object.groupBy(entityRows, (row: any) => String(row.slug));
const targetByFingerprint = new Map<string, Target>();

for (const proposal of entityProposals) {
  const slug = String(proposal.metadata?.slug ?? "");
  const matches = entitiesBySlug[slug] ?? [];
  if (matches.length !== 1) {
    discrepancies.push({ fingerprint: proposal.proposal_fingerprint, kind: "canonical_entity_cardinality", expected: `one active entity for ${slug}`, observed: `${matches.length}` });
    continue;
  }
  const row = matches[0] as any;
  if (row.entity_type !== proposal.proposed_entity_type || normalizeLabel(row.preferred_label) !== normalizeLabel(String(proposal.proposed_entity_label ?? ""))) {
    discrepancies.push({
      fingerprint: proposal.proposal_fingerprint,
      kind: "canonical_identity_mismatch",
      expected: `${proposal.proposed_entity_type}/${proposal.proposed_entity_label}`,
      observed: `${row.entity_type}/${row.preferred_label}`,
    });
    continue;
  }
  targetByFingerprint.set(proposal.proposal_fingerprint, { table: "canonical_entities", id: row.id });
}

const idToSlug = new Map(entityRows.map((row: any) => [String(row.id), String(row.slug)]));
const entityIds = [...idToSlug.keys()];
const relationshipRows: any[] = [];
for (const subjectIds of chunkArray(entityIds, 75)) {
  const result = await supabase.from("canonical_relationships")
    .select("id,subject_entity_id,predicate,object_entity_id,is_active")
    .eq("subject_entity_type", "canonical_entity")
    .eq("object_entity_type", "canonical_entity")
    .in("subject_entity_id", subjectIds)
    .in("object_entity_id", entityIds)
    .eq("is_active", true);
  if (result.error) throw result.error;
  relationshipRows.push(...(result.data ?? []));
}
const relationshipsByTriple = Object.groupBy(relationshipRows, (row: any) => `${idToSlug.get(String(row.subject_entity_id))}|${row.predicate}|${idToSlug.get(String(row.object_entity_id))}`);
for (const proposal of relationshipProposals) {
  const subject = String(proposal.metadata?.subject_slug ?? "");
  const predicate = String(proposal.proposed_predicate ?? "");
  const object = String(proposal.metadata?.object_slug ?? "");
  const triple = `${subject}|${predicate}|${object}`;
  if (!PREDICATE_REGISTRY[predicate]) {
    discrepancies.push({ fingerprint: proposal.proposal_fingerprint, kind: "invalid_predicate", expected: "registered active predicate", observed: predicate });
    continue;
  }
  const matches = relationshipsByTriple[triple] ?? [];
  if (matches.length !== 1) {
    discrepancies.push({ fingerprint: proposal.proposal_fingerprint, kind: "canonical_relationship_cardinality", expected: `one active triple ${triple}`, observed: `${matches.length}` });
    continue;
  }
  targetByFingerprint.set(proposal.proposal_fingerprint, { table: "canonical_relationships", id: String((matches[0] as any).id) });
}

const nodeSlugs = [...new Set(bridgeProposals.map((item) => String(item.metadata?.curriculum_node_slug ?? "")).filter(Boolean))];
const nodeResult = nodeSlugs.length
  ? await supabase.from("curriculum_nodes").select("id,slug").in("slug", nodeSlugs)
  : { data: [], error: null };
if (nodeResult.error) throw nodeResult.error;
const nodesBySlug = Object.groupBy(nodeResult.data ?? [], (row: any) => String(row.slug));
for (const proposal of bridgeProposals) {
  const nodeSlug = String(proposal.metadata?.curriculum_node_slug ?? "");
  const entitySlug = String(proposal.metadata?.primary_entity_slug ?? "");
  const nodes = nodesBySlug[nodeSlug] ?? [];
  const entities = entitiesBySlug[entitySlug] ?? [];
  if (nodes.length !== 1 || entities.length !== 1) {
    discrepancies.push({
      fingerprint: proposal.proposal_fingerprint,
      kind: "bridge_endpoint_cardinality",
      expected: `one curriculum node ${nodeSlug} and one entity ${entitySlug}`,
      observed: `${nodes.length} node(s), ${entities.length} entity row(s)`,
    });
    continue;
  }
  const bridgeResult = await supabase.from("curriculum_node_entities")
    .select("id")
    .eq("curriculum_node_id", (nodes[0] as any).id)
    .eq("canonical_entity_id", (entities[0] as any).id)
    .eq("relation_type", proposal.proposed_bridge_type ?? "primary_coverage")
    .eq("is_active", true);
  if (bridgeResult.error) throw bridgeResult.error;
  const matches = bridgeResult.data ?? [];
  if (matches.length !== 1) {
    discrepancies.push({ fingerprint: proposal.proposal_fingerprint, kind: "curriculum_bridge_cardinality", expected: "one active curriculum bridge", observed: `${matches.length}` });
    continue;
  }
  targetByFingerprint.set(proposal.proposal_fingerprint, { table: "curriculum_node_entities", id: String(matches[0].id) });
}

const packetHash = hash(structuralProposals.map((proposal) => ({
  fingerprint: proposal.proposal_fingerprint,
  semantic: semanticProposalShape(proposal),
})));
const graphHash = hash([...targetByFingerprint.entries()].sort(([left], [right]) => left.localeCompare(right)));
const batchKey = `legacy-${topicKey}-${packetHash.slice(0, 16)}`;
const runDate = new Date().toISOString().slice(0, 10);

const existingSemanticByFingerprint = new Map<string, any>();
for (const fingerprints of chunkArray(structuralProposals.map((item) => item.proposal_fingerprint), 25)) {
  const result = await supabase.from("kg_automation_proposals")
    .select("*")
    .in("proposal_fingerprint", fingerprints)
    .eq("is_active", true);
  if (result.error) throw result.error;
  for (const row of result.data ?? []) {
    const fingerprint = String(row.proposal_fingerprint);
    if (existingSemanticByFingerprint.has(fingerprint)) {
      discrepancies.push({ fingerprint, kind: "duplicate_active_semantic_proposal", expected: "one active semantic proposal", observed: "more than one" });
      continue;
    }
    existingSemanticByFingerprint.set(fingerprint, row);
  }
}
for (const proposal of structuralProposals) {
  const existing = existingSemanticByFingerprint.get(proposal.proposal_fingerprint);
  if (!existing) continue;
  const mismatch = semanticMismatch(existing, proposal);
  if (mismatch) {
    discrepancies.push({
      fingerprint: proposal.proposal_fingerprint,
      kind: "competing_semantic_identity",
      expected: JSON.stringify(semanticProposalShape(proposal)),
      observed: JSON.stringify(semanticProposalShape(existing)),
    });
  }
}

const hasSemanticIdentityConflict = discrepancies.some((item) => item.kind.includes("semantic") || item.kind.includes("identity"));
const exactNextAction = hasSemanticIdentityConflict
  ? "resolve_canonical_identity"
  : discrepancies.some((item) => item.kind.includes("bridge"))
    ? "restore_or_adjudicate_curriculum_node_bridge"
    : "resolve_canonical_mismatch";

if (discrepancies.length > 0) {
  let quarantinedPartialMemberships = 0;
  if (repairMembership) {
    const partial = await supabase.from("kg_proposal_batch_memberships")
      .select("id", { count: "exact" })
      .eq("batch_key", batchKey)
      .eq("packet_state", "approved");
    if (partial.error) throw partial.error;
    quarantinedPartialMemberships = partial.count ?? (partial.data?.length ?? 0);
    if (quarantinedPartialMemberships > 0) {
      const quarantine = await supabase.from("kg_proposal_batch_memberships")
        .update({ packet_state: "superseded", apply_disposition: "failed" })
        .eq("batch_key", batchKey)
        .eq("packet_state", "approved");
      if (quarantine.error) throw quarantine.error;
    }
  }
  const report = {
    ok: false,
    runDate,
    topicKey,
    displayName: topic.displayName,
    pilotKey: topic.pilotKey,
    priorState: "staging_applied",
    resultingState: "database_verification_blocked",
    reloadSource: "database",
    fallbackUsed: false,
    blockerClass: hasSemanticIdentityConflict ? "human_review_required" : "staging_integrity_failure",
    automaticRepairAttempted: repairMembership,
    quarantinedPartialMemberships,
    batchKey,
    packetHash,
    expected: {
      approvedLoaded: applyResult.approvedLoaded,
      structuralProposals: structuralProposals.length,
      entities: entityProposals.length,
      relationships: relationshipProposals.length,
      curriculumBridges: bridgeProposals.length,
      draftClaims: Number(applyResult.applied?.claims_draft ?? 0),
      draftDecisionPoints: Number(applyResult.applied?.decision_points_draft ?? 0),
    },
    resolved: {
      entities: entityProposals.filter((item) => targetByFingerprint.get(item.proposal_fingerprint)?.table === "canonical_entities").length,
      relationships: relationshipProposals.filter((item) => targetByFingerprint.get(item.proposal_fingerprint)?.table === "canonical_relationships").length,
      curriculumBridges: bridgeProposals.filter((item) => targetByFingerprint.get(item.proposal_fingerprint)?.table === "curriculum_node_entities").length,
    },
    discrepancyCount: discrepancies.length,
    discrepancies,
    exactNextAction,
    evidence: { applyPath: path.relative(process.cwd(), applyPath), curatedPath: path.relative(process.cwd(), curatedPath) },
  };
  const reportDir = path.join(process.cwd(), "reports", "kg-verticals", topicKey);
  writeJson(path.join(reportDir, "strict-db-verification-blocked.json"), report);
  writeBlockedMarkdown(path.join(reportDir, "strict-db-verification-blocked.md"), report);
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = 2;
} else {
  const packetDir = path.join(process.cwd(), "reports", "kg-staging", topicKey, batchKey);
  const packet = {
    topic: topicKey,
    pilotKey: topic.pilotKey,
    batchKey,
    packetHash,
    graphHash,
    sourceApplyReport: path.relative(process.cwd(), applyPath),
    proposals: structuralProposals.map((proposal) => ({ ...proposal, review_status: "applied" })),
  };
  writeJson(path.join(packetDir, "proposal-packet.json"), packet);

  let insertedSemantic = 0;
  let reusedSemantic = 0;
  let insertedMemberships = 0;
  let reusedMemberships = 0;
  let reactivatedMemberships = 0;
  let proposalStatesRepaired = 0;
  if (repairMembership) {
    for (const proposal of structuralProposals) {
      const existingResult = await supabase.from("kg_automation_proposals")
        .select("*")
        .eq("proposal_fingerprint", proposal.proposal_fingerprint)
        .eq("is_active", true)
        .limit(2);
      if (existingResult.error) throw existingResult.error;
      if ((existingResult.data ?? []).length > 1) throw new Error(`Multiple active semantic proposals: ${proposal.proposal_fingerprint}`);
      let semanticRow: any = existingResult.data?.[0];
      if (semanticRow) {
        reusedSemantic += 1;
        if (semanticRow.review_status !== "applied") {
          const update = await supabase.from("kg_automation_proposals")
            .update({ review_status: "applied", applied_at: semanticRow.applied_at ?? new Date().toISOString() })
            .eq("id", semanticRow.id);
          if (update.error) throw update.error;
          proposalStatesRepaired += 1;
        }
      } else {
        const insert = await supabase.from("kg_automation_proposals")
          .insert({ ...proposal, review_status: "applied", applied_at: proposal.applied_at ?? new Date().toISOString() })
          .select("*")
          .single();
        if (insert.error) throw insert.error;
        semanticRow = insert.data;
        insertedSemantic += 1;
      }

      const target = targetByFingerprint.get(proposal.proposal_fingerprint)!;
      const membershipResult = await supabase.from("kg_proposal_batch_memberships")
        .select("*")
        .eq("proposal_id", semanticRow.id)
        .eq("batch_key", batchKey)
        .limit(2);
      if (membershipResult.error) throw membershipResult.error;
      if ((membershipResult.data ?? []).length > 1) throw new Error(`Duplicate membership: ${proposal.proposal_fingerprint}`);
      if (membershipResult.data?.[0]) {
        const membership = membershipResult.data[0] as any;
        const provenanceMatches = membership.topic_slug === topic.pilotKey
          && membership.packet_hash === packetHash
          && membership.graph_hash === graphHash
          && membership.canonical_target_table === target.table
          && membership.canonical_target_id === target.id;
        if (!provenanceMatches) {
          throw new Error(`Existing membership provenance mismatch: ${proposal.proposal_fingerprint}`);
        }
        if (membership.packet_state === "approved" && membership.apply_disposition === "already_applied") {
          reusedMemberships += 1;
        } else if (membership.packet_state === "superseded" && membership.apply_disposition === "failed") {
          const reactivate = await supabase.from("kg_proposal_batch_memberships").update({
            packet_state: "approved",
            apply_disposition: "already_applied",
            applied_at: membership.applied_at ?? new Date().toISOString(),
          }).eq("id", membership.id).eq("packet_state", "superseded").eq("apply_disposition", "failed");
          if (reactivate.error) throw reactivate.error;
          reactivatedMemberships += 1;
        } else {
          throw new Error(`Existing membership lifecycle mismatch: ${proposal.proposal_fingerprint}`);
        }
      } else {
        const insert = await supabase.from("kg_proposal_batch_memberships").insert({
          proposal_id: semanticRow.id,
          batch_key: batchKey,
          topic_slug: topic.pilotKey,
          packet_hash: packetHash,
          graph_hash: graphHash,
          packet_state: "approved",
          apply_disposition: "already_applied",
          canonical_target_table: target.table,
          canonical_target_id: target.id,
          applied_at: new Date().toISOString(),
        });
        if (insert.error) throw insert.error;
        insertedMemberships += 1;
      }
    }
  }

  const report = {
    ok: true,
    runDate,
    topicKey,
    displayName: topic.displayName,
    pilotKey: topic.pilotKey,
    batchKey,
    packetHash,
    graphHash,
    guard,
    reloadSource: "database",
    fallbackUsed: false,
    dryRun: !repairMembership,
    exactAppliedMembershipReconstructed: true,
    aggregateCreatedReconstructed,
    counts: {
      approvedLoaded: applyResult.approvedLoaded,
      structuralProposals: structuralProposals.length,
      entities: entityProposals.length,
      relationships: relationshipProposals.length,
      curriculumBridges: bridgeProposals.length,
      draftClaimsExcluded: Number(applyResult.applied?.claims_draft ?? 0),
      draftDecisionPointsExcluded: Number(applyResult.applied?.decision_points_draft ?? 0),
    },
    repairs: { insertedSemantic, reusedSemantic, proposalStatesRepaired, insertedMemberships, reusedMemberships, reactivatedMemberships },
    discrepancyCount: 0,
    exactNextAction: repairMembership ? "run_strict_db_reload" : "repair_batch_membership",
  };
  writeJson(path.join(packetDir, repairMembership ? "membership-reconstruction-report.json" : "membership-reconstruction-dry-run-report.json"), report);
  console.log(JSON.stringify(report, null, 2));
}
