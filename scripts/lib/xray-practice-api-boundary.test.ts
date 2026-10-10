import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const workflow = read("src/lib/xray/workflow.ts");
const migration = read("supabase/migrations/20261004192923_xray_practice_workflow_foundation.sql");
const routes = [
  "src/app/api/xray/submissions/route.ts",
  "src/app/api/xray/submissions/[submissionId]/draft/route.ts",
  "src/app/api/xray/submissions/[submissionId]/submit/route.ts",
  "src/app/api/xray/assignments/[assignmentId]/comments/route.ts",
  "src/app/api/xray/assignments/[assignmentId]/decision/route.ts",
  "src/app/api/xray/comments/[commentId]/address/route.ts",
  "src/app/api/xray/comments/[commentId]/resolve/route.ts",
].map(read);

test("every X-ray mutation route authenticates before invoking the workflow", () => {
  for (const route of routes) {
    assert.match(route, /requireXrayApiUser\(\)/);
    assert.match(route, /if \("error" in auth\) return auth\.error/);
    assert.match(route, /auth\.user\.id/);
  }
});

test("workflow mutations use only the server admin client", () => {
  assert.match(workflow, /import \{ createAdminClient \}/);
  assert.doesNotMatch(workflow, /utils\/supabase\/server/);
  assert.match(workflow, /p_actor_user_id: actor/);
  assert.match(workflow, /p_request_fingerprint:/);
});

test("browser roles have neither raw table reads nor mutation execution", () => {
  assert.doesNotMatch(migration, /grant select[^;]*xray_[^;]*to authenticated/i);
  assert.doesNotMatch(migration, /grant execute on function public\.\w*xray\w*[^;]*to authenticated/i);
  assert.match(migration, /grant execute on function public\.create_xray_submission[^;]*to service_role/i);
});
