import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { createServiceRoleClient } from "./kg-automation-common.ts";
import { requireStaging } from "./lib/education/kg-staging-guard.ts";

const root = process.cwd();
const blockerId = "AC_JOINT_PROPOSAL_DRIFT";
const fingerprint = "create|anatomy_structure|ac-joint";
const canonicalLabel = "Acromioclavicular Joint";
const priorLabel = "Ac Joint";
const apply = process.argv.includes("--apply");
const outDir = path.join(root, "reports", "kg-scaling", "blockers", blockerId);
const investigationPath = path.join(outDir, "root-cause-investigation.json");
if (!existsSync(investigationPath)) throw new Error("Root-cause investigation is required");
const investigation = JSON.parse(readFileSync(investigationPath, "utf8"));
if (!investigation.safeAutomaticNormalization || investigation.classification !== "historical_proposal_metadata_drift") {
  throw new Error("Investigation does not authorize automatic normalization");
}

const guard = requireStaging(`${apply ? "resolve" : "dry-run resolve"} ${blockerId}`);
const supabase = createServiceRoleClient();
async function counts() {
  const [entities, relationships] = await Promise.all([
    supabase.from("canonical_entities").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("canonical_relationships").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);
  if (entities.error) throw entities.error;
  if (relationships.error) throw relationships.error;
  return { entities: entities.count ?? 0, relationships: relationships.count ?? 0 };
}

const beforeCounts = await counts();
const canonicalResult = await supabase.from("canonical_entities").select("*").eq("slug", "ac-joint").eq("is_active", true);
if (canonicalResult.error) throw canonicalResult.error;
if ((canonicalResult.data ?? []).length !== 1) throw new Error("Expected exactly one active ac-joint canonical entity");
const canonical = canonicalResult.data![0] as any;
if (canonical.entity_type !== "anatomy_structure" || canonical.preferred_label !== canonicalLabel
  || canonical.metadata?.owner_pilot !== "upper-extremity-trauma-cluster-shared" || canonical.metadata?.region !== "shoulder"
  || canonical.metadata?.created_from_proposal_fingerprint !== fingerprint) {
  throw new Error("Canonical AC-joint identity no longer matches adjudicated state");
}

const proposalResult = await supabase.from("kg_automation_proposals").select("*").eq("proposal_fingerprint", fingerprint).eq("is_active", true);
if (proposalResult.error) throw proposalResult.error;
if ((proposalResult.data ?? []).length !== 1) throw new Error("Expected exactly one active AC-joint semantic proposal");
const proposalBefore = proposalResult.data![0] as any;
if (proposalBefore.proposed_entity_type !== "anatomy_structure" || ![priorLabel, canonicalLabel].includes(proposalBefore.proposed_entity_label)
  || proposalBefore.metadata?.owner_pilot !== "upper-extremity-trauma-cluster-shared"
  || proposalBefore.metadata?.cross_cluster !== "upper-extremity-trauma") {
  throw new Error("Active proposal no longer matches adjudicated historical abbreviation");
}

const membershipResult = await supabase.from("kg_proposal_batch_memberships").select("*").eq("proposal_id", proposalBefore.id);
if (membershipResult.error) throw membershipResult.error;
if ((membershipResult.data ?? []).length !== 1) throw new Error("Expected exactly one AC-joint proposal membership");
const membershipBefore = membershipResult.data![0] as any;
if (membershipBefore.packet_state !== "approved" || membershipBefore.apply_disposition !== "already_applied") throw new Error("Membership is not safely applied");

const resolvedAt = new Date().toISOString();
if (apply && proposalBefore.proposed_entity_label !== canonicalLabel) {
  const update = await supabase.from("kg_automation_proposals").update({
    proposed_entity_label: canonicalLabel,
    metadata: { ...(proposalBefore.metadata ?? {}), identity_resolution: {
      blocker_id: blockerId, classification: "historical_proposal_metadata_drift", resolved_at: resolvedAt,
      prior_proposed_entity_label: priorLabel, canonical_entity_id: canonical.id,
      canonical_preferred_label: canonicalLabel,
      evidence: "reports/kg-scaling/blockers/AC_JOINT_PROPOSAL_DRIFT/root-cause-investigation.json",
    } },
  }).eq("id", proposalBefore.id).eq("proposal_fingerprint", fingerprint);
  if (update.error) throw update.error;
}
const needsMembershipTarget = membershipBefore.canonical_target_table !== "canonical_entities" || membershipBefore.canonical_target_id !== canonical.id;
if (apply && needsMembershipTarget) {
  const update = await supabase.from("kg_proposal_batch_memberships").update({
    canonical_target_table: "canonical_entities", canonical_target_id: canonical.id,
  }).eq("id", membershipBefore.id).eq("packet_state", "approved");
  if (update.error) throw update.error;
}

const [proposalAfterResult, membershipAfterResult, afterCounts] = await Promise.all([
  supabase.from("kg_automation_proposals").select("*").eq("id", proposalBefore.id).single(),
  supabase.from("kg_proposal_batch_memberships").select("*").eq("id", membershipBefore.id).single(),
  counts(),
]);
if (proposalAfterResult.error) throw proposalAfterResult.error;
if (membershipAfterResult.error) throw membershipAfterResult.error;
if (JSON.stringify(beforeCounts) !== JSON.stringify(afterCounts)) throw new Error("Canonical graph changed during metadata-only resolution");
if (apply && proposalAfterResult.data.proposed_entity_label !== canonicalLabel) throw new Error("Proposal label verification failed");
if (apply && (membershipAfterResult.data.canonical_target_table !== "canonical_entities" || membershipAfterResult.data.canonical_target_id !== canonical.id)) throw new Error("Membership target verification failed");

const report = {
  ok: true, generatedAt: resolvedAt, blockerId, operation: apply ? "apply" : "dry_run", guard,
  classification: "historical_proposal_metadata_drift",
  canonicalEntity: { id: canonical.id, slug: canonical.slug, entityType: canonical.entity_type, preferredLabel: canonical.preferred_label, ownerPilot: canonical.metadata?.owner_pilot },
  proposalBefore: { id: proposalBefore.id, label: proposalBefore.proposed_entity_label, reviewStatus: proposalBefore.review_status },
  proposalAfter: { id: proposalAfterResult.data.id, label: proposalAfterResult.data.proposed_entity_label, identityResolution: proposalAfterResult.data.metadata?.identity_resolution ?? null },
  membershipBefore: { id: membershipBefore.id, batchKey: membershipBefore.batch_key, targetTable: membershipBefore.canonical_target_table, targetId: membershipBefore.canonical_target_id },
  membershipAfter: { id: membershipAfterResult.data.id, batchKey: membershipAfterResult.data.batch_key, targetTable: membershipAfterResult.data.canonical_target_table, targetId: membershipAfterResult.data.canonical_target_id },
  canonicalCountsBefore: beforeCounts, canonicalCountsAfter: afterCounts, canonicalRowsModified: 0,
  proposalRowsModified: apply && proposalBefore.proposed_entity_label !== canonicalLabel ? 1 : 0,
  membershipRowsModified: apply && needsMembershipTarget ? 1 : 0,
};
mkdirSync(outDir, { recursive: true });
const reportPath = path.join(outDir, apply ? "resolution-report.json" : "resolution-dry-run-report.json");
if (apply && existsSync(reportPath)) throw new Error(`Refusing to overwrite immutable resolution report: ${reportPath}`);
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, apply ? { flag: "wx" } : undefined);
console.log(JSON.stringify(report, null, 2));
