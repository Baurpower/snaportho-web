import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { createServiceRoleClient } from "./kg-automation-common.ts";
import { requireStaging } from "./lib/education/kg-staging-guard.ts";

const batchKey = "cts-0c2b2fa3ef5af8aa";
const packetDir = path.join("reports", "kg-staging", "carpal-tunnel-syndrome", batchKey);
const packet = JSON.parse(readFileSync(path.join(packetDir, "proposal-packet.json"), "utf8"));
const manifest = JSON.parse(readFileSync(path.join(packetDir, "proposal-manifest.json"), "utf8"));
const guard = requireStaging("verify CTS staging lifecycle");
const supabase = createServiceRoleClient();
const failures: string[] = [];

const membershipResult = await supabase.from("kg_proposal_batch_memberships")
  .select("*,proposal:kg_automation_proposals(*)").eq("batch_key", batchKey);
if (membershipResult.error) throw membershipResult.error;
const memberships = membershipResult.data ?? [];
const packetFingerprints = new Set(packet.proposals.map((proposal: any) => proposal.proposal_fingerprint));
const dbFingerprints = new Set(memberships.map((row: any) => row.proposal?.proposal_fingerprint));
const missingMemberships = [...packetFingerprints].filter((item) => !dbFingerprints.has(item));
const unexpectedMemberships = [...dbFingerprints].filter((item) => !packetFingerprints.has(item));
if (memberships.length !== 207) failures.push(`Expected 207 memberships, got ${memberships.length}`);
if (missingMemberships.length) failures.push(`Missing memberships: ${missingMemberships.join(",")}`);
if (unexpectedMemberships.length) failures.push(`Unexpected memberships: ${unexpectedMemberships.join(",")}`);
const incomplete = memberships.filter((row: any) => ["pending", "failed"].includes(row.apply_disposition));
if (incomplete.length) failures.push(`${incomplete.length} memberships are incomplete`);
for (const row of memberships as any[]) {
  if (row.packet_hash !== packet.packetHash || row.graph_hash !== manifest.semanticGraphHash || row.packet_state !== "approved") failures.push(`Membership provenance mismatch: ${row.proposal?.proposal_fingerprint}`);
}

const expectedEntities = packet.proposals.filter((proposal: any) => proposal.proposal_type === "create_canonical_entity");
const expectedRelationships = packet.proposals.filter((proposal: any) => proposal.proposal_type === "add_canonical_relationship");
const slugs = expectedEntities.map((proposal: any) => proposal.metadata.slug);
const entityResult = await supabase.from("canonical_entities").select("id,slug,entity_type,metadata,is_active").in("slug", slugs).eq("is_active", true);
if (entityResult.error) throw entityResult.error;
const entities = entityResult.data ?? [];
const duplicateSlugs = Object.entries(Object.groupBy(entities, (row: any) => row.slug)).filter(([, rows]) => (rows?.length ?? 0) > 1).map(([slug]) => slug);
if (entities.length !== 92) failures.push(`Expected 92 entities, got ${entities.length}`);
if (duplicateSlugs.length) failures.push(`Duplicate canonical slugs: ${duplicateSlugs.join(",")}`);
const idBySlug = new Map(entities.map((row: any) => [row.slug, row.id]));

const relationshipIds = new Map<string, string[]>();
for (const proposal of expectedRelationships) {
  const subjectId = idBySlug.get(proposal.metadata.subject_slug), objectId = idBySlug.get(proposal.metadata.object_slug);
  if (!subjectId || !objectId) { failures.push(`Missing relationship endpoint: ${proposal.proposal_fingerprint}`); continue; }
  const result = await supabase.from("canonical_relationships").select("id,metadata").eq("subject_entity_type", "canonical_entity").eq("subject_entity_id", subjectId).eq("predicate", proposal.proposed_predicate).eq("object_entity_type", "canonical_entity").eq("object_entity_id", objectId).eq("is_active", true);
  if (result.error) throw result.error;
  relationshipIds.set(proposal.proposal_fingerprint, (result.data ?? []).map((row: any) => row.id));
  if ((result.data ?? []).length !== 1) failures.push(`${proposal.proposal_fingerprint}: expected one canonical relationship, got ${result.data?.length ?? 0}`);
}

const cts6 = await supabase.from("canonical_entities").select("id").eq("slug", "cts-6-clinical-diagnostic-tool").eq("is_active", true);
if (cts6.error) throw cts6.error;
if ((cts6.data ?? []).length) failures.push("Rejected CTS-6 entity exists in active canonical state");
const rejectedTriples = [
  ["carpal-tunnel-syndrome", "has_classification", "cts-6-clinical-diagnostic-tool"],
  ["carpal-tunnel", "part_of", "hand-wrist-anatomy-hub"],
];
for (const [subjectSlug, predicate, objectSlug] of rejectedTriples) {
  const subjectId = idBySlug.get(subjectSlug), objectId = idBySlug.get(objectSlug);
  if (!subjectId || !objectId) continue;
  const result = await supabase.from("canonical_relationships").select("id").eq("subject_entity_id", subjectId).eq("predicate", predicate).eq("object_entity_id", objectId).eq("is_active", true);
  if (result.error) throw result.error;
  if ((result.data ?? []).length) failures.push(`Rejected triple exists: ${subjectSlug}|${predicate}|${objectSlug}`);
}

const bridgeProposal = packet.proposals.find((proposal: any) => proposal.proposal_type === "link_curriculum_node_to_entity");
const node = await supabase.from("curriculum_nodes").select("id").eq("slug", bridgeProposal.metadata.curriculum_node_slug).limit(1);
if (node.error) throw node.error;
const primaryId = idBySlug.get(bridgeProposal.metadata.primary_entity_slug);
const bridge = node.data?.[0] && primaryId ? await supabase.from("curriculum_node_entities").select("id,metadata").eq("curriculum_node_id", node.data[0].id).eq("canonical_entity_id", primaryId).eq("relation_type", bridgeProposal.proposed_bridge_type).eq("is_active", true) : { data: [], error: null };
if (bridge.error) throw bridge.error;
if ((bridge.data ?? []).length !== 1) failures.push(`Expected one CTS curriculum bridge, got ${bridge.data?.length ?? 0}`);

const inserted = memberships.filter((row: any) => row.apply_disposition === "inserted");
const reused = memberships.filter((row: any) => row.apply_disposition === "already_applied" || row.apply_disposition === "no_op");
for (const row of inserted as any[]) {
  if (!row.canonical_target_id || !row.canonical_target_table) failures.push(`Inserted membership lacks target: ${row.proposal?.proposal_fingerprint}`);
}
const globalIntegrity = await Promise.all([
  supabase.from("kg_automation_proposals").select("id", { count: "exact", head: true }).eq("is_active", true),
  supabase.from("kg_proposal_batch_memberships").select("id", { count: "exact", head: true }),
]);
for (const result of globalIntegrity) if (result.error) throw result.error;
const orphanResult = await supabase.from("kg_proposal_batch_memberships").select("proposal_id,proposal:kg_automation_proposals(id)").limit(10000);
if (orphanResult.error) throw orphanResult.error;
const orphanMemberships = (orphanResult.data ?? []).filter((row: any) => !row.proposal).length;
if (orphanMemberships) failures.push(`${orphanMemberships} orphan memberships`);

const report = {
  ok: failures.length === 0, guard, batchKey, packetHash: packet.packetHash, graphHash: manifest.semanticGraphHash,
  membership: { count: memberships.length, missing: missingMemberships, unexpected: unexpectedMemberships, incomplete: incomplete.length, inserted: inserted.length, reusedOrVerified: reused.length },
  canonical: { entities: entities.length, relationships: expectedRelationships.length, relationshipTriplesVerified: [...relationshipIds.values()].filter((ids) => ids.length === 1).length, duplicateSlugs, curriculumBridges: bridge.data?.length ?? 0 },
  rejectedObjectsAbsent: !failures.some((failure) => failure.startsWith("Rejected")),
  provenance: { insertedTargetsComplete: inserted.every((row: any) => row.canonical_target_id && row.canonical_target_table), packetMembershipProvenanceComplete: memberships.every((row: any) => row.packet_hash === packet.packetHash && row.graph_hash === manifest.semanticGraphHash) },
  globalMembershipIntegrity: { activeSemanticProposals: globalIntegrity[0].count, memberships: globalIntegrity[1].count, orphanMemberships },
  productSmokeTests: { primaryEntityLoad: Boolean(primaryId), curriculumBridgeLoad: (bridge.data?.length ?? 0) === 1, relationshipNeighborhoodLoad: relationshipIds.size === 114 },
  failures,
};
const reportPath = path.join(packetDir, "staging-verification-report.json");
const content = `${JSON.stringify(report, null, 2)}\n`;
if (existsSync(reportPath) && readFileSync(reportPath, "utf8") !== content) throw new Error(`Refusing to overwrite immutable verification report: ${reportPath}`);
if (!existsSync(reportPath)) writeFileSync(reportPath, content, { flag: "wx" });
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
