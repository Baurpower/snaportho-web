import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { MyCasesCase, MyCasesCaseInput } from "@/lib/mycases/types";
import { executeCaseCreationWithMedia, retryFailedCaseMedia, type CaseMediaUpload } from "./hooks/useCreateCaseWithMedia";
import { removeStagedCaseMedia, stageCaseMediaFiles } from "./hooks/useStagedCaseMedia";

const payload: MyCasesCaseInput = { title: "Synthetic case", procedure_name: "Synthetic procedure", status: "draft" };
const createdCase = {
  id: "case-returned-by-api",
  user_id: "server-owned",
  title: payload.title,
  procedure_name: payload.procedure_name,
  diagnosis: null,
  status: "draft",
  rotation_context: null,
  attending_context: null,
  difficulty: null,
  autonomy: null,
  preparation: null,
  debrief: null,
  source: "web",
  client_source_id: null,
  version: 1,
  is_archived: false,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
  deleted_at: null,
} satisfies MyCasesCase;

const png = (name: string) => new File([new Uint8Array([137, 80, 78, 71])], name, { type: "image/png" });
const upload = (id: string): CaseMediaUpload => ({ id, file: png(`${id}.png`), caption: "Synthetic caption", status: "waiting" });
const noopStatus = () => undefined;

// Local preview staging, multiple selection, removal, and object URL revocation.
const createdUrls: string[] = [];
const revokedUrls: string[] = [];
const objectUrls = {
  createObjectURL: () => { const url = `blob:synthetic-${createdUrls.length + 1}`; createdUrls.push(url); return url; },
  revokeObjectURL: (url: string) => { revokedUrls.push(url); },
};
const staged = stageCaseMediaFiles([png("one.png"), png("two.png")], 0, objectUrls);
assert.equal(staged.items.length, 2);
assert.deepEqual(staged.items.map((item) => item.previewUrl), createdUrls);
const remaining = removeStagedCaseMedia(staged.items, staged.items[0].id, objectUrls);
assert.equal(remaining.length, 1);
assert.deepEqual(revokedUrls, ["blob:synthetic-1"]);
assert.equal(stageCaseMediaFiles([new File(["pdf"], "bad.pdf", { type: "application/pdf" })], 0, objectUrls).items.length, 0);

// A case without images does not require attestation and makes no upload request.
const noImageEvents: string[] = [];
const noImageResult = await executeCaseCreationWithMedia(payload, [], false, {
  createCase: async () => { noImageEvents.push("create"); return createdCase; },
  uploadMedia: async () => { noImageEvents.push("upload"); },
}, noopStatus);
assert.equal(noImageResult.caseItem.id, createdCase.id);
assert.deepEqual(noImageEvents, ["create"]);

// Case creation always completes first and its returned ID is used for every sequential upload.
const order: string[] = [];
let activeUploads = 0;
let maxActiveUploads = 0;
const multiResult = await executeCaseCreationWithMedia(payload, [upload("a"), upload("b")], true, {
  createCase: async () => { order.push("create"); return createdCase; },
  uploadMedia: async (caseId, media, _attested, processing) => {
    activeUploads += 1;
    maxActiveUploads = Math.max(maxActiveUploads, activeUploads);
    order.push(`upload:${caseId}:${media.id}`);
    processing();
    await Promise.resolve();
    activeUploads -= 1;
  },
}, noopStatus);
assert.deepEqual(multiResult.failedIds, []);
assert.deepEqual(order, ["create", `upload:${createdCase.id}:a`, `upload:${createdCase.id}:b`]);
assert.equal(maxActiveUploads, 1);

// Case failure triggers zero media requests and preserves failure for the caller to display.
let uploadsAfterCaseFailure = 0;
await assert.rejects(() => executeCaseCreationWithMedia(payload, [upload("never")], true, {
  createCase: async () => { throw new Error("case rejected"); },
  uploadMedia: async () => { uploadsAfterCaseFailure += 1; },
}, noopStatus), /case rejected/);
assert.equal(uploadsAfterCaseFailure, 0);

// Attestation is required before either creation-with-media or retry begins.
let createsWithoutAttestation = 0;
await assert.rejects(() => executeCaseCreationWithMedia(payload, [upload("protected")], false, {
  createCase: async () => { createsWithoutAttestation += 1; return createdCase; },
  uploadMedia: async () => undefined,
}, noopStatus), /attestation/);
assert.equal(createsWithoutAttestation, 0);

// Partial failure preserves the case; retry receives only that existing case ID and cannot recreate it.
const statusEvents: string[] = [];
const partial = await executeCaseCreationWithMedia(payload, [upload("ok"), upload("failed")], true, {
  createCase: async () => createdCase,
  uploadMedia: async (_caseId, media) => { if (media.id === "failed") throw new Error("synthetic failure"); },
}, (id, status) => statusEvents.push(`${id}:${status}`));
assert.deepEqual(partial.failedIds, ["failed"]);
assert(statusEvents.includes("ok:complete"));
assert(statusEvents.includes("failed:failed"));
const retryCaseIds: string[] = [];
const retryFailures = await retryFailedCaseMedia(createdCase.id, [upload("failed")], true, async (caseId) => { retryCaseIds.push(caseId); }, noopStatus);
assert.deepEqual(retryFailures, []);
assert.deepEqual(retryCaseIds, [createdCase.id]);

// Source contracts cover hook locking, cleanup, route sharing, secure API-only transport, and open-on-success.
const root = new URL("../../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");
const dialog = read("src/components/mycases/forms/CaseCreateDialog.tsx");
const stagingHook = read("src/components/mycases/hooks/useStagedCaseMedia.ts");
const workflowHook = read("src/components/mycases/hooks/useCreateCaseWithMedia.ts");
const workspace = read("src/components/mycases/MyCasesWorkspace.tsx");
const student = read("src/app/student-workspace/mycases/page.tsx");
const resident = read("src/app/work/mycases/page.tsx");
assert(workflowHook.includes("submissionLock.current"));
assert(workflowHook.includes("/api/mycases/cases/${caseId}/assets"));
assert.equal(workflowHook.includes(".storage"), false);
assert.equal(workflowHook.includes("user_id"), false);
assert(stagingHook.match(/URL\.revokeObjectURL/g)?.length && stagingHook.match(/URL\.revokeObjectURL/g)!.length >= 3);
assert(dialog.includes("staged.clear()"));
assert(dialog.includes("window.confirm"));
assert(dialog.includes("await onOpenCase(result.caseItem)"));
assert(dialog.includes("Retry ${failedCount} failed"));
assert(workspace.includes("<CaseCreateDialog"));
assert(student.includes("<MyCasesWorkspace"));
assert(resident.includes("<MyCasesWorkspace"));

console.log("MyCases case-creation media workflow tests passed");
