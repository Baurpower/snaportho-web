"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MYCASES_MEDIA_MAX_UPLOAD_BYTES } from "@/lib/mycases/media/types";

export const MYCASES_CASE_MEDIA_MAX_FILES = 10;
export const MYCASES_CASE_MEDIA_ACCEPT = "image/jpeg,image/png,image/heic,image/heif";
const ALLOWED_MEDIA_TYPES = new Set(MYCASES_CASE_MEDIA_ACCEPT.split(","));

export type StagedCaseMediaStatus = "waiting" | "uploading" | "processing" | "complete" | "failed";

export type StagedCaseMedia = {
  id: string;
  file: File | null;
  displayName: string;
  previewUrl?: string;
  caption: string;
  status: StagedCaseMediaStatus;
  error?: string;
};

type ObjectUrlApi = Pick<typeof URL, "createObjectURL" | "revokeObjectURL">;

export function stageCaseMediaFiles(
  files: File[],
  currentCount: number,
  objectUrls: ObjectUrlApi = URL,
): { items: StagedCaseMedia[]; errors: string[] } {
  const items: StagedCaseMedia[] = [];
  const errors: string[] = [];
  let available = Math.max(0, MYCASES_CASE_MEDIA_MAX_FILES - currentCount);

  for (const file of files) {
    if (available === 0) {
      errors.push(`You can stage up to ${MYCASES_CASE_MEDIA_MAX_FILES} images per case.`);
      break;
    }
    if (!ALLOWED_MEDIA_TYPES.has(file.type)) {
      errors.push(`${file.name} is not a supported JPEG, PNG, HEIC, or HEIF image.`);
      continue;
    }
    if (file.size <= 0 || file.size > MYCASES_MEDIA_MAX_UPLOAD_BYTES) {
      errors.push(`${file.name} must be larger than 0 bytes and no more than 10 MB.`);
      continue;
    }
    items.push({
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      file,
      displayName: file.name,
      previewUrl: objectUrls.createObjectURL(file),
      caption: "",
      status: "waiting",
    });
    available -= 1;
  }
  return { items, errors: [...new Set(errors)] };
}

export function removeStagedCaseMedia(
  items: StagedCaseMedia[],
  id: string,
  objectUrls: Pick<typeof URL, "revokeObjectURL"> = URL,
): StagedCaseMedia[] {
  const removed = items.find((item) => item.id === id);
  if (removed?.previewUrl) objectUrls.revokeObjectURL(removed.previewUrl);
  return items.filter((item) => item.id !== id);
}

export function useStagedCaseMedia() {
  const [items, setItems] = useState<StagedCaseMedia[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const itemsRef = useRef<StagedCaseMedia[]>([]);
  const liveUrls = useRef(new Set<string>());

  const addFiles = useCallback((files: File[]) => {
    const result = stageCaseMediaFiles(files, itemsRef.current.length);
    for (const item of result.items) if (item.previewUrl) liveUrls.current.add(item.previewUrl);
    itemsRef.current = [...itemsRef.current, ...result.items];
    setItems(itemsRef.current);
    setValidationErrors(result.errors);
  }, []);

  const remove = useCallback((id: string) => {
    const target = itemsRef.current.find((item) => item.id === id);
    if (target?.previewUrl) liveUrls.current.delete(target.previewUrl);
    itemsRef.current = removeStagedCaseMedia(itemsRef.current, id);
    setItems(itemsRef.current);
    setValidationErrors([]);
  }, []);

  const updateCaption = useCallback((id: string, caption: string) => {
    itemsRef.current = itemsRef.current.map((item) => item.id === id ? { ...item, caption } : item);
    setItems(itemsRef.current);
  }, []);

  const setStatus = useCallback((id: string, status: StagedCaseMediaStatus, error?: string) => {
    itemsRef.current = itemsRef.current.map((item) => {
      if (item.id !== id) return item;
      if (status === "complete") {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
          liveUrls.current.delete(item.previewUrl);
        }
        return { ...item, file: null, previewUrl: undefined, status, error: undefined };
      }
      return { ...item, status, error };
    });
    setItems(itemsRef.current);
  }, []);

  const clear = useCallback(() => {
    for (const url of liveUrls.current) URL.revokeObjectURL(url);
    liveUrls.current.clear();
    itemsRef.current = [];
    setItems([]);
    setValidationErrors([]);
  }, []);

  useEffect(() => () => {
    for (const url of liveUrls.current) URL.revokeObjectURL(url);
    liveUrls.current.clear();
  }, []);

  return { items, validationErrors, addFiles, remove, updateCaption, setStatus, clear };
}
