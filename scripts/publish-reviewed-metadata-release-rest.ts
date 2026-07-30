import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const RELEASE_KEY = "snaportho-metadata-full-codex-v1-reviewed";
const MANIFEST_KEY = "snaportho-tags-full-codex-v1-reviewed";
const EXPECTED_ASSERTIONS = 6115;
const EXPECTED_CARDS = 3071;
const EXPECTED_RELEASE_CHECKSUM = "25227211f8200c6fead14fa9fb5f76caf723e59fdb6c837d837cc10f173bb8e8";
const EXPECTED_MANIFEST_CHECKSUM = "c41bd07dce5681ed23d24d0d2ac51088898e5e6d73855b1b0d7c38a106af6c7d";

function env() {
  return Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .filter((line) => line && !line.trim().startsWith("#")).map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1).trim().replace(/^['"]|['"]$/g, "")];
    }));
}
async function main() {
  const apply = process.argv.includes("--apply");
  if (apply && !process.argv.includes("--confirm=PUBLISH_REVIEWED_METADATA_RELEASE")) {
    throw new Error("apply requires --confirm=PUBLISH_REVIEWED_METADATA_RELEASE");
  }
  const e = env();
  const db = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data: release, error: re } = await db.from("metadata_releases").select("*")
    .eq("release_key", RELEASE_KEY).single();
  if (re) throw re;
  const { data: manifest, error: me } = await db.from("rendered_anki_tag_manifests").select("*")
    .eq("manifest_key", MANIFEST_KEY).eq("metadata_release_id", release.id).single();
  if (me) throw me;
  const [{ count: assertions, error: ae }, { count: cards, error: ce }] = await Promise.all([
    db.from("metadata_release_assertions").select("*", { count: "exact", head: true })
      .eq("metadata_release_id", release.id),
    db.from("rendered_anki_tag_manifest_cards").select("*", { count: "exact", head: true })
      .eq("manifest_id", manifest.id),
  ]);
  if (ae || ce || assertions !== EXPECTED_ASSERTIONS || cards !== EXPECTED_CARDS
    || release.manifest_checksum !== EXPECTED_RELEASE_CHECKSUM
    || manifest.output_checksum !== EXPECTED_MANIFEST_CHECKSUM) {
    throw new Error("reviewed publication preflight mismatch");
  }
  const { data: oldReleases, error: oe } = await db.from("metadata_releases").select("*")
    .eq("deck_release_id", release.deck_release_id).eq("status", "published").neq("id", release.id);
  if (oe) throw oe;
  const oldRelease = oldReleases?.[0] ?? null;
  const { data: oldManifests, error: ome } = oldRelease
    ? await db.from("rendered_anki_tag_manifests").select("*")
      .eq("metadata_release_id", oldRelease.id).eq("status", "published")
    : { data: [], error: null };
  if (ome) throw ome;
  const oldManifest = oldManifests?.[0] ?? null;
  const preview = {
    apply, releaseId: release.id, releaseStatus: release.status,
    manifestId: manifest.id, manifestStatus: manifest.status,
    assertions, cards, supersedesReleaseId: oldRelease?.id ?? release.predecessor_release_id,
    supersedesManifestId: oldManifest?.id ?? manifest.predecessor_manifest_id,
  };
  if (!apply) return console.log(JSON.stringify(preview, null, 2));
  const now = new Date().toISOString();
  if (oldManifest) {
    const { error } = await db.from("rendered_anki_tag_manifests")
      .update({ status: "superseded", superseded_at: now }).eq("id", oldManifest.id).eq("status", "published");
    if (error) throw error;
  }
  if (oldRelease) {
    const { error } = await db.from("metadata_releases")
      .update({ status: "superseded", superseded_at: now }).eq("id", oldRelease.id).eq("status", "published");
    if (error) throw error;
  }
  if (release.status === "draft") {
    const { error } = await db.from("metadata_releases").update({
      status: "review", reviewed_at: now, predecessor_release_id: oldRelease?.id ?? null,
    }).eq("id", release.id).eq("status", "draft");
    if (error) throw error;
  }
  const { error: publishReleaseError } = await db.from("metadata_releases").update({
    status: "published", published_at: now,
  }).eq("id", release.id).eq("status", "review");
  if (publishReleaseError) throw publishReleaseError;
  if (manifest.status === "draft") {
    const { error } = await db.from("rendered_anki_tag_manifests").update({
      status: "validated", validated_at: now, predecessor_manifest_id: oldManifest?.id ?? null,
    }).eq("id", manifest.id).eq("status", "draft");
    if (error) throw error;
  }
  const { error: publishManifestError } = await db.from("rendered_anki_tag_manifests").update({
    status: "published", published_at: now,
  }).eq("id", manifest.id).eq("status", "validated");
  if (publishManifestError) throw publishManifestError;
  console.log(JSON.stringify({ ...preview, published: true, publishedAt: now }, null, 2));
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
