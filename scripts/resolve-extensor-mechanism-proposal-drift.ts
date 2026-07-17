import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { createServiceRoleClient } from "./kg-automation-common.ts";
import { requireStaging } from "./lib/education/kg-staging-guard.ts";

const root = process.cwd();
const blockerId = "EXTENSOR_MECHANISM_PROPOSAL_DRIFT";
const fingerprint = "create|anatomy_structure|extensor-mechanism";
const expectedCanonicalLabel = "Knee Extensor Mechanism";
const priorProposalLabel = "Extensor Mechanism";
const apply = process.argv.includes("--apply");
const outDir = path.join(root, "reports", "kg-scaling", "blockers", blockerId);
const investigationPath = path.join(outDir, "root-cause-investigation.json");
if (!existsSync(investigationPath)) throw new Error("Root-cause investigation is required before resolution");
const investigation = JSON.parse(readFileSync(investigationPath, "utf8"));
if (!investigation.safeAutomaticNormalization || investigation.classification !== "historical_proposal_metadata_drift") {
  throw new Error("Investigation does not authorize automatic normalization");
}

const guard = requireStaging(`${apply ? "resolve" : "dry-run resolve"} ${blockerId}`);
const supabase = createServiceRoleClient();
for (const table of ["canonical_entities", "canonical_relationships", "kg_automation_proposals", "kg_proposal_batch_memberships"]) {
  const result = await supabase.from(table).select("id").limit(1);
  if (result.error) throw new Error(`Required table ${table}: ${result.error.message}`);
}

async function canonicalCounts() {
  const results = await Promise.all([
    supabase.from("canonical_entities").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("canonical_relationships").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);
  for (const result of results) if (result.error) throw result.error;
  return { entities: results[0].count ?? 0, relationships: results[1].count ?? 0 };
}

const beforeCounts = await canonicalCounts();
const canonicalResult = await supabase.from("canonical_entities")
  .select("*")
  .eq("slug", "extensor-mechanism")
  .eq("is_active", true);
if (canonicalResult.error) throw canonicalResult.error;
if ((canonicalResult.data ?? []).length !== 1) throw new Error(`Expected one active canonical extensor-mechanism row, got ${canonicalResult.data?.length ?? 0}`);
const canonical = canonicalResult.data![0] as any;
if (canonical.entity_type !== "anatomy_structure" || canonical.preferred_label !== expectedCanonicalLabel || canonical.metadata?.region !== "knee" || canonical.metadata?.owner_pilot !== "lower-extremity-trauma-cluster-shared") {
  throw new Error("Canonical identity no longer matches the adjudicated knee extensor mechanism");
}
if (canonical.metadata?.created_from_proposal_fingerprint !== fingerprint) throw new Error("Canonical creation fingerprint mismatch");

const proposalResult = await supabase.from("kg_automation_proposals")
  .select("*")
  .eq("proposal_fingerprint", fingerprint)
  .eq("is_active", true);
if (proposalResult.error) throw proposalResult.error;
if ((proposalResult.data ?? []).length !== 1) throw new Error(`Expected one active semantic proposal, got ${proposalResult.data?.length ?? 0}`);
const proposalBefore = proposalResult.data![0] as any;
if (proposalBefore.proposed_entity_type !== "anatomy_structure" || ![priorProposalLabel, expectedCanonicalLabel].includes(proposalBefore.proposed_entity_label)) {
  throw new Error(`Unexpected proposal identity: ${proposalBefore.proposed_entity_type}/${proposalBefore.proposed_entity_label}`);
}
if (!/knee|quadriceps|patella/i.test(String(proposalBefore.metadata?.description ?? ""))) throw new Error("Proposal metadata lacks knee-specific identity evidence");

const membershipResult = await supabase.from("kg_proposal_batch_memberships")
  .select("*")
  .eq("proposal_id", proposalBefore.id);
if (membershipResult.error) throw membershipResult.error;
if ((membershipResult.data ?? []).length !== 1) throw new Error(`Expected one current legacy membership, got ${membershipResult.data?.length ?? 0}`);
const membershipBefore = membershipResult.data![0] as any;
if (membershipBefore.packet_state !== "approved" || membershipBefore.apply_disposition !== "already_applied") throw new Error("Legacy membership is not in an applied state");

const resolvedAt = new Date().toISOString();
if (apply && proposalBefore.proposed_entity_label !== expectedCanonicalLabel) {
  const update = await supabase.from("kg_automation_proposals").update({
    proposed_entity_label: expectedCanonicalLabel,
    metadata: {
      ...(proposalBefore.metadata ?? {}),
      identity_resolution: {
        blocker_id: blockerId,
        classification: "historical_proposal_metadata_drift",
        resolved_at: resolvedAt,
        prior_proposed_entity_label: priorProposalLabel,
        canonical_entity_id: canonical.id,
        canonical_preferred_label: expectedCanonicalLabel,
        evidence: "reports/kg-scaling/blockers/EXTENSOR_MECHANISM_PROPOSAL_DRIFT/root-cause-investigation.json",
      },
    },
  }).eq("id", proposalBefore.id).eq("proposal_fingerprint", fingerprint);
  if (update.error) throw update.error;
}

if (apply && (membershipBefore.canonical_target_table !== "canonical_entities" || membershipBefore.canonical_target_id !== canonical.id)) {
  const update = await supabase.from("kg_proposal_batch_memberships").update({
    canonical_target_table: "canonical_entities",
    canonical_target_id: canonical.id,
  }).eq("id", membershipBefore.id).eq("packet_state", "approved");
  if (update.error) throw update.error;
}

const proposalAfterResult = await supabase.from("kg_automation_proposals").select("*").eq("id", proposalBefore.id).single();
if (proposalAfterResult.error) throw proposalAfterResult.error;
const membershipAfterResult = await supabase.from("kg_proposal_batch_memberships").select("*").eq("id", membershipBefore.id).single();
if (membershipAfterResult.error) throw membershipAfterResult.error;
const afterCounts = await canonicalCounts();
const proposalAfter = proposalAfterResult.data as any;
const membershipAfter = membershipAfterResult.data as any;
const expectedLabelAfter = apply ? expectedCanonicalLabel : proposalBefore.proposed_entity_label;
if (proposalAfter.proposed_entity_label !== expectedLabelAfter) throw new Error("Proposal label verification failed");
if (apply && (membershipAfter.canonical_target_table !== "canonical_entities" || membershipAfter.canonical_target_id !== canonical.id)) throw new Error("Membership target verification failed");
if (JSON.stringify(beforeCounts) !== JSON.stringify(afterCounts)) throw new Error("Canonical tables changed during metadata-only resolution");

const report = {
  ok: true,
  generatedAt: resolvedAt,
  blockerId,
  operation: apply ? "apply" : "dry_run",
  guard,
  classification: "historical_proposal_metadata_drift",
  canonicalEntity: { id: canonical.id, slug: canonical.slug, entityType: canonical.entity_type, preferredLabel: canonical.preferred_label, ownerPilot: canonical.metadata?.owner_pilot },
  proposalBefore: { id: proposalBefore.id, label: proposalBefore.proposed_entity_label, entityType: proposalBefore.proposed_entity_type, reviewStatus: proposalBefore.review_status, appliedAt: proposalBefore.applied_at },
  proposalAfter: { id: proposalAfter.id, label: proposalAfter.proposed_entity_label, entityType: proposalAfter.proposed_entity_type, reviewStatus: proposalAfter.review_status, appliedAt: proposalAfter.applied_at, identityResolution: proposalAfter.metadata?.identity_resolution ?? null },
  membershipBefore: { id: membershipBefore.id, batchKey: membershipBefore.batch_key, targetTable: membershipBefore.canonical_target_table, targetId: membershipBefore.canonical_target_id, disposition: membershipBefore.apply_disposition },
  membershipAfter: { id: membershipAfter.id, batchKey: membershipAfter.batch_key, targetTable: membershipAfter.canonical_target_table, targetId: membershipAfter.canonical_target_id, disposition: membershipAfter.apply_disposition },
  canonicalCountsBefore: beforeCounts,
  canonicalCountsAfter: afterCounts,
  canonicalRowsModified: 0,
  proposalRowsModified: apply && proposalBefore.proposed_entity_label !== expectedCanonicalLabel ? 1 : 0,
  membershipRowsModified: apply && (membershipBefore.canonical_target_table !== "canonical_entities" || membershipBefore.canonical_target_id !== canonical.id) ? 1 : 0,
  aliasRowsModified: 0,
  note: "The historical generic label is preserved in proposal identity_resolution metadata. No source alias was inserted because the legacy proposal has no source_id.",
};

mkdirSync(outDir, { recursive: true });
const reportPath = path.join(outDir, apply ? "resolution-report.json" : "resolution-dry-run-report.json");
if (apply && existsSync(reportPath)) throw new Error(`Refusing to overwrite immutable resolution report: ${reportPath}`);
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, apply ? { flag: "wx" } : undefined);
console.log(JSON.stringify(report, null, 2));
