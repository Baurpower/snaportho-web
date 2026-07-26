/**
 * Resolve Anki media filenames from a local collection.media directory.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
};

export type ResolvedMediaFile = {
  logicalFilename: string;
  absolutePath: string;
  contentSha256: string;
  mimeType: string;
  byteSize: number;
  bytes: Buffer;
};

export function normalizeMediaFilename(raw: string): string {
  return basename(String(raw || "").trim().split(/[?#]/)[0]);
}

export function mimeForFilename(filename: string): string | null {
  const lower = filename.toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot < 0) return null;
  return MIME_BY_EXT[lower.slice(dot)] ?? null;
}

export function resolveMediaFile(
  mediaDir: string,
  rawName: string,
): { ok: true; file: ResolvedMediaFile } | { ok: false; reason: string; filename: string } {
  const logicalFilename = normalizeMediaFilename(rawName);
  if (!logicalFilename) return { ok: false, reason: "empty_filename", filename: rawName };
  const mimeType = mimeForFilename(logicalFilename);
  if (!mimeType) return { ok: false, reason: "unsupported_mime", filename: logicalFilename };
  const absolutePath = join(mediaDir, logicalFilename);
  if (!existsSync(absolutePath)) {
    return { ok: false, reason: "missing_on_disk", filename: logicalFilename };
  }
  const bytes = readFileSync(absolutePath);
  const byteSize = bytes.length || statSync(absolutePath).size;
  if (byteSize <= 0) return { ok: false, reason: "empty_file", filename: logicalFilename };
  const contentSha256 = createHash("sha256").update(bytes).digest("hex");
  return {
    ok: true,
    file: { logicalFilename, absolutePath, contentSha256, mimeType, byteSize, bytes },
  };
}

export function sha256Hex(buf: Buffer | string): string {
  return createHash("sha256").update(buf).digest("hex");
}

/** Match Postgres release membership checksum used by publish trigger. */
export function computeReleaseManifestChecksum(
  members: Array<{
    canonical_card_id: string;
    canonical_card_version_id: string;
    note_guid: string;
    card_ordinal: number;
    native_card_id_hint: string | null;
    content_hash: string;
    deck_path: string;
    ordering_key: string;
    inclusion_status: string;
  }>,
): string {
  const lines = [...members]
    .sort((a, b) =>
      a.ordering_key < b.ordering_key ? -1 : a.ordering_key > b.ordering_key ? 1 : 0,
    )
    .map((m) =>
      [
        m.canonical_card_id,
        m.canonical_card_version_id,
        m.note_guid,
        String(m.card_ordinal),
        m.native_card_id_hint ?? "",
        m.content_hash,
        m.deck_path,
        m.ordering_key,
        m.inclusion_status,
      ].join("|"),
    );
  return sha256Hex(lines.join("\n"));
}
