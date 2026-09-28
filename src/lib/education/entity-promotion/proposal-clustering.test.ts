/** Tests for proposed ↔ proposed duplicate clustering. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clusterProposals } from "./proposal-clustering";

describe("clusterProposals", () => {
  it("clusters acronym, expansion, and paren forms", () => {
    const clusters = clusterProposals([
      { entityId: "a", preferredLabel: "ACL", normalizedLabel: "acl", entityType: "condition", claimIds: ["c1"], cardIds: ["k1"] },
      { entityId: "b", preferredLabel: "Anterior Cruciate Ligament", normalizedLabel: "anterior cruciate ligament", entityType: "condition", claimIds: ["c2", "c3"], cardIds: ["k2"] },
      { entityId: "c", preferredLabel: "Anterior cruciate ligament (ACL)", normalizedLabel: "anterior cruciate ligament acl", entityType: "condition", claimIds: ["c4"], cardIds: ["k3"] },
    ]);
    assert.equal(clusters.length, 1);
    assert.deepEqual(clusters[0].memberIds, ["a", "b", "c"]);
    assert.equal(clusters[0].headId, "b");
    assert.equal(clusters[0].recommendation, "promote_head_alias_rest");
  });

  it("does not initials-merge two-letter acronyms", () => {
    const clusters = clusterProposals([
      { entityId: "a", preferredLabel: "CT", normalizedLabel: "ct", entityType: "diagnostic_test", claimIds: ["c1"], cardIds: ["k1"] },
      { entityId: "b", preferredLabel: "Cut tubia", normalizedLabel: "cut tubia", entityType: "condition", claimIds: ["c2"], cardIds: ["k2"] },
      { entityId: "c", preferredLabel: "Claw toes", normalizedLabel: "claw toes", entityType: "condition", claimIds: ["c3"], cardIds: ["k3"] },
    ]);
    assert.equal(clusters.length, 0);
  });

  it("does not merge distinct neighbors", () => {
    const clusters = clusterProposals([
      { entityId: "a", preferredLabel: "Femoral nerve", normalizedLabel: "femoral nerve", entityType: "anatomy_structure", claimIds: ["c1"], cardIds: ["k1"] },
      { entityId: "b", preferredLabel: "Femoral artery", normalizedLabel: "femoral artery", entityType: "anatomy_structure", claimIds: ["c2"], cardIds: ["k2"] },
      { entityId: "c", preferredLabel: "Sciatic nerve", normalizedLabel: "sciatic nerve", entityType: "anatomy_structure", claimIds: ["c3"], cardIds: ["k3"] },
    ]);
    assert.equal(clusters.length, 0);
  });

  it("clusters case and punctuation variants", () => {
    const clusters = clusterProposals([
      { entityId: "a", preferredLabel: "Metatarsus Adductus", normalizedLabel: "metatarsus adductus", entityType: "condition", claimIds: ["c1"], cardIds: ["k1"] },
      { entityId: "b", preferredLabel: "metatarsus adductus.", normalizedLabel: "metatarsus adductus", entityType: "condition", claimIds: ["c2"], cardIds: ["k2"] },
    ]);
    assert.equal(clusters.length, 1);
    assert.ok(clusters[0].linkReasons.includes("shared_match_key"));
  });
});
