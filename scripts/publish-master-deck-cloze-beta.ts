/**
 * Publish a cloze-only SnapOrtho Master beta deck (AnKing-style Text cloze → new style).
 *
 * Includes every active card with cloze markup on Text; excludes Image Occlusion.
 * Normalizes fields to SnapOrtho Master (style v1.0.0), builds bootstrap .apkg, registers artifact.
 *
 * Usage:
 *   npm run education:anki:bootstrap:publish-cloze-beta -- --dry-run
 *   npm run education:anki:bootstrap:publish-cloze-beta -- --limit=100 --dry-run
 *   npm run education:anki:bootstrap:publish-cloze-beta -- --out=/tmp/SnapOrtho-Master-beta.apkg
 *   npm run education:anki:bootstrap:publish-cloze-beta -- --skip-media
 */
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ARTIFACT_SCHEMA_VERSION, SNAPORTHO_STYLE_VERSION } from "../src/lib/education/anki-bootstrap-notetype.ts";
import { toProductDeckPath } from "../src/lib/education/anki-deck-path.ts";
import {
  normalizeFieldSnapshotToMaster,
  NORMALIZE_VERSION,
  type SnapshotField,
} from "../src/lib/education/anki-normalize-to-master.ts";
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`timeout:${label}:${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function withRetries<T>(
  label: string,
  fn: () => Promise<T>,
  attempts = 5,
  timeoutMs = 120_000,
): Promise<T> {
  let last: unknown;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      return await withTimeout(fn(), timeoutMs, label);
    } catch (error) {
      last = error;
      const msg = error instanceof Error ? error.message : String(error);
      console.error(JSON.stringify({ retry: label, attempt: i, attempts, error: msg }));
      if (i === attempts) break;
      await sleep(Math.min(30_000, 1000 * 2 ** (i - 1)));
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
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

type SelectedCard = {
  canonical_card_id: string;
  canonical_card_version_id: string;
  note_id: string;
  note_guid: string;
  card_ordinal: number;
  native_card_id_hint: string | null;
  /** Source deck path (import provenance) — required by release-member DB trigger. */
  source_deck_path: string;
  /** Product deck path for bootstrap .apkg placement. */
  product_deck_path: string;
  /** Version identity hash (must match canonical_card_versions.content_hash for membership). */
  version_content_hash: string;
  tag_snapshot: string[];
  fieldSnapshot: Array<{ name: string; rawValue: string }>;
  /** Central-sync hash of normalized Master fields (bootstrap markers + sync plan). */
  central_content_hash: string;
  mediaFilenames: string[];
  resolvedMedia: ResolvedMediaFile[];
};

async function fetchAllMediaRefs(supabase: SupabaseClient): Promise<Map<string, string[]>> {
  const pageSize = 1000;
  let from = 0;
  const filesByNote = new Map<string, string[]>();
  for (;;) {
    const { data, error } = await supabase
      .from("anki_media_refs")
      .select("note_id,media_src,media_kind,metadata")
      .eq("is_active", true)
      .in("media_kind", ["image", "audio"])
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`media_refs:${error.message}`);
    if (!data?.length) break;
    for (const ref of data as MediaRef[]) {
      const name = normalizeMediaFilename(ref.metadata?.fileName || ref.media_src || "");
      if (!name) continue;
      const list = filesByNote.get(ref.note_id) ?? [];
      if (!list.includes(name)) list.push(name);
      filesByNote.set(ref.note_id, list);
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return filesByNote;
}

async function loadClozeBetaCohort(
  supabase: SupabaseClient,
  opts: {
    mediaDir: string;
    limit: number;
    skipMedia: boolean;
    maxMediaFiles: number;
  },
): Promise<{
  selected: SelectedCard[];
  stats: Record<string, number>;
  mediaMap: Map<string, ResolvedMediaFile>;
}> {
  const filesByNote = opts.skipMedia ? new Map<string, string[]>() : await fetchAllMediaRefs(supabase);
  const stats = {
    scanned: 0,
    clozeEligible: 0,
    skippedIo: 0,
    skippedNoCloze: 0,
    skippedMultiOrd: 0,
    skippedNoGuid: 0,
    skippedNoVersion: 0,
    skippedMissingMediaFile: 0,
    mediaAttached: 0,
    mediaSkippedBudget: 0,
  };

  const selected: SelectedCard[] = [];
  const mediaMap = new Map<string, ResolvedMediaFile>();
  const usedMedia = new Set<string>();
  let offset = 0;
  const page = 150;

  while (selected.length < opts.limit) {
    const cards = await withRetries(`canonical_cards:${offset}`, async () => {
      const { data, error } = await supabase
        .from("canonical_cards")
        .select("id,anki_note_id,anki_card_id,current_version_id,is_active")
        .eq("is_active", true)
        .range(offset, offset + page - 1);
      if (error) throw new Error(error.message);
      return data ?? [];
    });
    if (!cards?.length) break;
    offset += page;

    const versionIds = cards.map((c) => c.current_version_id).filter(Boolean);
    const noteIds = cards.map((c) => c.anki_note_id).filter(Boolean);
    const cardIds = cards.map((c) => c.anki_card_id).filter(Boolean);

    const [versions, notes, ankiCards] = await Promise.all([
      withRetries(`versions:${offset}`, async () => {
        const { data, error } = await supabase
          .from("canonical_card_versions")
          .select("id,content_hash,field_snapshot,tag_snapshot,is_active")
          .in("id", versionIds);
        if (error) throw new Error(error.message);
        return data ?? [];
      }),
      withRetries(`notes:${offset}`, async () => {
        const { data, error } = await supabase
          .from("anki_notes")
          .select("id,anki_note_guid,is_active")
          .in("id", noteIds);
        if (error) throw new Error(error.message);
        return data ?? [];
      }),
      withRetries(`anki_cards:${offset}`, async () => {
        const { data, error } = await supabase
          .from("anki_cards")
          .select("id,card_ord,anki_card_id,is_active,deck_id")
          .in("id", cardIds);
        if (error) throw new Error(error.message);
        return data ?? [];
      }),
    ]);

    const verById = new Map(versions.map((v) => [v.id, v]));
    const noteById = new Map(notes.map((n) => [n.id, n]));
    const acById = new Map(ankiCards.map((c) => [c.id, c]));

    const deckIds = [...new Set(ankiCards.map((c) => c.deck_id).filter(Boolean))] as string[];
    const deckById = new Map<string, string>();
    if (deckIds.length) {
      for (let i = 0; i < deckIds.length; i += 100) {
        const chunk = deckIds.slice(i, i + 100);
        const decks = await withRetries(`decks:${offset}:${i}`, async () => {
          const { data, error } = await supabase
            .from("anki_decks")
            .select("id,full_name")
            .in("id", chunk);
          if (error) throw new Error(error.message);
          return data ?? [];
        });
        for (const d of decks) deckById.set(d.id, d.full_name);
      }
    }

    for (const card of cards) {
      if (selected.length >= opts.limit) break;
      stats.scanned += 1;

      const note = noteById.get(card.anki_note_id);
      const ac = acById.get(card.anki_card_id);
      const ver = verById.get(card.current_version_id);
      if (!note?.is_active || !ac?.is_active || !ver?.is_active) {
        stats.skippedNoVersion += 1;
        continue;
      }
      if (ac.card_ord !== 0) {
        stats.skippedMultiOrd += 1;
        continue;
      }
      if (!note.anki_note_guid) {
        stats.skippedNoGuid += 1;
        continue;
      }

      const rawFields = (Array.isArray(ver.field_snapshot) ? ver.field_snapshot : []) as SnapshotField[];
      const tags = Array.isArray(ver.tag_snapshot) ? (ver.tag_snapshot as string[]) : [];
      const norm = normalizeFieldSnapshotToMaster(rawFields, tags, ac.card_ord);

      if (norm.isImageOcclusion) {
        stats.skippedIo += 1;
        continue;
      }
      if (!norm.clozeBetaEligible) {
        stats.skippedNoCloze += 1;
        continue;
      }

      const sourceDeckPath = deckById.get(ac.deck_id) ?? "";
      if (!sourceDeckPath) {
        stats.skippedNoVersion += 1;
        continue;
      }
      if (!ver.content_hash || !/^[a-f0-9]{64}$/.test(String(ver.content_hash))) {
        stats.skippedNoVersion += 1;
        continue;
      }

      const filenames = filesByNote.get(card.anki_note_id) ?? [];
      const resolved: ResolvedMediaFile[] = [];
      if (!opts.skipMedia && filenames.length) {
        let budgetHit = false;
        for (const name of filenames) {
          if (!usedMedia.has(name) && usedMedia.size >= opts.maxMediaFiles) {
            budgetHit = true;
            break;
          }
          const result = resolveMediaFile(opts.mediaDir, name);
          if (!result.ok) {
            if (result.reason === "missing_on_disk") stats.skippedMissingMediaFile += 1;
            continue; // text-only OK for missing files
          }
          resolved.push(result.file);
        }
        if (budgetHit) stats.mediaSkippedBudget += 1;
      }

      for (const f of resolved) {
        usedMedia.add(f.logicalFilename);
        mediaMap.set(f.logicalFilename, f);
      }
      if (resolved.length) stats.mediaAttached += 1;

      selected.push({
        canonical_card_id: card.id,
        canonical_card_version_id: ver.id,
        note_id: card.anki_note_id,
        note_guid: note.anki_note_guid,
        card_ordinal: ac.card_ord,
        native_card_id_hint: ac.anki_card_id != null ? String(ac.anki_card_id) : null,
        source_deck_path: sourceDeckPath,
        product_deck_path: toProductDeckPath(sourceDeckPath),
        version_content_hash: String(ver.content_hash),
        tag_snapshot: tags,
        fieldSnapshot: norm.fieldSnapshot,
        central_content_hash: norm.contentHash,
        mediaFilenames: filenames,
        resolvedMedia: resolved,
      });
      stats.clozeEligible += 1;
    }

    if (cards.length < page) break;
    if (stats.scanned % 750 === 0) {
      console.error(
        JSON.stringify({
          progress: "scanning",
          scanned: stats.scanned,
          selected: selected.length,
          mediaFiles: mediaMap.size,
        }),
      );
    }
  }

  return { selected, stats, mediaMap };
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
  const skipMedia = flag("skip-media");
  const limit = num("limit", 100_000);
  const maxMediaFiles = num("max-media-files", 50_000);
  const mediaDir = arg("media-dir") || DEFAULT_MEDIA_DIR;
  const releaseKey = arg("release-key") || "snaportho-master-beta";
  const releaseVersion = arg("release-version") || "0.3.0-cloze-style";
  const outPath = arg("out") || `/tmp/SnapOrtho-Master-${releaseVersion}.apkg`;
  const reportPath =
    arg("report") ||
    resolve(process.cwd(), `reports/education/cloze-beta-inventory-${releaseVersion}.json`);

  const supabase = serviceClient();
  console.log(
    JSON.stringify(
      {
        dryRun,
        skipMedia,
        limit,
        maxMediaFiles,
        mediaDir,
        releaseKey,
        releaseVersion,
        styleVersion: SNAPORTHO_STYLE_VERSION,
        normalizeVersion: NORMALIZE_VERSION,
      },
      null,
      2,
    ),
  );

  if (!skipMedia && !existsSync(mediaDir)) {
    console.warn(`media-dir missing (${mediaDir}); continuing with --skip-media behavior for files`);
  }

  const { selected, stats, mediaMap } = await loadClozeBetaCohort(supabase, {
    mediaDir: existsSync(mediaDir) ? mediaDir : DEFAULT_MEDIA_DIR,
    limit,
    skipMedia: skipMedia || !existsSync(mediaDir),
    maxMediaFiles,
  });

  const mediaBytes = [...mediaMap.values()].reduce((n, f) => n + f.byteSize, 0);
  const inventory = {
    cards: selected.length,
    mediaFiles: mediaMap.size,
    mediaBytes,
    mediaMB: Math.round((mediaBytes / (1024 * 1024)) * 10) / 10,
    stats,
    sample: selected.slice(0, 5).map((c) => ({
      guid: c.note_guid,
      deck: c.product_deck_path,
      text: (c.fieldSnapshot.find((f) => f.name === "Text")?.rawValue ?? "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 120),
      versionHash: c.version_content_hash.slice(0, 16),
      centralHash: c.central_content_hash.slice(0, 16),
    })),
  };

  mkdirSync(resolve(reportPath, ".."), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(inventory, null, 2));
  console.log(JSON.stringify({ ...inventory, reportPath }, null, 2));

  if (selected.length === 0) throw new Error("no_cloze_beta_cards_selected");
  if (dryRun) {
    console.log("dry-run complete — no database or storage writes");
    return;
  }

  const localOnly = flag("local-only");
  // When media is already inside the .apkg, skip slow per-file storage uploads (still register bootstrap artifact).
  const skipRemoteMediaUpload = flag("skip-remote-media-upload") || flag("apkg-only-upload");
  // Provisional release id for local builds; replaced/confirmed when registering remotely.
  let releaseId = randomUUID();

  // Membership rows (ordering keys) — release_id filled after insert.
  const memberSpecs = selected.map((c, index) => {
    const guidKey = createHash("sha256").update(c.note_guid).digest("hex").slice(0, 16);
    return {
      canonical_card_id: c.canonical_card_id,
      canonical_card_version_id: c.canonical_card_version_id,
      note_guid: c.note_guid,
      card_ordinal: c.card_ordinal,
      native_card_id_hint: c.native_card_id_hint,
      content_hash: c.version_content_hash,
      deck_path: c.source_deck_path,
      ordering_key: `${String(index + 1).padStart(5, "0")}/${guidKey}/${c.card_ordinal}`,
      inclusion_status: "included" as const,
      metadata: {
        normalizeVersion: NORMALIZE_VERSION,
        centralContentHash: c.central_content_hash,
        productDeckPath: c.product_deck_path,
      },
      central_content_hash: c.central_content_hash,
      product_deck_path: c.product_deck_path,
      fieldSnapshot: c.fieldSnapshot,
      tag_snapshot: c.tag_snapshot,
      mediaHashes: c.resolvedMedia.map((m) => m.contentSha256),
    };
  });

  const mediaInputs: BootstrapMediaInput[] = [...mediaMap.values()].map((file) => ({
    contentSha256: file.contentSha256,
    logicalFilename: file.logicalFilename,
    bytes: file.bytes,
  }));

  const provisionalChecksum = createHash("sha256")
    .update(memberSpecs.map((m) => m.ordering_key).join("\n"))
    .digest("hex");

  // Build local .apkg FIRST (media included) so a storage failure still yields a usable package.
  const buildInput: BootstrapBuildInput = {
    release: {
      id: releaseId,
      releaseKey,
      releaseVersion,
      manifestChecksum: provisionalChecksum,
    },
    cards: memberSpecs.map((m) => ({
      canonicalCardId: m.canonical_card_id,
      canonicalCardVersionId: m.canonical_card_version_id,
      contentHash: m.central_content_hash,
      noteGuid: m.note_guid,
      cardOrdinal: m.card_ordinal,
      deckPath: m.product_deck_path,
      orderingKey: m.ordering_key,
      inclusionStatus: "included",
      fieldSnapshot: m.fieldSnapshot,
      centralTags: m.tag_snapshot.filter((t) => t.startsWith("SnapOrtho::")),
      mediaHashes: m.mediaHashes,
    })),
    media: mediaInputs,
  };

  console.error(
    JSON.stringify({
      progress: "building_apkg",
      cards: selected.length,
      mediaFiles: mediaInputs.length,
      mediaMB: Math.round(mediaBytes / (1024 * 1024)),
    }),
  );
  const result = buildBootstrapApkg(buildInput);
  mkdirSync(resolve(outPath, ".."), { recursive: true });
  writeFileSync(outPath, result.apkgBytes);
  console.error(
    JSON.stringify({
      progress: "apkg_written",
      apkgPath: outPath,
      apkgMB: Math.round((result.apkgBytes.length / (1024 * 1024)) * 10) / 10,
      artifactChecksum: result.artifactChecksum,
    }),
  );

  if (localOnly) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          localOnly: true,
          releaseKey,
          releaseVersion,
          cards: selected.length,
          mediaFiles: mediaMap.size,
          apkgPath: outPath,
          apkgBytes: result.apkgBytes.length,
          apkgMB: Math.round((result.apkgBytes.length / (1024 * 1024)) * 10) / 10,
          artifactChecksum: result.artifactChecksum,
          next: "Import the local .apkg in Anki (File → Import). Re-run without --local-only to publish for add-on download.",
        },
        null,
        2,
      ),
    );
    return;
  }

  const { data: existing } = await supabase
    .from("anki_deck_releases")
    .select("id,status,release_version")
    .eq("release_key", releaseKey)
    .maybeSingle();
  if (existing?.status === "published") {
    throw new Error(
      `release_key_already_published:${releaseKey} (${existing.id}). Local apkg is still at ${outPath}. Use a new --release-key to register remotely.`,
    );
  }

  const { data: batch, error: batchError } = await supabase
    .from("anki_import_batches")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (batchError || !batch) throw new Error(`import_batch_unavailable:${batchError?.message}`);

  releaseId = existing?.id || releaseId;
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
        purpose: "cloze_only_style_beta",
        styleVersion: SNAPORTHO_STYLE_VERSION,
        normalizeVersion: NORMALIZE_VERSION,
        card_count: selected.length,
        media_files: mediaMap.size,
        media_bytes: mediaBytes,
        built_by: "publish-master-deck-cloze-beta",
        excludes: "image_occlusion",
        bootstrapMediaMode: "embedded",
      },
    });
    if (error) throw new Error(`insert_release:${error.message}`);
  } else if (existing.status === "draft") {
    await supabase.from("anki_deck_release_cards").delete().eq("deck_release_id", releaseId);
    await supabase.from("anki_deck_media_assets").delete().eq("deck_release_id", releaseId);
    await supabase
      .from("anki_deck_releases")
      .update({
        release_version: releaseVersion,
        metadata: {
          purpose: "cloze_only_style_beta",
          styleVersion: SNAPORTHO_STYLE_VERSION,
          normalizeVersion: NORMALIZE_VERSION,
          card_count: selected.length,
          media_files: mediaMap.size,
          media_bytes: mediaBytes,
          built_by: "publish-master-deck-cloze-beta",
          excludes: "image_occlusion",
          bootstrapMediaMode: "embedded",
        },
      })
      .eq("id", releaseId);
  } else {
    throw new Error(`release_in_unexpected_status:${existing.status}`);
  }

  const members = memberSpecs.map((m) => ({
    deck_release_id: releaseId,
    canonical_card_id: m.canonical_card_id,
    canonical_card_version_id: m.canonical_card_version_id,
    note_guid: m.note_guid,
    card_ordinal: m.card_ordinal,
    native_card_id_hint: m.native_card_id_hint,
    content_hash: m.content_hash,
    deck_path: m.deck_path,
    ordering_key: m.ordering_key,
    inclusion_status: m.inclusion_status,
    metadata: m.metadata,
  }));

  for (let i = 0; i < members.length; i += 25) {
    const chunk = members.slice(i, i + 25);
    const { error } = await supabase.from("anki_deck_release_cards").insert(chunk);
    if (error) throw new Error(`insert_members:${error.message}`);
    if ((i + 25) % 500 === 0 || i + 25 >= members.length) {
      console.error(JSON.stringify({ progress: "members", done: Math.min(i + 25, members.length) }));
    }
  }

  const checksum = computeReleaseManifestChecksum(members);
  const { error: checksumError } = await supabase
    .from("anki_deck_releases")
    .update({ manifest_checksum: checksum })
    .eq("id", releaseId);
  if (checksumError) throw new Error(`update_checksum:${checksumError.message}`);

  await ensureBucket(supabase);

  const versionForFile = new Map<string, string>();
  for (const c of selected) {
    for (const f of c.resolvedMedia) {
      if (!versionForFile.has(f.logicalFilename)) {
        versionForFile.set(f.logicalFilename, c.canonical_card_version_id);
      }
    }
  }

  let mediaUploaded = 0;
  if (skipRemoteMediaUpload) {
    console.error(
      JSON.stringify({
        progress: "skip_remote_media_upload",
        reason: "media_embedded_in_bootstrap_apkg",
        mediaFiles: mediaMap.size,
      }),
    );
  } else {
    for (const file of mediaMap.values()) {
      const objectKey = `deck-releases/${releaseId}/media/${file.contentSha256}`;
      await withRetries(
        `media_upload:${file.logicalFilename}`,
        async () => {
          const { error: upError } = await supabase.storage
            .from(BUCKET)
            .upload(objectKey, file.bytes, {
              contentType: file.mimeType,
              upsert: true,
            });
          if (upError) throw new Error(upError.message);
        },
        5,
        180_000,
      );

      await withRetries(`media_asset:${file.logicalFilename}`, async () => {
        const { error: assetError } = await supabase.from("anki_deck_media_assets").upsert(
          {
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
              beta: true,
              cloze_only: true,
            },
          },
          { onConflict: "deck_release_id,logical_filename" },
        );
        if (assetError) throw new Error(assetError.message);
      });

      mediaUploaded += 1;
      if (mediaUploaded % 50 === 0 || mediaUploaded === mediaMap.size) {
        console.error(
          JSON.stringify({ progress: "media", done: mediaUploaded, total: mediaMap.size }),
        );
      }
    }
  }

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

  const objectKey = `deck-releases/${releaseId}/bootstrap/${result.artifactChecksum}.apkg`;
  await withRetries(
    "bootstrap_upload",
    async () => {
      const { error: bootUpError } = await supabase.storage
        .from(BUCKET)
        .upload(objectKey, result.apkgBytes, {
          contentType: "application/apkg",
          upsert: true,
        });
      if (bootUpError) throw new Error(bootUpError.message);
    },
    5,
    600_000,
  );

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

  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(objectKey, 3600, { download: `SnapOrtho-Master-${releaseVersion}.apkg` });

  console.log(
    JSON.stringify(
      {
        ok: true,
        releaseId,
        releaseKey,
        releaseVersion,
        styleVersion: SNAPORTHO_STYLE_VERSION,
        normalizeVersion: NORMALIZE_VERSION,
        manifestChecksum: checksum,
        cards: selected.length,
        mediaFiles: mediaMap.size,
        apkgPath: outPath,
        apkgBytes: result.apkgBytes.length,
        apkgMB: Math.round((result.apkgBytes.length / (1024 * 1024)) * 10) / 10,
        artifactChecksum: result.artifactChecksum,
        objectKey,
        reportPath,
        signedUrlReady: Boolean(signed?.signedUrl),
        next: "In Anki (add-on with streaming download): Get Started / Master Deck → Download SnapOrtho Master Deck — or import the local .apkg",
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
