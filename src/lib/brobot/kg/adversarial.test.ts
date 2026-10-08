import assert from "node:assert/strict";
import { rerankClaims, DEFAULT_RERANK_PARAMS } from "@/lib/brobot/kg/rerank";
import type { BroBotQualifierDimension } from "@/lib/brobot/kg/qualifiers";

/**
 * Adversarial qualifier pairs: minimal clinical wording changes that must
 * alter retrieval. All claim texts are real corpus claims (IDs + predicates
 * as stored). The contradictory claim always gets the STRONGER pool score
 * and richer text components, proving qualifier logic dominates similarity.
 */
type Pair = {
  name: string;
  queryA: string;
  termsA: string[];
  queryB: string;
  termsB: string[];
  claimA: { id: string; text: string; predicate: string };
  claimB: { id: string; text: string; predicate: string };
  /** Veto dimension, or null when the pair expects penalty-grade demotion. */
  vetoDim: BroBotQualifierDimension | null;
  facets?: Array<"complication">;
};

function candidate(
  id: string,
  text: string,
  predicate: string,
  poolScore: number,
  ftsRank: number,
  facetFit = 1
) {
  return {
    claimId: id,
    claimVersionId: `v-${id.slice(0, 8)}`,
    claimText: text,
    claimType: "fact",
    predicate,
    trustTier: "A",
    approvalMethod: "human_review",
    reviewStatus: "approved",
    contentSource: "verified",
    poolScore,
    channels: ["claimFts"],
    graphDistance: 0,
    mentionCoherence: "none",
    primaryEntityLabel: null,
    components: {
      ftsRank, trigram: 0.7, termCoverage: 0.85, idfCoverage: 0.75, termMatched: 3,
      phraseBonus: 1, entityScore: 0.6, relScore: 0, cardFtsRank: 2, cardCoverage: 0.6,
      modeFit: 1, facetFit, trust: 0.9, importance: 0.5, qualityPenalty: 0,
    },
  } as unknown as Parameters<typeof rerankClaims>[0]["candidates"][number];
}

const PAIRS: Pair[] = [
  {
    name: "flexion-vs-extension",
    queryA: "extension type supracondylar humerus fracture nerve",
    termsA: ["extension", "type", "supracondylar", "humerus", "fracture", "nerve"],
    queryB: "flexion type supracondylar humerus fracture nerve",
    termsB: ["flexion", "type", "supracondylar", "humerus", "fracture", "nerve"],
    claimA: { id: "cd17f585-4f1d-41b2-8498-ac426fa614d5", text: "The most common neurologic injury with extension type supracondylar humerus fractures is AIN palsy.", predicate: "complication_of" },
    claimB: { id: "1d410367-767f-4ad2-82ad-f943d1fd6788", text: "The most common neurologic injury seen with flexion type supracondylar humerus fractures is Ulnar nerve palsy.", predicate: "teaches_fact" },
    vetoDim: "flexionextension",
  },
  {
    name: "dorsal-vs-volar",
    queryA: "dorsal wrist mass diagnosis",
    termsA: ["dorsal", "wrist", "mass", "diagnosis"],
    queryB: "volar wrist scaphoid exam",
    termsB: ["volar", "wrist", "scaphoid", "exam"],
    claimA: { id: "d50e78e8-833b-46a2-8783-671852cfecfb", text: "Patient presents with synovial fluid-filled cyst arising from the dorsal wrist joint. Diagnosis: Ganglion cyst.", predicate: "teaches_fact" },
    claimB: { id: "fc0d6e68-b2ce-48d4-899c-968e027aa027", text: "How is the Watson test performed: Volar pressure over the distal scaphoid while the wrist is taken from ulnar to radial deviation.", predicate: "teaches_fact" },
    vetoDim: "dorsovolar",
  },
  {
    name: "medial-vs-lateral",
    queryA: "medial ankle pulse examination",
    termsA: ["medial", "ankle", "pulse", "examination"],
    queryB: "lateral ankle nerve course",
    termsB: ["lateral", "ankle", "nerve", "course"],
    claimA: { id: "9ae8d4df-6ab6-4968-8d34-3916b3bd3b7b", text: "Pulse from the posterior tibial artery is palpable between the flexor digitorum longus and flexor hallicus longus tendons posterior to the medial malleolus.", predicate: "teaches_fact" },
    claimB: { id: "6c8e784e-0d8f-47bf-8fca-7749769f0707", text: "The superficial peroneal nerve runs in the lateral compartment of the leg and crosses anteriorly 12 cm above the lateral malleolus.", predicate: "teaches_fact" },
    vetoDim: null,
  },
  {
    name: "L4-vs-L5",
    queryA: "L4 radiculopathy findings",
    termsA: ["l4", "radiculopathy", "findings"],
    queryB: "L5 nerve root spondylolysis symptoms",
    termsB: ["l5", "nerve", "root", "spondylolysis", "symptoms"],
    claimA: { id: "8e76a7aa-0255-4658-8bdb-9b68e4e0db76", text: "L4 radiculopathy:.", predicate: "teaches_fact" },
    claimB: { id: "9c93712b-a5ea-4b30-8956-0d98aa5b1762", text: "Three (3) presenting symptoms for spondylolysis: Radicular pain (L5 nerve root).", predicate: "teaches_fact" },
    vetoDim: "spinal_level",
  },
  {
    name: "radial-vs-median-nerve",
    queryA: "radial nerve injury with extension supracondylar fracture",
    termsA: ["radial", "nerve", "injury", "extension", "supracondylar", "fracture"],
    queryB: "median nerve injury with extension supracondylar fracture",
    termsB: ["median", "nerve", "injury", "extension", "supracondylar", "fracture"],
    claimA: { id: "cf2bd5d0-9a5d-44eb-8c36-577d7a222dff", text: "The second most common neurologic injury associated with extension type supracondylar humerus fractures is Radial nerve palsy.", predicate: "complication_of" },
    claimB: { id: "cd17f585-4f1d-41b2-8498-ac426fa614d5", text: "The most common neurologic injury with extension type supracondylar humerus fractures is AIN palsy.", predicate: "complication_of" },
    vetoDim: "nerve",
  },
  {
    name: "adult-vs-pediatric",
    queryA: "adult spinal cord level anatomy",
    termsA: ["adult", "spinal", "cord", "level", "anatomy"],
    queryB: "adolescent hip SCFE risk factors",
    termsB: ["adolescent", "hip", "scfe", "risk", "factors"],
    claimA: { id: "bafdbd41-e3bb-4efe-89f0-7685464cf0b7", text: "At L1 level does the spinal cord end in adults.", predicate: "teaches_fact" },
    claimB: { id: "1f777b47-b3df-4f68-891c-6add03da276b", text: "The types of patients at a higher risk for SCFE are Obese adolescent boys.", predicate: "teaches_fact" },
    vetoDim: "population",
  },
  {
    name: "indication-vs-contraindication",
    queryA: "Is bracing indicated in congenital scoliosis?",
    termsA: ["bracing", "indicated", "congenital", "scoliosis"],
    queryB: "Is radial nerve palsy a contraindication to functional bracing?",
    termsB: ["radial", "nerve", "palsy", "contraindication", "functional", "bracing"],
    claimA: { id: "165cb669-ebac-4053-8390-164b8091b441", text: "Is bracing indicated in the primary treatment of congenital scoliosis: No.", predicate: "indication" },
    claimB: { id: "864effd8-f575-41b5-86c4-c2728b20bee9", text: "Is a radial nerve palsy a contraindication to functional bracing: No.", predicate: "contraindication" },
    vetoDim: "intent_polarity",
  },
  {
    name: "anterior-vs-posterior-approach",
    queryA: "anterior approach to the hip anatomy",
    termsA: ["anterior", "approach", "hip", "anatomy"],
    queryB: "posterior approach to the hip steps",
    termsB: ["posterior", "approach", "hip", "steps"],
    claimA: { id: "7d418ae0-6af7-4dd8-81e8-30187b819ae5", text: "During the anterior approach to the hip , the encountered between the sartorius and tensor fascia latae is Ascending branches of the lateral femoral circumflex vessels.", predicate: "teaches_fact" },
    claimB: { id: "0900c33a-59f3-4ae0-89fe-e0b4ba21d312", text: "The steps involved in the posterior (Southern-Moore) approach to the hip are 1) Split the gluteus maximus (inferior gluteal nerve).", predicate: "teaches_fact" },
    vetoDim: null,
  },
  {
    name: "acute-vs-chronic",
    queryA: "acute compartment syndrome treatment",
    termsA: ["acute", "compartment", "syndrome", "treatment"],
    queryB: "chronic ankle instability hindfoot",
    termsB: ["chronic", "ankle", "instability", "hindfoot"],
    claimA: { id: "74806fa1-0b60-4892-8788-56aac7b06226", text: "The treatment for acute compartment syndrome is Emergent Fasciotomy.", predicate: "indication" },
    claimB: { id: "bf20ba44-b18f-4629-8a3b-33bf6c235918", text: "Patients with chronic ankle instability due to chronic lateral ligament instability have a varus hindfoot .", predicate: "complication_of" },
    vetoDim: null,
  },
  {
    name: "preop-vs-postop",
    queryA: "preoperative imaging for intertrochanteric fracture",
    termsA: ["preoperative", "imaging", "intertrochanteric", "fracture"],
    queryB: "postoperative x-rays femoral shaft fracture",
    termsB: ["postoperative", "xrays", "femoral", "shaft", "fracture"],
    claimA: { id: "2e3b8ebb-2aed-478c-88e4-0c3c45a808b2", text: "Full length femur x-ray must be obtained preoperatively for intertrochanteric femur fractures.", predicate: "imaging_finding" },
    claimB: { id: "6a2eafd7-3bd9-4ea3-89ad-342cc63e9e7b", text: "The four imaging modalities that should be performed to rule out an ipsilateral femoral neck fracture in a patient with a femoral shaft fracture are Postoperative AP and lateral x-rays.", predicate: "imaging_finding" },
    vetoDim: null,
  },
];

function runSide(
  pair: Pair,
  side: "A" | "B"
): { selected: string[]; drops: Array<{ claimId: string; reason: string }>; parts: Map<string, Record<string, number>> } {
  const correct = side === "A" ? pair.claimA : pair.claimB;
  const wrong = side === "A" ? pair.claimB : pair.claimA;
  const query = side === "A" ? pair.queryA : pair.queryB;
  const terms = side === "A" ? pair.termsA : pair.termsB;
  const out = rerankClaims({
    query,
    terms,
    facets: pair.facets ?? [],
    candidates: [
      candidate(correct.id, correct.text, correct.predicate, 0.5, 4),
      // The contradictory claim gets the stronger pool/components: only the
      // qualifier logic may save the correct claim.
      candidate(wrong.id, wrong.text, wrong.predicate, 0.95, 6),
    ],
    termIdf: terms.map((term) => ({ term, idf: 3 })),
    params: { maxClaims: 2 },
  });
  return {
    selected: out.selected.map((c) => c.claimId),
    drops: out.dropped.map((d) => ({ claimId: d.claimId, reason: d.reason })),
    parts: new Map(out.selected.map((c) => [c.claimId, c.scoreParts])),
  };
}

for (const pair of PAIRS) {
  const sideA = runSide(pair, "A");
  const sideB = runSide(pair, "B");
  if (pair.vetoDim) {
    // Veto pairs: the contradictory claim is excluded on both phrasings.
    assert.deepEqual(sideA.selected, [pair.claimA.id], `${pair.name}: A side selects A`);
    assert.deepEqual(sideB.selected, [pair.claimB.id], `${pair.name}: B side selects B`);
    assert.ok(
      sideA.drops.some((d) => d.claimId === pair.claimB.id && d.reason === `qualifier_veto:${pair.vetoDim}`),
      `${pair.name}: B vetoed on A phrasing`
    );
    assert.ok(
      sideB.drops.some((d) => d.claimId === pair.claimA.id && d.reason === `qualifier_veto:${pair.vetoDim}`),
      `${pair.name}: A vetoed on B phrasing`
    );
  } else {
    // Penalty pairs: both may serve, but the correct claim ranks first and
    // the contradictory claim carries the conflict factor.
    assert.equal(sideA.selected[0], pair.claimA.id, `${pair.name}: A side ranks A first`);
    assert.equal(sideB.selected[0], pair.claimB.id, `${pair.name}: B side ranks B first`);
    const wrongPartsA = sideA.parts.get(pair.claimB.id);
    const wrongPartsB = sideB.parts.get(pair.claimA.id);
    assert.equal(wrongPartsA?.qualifierConflictFactor, DEFAULT_RERANK_PARAMS.qualifierConflictFactor, `${pair.name}: B penalized on A phrasing`);
    assert.equal(wrongPartsB?.qualifierConflictFactor, DEFAULT_RERANK_PARAMS.qualifierConflictFactor, `${pair.name}: A penalized on B phrasing`);
  }
  assert.notDeepEqual(sideA.selected, sideB.selected, `${pair.name}: packets differ across phrasings`);
}

// Observed-failure regressions (historical holdout cases).
{
  // Forearm fasciotomy: the finger-approach hard negative is region-penalized
  // and ranks below the forearm answer despite stronger pool/components.
  const out = rerankClaims({
    query: "Which incisions decompress the volar and dorsal forearm compartments?",
    terms: ["incisions", "decompress", "volar", "dorsal", "forearm", "compartments"],
    facets: [],
    candidates: [
      candidate("d6d10654-77dd-4860-8ce3-a7f7cad63310", "Longitudinal incisions over the 2nd and 4th metacarpals decompress the volar/dorsal interossei and adductor compartments.", "teaches_fact", 0.5, 4),
      candidate("6ca78672-1772-447d-8fbe-067dc6437807", "When making a volar approach to finger, it is important to make a \"zigzag\" incision connecting the finger creases.", "teaches_fact", 0.95, 6),
    ],
    termIdf: ["incisions", "decompress", "volar", "dorsal", "forearm", "compartments"].map((term) => ({ term, idf: 3 })),
    params: { maxClaims: 2 },
  });
  assert.equal(out.selected[0]?.claimId, "d6d10654-77dd-4860-8ce3-a7f7cad63310");
  const hn = out.selected.find((c) => c.claimId === "6ca78672-1772-447d-8fbe-067dc6437807");
  assert.equal(hn?.scoreParts.qualifierConflictFactor, DEFAULT_RERANK_PARAMS.qualifierConflictFactor);
}
{
  // Pavlik complications: the initial-treatment hard negative ranks below
  // every expected complications claim under a complication facet ask.
  const expected = [
    "The complication seen with pavlik harnesses applied in too much abduction is Femoral head AVN if >60° of abduction.",
    "The complications (2) seen with Pavlik harnesses applied in too much flexion are Transient femoral nerve palsy if flexed >100°.",
    "The complications (2) seen with Pavlik harnesses applied in too much flexion are Inferior subluxation of the femoral head.",
  ];
  const out = rerankClaims({
    query: "Pavlik harness complications counsel parents",
    terms: ["pavlik", "harness", "complications", "counsel", "parents"],
    facets: ["complication", "prognosis", "anatomy"],
    candidates: [
      ...expected.map(
        (text, i) =>
          candidate(`a0000000-0000-4000-8000-00000000000${i + 1}`, text, "complication_of", 0.5, 4, 0.3)
      ),
      candidate("57bd2937-314e-44d6-81ad-b9b4ce1f965d", "The initial treatment of Developmental Dysplasia of the Hip for a patient <6 months old is Pavlik harness.", "teaches_fact", 0.95, 6, 0.3),
    ],
    termIdf: ["pavlik", "harness", "complications", "counsel", "parents"].map((term) => ({ term, idf: 3 })),
    params: { maxClaims: 4 },
  });
  const order = out.selected.map((c) => c.claimId);
  const hnRank = order.indexOf("57bd2937-314e-44d6-81ad-b9b4ce1f965d");
  assert.ok(hnRank === -1 || hnRank === order.length - 1, `pavlik HN ranked last or cut, got ${hnRank} of ${order.length}`);
}

console.log("BroBot adversarial qualifier tests passed");
