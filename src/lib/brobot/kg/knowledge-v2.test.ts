import assert from "node:assert/strict";
import { formatKnowledgePacketForPrompt } from "@/lib/brobot/chat/context-builder";
import { parseBroBotChatResponse } from "@/lib/brobot/chat/response-parser";
import { runBroBotQualityGate } from "@/lib/brobot/chat/quality-gate";
import type { BroBotKgPacket } from "./contracts";

process.env.BROBOT_CLAIMS_GROUNDING_MODE = "enabled";

const claimId = "00000000-0000-4000-8000-000000000101";
const packet: BroBotKgPacket = {
  retrievalId: "00000000-0000-4000-8000-000000000001",
  releaseId: "kg-beta-20260716-002",
  status: "hit",
  anchors: [],
  facts: [],
  cardCandidates: [],
  neighborhoodSlugs: [],
  coverage: "full",
  limitations: [],
  tokenEstimate: 80,
  claims: [
    {
      claimId,
      claimVersionId: "00000000-0000-4000-8000-000000000102",
      claimText: "A reviewed teaching claim with a 5 mm threshold.",
      claimType: "threshold",
      predicate: "uses_threshold",
      objectText: "5 mm",
      qualifiers: {},
      importanceLevel: "L1",
      primaryEntityId: "00000000-0000-4000-8000-000000000103",
      primaryEntityLabel: "Test entity",
      approvalMethod: "human_review",
      reviewStatus: "approved",
      contentSource: "verified",
      algorithmVersion: "test",
      trustTier: "A",
      score: 1,
      selectionReasons: ["entity_match"],
    },
  ],
};

const prompt = formatKnowledgePacketForPrompt(packet);
assert.match(prompt, /Grounded knowledge packet/);
assert.match(prompt, new RegExp(claimId));
assert.match(prompt, /5 mm threshold/);

const parsed = parseBroBotChatResponse(
  JSON.stringify({
    answer: "- Use the reviewed threshold.",
    priorityPoints: [],
    knowledgeGaps: [],
    whatMostResidentsMiss: [],
    suggestedQuestions: [],
    nextLearningBranches: [],
    tags: [],
    detectedMode: "oite",
    confidence: 0.9,
    needsClarification: false,
    clarifyingQuestions: [],
    assumedContext: "",
    consultConfidence: null,
    missingInformation: [],
    researchSubmode: null,
    usedClaimIds: [claimId, "00000000-0000-4000-8000-000000000999"],
    knowledgeCoverage: "full",
  }),
  { fallbackMode: "oite", validClaimIds: [claimId], knowledgeCoverage: "full" },
);

assert.deepEqual(parsed.usedClaimIds, [claimId]);
assert.equal(parsed.knowledgeCoverage, "full");

const groundedGate = runBroBotQualityGate({
  answer: "The threshold is 9 mm and it is not indicated.",
  mode: "oite",
  responseDepth: "quick",
  usedClaimIds: [claimId],
  knowledgePacket: packet,
});
assert.ok(groundedGate.warnings.includes("knowledge_numeric_mismatch"));
assert.ok(groundedGate.warnings.includes("knowledge_polarity_mismatch"));

console.log("BroBot claims knowledge v2 runtime tests passed");
