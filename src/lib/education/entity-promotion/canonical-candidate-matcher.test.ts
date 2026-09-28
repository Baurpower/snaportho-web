/** Tests for multi-signal proposed → canonical matching. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  matchProposedToCanonical,
  typesCompatible,
  type CanonicalRef,
} from "./canonical-candidate-matcher";

const INDEX: CanonicalRef[] = [
  {
    id: "canon-femoral-nerve",
    preferredLabel: "Femoral nerve",
    normalizedLabel: "femoral nerve",
    entityType: "anatomy_structure",
    aliases: [],
  },
  {
    id: "canon-acl",
    preferredLabel: "Anterior cruciate ligament",
    normalizedLabel: "anterior cruciate ligament",
    entityType: "anatomy_structure",
    aliases: [],
  },
  {
    id: "canon-median-nerve",
    preferredLabel: "Median nerve",
    normalizedLabel: "median nerve",
    entityType: "anatomy_structure",
    aliases: [],
  },
];

describe("typesCompatible", () => {
  it("accepts identity and known skew pairs", () => {
    assert.equal(typesCompatible("condition", "condition"), true);
    assert.equal(typesCompatible("condition", "anatomy_structure"), true);
    assert.equal(typesCompatible("procedure", "fixation_method"), true);
  });

  it("rejects unrelated pairs", () => {
    assert.equal(typesCompatible("implant", "exam_maneuver"), false);
  });
});

describe("matchProposedToCanonical", () => {
  it("matches exact normalized labels despite type skew", () => {
    const [top] = matchProposedToCanonical(
      {
        entityId: "p1",
        preferredLabel: "Femoral Nerve",
        normalizedLabel: "femoral nerve",
        entityType: "condition",
        claimIds: ["c1"],
      },
      INDEX,
    );
    assert.equal(top.entityId, "canon-femoral-nerve");
    assert.equal(top.signals.exactLabel, true);
  });

  it("matches acronyms to expansions", () => {
    const [top] = matchProposedToCanonical(
      {
        entityId: "p2",
        preferredLabel: "ACL",
        normalizedLabel: "acl",
        entityType: "condition",
        claimIds: ["c1"],
      },
      INDEX,
    );
    assert.equal(top.entityId, "canon-acl");
    assert.equal(top.signals.acronymExpansion, true);
  });

  it("flags elided forms via containment", () => {
    const [top] = matchProposedToCanonical(
      {
        entityId: "p3",
        preferredLabel: "Femoral",
        normalizedLabel: "femoral",
        entityType: "condition",
        claimIds: ["c1"],
      },
      INDEX,
    );
    assert.equal(top.entityId, "canon-femoral-nerve");
    assert.equal(top.signals.elision, true);
  });

  it("matches reviewed aliases", () => {
    const [top] = matchProposedToCanonical(
      {
        entityId: "p4",
        preferredLabel: "AIN",
        normalizedLabel: "ain",
        entityType: "anatomy_structure",
        claimIds: ["c1"],
      },
      [
        ...INDEX,
        {
          id: "canon-ain",
          preferredLabel: "Anterior interosseous nerve",
          normalizedLabel: "anterior interosseous nerve",
          entityType: "anatomy_structure",
          aliases: [],
        },
      ],
      [{ aliasNormalized: "ain", canonicalEntityId: "canon-ain", aliasType: "acronym" }],
    );
    assert.equal(top.entityId, "canon-ain");
    assert.equal(top.signals.aliasMatch, true);
  });

  it("ranks claim co-occurrence above unrelated fuzzy labels", () => {
    const ranked = matchProposedToCanonical(
      {
        entityId: "p5",
        preferredLabel: "Medial nerve",
        normalizedLabel: "medial nerve",
        entityType: "condition",
        claimIds: ["c1", "c2"],
      },
      INDEX,
      [],
      {
        claimNeighborLabels: new Map(),
        canonicalClaimIds: new Map([
          ["canon-median-nerve", new Set(["c1", "c2"])],
          ["canon-femoral-nerve", new Set(["c9"])],
        ]),
      },
    );
    assert.equal(ranked[0].entityId, "canon-median-nerve");
    assert.equal(ranked[0].signals.claimOverlap, 1);
  });

  it("does not elide distinct nerves sharing tokens", () => {
    const ranked = matchProposedToCanonical(
      {
        entityId: "p8",
        preferredLabel: "Lateral femoral cutaneous nerve",
        normalizedLabel: "lateral femoral cutaneous nerve",
        entityType: "anatomy_structure",
        claimIds: ["c1"],
      },
      [
        {
          id: "canon-fem-nerve",
          preferredLabel: "Femoral nerve",
          normalizedLabel: "femoral nerve",
          entityType: "anatomy_structure",
          aliases: [],
        },
      ],
    );
    assert.equal(ranked.length, 0);
  });

  it("does not treat region-qualified parts as elisions", () => {
    const ranked = matchProposedToCanonical(
      {
        entityId: "p7",
        preferredLabel: "Humerus",
        normalizedLabel: "humerus",
        entityType: "anatomy_structure",
        claimIds: ["c1"],
      },
      [
        {
          id: "canon-prox-hum",
          preferredLabel: "Proximal Humerus",
          normalizedLabel: "proximal humerus",
          entityType: "anatomy_structure",
          aliases: [],
        },
      ],
    );
    assert.equal(ranked.length, 0);
  });

  it("vetoes antonym substitutions", () => {
    const ranked = matchProposedToCanonical(
      {
        entityId: "p9",
        preferredLabel: "Posterior Interosseous Nerve",
        normalizedLabel: "posterior interosseous nerve",
        entityType: "anatomy_structure",
        claimIds: ["c1"],
      },
      [
        {
          id: "canon-ain",
          preferredLabel: "Anterior Interosseous Nerve",
          normalizedLabel: "anterior interosseous nerve",
          entityType: "anatomy_structure",
          aliases: [],
        },
      ],
    );
    assert.equal(ranked.length, 0);
  });

  it("vetoes hyponyms but exempts generic partitives", () => {
    const middlePhalanx = {
      id: "canon-mid-ph",
      preferredLabel: "Middle Phalanx",
      normalizedLabel: "middle phalanx",
      entityType: "anatomy_structure",
      aliases: [],
    };
    const hypo = matchProposedToCanonical(
      {
        entityId: "p10",
        preferredLabel: "Facet joint capsules",
        normalizedLabel: "facet joint capsules",
        entityType: "anatomy_structure",
        claimIds: ["c1"],
      },
      [
        {
          id: "canon-jc",
          preferredLabel: "Joint Capsule",
          normalizedLabel: "joint capsule",
          entityType: "anatomy_structure",
          aliases: [],
        },
      ],
    );
    assert.equal(hypo.length, 0);
    const partitive = matchProposedToCanonical(
      {
        entityId: "p11",
        preferredLabel: "Middle phalanges of digits",
        normalizedLabel: "middle phalanges of digits",
        entityType: "anatomy_structure",
        claimIds: ["c1"],
      },
      [middlePhalanx],
    );
    assert.equal(partitive[0].entityId, "canon-mid-ph");
  });

  it("vetoes generic proposals against specifying canonicals", () => {
    const ranked = matchProposedToCanonical(
      {
        entityId: "p12",
        preferredLabel: "Articular cartilage",
        normalizedLabel: "articular cartilage",
        entityType: "anatomy_structure",
        claimIds: ["c1"],
      },
      [
        {
          id: "canon-knee-cart",
          preferredLabel: "Knee Articular Cartilage",
          normalizedLabel: "knee articular cartilage",
          entityType: "anatomy_structure",
          aliases: [],
        },
      ],
    );
    assert.equal(ranked.length, 0);
  });

  it("penalizes confident pathology-to-structure matches only", () => {
    const ain = {
      id: "canon-ain2",
      preferredLabel: "AIN",
      normalizedLabel: "ain",
      entityType: "anatomy_structure",
      aliases: [],
    };
    const confident = matchProposedToCanonical(
      {
        entityId: "p13",
        preferredLabel: "AIN palsy",
        normalizedLabel: "ain palsy",
        entityType: "condition",
        claimIds: ["c1"],
        proposalTypeConfident: true,
      },
      [ain],
    );
    assert.ok(confident[0].score < 0.55);
    assert.ok(confident[0].evidence.includes("confident_pathology_mismatch"));
    const fallback = matchProposedToCanonical(
      {
        entityId: "p14",
        preferredLabel: "AIN palsy",
        normalizedLabel: "ain palsy",
        entityType: "condition",
        claimIds: ["c1"],
      },
      [ain],
    );
    assert.ok(fallback[0].score >= 0.55);
  });

  it("returns nothing for unrelated labels", () => {
    const ranked = matchProposedToCanonical(
      {
        entityId: "p6",
        preferredLabel: "Metatarsus adductus",
        normalizedLabel: "metatarsus adductus",
        entityType: "condition",
        claimIds: ["c1"],
      },
      INDEX,
    );
    assert.equal(ranked.length, 0);
  });
});
