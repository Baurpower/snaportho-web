import assert from "node:assert/strict";
import type { BroBotChatIntent, BroBotClinicalContext } from "@/lib/brobot/chat/types";
import {
  assessSupport,
  buildQueryUnderstanding,
  detectUnsupportedTopic,
} from "@/lib/brobot/kg/query-understanding";
import { rerankClaims, DEFAULT_RERANK_PARAMS } from "@/lib/brobot/kg/rerank";
import { buildBroBotKgTelemetryRow } from "@/lib/brobot/kg/telemetry";

const level = (message: string) => assessSupport(message).level;
const cats = (message: string) => assessSupport(message).categories;

// Unsupported categories.
assert.equal(level("What is the correct CPT code for billing this tibial shaft fracture fixation?"), "unsupported");
assert.equal(level("How much does a total knee replacement cost?"), "unsupported");
assert.equal(level("Is this malpractice? Should I get a lawyer?"), "unsupported");
assert.equal(level("Can you write me a work note for tomorrow?"), "unsupported");
assert.equal(level("I need to schedule a follow-up appointment next week"), "unsupported");
assert.equal(level("My insurance denied the MRI, what do I do?"), "unsupported");
assert.equal(level("Can you read this MRI for me?"), "unsupported");
assert.equal(level("What does this attached x-ray show?"), "unsupported");
assert.equal(level("My dog tore his ACL, what should I do?"), "unsupported");
assert.equal(level("I have a fever, cough, and chest pain"), "unsupported");
assert.equal(detectUnsupportedTopic("What CPT code should I bill?"), "billing");

// Vague semantic similarity never upgrades to supported.
assert.equal(level("CPT code for ankle ORIF"), "unsupported");
assert.ok(cats("CPT code for ankle ORIF").includes("billing"));
assert.equal(level("How much is carpal tunnel surgery?"), "unsupported");
assert.equal(level("Read this ankle MRI and tell me the diagnosis"), "unsupported");

// Guards: clinical readings stay supported.
assert.equal(level("ACL reconstruction scheduled but the knee is still stiff"), "supported");
assert.equal(level("Fever after TKA, worried about infection"), "supported");
assert.equal(level("Dog bite to the hand, do I need antibiotics?"), "supported");
assert.equal(level("MRI shows ACL tear, what are the treatment options?"), "supported");
assert.equal(level("Back pain with fever, could this be discitis?"), "supported");
assert.equal(level("Neck pain after a fall, when do I get imaging?"), "supported");
assert.equal(level("What is the cat scan protocol for tibial plateau fractures?"), "supported");
assert.equal(level("Garden classification for femoral neck fracture"), "supported");

// Partially supported categories.
assert.equal(level("Walk me through the steps of an ORIF step by step"), "partially_supported");
assert.equal(level("What are the operative steps for ankle fixation in detail?"), "partially_supported");
assert.equal(level("My patient is on warfarin and needs a hip fracture fixed, what do I do?"), "partially_supported");
assert.equal(level("What does the systematic review say about PRP for Achilles rupture?"), "partially_supported");
assert.equal(detectUnsupportedTopic("Walk me through the steps of an ORIF step by step"), null);

// QU return carries the assessment.
const intent: BroBotChatIntent = {
  mode: "oite",
  subintent: "overview",
  procedureCategory: "general_topic",
  procedureOrTopic: "",
  ambiguity: "low",
  assumedContext: "",
  missingContext: [],
  clarifyingQuestions: [],
  confidence: 0.9,
};
const context: BroBotClinicalContext = {
  entities: {},
  caseSlots: {},
  taskFacets: [],
  missingCriticalSlots: [],
  coverageRequirements: [],
};
const qu = buildQueryUnderstanding({ message: "What CPT code should I bill?", intent, clinicalContext: context });
assert.equal(qu.support.level, "unsupported");
assert.equal(qu.unsupportedTopic, "billing");
const qu2 = buildQueryUnderstanding({ message: "Garden classification femoral neck", intent, clinicalContext: context });
assert.equal(qu2.support.level, "supported");
assert.equal(qu2.unsupportedTopic, null);

// Rerank: unsupported serves nothing; partial raises the bar and caps coverage.
function candidate(id: string, text: string, ftsRank: number) {
  return {
    claimId: id,
    claimVersionId: `v-${id}`,
    claimText: text,
    claimType: "treatment",
    predicate: "states",
    trustTier: "A",
    approvalMethod: "human_review",
    reviewStatus: "approved",
    contentSource: "verified",
    poolScore: 0.5,
    channels: ["claimFts"],
    graphDistance: 0,
    components: {
      ftsRank, trigram: 0.6, termCoverage: 0.8, idfCoverage: 0.7, termMatched: 2,
      phraseBonus: 0, entityScore: 0.5, relScore: 0, cardFtsRank: 1, cardCoverage: 0.5,
      modeFit: 1, facetFit: 1, trust: 0.9, importance: 0.5, qualityPenalty: 0,
    },
  } as unknown as Parameters<typeof rerankClaims>[0]["candidates"][number];
}

const unsupOut = rerankClaims({
  query: "cpt code billing",
  terms: ["cpt", "code", "billing"],
  facets: [],
  candidates: [candidate("00000000-0000-4000-8000-000000000001", "Ankle fracture billing guidance.", 4)],
  supportLevel: "unsupported",
  unsupportedTopic: "billing",
});
assert.deepEqual(unsupOut.selected, []);
assert.ok(unsupOut.limitations.some((l) => l.includes("billing")));

// Same pool under supported vs partial: the weak claim survives supported, dies under partial.
const pool = [
  candidate("00000000-0000-4000-8000-000000000011", "Ankle fracture fixation uses plates and screws.", 4),
  candidate("00000000-0000-4000-8000-000000000012", "Fracture healing takes several weeks.", 0.5),
];
const supportedOut = rerankClaims({
  query: "ankle fracture fixation", terms: ["ankle", "fracture", "fixation"], facets: [],
  candidates: pool, supportLevel: "supported",
});
const partialOut = rerankClaims({
  query: "ankle fracture fixation steps", terms: ["ankle", "fracture", "fixation", "steps"], facets: [],
  candidates: pool, supportLevel: "partially_supported",
});
assert.ok(supportedOut.selected.length >= partialOut.selected.length);
assert.ok(
  partialOut.selected.every((c) => c.finalScore >= DEFAULT_RERANK_PARAMS.partialMinScore),
  "partial serves only above the raised bar"
);
assert.ok(partialOut.limitations.some((l) => l.includes("Partially supported")));
if (partialOut.selected.length > 0) assert.equal(partialOut.coverage, "partial");

// Telemetry carries support_level.
const row = buildBroBotKgTelemetryRow({
  result: {
    mode: "shadow",
    packet: null,
    trace: {
      requestId: "r", retrievalId: "g", decision: { eligible: true, action: "retrieve", score: 1, reasons: [] },
      candidates: [], selectedEntityIds: [], selectedRelationshipIds: [], selectedClaimIds: [],
      candidateCardIds: [], neighborhoodSlugs: [], predicateFamilies: [], cacheStatus: "miss",
      stageTimingsMs: {}, configuredDeadlineMs: 275, elapsedLatencyMs: 1, rpcStarted: false,
      rpcCompleted: false, answerInfluenced: false, retrievalMode: "shadow", packetTokenEstimate: 0,
      status: "miss", policyVersion: "p", packetSchemaVersion: "s", gaps: [], supportLevel: "partially_supported",
    },
  },
  query: "q", mode: "oite", subintent: "overview", trainingLevel: "pgy2", responseDepth: "standard",
} as unknown as Parameters<typeof buildBroBotKgTelemetryRow>[0]);
assert.equal((row as Record<string, unknown>).support_level, "partially_supported");

console.log("BroBot support assessment tests passed");
