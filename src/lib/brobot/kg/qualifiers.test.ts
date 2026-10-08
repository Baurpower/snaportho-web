import assert from "node:assert/strict";
import {
  compareQualifiers,
  qualifierPenaltyDimensions,
  qualifierProtectedTerms,
  qualifierQueryTerms,
  qualifierVeto,
  QUALIFIER_VETO_DIMENSIONS,
  type BroBotQualifierDimension,
} from "@/lib/brobot/kg/qualifiers";
import { rerankClaims, scoreCandidates, DEFAULT_RERANK_PARAMS } from "@/lib/brobot/kg/rerank";

function state(query: string, claim: string, dimension: BroBotQualifierDimension, predicate?: string | null) {
  return compareQualifiers(query, claim, predicate)[dimension].state;
}

const Q = (query: string, claim: string, predicate?: string | null) => compareQualifiers(query, claim, predicate);

// Axis oppositions veto or penalize; unknown never conflicts.
assert.equal(state("flexion type supracondylar fracture", "extension type supracondylar fracture", "flexionextension"), "conflict");
assert.equal(state("extension type injury", "flexion and extension range of motion", "flexionextension"), "match");
assert.equal(state("knee pain", "extension splint for flexion contracture", "flexionextension"), "unknown");
assert.equal(state("left knee OA", "right knee arthroplasty outcomes", "laterality"), "conflict");
assert.equal(state("left knee OA", "bilateral knee OA management", "laterality"), "match");
assert.equal(state("knee OA", "left knee arthroplasty", "laterality"), "unknown");
assert.equal(state("volar wrist approach", "dorsal wrist ganglion excision", "dorsovolar"), "conflict");
assert.equal(state("proximal humerus fracture", "distal humerus fracture fixation", "proximodistal"), "conflict");
assert.equal(state("medial ankle pain", "lateral ankle ligament reconstruction", "mediolateral"), "conflict");
assert.equal(state("anterior shoulder dislocation", "posterior shoulder dislocation", "anteroposterior"), "conflict");
assert.equal(state("shoulder abduction weakness", "hip adduction contracture", "abductionadduction"), "conflict");
assert.equal(state("external rotation lag", "internal rotation deficit", "rotation"), "conflict");
assert.equal(state("forearm pronation loss", "supination strength testing", "pronationsupination"), "conflict");

// Guards against false extraction.
assert.equal(state("the right treatment for knee OA", "left knee arthroplasty", "laterality"), "unknown");
assert.equal(state("right ankle sprain", "ankle fractures left untreated do poorly", "laterality"), "unknown");
assert.equal(state("median nerve injury", "ulnar nerve transposition", "mediolateral"), "unknown");
assert.equal(state("open reduction of ankle fracture", "closed ankle fracture management", "injury_subtype"), "unknown");
assert.equal(state("L4 5mm anterolisthesis", "L5 spondylolysis", "spinal_level"), "conflict");
assert.equal(state("T2 hyperintensity on MRI", "T12 burst fracture", "spinal_level"), "unknown");
assert.equal(state("when do you pin the hip in SCFE", "posterior interosseous nerve palsy", "nerve"), "unknown");
assert.equal(state("extended deltopectoral approach", "flexion contracture release", "flexionextension"), "unknown");
assert.equal(state("chronic alcoholism and hip fracture", "acute hip fracture management", "acuity"), "unknown");
assert.equal(state("collar button abscess", "cervical spine clearance", "bone_region"), "unknown");
assert.equal(state("childhood forearm fracture", "adult forearm fracture", "population"), "conflict");
assert.equal(state("infants with hip dysplasia", "spinal cord ends at L1 in adults", "population"), "conflict");
assert.equal(state("toddler limp", "juvenile arthritis", "population"), "match");

// Hierarchies and specificity asymmetry stay compatible.
assert.equal(state("median nerve palsy", "anterior interosseous nerve syndrome", "nerve"), "match");
assert.equal(state("sciatic nerve injury", "foot drop after hip arthroplasty", "nerve"), "match");
assert.equal(state("radial nerve palsy", "median nerve laceration", "nerve"), "conflict");
assert.equal(state("which nerve do I check", "median nerve injury is most common", "nerve"), "unknown");
assert.equal(state("ankle sprain", "ATFL rupture on MRI", "ligament"), "unknown");
assert.equal(state("ankle LCL sprain", "ATFL rupture on MRI", "ligament"), "match");
assert.equal(state("thumb UCL injury", "elbow UCL reconstruction in pitchers", "ligament"), "conflict");
assert.equal(state("MCL injury", "MCL of the knee on MRI", "ligament"), "match");
assert.equal(state("L5 radiculopathy", "lumbar disc herniation", "spinal_level"), "unknown");
assert.equal(state("L4 spondylolisthesis", "L4/L5 spondylolisthesis", "spinal_level"), "match");
assert.equal(state("L4 spondylolisthesis", "L5/S1 spondylolisthesis", "spinal_level"), "conflict");
assert.equal(state("L4 spondylolisthesis", "L5 spondylolysis", "spinal_level"), "conflict");
assert.equal(state("cervical radiculopathy", "lumbar radiculopathy", "spinal_level"), "conflict");

// Regions: ambiguous long bones span both ends; specific regions pin one.
assert.equal(state("ankle fracture", "scapula fracture management", "bone_region"), "conflict");
assert.equal(state("ankle fracture", "coracoid impingement", "bone_region"), "conflict");
assert.equal(state("ankle fracture", "tibial pilon fracture fixation", "bone_region"), "match");
assert.equal(state("ankle sprain", "sesamoid stress fracture", "bone_region"), "conflict");
assert.equal(state("ankle fracture", "tibial plateau fracture fixation", "bone_region"), "conflict");
assert.equal(state("ankle fracture", "tibia and fibula fracture", "bone_region"), "match");
assert.equal(state("ankle fracture", "unlike ankle fractures, plateau fractures need CT", "bone_region"), "match");
assert.equal(state("knee pain", "tibial tubercle tenderness", "bone_region"), "match");

// Intent polarity uses text and predicate.
assert.equal(state("contraindications to ankle ORIF", "indications for ankle ORIF", "intent_polarity"), "conflict");
assert.equal(state("when is arthroplasty indicated", "arthroplasty is indicated for garden III", "intent_polarity"), "match");
assert.equal(Q("ankle ORIF", "open fracture management", "contraindication").intent_polarity.state, "unknown");
assert.equal(Q("indications for surgery", "open fracture", "contraindication").intent_polarity.state, "conflict");

// Infection: organisms oppose only when both sides specify.
assert.equal(state("pseudomonas coverage", "staph aureus coverage", "infection"), "conflict");
assert.equal(state("diabetic foot infection", "pseudomonas coverage", "infection"), "unknown");
assert.equal(state("septic knee", "aseptic loosening after TKA", "infection"), "conflict");

// Injury subtype oppositions; comminuted opposes nothing.
assert.equal(state("open tibia fracture antibiotics", "closed tibia fracture management", "injury_subtype"), "conflict");
assert.equal(state("displaced femoral neck fracture", "nondisplaced femoral neck fracture", "injury_subtype"), "conflict");
assert.equal(state("displaced fracture", "comminuted fracture fixation", "injury_subtype"), "unknown");

// Acuity, trauma, timing, approach.
assert.equal(state("acute ACL tear", "chronic ACL deficiency", "acuity"), "conflict");
assert.equal(state("traumatic shoulder dislocation", "atraumatic multidirectional instability", "trauma"), "conflict");
assert.equal(state("postop fever after TKA", "preop optimization for TKA", "surgical_timing"), "conflict");
assert.equal(state("anterior approach to the hip", "posterior approach to the hip", "approach"), "conflict");
assert.equal(state("deltopectoral approach", "anterior shoulder approach", "approach"), "match");

// Veto vs penalty sets.
assert.ok(QUALIFIER_VETO_DIMENSIONS.has("flexionextension"));
assert.ok(QUALIFIER_VETO_DIMENSIONS.has("laterality"));
assert.ok(QUALIFIER_VETO_DIMENSIONS.has("nerve"));
assert.ok(QUALIFIER_VETO_DIMENSIONS.has("spinal_level"));
assert.ok(QUALIFIER_VETO_DIMENSIONS.has("intent_polarity"));
assert.ok(!QUALIFIER_VETO_DIMENSIONS.has("bone_region"));
assert.ok(!QUALIFIER_VETO_DIMENSIONS.has("mediolateral"));
assert.equal(
  qualifierVeto(Q("flexion contracture", "extension splinting")),
  "flexionextension"
);
assert.equal(qualifierVeto(Q("ankle fracture", "tibial plateau fracture")), null);
assert.deepEqual(qualifierPenaltyDimensions(Q("ankle fracture", "tibial plateau fracture")), ["bone_region"]);

// Protection: conflicted dimensions shield their query terms from maxCov excuse.
const prot = qualifierProtectedTerms(
  Q("ankle fracture management", "tibial plateau fracture management"),
  ["ankle", "fracture", "management"],
  true
);
assert.ok(prot.includes("ankle"), `ankle protected, got ${JSON.stringify(prot)}`);
assert.ok(!prot.includes("management"));
const protMatch = qualifierProtectedTerms(
  Q("ankle fracture", "ankle fracture classification"),
  ["ankle", "fracture"],
  true
);
assert.deepEqual(protMatch, []);

// Global qualifier terms: anatomy/identity query terms are protected even
// when the candidate merely omits them (unknown), not just on conflict.
const global = qualifierQueryTerms(Q("ankle fracture management", "vertical fractures"), ["ankle", "fracture", "management"]);
assert.ok(global.includes("ankle"), `ankle globally protected, got ${JSON.stringify(global)}`);
assert.ok(!global.includes("management"));
assert.ok(!global.includes("fracture"));

// Rerank integration: veto dominates score; protection demotes the conflicted twin.
function candidate(overrides: Record<string, unknown> = {}) {
  return {
    claimId: "00000000-0000-4000-8000-000000000001",
    claimVersionId: "10000000-0000-4000-8000-000000000001",
    claimText: "Extension type supracondylar humerus fracture: check the median nerve.",
    claimType: "diagnosis",
    predicate: "states",
    trustTier: "A",
    approvalMethod: "human_review",
    reviewStatus: "approved",
    contentSource: "verified",
    poolScore: 0.5,
    channels: ["claimFts"],
    graphDistance: 0,
    components: {
      ftsRank: 2, trigram: 0.6, termCoverage: 0.8, idfCoverage: 0.7, termMatched: 3,
      phraseBonus: 1, entityScore: 0.5, relScore: 0, cardFtsRank: 1, cardCoverage: 0.5,
      modeFit: 1, facetFit: 1, trust: 0.9, importance: 0.5, qualityPenalty: 0,
    },
    ...overrides,
  } as unknown as Parameters<typeof rerankClaims>[0]["candidates"][number];
}

const vetoed = rerankClaims({
  query: "extension type supracondylar humerus fracture nerve",
  terms: ["extension", "type", "supracondylar", "humerus", "fracture", "nerve"],
  facets: ["anatomy", "complication"],
  candidates: [
    candidate({
      claimId: "00000000-0000-4000-8000-000000000002",
      claimText: "Flexion type supracondylar humerus fracture: check the ulnar nerve.",
      poolScore: 0.95,
    }),
    candidate({}),
  ],
  params: { maxClaims: 8 },
});
assert.ok(
  vetoed.dropped.some((d) => d.claimId === "00000000-0000-4000-8000-000000000002" && d.reason === "qualifier_veto:flexionextension"),
  "flexion claim vetoed despite higher pool score"
);
assert.ok(vetoed.selected.some((c) => c.claimId === "00000000-0000-4000-8000-000000000001"));

// Protection observable: identical coverage, but the region-conflicted twin scores lower.
const scored = scoreCandidates({
  query: "ankle fracture",
  terms: ["ankle", "fracture"],
  facets: [],
  candidates: [
    candidate({
      claimId: "00000000-0000-4000-8000-000000000011",
      claimText: "Tibial plateau fracture management options.",
      primaryEntityLabel: null,
    }),
    candidate({
      claimId: "00000000-0000-4000-8000-000000000012",
      claimText: "Fracture management options.",
      primaryEntityLabel: null,
    }),
  ],
  params: { ...DEFAULT_RERANK_PARAMS, minScore: Number.NEGATIVE_INFINITY },
  termIdf: [{ term: "ankle", idf: 2 }, { term: "fracture", idf: 4 }],
});
const plateau = scored.scored.find((c) => c.claimId.endsWith("11"))!;
const plain = scored.scored.find((c) => c.claimId.endsWith("12"))!;
assert.ok(
  plateau.scoreParts.topicMiss < plain.scoreParts.topicMiss,
  `protected miss must exceed: ${plateau.scoreParts.topicMiss} vs ${plain.scoreParts.topicMiss}`
);
assert.ok(plateau.finalScore < plain.finalScore, "conflicted twin ranks below the neutral twin");

// Surface evidence: keywords must include the matched surface text, not just
// the canonical label, so conflict-only protection matches surface query
// terms ("finger" protects the "finger" term even though the value is "hand").
const fingerCmp = Q("volar approach to the finger", "leg compartment release, single incision approach");
assert.ok(fingerCmp.bone_region.queryKeywords.includes("finger"), "surface 'finger' recorded");
assert.ok(fingerCmp.bone_region.queryKeywords.includes("hand"), "canonical 'hand' retained");
assert.deepEqual(
  qualifierProtectedTerms(fingerCmp, ["volar", "approach", "finger", "plan", "incision"], true).sort(),
  ["finger"],
  "conflict protects the surface anatomy term"
);
const childCmp = Q("supracondylar fracture in a child", "geriatric distal radius fracture");
assert.ok(childCmp.population.queryKeywords.includes("child"), "surface 'child' recorded");
assert.deepEqual(
  qualifierProtectedTerms(childCmp, ["supracondylar", "fracture", "child"], false).sort(),
  ["child"],
  "population conflict protects the surface term"
);
const plateauCmp = Q("tibial plateau fracture", "tibial plafond fracture");
assert.ok(plateauCmp.bone_region.queryKeywords.includes("plateau"), "surface 'plateau' recorded");
assert.ok(plateauCmp.bone_region.queryKeywords.includes("knee"), "canonical 'knee' retained");

console.log("BroBot qualifier tests passed");
