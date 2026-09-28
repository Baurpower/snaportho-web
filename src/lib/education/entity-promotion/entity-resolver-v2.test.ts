/** Tests for the Phase 3 entity resolver. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveEntityLabelForPropose, type ResolverInputs } from "./entity-resolver-v2";

function inputs(overrides: Partial<ResolverInputs> = {}): ResolverInputs {
  return {
    canonicalIndex: [
      { id: "canon-nerve", preferredLabel: "Femoral nerve", normalizedLabel: "femoral nerve", entityType: "anatomy_structure", aliases: [] },
    ],
    aliases: [{ aliasNormalized: "femoral", canonicalEntityId: "canon-nerve", aliasType: "elided_form" }],
    rejectedLabels: new Set(["infection", "true"]),
    ...overrides,
  };
}

describe("resolveEntityLabelForPropose", () => {
  it("links exact canonical labels", () => {
    const resolution = resolveEntityLabelForPropose("Femoral Nerve", inputs());
    assert.equal(resolution.action, "link_canonical");
    assert.equal(resolution.action === "link_canonical" && resolution.via, "exact_label");
  });

  it("links reviewed aliases", () => {
    const resolution = resolveEntityLabelForPropose("Femoral", inputs());
    assert.equal(resolution.action, "link_canonical");
    assert.equal(
      resolution.action === "link_canonical" && resolution.canonicalEntityId,
      "canon-nerve",
    );
  });

  it("suppresses rejected labels", () => {
    const resolution = resolveEntityLabelForPropose("Infection", inputs());
    assert.equal(resolution.action, "suppress");
    assert.equal(resolution.action === "suppress" && resolution.reason, "rejected_label");
  });

  it("suppresses non-entity shapes", () => {
    const boolean = resolveEntityLabelForPropose("False!", inputs());
    assert.equal(boolean.action, "suppress");
    const verb = resolveEntityLabelForPropose("Extend", inputs());
    assert.equal(verb.action, "suppress");
    const counted = resolveEntityLabelForPropose("8 pulleys", inputs());
    assert.equal(counted.action, "suppress");
  });

  it("proposes novel labels with improved typing", () => {
    const resolution = resolveEntityLabelForPropose("Tibial nerve", inputs());
    assert.equal(resolution.action, "propose");
    if (resolution.action === "propose") {
      assert.equal(resolution.inference.type, "anatomy_structure");
    }
  });

  it("ignores aliases pointing at unknown canonicals", () => {
    const resolution = resolveEntityLabelForPropose(
      "Femoral",
      inputs({ canonicalIndex: [] }),
    );
    assert.equal(resolution.action, "propose");
  });
});
