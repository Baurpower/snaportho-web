import assert from "node:assert/strict";

import {
  resolveMappings,
  summarizeMappingCoverage,
  type CanonicalEntityLinkRow,
  type LegacyMappingRow,
} from "./kg-canonical-mapping.ts";

const canonical: CanonicalEntityLinkRow[] = [
  { objectId: "card-dual", canonical_entity_id: "ent-1", is_active: true, review_status: "approved" },
  { objectId: "card-canon-only", canonical_entity_id: "ent-2", is_active: true, review_status: "approved" },
  // inactive canonical link must be ignored (object falls back to legacy)
  { objectId: "card-legacy", canonical_entity_id: "ent-x", is_active: false, review_status: "rejected" },
];

const legacy: LegacyMappingRow[] = [
  { objectId: "card-dual", curriculum_node_id: "node-1", concept_id: null, is_active: true },
  { objectId: "card-legacy", curriculum_node_id: "node-2", concept_id: null, is_active: true },
];

const resolutions = resolveMappings(canonical, legacy);

// Dual-mapped card: canonical present + legacy present, prefer canonical.
const dual = resolutions.get("card-dual");
assert.ok(dual);
assert.equal(dual.preferredSource, "canonical");
assert.equal(dual.hasCanonical, true);
assert.equal(dual.hasLegacy, true);
assert.deepEqual(dual.canonicalEntityIds, ["ent-1"]);
assert.deepEqual(dual.legacyCurriculumNodeIds, ["node-1"]);

// Canonical-only card.
const canonOnly = resolutions.get("card-canon-only");
assert.equal(canonOnly?.preferredSource, "canonical");
assert.equal(canonOnly?.hasLegacy, false);

// Legacy-only card (its canonical link is inactive => ignored => fall back).
const legacyOnly = resolutions.get("card-legacy");
assert.equal(legacyOnly?.preferredSource, "legacy");
assert.equal(legacyOnly?.hasCanonical, false);
assert.deepEqual(legacyOnly?.legacyCurriculumNodeIds, ["node-2"]);

// Coverage summary across a universe that also includes an unmapped card.
const summary = summarizeMappingCoverage(
  ["card-dual", "card-canon-only", "card-legacy", "card-unmapped"],
  canonical,
  legacy
);
assert.equal(summary.totalObjects, 4);
assert.equal(summary.canonicalMapped, 2); // dual + canon-only
assert.equal(summary.legacyOnly, 1); // legacy
assert.equal(summary.dualMapped, 1); // dual
assert.equal(summary.unmapped, 1); // unmapped

console.log("kg-canonical-mapping.test.ts: all assertions passed");
