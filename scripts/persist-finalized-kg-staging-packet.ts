import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { ProposalRecord } from "./kg-automation-common.ts";
import { createServiceRoleClient } from "./kg-automation-common.ts";
import { semanticMismatch, type ProposalBatchMembership } from "./lib/education/kg-proposal-membership.ts";
import { requireStaging } from "./lib/education/kg-staging-guard.ts";

function arg(name: string): string { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] ?? "" : ""; }
const manifestPath = arg("--manifest");
const explicitPacketPath = arg("--packet");
const packetPath = explicitPacketPath || (manifestPath ? path.join(path.dirname(manifestPath), "proposal-packet.json") : "");
if (!packetPath) throw new Error("Usage: --manifest <proposal-manifest.json> or --packet <proposal-packet.json>");

const guard = requireStaging("persist finalized KG staging packet");
const packet = JSON.parse(readFileSync(packetPath, "utf8")) as { topic: string; pilotKey: string; batchKey: string; packetHash: string; proposals: ProposalRecord[] };
const manifest = manifestPath ? JSON.parse(readFileSync(manifestPath, "utf8")) as { batchKey: string; packetHash: string; semanticGraphHash: string } : null;
if (manifest && (manifest.batchKey !== packet.batchKey || manifest.packetHash !== packet.packetHash)) throw new Error("Manifest/packet mismatch");
if (new Set(packet.proposals.map((item) => item.proposal_fingerprint)).size !== packet.proposals.length) throw new Error("Duplicate packet fingerprint");

const supabase = createServiceRoleClient();
for (const table of ["kg_automation_proposals", "kg_proposal_batch_memberships", "canonical_entities", "canonical_relationships", "curriculum_node_entities"]) {
  const { error } = await supabase.from(table).select("id").limit(1);
  if (error) throw new Error(`Required table ${table}: ${error.message}`);
}

const canonicalCounts = async () => {
  const results = await Promise.all([
    supabase.from("canonical_entities").select("id", { count: "exact", head: true }),
    supabase.from("canonical_relationships").select("id", { count: "exact", head: true }),
    supabase.from("curriculum_node_entities").select("id", { count: "exact", head: true }),
  ]);
  for (const result of results) if (result.error) throw result.error;
  return { entities: results[0].count ?? 0, relationships: results[1].count ?? 0, bridges: results[2].count ?? 0 };
};
const canonicalBefore = await canonicalCounts();
let insertedSemantic = 0, reusedSemantic = 0, insertedMemberships = 0, reusedMemberships = 0;
const reuseOrigins: Record<string, number> = {};

for (const incoming of packet.proposals) {
  const { data: existingRows, error: lookupError } = await supabase.from("kg_automation_proposals").select("*")
    .eq("proposal_fingerprint", incoming.proposal_fingerprint).eq("is_active", true).limit(2);
  if (lookupError) throw lookupError;
  if ((existingRows ?? []).length > 1) throw new Error(`Multiple active semantic proposals: ${incoming.proposal_fingerprint}`);
  let proposal: ProposalRecord & { id: string };
  if (existingRows?.[0]) {
    proposal = existingRows[0] as ProposalRecord & { id: string };
    const mismatch = semanticMismatch(proposal, incoming);
    if (mismatch) throw new Error(`${incoming.proposal_fingerprint}: ${mismatch}`);
    reusedSemantic += 1;
    const origin = String(proposal.metadata?.staging_batch_key ?? proposal.metadata?.pilot ?? "legacy-unattributed");
    reuseOrigins[origin] = (reuseOrigins[origin] ?? 0) + 1;
  } else {
    const { data, error } = await supabase.from("kg_automation_proposals").insert(incoming).select("*").single();
    if (error) throw new Error(`${incoming.proposal_fingerprint}: ${error.message}`);
    proposal = data as ProposalRecord & { id: string };
    insertedSemantic += 1;
  }

  const { data: memberships, error: membershipError } = await supabase.from("kg_proposal_batch_memberships").select("*")
    .eq("proposal_id", proposal.id).eq("batch_key", packet.batchKey).limit(2);
  if (membershipError) throw membershipError;
  if ((memberships ?? []).length > 1) throw new Error(`Duplicate membership: ${incoming.proposal_fingerprint}`);
  const existingMembership = memberships?.[0] as ProposalBatchMembership | undefined;
  if (existingMembership) {
    if (existingMembership.topic_slug !== packet.pilotKey || existingMembership.packet_hash !== packet.packetHash || existingMembership.graph_hash !== (manifest?.semanticGraphHash ?? null) || existingMembership.packet_state !== "approved") {
      throw new Error(`Existing membership provenance mismatch: ${incoming.proposal_fingerprint}`);
    }
    reusedMemberships += 1;
  } else {
    const { error } = await supabase.from("kg_proposal_batch_memberships").insert({
      proposal_id: proposal.id, batch_key: packet.batchKey, topic_slug: packet.pilotKey,
      packet_hash: packet.packetHash, graph_hash: manifest?.semanticGraphHash ?? null,
      packet_state: "approved", apply_disposition: proposal.review_status === "applied" ? "already_applied" : "pending",
    });
    if (error) throw new Error(`${incoming.proposal_fingerprint}: membership: ${error.message}`);
    insertedMemberships += 1;
  }
}

const { data: finalMemberships, error: finalError } = await supabase.from("kg_proposal_batch_memberships")
  .select("proposal_id,packet_state,apply_disposition,proposal:kg_automation_proposals(id,proposal_fingerprint,review_status,is_active)")
  .eq("batch_key", packet.batchKey);
if (finalError) throw finalError;
if ((finalMemberships ?? []).length !== packet.proposals.length) throw new Error(`Membership count mismatch: expected ${packet.proposals.length}, got ${finalMemberships?.length ?? 0}`);
const canonicalAfter = await canonicalCounts();
if (JSON.stringify(canonicalBefore) !== JSON.stringify(canonicalAfter)) throw new Error("Canonical tables changed during persistence");

const reportPath = path.join(path.dirname(packetPath), "persistence-report.json");
const payload = {
  ok: true, guard, batchKey: packet.batchKey, packetHash: packet.packetHash,
  packetSha256: createHash("sha256").update(readFileSync(packetPath)).digest("hex"),
  proposalCount: packet.proposals.length, membershipCount: finalMemberships?.length ?? 0,
  insertedSemantic, reusedSemantic, insertedMemberships, reusedMemberships,
  overwrittenSemantic: 0, lifecycleDowngrades: 0, reuseOrigins,
  canonicalBefore, canonicalAfter,
  appliedSemanticProposals: (finalMemberships ?? []).filter((row: any) => row.proposal?.review_status === "applied").length,
  membershipDispositions: Object.fromEntries(Object.entries(Object.groupBy(finalMemberships ?? [], (row: any) => row.apply_disposition)).map(([key, rows]) => [key, rows?.length ?? 0])),
};
const content = `${JSON.stringify(payload, null, 2)}\n`;
if (!existsSync(reportPath)) {
  writeFileSync(reportPath, content, { flag: "wx" });
  console.log(JSON.stringify(payload, null, 2));
} else {
  const original = JSON.parse(readFileSync(reportPath, "utf8"));
  console.log(JSON.stringify({ ...payload, immutableOriginalReport: original, idempotentReplay: true }, null, 2));
}
