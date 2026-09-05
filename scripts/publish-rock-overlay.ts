/**
 * Publishes reviewed ROCK enrichment as `ROCK` + `ROCK_Link` field values,
 * composed into the resource-field overlay the sync-v2 publisher merges at
 * build time.
 *
 * Because only one overlay may be published per deck release (unique index
 * anki_resource_field_overlays_one_published_idx), this does NOT create a
 * parallel overlay. It loads the currently published overlay's cards, deep-merges
 * the new ROCK fields per note_guid, writes a new combined overlay_key, and
 * optionally publishes it. Extra / Text / other resource fields are preserved.
 *
 * Usage:
 *   node --experimental-strip-types scripts/publish-rock-overlay.ts --input <dir> --overlay-key <key>
 *   ... --apply
 *   ... --apply --confirm=PUBLISH_ROCK_OVERLAY
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { checksum } from "../src/lib/education/anki-note-sync-v2.ts";
import {
  ROCK_ENRICHMENT_CONTRACT,
  isReviewedPacketFileName,
  isVerifiedPacketFileName,
  overlaysFromFillPacket,
  type RockFillPacket,
} from "../src/lib/education/rock-enrichment-packet.ts";

type OverlayCard = { note_guid: string; fields: Record<string, string>; output_checksum: string };

function env() {
  return Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/)
    .filter((l) => l && !l.trim().startsWith("#")).map((l) => {
      const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, "")];
    }));
}
function arg(name: string) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; }

function loadRockFills(input: string): Map<string, { rock: string; rockLink: string }> {
  const start = path.resolve(input);
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const n of readdirSync(dir)) {
      const full = path.join(dir, n);
      if (statSync(full).isDirectory()) walk(full);
      else files.push(full);
    }
  };
  if (statSync(start).isFile()) files.push(start);
  else walk(start);
  const verified = files.filter((f) => isVerifiedPacketFileName(path.basename(f)));
  const reviewed = files.filter((f) => isReviewedPacketFileName(path.basename(f)));
  const use = (verified.length ? verified : reviewed).sort();
  const out = new Map<string, { rock: string; rockLink: string }>();
  for (const file of use) {
    const packet = JSON.parse(readFileSync(file, "utf8")) as RockFillPacket;
    if (packet.schemaVersion !== ROCK_ENRICHMENT_CONTRACT || packet.stage !== "fill") continue;
    for (const ov of overlaysFromFillPacket(packet)) {
      if (out.has(ov.stableGuid)) throw new Error(`duplicate_rock_note_guid:${ov.stableGuid}`);
      out.set(ov.stableGuid, { rock: ov.rock, rockLink: ov.rockLink });
    }
  }
  return out;
}

function cardChecksum(fields: Record<string, string>): string {
  const ordered = Object.fromEntries(Object.keys(fields).sort().map((k) => [k, fields[k]]));
  return checksum(ordered);
}

async function main() {
  const input = arg("--input"); if (!input) throw new Error("--input is required");
  const overlayKey = arg("--overlay-key"); if (!overlayKey) throw new Error("--overlay-key is required");
  const apply = process.argv.includes("--apply");
  const confirm = arg("--confirm");
  const publish = apply && confirm === "PUBLISH_ROCK_OVERLAY";

  const fills = loadRockFills(input);
  const e = env();
  const db = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: deckRelease } = await db.from("anki_deck_releases")
    .select("id,status").eq("status", "published").order("published_at", { ascending: false }).limit(1).maybeSingle();
  if (!deckRelease) throw new Error("published_deck_release_not_found");

  const { data: baseOverlay } = await db.from("anki_resource_field_overlays")
    .select("id,overlay_key").eq("deck_release_id", deckRelease.id).eq("status", "published")
    .order("published_at", { ascending: false }).limit(1).maybeSingle();
  const merged = new Map<string, Record<string, string>>();
  if (baseOverlay) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from("anki_resource_field_overlay_cards")
        .select("note_guid,fields").eq("overlay_id", baseOverlay.id).range(from, from + 999);
      if (error) throw error;
      for (const row of data ?? []) merged.set(String(row.note_guid), { ...(row.fields as Record<string, string>) });
      if (!data || data.length < 1000) break;
    }
  }
  let added = 0;
  let updated = 0;
  for (const [guid, fill] of fills) {
    const existing = merged.get(guid);
    if (existing) {
      existing.ROCK = fill.rock;
      existing.ROCK_Link = fill.rockLink;
      updated += 1;
    } else {
      merged.set(guid, { ROCK: fill.rock, ROCK_Link: fill.rockLink });
      added += 1;
    }
  }

  const cards: OverlayCard[] = [...merged.entries()]
    .map(([note_guid, fields]) => ({ note_guid, fields, output_checksum: cardChecksum(fields) }))
    .sort((a, b) => a.note_guid.localeCompare(b.note_guid));
  const outputChecksum = checksum(cards.map((c) => [c.note_guid, c.output_checksum]));

  const summary = {
    overlayKey,
    baseOverlayKey: baseOverlay?.overlay_key ?? null,
    deckReleaseId: deckRelease.id,
    rockFills: fills.size,
    rockNewNotes: added,
    rockUpdatedNotes: updated,
    totalNotes: cards.length,
    outputChecksum,
    apply,
    publish,
  };
  if (!apply) { console.log(JSON.stringify({ ...summary, mode: "dry-run" }, null, 2)); return; }

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

  await db.from("anki_resource_field_overlay_cards").delete().eq("overlay_id", overlayId).throwOnError();
  for (let i = 0; i < cards.length; i += 200) {
    const batch = cards.slice(i, i + 200).map((c) => ({ overlay_id: overlayId, ...c }));
    await db.from("anki_resource_field_overlay_cards").insert(batch).throwOnError();
  }
  const { count } = await db.from("anki_resource_field_overlay_cards").select("*", { count: "exact", head: true }).eq("overlay_id", overlayId);
  if (count !== cards.length) throw new Error(`overlay_card_count_mismatch:${count}/${cards.length}`);

  if (!publish) { console.log(JSON.stringify({ ...summary, overlayId, status: "draft" }, null, 2)); return; }

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
