/**
 * Build a SnapOrtho Master bootstrap .apkg from a deck release.
 *
 * Usage:
 *   npm run education:anki:bootstrap:build -- --release-id=<uuid> --out=/tmp/deck.apkg
 *   npm run education:anki:bootstrap:build -- --release-id=<uuid> --out=/tmp/deck.apkg --register=true
 *   npm run education:anki:bootstrap:build -- --input=fixture-manifest.json --out=/tmp/deck.apkg
 *
 * --input builds from a local JSON fixture (no Supabase). Shape:
 *   { release, cards, media?: [{ contentSha256, logicalFilename, filePath }] }
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { assembleDeckSyncManifest } from "../src/lib/education/anki-deck-manifest-assemble.ts";
import { ARTIFACT_SCHEMA_VERSION } from "../src/lib/education/anki-bootstrap-notetype.ts";
import {
  buildBootstrapApkg,
  type BootstrapBuildInput,
  type BootstrapMediaInput,
} from "./lib/education/anki-bootstrap/build-apkg.ts";

const ANKI_DECK_MEDIA_BUCKET = "anki-deck-media";

function arg(name: string): string | undefined {
  return process.argv.find((v) => v.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function flagTrue(name: string): boolean {
  const v = arg(name);
  return v === "true" || v === "1" || v === "yes";
}

function loadEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const env: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i <= 0) continue;
    const key = trimmed.slice(0, i).trim();
    const raw = trimmed.slice(i + 1).trim().replace(/^['"]|['"]$/g, "");
    env[key] = raw;
  }
  return env;
}

function serviceClient() {
  const fileEnv = loadEnvFile(resolve(process.cwd(), ".env.local"));
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || fileEnv.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || fileEnv.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function loadFromRelease(releaseId: string, allowDraft: boolean): Promise<BootstrapBuildInput> {
  const supabase = serviceClient();
  const { data: release, error } = await supabase
    .from("anki_deck_releases")
    .select(
      "id,release_key,release_version,status,manifest_schema_version,manifest_checksum,minimum_addon_version,published_at",
    )
    .eq("id", releaseId)
    .maybeSingle();
  if (error) throw new Error(`release_lookup_failed:${error.message}`);
  if (!release) throw new Error("release_not_found");
  if (release.status !== "published" && !allowDraft) {
    throw new Error(`release_not_published:${release.status} (pass --allow-draft=true for staging)`);
  }

  const { data: members, error: memberError } = await supabase
    .from("anki_deck_release_cards")
    .select(
      "canonical_card_id,canonical_card_version_id,note_guid,card_ordinal,native_card_id_hint,content_hash,deck_path,ordering_key,inclusion_status",
    )
    .eq("deck_release_id", releaseId)
    .order("ordering_key");
  if (memberError) throw new Error(`members_lookup_failed:${memberError.message}`);

  const versionIds = (members ?? []).map((m) => m.canonical_card_version_id);
  const { data: versions } = versionIds.length
    ? await supabase
        .from("canonical_card_versions")
        .select(
          "id,canonical_card_id,content_hash,field_snapshot,tag_snapshot,source_note_id,version_number",
        )
        .in("id", versionIds)
    : { data: [] as any[] };

  const { data: mappings } = versionIds.length
    ? await supabase
        .from("anki_card_entity_version_mappings")
        .select("canonical_card_version_id,canonical_entity_id,reviewer_mapping_role")
        .in("canonical_card_version_id", versionIds)
        .eq("production_eligible", true)
        .eq("lifecycle_status", "approved")
    : { data: [] as any[] };

  const { data: mediaRows } = await supabase
    .from("anki_deck_media_assets")
    .select(
      "canonical_card_version_id,logical_filename,content_sha256,mime_type,byte_size,object_key,license_status",
    )
    .eq("deck_release_id", releaseId)
    .neq("license_status", "excluded");

  const manifest = assembleDeckSyncManifest({
    release,
    members: members ?? [],
    versions: versions ?? [],
    mappings: mappings ?? [],
    media: mediaRows ?? [],
  });

  const needed = new Set<string>();
  for (const card of manifest.cards) {
    if (card.inclusionStatus !== "included") continue;
    for (const h of card.mediaHashes) needed.add(h);
  }

  const media: BootstrapMediaInput[] = [];
  for (const asset of manifest.media) {
    if (!needed.has(asset.content_sha256)) continue;
    const { data, error: dlError } = await supabase.storage
      .from(ANKI_DECK_MEDIA_BUCKET)
      .download(asset.object_key);
    if (dlError || !data) {
      throw new Error(`media_download_failed:${asset.object_key}:${dlError?.message ?? "empty"}`);
    }
    const bytes = Buffer.from(await data.arrayBuffer());
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== asset.content_sha256) {
      throw new Error(`media_hash_mismatch:${asset.logical_filename}`);
    }
    media.push({
      contentSha256: asset.content_sha256,
      logicalFilename: asset.logical_filename,
      bytes,
    });
  }

  return {
    release: {
      id: manifest.releaseId,
      releaseKey: manifest.releaseKey,
      releaseVersion: manifest.releaseVersion,
      manifestChecksum: manifest.manifestChecksum,
    },
    cards: manifest.cards.map((c) => ({
      canonicalCardId: c.canonicalCardId,
      canonicalCardVersionId: c.canonicalCardVersionId,
      contentHash: c.contentHash,
      noteGuid: c.noteGuid,
      cardOrdinal: c.cardOrdinal,
      deckPath: c.deckPath,
      orderingKey: c.orderingKey,
      inclusionStatus: c.inclusionStatus,
      fieldSnapshot: c.fieldSnapshot,
      centralTags: c.centralTags,
      mediaHashes: c.mediaHashes,
    })),
    media,
  };
}

function loadFromFixture(inputPath: string): BootstrapBuildInput {
  const raw = JSON.parse(readFileSync(inputPath, "utf8")) as {
    release: BootstrapBuildInput["release"];
    cards: BootstrapBuildInput["cards"];
    media?: Array<{
      contentSha256: string;
      logicalFilename: string;
      filePath?: string;
      bytesBase64?: string;
    }>;
  };
  const media: BootstrapMediaInput[] = (raw.media ?? []).map((m) => {
    if (m.bytesBase64) {
      return {
        contentSha256: m.contentSha256,
        logicalFilename: m.logicalFilename,
        bytes: Buffer.from(m.bytesBase64, "base64"),
      };
    }
    if (!m.filePath) throw new Error(`media missing filePath/bytesBase64:${m.logicalFilename}`);
    return {
      contentSha256: m.contentSha256,
      logicalFilename: m.logicalFilename,
      bytes: readFileSync(resolve(dirname(inputPath), m.filePath)),
    };
  });
  return { release: raw.release, cards: raw.cards, media };
}

async function registerArtifact(
  releaseId: string,
  result: { apkgBytes: Buffer; artifactChecksum: string },
  releaseVersion: string,
): Promise<void> {
  const supabase = serviceClient();
  const objectKey = `deck-releases/${releaseId}/bootstrap/${result.artifactChecksum}.apkg`;
  const { error: uploadError } = await supabase.storage
    .from(ANKI_DECK_MEDIA_BUCKET)
    .upload(objectKey, result.apkgBytes, {
      contentType: "application/apkg",
      upsert: true,
    });
  if (uploadError) throw new Error(`artifact_upload_failed:${uploadError.message}`);

  const { error: insertError } = await supabase.from("anki_deck_release_artifacts").insert({
    deck_release_id: releaseId,
    artifact_type: "bootstrap_apkg",
    artifact_schema_version: ARTIFACT_SCHEMA_VERSION,
    artifact_checksum: result.artifactChecksum,
    object_key: objectKey,
    byte_size: result.apkgBytes.length,
    media_type: "application/apkg",
    status: "published",
    published_at: new Date().toISOString(),
  });
  if (insertError) throw new Error(`artifact_register_failed:${insertError.message}`);
  console.log(
    JSON.stringify(
      {
        registered: true,
        objectKey,
        filename: `SnapOrtho-Master-${releaseVersion}.apkg`,
      },
      null,
      2,
    ),
  );
}

async function main() {
  const releaseId = arg("release-id");
  const inputPath = arg("input");
  const out = arg("out");
  if (!out) throw new Error("--out=<path.apkg> is required");
  if (!releaseId && !inputPath) {
    throw new Error("Provide --release-id=<uuid> or --input=<fixture.json>");
  }

  const buildInput = inputPath
    ? loadFromFixture(resolve(inputPath))
    : await loadFromRelease(releaseId!, flagTrue("allow-draft"));

  const result = buildBootstrapApkg(buildInput);
  const outPath = resolve(out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, result.apkgBytes);

  const summary = {
    out: outPath,
    artifactChecksum: result.artifactChecksum,
    artifactSchemaVersion: result.artifactSchemaVersion,
    noteCount: result.noteCount,
    cardCount: result.cardCount,
    mediaCount: result.mediaCount,
    fieldOrder: result.fieldOrder,
    warnings: result.warnings,
    releaseId: buildInput.release.id,
    releaseVersion: buildInput.release.releaseVersion,
  };
  console.log(JSON.stringify(summary, null, 2));

  if (flagTrue("register")) {
    if (!releaseId) throw new Error("--register requires --release-id");
    await registerArtifact(releaseId, result, buildInput.release.releaseVersion);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
