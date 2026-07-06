import assert from "node:assert/strict";

import { buildAnkleProposalPacket } from "./proposal-builder.ts";
import { curateProposalBatch, summarizeCurationRoutes } from "./intelligent-curator.ts";
import { validateProposalPacket } from "./validator.ts";

const packet = buildAnkleProposalPacket();
const { curated, decisions } = curateProposalBatch(packet.proposals);
const summary = summarizeCurationRoutes(decisions);

assert.ok(packet.proposals.length >= 50, "expected full ankle packet");
assert.ok(summary.AUTO_APPROVED_LOW_RISK > 0, "expected auto-approved low-risk items");
assert.ok(summary.ATTENDING_REVIEW >= 2, "expected attending review for DPs");
assert.ok(summary.HUMAN_REVIEW > 0, "expected human review queue");

for (const p of curated) {
  if (p.proposal_type === "propose_educational_claim" || p.proposal_type === "propose_decision_point") {
    assert.equal(p.metadata?.verified, false);
    assert.notEqual(p.metadata?.content_source, "verified");
  }
}

const validation = validateProposalPacket(packet.pilotKey, curated);
assert.equal(validation.passed, true, validation.issues.map((i) => i.message).join("; "));

const humanPct =
  ((summary.HUMAN_REVIEW + summary.ATTENDING_REVIEW) / curated.length) * 100;
assert.ok(humanPct < 50, `human review should be <50% of workload, got ${humanPct}%`);

console.log("intelligent-curator.test.ts: all assertions passed");
console.log(JSON.stringify({ summary, humanReviewPercent: Math.round(humanPct) }, null, 2));