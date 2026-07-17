import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { createServiceRoleClient } from "./kg-automation-common.ts";
import { requireStaging } from "./lib/education/kg-staging-guard.ts";

const root = process.cwd();
const fingerprint = "create|anatomy_structure|extensor-mechanism";
const blockerId = "EXTENSOR_MECHANISM_PROPOSAL_DRIFT";
const outDir = path.join(root, "reports", "kg-scaling", "blockers", blockerId);

function readJson(filePath: string): any {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

const guard = requireStaging(`investigate ${blockerId}`);
const supabase = createServiceRoleClient();

for (const table of ["canonical_entities", "canonical_relationships", "source_aliases", "kg_automation_proposals", "kg_proposal_batch_memberships"]) {
  const result = await supabase.from(table).select("id").limit(1);
  if (result.error) throw new Error(`Required table ${table}: ${result.error.message}`);
}

const canonicalResult = await supabase.from("canonical_entities")
  .select("*")
  .or("slug.eq.extensor-mechanism,preferred_label.ilike.%extensor%mechanism%")
  .eq("is_active", true);
if (canonicalResult.error) throw canonicalResult.error;
const canonicalCandidates = canonicalResult.data ?? [];
const target = canonicalCandidates.filter((row: any) => row.slug === "extensor-mechanism");

const proposalResult = await supabase.from("kg_automation_proposals")
  .select("*")
  .eq("proposal_fingerprint", fingerprint);
if (proposalResult.error) throw proposalResult.error;
const proposals = proposalResult.data ?? [];
const activeProposals = proposals.filter((row: any) => row.is_active);

const proposalIds = proposals.map((row: any) => row.id);
const membershipResult = proposalIds.length
  ? await supabase.from("kg_proposal_batch_memberships")
      .select("*")
      .in("proposal_id", proposalIds)
      .order("included_at", { ascending: true })
  : { data: [], error: null };
if (membershipResult.error) throw membershipResult.error;
const memberships = membershipResult.data ?? [];

const targetIds = target.map((row: any) => row.id);
const aliasResult = targetIds.length
  ? await supabase.from("source_aliases")
      .select("*")
      .eq("entity_type", "canonical_entity")
      .in("entity_id", targetIds)
      .eq("is_active", true)
  : { data: [], error: null };
if (aliasResult.error) throw aliasResult.error;
const aliases = aliasResult.data ?? [];

const relationshipResult = targetIds.length
  ? await supabase.from("canonical_relationships")
      .select("*")
      .or(targetIds.flatMap((id: string) => [`subject_entity_id.eq.${id}`, `object_entity_id.eq.${id}`]).join(","))
      .eq("is_active", true)
  : { data: [], error: null };
if (relationshipResult.error) throw relationshipResult.error;
const relationships = relationshipResult.data ?? [];
const endpointIds = [...new Set(relationships.flatMap((row: any) => [row.subject_entity_id, row.object_entity_id]).filter(Boolean))];
const endpointResult = endpointIds.length
  ? await supabase.from("canonical_entities").select("id,slug,entity_type,preferred_label,is_active").in("id", endpointIds)
  : { data: [], error: null };
if (endpointResult.error) throw endpointResult.error;
const endpointById = new Map((endpointResult.data ?? []).map((row: any) => [row.id, row]));
const relationshipContext = relationships.map((row: any) => ({
  id: row.id,
  subject: endpointById.get(row.subject_entity_id) ?? { id: row.subject_entity_id, endpointType: row.subject_entity_type },
  predicate: row.predicate,
  object: endpointById.get(row.object_entity_id) ?? { id: row.object_entity_id, endpointType: row.object_entity_type },
  reviewStatus: row.review_status,
  provenanceStatus: row.provenance_status,
  metadata: row.metadata,
}));

const pilotDir = path.join(root, "reports", "kg-pilots");
const localPackets: Array<Record<string, unknown>> = [];
for (const name of readdirSync(pilotDir)) {
  if (!name.endsWith("-curated-proposals.json")) continue;
  const filePath = path.join(pilotDir, name);
  const payload = readJson(filePath);
  const matches = (payload.proposals ?? []).filter((proposal: any) => proposal.proposal_fingerprint === fingerprint);
  for (const proposal of matches) {
    localPackets.push({
      file: path.relative(root, filePath),
      topic: name.replace(/-curated-proposals\.json$/, ""),
      label: proposal.proposed_entity_label,
      entityType: proposal.proposed_entity_type,
      slug: proposal.metadata?.slug,
      reviewStatus: proposal.review_status,
      reviewedBy: proposal.reviewed_by,
      reviewedAt: proposal.reviewed_at,
      ownerPilot: proposal.metadata?.owner_pilot,
      packetPilot: proposal.metadata?.pilot,
      sharedReference: proposal.metadata?.shared_reference,
      description: proposal.metadata?.description,
      region: proposal.metadata?.region,
      sourceNeighborhood: proposal.metadata?.source_neighborhood,
    });
  }
}

const blockedTopics = readdirSync(path.join(root, "reports", "kg-verticals"), { withFileTypes: true })
  .filter((item) => item.isDirectory())
  .map((item) => ({
    topic: item.name,
    reportPath: path.join(root, "reports", "kg-verticals", item.name, "strict-db-verification-blocked.json"),
  }))
  .filter((item) => existsSync(item.reportPath))
  .filter((item) => (readJson(item.reportPath).discrepancies ?? []).some((discrepancy: any) => discrepancy.fingerprint === fingerprint));

const uniqueLocalShapes = [...new Set(localPackets.map((item) => JSON.stringify({ label: item.label, entityType: item.entityType, slug: item.slug })))].map((item) => JSON.parse(item));
const permittedHistoricalLabels = new Set(["Extensor Mechanism", "Knee Extensor Mechanism"]);
const allPacketShapesResolveToOneKneeIdentity = localPackets.length > 0 && localPackets.every((item) =>
  item.entityType === "anatomy_structure"
  && item.slug === "extensor-mechanism"
  && permittedHistoricalLabels.has(String(item.label))
  && (item.label === "Knee Extensor Mechanism" || /knee|quadriceps|patella/i.test(String(item.description ?? "")))
);
const kneeContextSlugs = new Set(["quadriceps-tendon", "patella", "patellar-tendon", "knee-joint", "total-knee-arthroplasty"]);
const kneeContextRelationships = relationshipContext.filter((item: any) => kneeContextSlugs.has(item.subject?.slug) || kneeContextSlugs.has(item.object?.slug));

const findings = {
  singleCanonicalTarget: target.length === 1,
  canonicalTargetIsKneeSpecific: target.length === 1 && target[0].entity_type === "anatomy_structure" && target[0].preferred_label === "Knee Extensor Mechanism",
  singleActiveSemanticProposal: activeProposals.length === 1,
  activeProposalUsesStaleGenericLabel: activeProposals.length === 1 && activeProposals[0].proposed_entity_type === "anatomy_structure" && activeProposals[0].proposed_entity_label === "Extensor Mechanism",
  allPacketShapesResolveToOneKneeIdentity,
  kneeSpecificRelationshipContextPresent: kneeContextRelationships.length > 0,
  competingCanonicalRowsWithSameSlug: Math.max(0, target.length - 1),
  relatedButDistinctCanonicalRows: canonicalCandidates.filter((row: any) => row.slug !== "extensor-mechanism").map((row: any) => ({ id: row.id, slug: row.slug, entityType: row.entity_type, label: row.preferred_label })),
  membershipCount: memberships.length,
  blockedNeighborhoodCount: blockedTopics.length,
};

const safeAutomaticNormalization = Object.entries({
  singleCanonicalTarget: findings.singleCanonicalTarget,
  canonicalTargetIsKneeSpecific: findings.canonicalTargetIsKneeSpecific,
  singleActiveSemanticProposal: findings.singleActiveSemanticProposal,
  activeProposalUsesStaleGenericLabel: findings.activeProposalUsesStaleGenericLabel,
  allPacketShapesResolveToOneKneeIdentity: findings.allPacketShapesResolveToOneKneeIdentity,
  kneeSpecificRelationshipContextPresent: findings.kneeSpecificRelationshipContextPresent,
  noCompetingCanonicalRowsWithSameSlug: findings.competingCanonicalRowsWithSameSlug === 0,
}).every(([, value]) => value);

const report = {
  generatedAt: new Date().toISOString(),
  blockerId,
  guard,
  fingerprint,
  classification: safeAutomaticNormalization ? "historical_proposal_metadata_drift" : "identity_ambiguity_requires_review",
  safeAutomaticNormalization,
  findings,
  canonicalCandidates,
  activeSemanticProposals: activeProposals,
  inactiveSemanticProposals: proposals.filter((row: any) => !row.is_active),
  memberships,
  aliases,
  relationshipContext,
  kneeContextRelationships,
  localPacketSummary: {
    references: localPackets.length,
    uniqueShapes: uniqueLocalShapes,
    packets: localPackets,
  },
  blockedNeighborhoods: blockedTopics.map((item) => item.topic).sort(),
  reviewHistory: activeProposals.map((row: any) => ({
    id: row.id,
    reviewStatus: row.review_status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewerNotes: row.reviewer_notes,
    appliedAt: row.applied_at,
  })),
  recommendedResolution: safeAutomaticNormalization
    ? "Normalize only the active semantic proposal label to Knee Extensor Mechanism; preserve the original label in resolution metadata; do not alter or merge canonical entities."
    : "Route the competing identities to a clinical identity curator before mutation.",
};

mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "root-cause-investigation.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  blockerId,
  classification: report.classification,
  safeAutomaticNormalization,
  canonicalTargets: target.length,
  activeProposals: activeProposals.length,
  memberships: memberships.length,
  localPacketReferences: localPackets.length,
  uniqueLocalShapes,
  kneeContextRelationships: kneeContextRelationships.length,
  blockedNeighborhoods: blockedTopics.length,
}, null, 2));
