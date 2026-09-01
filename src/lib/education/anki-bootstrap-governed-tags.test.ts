import assert from "node:assert/strict";
// @ts-expect-error -- direct Node strip-types test requires an explicit TS extension.
import { overlayPublishedGovernedTags } from "./anki-bootstrap-governed-tags.ts";

const cards = [
  { noteGuid: "a", centralTags: ["legacy"], front: "A" },
  { noteGuid: "b", centralTags: ["keep"], front: "B" },
];
const overlaid = overlayPublishedGovernedTags(
  cards,
  new Map([["a", ["SnapOrtho::Diagnosis::ACL", "SnapOrtho::Diagnosis::ACL"]]]),
);
assert.deepEqual(overlaid[0].centralTags, ["SnapOrtho::Diagnosis::ACL"]);
assert.deepEqual(overlaid[1].centralTags, ["keep"]);
assert.equal(overlaid[0].front, "A");
