import assert from "node:assert/strict";

import {
  SEMANTIC_CLAIM_IDENTITY_VERSION,
  claimsShareSemanticFingerprint,
  clinicalClaimFingerprintHash,
  hasSemanticFingerprint,
  normalizeSemanticClaimText,
  semanticClaimFingerprintHash,
  semanticClaimFingerprintPayload,
  semanticFingerprintMatchesContent,
} from "./contracts/clinical-claim-v1";

const fp = (claimText: string, claimType = "fact", qualifiers: Record<string, string> = {}) =>
  semanticClaimFingerprintHash({ claimText, claimType, qualifiers });

// SQL/TS parity anchor: this exact payload string is duplicated in the
// claim_semantic_identity migration header. If it changes here, the SQL
// implementation must change identically.
assert.equal(
  semanticClaimFingerprintPayload({
    claimText: "Grade II Lachman translation is 5–10 mm.",
    claimType: "fact",
    qualifiers: { anatomy: "Knee" },
  }),
  "semantic=v1\nassertion=grade ii lachman translation is 5-10 mm\ntype=fact\nqualifiers=anatomy=knee",
);

// Normalization pins: entities, unicode, tags, cloze remnants, trailing dot.
assert.equal(normalizeSemanticClaimText("A  &gt;  B &amp; C"), "a > b c");
assert.equal(normalizeSemanticClaimText("&amp;lt;5"), "lt 5");
assert.equal(normalizeSemanticClaimText("10–15° of valgus"), "10-15deg of valgus");
assert.equal(normalizeSemanticClaimText("≥5 mm and ≤10 mm"), ">=5 mm and <=10 mm");
assert.equal(normalizeSemanticClaimText("<b>Medial</b> epicondyle{{c1::x}}"), "medial epicondylex");
assert.equal(normalizeSemanticClaimText("A <5 mm and >2 mm B."), "a <5 mm and >2 mm b");
assert.equal(normalizeSemanticClaimText("  Repeated   spaces. "), "repeated spaces");
// Space-before-period must not leave a trailing space (regression).
assert.equal(
  normalizeSemanticClaimText("Name the finding: SONK (spontaneous osteonecrosis of the knee)."),
  "name the finding sonk spontaneous osteonecrosis of the knee",
);

// Equivalent wording converges under normalization.
assert.equal(
  fp("Smoking increases the risk of nonunion after lumbar fusion."),
  fp("  SMOKING   increases the risk of nonunion after lumbar   fusion "),
);
assert.ok(
  claimsShareSemanticFingerprint(
    { claimText: "MRI is the best test for hip osteonecrosis.", claimType: "imaging_point" },
    { claimText: "mri is the best test for hip osteonecrosis", claimType: "imaging_point" },
  ),
);

// Honest limitation: a text hash is not a paraphrase model. True paraphrases
// stay distinct at hash identity; convergence happens at the matching layer
// (candidate review -> equivalent_to), never by silent hash collision.
assert.notEqual(
  fp("Smoking increases the risk of nonunion after lumbar fusion."),
  fp("Lumbar fusion nonunion risk is increased in smokers."),
);

// Different clinical predicates stay distinct.
assert.notEqual(fp("Smoking increases nonunion after lumbar fusion."), fp("Smoking increases infection after lumbar fusion."));

// Different directionality stays distinct.
assert.notEqual(fp("Smoking increases nonunion risk."), fp("Smoking decreases nonunion risk."));

// Different comparators stay distinct (v1 dropped < > and collided these).
assert.notEqual(fp("Fixation is needed when displacement is >5 mm."), fp("Fixation is needed when displacement is <5 mm."));
assert.notEqual(fp("Treat when angle is ≥10 degrees."), fp("Treat when angle is ≤10 degrees."));

// Different populations stay distinct.
assert.notEqual(fp("Closed treatment is preferred in pediatric patients."), fp("Closed treatment is preferred in adult patients."));

// Different anatomy stays distinct.
assert.notEqual(fp("The medial epicondyle is a posterior structure."), fp("The lateral epicondyle is a posterior structure."));

// Numeric collision regression: unrelated propositions sharing "3-5" MUST differ.
assert.notEqual(
  fp("Lachman grading: Grade 1 is 3-5 mm translation.", "fact"),
  fp("Press-fit tibial stems carry a 3-5% intraoperative fracture incidence.", "fact"),
);
assert.notEqual(
  fp("Normal carrying angle is 10-15deg of valgus.", "fact"),
  fp("CRP >10 mg per mL suggests infection.", "fact"),
);

// Source independence: the semantic input has no entity/source/algorithm
// fields, so identical assertions converge regardless of resolution origin.
assert.equal(SEMANTIC_CLAIM_IDENTITY_VERSION, "v1");
const ankiSide = { claimText: "Posterior hip dislocation risks sciatic nerve injury.", claimType: "fact", qualifiers: {} };
const obSide = { claimText: "Posterior hip dislocation risks sciatic nerve injury.", claimType: "fact", qualifiers: {} };
assert.ok(claimsShareSemanticFingerprint(ankiSide, obSide));

// Claim type participates in identity (conservative: distinct types split).
assert.notEqual(
  fp("External fixators convert to nail within 7-21 days.", "fact"),
  fp("External fixators convert to nail within 7-21 days.", "contraindication"),
);

// Qualifiers participate: same text, different identity-defining context splits.
assert.notEqual(
  fp("Closed treatment is preferred.", "fact", { age_group: "pediatric" }),
  fp("Closed treatment is preferred.", "fact", { age_group: "adult" }),
);
// Qualifier order is irrelevant; empty values are ignored.
assert.equal(
  fp("Closed treatment is preferred.", "fact", { age_group: "adult", setting: "acute" }),
  fp("Closed treatment is preferred.", "fact", { setting: "acute", age_group: "adult" }),
);
assert.equal(
  fp("Closed treatment is preferred.", "fact", { age_group: "adult", setting: "" }),
  fp("Closed treatment is preferred.", "fact", { age_group: "adult" }),
);

// Legacy v1 fingerprints are NEVER equivalence: identical v1 inputs with
// different assertions share a legacy hash but split semantically.
const legacyLeft = {
  claimType: "fact",
  primaryEntityId: "00000000-0000-4000-8000-000000000001",
  predicate: "teaches_fact",
  objectText: "3-5",
  qualifiers: {},
};
assert.equal(clinicalClaimFingerprintHash(legacyLeft), clinicalClaimFingerprintHash({ ...legacyLeft }));
assert.notEqual(
  fp("Lachman grading: Grade 1 is 3-5 mm translation."),
  fp("Press-fit tibial stems carry a 3-5% intraoperative fracture incidence."),
);

// Record helpers.
assert.equal(
  hasSemanticFingerprint({ semanticIdentityVersion: "v1", semanticFingerprintHash: "0".repeat(64) }),
  true,
);
assert.equal(hasSemanticFingerprint({ semanticFingerprintHash: "xyz" }), false);
assert.equal(hasSemanticFingerprint({}), false);
const recorded = {
  claimText: "MRI is the best test for hip osteonecrosis.",
  claimType: "imaging_point",
  qualifiers: {},
  semanticIdentityVersion: "v1",
  semanticFingerprintHash: fp("MRI is the best test for hip osteonecrosis.", "imaging_point"),
};
assert.equal(semanticFingerprintMatchesContent(recorded), true);
assert.equal(semanticFingerprintMatchesContent({ ...recorded, claimText: "CT is the best test." }), false);
assert.equal(semanticFingerprintMatchesContent({ ...recorded, semanticIdentityVersion: "v9" }), false);

console.log("claim-semantic-identity.test.ts: all assertions passed");
