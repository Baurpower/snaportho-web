import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { parseCsv } from "./lib/education/review-csv.ts";

const DEFAULT_INPUT = "reports/educational-content-layer/anki-launch-foundation/patellar-instability-review/direct-mapping-review.csv";
const ENTITY_ID = "1ad8280b-74e5-416c-b8fb-06c7d9cc0d0a";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/i;
const ROLES = new Set(["tests", "teaches", "explains", "demonstrates", "broadly_related"]);
const DECISIONS = new Set(["approved", "rejected", "needs_changes"]);

function main() {
  const inputArg = process.argv.find((value) => value.startsWith("--input="));
  const outArg = process.argv.find((value) => value.startsWith("--out="));
  const inputPath = path.resolve(inputArg?.slice(8) || DEFAULT_INPUT);
  const outPath = path.resolve(outArg?.slice(6) || path.join(path.dirname(inputPath), "validated-direct-review-assertions.json"));
  if (!existsSync(inputPath)) throw new Error(`Direct-review packet not found: ${inputPath}`);
  const rows = parseCsv(readFileSync(inputPath, "utf8"));
  const errors: string[] = [];
  const required = ["resourceType", "sourceResourceId", "entityLinkId", "canonicalEntityId", "mappingRole", "reviewerDecision", "reviewerUserId", "reviewedAt", "reviewedConfidence", "safeNotes", "evidenceHashes"];
  const headers = new Set(Object.keys(rows[0] ?? {}));
  for (const header of required) if (!headers.has(header)) errors.push(`missing column ${header}`);
  if (rows.length !== 34) errors.push(`expected 34 mappings; found ${rows.length}`);
  if (rows.filter((row) => row.resourceType === "orthobullets_question").length !== 30) errors.push("expected 30 question mappings");
  if (rows.filter((row) => row.resourceType === "anki_card").length !== 4) errors.push("expected 4 card mappings");
  const seenLinks = new Set<string>();
  const assertions = rows.map((row, index) => {
    const label = `row ${index + 2} (${row.resourceType || "unknown"}:${row.sourceResourceId || "unknown"})`;
    if (!['orthobullets_question', 'anki_card'].includes(row.resourceType)) errors.push(`${label}: invalid resourceType`);
    if (!UUID.test(row.entityLinkId)) errors.push(`${label}: entityLinkId must be a UUID`);
    if (seenLinks.has(row.entityLinkId)) errors.push(`${label}: duplicate entityLinkId`);
    seenLinks.add(row.entityLinkId);
    if (row.canonicalEntityId !== ENTITY_ID) errors.push(`${label}: canonicalEntityId is outside the fixed cohort`);
    if (!ROLES.has(row.mappingRole)) errors.push(`${label}: mappingRole is incomplete or invalid`);
    if (!DECISIONS.has(row.reviewerDecision)) errors.push(`${label}: reviewerDecision is incomplete or invalid`);
    if (!UUID.test(row.reviewerUserId)) errors.push(`${label}: reviewerUserId must be a UUID`);
    if (!row.reviewedAt || Number.isNaN(Date.parse(row.reviewedAt))) errors.push(`${label}: reviewedAt must be an ISO timestamp`);
    const confidence = Number(row.reviewedConfidence);
    if (!row.reviewedConfidence || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) errors.push(`${label}: reviewedConfidence must be between 0 and 1`);
    if (row.safeNotes.length > 1000) errors.push(`${label}: safeNotes exceeds 1000 characters`);
    const evidenceHashes = row.evidenceHashes.split("|").map((value) => value.trim()).filter(Boolean);
    if (evidenceHashes.some((hash) => !SHA256.test(hash))) errors.push(`${label}: evidenceHashes must be pipe-delimited SHA-256 values`);
    if (row.resourceType === "orthobullets_question" && row.mappingRole !== "tests" && row.reviewerDecision === "approved") {
      errors.push(`${label}: an approved pilot question must use role tests`);
    }
    return {
      question_link_id: row.resourceType === "orthobullets_question" ? row.entityLinkId : null,
      card_link_id: row.resourceType === "anki_card" ? row.entityLinkId : null,
      source_resource_id: row.sourceResourceId,
      canonical_entity_id: row.canonicalEntityId,
      mapping_role: row.mappingRole,
      reviewer_decision: row.reviewerDecision,
      reviewer_user_id: row.reviewerUserId,
      reviewed_at: row.reviewedAt,
      confidence,
      provenance_method: "direct_human_review",
      safe_notes: row.safeNotes || null,
      evidence_hashes: evidenceHashes,
      metadata: { packet: "patellar_instability_v1" },
    };
  });
  if (errors.length) throw new Error(`Direct-review packet is incomplete or invalid (${errors.length} issue${errors.length === 1 ? "" : "s"}):\n- ${errors.join("\n- ")}`);

  const approved = assertions.filter((row) => row.reviewer_decision === "approved");
  const eligible = approved.filter((row) => row.confidence >= 0.95 && row.mapping_role !== "broadly_related");
  const result = {
    generatedAt: new Date().toISOString(),
    inputPath,
    complete: true,
    mappingCount: assertions.length,
    approvedCount: approved.length,
    pilotEligibleCount: eligible.length,
    questionStatus: { reviewed: assertions.filter((row) => row.question_link_id).length, eligible: eligible.filter((row) => row.question_link_id).length, expected: 30 },
    cardStatus: { reviewed: assertions.filter((row) => row.card_link_id).length, eligible: eligible.filter((row) => row.card_link_id).length, expected: 4 },
    assertions,
  };
  writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n", "utf8");
  process.stdout.write(JSON.stringify({ outPath, mappingCount: result.mappingCount, approvedCount: result.approvedCount, pilotEligibleCount: result.pilotEligibleCount }, null, 2) + "\n");
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
