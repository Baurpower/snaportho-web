// Read-only dump of the versioned SnapOrtho deck's anatomy tag vocabulary.
//
// Produces anatomy-structures.json: one row per `anatomy_structure` canonical
// entity, with the flat tag it currently renders to, its card count in the
// CURRENT PUBLISHED rendered tag manifest, and up to 2 sample card fronts for
// disambiguation. This is the input the classification agents consume.
//
// Scope guard: only reads canonical_entities + the published rendered tag
// manifest (the versioned deck). Never touches anki_note_tags / the historical
// Marty McFlyin import.
//
// Run from snaportho-web/:  node --env-file=.env.local integrations/snaportho-anki/anatomy-hierarchy/dump-anatomy-structures.mjs

import { Client } from "pg";
import { writeFileSync } from "node:fs";
import path from "node:path";

// Mirror of slugToken() in scripts/run-master-deck-metadata-pipeline.ts.
function slugToken(label) {
  const tokens = label.normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
  const standard = new Set(["ACL", "PCL", "ORIF", "TKA", "THA", "MRI", "CT", "EMG", "UCL"]);
  return tokens.map((t) => {
    const upper = t.toUpperCase();
    if (standard.has(upper)) return upper;
    return t.slice(0, 1).toUpperCase() + t.slice(1).toLowerCase();
  }).join("_") || "Unspecified";
}

const stripHtml = (s) => String(s ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().slice(0, 220);

function frontOf(fieldSnapshot) {
  if (!Array.isArray(fieldSnapshot)) return "";
  const front = fieldSnapshot.find((f) => /front|text|question/i.test(f?.name ?? "")) ?? fieldSnapshot[0];
  return stripHtml(front?.value ?? front?.rawValue ?? "");
}

const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();

// 1) The published rendered tag manifest = the versioned deck's live governed tags.
const mani = await c.query(
  `select id, manifest_key, deck_release_id from rendered_anki_tag_manifests
   where status='published' order by published_at desc limit 1`);
if (!mani.rows.length) throw new Error("no_published_tag_manifest");
const manifestId = mani.rows[0].id;
console.error(`published manifest: ${mani.rows[0].manifest_key} (${manifestId}) deck_release ${mani.rows[0].deck_release_id}`);

// 2) All anatomy_structure entities (the tag vocabulary).
const ents = await c.query(
  `select id, preferred_label from canonical_entities where entity_type='anatomy_structure' order by preferred_label`);

// 3) Manifest cards -> anatomy tags + front text, in one pass.
const cards = await c.query(
  `select mc.rendered_tags, ccv.field_snapshot
   from rendered_anki_tag_manifest_cards mc
   join canonical_card_versions ccv on ccv.id = mc.canonical_card_version_id
   where mc.manifest_id = $1`, [manifestId]);

// tag -> {count, samples[]}
const byTag = new Map();
for (const row of cards.rows) {
  const tags = (row.rendered_tags ?? []).filter((t) => t.startsWith("SnapOrtho::Anatomy::"));
  if (!tags.length) continue;
  const front = frontOf(row.field_snapshot);
  for (const t of tags) {
    const e = byTag.get(t) ?? { count: 0, samples: [] };
    e.count += 1;
    if (front && e.samples.length < 2) e.samples.push(front);
    byTag.set(t, e);
  }
}

// 4) Join entities -> tag stats by slug.
const rows = ents.rows.map((e) => {
  const ankiSlug = slugToken(e.preferred_label);
  const tag = `SnapOrtho::Anatomy::${ankiSlug}`;
  const stat = byTag.get(tag) ?? { count: 0, samples: [] };
  return {
    entity_id: e.id,
    preferred_label: e.preferred_label,
    anki_slug: ankiSlug,
    current_tag: tag,
    deck_card_count: stat.count,
    sample_fronts: stat.samples,
    // agent fills these:
    region: null,
    tissue: null,
    canonical_structure: ankiSlug,
    merge_into: null,
    confidence: null,
    evidence: null,
  };
});

// tags present in manifest but with NO matching entity (slug drift) — flag for reconcile.
const entityTags = new Set(rows.map((r) => r.current_tag));
const orphanTags = [...byTag.entries()]
  .filter(([t]) => !entityTags.has(t))
  .map(([t, s]) => ({ tag: t, count: s.count }))
  .sort((a, b) => b.count - a.count);

const out = {
  generatedAt: new Date().toISOString(),
  manifestId,
  manifestKey: mani.rows[0].manifest_key,
  deckReleaseId: mani.rows[0].deck_release_id,
  totalStructures: rows.length,
  usedInDeck: rows.filter((r) => r.deck_card_count > 0).length,
  orphanTags,
  structures: rows.sort((a, b) => b.deck_card_count - a.deck_card_count),
};

const outPath = path.join(process.cwd(), "integrations/snaportho-anki/anatomy-hierarchy/anatomy-structures.json");
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
console.error(`wrote ${rows.length} structures (${out.usedInDeck} used in deck, ${orphanTags.length} orphan tags) -> ${outPath}`);
await c.end();
