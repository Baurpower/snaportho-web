import assert from "node:assert/strict";

import { rankSearchCandidates } from "./anki-search-ranking";

const ranked = rankSearchCandidates([
  { id: "diagnosis-1", value: "diagnosis-1", sectionId: "diagnosis", priority: 5, coverage: 1, textRank: 0.8 },
  { id: "diagnosis-2", value: "diagnosis-2", sectionId: "diagnosis", priority: 5, coverage: 0.9, textRank: 0.6 },
  { id: "diagnosis-3", value: "diagnosis-3", sectionId: "diagnosis", priority: 5, coverage: 0.8, textRank: 0.5 },
  { id: "diagnosis-4", value: "diagnosis-4", sectionId: "diagnosis", priority: 5, coverage: 0.7, textRank: 0.4 },
  { id: "cardiac-1", value: "cardiac-1", sectionId: "cardiac", priority: 4, coverage: 0.7, textRank: 0.3 },
  { id: "scoliosis-1", value: "scoliosis-1", sectionId: "scoliosis", priority: 4, coverage: 0.6, textRank: 0.2 },
  { id: "cross", value: "cross", sectionId: "cardiac", priority: 4, coverage: 0.8, textRank: 0.3 },
  { id: "cross", value: "cross", sectionId: "scoliosis", priority: 4, coverage: 0.8, textRank: 0.3 },
], ["diagnosis", "cardiac", "scoliosis"], 7);

assert.equal(new Set(ranked.map((item) => item.id)).size, ranked.length, "cards must be deduplicated");
assert.ok(ranked.some((item) => item.matchedSectionIds.includes("diagnosis")));
assert.ok(ranked.some((item) => item.matchedSectionIds.includes("cardiac")));
assert.ok(ranked.some((item) => item.matchedSectionIds.includes("scoliosis")));
assert.deepEqual(ranked.find((item) => item.id === "cross")?.matchedSectionIds.sort(), ["cardiac", "scoliosis"]);
assert.equal(ranked.filter((item) => item.id.startsWith("diagnosis")).length, 3, "one section cannot consume the page result set");

console.log("anki-search-ranking.test.ts: all assertions passed");
