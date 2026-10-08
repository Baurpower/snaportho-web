import assert from "node:assert/strict";
import { runBroBotQualityGate } from "@/lib/brobot/chat/quality-gate";
import type {
  BroBotChatIntent,
  BroBotClinicalContext,
} from "@/lib/brobot/chat/types";
import { getBroBotKnowledgeRetrievalVersion } from "@/lib/brobot/kg/config";
import type {
  BroBotKgPacket,
  BroBotKgShadowResult,
  BroBotKnowledgeClaim,
} from "@/lib/brobot/kg/contracts";
import {
  buildBroBotKnowledgeCacheKey,
  mapV3PoolToCandidates,
} from "@/lib/brobot/kg/provider";
import { buildQueryUnderstanding } from "@/lib/brobot/kg/query-understanding";
import {
  BROBOT_RERANK_VERSION,
  DEFAULT_RERANK_PARAMS,
  rerankClaims,
  type BroBotRerankCandidate,
  type BroBotClaimScoreComponents,
} from "@/lib/brobot/kg/rerank";
import { buildBroBotKgTelemetryRow } from "@/lib/brobot/kg/telemetry";

const baseIntent = (
  overrides: Partial<BroBotChatIntent> = {},
): BroBotChatIntent => ({
  mode: "oite",
  subintent: "overview",
  procedureCategory: "general_topic",
  procedureOrTopic: "",
  ambiguity: "low",
  assumedContext: "",
  missingContext: [],
  clarifyingQuestions: [],
  confidence: 0.9,
  ...overrides,
});

const baseContext = (
  overrides: Partial<BroBotClinicalContext> = {},
): BroBotClinicalContext => ({
  entities: {},
  caseSlots: {},
  taskFacets: [],
  missingCriticalSlots: [],
  coverageRequirements: [],
  ...overrides,
});

const zeroComponents = (): BroBotClaimScoreComponents => ({
  ftsRank: 0,
  trigram: 0,
  termCoverage: 0,
  idfCoverage: 0,
  termMatched: 0,
  phraseBonus: 0,
  entityScore: 0,
  relScore: 0,
  cardFtsRank: 0,
  cardCoverage: 0,
  modeFit: 0,
  facetFit: 0,
  trust: 0,
  importance: 0,
  qualityPenalty: 0,
});

const strongComponents = (): BroBotClaimScoreComponents => ({
  ftsRank: 4,
  trigram: 0.8,
  termCoverage: 0.9,
  idfCoverage: 0.8,
  termMatched: 3,
  phraseBonus: 1,
  entityScore: 0.7,
  relScore: 0.5,
  cardFtsRank: 2,
  cardCoverage: 0.6,
  modeFit: 1,
  facetFit: 1,
  trust: 0.9,
  importance: 0.8,
  qualityPenalty: 0,
});

let idCounter = 1;
const candidate = (
  overrides: Partial<BroBotRerankCandidate> = {},
): BroBotRerankCandidate => {
  const n = String(idCounter++).padStart(3, "0");
  return {
    claimId: `00000000-0000-4000-8000-000000000${n}`,
    claimVersionId: `10000000-0000-4000-8000-000000000${n}`,
    claimText:
      "The Garden classification for femoral neck fractures guides treatment.",
    claimType: "classification",
    predicate: "uses_classification",
    objectText: "Garden classification",
    qualifiers: {},
    importanceLevel: "L1",
    primaryEntityId: null,
    primaryEntityLabel: null,
    approvalMethod: "human_review",
    reviewStatus: "approved",
    contentSource: "verified",
    algorithmVersion: "test",
    trustTier: "A",
    poolScore: 0.8,
    channels: ["claimFts"],
    graphDistance: 0,
    mentionCoherence: "none",
    components: strongComponents(),
    ...overrides,
  };
};

// Query understanding: unsupported topics are detected, outputs bounded.
const billing = buildQueryUnderstanding({
  message: "What CPT code should I bill for this case?",
  intent: baseIntent({ mode: "consult", subintent: "initial_consult" }),
  clinicalContext: baseContext(),
});
assert.ok(billing.unsupportedTopic, "billing question detected as unsupported");
const bounded = buildQueryUnderstanding({
  message:
    "Garden classification femoral neck fracture treatment threshold displacement age",
  intent: baseIntent(),
  clinicalContext: baseContext(),
});
assert.ok(bounded.variants.length <= 12);
assert.ok(bounded.terms.length <= 24);

// Retrieval cache identity includes contextual query-understanding inputs.
const cacheKeyBase = {
  retrievalVersion: "v3",
  policyVersion: "test-policy",
  normalizedQuery: "what next",
  mode: "oite",
  subintent: "overview",
  responseDepth: "standard",
};
const traumaKey = buildBroBotKnowledgeCacheKey({
  ...cacheKeyBase,
  queryUnderstanding: {
    variants: ["what next tibial plateau"],
    terms: ["tibial", "plateau"],
    facets: ["management"],
  },
});
const handKey = buildBroBotKnowledgeCacheKey({
  ...cacheKeyBase,
  queryUnderstanding: {
    variants: ["what next scaphoid"],
    terms: ["scaphoid"],
    facets: ["management"],
  },
});
assert.notEqual(
  traumaKey,
  handKey,
  "different conversation context must not share retrieval cache entries",
);
assert.equal(
  traumaKey,
  buildBroBotKnowledgeCacheKey({
    ...cacheKeyBase,
    queryUnderstanding: {
      variants: ["what next tibial plateau"],
      terms: ["plateau", "tibial"],
      facets: ["management"],
    },
  }),
  "equivalent normalized inputs should share cache entries",
);
assert.notEqual(
  traumaKey,
  buildBroBotKnowledgeCacheKey({ ...cacheKeyBase, retrievalVersion: "v2" }),
);

// Rerank: unsupported topic serves nothing, with a limitation.
const unsupported = rerankClaims({
  query: "billing question",
  terms: ["cpt", "bill"],
  facets: [],
  candidates: [candidate()],
  unsupportedTopic: billing.unsupportedTopic,
});
assert.deepEqual(unsupported.selected, []);
assert.equal(unsupported.coverage, "unknown");
assert.ok(unsupported.limitations.length > 0);
assert.equal(unsupported.hasConflict, false);

// Rerank: hard threshold — weak claims are dropped, never force-served.
const weak = rerankClaims({
  query: "ankle fracture classification",
  terms: ["ankle", "fracture", "classification"],
  facets: [],
  candidates: [
    candidate({
      claimText: "Ankle fracture classification system overview statement.",
      components: zeroComponents(),
      poolScore: 0.01,
    }),
  ],
});
assert.deepEqual(weak.selected, []);
assert.ok(weak.dropped.some((d) => d.reason === "below_relevance_threshold"));
assert.ok(weak.limitations.some((l) => l.includes("without KG claims")));

// Rerank: eligibility recheck drops ineligible rows even if the pool leaked them.
const ineligible = rerankClaims({
  query: "garden femoral neck",
  terms: ["garden", "femoral", "neck"],
  facets: [],
  candidates: [
    candidate({ reviewStatus: "needs_review" }),
    candidate({
      claimText:
        "The Garden classification for femoral neck fractures guides operative choice.",
    }),
  ],
});
assert.equal(ineligible.selected.length, 1);
assert.ok(
  ineligible.dropped.some((d) =>
    d.reason.startsWith("eligibility_recheck_failed"),
  ),
);

// Rerank: a strong on-topic claim is selected with score parts and packet index.
const strong = rerankClaims({
  query: "garden femoral neck",
  terms: ["garden", "femoral", "neck"],
  facets: ["classification"],
  candidates: [candidate()],
});
assert.equal(strong.selected.length, 1);
assert.equal(strong.selected[0].packetIndex, "C1");
assert.equal("tokens" in strong.selected[0], false);
assert.ok(strong.selected[0].finalScore >= DEFAULT_RERANK_PARAMS.minScore);
assert.ok(Object.keys(strong.selected[0].scoreParts).length > 0);
assert.equal(strong.version, BROBOT_RERANK_VERSION);

// Rerank: maxClaims caps selection; overflow is labeled diversity_cut.
const capped = rerankClaims({
  query: "garden femoral neck",
  terms: ["garden", "femoral", "neck"],
  facets: [],
  candidates: [
    candidate(),
    candidate({
      claimText:
        "Femoral neck fracture blood supply arises from the medial circumflex artery.",
    }),
  ],
  params: { maxClaims: 1 },
});
assert.equal(capped.selected.length, 1);
assert.ok(capped.dropped.some((d) => d.reason === "diversity_cut"));

// Rerank: MMR prefers a distinct second claim over a near-duplicate.
const diverse = rerankClaims({
  query: "garden femoral neck",
  terms: ["garden", "femoral", "neck"],
  facets: [],
  candidates: [
    candidate({ claimId: "00000000-0000-4000-8000-000000000901" }),
    candidate({
      claimId: "00000000-0000-4000-8000-000000000902",
      claimText:
        "The Garden classification for femoral neck fractures guides treatment decisions.",
    }),
    candidate({
      claimId: "00000000-0000-4000-8000-000000000903",
      claimText:
        "Garden femoral neck fractures disrupt retinacular vessels from the medial circumflex artery.",
    }),
  ],
  params: { maxClaims: 2 },
});
assert.equal(diverse.selected.length, 2);
assert.deepEqual(
  diverse.selected.map((c) => c.claimId).sort(),
  [
    "00000000-0000-4000-8000-000000000901",
    "00000000-0000-4000-8000-000000000903",
  ].sort(),
);

// Rerank: conflicting numbers in similar claims surface as conflicts.
const conflicted = rerankClaims({
  query: "distal radius operative threshold",
  terms: ["distal", "radius", "operative", "threshold"],
  facets: [],
  candidates: [
    candidate({
      claimId: "00000000-0000-4000-8000-000000000911",
      claimText:
        "Distal radius fractures with more than 5 mm of shortening need operative fixation.",
    }),
    candidate({
      claimId: "00000000-0000-4000-8000-000000000912",
      claimText:
        "Distal radius fractures with more than 9 mm of shortening need operative fixation.",
    }),
  ],
  params: { maxClaims: 2, mmrLambda: 0 },
});
assert.equal(conflicted.selected.length, 2);
assert.equal(conflicted.hasConflict, true);
assert.equal(conflicted.conflicts.length, 1);
assert.equal(conflicted.conflicts[0].kind, "number");
assert.equal(conflicted.coverage, "partial");

// Rerank: deterministic — same input, same output.
const first = rerankClaims({
  query: "garden femoral neck",
  terms: ["garden", "femoral", "neck"],
  facets: ["classification"],
  candidates: [candidate({ claimId: "00000000-0000-4000-8000-000000000921" })],
});
const second = rerankClaims({
  query: "garden femoral neck",
  terms: ["garden", "femoral", "neck"],
  facets: ["classification"],
  candidates: [candidate({ claimId: "00000000-0000-4000-8000-000000000921" })],
});
assert.deepEqual(
  first.selected.map((c) => [c.claimId, c.finalScore]),
  second.selected.map((c) => [c.claimId, c.finalScore]),
);

// Provider mapping: malformed pool rows are dropped, fields coerced.
const poolRow = (
  overrides: Record<string, unknown> = {},
): BroBotKnowledgeClaim =>
  ({
    claimId: "00000000-0000-4000-8000-000000000931",
    claimVersionId: "10000000-0000-4000-8000-000000000931",
    claimText: "A mapped pool claim.",
    claimType: "fact",
    predicate: "states",
    objectText: "",
    qualifiers: {},
    importanceLevel: "",
    primaryEntityId: "",
    primaryEntityLabel: "",
    approvalMethod: "human_review",
    reviewStatus: "approved",
    contentSource: "verified",
    algorithmVersion: "test",
    trustTier: "A",
    score: 0.7,
    selectionReasons: [],
    ...overrides,
  }) as BroBotKnowledgeClaim;
const mapped = mapV3PoolToCandidates([
  poolRow({
    poolScore: 0.7,
    channels: ["claimFts"],
    graphDistance: 0,
    mentionCoherence: "anchor",
    components: strongComponents(),
  }),
  poolRow({ claimId: "", claimText: "" }),
  poolRow({
    claimId: "00000000-0000-4000-8000-000000000932",
    claimText: "Missing components row.",
    trustTier: "Z",
  }),
]);
assert.equal(mapped.length, 2);
assert.equal(mapped[0].poolScore, 0.7);
assert.deepEqual(mapped[0].channels, ["claimFts"]);
assert.equal(mapped[0].mentionCoherence, "anchor");
assert.equal(mapped[1].trustTier, "B");
assert.equal(mapped[1].components.ftsRank, 0);

// Quality gate: using both sides of a conflict warns; single-sided use does not.
const conflictPacket: BroBotKgPacket = {
  retrievalId: "00000000-0000-4000-8000-000000000941",
  releaseId: "kg-beta-20260716-002",
  status: "partial",
  anchors: [],
  facts: [],
  cardCandidates: [],
  neighborhoodSlugs: [],
  coverage: "partial",
  limitations: [],
  tokenEstimate: 80,
  claims: [
    {
      ...poolRow({
        claimId: "00000000-0000-4000-8000-000000000911",
        claimText: "5 mm claim.",
      }),
      score: 0.9,
      selectionReasons: ["claimFts"],
    },
    {
      ...poolRow({
        claimId: "00000000-0000-4000-8000-000000000912",
        claimText: "9 mm claim.",
      }),
      score: 0.9,
      selectionReasons: ["claimFts"],
    },
  ],
  claimConflicts: [
    {
      claimIds: [
        "00000000-0000-4000-8000-000000000911",
        "00000000-0000-4000-8000-000000000912",
      ],
      kind: "number",
      detail: "test conflict",
    },
  ],
};
const gateBoth = runBroBotQualityGate({
  answer: "The threshold is 5 mm.",
  mode: "oite",
  responseDepth: "quick",
  usedClaimIds: [
    "00000000-0000-4000-8000-000000000911",
    "00000000-0000-4000-8000-000000000912",
  ],
  knowledgePacket: conflictPacket,
});
assert.ok(gateBoth.warnings.includes("knowledge_claim_conflict"));
const gateSingle = runBroBotQualityGate({
  answer: "The threshold is 5 mm.",
  mode: "oite",
  responseDepth: "quick",
  usedClaimIds: ["00000000-0000-4000-8000-000000000911"],
  knowledgePacket: conflictPacket,
});
assert.ok(!gateSingle.warnings.includes("knowledge_claim_conflict"));

// Telemetry: v3 fields land on the row.
const v3Result: BroBotKgShadowResult = {
  mode: "shadow",
  packet: conflictPacket,
  trace: {
    requestId: "00000000-0000-4000-8000-000000000951",
    retrievalId: "00000000-0000-4000-8000-000000000941",
    decision: {
      eligible: true,
      action: "retrieve",
      score: 1,
      reasons: ["clinical"],
    },
    candidates: [],
    selectedEntityIds: [],
    selectedRelationshipIds: [],
    selectedClaimIds: ["00000000-0000-4000-8000-000000000911"],
    candidateCardIds: [],
    neighborhoodSlugs: [],
    predicateFamilies: [],
    cacheStatus: "miss",
    stageTimingsMs: {},
    configuredDeadlineMs: 275,
    elapsedLatencyMs: 100,
    rpcStarted: true,
    rpcCompleted: true,
    answerInfluenced: false,
    retrievalMode: "shadow",
    packetTokenEstimate: 80,
    status: "hit",
    policyVersion: "brobot-claims-v3",
    packetSchemaVersion: "brobot-knowledge-packet.v2",
    gaps: [],
    queryVariants: ["garden femoral neck"],
    requestedFacets: ["classification"],
    retrievalChannels: { claimFts: 2, poolTotal: 2 },
    exclusionReasons: ["diversity_cut:1"],
    rerankVersion: BROBOT_RERANK_VERSION,
    poolSize: 2,
    claimScoreComponents: [
      {
        claimId: "00000000-0000-4000-8000-000000000911",
        finalScore: 0.9,
        parts: { text: 0.5 },
      },
    ],
  },
};
const v3Row = buildBroBotKgTelemetryRow({
  result: v3Result,
  query: "garden classification",
  mode: "oite",
  subintent: "overview",
  trainingLevel: "pgy2",
  responseDepth: "standard",
});
assert.deepEqual(v3Row.query_variants, ["garden femoral neck"]);
assert.deepEqual(v3Row.requested_facets, ["classification"]);
assert.deepEqual(v3Row.retrieval_channels, { claimFts: 2, poolTotal: 2 });
assert.deepEqual(v3Row.exclusion_reasons, ["diversity_cut:1"]);
assert.equal(v3Row.rerank_version, BROBOT_RERANK_VERSION);
assert.equal(v3Row.pool_size, 2);
assert.equal(
  (v3Row.claim_score_components as Array<{ claimId: string }>)[0].claimId,
  "00000000-0000-4000-8000-000000000911",
);

// Config: retrieval version defaults to v2, opts into v3.
const prior = process.env.BROBOT_KNOWLEDGE_RETRIEVAL_VERSION;
delete process.env.BROBOT_KNOWLEDGE_RETRIEVAL_VERSION;
assert.equal(getBroBotKnowledgeRetrievalVersion(), "v2");
process.env.BROBOT_KNOWLEDGE_RETRIEVAL_VERSION = "v3";
assert.equal(getBroBotKnowledgeRetrievalVersion(), "v3");
if (prior === undefined) delete process.env.BROBOT_KNOWLEDGE_RETRIEVAL_VERSION;
else process.env.BROBOT_KNOWLEDGE_RETRIEVAL_VERSION = prior;

console.log("BroBot claims knowledge v3 tests passed");
