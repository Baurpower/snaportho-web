import assert from "node:assert/strict";
import { compileNeighborhood } from "../kg-compiler/compiler.ts";
import { OB_FORBIDDEN_PAYLOAD_KEYS } from "./collectors/orthobullets-metadata-collector.ts";
import { buildEvidencePacket } from "./evidence-packet-builder.ts";
import { stableEvidenceId } from "./evidence-id.ts";

const FIXED_AT = "2026-07-05T12:00:00.000Z";

const first = await buildEvidencePacket({
  topic: "ankle-fracture",
  createdAt: FIXED_AT,
});
const second = await buildEvidencePacket({
  topic: "ankle-fracture",
  createdAt: FIXED_AT,
});

assert.equal(first.packet.databaseModified, false);
assert.equal(second.packet.databaseModified, false);
assert.equal(first.packet.packetId, second.packet.packetId, "packetId must be stable");

const firstIds = first.packet.sourceEvidence.map((e) => e.evidenceId).sort();
const secondIds = second.packet.sourceEvidence.map((e) => e.evidenceId).sort();
assert.deepEqual(firstIds, secondIds, "evidence IDs must be stable across runs");

assert.ok(first.packet.sourceEvidence.length >= 8, "expected multiple evidence items");
assert.ok(
  first.packet.sourceEvidence.some((e) => e.sourceType === "static_prepare"),
  "expected static Prepare evidence"
);
assert.ok(
  first.packet.sourceEvidence.some((e) => e.payload.contentRole === "internal_draft_source"),
  "static Prepare must be internal_draft_source"
);
assert.ok(
  first.packet.sourceEvidence.some((e) => e.sourceType === "curriculum_node"),
  "expected curriculum node evidence"
);
assert.ok(
  first.packet.sourceEvidence.some((e) => e.sourceType === "anki_card"),
  "expected Anki signal evidence"
);
assert.ok(
  first.packet.sourceEvidence.some((e) => e.sourceType === "orthobullets_question"),
  "expected Orthobullets metadata evidence"
);
assert.ok(
  first.packet.sourceEvidence.some((e) => e.sourceType === "caseprep"),
  "expected CasePrep link evidence"
);
assert.ok(first.packet.canonicalSnapshot.loaded, "expected canonical snapshot");
assert.ok(first.packet.existingProposals.length > 0, "expected proposals in packet");
assert.ok(first.packet.gaps.length > 0, "expected quality gaps");

for (const item of first.packet.sourceEvidence) {
  if (item.sourceType !== "orthobullets_question") continue;
  for (const key of OB_FORBIDDEN_PAYLOAD_KEYS) {
    assert.ok(!(key in item.payload), `Orthobullets item must not contain ${key}`);
  }
  assert.equal(item.payload.storesQuestionStem, false);
  assert.equal(item.payload.storesAnswer, false);
}

const idSample = stableEvidenceId("static_prepare", "ankle-fracture", "section_extract", "fast");
assert.match(idSample, /^ev-static-prepare-[0-9a-f]{8}$/);

const compileWithEvidence = await compileNeighborhood({
  topic: "ankle-fracture",
  evidencePacket: first.packet,
});
assert.equal(compileWithEvidence.plan.evidencePacketId, first.packet.packetId);
assert.equal(compileWithEvidence.publication.ready, false, "publication must remain blocked");
assert.ok(compileWithEvidence.plan.constraints.databaseModified === false);

const exec = compileWithEvidence.agentExecution;
assert.ok(exec, "agent execution expected");
const gapEntry = exec.entries.find((e) => e.agentId === "relationship-builder");
assert.ok(gapEntry?.status === "completed");

const { executeAgentOrchestration } = await import("../kg-agent-framework/orchestrator.ts");
const { resolveTopic } = await import("../kg-compiler/topic-registry.ts");
const topic = resolveTopic("ankle-fracture")!;
const snapshot = topic.loadSnapshot();
const proposals = await topic.buildProposals();
const { analyzeGaps } = await import("../kg-compiler/gap-analyzer.ts");
const gaps = analyzeGaps(snapshot, proposals);
const orch = await executeAgentOrchestration({
  topicKey: topic.topicKey,
  pilotKey: topic.pilotKey,
  displayName: topic.displayName,
  primaryEntitySlug: topic.primaryEntitySlug,
  targetMaturityLevel: topic.targetMaturityLevel,
  snapshot,
  gaps,
  seedProposals: proposals,
  evidencePacket: first.packet,
});
const relAgent = [...orch.results.values()].find((r) => r.agentId === "relationship-builder");
assert.ok(relAgent, "relationship-builder result expected");
assert.ok(
  relAgent.auditTrail.entries.some((e) => e.action === "evidence_packet_bound"),
  "audit trail must record evidence_packet_bound"
);
assert.ok(
  relAgent.outputs.evidenceItemIds && (relAgent.outputs.evidenceItemIds as string[]).length > 0,
  "agent outputs must include evidenceItemIds"
);

const compileBaseline = await compileNeighborhood({ topic: "ankle-fracture" });
assert.equal(compileBaseline.publication.ready, false);
assert.equal(compileBaseline.plan.constraints.databaseModified, false);

console.log("evidence-packet.test.ts: all assertions passed");
console.log(
  JSON.stringify(
    {
      packetId: first.packet.packetId,
      evidenceItems: first.packet.sourceEvidence.length,
      bySource: first.packet.sourceEvidence.reduce<Record<string, number>>((acc, e) => {
        acc[e.sourceType] = (acc[e.sourceType] ?? 0) + 1;
        return acc;
      }, {}),
      warnings: first.packet.warnings.length,
      compileWithEvidence: compileWithEvidence.plan.evidencePacketId,
    },
    null,
    2
  )
);