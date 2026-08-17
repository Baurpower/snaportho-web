import assert from "node:assert/strict";
// @ts-expect-error Direct Node strip-types runner imports TypeScript source.
import { screenOfficialNote } from "./official-note-screen.ts";

const achilles = screenOfficialNote({
  front: "Outcomes of nonoperative management of Achilles tendon ruptures",
  back: "Functional rehabilitation vs operative repair",
  deckPath: "SnapOrtho::Foot & Ankle::Achilles Tendon Rupture",
  governedTags: ["SnapOrtho::Anatomy::Achilles_Tendon", "SnapOrtho::Specialty::Foot_Ankle"],
  priorAccepted: [
    { facet: "anatomy", termId: "a", preferredLabel: "Achilles Tendon", decision: "accepted" },
    { facet: "specialty", termId: "s", preferredLabel: "Foot and Ankle", decision: "accepted" },
    { facet: "diagnosis", termId: "d", preferredLabel: "Achilles Tendon Rupture", decision: "accepted" },
  ],
  lexicalTop: [
    { facet: "anatomy", termId: "a", preferredLabel: "Achilles Tendon", retrievalScore: 1 },
    { facet: "diagnosis", termId: "d", preferredLabel: "Achilles Tendon Rupture", retrievalScore: 1 },
    { facet: "specialty", termId: "s", preferredLabel: "Foot and Ankle", retrievalScore: 0.2 },
  ],
});
assert.equal(achilles.decision, "auto_confirm");

const untagged = screenOfficialNote({
  front: "What structure is this?",
  back: "Image only",
  deckPath: "SnapOrtho::Hand",
  governedTags: [],
  priorAccepted: [],
  lexicalTop: [],
});
assert.equal(untagged.decision, "llm_review");
assert.ok(untagged.reasons.includes("no_prior"));
assert.ok(untagged.reasons.includes("untagged_published"));

const mismatch = screenOfficialNote({
  front: "Scaphoid fracture displacement",
  back: "CT is most sensitive",
  deckPath: "SnapOrtho::Hand",
  governedTags: ["SnapOrtho::Anatomy::Lunate"],
  priorAccepted: [
    { facet: "anatomy", termId: "lunate", preferredLabel: "Lunate", decision: "accepted" },
  ],
  lexicalTop: [
    { facet: "anatomy", termId: "scaphoid", preferredLabel: "Scaphoid", retrievalScore: 0.9 },
  ],
});
assert.equal(mismatch.decision, "llm_review");
assert.ok(mismatch.reasons.includes("codex_lexical_mismatch"));

const needsTx = screenOfficialNote({
  front: "Indication for ORIF of a displaced femoral neck fracture",
  back: "Young adult",
  deckPath: "SnapOrtho::Trauma",
  governedTags: ["SnapOrtho::Specialty::Trauma"],
  priorAccepted: [
    { facet: "specialty", termId: "t", preferredLabel: "Trauma", decision: "accepted" },
  ],
  lexicalTop: [
    { facet: "specialty", termId: "t", preferredLabel: "Trauma", retrievalScore: 0.2 },
  ],
});
assert.equal(needsTx.decision, "llm_review");
assert.ok(needsTx.reasons.includes("dx_tx_teaching_unset"));

console.log("official-note-screen.test.ts: all assertions passed");
