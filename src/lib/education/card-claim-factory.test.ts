import assert from "node:assert/strict";

import {
  autoApprovePolicy,
  extractQualifiers,
  extractTargetCloze,
  inferClaimType,
  opposingPolarity,
  runCardClaimFactory,
  toDeclarativeClaimText,
  type CardClaimFactoryCard,
} from "./card-claim-factory";
import { canonicalContentHash, type EntityIndexRow } from "./deck-semantic-mapping";

const id = (digit: string) =>
  `${digit.repeat(8)}-${digit.repeat(4)}-4${digit.repeat(3)}-8${digit.repeat(3)}-${digit.repeat(12)}`;

const entities: EntityIndexRow[] = [
  {
    id: id("3"),
    preferredLabel: "Pelvic discontinuity",
    normalizedLabel: "pelvic discontinuity",
    entityType: "condition",
    aliases: [],
    sourceAliases: [],
    active: true,
    lifecycleStatus: "canonical",
  },
  {
    id: id("4"),
    preferredLabel: "Talus fracture",
    normalizedLabel: "talus fracture",
    entityType: "condition",
    aliases: [],
    sourceAliases: [],
    active: true,
    lifecycleStatus: "canonical",
  },
  {
    id: id("5"),
    preferredLabel: "Achilles tendon",
    normalizedLabel: "achilles tendon",
    entityType: "anatomy_structure",
    aliases: ["calcaneal tendon"],
    sourceAliases: [],
    active: true,
    lifecycleStatus: "canonical",
  },
];

function makeCard(input: {
  digit: string;
  versionDigit: string;
  ordinal: number;
  noteGuid: string;
  text: string;
  extra?: string;
  active?: boolean;
  currentVersion?: boolean;
  inclusionStatus?: CardClaimFactoryCard["inclusionStatus"];
}): CardClaimFactoryCard {
  const fields = [
    { name: "Text", rawValue: input.text, plainText: input.text.replace(/\{\{c\d+::([^{}]*?)(?:::[^{}]*?)?\}\}/gi, "$1") },
    { name: "Extra", rawValue: input.extra ?? "", plainText: input.extra ?? "" },
  ];
  const seed = { fields, tags: ["recon"], cardOrdinal: input.ordinal };
  return {
    canonicalCardId: id(input.digit),
    canonicalCardVersionId: id(input.versionDigit),
    noteGuid: input.noteGuid,
    cardOrdinal: input.ordinal,
    contentHash: canonicalContentHash(seed),
    tags: seed.tags,
    fields,
    active: input.active ?? true,
    currentVersion: input.currentVersion ?? true,
    inclusionStatus: input.inclusionStatus ?? "included",
  };
}

const cloze = extractTargetCloze(
  "The preferred reconstruction for pelvic discontinuity is {{c1::cup-cage reconstruction}}.",
  0,
);
assert.equal(cloze?.answer, "cup-cage reconstruction");
assert.match(cloze?.filledText ?? "", /cup-cage reconstruction/);
assert.equal(extractTargetCloze("{{c1::one}} and {{c2::two}}", 1)?.answer, "two");
assert.equal(extractTargetCloze("{{c1::one}}", 1), null);

assert.equal(extractQualifiers("left revision THA").qualifiers.laterality, "left");
assert.equal(extractQualifiers("left revision THA").qualifiers.setting, "revision");
assert.ok(extractQualifiers("left and right injury").conflicts.includes("laterality_conflict"));
assert.equal(inferClaimType({ filledText: "cup-cage is preferred", entityType: "condition" }).claimType, "treatment_indication");
assert.equal(inferClaimType({ filledText: "this is contraindicated", entityType: "procedure" }).claimType, "contraindication");
assert.equal(inferClaimType({
  filledText: "What radiograph should be obtained for the femur? Traction view",
  entityType: "anatomy_structure",
}).claimType, "imaging_point");
assert.equal(
  toDeclarativeClaimText(
    "What radiograph should be obtained to better delineate the fracture pattern in intertrochanteric femur fractures? Traction view",
    "Traction view",
  ),
  "Traction view should be obtained to better delineate the fracture pattern in intertrochanteric femur fractures.",
);
assert.equal(
  toDeclarativeClaimText(
    "A LRINEC score of what indicates a 92% positive predictive value of having necrotizing fasciitis? ≥6",
    "≥6",
  ),
  "A LRINEC score of ≥6 indicates a 92% positive predictive value of having necrotizing fasciitis.",
);
assert.equal(opposingPolarity("preferred_treatment", "contraindication"), true);
assert.equal(opposingPolarity("teaches_fact", "teaches_fact"), false);

const policyInput = {
  criticsSupport: true,
  uniqueEntity: true,
  atomic: true,
  currentAndActive: true,
  contradiction: false,
  duplicateSibling: false,
  qualifierConflict: false,
  extracted: true,
};
assert.equal(autoApprovePolicy(policyInput).approved, true);
assert.equal(autoApprovePolicy({ ...policyInput, extracted: false }).queue, "extraction_failed");
assert.equal(autoApprovePolicy({ ...policyInput, duplicateSibling: true }).queue, "duplicate_sibling");

const atomic = makeCard({
  digit: "1",
  versionDigit: "2",
  ordinal: 0,
  noteGuid: "guid-atomic",
  text: "The preferred reconstruction for pelvic discontinuity is {{c1::cup-cage reconstruction}}.",
});
const negated = makeCard({
  digit: "6",
  versionDigit: "7",
  ordinal: 0,
  noteGuid: "guid-negated",
  text: "There is no talus fracture after {{c1::talus fracture}} injury.",
});
const siblingA = makeCard({
  digit: "8",
  versionDigit: "9",
  ordinal: 0,
  noteGuid: "guid-sibling",
  text: "{{c1::cup-cage reconstruction}} is preferred for pelvic discontinuity and {{c2::cup-cage reconstruction}} remains preferred.",
});
const siblingB = makeCard({
  digit: "a",
  versionDigit: "b",
  ordinal: 1,
  noteGuid: "guid-sibling",
  text: "{{c1::cup-cage reconstruction}} is preferred for pelvic discontinuity and {{c2::cup-cage reconstruction}} remains preferred.",
});
const missing = makeCard({
  digit: "c",
  versionDigit: "d",
  ordinal: 0,
  noteGuid: "guid-missing",
  text: "The obscure unlisted condition is treated with {{c1::observation}}.",
});
const nonAtomic = makeCard({
  digit: "e",
  versionDigit: "0",
  ordinal: 0,
  noteGuid: "guid-non-atomic",
  text: "Pelvic discontinuity with talus fracture and achilles tendon {{c1::combined}} injury.",
  extra: "Pelvic discontinuity. Talus fracture. Achilles tendon.",
});

const run = runCardClaimFactory({ cards: [atomic, negated, siblingA, siblingB, missing, nonAtomic], entities });
const again = runCardClaimFactory({ cards: [atomic, negated, siblingA, siblingB, missing, nonAtomic], entities });
assert.equal(run.factoryRunId, again.factoryRunId);
assert.deepEqual(run.autoApprovedLinks, again.autoApprovedLinks);
assert.equal(run.assignments.length, 6);

const atomicRow = run.assignments.find((row) => row.canonicalCardId === atomic.canonicalCardId);
assert.equal(atomicRow?.queue, "auto_approved", JSON.stringify(atomicRow));
const atomicLink = run.autoApprovedLinks.find((link) => link.canonicalCardId === atomic.canonicalCardId);
assert.ok(atomicLink);
const claim = run.proposedClaims.find((row) => row.claimId === atomicLink?.claimId);
assert.ok(claim);
assert.equal(claim?.claimType, "treatment_indication");
assert.equal(claim?.objectText, "cup-cage reconstruction");
assert.match(claim?.claimText ?? "", /preferred reconstruction for pelvic discontinuity is cup-cage reconstruction/i);
assert.doesNotMatch(claim?.claimText ?? "", /\?/);
assert.equal(claim?.approvalMethod, "machine_consensus");
assert.equal(run.autoApprovedLinks[0]?.reviewStatus, "auto_approved");
assert.equal(run.autoApprovedLinks[0]?.mappingRole, "teaches");
assert.doesNotMatch(JSON.stringify(run.proposedClaims), /rawValue|plainText|<\/?[a-z]/i);

assert.equal(run.assignments.find((row) => row.canonicalCardId === negated.canonicalCardId)?.queue, "negated_or_distractor");
assert.equal(run.autoApprovedLinks.some((link) => link.canonicalCardId === negated.canonicalCardId), false);

const siblingQueues = [siblingA, siblingB].map((card) => run.assignments.find((row) => row.canonicalCardId === card.canonicalCardId)?.queue);
assert.ok(siblingQueues.includes("auto_approved"), JSON.stringify(siblingQueues));
assert.ok(siblingQueues.includes("duplicate_sibling"), JSON.stringify(siblingQueues));

assert.equal(run.assignments.find((row) => row.canonicalCardId === missing.canonicalCardId)?.queue, "auto_approved");
assert.ok(run.proposedClaims.some((row) => row.objectText === "observation"));
assert.equal(run.autoApprovedLinks.some((link) => link.canonicalCardId === missing.canonicalCardId), true);
assert.ok(run.proposedEntities.some((entity) => entity.normalizedLabel.includes("observation")));
assert.ok(run.assignments.find((row) => row.canonicalCardId === missing.canonicalCardId)?.reasonCodes.includes("ontology_gap_filled"));
assert.equal(run.gaps.some((gap) => gap.gapClass === "missing_claim" && gap.disposition === "resolved" && gap.claimId), true);

const nonAtomicRow = run.assignments.find((row) => row.canonicalCardId === nonAtomic.canonicalCardId);
assert.ok(nonAtomicRow);
assert.ok(
  nonAtomicRow.queue === "auto_approved" || nonAtomicRow.queue === "non_atomic",
  `expected a picked primary or non-atomic, got ${nonAtomicRow.queue}`,
);

const stale = makeCard({
  digit: "1",
  versionDigit: "2",
  ordinal: 0,
  noteGuid: "guid-stale",
  text: "The preferred reconstruction for pelvic discontinuity is {{c1::cup-cage reconstruction}}.",
  active: false,
});
assert.equal(runCardClaimFactory({ cards: [stale], entities }).assignments[0]?.queue, "inactive_or_stale");

const merged = runCardClaimFactory({
  cards: [
    makeCard({
      digit: "1",
      versionDigit: "2",
      ordinal: 0,
      noteGuid: "guid-one",
      text: "The preferred reconstruction for pelvic discontinuity is {{c1::cup-cage reconstruction}}.",
    }),
    makeCard({
      digit: "6",
      versionDigit: "7",
      ordinal: 0,
      noteGuid: "guid-two",
      text: "Cup-cage reconstruction is preferred for pelvic discontinuity {{c1::cup-cage reconstruction}}.",
    }),
  ],
  entities,
});
assert.equal(merged.autoApprovedLinks.length, 2);
assert.equal(merged.proposedClaims.length, 1, JSON.stringify(merged.proposedClaims));
assert.equal(merged.metrics.mergedClaimCount, 1);

const colliding = [
  entities[0],
  { ...entities[0], id: id("f"), preferredLabel: "Pelvic discontinuity concept" },
];
const ambiguous = makeCard({
  digit: "1",
  versionDigit: "2",
  ordinal: 0,
  noteGuid: "guid-ambiguous",
  text: "The preferred reconstruction for pelvic discontinuity is {{c1::cup-cage reconstruction}}.",
});
const ambiguousRun = runCardClaimFactory({ cards: [ambiguous], entities: colliding });
assert.equal(ambiguousRun.assignments[0]?.queue, "auto_approved");
assert.ok(ambiguousRun.assignments[0]?.reasonCodes.includes("ontology_gap_filled"));
assert.ok(ambiguousRun.proposedEntities.some((entity) => entity.normalizedLabel.includes("cup-cage")));
assert.equal(ambiguousRun.autoApprovedLinks.length, 1);

const sharedEntity = runCardClaimFactory({
  cards: [
    makeCard({
      digit: "1",
      versionDigit: "2",
      ordinal: 0,
      noteGuid: "guid-femur-a",
      text: "The preferred reconstruction for pelvic discontinuity is {{c1::cup-cage reconstruction}}.",
    }),
    makeCard({
      digit: "6",
      versionDigit: "7",
      ordinal: 0,
      noteGuid: "guid-femur-b",
      text: "Pelvic discontinuity is recognized on {{c1::Judet views}}.",
    }),
  ],
  entities,
});
assert.equal(sharedEntity.assignments.filter((row) => row.queue === "cross_card_contradiction").length, 0);
assert.ok(sharedEntity.autoApprovedLinks.length >= 1);

assert.throws(
  () => runCardClaimFactory({
    cards: [{ ...atomic, contentHash: "a".repeat(64) }],
    entities,
  }),
  /hash_mismatch|content_hash_mismatch/,
);

console.log("card-claim-factory.test.ts: all assertions passed");
