// Read-only: inspect the SnapOrtho::Anatomy tags of a rendered tag manifest.
// Shows the hierarchy depth breakdown so you can confirm Region + Region::Tissue
// ancestor tags now appear (they don't in the old flat manifest).
//
// Run from snaportho-web/:
//   node --env-file=.env.local integrations/snaportho-anki/anatomy-hierarchy/verify-manifest.mjs <manifest_key>
// Omit <manifest_key> to inspect the current published manifest.

import { Client } from "pg";

const key = process.argv[2] ?? null;
const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();

const mani = key
  ? await c.query(`select id, manifest_key, status from rendered_anki_tag_manifests where manifest_key=$1`, [key])
  : await c.query(`select id, manifest_key, status from rendered_anki_tag_manifests where status='published' order by published_at desc limit 1`);
if (!mani.rows.length) { console.error(`manifest not found: ${key ?? "(published)"}`); process.exit(1); }
const { id, manifest_key, status } = mani.rows[0];

const r = await c.query(`
  with t as (select unnest(rendered_tags) tag from rendered_anki_tag_manifest_cards where manifest_id=$1)
  select tag, count(*)::int n from t where tag like 'SnapOrtho::Anatomy%' group by 1`, [id]);

const depth = (tag) => tag.split("::").length - 2; // ::Anatomy:: = depth 0 root
const byDepth = { 1: [], 2: [], 3: [], other: [] };
for (const row of r.rows) {
  const d = depth(row.tag);
  (byDepth[d] ?? byDepth.other).push(row);
}
const sum = (a) => a.reduce((n, x) => n + x.n, 0);

const flat = byDepth[2].length === 0 && byDepth[3].length === 0;
console.log(`manifest: ${manifest_key} (${status})`);
console.log(`distinct anatomy tags: ${r.rows.length}`);
console.log(`verdict: ${flat ? "⚠ FLAT — all anatomy tags are single-token leaves, no Region/Tissue hierarchy" : "✓ HIERARCHICAL"}`);
console.log(`  depth-1 tags: ${byDepth[1].length} distinct, ${sum(byDepth[1])} card-tags   ${flat ? "(these are flat leaves)" : "(Regions)"}`);
console.log(`  depth-2 tags: ${byDepth[2].length} distinct, ${sum(byDepth[2])} card-tags   (Region::Tissue)`);
console.log(`  depth-3 tags: ${byDepth[3].length} distinct, ${sum(byDepth[3])} card-tags   (Region::Tissue::Structure)`);
if (byDepth.other.length) console.log(`  deeper:       ${byDepth.other.length} distinct`);

if (!flat && byDepth[1].length) {
  console.log(`\nRegion tags (depth-1):`);
  for (const x of byDepth[1].sort((a, b) => b.n - a.n)) console.log(`  ${String(x.n).padStart(4)}  ${x.tag}`);
}
await c.end();
