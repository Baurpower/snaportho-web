import assert from "node:assert/strict";

import { CASEPREP_INTERNAL_API_KEY_HEADER } from "../config/caseprep-review";

assert.equal(CASEPREP_INTERNAL_API_KEY_HEADER, "x-caseprep-internal-api-key");

const sampleBaseUrl = "https://api.snap-ortho.com/";
assert.equal(sampleBaseUrl.replace(/\/+$/, ""), "https://api.snap-ortho.com");

const procedurePath = `/caseprep/registry/procedures/${encodeURIComponent("tka")}?include_validation=true`;
assert.equal(
  procedurePath,
  "/caseprep/registry/procedures/tka?include_validation=true"
);

console.log("caseprep-review client config tests passed");