import assert from "node:assert/strict";
import test from "node:test";

import {
  ReviewDecisionSchema,
  SaveXrayDraftSchema,
  computeXrayAssetManifestSha256,
  computeXrayContentSha256,
  sha256CanonicalJson,
} from "./contracts.ts";

test("canonical JSON hashing is independent of object key order", () => {
  assert.equal(sha256CanonicalJson({ b: 2, a: 1 }), sha256CanonicalJson({ a: 1, b: 2 }));
});

test("content hash excludes provenance and review metadata", () => {
  const base = { schema_version: "xray_case_v1", case_id: "xr_test", revision: 1, study: { image_series: [] } };
  assert.equal(
    computeXrayContentSha256({ ...base, provenance: { exporter: "v1" }, review: { publisher: "one" } }),
    computeXrayContentSha256({ ...base, provenance: { exporter: "v2" }, review: { publisher: "two" } })
  );
});

test("asset manifest hash changes when image order changes", () => {
  const first = { asset_id: "a", order: 0 };
  const second = { asset_id: "b", order: 1 };
  assert.notEqual(
    computeXrayAssetManifestSha256({ study: { image_series: [first, second] } }),
    computeXrayAssetManifestSha256({ study: { image_series: [second, first] } })
  );
});

test("draft and decision inputs reject unknown or malformed fields", () => {
  assert.throws(() => SaveXrayDraftSchema.parse({
    expectedDraftVersion: 1,
    title: "Draft",
    draftContent: {},
    idempotencyKey: "not-a-uuid",
  }));
  assert.throws(() => ReviewDecisionSchema.parse({
    decision: "approve",
    contentSha256: "a".repeat(64),
    assetManifestSha256: "b".repeat(64),
    idempotencyKey: "00000000-0000-4000-8000-000000000000",
    unexpected: true,
  }));
});
