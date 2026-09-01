/**
 * Publishes reviewed Orthobullets enrichment as a resource-field overlay that the
 * sync-v2 publisher merges into the master field snapshot at build time.
 *
 * Reads *-reviewed.json (or *-verified.json) packets from --input, extracts filled
 * Orthobullets/Orthobullets_Link field values, and writes them as a versioned overlay
 * keyed by note_guid. Canonical card content is never touched.
 *
 * Usage:
 *   node --experimental-strip-types scripts/publish-orthobullets-overlay.ts --input <dir> --overlay-key <key>            # dry-run
 *   node --experimental-strip-types scripts/publish-orthobullets-overlay.ts --input <dir> --overlay-key <key> --apply    # create/refresh draft
 *   node --experimental-strip-types scripts/publish-orthobullets-overlay.ts --input <dir> --overlay-key <key> --apply --confirm=PUBLISH_ORTHOBULLETS_OVERLAY  # publish
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { checksum } from "../src/lib/education/anki-note-sync-v2.ts";
import { overlaysFromVerifiedPacket, bulletsToHtml, canonicalOrthobulletsTopicUrl } from "../src/lib/education/orthobullets-enrichment-packet.ts";

function env() {
  return Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/)
    .filter((l) => l && !l.trim().startsWith("#")).map((l) => {
      const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, "")];
    }));
}
function arg(name: string) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; }

function loadOverlayCards(input: string) {
  const start = path.resolve(input);
  const files: string[] = [];
  if (statSync(start).isFile()) files.push(start);
  else {
    const names = readdirSync(start);
    const verified = names.filter((n) => n.endsWith("-verified.json"));
    const reviewed = names.filter((n) => n.endsWith("-reviewed.json"));
    for (const n of (verified.length ? verified : reviewed)) files.push(path.join(start, n));
  }
  const byGuid = new Map<string, { note_guid: string; fields: Record<string, string>; output_checksum: string }>();
  for (const file of files.sort()) {
    const packet = JSON.parse(readFileSync(file, "utf8"));
    for (const ov of overlaysFromVerifiedPacket(packet)) {
      if (byGuid.has(ov.stableGuid)) throw new Error(`duplicate_overlay_note_guid:${ov.stableGuid}`);
      const fields = { Orthobullets: ov.orthobullets, Orthobullets_Link: ov.orthobulletsLink };
      byGuid.set(ov.stableGuid, { note_guid: ov.stableGuid, fields, output_checksum: checksum(fields) });
    }
  }
  return byGuid;
}

function applyExtraContent(
  byGuid: Map<string, { note_guid: string; fields: Record<string, string>; output_checksum: string }>,
  extraFiles: string[],
) {
  for (const file of extraFiles) {
    const map = JSON.parse(readFileSync(path.resolve(file), "utf8")) as Record<string, { link: string; bullets: string[] }>;
    for (const [noteGuid, entry] of Object.entries(map)) {
      const url = canonicalOrthobulletsTopicUrl(entry.link);
      if (!url.ok) throw new Error(`extra_bad_link:${noteGuid}:${url.error}`);
      if (!Array.isArray(entry.bullets) || entry.bullets.length < 1) throw new Error(`extra_bad_bullets:${noteGuid}`);
      const fields = { Orthobullets: bulletsToHtml(entry.bullets), Orthobullets_Link: url.canonical };
      byGuid.set(noteGuid, { note_guid: noteGuid, fields, output_checksum: checksum(fields) });
    }
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  const confirm = arg("--confirm");
  const input = arg("--input"); if (!input) throw new Error("--input <dir> is required");
  const overlayKey = arg("--overlay-key"); if (!overlayKey) throw new Error("--overlay-key is required");
  if (apply && confirm !== "PUBLISH_ORTHOBULLETS_OVERLAY") {
    // apply without confirm creates/refreshes the DRAFT only; publish requires the confirm token.
  }
  const publish = apply && confirm === "PUBLISH_ORTHOBULLETS_OVERLAY";
  const extraFiles: string[] = [];
  for (let i = 0; i < process.argv.length; i += 1) if (process.argv[i] === "--extra") extraFiles.push(process.argv[i + 1]);

  const byGuid = loadOverlayCards(input);
  applyExtraContent(byGuid, extraFiles);
  const cards = [...byGuid.values()].sort((a, b) => a.note_guid.localeCompare(b.note_guid));
  const outputChecksum = checksum(cards.map((c) => [c.note_guid, c.output_checksum]));
  const e = env();
  const db = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: deckRelease, error: dre } = await db.from("anki_deck_releases")
    .select("id,status").eq("status", "published").order("published_at", { ascending: false }).limit(1).maybeSingle();
  if (dre) throw dre;
  if (!deckRelease) throw new Error("published_deck_release_not_found");

  const summary = { overlayKey, deckReleaseId: deckRelease.id, notes: cards.length, outputChecksum, apply, publish };
  if (!apply) { console.log(JSON.stringify({ ...summary, mode: "dry-run" }, null, 2)); return; }

  // Upsert draft overlay (idempotent on overlay_key; checksum must match if it already exists).
  const { data: existing } = await db.from("anki_resource_field_overlays")
    .select("id,status,output_checksum").eq("overlay_key", overlayKey).maybeSingle();
  let overlayId: string;
  if (existing) {
    if (existing.status === "superseded") throw new Error(`overlay_key_superseded:${overlayKey}`);
    if (existing.output_checksum !== outputChecksum) throw new Error("existing_overlay_checksum_mismatch");
    overlayId = existing.id;
  } else {
    const { data: created, error: ce } = await db.from("anki_resource_field_overlays").insert({
      overlay_key: overlayKey, deck_release_id: deckRelease.id, output_checksum: outputChecksum,
      field_count: cards.length, note_count: cards.length, status: "draft",
    }).select("id").single();
    if (ce) throw ce;
    overlayId = created.id;
  }

  // Replace cards deterministically.
  await db.from("anki_resource_field_overlay_cards").delete().eq("overlay_id", overlayId).throwOnError();
  for (let i = 0; i < cards.length; i += 200) {
    const batch = cards.slice(i, i + 200).map((c) => ({ overlay_id: overlayId, ...c }));
    await db.from("anki_resource_field_overlay_cards").insert(batch).throwOnError();
  }
  const { count } = await db.from("anki_resource_field_overlay_cards").select("*", { count: "exact", head: true }).eq("overlay_id", overlayId);
  if (count !== cards.length) throw new Error(`overlay_card_count_mismatch:${count}/${cards.length}`);

  if (!publish) { console.log(JSON.stringify({ ...summary, overlayId, status: "draft" }, null, 2)); return; }

  // Publish: supersede any prior published overlay for this deck release, then publish this one.
  const now = new Date().toISOString();
  const { data: priorPublished } = await db.from("anki_resource_field_overlays")
    .select("id").eq("deck_release_id", deckRelease.id).eq("status", "published").neq("id", overlayId);
  for (const prior of priorPublished ?? []) {
    await db.from("anki_resource_field_overlays").update({ status: "superseded", superseded_at: now })
      .eq("id", prior.id).eq("status", "published").throwOnError();
  }
  await db.from("anki_resource_field_overlays").update({
    status: "published", validated_at: now, published_at: now, predecessor_overlay_id: priorPublished?.[0]?.id ?? null,
  }).eq("id", overlayId).throwOnError();
  console.log(JSON.stringify({ ...summary, overlayId, status: "published" }, null, 2));
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
