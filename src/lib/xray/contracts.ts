import { createHash } from "node:crypto";
import { z } from "zod";

const SHA256 = /^[a-f0-9]{64}$/;
export const XrayUuidSchema = z.string().uuid();

export const XraySubmissionStateSchema = z.enum([
  "draft", "processing", "ready_to_submit", "submitted", "assigned", "in_review",
  "changes_requested", "rejected", "publication_ready", "pr_open", "merged",
  "released", "superseded", "withdrawn",
]);

export const CreateXraySubmissionSchema = z.object({
  title: z.string().trim().min(1).max(200),
  idempotencyKey: XrayUuidSchema,
}).strict();

export const SaveXrayDraftSchema = z.object({
  expectedDraftVersion: z.number().int().positive(),
  title: z.string().trim().min(1).max(200),
  draftContent: z.record(z.string(), z.unknown()),
  idempotencyKey: XrayUuidSchema,
}).strict();

export const SubmitXrayRevisionSchema = z.object({
  expectedDraftVersion: z.number().int().positive(),
  contentSnapshot: z.record(z.string(), z.unknown()),
  contentSha256: z.string().regex(SHA256),
  assetManifestSha256: z.string().regex(SHA256),
  idempotencyKey: XrayUuidSchema,
}).strict();

export const ReviewCommentSchema = z.object({
  fieldPath: z.string().trim().min(1).max(300),
  severity: z.enum(["required", "suggestion", "question"]),
  body: z.string().trim().min(1).max(2000),
  idempotencyKey: XrayUuidSchema,
}).strict();

export const AddressReviewCommentSchema = z.object({
  authorResponse: z.string().trim().min(1).max(2000),
  idempotencyKey: XrayUuidSchema,
}).strict();

export const ResolveReviewCommentSchema = z.object({
  resolutionStatus: z.enum(["reviewer_resolved", "reviewer_dismissed", "reviewer_reopened"]),
  idempotencyKey: XrayUuidSchema,
}).strict();

export const ReviewDecisionSchema = z.object({
  decision: z.enum(["approve", "request_changes", "reject", "escalate"]),
  contentSha256: z.string().regex(SHA256),
  assetManifestSha256: z.string().regex(SHA256),
  reasonCodes: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  notes: z.string().max(2000).default(""),
  idempotencyKey: XrayUuidSchema,
}).strict();

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new Error("Unsupported value in canonical JSON");
  return encoded;
}

export function sha256CanonicalJson(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

const CONTENT_KEYS = [
  "schema_version", "case_id", "revision", "slug", "title", "audience", "difficulty",
  "specialty", "body_region", "age_band", "clinical_context", "study", "interpretation",
  "injury", "classifications", "management", "teaching", "references",
] as const;

export function xrayContentIdentity(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(CONTENT_KEYS.filter((key) => key in value).map((key) => [key, value[key]]));
}

export function computeXrayContentSha256(value: Record<string, unknown>): string {
  return sha256CanonicalJson(xrayContentIdentity(value));
}

export function computeXrayAssetManifestSha256(value: Record<string, unknown>): string {
  const study = value.study;
  if (!study || typeof study !== "object" || !Array.isArray((study as Record<string, unknown>).image_series)) {
    throw new Error("X-ray content must contain study.image_series");
  }
  return sha256CanonicalJson((study as Record<string, unknown>).image_series);
}
