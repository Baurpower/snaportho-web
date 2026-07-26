import assert from "node:assert/strict";
import {
  RESOURCE_SEARCH_CONTRACT_VERSION,
  isResourceSearchRequestV1,
  normalizeResourceSearchNativeId,
} from "./resource-search-v1";

const valid = {
  contractVersion: RESOURCE_SEARCH_CONTRACT_VERSION,
  query: { kind: "external_question", provider: "orthobullets", nativeId: "123456" },
  scopes: ["direct"],
  limit: 25,
};

assert.equal(isResourceSearchRequestV1(valid), true);
assert.equal(isResourceSearchRequestV1({
  ...valid,
  query: {
    ...valid.query,
    testedConcept: "superior trunk brachial plexus",
    conceptSummary: "Finger abduction remains intact through the ulnar nerve.",
  },
  scopes: ["direct", "latest_deck_concept"],
  limit: 12,
}), true);
assert.equal(isResourceSearchRequestV1({ ...valid, scopes: ["suggested"] }), false);
assert.equal(isResourceSearchRequestV1({ ...valid, scopes: ["direct", "latest_deck_concept"] }), false);
assert.equal(isResourceSearchRequestV1({ ...valid, limit: 51 }), false);
const topicPage = {
  ...valid,
  query: {
    kind: "topic_page",
    provider: "orthobullets",
    nativeId: "4092",
    testedConcept: "Duchenne muscular dystrophy",
    sections: [{
      id: "diagnosis",
      heading: "Diagnosis",
      concepts: ["dystrophin", "creatine kinase", "genetic testing"],
      priority: 5,
    }],
  },
  scopes: ["direct", "latest_deck_concept"],
  limit: 50,
};
assert.equal(isResourceSearchRequestV1(topicPage), true);
assert.equal(isResourceSearchRequestV1({
  ...topicPage,
  query: { ...topicPage.query, sections: [] },
}), false);
assert.equal(
  isResourceSearchRequestV1({ ...valid, query: { ...valid.query, nativeId: "bad id" } }),
  false,
);
assert.equal(normalizeResourceSearchNativeId("orthobullets", "OBQ14.85"), "OBQ14-85");
assert.equal(normalizeResourceSearchNativeId("orthobullets", "obq14-85"), "OBQ14-85");
assert.equal(normalizeResourceSearchNativeId("orthobullets", "123456"), "123456");
console.log("resource-search-v1.test.ts: all assertions passed");
