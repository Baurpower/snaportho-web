/** Guarded, batch-aware application and rollback of approved KG pilot proposals. */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import type { ProposalRecord } from "./kg-automation-common.ts";
import { createServiceRoleClient, normalizeLabel, slugify } from "./kg-automation-common.ts";
import { resolveTopic } from "./lib/education/kg-compiler/topic-registry.ts";
import { CANONICAL_ENTITY_TYPES, PREDICATE_REGISTRY, validateRelationshipTriple } from "./lib/education/kg-relationship-registry.ts";
import { requireStaging } from "./lib/education/kg-staging-guard.ts";

type OutcomeKind = "created" | "reused" | "already_present" | "previously_applied" | "canonical_mismatch" | "rejected_by_validation" | "missing_endpoint" | "failed";
type Outcome = { fingerprint: string; proposalId?: string; kind: OutcomeKind; canonicalId?: string; reason?: string; priorState: string; finalState: string };
type BatchProposal = ProposalRecord & { id: string; membership: { id: string; apply_disposition: string } };

function parseArgs(argv: string[]) {
  let topic = "", batchKey = "", reportDir = "", rollback = "", rollbackRequested = false;
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--topic") topic = argv[++i] ?? "";
    else if (argv[i] === "--batch-key") batchKey = argv[++i] ?? "";
    else if (argv[i] === "--report-dir") reportDir = argv[++i] ?? "";
    else if (argv[i] === "--rollback") { rollbackRequested = true; if (argv[i + 1] && !argv[i + 1].startsWith("--")) rollback = argv[++i] ?? ""; }
  }
  return { topic, batchKey, reportDir, rollback: rollback || (rollbackRequested ? batchKey : ""), dryRun: argv.includes("--dry-run"), includeStagingDrafts: argv.includes("--include-staging-drafts") };
}

function hash(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(",")}}`;
  return JSON.stringify(value);
}
function gitState() {
  try { return { commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), dirty: execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim().length > 0 }; }
  catch { return { commit: "unknown", dirty: true }; }
}
function immutableWrite(filePath: string, payload: Record<string, unknown>) {
  const sealed = { ...payload, reportPayloadHash: hash(stable(payload)) };
  const content = `${JSON.stringify(sealed, null, 2)}\n`;
  if (existsSync(filePath)) {
    if (readFileSync(filePath, "utf8") !== content) throw new Error(`Refusing to overwrite immutable report: ${filePath}`);
    return sealed;
  }
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, { flag: "wx" });
  return sealed;
}

async function requireTables(supabase: ReturnType<typeof createServiceRoleClient>, tables: string[]) {
  for (const table of tables) {
    const { error } = await supabase.from(table).select("id").limit(1);
    if (error) throw new Error(`Preflight failed: required table ${table}: ${error.message}`);
  }
}

async function loadApproved(supabase: ReturnType<typeof createServiceRoleClient>, pilotKey: string, batchKey: string): Promise<BatchProposal[]> {
  if (!batchKey) throw new Error("Batch membership apply requires --batch-key");
  const { data, error } = await supabase.from("kg_proposal_batch_memberships")
    .select("id,apply_disposition,proposal:kg_automation_proposals(*)")
    .eq("batch_key", batchKey).eq("topic_slug", pilotKey).eq("packet_state", "approved");
  if (error) throw error;
  return (data ?? []).map((row: any) => ({ ...row.proposal, membership: { id: row.id, apply_disposition: row.apply_disposition } })) as BatchProposal[];
}

export function preflightProposals(proposals: ProposalRecord[], includeDrafts: boolean): string[] {
  const errors: string[] = [];
  const fingerprints = new Set<string>();
  for (const proposal of proposals) {
    if (fingerprints.has(proposal.proposal_fingerprint)) errors.push(`Duplicate fingerprint ${proposal.proposal_fingerprint}`);
    fingerprints.add(proposal.proposal_fingerprint);
    if (proposal.proposal_type === "create_canonical_entity" && !CANONICAL_ENTITY_TYPES.includes(proposal.proposed_entity_type as never)) errors.push(`Unsupported entity type ${proposal.proposed_entity_type}`);
    if (proposal.proposal_type === "add_canonical_relationship" && !PREDICATE_REGISTRY[String(proposal.proposed_predicate)]) errors.push(`Unsupported predicate ${proposal.proposed_predicate}`);
    if (["propose_educational_claim", "propose_decision_point"].includes(proposal.proposal_type) && !includeDrafts) errors.push(`Approved ${proposal.proposal_type} selected during entity/relationship staging proof: ${proposal.proposal_fingerprint}`);
    if (!["create_canonical_entity", "add_canonical_relationship", "link_curriculum_node_to_entity", "propose_educational_claim", "propose_decision_point"].includes(proposal.proposal_type)) errors.push(`Unsupported apply proposal type ${proposal.proposal_type}`);
  }
  return errors;
}

async function markApplied(supabase: ReturnType<typeof createServiceRoleClient>, proposal: BatchProposal, outcome: Outcome): Promise<string | undefined> {
  const now = new Date().toISOString();
  if (proposal.review_status === "approved") {
    const semantic = await supabase.from("kg_automation_proposals").update({ review_status: "applied", applied_at: now }).eq("id", proposal.id).eq("review_status", "approved");
    if (semantic.error) return semantic.error.message;
  }
  const table = proposal.proposal_type === "create_canonical_entity" ? "canonical_entities" : proposal.proposal_type === "add_canonical_relationship" ? "canonical_relationships" : "curriculum_node_entities";
  const disposition = proposal.membership.apply_disposition === "inserted" || outcome.kind === "created" ? "inserted" : proposal.review_status === "applied" ? "already_applied" : "no_op";
  const membership = await supabase.from("kg_proposal_batch_memberships").update({ apply_disposition: disposition, canonical_target_table: table, canonical_target_id: outcome.canonicalId, applied_at: now }).eq("id", proposal.membership.id).eq("packet_state", "approved");
  return membership.error?.message;
}

async function applyBatch(args: ReturnType<typeof parseArgs>) {
  const topic = resolveTopic(args.topic);
  if (!topic) throw new Error(`Unknown topic: ${args.topic}`);
  const guard = requireStaging(`${topic.topicKey} pilot apply-approved`);
  const batchKey = args.batchKey || `${topic.topicKey}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const reportDir = path.resolve(args.reportDir || path.join("reports", "kg-staging", topic.topicKey, batchKey));
  const supabase = createServiceRoleClient();
  await requireTables(supabase, ["kg_automation_proposals", "kg_proposal_batch_memberships", "canonical_entities", "canonical_relationships", "curriculum_node_entities"]);
  const proposals = await loadApproved(supabase, topic.pilotKey, args.batchKey);
  if (proposals.length === 0) throw new Error(`Preflight failed: no approved proposals found for ${topic.pilotKey}${args.batchKey ? ` batch ${args.batchKey}` : ""}`);
  const preflightErrors = preflightProposals(proposals, args.includeStagingDrafts);
  if (preflightErrors.length) throw new Error(`Preflight failed:\n${preflightErrors.join("\n")}`);
  const outcomes: Outcome[] = [];
  const successful = new Set<string>();
  const entityProposals = proposals.filter((p) => p.proposal_type === "create_canonical_entity");
  const relationshipProposals = proposals.filter((p) => p.proposal_type === "add_canonical_relationship");
  const bridgeProposals = proposals.filter((p) => p.proposal_type === "link_curriculum_node_to_entity");

  for (const proposal of entityProposals) {
    const slug = String(proposal.metadata?.slug ?? slugify(String(proposal.proposed_entity_label ?? "")));
    const existing = await supabase.from("canonical_entities").select("id,slug,entity_type,preferred_label,metadata").eq("slug", slug).eq("is_active", true).limit(2);
    if (existing.error) { outcomes.push({ fingerprint: proposal.proposal_fingerprint, proposalId: (proposal as any).id, kind: "failed", reason: existing.error.message, priorState: "approved", finalState: "approved" }); continue; }
    if ((existing.data ?? []).length === 1) { const row = existing.data[0]; if (row.entity_type !== proposal.proposed_entity_type || normalizeLabel(row.preferred_label) !== normalizeLabel(String(proposal.proposed_entity_label))) { outcomes.push({ fingerprint: proposal.proposal_fingerprint, proposalId: proposal.id, kind: "canonical_mismatch", canonicalId: row.id, reason: `Existing ${row.entity_type}/${row.preferred_label} differs from ${proposal.proposed_entity_type}/${proposal.proposed_entity_label}`, priorState: proposal.review_status, finalState: proposal.review_status }); continue; } const createdByBatch = row.metadata?.staging_batch_key === batchKey && row.metadata?.created_from_proposal_fingerprint === proposal.proposal_fingerprint; outcomes.push({ fingerprint: proposal.proposal_fingerprint, proposalId: proposal.id, kind: createdByBatch ? "created" : proposal.review_status === "applied" ? "previously_applied" : "reused", canonicalId: row.id, priorState: proposal.review_status, finalState: args.dryRun ? proposal.review_status : "applied" }); successful.add(proposal.proposal_fingerprint); continue; }
    if ((existing.data ?? []).length > 1) { outcomes.push({ fingerprint: proposal.proposal_fingerprint, proposalId: (proposal as any).id, kind: "failed", reason: `Multiple active entities for slug ${slug}`, priorState: "approved", finalState: "approved" }); continue; }
    if (args.dryRun) { outcomes.push({ fingerprint: proposal.proposal_fingerprint, proposalId: (proposal as any).id, kind: "created", canonicalId: `dry-run:${slug}`, priorState: "approved", finalState: "approved" }); successful.add(proposal.proposal_fingerprint); continue; }
    const insert = await supabase.from("canonical_entities").insert({ entity_type: proposal.proposed_entity_type, preferred_label: proposal.proposed_entity_label, normalized_label: normalizeLabel(String(proposal.proposed_entity_label ?? "")), slug, description: proposal.metadata?.description ?? null, status: "reviewed", review_status: "approved", metadata: { ...proposal.metadata, pilot: topic.pilotKey, staging_batch_key: batchKey, created_from_proposal_fingerprint: proposal.proposal_fingerprint, staging_apply: true, clinical_verification: false }, comments: "Guarded staging apply; not clinical verification.", is_active: true }).select("id").single();
    if (insert.error) outcomes.push({ fingerprint: proposal.proposal_fingerprint, proposalId: (proposal as any).id, kind: "failed", reason: insert.error.message, priorState: "approved", finalState: "approved" });
    else { outcomes.push({ fingerprint: proposal.proposal_fingerprint, proposalId: (proposal as any).id, kind: "created", canonicalId: insert.data.id, priorState: "approved", finalState: "applied" }); successful.add(proposal.proposal_fingerprint); }
  }

  const requiredSlugs = [...new Set([...entityProposals.map((p) => String(p.metadata?.slug ?? "")), ...relationshipProposals.flatMap((p) => [String(p.metadata?.subject_slug ?? ""), String(p.metadata?.object_slug ?? "")]), ...bridgeProposals.map((p) => String(p.metadata?.primary_entity_slug ?? topic.primaryEntitySlug))].filter(Boolean))];
  const slugRows = await supabase.from("canonical_entities").select("id,slug,entity_type").in("slug", requiredSlugs).eq("is_active", true);
  if (slugRows.error) throw slugRows.error;
  const slugMap = new Map<string, { id: string; entity_type: string }>((slugRows.data ?? []).map((row: any) => [row.slug, row]));
  if (args.dryRun) for (const proposal of entityProposals) { const slug = String(proposal.metadata?.slug ?? ""); if (!slugMap.has(slug)) slugMap.set(slug, { id: `dry-run:${slug}`, entity_type: String(proposal.proposed_entity_type) }); }

  for (const proposal of relationshipProposals) {
    const subjectSlug = String(proposal.metadata?.subject_slug ?? ""), objectSlug = String(proposal.metadata?.object_slug ?? ""), predicate = String(proposal.proposed_predicate ?? "");
    const subject = slugMap.get(subjectSlug), object = slugMap.get(objectSlug);
    if (!subject || !object) { outcomes.push({ fingerprint: proposal.proposal_fingerprint, proposalId: (proposal as any).id, kind: "missing_endpoint", reason: `${subjectSlug} -> ${objectSlug}`, priorState: "approved", finalState: "approved" }); continue; }
    const validation = validateRelationshipTriple({ subjectEndpointType: "canonical_entity", subjectEntityType: subject.entity_type || String(proposal.metadata?.subject_entity_type ?? ""), predicate, objectEndpointType: "canonical_entity", objectEntityType: object.entity_type || String(proposal.metadata?.object_entity_type ?? "") });
    if (!validation.valid) { outcomes.push({ fingerprint: proposal.proposal_fingerprint, proposalId: (proposal as any).id, kind: "rejected_by_validation", reason: validation.errors.join("; "), priorState: "approved", finalState: "approved" }); continue; }
    if (args.dryRun && (subject.id.startsWith("dry-run:") || object.id.startsWith("dry-run:"))) { outcomes.push({ fingerprint: proposal.proposal_fingerprint, proposalId: proposal.id, kind: "created", canonicalId: `dry-run:${subjectSlug}|${predicate}|${objectSlug}`, priorState: proposal.review_status, finalState: proposal.review_status }); successful.add(proposal.proposal_fingerprint); continue; }
    const existing = await supabase.from("canonical_relationships").select("id,metadata").eq("subject_entity_type", "canonical_entity").eq("subject_entity_id", subject.id).eq("predicate", predicate).eq("object_entity_type", "canonical_entity").eq("object_entity_id", object.id).eq("is_active", true).limit(2);
    if (existing.error) { outcomes.push({ fingerprint: proposal.proposal_fingerprint, proposalId: (proposal as any).id, kind: "failed", reason: existing.error.message, priorState: "approved", finalState: "approved" }); continue; }
    if ((existing.data ?? []).length === 1) { const row = existing.data[0]; const createdByBatch = row.metadata?.staging_batch_key === batchKey && row.metadata?.created_from_proposal_fingerprint === proposal.proposal_fingerprint; outcomes.push({ fingerprint: proposal.proposal_fingerprint, proposalId: proposal.id, kind: createdByBatch ? "created" : proposal.review_status === "applied" ? "previously_applied" : "already_present", canonicalId: row.id, priorState: proposal.review_status, finalState: args.dryRun ? proposal.review_status : "applied" }); successful.add(proposal.proposal_fingerprint); continue; }
    if ((existing.data ?? []).length > 1) { outcomes.push({ fingerprint: proposal.proposal_fingerprint, proposalId: (proposal as any).id, kind: "failed", reason: "Duplicate active canonical triple", priorState: "approved", finalState: "approved" }); continue; }
    if (args.dryRun) { outcomes.push({ fingerprint: proposal.proposal_fingerprint, proposalId: proposal.id, kind: "created", canonicalId: `dry-run:${subjectSlug}|${predicate}|${objectSlug}`, priorState: proposal.review_status, finalState: proposal.review_status }); successful.add(proposal.proposal_fingerprint); continue; }
    const insert = await supabase.from("canonical_relationships").insert({ subject_entity_type: "canonical_entity", subject_entity_id: subject.id, predicate, object_entity_type: "canonical_entity", object_entity_id: object.id, confidence: proposal.confidence, review_status: "approved", provenance_status: "pending", lifecycle_status: "active", created_by_source: "reviewed", metadata: { ...(proposal.metadata?.relationship_metadata as object ?? {}), staging_batch_key: batchKey, created_from_proposal_fingerprint: proposal.proposal_fingerprint, staging_apply: true, clinical_verification: false }, comments: "Guarded staging apply; provenance pending.", is_active: true }).select("id").single();
    if (insert.error) outcomes.push({ fingerprint: proposal.proposal_fingerprint, proposalId: (proposal as any).id, kind: "failed", reason: insert.error.message, priorState: "approved", finalState: "approved" });
    else { outcomes.push({ fingerprint: proposal.proposal_fingerprint, proposalId: (proposal as any).id, kind: "created", canonicalId: insert.data.id, priorState: "approved", finalState: "applied" }); successful.add(proposal.proposal_fingerprint); }
  }

  for (const proposal of bridgeProposals) {
    const slug = String(proposal.metadata?.primary_entity_slug ?? topic.primaryEntitySlug), entity = slugMap.get(slug);
    const node = await supabase.from("curriculum_nodes").select("id").eq("slug", topic.sources.curriculumNodeSlug).limit(1);
    if (!entity || node.error || !node.data?.[0]) { outcomes.push({ fingerprint: proposal.proposal_fingerprint, proposalId: (proposal as any).id, kind: "missing_endpoint", reason: "Bridge entity or curriculum node missing", priorState: "approved", finalState: "approved" }); continue; }
    if (args.dryRun && entity.id.startsWith("dry-run:")) { outcomes.push({ fingerprint: proposal.proposal_fingerprint, proposalId: proposal.id, kind: "created", canonicalId: "dry-run:bridge", priorState: proposal.review_status, finalState: proposal.review_status }); successful.add(proposal.proposal_fingerprint); continue; }
    const existing = await supabase.from("curriculum_node_entities").select("id,metadata").eq("curriculum_node_id", node.data[0].id).eq("canonical_entity_id", entity.id).eq("relation_type", proposal.proposed_bridge_type ?? "primary_coverage").eq("is_active", true).limit(1);
    if (existing.data?.[0]) { const row = existing.data[0]; const createdByBatch = row.metadata?.staging_batch_key === batchKey && row.metadata?.created_from_proposal_fingerprint === proposal.proposal_fingerprint; outcomes.push({ fingerprint: proposal.proposal_fingerprint, proposalId: proposal.id, kind: createdByBatch ? "created" : proposal.review_status === "applied" ? "previously_applied" : "already_present", canonicalId: row.id, priorState: proposal.review_status, finalState: args.dryRun ? proposal.review_status : "applied" }); successful.add(proposal.proposal_fingerprint); continue; }
    if (args.dryRun) { outcomes.push({ fingerprint: proposal.proposal_fingerprint, proposalId: proposal.id, kind: "created", canonicalId: "dry-run:bridge", priorState: proposal.review_status, finalState: proposal.review_status }); successful.add(proposal.proposal_fingerprint); continue; }
    const insert = await supabase.from("curriculum_node_entities").insert({ curriculum_node_id: node.data[0].id, canonical_entity_id: entity.id, relation_type: proposal.proposed_bridge_type ?? "primary_coverage", confidence: proposal.confidence, review_status: "approved", provenance_status: "pending", metadata: { staging_batch_key: batchKey, created_from_proposal_fingerprint: proposal.proposal_fingerprint, staging_apply: true, clinical_verification: false }, comments: "Guarded staging bridge apply.", is_active: true }).select("id").single();
    if (insert.error) outcomes.push({ fingerprint: proposal.proposal_fingerprint, proposalId: (proposal as any).id, kind: "failed", reason: insert.error.message, priorState: "approved", finalState: "approved" });
    else { outcomes.push({ fingerprint: proposal.proposal_fingerprint, proposalId: (proposal as any).id, kind: "created", canonicalId: insert.data.id, priorState: "approved", finalState: "applied" }); successful.add(proposal.proposal_fingerprint); }
  }

  if (!args.dryRun) for (const proposal of proposals.filter((p) => successful.has(p.proposal_fingerprint))) {
    const outcome = outcomes.find((item) => item.fingerprint === proposal.proposal_fingerprint)!;
    const error = await markApplied(supabase, proposal, outcome);
    if (error) {
      const canonicalOutcome = outcomes.find((item) => item.fingerprint === proposal.proposal_fingerprint);
      if (canonicalOutcome) canonicalOutcome.finalState = "approved";
      outcomes.push({ fingerprint: proposal.proposal_fingerprint, proposalId: (proposal as any).id, kind: "failed", reason: `Canonical state exists but proposal transition failed: ${error}`, priorState: "approved", finalState: "approved" });
    }
  }
  const failures = outcomes.filter((item) => ["failed", "missing_endpoint", "rejected_by_validation", "canonical_mismatch"].includes(item.kind));
  const manifestPath = path.join(reportDir, "proposal-manifest.json"), packetPath = path.join(reportDir, "proposal-packet.json");
  const payload = { operation: "apply", success: failures.length === 0, partialFailure: !args.dryRun && failures.length > 0, topicKey: topic.topicKey, pilotKey: topic.pilotKey, batchKey, dryRun: args.dryRun, guard, git: gitState(), proposalManifestHash: existsSync(manifestPath) ? hash(readFileSync(manifestPath, "utf8")) : null, proposalPacketHash: existsSync(packetPath) ? hash(readFileSync(packetPath, "utf8")) : null, selectedProposals: proposals.map((p: any) => ({ id: p.id, fingerprint: p.proposal_fingerprint, priorState: p.review_status })), outcomes, mutationCounts: Object.fromEntries(Object.entries(Object.groupBy(outcomes, (item) => item.kind)).map(([key, values]) => [key, values?.length ?? 0])), rollbackCommand: `KG_TARGET_ENV=staging npm run kg:pilot:apply-approved -- --topic ${topic.topicKey} --rollback ${batchKey} --dry-run` };
  const report = immutableWrite(path.join(reportDir, args.dryRun ? "apply-dry-run-report.json" : "apply-report.json"), payload);
  console.log(JSON.stringify(report, null, 2));
  if (failures.length) process.exitCode = 1;
}

async function rollbackBatch(args: ReturnType<typeof parseArgs>) {
  const topic = resolveTopic(args.topic); if (!topic) throw new Error(`Unknown topic: ${args.topic}`);
  const guard = requireStaging(`${topic.topicKey} pilot rollback`), batchKey = args.rollback;
  const reportDir = path.resolve(args.reportDir || path.join("reports", "kg-staging", topic.topicKey, batchKey));
  const supabase = createServiceRoleClient(); await requireTables(supabase, ["kg_automation_proposals", "kg_proposal_batch_memberships", "canonical_entities", "canonical_relationships", "curriculum_node_entities"]);
  const membershipResult = await supabase.from("kg_proposal_batch_memberships").select("id,proposal_id,apply_disposition,canonical_target_table,canonical_target_id,proposal:kg_automation_proposals(id,proposal_fingerprint)").eq("batch_key", batchKey);
  if (membershipResult.error) throw membershipResult.error;
  const memberships = membershipResult.data ?? [];
  const inserted = memberships.filter((row: any) => row.apply_disposition === "inserted" && row.canonical_target_id);
  const relationshipIds = inserted.filter((row: any) => row.canonical_target_table === "canonical_relationships").map((row: any) => row.canonical_target_id);
  const bridgeIds = inserted.filter((row: any) => row.canonical_target_table === "curriculum_node_entities").map((row: any) => row.canonical_target_id);
  const entityIds = inserted.filter((row: any) => row.canonical_target_table === "canonical_entities").map((row: any) => row.canonical_target_id);
  const entityOutcomes: Array<{ id: string; action: string; reason?: string }> = [];
  for (const id of entityIds) {
    const refs = await supabase.from("canonical_relationships").select("id").or(`subject_entity_id.eq.${id},object_entity_id.eq.${id}`).eq("is_active", true);
    if (refs.error) throw refs.error;
    const external = (refs.data ?? []).filter((row: any) => !relationshipIds.includes(row.id));
    entityOutcomes.push(external.length ? { id, action: "preserve", reason: `${external.length} active relationship(s) not inserted by ${batchKey}` } : { id, action: "deactivate" });
  }
  if (!args.dryRun) {
    const now = new Date().toISOString();
    if (relationshipIds.length) { const result = await supabase.from("canonical_relationships").update({ is_active: false, lifecycle_status: "deprecated", deprecated_at: now }).in("id", relationshipIds); if (result.error) throw result.error; }
    if (bridgeIds.length) { const result = await supabase.from("curriculum_node_entities").update({ is_active: false, deprecated_at: now }).in("id", bridgeIds); if (result.error) throw result.error; }
    const deactivatedEntityIds = entityOutcomes.filter((item) => item.action === "deactivate").map((item) => item.id);
    if (deactivatedEntityIds.length) { const result = await supabase.from("canonical_entities").update({ is_active: false, status: "deprecated", deprecated_at: now }).in("id", deactivatedEntityIds); if (result.error) throw result.error; }
    for (const membership of memberships as any[]) {
      const other = await supabase.from("kg_proposal_batch_memberships").select("id").eq("proposal_id", membership.proposal_id).neq("batch_key", batchKey).in("apply_disposition", ["inserted", "updated", "merged", "already_applied", "no_op"]).limit(1);
      if (other.error) throw other.error;
      if ((other.data ?? []).length === 0 && membership.apply_disposition === "inserted") {
        const semantic = await supabase.from("kg_automation_proposals").update({ review_status: "approved", applied_at: null }).eq("id", membership.proposal_id).eq("review_status", "applied");
        if (semantic.error) throw semantic.error;
      }
    }
    const membershipUpdate = await supabase.from("kg_proposal_batch_memberships").update({ apply_disposition: "rolled_back" }).eq("batch_key", batchKey);
    if (membershipUpdate.error) throw membershipUpdate.error;
  }
  const alreadyRolledBack = memberships.length > 0 && memberships.every((row: any) => row.apply_disposition === "rolled_back");
  const payload = { operation: "rollback", success: true, alreadyRolledBack, topicKey: topic.topicKey, pilotKey: topic.pilotKey, batchKey, dryRun: args.dryRun, guard, git: gitState(), relationships: relationshipIds, bridges: bridgeIds, entities: entityOutcomes, memberships: memberships.length, reusedRowsAffected: 0 };
  const report = immutableWrite(path.join(reportDir, args.dryRun ? "rollback-dry-run-report.json" : "rollback-report.json"), payload);
  console.log(JSON.stringify(report, null, 2));
}

async function main() { const args = parseArgs(process.argv); if (!args.topic) throw new Error("--topic is required"); if (args.rollback) await rollbackBatch(args); else await applyBatch(args); }
if (process.argv[1]?.endsWith("apply-pilot-approved.ts")) main().catch((error) => { console.error(error); process.exitCode = 1; });
