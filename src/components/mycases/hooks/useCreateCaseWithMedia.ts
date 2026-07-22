"use client";

import { useCallback, useRef, useState } from "react";
import type { MyCasesCase, MyCasesCaseInput } from "@/lib/mycases/types";
import type { StagedCaseMedia, StagedCaseMediaStatus } from "./useStagedCaseMedia";

export type CaseMediaUpload = Pick<StagedCaseMedia, "id" | "file" | "caption" | "status"> & { file: File };
type StatusCallback = (id: string, status: StagedCaseMediaStatus, error?: string) => void;
type UploadMedia = (caseId: string, media: CaseMediaUpload, attested: boolean, onProcessing: () => void) => Promise<void>;

export type CaseCreationWorkflowDependencies = {
  createCase: (payload: MyCasesCaseInput) => Promise<MyCasesCase>;
  uploadMedia: UploadMedia;
};

export type CaseCreationWorkflowResult = {
  caseItem: MyCasesCase;
  failedIds: string[];
};

async function uploadSequentially(
  caseId: string,
  media: CaseMediaUpload[],
  attested: boolean,
  uploadMedia: UploadMedia,
  onStatus: StatusCallback,
) {
  const failedIds: string[] = [];
  for (const item of media) {
    onStatus(item.id, "uploading");
    try {
      await uploadMedia(caseId, item, attested, () => onStatus(item.id, "processing"));
      onStatus(item.id, "complete");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed. Review the image and retry.";
      failedIds.push(item.id);
      onStatus(item.id, "failed", message);
    }
  }
  return failedIds;
}

export async function executeCaseCreationWithMedia(
  payload: MyCasesCaseInput,
  media: CaseMediaUpload[],
  attested: boolean,
  dependencies: CaseCreationWorkflowDependencies,
  onStatus: StatusCallback,
): Promise<CaseCreationWorkflowResult> {
  if (media.length && !attested) throw new Error("Confirm the de-identification attestation before creating this case.");
  const caseItem = await dependencies.createCase(payload);
  const failedIds = await uploadSequentially(caseItem.id, media, attested, dependencies.uploadMedia, onStatus);
  return { caseItem, failedIds };
}

export async function retryFailedCaseMedia(
  caseId: string,
  failedMedia: CaseMediaUpload[],
  attested: boolean,
  uploadMedia: UploadMedia,
  onStatus: StatusCallback,
) {
  if (failedMedia.length && !attested) throw new Error("Confirm the de-identification attestation before retrying images.");
  return uploadSequentially(caseId, failedMedia, attested, uploadMedia, onStatus);
}

async function responseError(response: Response, fallback: string) {
  try {
    const body = await response.json() as { error?: string };
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

async function createCaseRequest(payload: MyCasesCaseInput) {
  const response = await fetch("/api/mycases/cases", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await responseError(response, "Unable to create the case."));
  const body = await response.json() as { case?: MyCasesCase };
  if (!body.case?.id) throw new Error("The case was created without a usable case ID.");
  return body.case;
}

function uploadMediaRequest(caseId: string, media: CaseMediaUpload, attested: boolean, onProcessing: () => void) {
  return new Promise<void>((resolve, reject) => {
    const form = new FormData();
    form.set("file", media.file);
    form.set("caption", media.caption);
    form.set("attestation", String(attested));
    const request = new XMLHttpRequest();
    request.open("POST", `/api/mycases/cases/${caseId}/assets`);
    request.upload.onload = onProcessing;
    request.onerror = () => reject(new Error("Network error while uploading. Retry when connected."));
    request.onload = async () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
        return;
      }
      let message = "Upload failed. Review the image and retry.";
      try { message = (JSON.parse(request.responseText) as { error?: string }).error || message; } catch {}
      reject(new Error(message));
    };
    request.send(form);
  });
}

export function useCreateCaseWithMedia() {
  const [createdCase, setCreatedCase] = useState<MyCasesCase | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submissionLock = useRef(false);

  const submit = useCallback(async (
    payload: MyCasesCaseInput,
    media: CaseMediaUpload[],
    attested: boolean,
    onStatus: StatusCallback,
  ) => {
    if (submissionLock.current) return null;
    submissionLock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await executeCaseCreationWithMedia(payload, media, attested, {
        createCase: createCaseRequest,
        uploadMedia: uploadMediaRequest,
      }, onStatus);
      setCreatedCase(result.caseItem);
      return result;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create the case.");
      return null;
    } finally {
      submissionLock.current = false;
      setBusy(false);
    }
  }, []);

  const retry = useCallback(async (
    media: CaseMediaUpload[],
    attested: boolean,
    onStatus: StatusCallback,
  ) => {
    if (!createdCase || submissionLock.current) return null;
    submissionLock.current = true;
    setBusy(true);
    setError("");
    try {
      const failedIds = await retryFailedCaseMedia(createdCase.id, media, attested, uploadMediaRequest, onStatus);
      return { caseItem: createdCase, failedIds } satisfies CaseCreationWorkflowResult;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to retry the images.");
      return null;
    } finally {
      submissionLock.current = false;
      setBusy(false);
    }
  }, [createdCase]);

  return { createdCase, error, busy, submit, retry };
}
