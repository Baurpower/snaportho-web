import assert from "node:assert/strict";
import { adjudicateOntologyCandidate } from "./automated-ontology-adjudicator.ts";
assert.deepEqual(adjudicateOntologyCandidate({ label: "viscoelastic", sourceCount: 1 }).decision, "reject");
assert.equal(adjudicateOntologyCandidate({ label: "Tibialis posterior tendon", sourceCount: 3, crossSourceCount: 1 }).entityType, "anatomy_structure");
assert.equal(adjudicateOntologyCandidate({ label: "ORIF with plates/screws", sourceCount: 1 }).decision, "reject");
assert.equal(adjudicateOntologyCandidate({ label: "Patella fracture", sourceCount: 3, crossSourceCount: 1 }).decision, "promote");
console.log("automated-ontology-adjudicator.test.ts OK");
