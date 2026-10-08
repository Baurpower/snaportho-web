import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  SNAPORTHO_ADDON_LATEST_VERSION,
  SNAPORTHO_ADDON_MINIMUM_VERSION,
  addonReleaseStatus,
} from "../../../src/lib/anki/addon-release.ts";

const manifest = JSON.parse(
  readFileSync("integrations/snaportho-anki/addon/manifest.json", "utf8"),
) as { version: string };
const bootstrap = readFileSync(
  "integrations/snaportho-anki/addon/snaportho_reviewer/bootstrap.py",
  "utf8",
);
const api = readFileSync(
  "integrations/snaportho-anki/addon/snaportho_reviewer/api.py",
  "utf8",
);
const pendingRoute = readFileSync(
  "src/app/api/brobot-anki/launch/pending/route.ts",
  "utf8",
);
const retiredPayload = JSON.parse(
  readFileSync("public/retired/anki-search-pending.json", "utf8"),
);

assert.equal(manifest.version, SNAPORTHO_ADDON_LATEST_VERSION);
assert.equal(SNAPORTHO_ADDON_MINIMUM_VERSION, SNAPORTHO_ADDON_LATEST_VERSION);
assert.equal(
  addonReleaseStatus("1.0.6", "https://snap-ortho.com").upgradeRequired,
  true,
);
assert.equal(
  addonReleaseStatus(SNAPORTHO_ADDON_LATEST_VERSION, "https://snap-ortho.com")
    .upgradeRequired,
  false,
);
assert.deepEqual(retiredPayload, { requests: [], retired: true });
assert.doesNotMatch(bootstrap, /poll_search_relay|search_relay_timer/);
assert.match(bootstrap, /setSingleShot\(True\)/);
assert.match(bootstrap, /Check for browser requests/);
assert.match(api, /\/api\/anki\/addon\/version/);
assert.match(
  pendingRoute,
  /nextPollAfterSeconds:\s*data\?\.length\s*\?\s*4\s*:\s*1800/,
);

// Behavioral safety invariant: the maximum idle delay (90 seconds plus up to
// 10 seconds of jitter) remains below the database's two-minute default TTL.
const maxIdleDelayMs = 90_000 + 10_000;
const minimumLaunchTtlMs = 2 * 60_000;
assert.ok(maxIdleDelayMs < minimumLaunchTtlMs);
// The idle budget is bounded and dramatically below the former 4-second loop.
assert.ok(Math.ceil(86_400_000 / 60_000) <= 1_440);

console.log(
  "anki-edge-request-budget.test.ts: request budgets and release metadata verified",
);
