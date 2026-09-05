/**
 * One-off: publish a new combined resource-field overlay that keeps every card of
 * the currently published overlay byte-for-byte EXCEPT the 1,241 Codex-cohort
 * Orthobullets cards, which are replaced with the regenerated teaching bullets in
 * tmp/codex-refill/authored-all.json. Mirrors publish-orthobullets-overlay.ts's DB
 * and checksum logic exactly so non-replaced cards are unchanged.
 *
 *   npx tsx scripts/publish-codex-refill-overlay.ts --overlay-key <k>                         # dry-run
 *   npx tsx scripts/publish-codex-refill-overlay.ts --overlay-key <k> --apply                 # create/refresh draft
 *   npx tsx scripts/publish-codex-refill-overlay.ts --overlay-key <k> --apply --confirm=PUBLISH_ORTHOBULLETS_OVERLAY  # publish
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
// @ts-expect-error Direct Node strip-types runner imports TypeScript source.
import { checksum } from "../src/lib/education/anki-note-sync-v2.ts";
// @ts-expect-error Direct Node strip-types runner imports TypeScript source.
import { bulletsToHtml, canonicalOrthobulletsTopicUrl } from "../src/lib/education/orthobullets-enrichment-packet.ts";

function env() {
  return Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/)
    .filter((l) => l && !l.trim().startsWith("#")).map((l) => {
      const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, "")];
    }));
}
function arg(name: string) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; }

type Card = { note_guid: string; fields: Record<string, string>; output_checksum: string };

async function main() {
  const apply = process.argv.includes("--apply");
  const confirm = arg("--confirm");
  const overlayKey = arg("--overlay-key"); if (!overlayKey) throw new Error("--overlay-key is required");
  const publish = apply && confirm === "PUBLISH_ORTHOBULLETS_OVERLAY";

  const current: Card[] = JSON.parse(readFileSync(path.resolve("tmp/codex-refill/current-overlay-cards.json"), "utf8"));
  const mine = JSON.parse(readFileSync(path.resolve("tmp/codex-refill/authored-all.json"), "utf8")) as Record<string, { link: string; bullets: string[] }>;

  // integrity: every codex guid must exist in the current overlay
  const curGuids = new Set(current.map((c) => c.note_guid));
  const missing = Object.keys(mine).filter((g) => !curGuids.has(g));
  if (missing.length) throw new Error(`codex_guid_not_in_current_overlay:${missing.length}`);

  let replaced = 0;
  const cards: Card[] = current.map((c) => {
    const entry = mine[c.note_guid];
    if (!entry) return { note_guid: c.note_guid, fields: c.fields, output_checksum: c.output_checksum };
    const url = canonicalOrthobulletsTopicUrl(entry.link);
    if (!url.ok) throw new Error(`bad_link:${c.note_guid}:${url.error}`);
    const fields = { Orthobullets: bulletsToHtml(entry.bullets), Orthobullets_Link: url.canonical };
    replaced += 1;
    return { note_guid: c.note_guid, fields, output_checksum: checksum(fields) };
  });
  cards.sort((a, b) => a.note_guid.localeCompare(b.note_guid));
  const outputChecksum = checksum(cards.map((c) => [c.note_guid, c.output_checksum]));

  const e = env();
  const db = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: deckRelease, error: dre } = await db.from("anki_deck_releases")
    .select("id,status,release_version").eq("status", "published").order("published_at", { ascending: false }).limit(1).maybeSingle();
  if (dre) throw dre;
  if (!deckRelease) throw new Error("published_deck_release_not_found");
  const { data: prior } = await db.from("anki_resource_field_overlays")
    .select("overlay_key,output_checksum,note_count").eq("status", "published").maybeSingle();

  const summary = {
    overlayKey, deckReleaseId: deckRelease.id, deckReleaseVersion: deckRelease.release_version,
    totalCards: cards.length, replaced, priorOverlayKey: prior?.overlay_key, priorChecksum: prior?.output_checksum,
    priorNoteCount: prior?.note_count, newChecksum: outputChecksum, apply, publish,
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
  for (const p of priorPublished ?? []) {
    await db.from("anki_resource_field_overlays").update({ status: "superseded", superseded_at: now })
      .eq("id", p.id).eq("status", "published").throwOnError();
  }
  await db.from("anki_resource_field_overlays").update({
    status: "published", validated_at: now, published_at: now, predecessor_overlay_id: priorPublished?.[0]?.id ?? null,
  }).eq("id", overlayId).throwOnError();
  console.log(JSON.stringify({ ...summary, overlayId, status: "published" }, null, 2));
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
