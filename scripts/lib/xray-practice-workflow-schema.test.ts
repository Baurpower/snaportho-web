import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../supabase/migrations/20261004192923_xray_practice_workflow_foundation.sql", import.meta.url),
  "utf8"
);

const tables = [
  "xray_contributors",
  "xray_submissions",
  "xray_submission_revisions",
  "xray_assets",
  "xray_processing_jobs",
  "xray_review_assignments",
  "xray_review_comments",
  "xray_review_decisions",
  "xray_publication_requests",
  "xray_audit_events",
  "xray_mutation_requests",
];

test("X-ray workflow creates the complete control plane with forced RLS", () => {
  for (const table of tables) {
    assert.match(migration, new RegExp(`create table public\\.${table}\\b`, "i"));
    assert.match(migration, new RegExp(`alter table public\\.${table} force row level security`, "i"));
  }
  assert.match(migration, /revoke all on public\.xray_contributors[\s\S]*from public, anon, authenticated/i);
  assert.doesNotMatch(migration, /grant (?:insert|update|delete)[^;]*to authenticated/i);
});

test("submitted revisions, decisions, and audit evidence are append-only", () => {
  assert.match(migration, /xray_revisions_immutable before update or delete/i);
  assert.match(migration, /xray_decisions_immutable before update or delete/i);
  assert.match(migration, /xray_audit_immutable before update or delete/i);
  assert.match(migration, /unique \(reviewer_user_id, idempotency_key\)/i);
  assert.match(migration, /content_sha256 text not null/i);
  assert.match(migration, /asset_manifest_sha256 text not null/i);
});

test("authoritative state changes are backend-only RPCs", () => {
  for (const fn of [
    "create_xray_submission",
    "save_xray_draft",
    "submit_xray_revision",
    "add_xray_review_comment",
    "address_xray_review_comment",
    "resolve_xray_review_comment",
    "record_xray_review_decision",
  ]) {
    assert.match(migration, new RegExp(`create or replace function public\\.${fn}\\b`, "i"));
    assert.match(migration, new RegExp(`revoke all on function public\\.${fn}[\\s\\S]*?from public, anon, authenticated`, "i"));
    assert.match(migration, new RegExp(`grant execute on function public\\.${fn}[\\s\\S]*?to service_role`, "i"));
  }
  assert.doesNotMatch(migration, /grant execute on function public\.\w*xray\w*[^;]*to authenticated/i);
  assert.doesNotMatch(migration, /grant select[^;]*xray_assets[^;]*to authenticated/i);
});

test("authorization prevents self-review and stale hash approval", () => {
  assert.match(migration, /self review is forbidden/i);
  assert.match(migration, /self review assignment is forbidden/i);
  assert.match(migration, /privacy and clinical lanes require independent reviewers/i);
  assert.match(migration, /review hashes do not match assigned revision/i);
  assert.match(migration, /required review comments must be resolved before approval/i);
  assert.match(migration, /assigned_reviewer_user_id = p_actor_user_id/i);
  assert.match(migration, /role in \('reviewer','publisher','administrator'\)/i);
  assert.match(migration, /private\.xray_can_read_submission/i);
  assert.match(migration, /c\.qualification_verified and c\.revoked_at is null/i);
  assert.match(migration, /xray_mutation_requests/i);
  assert.match(migration, /idempotency key reused with different request/i);
  assert.match(migration, /author_addressed.*reviewer_reopened/i);
  assert.match(migration, /revoke all on schema private from public, anon, authenticated/i);
});

test("cross-submission relationships are protected by composite foreign keys", () => {
  assert.match(migration, /foreign key \(submission_id, owner_user_id\)[\s\S]*references public\.xray_submissions\(id, owner_user_id\)/i);
  assert.match(migration, /foreign key \(assignment_id, revision_id\)[\s\S]*references public\.xray_review_assignments\(id, revision_id\)/i);
  assert.match(migration, /foreign key \(assignment_id, submission_id, revision_id, reviewer_user_id, review_lane\)/i);
  assert.match(migration, /foreign key \(revision_id, submission_id, content_sha256, asset_manifest_sha256\)/i);
});

test("publication and processing remain service controlled", () => {
  assert.match(migration, /grant select, insert, update on public\.xray_contributors[\s\S]*to service_role/i);
  assert.doesNotMatch(migration, /grant select[^;]*xray_processing_jobs[^;]*to authenticated/i);
  assert.doesNotMatch(migration, /create policy xray_processing/i);
  assert.doesNotMatch(migration, /create policy xray_audit/i);
});
