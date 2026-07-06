import assert from "node:assert/strict";

import { validateAtomicity } from "./claim-atomicity.ts";
import { classifyClaimType, parseSectionHint } from "./claim-type-classifier.ts";
import { buildEvidencePacket } from "../../kg-evidence/evidence-packet-builder.ts";
import { ClaimBuilderAgent } from "../agents/claim-builder.ts";
import { analyzeGaps } from "../../kg-compiler/gap-analyzer.ts";
import { resolveTopic } from "../../kg-compiler/topic-registry.ts";
import { buildEvidenceAgentContext } from "../../kg-evidence/evidence-context.ts";
import { buildWorkAssignmentsFromGaps } from "../work-assignment.ts";

const mgmt = validateAtomicity(
  "Stable isolated fractures versus unstable patterns requiring fixation"
);
assert.equal(mgmt.isManagementLogic, true);
assert.equal(mgmt.suggestDecisionPoint, true);

const atomic = validateAtomicity("The ankle ring concept links malleoli and syndesmosis.");
assert.equal(atomic.atomic, true);

const q = classifyClaimType("What makes the fracture unstable?", "fast.pimpQuestions");
assert.equal(q, "reject_question");

const board = classifyClaimType(
  "A deltoid injury can make an isolated fibula fracture unstable",
  "deep.boardPearls"
);
assert.equal(board, "board_trap");

const topic = resolveTopic("ankle-fracture")!;
const { packet } = await buildEvidencePacket({ topic: "ankle-fracture" });
const snapshot = topic.loadSnapshot();
const proposals = await topic.buildProposals();
const gaps = analyzeGaps(snapshot, proposals).filter((g) => g.kind === "missing_claim");
const assignments = buildWorkAssignmentsFromGaps(gaps);
const claimAssignment = assignments.find((a) => a.assignedAgentId === "claim-builder");
assert.ok(claimAssignment, "claim-builder assignment expected");

const agent = new ClaimBuilderAgent();
const evidenceContext = buildEvidenceAgentContext(packet, claimAssignment!);
const result = await agent.execute(
  {
    neighborhood: snapshot,
    existingProposals: proposals,
    gaps,
    evidencePackets: [],
    knowledgeEvidencePacket: packet,
    evidenceContext,
    compiler: {
      topicKey: topic.topicKey,
      pilotKey: topic.pilotKey,
      displayName: topic.displayName,
      primaryEntitySlug: topic.primaryEntitySlug,
      targetMaturityLevel: topic.targetMaturityLevel,
      compilerVersion: "1.0.0",
      frameworkVersion: "1.0.0",
      ontologyVersion: "2026-07-05",
      generatedAt: new Date().toISOString(),
    },
  },
  claimAssignment!
);

assert.equal(result.status, "completed");
assert.ok(result.rawProposals.length > 0, "expected evidence-generated claims");
for (const p of result.rawProposals) {
  assert.equal(p.metadata?.verified, false);
  assert.equal(p.metadata?.content_source, "generated_draft");
  const ids = p.metadata?.evidence_item_ids as string[];
  assert.ok(Array.isArray(ids) && ids.length > 0, "every claim must cite evidenceItemIds");
}
assert.ok(
  result.auditTrail.entries.some((e) => e.action === "evidence_packet_bound"),
  "audit trail must bind evidence"
);

console.log("claim-builder.test.ts: all assertions passed");
console.log(
  JSON.stringify(
    {
      claimsGenerated: result.rawProposals.length,
      evidenceGenerated: result.outputs.evidenceGenerated,
      rejected: (result.outputs.claimBuilderReport as { claimsRejected: number })?.claimsRejected,
    },
    null,
    2
  )
);