/**
 * Publish the anatomy-hierarchy re-render of the reviewed full-codex tag manifest.
 *
 * - Does NOT change metadata assertions or the metadata release (already published).
 * - Supersedes the previous published tag manifest.
 * - Publishes snaportho-tags-anatomy-hierarchy-v1 (draft → validated → published).
 *
 * Usage (from snaportho-web/):
 *   node --env-file=.env.local scripts/publish-anatomy-hierarchy-manifest.ts
 *   node --env-file=.env.local scripts/publish-anatomy-hierarchy-manifest.ts \
 *     --apply --confirm=PUBLISH_ANATOMY_HIERARCHY_MANIFEST
 */
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const RELEASE_KEY = "snaportho-metadata-full-codex-v1-reviewed";
const NEW_KEY = "snaportho-tags-anatomy-hierarchy-v1";
const OLD_KEY = "snaportho-tags-full-codex-v1-reviewed";
const EXPECTED_CARDS = 3071;
/** Set after a successful render-tags persist; update if you re-render. */
const EXPECTED_CHECKSUM =
  "1d54d0f66f2eb99de1e3038afd433c5792ed01884904a8efc5f815574c9e89c5";

function env() {
  return Object.fromEntries(
    fs
      .readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith("#"))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i), line.slice(i + 1).trim().replace(/^['"]|['"]$/g, "")];
      }),
  );
}

async function main() {
  const apply = process.argv.includes("--apply");
  if (apply && !process.argv.includes("--confirm=PUBLISH_ANATOMY_HIERARCHY_MANIFEST")) {
    throw new Error("apply requires --confirm=PUBLISH_ANATOMY_HIERARCHY_MANIFEST");
  }
  const e = { ...env(), ...process.env };
  const db = createClient(e.NEXT_PUBLIC_SUPABASE_URL!, e.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: release, error: re } = await db
    .from("metadata_releases")
    .select("*")
    .eq("release_key", RELEASE_KEY)
    .single();
  if (re) throw re;

  const { data: newManifest, error: ne } = await db
    .from("rendered_anki_tag_manifests")
    .select("*")
    .eq("manifest_key", NEW_KEY)
    .eq("metadata_release_id", release.id)
    .single();
  if (ne) throw ne;

  const { data: oldManifest, error: oe } = await db
    .from("rendered_anki_tag_manifests")
    .select("*")
    .eq("manifest_key", OLD_KEY)
    .single();
  if (oe) throw oe;

  const { count: cards, error: ce } = await db
    .from("rendered_anki_tag_manifest_cards")
    .select("*", { count: "exact", head: true })
    .eq("manifest_id", newManifest.id);
  if (ce) throw ce;

  const preview = {
    apply,
    release: { id: release.id, key: RELEASE_KEY, status: release.status },
    newManifest: {
      id: newManifest.id,
      key: NEW_KEY,
      status: newManifest.status,
      cards,
      expectedCards: EXPECTED_CARDS,
      checksum: newManifest.output_checksum,
      expectedChecksum: EXPECTED_CHECKSUM,
    },
    oldManifest: { id: oldManifest.id, key: OLD_KEY, status: oldManifest.status },
  };

  // Allow re-run if already published with matching checksum (idempotent success).
  if (
    newManifest.status === "published" &&
    newManifest.output_checksum === EXPECTED_CHECKSUM &&
    oldManifest.status === "superseded"
  ) {
    console.log(JSON.stringify({ ...preview, alreadyPublished: true }, null, 2));
    return;
  }

  const ok =
    cards === EXPECTED_CARDS &&
    newManifest.output_checksum === EXPECTED_CHECKSUM &&
    newManifest.status === "draft" &&
    (oldManifest.status === "published" || oldManifest.status === "superseded") &&
    release.status === "published";
  if (!ok) {
    console.error(JSON.stringify({ error: "preflight_failed", preview }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({ preview }, null, 2));
  if (!apply) {
    console.log("Dry-run only. Re-run with --apply --confirm=PUBLISH_ANATOMY_HIERARCHY_MANIFEST");
    return;
  }

  const now = new Date().toISOString();
  if (oldManifest.status === "published") {
    const { error } = await db
      .from("rendered_anki_tag_manifests")
      .update({ status: "superseded", superseded_at: now })
      .eq("id", oldManifest.id)
      .eq("status", "published");
    if (error) throw error;
  }

  if (newManifest.status === "draft") {
    const { error } = await db
      .from("rendered_anki_tag_manifests")
      .update({
        status: "validated",
        validated_at: now,
        predecessor_manifest_id: oldManifest.id,
      })
      .eq("id", newManifest.id)
      .eq("status", "draft");
    if (error) throw error;
  }

  const { error: publishError } = await db
    .from("rendered_anki_tag_manifests")
    .update({ status: "published", published_at: now })
    .eq("id", newManifest.id)
    .in("status", ["validated", "published"]);
  if (publishError) throw publishError;

  console.log(
    JSON.stringify(
      {
        published: true,
        publishedAt: now,
        newManifestKey: NEW_KEY,
        supersededManifestKey: OLD_KEY,
        metadataReleaseUnchanged: RELEASE_KEY,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
