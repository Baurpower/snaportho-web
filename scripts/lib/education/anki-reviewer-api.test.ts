import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "../../..");
const api = readFileSync(
  path.join(root, "src/app/api/anki/reviewer/_lib.ts"),
  "utf8",
);
for (const x of [
  /device authentication required/,
  /reviewer permission required/,
  /assigned_reviewer_id/,
  /request too large/,
  /idempotency_key/,
  /conflictType/,
  /direct_human_review/,
  /publicationEligible:\s*false/,
  /canonicalVersionCreated:\s*false/,
])
  assert.match(api, x);
assert.doesNotMatch(api, /console\.(log|error)/);
assert.doesNotMatch(api, /service.role|SUPABASE_SERVICE/i);
console.log("anki-reviewer-api.test.ts: all assertions passed");
const workspace = readFileSync(
    path.join(root, "src/app/api/anki/reviewer/workspace/proposals/route.ts"),
    "utf8",
  ),
  search = readFileSync(
    path.join(root, "src/app/api/anki/reviewer/kg/entities/route.ts"),
    "utf8",
  );
for (const x of [
  /workspaceProposalSchema/,
  /idempotency_key/,
  /server_version_changed/,
  /entity_inactive/,
  /canonicalDataChanged:\s*false/,
  /personal tags stay local/,
])
  assert.match(workspace, x);
assert.match(search, /canonical_entities/);
assert.match(search, /is_active/);
assert.match(search, /\.eq\("status",\s*"canonical"\)/);
for (const source of [workspace, search]) {
  assert.doesNotMatch(source, /console\.(log|error)/);
  assert.doesNotMatch(
    source,
    /from\("(?:canonical_relationships|canonical_cards|canonical_entities|card_canonical_entity_links)"\)\.insert/,
  );
}
console.log("anki-reviewer-api.test.ts: all assertions passed");
const review = readFileSync(
    path.join(
      root,
      "src/app/api/anki/reviewer/workspace/proposals/[id]/review/route.ts",
    ),
    "utf8",
  ),
  detail = readFileSync(
    path.join(
      root,
      "src/app/api/anki/reviewer/workspace/proposals/[id]/route.ts",
    ),
    "utf8",
  ),
  history = readFileSync(
    path.join(
      root,
      "src/app/api/anki/reviewer/workspace/proposals/[id]/history/route.ts",
    ),
    "utf8",
  );
for (const x of [
  /proposalEvidenceHash/,
  /server_version_changed/,
  /entity_inactive/,
  /KG expansion approval requires administrator/,
  /record_anki_editor_workspace_review/,
  /canonicalDataChanged:\s*false/,
  /incorporated:\s*false/,
  /published:\s*false/,
])
  assert.match(review, x);
assert.match(detail, /staleCardVersion/);
assert.match(history, /anki_editor_workspace_review_actions/);
for (const source of [review, detail, history])
  assert.doesNotMatch(
    source,
    /from\("(?:canonical_relationships|canonical_card_versions|canonical_entities|card_canonical_entity_links)"\)\.insert/,
  );
