import "server-only";

import { randomUUID } from "node:crypto";
import type { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  AddressReviewCommentSchema,
  CreateXraySubmissionSchema,
  ResolveReviewCommentSchema,
  ReviewCommentSchema,
  ReviewDecisionSchema,
  SaveXrayDraftSchema,
  SubmitXrayRevisionSchema,
  XraySubmissionStateSchema,
  XrayUuidSchema,
  computeXrayAssetManifestSha256,
  computeXrayContentSha256,
  sha256CanonicalJson,
} from "./contracts";

export type XraySubmission = {
  id: string;
  owner_user_id: string;
  title: string;
  state: z.infer<typeof XraySubmissionStateSchema>;
  draft_version: number;
  draft_content: Record<string, unknown>;
  submitted_revision_id: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  closed_at: string | null;
};

export type XraySubmissionRevision = {
  id: string;
  submission_id: string;
  revision_number: number;
  authored_by_user_id: string;
  schema_version: "xray_case_v1";
  content_snapshot: Record<string, unknown>;
  content_sha256: string;
  asset_manifest_sha256: string;
  created_at: string;
};

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}

function fingerprint(operation: string, payload: Record<string, unknown>) {
  return sha256CanonicalJson({ operation, payload });
}

export async function createXraySubmission(actorUserId: string, input: unknown) {
  const actor = XrayUuidSchema.parse(actorUserId);
  const parsed = CreateXraySubmissionSchema.parse(input);
  return rpc<XraySubmission>("create_xray_submission", {
    p_actor_user_id: actor,
    p_title: parsed.title,
    p_request_id: randomUUID(),
    p_idempotency_key: parsed.idempotencyKey,
    p_request_fingerprint: fingerprint("create_submission", { title: parsed.title }),
  });
}

export async function saveXrayDraft(actorUserId: string, submissionId: string, input: unknown) {
  const actor = XrayUuidSchema.parse(actorUserId);
  const id = XrayUuidSchema.parse(submissionId);
  const parsed = SaveXrayDraftSchema.parse(input);
  return rpc<XraySubmission>("save_xray_draft", {
    p_actor_user_id: actor,
    p_submission_id: id,
    p_expected_draft_version: parsed.expectedDraftVersion,
    p_title: parsed.title,
    p_draft_content: parsed.draftContent,
    p_request_id: randomUUID(),
    p_idempotency_key: parsed.idempotencyKey,
    p_request_fingerprint: fingerprint("save_draft", {
      submissionId: id,
      expectedDraftVersion: parsed.expectedDraftVersion,
      title: parsed.title,
      draftContent: parsed.draftContent,
    }),
  });
}

export async function submitXrayRevision(actorUserId: string, submissionId: string, input: unknown) {
  const actor = XrayUuidSchema.parse(actorUserId);
  const id = XrayUuidSchema.parse(submissionId);
  const parsed = SubmitXrayRevisionSchema.parse(input);
  const computedContent = computeXrayContentSha256(parsed.contentSnapshot);
  const computedAssets = computeXrayAssetManifestSha256(parsed.contentSnapshot);
  if (computedContent !== parsed.contentSha256 || computedAssets !== parsed.assetManifestSha256) {
    throw new Error("Submitted X-ray hashes do not match the canonical content");
  }
  return rpc<XraySubmissionRevision>("submit_xray_revision", {
    p_actor_user_id: actor,
    p_submission_id: id,
    p_expected_draft_version: parsed.expectedDraftVersion,
    p_schema_version: "xray_case_v1",
    p_content_snapshot: parsed.contentSnapshot,
    p_content_sha256: computedContent,
    p_asset_manifest_sha256: computedAssets,
    p_request_id: randomUUID(),
    p_idempotency_key: parsed.idempotencyKey,
    p_request_fingerprint: fingerprint("submit_revision", {
      submissionId: id,
      expectedDraftVersion: parsed.expectedDraftVersion,
      contentSha256: computedContent,
      assetManifestSha256: computedAssets,
    }),
  });
}

export async function addXrayReviewComment(actorUserId: string, assignmentId: string, input: unknown) {
  const actor = XrayUuidSchema.parse(actorUserId);
  const id = XrayUuidSchema.parse(assignmentId);
  const parsed = ReviewCommentSchema.parse(input);
  return rpc("add_xray_review_comment", {
    p_actor_user_id: actor,
    p_assignment_id: id,
    p_field_path: parsed.fieldPath,
    p_severity: parsed.severity,
    p_body: parsed.body,
    p_request_id: randomUUID(),
    p_idempotency_key: parsed.idempotencyKey,
    p_request_fingerprint: fingerprint("add_review_comment", {
      assignmentId: id,
      fieldPath: parsed.fieldPath,
      severity: parsed.severity,
      body: parsed.body,
    }),
  });
}

export async function addressXrayReviewComment(actorUserId: string, commentId: string, input: unknown) {
  const actor = XrayUuidSchema.parse(actorUserId);
  const id = XrayUuidSchema.parse(commentId);
  const parsed = AddressReviewCommentSchema.parse(input);
  return rpc("address_xray_review_comment", {
    p_actor_user_id: actor,
    p_comment_id: id,
    p_author_response: parsed.authorResponse,
    p_request_id: randomUUID(),
    p_idempotency_key: parsed.idempotencyKey,
    p_request_fingerprint: fingerprint("address_review_comment", {
      commentId: id,
      authorResponse: parsed.authorResponse,
    }),
  });
}

export async function resolveXrayReviewComment(actorUserId: string, commentId: string, input: unknown) {
  const actor = XrayUuidSchema.parse(actorUserId);
  const id = XrayUuidSchema.parse(commentId);
  const parsed = ResolveReviewCommentSchema.parse(input);
  return rpc("resolve_xray_review_comment", {
    p_actor_user_id: actor,
    p_comment_id: id,
    p_resolution_status: parsed.resolutionStatus,
    p_request_id: randomUUID(),
    p_idempotency_key: parsed.idempotencyKey,
    p_request_fingerprint: fingerprint("resolve_review_comment", {
      commentId: id,
      resolutionStatus: parsed.resolutionStatus,
    }),
  });
}

export async function recordXrayReviewDecision(actorUserId: string, assignmentId: string, input: unknown) {
  const actor = XrayUuidSchema.parse(actorUserId);
  const id = XrayUuidSchema.parse(assignmentId);
  const parsed = ReviewDecisionSchema.parse(input);
  return rpc("record_xray_review_decision", {
    p_actor_user_id: actor,
    p_assignment_id: id,
    p_decision: parsed.decision,
    p_content_sha256: parsed.contentSha256,
    p_asset_manifest_sha256: parsed.assetManifestSha256,
    p_reason_codes: parsed.reasonCodes,
    p_notes: parsed.notes,
    p_request_id: randomUUID(),
    p_idempotency_key: parsed.idempotencyKey,
    p_request_fingerprint: fingerprint("record_review_decision", {
      assignmentId: id,
      decision: parsed.decision,
      contentSha256: parsed.contentSha256,
      assetManifestSha256: parsed.assetManifestSha256,
      reasonCodes: parsed.reasonCodes,
      notes: parsed.notes,
    }),
  });
}
