import assert from "node:assert/strict";
import {
  buildMediaReconciliationPlan,
  reconciliationApplyRequested,
} from "./reconciliation";

const active = [{
  id: "asset-a",
  imageKey: "user-a/asset-a/image.webp",
  thumbnailKey: "user-a/asset-a/thumbnail.webp",
}, {
  id: "asset-b",
  imageKey: "user-a/asset-b/image.webp",
  thumbnailKey: "user-a/asset-b/thumbnail.webp",
}];

const plan = buildMediaReconciliationPlan([
  "user-a/asset-a/image.webp",
  "user-a/asset-a/thumbnail.webp",
  "user-a/asset-b/image.webp",
  "user-a/orphan/image.webp",
], active);

assert.deepEqual(plan.orphanObjectKeys, ["user-a/orphan/image.webp"]);
assert.deepEqual(plan.missingImageAssetIds, []);
assert.deepEqual(plan.missingThumbnailAssetIds, ["asset-b"]);
assert.equal(plan.storageObjectCount, 4);
assert.equal(plan.activeAssetCount, 2);
assert.equal(reconciliationApplyRequested([]), false);
assert.equal(reconciliationApplyRequested(["--apply"]), true);
assert.throws(() => reconciliationApplyRequested(["--bucket=other"]), /Unsupported/);
console.log("MyCases educational media reconciliation tests passed");
