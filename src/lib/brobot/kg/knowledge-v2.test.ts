import assert from "node:assert/strict";
import {
  getBroBotClaimAnkiMode,
  getBroBotClaimsGroundingMode,
  getBroBotKgFeatureMode,
  getBroBotKnowledgeRetrievalVersion,
  isBroBotClaimsGroundingAllowedForMode,
  BROBOT_KG_RETRIEVAL_DEADLINE_MS,
} from "./config";
import { buildBroBotKgTelemetryRow } from "./telemetry";
import type { BroBotKgShadowResult } from "./contracts";

const prior = { ...process.env };
function restore() {
  for (const key of Object.keys(process.env)) {
    if (!(key in prior)) delete process.env[key];
  }
  Object.assign(process.env, prior);
}

delete process.env.BROBOT_KG_MODE;
delete process.env.BROBOT_KNOWLEDGE_V2_MODE;
delete process.env.BROBOT_CLAIMS_GROUNDING_MODE;
delete process.env.BROBOT_CLAIM_ANKI_MODE;
delete process.env.BROBOT_KNOWLEDGE_RETRIEVAL_VERSION;
delete process.env.BROBOT_CLAIMS_GROUNDING_MODES;
delete process.env.BROBOT_KG_RETRIEVAL_DEADLINE_MS;

assert.equal(getBroBotKgFeatureMode(), "shadow");
assert.equal(getBroBotClaimsGroundingMode(), "shadow");
assert.equal(getBroBotClaimAnkiMode(), "off");
assert.equal(getBroBotKnowledgeRetrievalVersion(), "v2");
assert.equal(isBroBotClaimsGroundingAllowedForMode("consult"), false);
assert.ok(BROBOT_KG_RETRIEVAL_DEADLINE_MS >= 1200);

process.env.BROBOT_CLAIMS_GROUNDING_MODE = "enabled";
process.env.BROBOT_CLAIMS_GROUNDING_MODES = "consult,or_prep";
assert.equal(isBroBotClaimsGroundingAllowedForMode("consult"), true);
assert.equal(isBroBotClaimsGroundingAllowedForMode("research"), false);

const shadow: BroBotKgShadowResult = {
  mode: "shadow",
  packet: {
    retrievalId: "00000000-0000-4000-8000-000000000002",
    releaseId: "kg-beta-20260716-002",
    status: "hit",
    anchors: [],
    facts: [],
    claims: [
      {
        claimId: "00000000-0000-4000-8000-000000000099",
        claimVersionId: "00000000-0000-4000-8000-000000000098",
        claimText: "Test claim",
        claimType: "fact",
        predicate: "teaches_fact",
        objectText: "",
        qualifiers: {},
        importanceLevel: "L2",
        primaryEntityId: "00000000-0000-4000-8000-000000000097",
        primaryEntityLabel: "Ankle Fracture",
        approvalMethod: "machine_consensus",
        reviewStatus: "unreviewed",
        contentSource: "generated_draft",
        algorithmVersion: "card-claim-factory.v1",
        trustTier: "B",
        score: 0.9,
        selectionReasons: ["factory"],
      },
    ],
    cardCandidates: [],
    neighborhoodSlugs: [],
    coverage: "full",
    limitations: ["Shadow only: claims were not supplied to answer generation."],
    tokenEstimate: 10,
  },
  trace: {
    requestId: "00000000-0000-4000-8000-000000000001",
    retrievalId: "00000000-0000-4000-8000-000000000002",
    releaseId: "kg-beta-20260716-002",
    decision: { eligible: true, action: "retrieve", score: 1, reasons: ["clinical"] },
    candidates: [],
    selectedEntityIds: [],
    selectedRelationshipIds: [],
    selectedClaimIds: ["00000000-0000-4000-8000-000000000099"],
    candidateCardIds: [],
    neighborhoodSlugs: [],
    predicateFamilies: [],
    cacheStatus: "miss",
    stageTimingsMs: { kg_subgraph_retrieval: 400 },
    configuredDeadlineMs: 900,
    elapsedLatencyMs: 410,
    rpcStarted: true,
    rpcCompleted: true,
    answerInfluenced: false,
    retrievalMode: "shadow",
    packetTokenEstimate: 10,
    status: "hit",
    policyVersion: "brobot-claims-v2",
    packetSchemaVersion: "brobot-knowledge-packet.v2",
    gaps: [],
  },
};

const row = buildBroBotKgTelemetryRow({
  result: shadow,
  query: "ankle fracture ORIF",
  mode: "consult",
  subintent: "general",
  trainingLevel: "pgy2",
  responseDepth: "standard",
});
assert.equal(row.answer_influenced, false);
assert.equal(row.retrieval_mode, "shadow");
assert.deepEqual(row.selected_claim_ids, ["00000000-0000-4000-8000-000000000099"]);
assert.equal(row.claim_candidate_count, 1);

restore();
console.log("brobot knowledge-v2 config/telemetry tests passed");
