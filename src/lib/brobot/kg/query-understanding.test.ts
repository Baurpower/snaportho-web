import assert from "node:assert/strict";
import {
  buildQueryUnderstanding,
  MEDICAL_STOP_WORDS,
  normalizeRetrievalText,
  tokenizeRetrievalText,
} from "@/lib/brobot/kg/query-understanding";
import { expandAbbreviation, findAbbreviations } from "@/lib/brobot/kg/abbreviations";
import type { BroBotChatIntent, BroBotClinicalContext } from "@/lib/brobot/chat/types";

const baseIntent = (overrides: Partial<BroBotChatIntent> = {}): BroBotChatIntent => ({
  mode: "consult",
  subintent: "initial_consult",
  procedureCategory: "general_topic",
  procedureOrTopic: "",
  ambiguity: "low",
  assumedContext: "",
  missingContext: [],
  clarifyingQuestions: [],
  confidence: 0.9,
  ...overrides,
});

const baseContext = (overrides: Partial<BroBotClinicalContext> = {}): BroBotClinicalContext => ({
  entities: {},
  caseSlots: {},
  taskFacets: [],
  missingCriticalSlots: [],
  coverageRequirements: [],
  ...overrides,
});

// Abbreviation expansion: required standard mappings.
assert.deepEqual([...expandAbbreviation("ACL")], ["anterior cruciate ligament"]);
assert.deepEqual([...expandAbbreviation("ctr")], ["carpal tunnel release"]);
assert.deepEqual([...expandAbbreviation("ORIF")], ["open reduction internal fixation"]);
assert.deepEqual([...expandAbbreviation("SCFE")], ["slipped capital femoral epiphysis"]);
assert.deepEqual([...expandAbbreviation("TCL")], ["transverse carpal ligament"]);
assert.deepEqual(expandAbbreviation("ZZZ"), []);

// Finder is case-insensitive for 3+ letters and word-boundaried.
const found = findAbbreviations("ACL reconstruction vs ACLR recovery");
assert.ok(found.some((entry) => entry.abbreviation === "ACL"));
assert.ok(!findAbbreviations("place the plate").some((entry) => entry.abbreviation === "ACE"));

// Two-letter forms match uppercase only (lowercase collides with English words).
assert.ok(findAbbreviations("rule out ON of the femoral head").some((entry) => entry.abbreviation === "ON"));
assert.ok(!findAbbreviations("rely on fixation for stability").some((entry) => entry.abbreviation === "ON"));
assert.ok(!findAbbreviations("tell us about complications").some((entry) => entry.abbreviation === "US"));
assert.ok(findAbbreviations("bedside US shows effusion").some((entry) => entry.abbreviation === "US"));

// Ambiguous hand abbreviations (PIN/AIN/IP) expand only when uppercase.
const pinLower = buildQueryUnderstanding({
  message: "When do you pin the other hip in SCFE?",
  intent: baseIntent({ mode: "oite", subintent: "overview", procedureOrTopic: "SCFE" }),
  clinicalContext: baseContext(),
});
assert.ok(!pinLower.expansions.some((entry) => entry.abbreviation === "PIN"));
assert.ok(pinLower.expansions.some((entry) => entry.abbreviation === "SCFE"));
const pinUpper = buildQueryUnderstanding({
  message: "PIN palsy after Monteggia fracture?",
  intent: baseIntent({ mode: "consult", subintent: "urgent_red_flags", procedureOrTopic: "" }),
  clinicalContext: baseContext(),
});
assert.ok(pinUpper.expansions.some((entry) => entry.abbreviation === "PIN"));
assert.ok(!buildQueryUnderstanding({
  message: "Explain the Garden classification",
  intent: baseIntent({ procedureOrTopic: "" }),
  clinicalContext: baseContext(),
}).expansions.some((entry) => entry.abbreviation === "AIN"));

// Normalization preserves clinical tokens, strips punctuation.
assert.equal(normalizeRetrievalText("Garden Classification: Type II/III?"), "garden classification type ii/iii");
assert.deepEqual(tokenizeRetrievalText("  Ankle   fracture! "), ["ankle", "fracture"]);

// Stop words remove function words but keep clinical vocabulary.
for (const word of ["the", "what", "tomorrow", "please"]) assert.ok(MEDICAL_STOP_WORDS.has(word));
for (const word of ["fracture", "pain", "nerve", "displaced", "acute"]) assert.ok(!MEDICAL_STOP_WORDS.has(word));

// Query understanding: original wording preserved, variants deterministic.
const first = buildQueryUnderstanding({
  message: "What are the indications for ACL reconstruction?",
  intent: baseIntent({ mode: "clinic", subintent: "indications", procedureOrTopic: "ACL reconstruction" }),
  clinicalContext: baseContext({ taskFacets: ["indications"] }),
});
const second = buildQueryUnderstanding({
  message: "What are the indications for ACL reconstruction?",
  intent: baseIntent({ mode: "clinic", subintent: "indications", procedureOrTopic: "ACL reconstruction" }),
  clinicalContext: baseContext({ taskFacets: ["indications"] }),
});
assert.deepEqual(first, second);
assert.equal(first.primaryQuery, "What are the indications for ACL reconstruction?");
assert.ok(first.variants.some((variant) => variant.includes("anterior cruciate ligament")));
assert.ok(first.terms.includes("acl") || first.terms.includes("anterior"));
assert.ok(!first.terms.includes("what") && !first.terms.includes("the"));
assert.ok(first.facets.includes("indication"));
assert.ok(first.expansions.some((entry) => entry.abbreviation === "ACL"));
assert.equal(first.usedContext, true); // procedureOrTopic contributed

// Singular/plural collapse: fractures <-> fracture.
const plural = buildQueryUnderstanding({
  message: "ankle fractures classification",
  intent: baseIntent({ procedureOrTopic: "" }),
  clinicalContext: baseContext(),
});
assert.ok(plural.variants.some((variant) => variant.includes("ankle fracture")));
assert.equal(plural.usedContext, false);

// Facets derive from subintent + task facets + mode.
const orPrep = buildQueryUnderstanding({
  message: "Distal radius ORIF tomorrow. Key exposure, anatomy, and decisions?",
  intent: baseIntent({ mode: "or_prep", subintent: "surgical_approach", procedureOrTopic: "distal radius ORIF" }),
  clinicalContext: baseContext({ taskFacets: ["exposure", "anatomy"] }),
});
for (const facet of ["exposure", "anatomy"]) assert.ok(orPrep.facets.includes(facet as never));
assert.ok(orPrep.variants.some((variant) => variant.includes("open reduction internal fixation")));

// Bounds hold on adversarial input.
const adversarial = buildQueryUnderstanding({
  message: `${"fracture ".repeat(400)}ACL CTR ORIF SCFE DRUJ THA TKA AVN PJI DVT`,
  intent: baseIntent(),
  clinicalContext: baseContext(),
});
assert.ok(adversarial.primaryQuery.length <= 500);
assert.ok(adversarial.variants.length <= 12);
assert.ok(adversarial.terms.length <= 24);

console.log("BroBot query understanding tests passed");
