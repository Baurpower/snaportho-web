import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";

import { requireStaging } from "./lib/education/kg-staging-guard.ts";

type ReviewItem = {
  proposedEntityId: string;
  entityType: string;
  preferredLabel: string;
  normalizedLabel: string;
  confidence: number;
  derivation: string;
  sourceCards: Array<{ canonicalCardId: string; rawClozeAnswer: string }>;
  claimIds: string[];
  possibleCanonicalDuplicates: Array<{ canonicalEntityId: string; preferredLabel: string; matchReason: string }>;
  possibleProposedDuplicates: Array<{ otherProposedEntityId: string; otherPreferredLabel: string; reason: string; similarity: number }>;
  recommendedAction: "approve_new_entity" | "add_alias_to_existing" | "merge_with_existing" | "needs_review";
  recommendationReasons: string[];
};
type ReviewPacket = { contractVersion: string; runId: string; mode: string; items: ReviewItem[] };

function requiredArg(name: string): string {
  const value = process.argv.find((argument) => argument.startsWith(`${name}=`))?.slice(name.length + 1);
  if (!value) throw new Error(`missing_required_argument:${name}`);
  return value;
}
function envFile(file: string): Record<string, string> {
  return Object.fromEntries(readFileSync(file, "utf8").split(/\r?\n/).flatMap((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return [];
    const index = trimmed.indexOf("=");
    return [[trimmed.slice(0, index).trim(), trimmed.slice(index + 1).trim().replace(/^['\"]|['\"]$/g, "")]];
  }));
}
function fingerprint(runId: string, proposedEntityId: string): string {
  return createHash("sha256").update(`card-claim-ontology-review|${runId}|${proposedEntityId}`).digest("hex");
}

if (!process.argv.includes("--apply")) throw new Error("pass_--apply_to_import_review_only_proposals");
const inputPath = requiredArg("--input");
const guard = requireStaging("import card-claim ontology review proposals");
const packet = JSON.parse(readFileSync(inputPath, "utf8")) as ReviewPacket;
if (packet.contractVersion !== "snaportho-ontology-review-packet.v1" || packet.mode !== "live") throw new Error("unsupported_review_packet");
if (packet.items.length === 0 || new Set(packet.items.map((item) => item.proposedEntityId)).size !== packet.items.length) throw new Error("invalid_review_packet_items");
for (const item of packet.items) {
  if (!item.preferredLabel.trim() || !item.normalizedLabel.trim() || !item.sourceCards.length || !item.claimIds.length) {
    throw new Error(`invalid_review_item:${item.proposedEntityId}`);
  }
}

const env = { ...envFile(".env.local"), ...process.env };
if (!env.DATABASE_URL) throw new Error("DATABASE_URL required");
const db = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false }, application_name: "card_claim_review_proposal_import" });
await db.connect();
try {
  await db.query("begin");
  const before = await db.query("select count(*)::int as count from public.canonical_entities");
  const records = packet.items.map((item) => {
    const proposalFingerprint = fingerprint(packet.runId, item.proposedEntityId);
    const aliasTarget = item.recommendedAction === "add_alias_to_existing" ? item.possibleCanonicalDuplicates[0]?.canonicalEntityId ?? null : null;
    if (item.recommendedAction === "add_alias_to_existing" && !aliasTarget) throw new Error(`alias_recommendation_without_target:${item.proposedEntityId}`);
    const proposalType = aliasTarget ? "add_entity_alias" : "create_canonical_entity";
    const metadata = {
      card_claim_review_run_id: packet.runId,
      card_claim_proposed_entity_id: item.proposedEntityId,
      normalized_label: item.normalizedLabel,
      derivation: item.derivation,
      source_cards: item.sourceCards,
      claim_ids: item.claimIds,
      recommendation: item.recommendedAction,
      recommendation_reasons: item.recommendationReasons,
      possible_canonical_duplicates: item.possibleCanonicalDuplicates,
      possible_proposed_duplicates: item.possibleProposedDuplicates,
      review_boundary: "review_only_no_canonical_mutation",
    };
    return {
      proposal_fingerprint: proposalFingerprint,
      proposal_type: proposalType,
      source_signal_ids: item.sourceCards.map((card) => card.canonicalCardId),
      proposed_entity_type: item.entityType,
      proposed_entity_label: item.preferredLabel,
      proposed_existing_entity_id: aliasTarget,
      proposed_alias: aliasTarget ? item.preferredLabel : null,
      confidence: Math.min(item.confidence, 0.7),
      evidence_summary: `Candidate ${item.preferredLabel}; ${item.sourceCards.length} source card(s), ${item.claimIds.length} claim(s).`,
      supporting_card_count: item.sourceCards.length,
      conflict_count: item.possibleCanonicalDuplicates.length + item.possibleProposedDuplicates.length,
      metadata,
    };
  });
  const insertedResult = await db.query(`
    insert into public.kg_automation_proposals (
      proposal_fingerprint, proposal_type, source_signal_type, source_signal_ids,
      specialty_id, proposed_entity_type, proposed_entity_label, proposed_existing_entity_id,
      proposed_alias, confidence, confidence_tier, confidence_reason,
      evidence_summary, supporting_card_count, supporting_question_count,
      supporting_curriculum_node_count, supporting_source_count, conflict_count,
      review_status, metadata, is_active
    )
    select proposal_fingerprint, proposal_type, 'canonical_card', source_signal_ids,
      null, proposed_entity_type, proposed_entity_label, proposed_existing_entity_id,
      proposed_alias, confidence, 'medium',
      'Cloze extraction confidence only; clinical validity and entity type require reviewer adjudication.',
      evidence_summary, supporting_card_count, 0, 0, 1, conflict_count,
      'needs_review', metadata, true
    from jsonb_to_recordset($1::jsonb) as input(
      proposal_fingerprint text, proposal_type text, source_signal_ids text[],
      proposed_entity_type text, proposed_entity_label text, proposed_existing_entity_id uuid,
      proposed_alias text, confidence numeric, evidence_summary text, supporting_card_count integer,
      conflict_count integer, metadata jsonb
    )
    on conflict (proposal_fingerprint) where is_active do nothing
    returning id
  `, [JSON.stringify(records)]);
  const inserted = insertedResult.rowCount ?? 0;
  const reused = packet.items.length - inserted;
  const after = await db.query("select count(*)::int as count from public.canonical_entities");
  if (before.rows[0]?.count !== after.rows[0]?.count) throw new Error("canonical_entity_count_changed_during_review_import");
  const imported = await db.query(`
    select count(*)::int as count,
      count(*) filter (where review_status in ('needs_review', 'approved', 'rejected', 'applied'))::int as valid_status_count
    from public.kg_automation_proposals
    where is_active and metadata->>'card_claim_review_run_id' = $1
  `, [packet.runId]);
  if (imported.rows[0]?.count !== packet.items.length || imported.rows[0]?.valid_status_count !== packet.items.length) {
    throw new Error(`review_import_count_mismatch:${JSON.stringify(imported.rows[0])}`);
  }
  await db.query("commit");
  console.log(JSON.stringify({ applied: true, guard, runId: packet.runId, imported: packet.items.length, inserted, reused, canonicalEntitiesBefore: before.rows[0]?.count, canonicalEntitiesAfter: after.rows[0]?.count }, null, 2));
} catch (error) {
  await db.query("rollback").catch(() => undefined);
  throw error;
} finally {
  await db.end();
}
