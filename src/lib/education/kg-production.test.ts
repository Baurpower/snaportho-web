import assert from "node:assert/strict";

// @ts-expect-error TS5097: explicit .ts suffix is required by the direct Node test runner.
import { findProductionKgTopics, getProductionKgNeighborhood } from "./kg-production.ts";

const payload = {
  releaseId: "kg-beta-test",
  neighborhoodSlug: "test-neighborhood",
  publicationStatus: "beta_active",
  lifecycleState: "production_beta_active",
  reviewTier: "automated_beta",
  coverageStatus: "partial",
  verificationHash: "test-hash",
  activatedAt: "2026-07-16T00:00:00.000Z",
  entities: [],
  relationships: [],
  curriculumBridges: [],
  claims: [],
  decisionPoints: [],
  excludedObjectCount: 1,
};
const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
const client = {
  async rpc(name: string, args: Record<string, unknown>) {
    calls.push({ name, args });
    return { data: payload, error: null };
  },
};

assert.equal(await getProductionKgNeighborhood(client, "   "), null);
assert.deepEqual(await getProductionKgNeighborhood(client, "test-neighborhood"), payload);
assert.deepEqual(calls, [{ name: "get_kg_production_neighborhood", args: { p_neighborhood_slug: "test-neighborhood" } }]);

await assert.rejects(
  getProductionKgNeighborhood({ async rpc() { return { data: null, error: { message: "denied" } }; } }, "test"),
  /denied/
);

const topicCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
const topicMatches = [{
  release_id: "kg-beta-test",
  neighborhood_slug: "test-neighborhood",
  coverage_status: "partial",
  review_tier: "automated_beta",
  matched_entity_id: "00000000-0000-0000-0000-000000000001",
  matched_slug: "test",
  matched_label: "Test",
}];
const topicClient = {
  async rpc(name: string, args: Record<string, unknown>) {
    topicCalls.push({ name, args });
    return { data: topicMatches, error: null };
  },
};
assert.deepEqual(await findProductionKgTopics(topicClient, " test ", 100), topicMatches);
assert.deepEqual(topicCalls, [{
  name: "find_kg_production_topics",
  args: { p_query: "test", p_limit: 50 },
}]);
console.log("kg-production.test.ts: all assertions passed");
