/** Tests for conservative entity-label normalization and similarity. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  entityMatchKeys,
  looksLikeAcronym,
  normalizeEntityLabelForMatch,
  splitParenExpansion,
  tokenContainment,
  tokenJaccard,
  trigramSimilarity,
} from "./entity-label-normalization";

describe("normalizeEntityLabelForMatch", () => {
  it("folds case, whitespace, and punctuation", () => {
    assert.equal(normalizeEntityLabelForMatch("  Anterior   Cruciate Ligament "), "anterior cruciate ligament");
    assert.equal(normalizeEntityLabelForMatch("The Femur."), "femur");
  });

  it("folds safe regular plurals on long tokens only", () => {
    assert.equal(normalizeEntityLabelForMatch("Collateral Ligaments"), "collateral ligament");
    assert.equal(normalizeEntityLabelForMatch("Lens"), "lens");
    assert.equal(normalizeEntityLabelForMatch("MCS"), "mcs");
  });

  it("never merges clinical synonyms", () => {
    assert.notEqual(
      normalizeEntityLabelForMatch("Osteonecrosis"),
      normalizeEntityLabelForMatch("Avascular necrosis"),
    );
  });
});

describe("entityMatchKeys", () => {
  it("splits paren expansions into base plus inner keys", () => {
    const keys = entityMatchKeys("Anterior Cruciate Ligament (ACL)");
    assert.ok(keys.includes("anterior cruciate ligament"));
    assert.ok(keys.includes("acl"));
  });

  it("strips acronym dots", () => {
    assert.ok(entityMatchKeys("A.C.L.").includes("acl"));
  });

  it("never emits parenthetical location qualifiers as keys", () => {
    const keys = entityMatchKeys("Radial Nerve Safe Zone (Humerus)");
    assert.ok(!keys.includes("humerus"));
    assert.ok(keys.includes("radial nerve safe zone humerus"));
  });

  it("keeps Greek -sis singulars intact", () => {
    assert.equal(normalizeEntityLabelForMatch("Scoliosis"), "scoliosis");
    assert.equal(normalizeEntityLabelForMatch("Arthrodesis"), "arthrodesis");
    assert.equal(normalizeEntityLabelForMatch("Recurrent Dislocations"), "recurrent dislocation");
  });

  it("keeps Latin -lis singulars and folds irregular plurals", () => {
    assert.equal(normalizeEntityLabelForMatch("Gracilis"), "gracilis");
    assert.equal(normalizeEntityLabelForMatch("Menisci"), "meniscus");
    assert.equal(normalizeEntityLabelForMatch("Phalanges"), "phalanx");
  });
});

describe("similarity signals", () => {
  it("jaccard distinguishes overlap levels", () => {
    assert.equal(tokenJaccard("femoral nerve", "femoral nerve"), 1);
    assert.ok(tokenJaccard("femoral nerve", "femoral artery") < 0.4);
  });

  it("containment detects elision", () => {
    assert.equal(tokenContainment("femoral", "femoral nerve"), 1);
  });

  it("trigram similarity tolerates minor spelling variants", () => {
    assert.ok(trigramSimilarity("tonnis", "tönnis") > 0.5);
    assert.ok(trigramSimilarity("acl", "mcl") < 0.5);
  });
});

describe("acronym helpers", () => {
  it("detects acronyms", () => {
    assert.equal(looksLikeAcronym("ACL"), true);
    assert.equal(looksLikeAcronym("ORIF"), true);
    assert.equal(looksLikeAcronym("anterior cruciate ligament"), false);
    assert.equal(looksLikeAcronym("Varus"), false);
  });

  it("splits paren expansions", () => {
    assert.deepEqual(splitParenExpansion("Anterior Cruciate Ligament (ACL)"), {
      base: "Anterior Cruciate Ligament",
      inner: "ACL",
    });
    assert.equal(splitParenExpansion("No parens"), null);
  });
});
