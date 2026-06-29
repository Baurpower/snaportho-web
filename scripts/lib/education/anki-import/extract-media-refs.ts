import { basename } from "node:path";
import type { MediaKind, ParsedAnkiMediaRef } from "./types.ts";

type ExtractMediaRefInput = {
  sourceNoteKey: string;
  sourceCardKey?: string | null;
  fieldName: string;
  html: string;
  mediaManifest?: Map<string, string>;
  packageHashes?: Map<string, string>;
};

function inferKind(value: string): MediaKind {
  const lower = value.toLowerCase();

  if (/\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(lower)) {
    return "image";
  }

  if (/\.(mp3|wav|ogg|m4a)$/i.test(lower)) {
    return "audio";
  }

  return "other";
}

export function extractMediaRefs({
  sourceNoteKey,
  sourceCardKey = null,
  fieldName,
  html,
  mediaManifest,
  packageHashes,
}: ExtractMediaRefInput): ParsedAnkiMediaRef[] {
  const refs = new Map<string, ParsedAnkiMediaRef>();
  const imageRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const soundRegex = /\[sound:([^\]]+)\]/gi;

  const addRef = (rawSrc: string) => {
    const mediaSrc = rawSrc.trim();
    if (!mediaSrc) {
      return;
    }

    const fileName = basename(mediaSrc.split("?")[0]);
    const packageEntryName = mediaManifest?.get(fileName) ?? null;
    const mediaSha256 = packageEntryName ? packageHashes?.get(packageEntryName) ?? null : null;
    const key = `${fieldName}::${mediaSrc}`;

    refs.set(key, {
      sourceNoteKey,
      sourceCardKey,
      fieldName,
      mediaKind: inferKind(fileName || mediaSrc),
      mediaSrc,
      packageEntryName,
      mediaSha256,
      existsInPackage: Boolean(packageEntryName),
      metadata: {
        fileName,
      },
    });
  };

  for (const match of html.matchAll(imageRegex)) {
    addRef(match[1] ?? "");
  }

  for (const match of html.matchAll(soundRegex)) {
    addRef(match[1] ?? "");
  }

  return Array.from(refs.values());
}
