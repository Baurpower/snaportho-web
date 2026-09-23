import assert from "node:assert/strict";

import * as contract from "./clinical-claim-v1";

const entity = "1ad8280b-74e5-416c-b8fb-06c7d9cc0d0a";
const ids = {
  claim: "11111111-1111-4111-8111-111111111111",
  version: "22222222-2222-4222-8222-222222222222",
  card: "33333333-3333-4333-8333-333333333333",
  cardVersion: "44444444-4444-4444-8444-444444444444",
};

const cupCage = {
  claimType: "treatment_indication",
  primaryEntityId: entity,
  predicate: "preferred_reconstruction",
  objectText: "cup-cage reconstruction",
  qualifiers: { anatomy: "pelvis", setting: "revision THA" },
};

assert.equal(
  contract.clinicalClaimFingerprintHash(cupCage),
  contract.clinicalClaimFingerprintHash({
    claimType: "Treatment_Indication",
    primaryEntityId: entity.toUpperCase(),
    predicate: "Preferred Reconstruction",
    objectText: "Cup-cage reconstruction.",
    qualifiers: { setting: "revision THA", anatomy: "Pelvis" },
  }),
);

assert.equal(
  contract.clinicalClaimFingerprintPayload(cupCage),
  [
    "type=treatment indication",
    `entity=${entity}`,
    "predicate=preferred reconstruction",
    "object=cup-cage reconstruction",
    "qualifiers=anatomy=pelvis;setting=revision tha",
  ].join("\n"),
);

const arteryInjury = {
  claimType: "complication",
  primaryEntityId: entity,
  predicate: "complication_of",
  objectText: "popliteal artery injury",
  qualifiers: { procedure: "revision THA" },
};
const arteryPosition = {
  ...arteryInjury,
  objectText: "popliteal artery position during TKA",
  qualifiers: { procedure: "TKA" },
};
assert.equal(contract.claimsShareFingerprint(arteryInjury, arteryInjury), true);
assert.equal(contract.claimsShareFingerprint(arteryInjury, arteryPosition), false);

assert.equal(contract.clinicalClaimQualifiersAreValid({ anatomy: "pelvis" }), true);
assert.equal(contract.clinicalClaimQualifiersAreValid({ unknown: "x" }), false);
assert.equal(contract.clinicalClaimQualifiersAreValid({ stem: "forbidden" }), false);
assert.equal(contract.containsProtectedEducationalContent({ nested: { explanation: "no" } }), true);
assert.equal(contract.containsProtectedEducationalContent({ evidenceLocator: "preferred-response section" }), false);

const claim = {
  contractVersion: contract.CLINICAL_CLAIM_CONTRACT_VERSION,
  claimId: ids.claim,
  currentVersionId: ids.version,
  fingerprintHash: contract.clinicalClaimFingerprintHash(cupCage),
  claimText: "Cup-cage reconstruction is preferred for pelvic discontinuity in revision THA.",
  claimType: "treatment_indication",
  predicate: cupCage.predicate,
  objectText: cupCage.objectText,
  qualifiers: cupCage.qualifiers,
  primaryEntityId: entity,
  approvalMethod: "machine_consensus",
  algorithmVersion: "card-claim-factory.v1",
  isActive: true,
};
assert.equal(contract.isClinicalClaimRecordV1(claim), true);
assert.equal(contract.isClinicalClaimRecordV1({ ...claim, fingerprintHash: "a".repeat(64) }), false);
assert.equal(contract.isClinicalClaimRecordV1({ ...claim, explanation: "protected" }), false);

const cardLink = {
  contractVersion: contract.CLINICAL_CLAIM_CONTRACT_VERSION,
  canonicalCardId: ids.card,
  canonicalCardVersionId: ids.cardVersion,
  claimId: ids.claim,
  claimVersionId: ids.version,
  mappingRole: "teaches",
  confidence: 0.97,
  approvalMethod: "machine_consensus",
  reviewStatus: "auto_approved",
  algorithmVersion: "card-claim-factory.v1",
  evidenceLocator: "cloze",
  evidenceHashes: ["b".repeat(64)],
  reasonCodes: ["atomic_card", "unique_entity"],
  metadata: { factoryRun: "dry" },
  isActive: true,
};
assert.equal(contract.isCardClaimLinkV1(cardLink), true);
assert.equal(contract.isCardClaimLinkV1({ ...cardLink, mappingRole: "tests" }), false);
assert.equal(contract.isCardClaimLinkV1({ ...cardLink, evidenceLocator: "<p>cloze</p>" }), false);

const questionLink = {
  contractVersion: contract.CLINICAL_CLAIM_CONTRACT_VERSION,
  provider: "orthobullets",
  nativeQuestionId: "210136",
  externalQuestionId: null,
  claimId: ids.claim,
  claimVersionId: ids.version,
  mappingRole: "tests_primary",
  confidence: 0.96,
  approvalMethod: "machine_consensus",
  reviewStatus: "auto_approved",
  algorithmVersion: "claim-overlap.v1",
  evidenceLocator: "preferred-response section",
  sourceFingerprintHash: "c".repeat(64),
  evidenceHashes: [],
  reasonCodes: ["unique_fingerprint"],
  metadata: {},
  isActive: true,
};
assert.equal(contract.isQuestionClaimLinkV1(questionLink), true);
assert.equal(contract.isQuestionClaimLinkV1({ ...questionLink, provider: "anki" }), false);
assert.equal(contract.isQuestionClaimLinkV1({ ...questionLink, stem: "no" }), false);

const gap = {
  contractVersion: contract.CLINICAL_CLAIM_CONTRACT_VERSION,
  gapClass: "missing_card",
  owner: "editorial",
  disposition: "open",
  priorityScore: 80,
  claimId: ids.claim,
  claimVersionId: ids.version,
  canonicalCardId: null,
  provider: "orthobullets",
  nativeQuestionId: "210136",
  algorithmVersion: "claim-overlap.v1",
  reasonCodes: ["no_adequate_card"],
  metadata: {},
  isActive: true,
};
assert.equal(contract.isEducationalClaimGapV1(gap), true);
assert.equal(contract.isEducationalClaimGapV1({ ...gap, claimId: null }), false);
assert.equal(contract.isEducationalClaimGapV1({
  ...gap,
  gapClass: "weak_card",
  canonicalCardId: null,
}), false);
assert.equal(contract.isEducationalClaimGapV1({
  ...gap,
  gapClass: "source_extraction_gap",
  owner: "extension",
  claimId: null,
  claimVersionId: null,
}), true);

console.log("clinical-claim-v1.test.ts: all assertions passed");
