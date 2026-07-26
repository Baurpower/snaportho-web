/**
 * Publish a media-complete pilot SnapOrtho Master deck release + bootstrap .apkg.
 *
 * Usage:
 *   npm run education:anki:bootstrap:publish-pilot -- --dry-run
 *   npm run education:anki:bootstrap:publish-pilot -- --limit=50
 *
 * Media is hydrated from a local Anki collection.media directory (default: User 1).
 */
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { computeCentralSyncHash } from "../src/lib/education/anki-deck-incorporation.ts";
import { ARTIFACT_SCHEMA_VERSION } from "../src/lib/education/anki-bootstrap-notetype.ts";
import {
  buildBootstrapApkg,
  type BootstrapBuildInput,
  type BootstrapMediaInput,
} from "./lib/education/anki-bootstrap/build-apkg.ts";
import {
  computeReleaseManifestChecksum,
  normalizeMediaFilename,
  resolveMediaFile,
  type ResolvedMediaFile,
} from "./lib/education/anki-bootstrap/media-resolve.ts";

const BUCKET = "anki-deck-media";
const DEFAULT_MEDIA_DIR = join(
  homedir(),
  "Library/Application Support/Anki2/User 1/collection.media",
);

function arg(name: string): string | undefined {
  return process.argv.find((v) => v.startsWith(`--${name}=`))?.slice(name.length + 3);
}
function flag(name: string): boolean {
  return process.argv.includes(`--${name}`) || arg(name) === "true" || arg(name) === "1";
}
function num(name: string, fallback: number): number {
  const v = arg(name);
  if (v == null || v === "") return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`invalid --${name}`);
  return n;
}

function loadEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const env: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i <= 0) continue;
    env[trimmed.slice(0, i).trim()] = trimmed
      .slice(i + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
  }
  return env;
}

function serviceClient(): SupabaseClient {
  const fileEnv = loadEnvFile(resolve(process.cwd(), ".env.local"));
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || fileEnv.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || fileEnv.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

type MediaRef = { note_id: string; media_src: string; media_kind: string; metadata: any };
type Candidate = {
  canonical_card_id: string;
  canonical_card_version_id: string;
  note_id: string;
  note_guid: string;
  card_ordinal: number;
  native_card_id_hint: string | null;
  content_hash: string;
  deck_path: string;
  field_snapshot: any[];
  tag_snapshot: string[];
  mediaFilenames: string[];
  resolvedMedia: ResolvedMediaFile[];
};

async function fetchAllMediaRefs(supabase: SupabaseClient): Promise<MediaRef[]> {
  const pageSize = 1000;
  let from = 0;
  const all: MediaRef[] = [];
  for (;;) {
    const { data, error } = await supabase
      .from("anki_media_refs")
      .select("note_id,media_src,media_kind,metadata")
      .eq("is_active", true)
      .in("media_kind", ["image", "audio"])
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`media_refs:${error.message}`);
    if (!data?.length) break;
    all.push(...(data as MediaRef[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function loadCandidates(
  supabase: SupabaseClient,
  mediaDir: string,
  limit: number,
  maxMediaFiles: number,
): Promise<{
  selected: Candidate[];
  stats: Record<string, number>;
  mediaMap: Map<string, ResolvedMediaFile>;
}> {
  const refs = await fetchAllMediaRefs(supabase);
  const filesByNote = new Map<string, string[]>();
  for (const ref of refs) {
    const name = normalizeMediaFilename(ref.metadata?.fileName || ref.media_src || "");
    if (!name) continue;
    const list = filesByNote.get(ref.note_id) ?? [];
    if (!list.includes(name)) list.push(name);
    filesByNote.set(ref.note_id, list);
  }

  // Prefer notes that have media
  const noteIdsWithMedia = [...filesByNote.keys()];
  const stats = {
    mediaRefs: refs.length,
    notesWithMediaRefs: noteIdsWithMedia.length,
    skippedMissingMedia: 0,
    skippedUnsupportedMime: 0,
    skippedNoCard: 0,
    skippedMultiOrd: 0,
  };

  const mediaMap = new Map<string, ResolvedMediaFile>();
  const selected: Candidate[] = [];
  const usedMedia = new Set<string>();

  // Process in chunks of note ids
  const chunkSize = 80;
  for (let i = 0; i < noteIdsWithMedia.length && selected.length < limit; i += chunkSize) {
    const chunk = noteIdsWithMedia.slice(i, i + chunkSize);
    const { data: cards, error } = await supabase
      .from("canonical_cards")
      .select(
        "id,anki_note_id,anki_card_id,current_version_id,is_active,anki_notes!inner(id,anki_note_guid,is_active),anki_cards!inner(id,card_ord,anki_card_id,is_active,deck_id,anki_decks!inner(full_name)),canonical_card_versions!canonical_cards_current_version_id_fkey(id,content_hash,field_snapshot,tag_snapshot,is_active)",
      )
      .eq("is_active", true)
      .in("anki_note_id", chunk);
    if (error) {
      // Fallback without fancy FK names if join aliases fail
      console.warn("join query failed, using fallback:", error.message);
      break;
    }
    for (const row of cards ?? []) {
      if (selected.length >= limit) break;
      const note = (row as any).anki_notes;
      const ac = (row as any).anki_cards;
      const ver = (row as any).canonical_card_versions;
      if (!note?.is_active || !ac?.is_active || !ver?.is_active) {
        stats.skippedNoCard += 1;
        continue;
      }
      if (ac.card_ord !== 0) {
        stats.skippedMultiOrd += 1;
        continue;
      }
      if (!note.anki_note_guid || !row.current_version_id || row.current_version_id !== ver.id) {
        stats.skippedNoCard += 1;
        continue;
      }
      const filenames = filesByNote.get(row.anki_note_id) ?? [];
      const resolved: ResolvedMediaFile[] = [];
      let bad = false;
      for (const name of filenames) {
        const result = resolveMediaFile(mediaDir, name);
        if (!result.ok) {
          if (result.reason === "missing_on_disk") stats.skippedMissingMedia += 1;
          if (result.reason === "unsupported_mime") stats.skippedUnsupportedMime += 1;
          bad = true;
          break;
        }
        resolved.push(result.file);
      }
      if (bad) continue;

      // Media budget
      const newFiles = resolved.filter((f) => !usedMedia.has(f.logicalFilename));
      if (usedMedia.size + newFiles.length > maxMediaFiles) continue;

      for (const f of resolved) {
        usedMedia.add(f.logicalFilename);
        mediaMap.set(f.logicalFilename, f);
      }

      const deckPath = ac.anki_decks?.full_name;
      if (!deckPath) {
        stats.skippedNoCard += 1;
        continue;
      }

      selected.push({
        canonical_card_id: row.id,
        canonical_card_version_id: ver.id,
        note_id: row.anki_note_id,
        note_guid: note.anki_note_guid,
        card_ordinal: ac.card_ord,
        native_card_id_hint: ac.anki_card_id != null ? String(ac.anki_card_id) : null,
        content_hash: ver.content_hash,
        deck_path: deckPath,
        field_snapshot: Array.isArray(ver.field_snapshot) ? ver.field_snapshot : [],
        tag_snapshot: Array.isArray(ver.tag_snapshot) ? ver.tag_snapshot : [],
        mediaFilenames: filenames,
        resolvedMedia: resolved,
      });
    }
  }

  // If FK join failed or not enough, use sequential fallback
  if (selected.length < limit) {
    await fallbackLoad(
      supabase,
      mediaDir,
      limit,
      maxMediaFiles,
      filesByNote,
      selected,
      mediaMap,
      usedMedia,
      stats,
    );
  }

  return { selected, stats, mediaMap };
}

async function fallbackLoad(
  supabase: SupabaseClient,
  mediaDir: string,
  limit: number,
  maxMediaFiles: number,
  filesByNote: Map<string, string[]>,
  selected: Candidate[],
  mediaMap: Map<string, ResolvedMediaFile>,
  usedMedia: Set<string>,
  stats: Record<string, number>,
) {
  const selectedIds = new Set(selected.map((c) => c.canonical_card_id));
  let offset = 0;
  const page = 100;
  while (selected.length < limit) {
    const { data: cards, error } = await supabase
      .from("canonical_cards")
      .select("id,anki_note_id,anki_card_id,current_version_id,is_active")
      .eq("is_active", true)
      .range(offset, offset + page - 1);
    if (error) throw new Error(`canonical_cards:${error.message}`);
    if (!cards?.length) break;
    offset += page;

    for (const card of cards) {
      if (selected.length >= limit) break;
      if (selectedIds.has(card.id)) continue;
      if (!filesByNote.has(card.anki_note_id)) continue;

      const { data: note } = await supabase
        .from("anki_notes")
        .select("id,anki_note_guid,is_active")
        .eq("id", card.anki_note_id)
        .maybeSingle();
      const { data: ac } = await supabase
        .from("anki_cards")
        .select("id,card_ord,anki_card_id,is_active,deck_id")
        .eq("id", card.anki_card_id)
        .maybeSingle();
      const { data: ver } = await supabase
        .from("canonical_card_versions")
        .select("id,content_hash,field_snapshot,tag_snapshot,is_active")
        .eq("id", card.current_version_id)
        .maybeSingle();
      if (!note?.is_active || !ac?.is_active || !ver?.is_active || ac.card_ord !== 0) continue;
      if (!note.anki_note_guid) continue;

      const { data: deck } = await supabase
        .from("anki_decks")
        .select("full_name")
        .eq("id", ac.deck_id)
        .maybeSingle();
      if (!deck?.full_name) continue;

      const filenames = filesByNote.get(card.anki_note_id) ?? [];
      const resolved: ResolvedMediaFile[] = [];
      let bad = false;
      for (const name of filenames) {
        const result = resolveMediaFile(mediaDir, name);
        if (!result.ok) {
          bad = true;
          if (result.reason === "missing_on_disk") stats.skippedMissingMedia += 1;
          if (result.reason === "unsupported_mime") stats.skippedUnsupportedMime += 1;
          break;
        }
        resolved.push(result.file);
      }
      if (bad) continue;
      const newFiles = resolved.filter((f) => !usedMedia.has(f.logicalFilename));
      if (usedMedia.size + newFiles.length > maxMediaFiles) continue;
      for (const f of resolved) {
        usedMedia.add(f.logicalFilename);
        mediaMap.set(f.logicalFilename, f);
      }

      selected.push({
        canonical_card_id: card.id,
        canonical_card_version_id: ver.id,
        note_id: card.anki_note_id,
        note_guid: note.anki_note_guid,
        card_ordinal: ac.card_ord,
        native_card_id_hint: ac.anki_card_id != null ? String(ac.anki_card_id) : null,
        content_hash: ver.content_hash,
        deck_path: deck.full_name,
        field_snapshot: Array.isArray(ver.field_snapshot) ? ver.field_snapshot : [],
        tag_snapshot: Array.isArray(ver.tag_snapshot) ? ver.tag_snapshot : [],
        mediaFilenames: filenames,
        resolvedMedia: resolved,
      });
      selectedIds.add(card.id);
    }
    if (cards.length < page) break;
  }
}

async function ensureBucket(supabase: SupabaseClient) {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets?.some((b) => b.name === BUCKET)) return;
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 50 * 1024 * 1024,
  });
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(`create_bucket:${error.message}`);
  }
}

async function main() {
  const dryRun = flag("dry-run");
  const limit = num("limit", 50);
  const maxMediaFiles = num("max-media-files", 200);
  const requireMediaRatio = num("require-media-ratio", 0.5);
  const mediaDir = arg("media-dir") || DEFAULT_MEDIA_DIR;
  const releaseKey = arg("release-key") || "snaportho-master-pilot";
  const releaseVersion = arg("release-version") || "0.1.0-pilot";
  const outPath = arg("out") || `/tmp/SnapOrtho-Master-${releaseVersion}.apkg`;

  if (!existsSync(mediaDir)) {
    throw new Error(`media-dir does not exist: ${mediaDir}`);
  }

  const supabase = serviceClient();
  console.log(
    JSON.stringify(
      { dryRun, limit, maxMediaFiles, requireMediaRatio, mediaDir, releaseKey, releaseVersion },
      null,
      2,
    ),
  );

  const { selected, stats, mediaMap } = await loadCandidates(
    supabase,
    mediaDir,
    limit,
    maxMediaFiles,
  );

  const withMedia = selected.filter((c) => c.resolvedMedia.length > 0).length;
  const mediaBytes = [...mediaMap.values()].reduce((n, f) => n + f.byteSize, 0);
  const ratio = selected.length ? withMedia / selected.length : 0;

  const report = {
    cards: selected.length,
    cardsWithMedia: withMedia,
    cardsTextOnly: selected.length - withMedia,
    mediaFiles: mediaMap.size,
    mediaBytes,
    mediaMB: Math.round((mediaBytes / (1024 * 1024)) * 10) / 10,
    mediaRatio: Math.round(ratio * 100) / 100,
    stats,
    sample: selected.slice(0, 3).map((c) => ({
      guid: c.note_guid,
      deck: c.deck_path,
      media: c.mediaFilenames.slice(0, 3),
    })),
  };
  console.log(JSON.stringify(report, null, 2));

  if (selected.length === 0) throw new Error("no_pilot_cards_selected");
  if (ratio < requireMediaRatio) {
    throw new Error(
      `media_ratio_too_low:${ratio}<${requireMediaRatio} (cardsWithMedia=${withMedia}/${selected.length})`,
    );
  }

  if (dryRun) {
    console.log("dry-run complete — no database or storage writes");
    return;
  }

  // Existing release key?
  const { data: existing } = await supabase
    .from("anki_deck_releases")
    .select("id,status,release_version")
    .eq("release_key", releaseKey)
    .maybeSingle();
  if (existing?.status === "published") {
    throw new Error(
      `release_key_already_published:${releaseKey} (${existing.id}). Use a new --release-key or version.`,
    );
  }

  const { data: batch, error: batchError } = await supabase
    .from("anki_import_batches")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (batchError || !batch) throw new Error(`import_batch_unavailable:${batchError?.message}`);

  const releaseId = existing?.id || randomUUID();
  const placeholderChecksum = "0".repeat(64);

  if (!existing) {
    const { error } = await supabase.from("anki_deck_releases").insert({
      id: releaseId,
      release_key: releaseKey,
      release_version: releaseVersion,
      import_batch_id: batch.id,
      status: "draft",
      manifest_schema_version: "snaportho-deck-manifest.v1",
      manifest_checksum: placeholderChecksum,
      minimum_addon_version: "0.7.0",
      metadata: {
        purpose: "pilot_bootstrap_download",
        card_count: selected.length,
        media_files: mediaMap.size,
        built_by: "publish-master-deck-pilot",
      },
    });
    if (error) throw new Error(`insert_release:${error.message}`);
  } else if (existing.status === "draft") {
    // clear old membership if re-running draft
    await supabase.from("anki_deck_release_cards").delete().eq("deck_release_id", releaseId);
    await supabase.from("anki_deck_media_assets").delete().eq("deck_release_id", releaseId);
  } else {
    throw new Error(`release_in_unexpected_status:${existing.status}`);
  }

  // ordering_key must match ^[A-Za-z0-9._:/-]{1,500}$ — Anki GUIDs often contain ~ = % etc.
  const members = selected.map((c, index) => {
    const guidKey = createHash("sha256").update(c.note_guid).digest("hex").slice(0, 16);
    return {
      deck_release_id: releaseId,
      canonical_card_id: c.canonical_card_id,
      canonical_card_version_id: c.canonical_card_version_id,
      note_guid: c.note_guid,
      card_ordinal: c.card_ordinal,
      native_card_id_hint: c.native_card_id_hint,
      content_hash: c.content_hash,
      deck_path: c.deck_path,
      ordering_key: `${String(index + 1).padStart(5, "0")}/${guidKey}/${c.card_ordinal}`,
      inclusion_status: "included",
      metadata: {},
    };
  });

  // Insert members in chunks
  for (let i = 0; i < members.length; i += 25) {
    const chunk = members.slice(i, i + 25);
    const { error } = await supabase.from("anki_deck_release_cards").insert(chunk);
    if (error) throw new Error(`insert_members:${error.message}`);
  }

  const checksum = computeReleaseManifestChecksum(members);
  const { error: checksumError } = await supabase
    .from("anki_deck_releases")
    .update({ manifest_checksum: checksum })
    .eq("id", releaseId);
  if (checksumError) throw new Error(`update_checksum:${checksumError.message}`);

  await ensureBucket(supabase);

  // Upload media + insert assets
  const mediaInputs: BootstrapMediaInput[] = [];
  const versionForFile = new Map<string, string>();
  for (const c of selected) {
    for (const f of c.resolvedMedia) {
      if (!versionForFile.has(f.logicalFilename)) {
        versionForFile.set(f.logicalFilename, c.canonical_card_version_id);
      }
    }
  }

  for (const file of mediaMap.values()) {
    const objectKey = `deck-releases/${releaseId}/media/${file.contentSha256}`;
    const { error: upError } = await supabase.storage
      .from(BUCKET)
      .upload(objectKey, file.bytes, {
        contentType: file.mimeType,
        upsert: true,
      });
    if (upError) throw new Error(`media_upload:${file.logicalFilename}:${upError.message}`);

    const { error: assetError } = await supabase.from("anki_deck_media_assets").insert({
      deck_release_id: releaseId,
      canonical_card_version_id: versionForFile.get(file.logicalFilename) ?? null,
      logical_filename: file.logicalFilename,
      content_sha256: file.contentSha256,
      mime_type: file.mimeType,
      byte_size: file.byteSize,
      object_key: objectKey,
      license_status: "owned",
      provenance: {
        source: "local_anki_collection.media",
        profile: "User 1",
        pilot: true,
      },
    });
    if (assetError) throw new Error(`media_asset:${file.logicalFilename}:${assetError.message}`);

    mediaInputs.push({
      contentSha256: file.contentSha256,
      logicalFilename: file.logicalFilename,
      bytes: file.bytes,
    });
  }

  // Lifecycle → review → published
  const now = new Date().toISOString();
  const { error: reviewError } = await supabase
    .from("anki_deck_releases")
    .update({ status: "review", reviewed_at: now })
    .eq("id", releaseId);
  if (reviewError) throw new Error(`to_review:${reviewError.message}`);

  const { error: pubError } = await supabase
    .from("anki_deck_releases")
    .update({ status: "published", published_at: now })
    .eq("id", releaseId);
  if (pubError) throw new Error(`to_published:${pubError.message}`);

  // Build bootstrap input with per-card media hashes from resolved files
  const buildInput: BootstrapBuildInput = {
    release: {
      id: releaseId,
      releaseKey,
      releaseVersion,
      manifestChecksum: checksum,
    },
    cards: selected.map((c, index) => {
      const tags = c.tag_snapshot.filter((t) => t.startsWith("SnapOrtho::"));
      const centralHash = computeCentralSyncHash(c.field_snapshot, c.tag_snapshot, c.card_ordinal);
      return {
        canonicalCardId: c.canonical_card_id,
        canonicalCardVersionId: c.canonical_card_version_id,
        contentHash: centralHash,
        noteGuid: c.note_guid,
        cardOrdinal: c.card_ordinal,
        deckPath: c.deck_path,
        orderingKey: members[index]!.ordering_key,
        inclusionStatus: "included",
        fieldSnapshot: c.field_snapshot,
        centralTags: tags,
        mediaHashes: c.resolvedMedia.map((m) => m.contentSha256),
      };
    }),
    media: mediaInputs,
  };

  const result = buildBootstrapApkg(buildInput);
  mkdirSync(resolve(outPath, ".."), { recursive: true });
  writeFileSync(outPath, result.apkgBytes);

  const objectKey = `deck-releases/${releaseId}/bootstrap/${result.artifactChecksum}.apkg`;
  const { error: bootUpError } = await supabase.storage
    .from(BUCKET)
    .upload(objectKey, result.apkgBytes, {
      contentType: "application/apkg",
      upsert: true,
    });
  if (bootUpError) throw new Error(`bootstrap_upload:${bootUpError.message}`);

  const { error: artError } = await supabase.from("anki_deck_release_artifacts").insert({
    deck_release_id: releaseId,
    artifact_type: "bootstrap_apkg",
    artifact_schema_version: ARTIFACT_SCHEMA_VERSION,
    artifact_checksum: result.artifactChecksum,
    object_key: objectKey,
    byte_size: result.apkgBytes.length,
    media_type: "application/apkg",
    status: "published",
    published_at: now,
  });
  if (artError) throw new Error(`register_artifact:${artError.message}`);

  // Signed URL smoke
  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(objectKey, 300, { download: `SnapOrtho-Master-${releaseVersion}.apkg` });

  console.log(
    JSON.stringify(
      {
        ok: true,
        releaseId,
        releaseKey,
        releaseVersion,
        manifestChecksum: checksum,
        cards: selected.length,
        mediaFiles: mediaMap.size,
        apkgPath: outPath,
        apkgBytes: result.apkgBytes.length,
        apkgMB: Math.round((result.apkgBytes.length / (1024 * 1024)) * 10) / 10,
        artifactChecksum: result.artifactChecksum,
        objectKey,
        signedUrlReady: Boolean(signed?.signedUrl),
        next: "In Anki 0.7.0: Get Started / Master Deck → Download SnapOrtho Master Deck",
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
