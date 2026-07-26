/**
 * Guard: client Time-Off entrypoints must not import the server time-off module
 * (which pulls next/headers via @/utils/supabase/server).
 *
 * Run: npx tsx src/lib/workspace/call/time-off-boundary.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../../..");

const clientEntrypoints = [
  "src/app/work/time-off/timeoffclient.tsx",
  "src/components/workspace/time-off/program-time-off-dashboard.tsx",
  "src/components/workspace/time-off/time-off-display",
  "src/components/workspace/monthsscheduleview.tsx",
  "src/app/work/workspacehomeclient.tsx",
];

const forbiddenServerModule =
  /from\s+["']@\/lib\/workspace\/call\/time-off["']/;
const forbiddenServerClient =
  /@\/utils\/supabase\/server|from\s+["']next\/headers["']/;

for (const rel of clientEntrypoints) {
  const text = readFileSync(path.join(root, rel), "utf8");
  assert.doesNotMatch(
    text,
    forbiddenServerModule,
    `${rel} must not import @/lib/workspace/call/time-off (server-only)`
  );
  assert.doesNotMatch(
    text,
    forbiddenServerClient,
    `${rel} must not import supabase server / next/headers`
  );
}

const shared = readFileSync(
  path.join(root, "src/lib/workspace/call/time-off-shared"),
  "utf8"
);
assert.doesNotMatch(
  shared,
  /from\s+["']next\/headers["']|from\s+["']@\/utils\/supabase\/server["']/,
  "time-off-shared.ts must stay client-safe (no server imports)"
);

const server = readFileSync(
  path.join(root, "src/lib/workspace/call/time-off"),
  "utf8"
);
assert.match(server, /utils\/supabase\/server/);
assert.match(server, /export \* from "\.\/time-off-shared"/);

console.log("time-off-boundary.test.ts: all assertions passed");
