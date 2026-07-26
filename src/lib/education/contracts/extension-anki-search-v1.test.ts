import assert from "node:assert/strict";

import {
  EXTENSION_ANKI_SEARCH_CONTRACT,
  ExtensionAnkiSearchRequestSchema,
} from "./extension-anki-search-v1";

const base = {
  contractVersion: EXTENSION_ANKI_SEARCH_CONTRACT,
  clientRequestId: "00000000-0000-4000-8000-000000000001",
  idempotencyKey: "00000000-0000-4000-8000-000000000002",
  source: {
    provider: "orthobullets",
    nativeQuestionId: "4092",
    questionFingerprintHash: "a".repeat(64),
  },
  concept: {
    testedConcept: "Duchenne muscular dystrophy",
    summary: "Topic page section index.",
    searchKeywords: ["dystrophin"],
    source: "page_metadata",
  },
  requestedAction: "open_browse_and_return_results",
  extensionVersion: "1.0.0",
  createdAt: new Date().toISOString(),
};

assert.equal(ExtensionAnkiSearchRequestSchema.safeParse({
  ...base,
  source: { ...base.source, queryKind: "question" },
}).success, true);
assert.equal(ExtensionAnkiSearchRequestSchema.safeParse({
  ...base,
  source: { ...base.source, queryKind: "topic_page" },
}).success, false);
assert.equal(ExtensionAnkiSearchRequestSchema.safeParse({
  ...base,
  source: { ...base.source, queryKind: "topic_page" },
  concept: {
    ...base.concept,
    pageSections: [{
      id: "diagnosis",
      heading: "Diagnosis",
      concepts: ["dystrophin", "genetic testing"],
      priority: 5,
    }],
  },
}).success, true);

console.log("extension-anki-search-v1.test.ts: all assertions passed");
