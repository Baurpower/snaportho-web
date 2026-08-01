// Reconcile + validate all agent shard outputs into one anatomy hierarchy map.
//
// Run from snaportho-web/:
//   node integrations/snaportho-anki/anatomy-hierarchy/reconcile.mjs
//
// Reads shards/*.done.json + vocabulary.json + anatomy-structures.json.
// Writes:
//   anatomy-hierarchy.map.json  (entity_id -> {region,tissue,structure,path,governed_tag,ancestors})
//   coverage-report.md          (human review gate: coverage, per-region/tissue, collisions, merges, low-confidence)
// Exits non-zero if any hard validation fails (missing coverage, bad vocab token, tag collision).

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";

const HERE = path.join(process.cwd(), "integrations/snaportho-anki/anatomy-hierarchy");
const vocab = JSON.parse(readFileSync(path.join(HERE, "vocabulary.json"), "utf8"));
const src = JSON.parse(readFileSync(path.join(HERE, "anatomy-structures.json"), "utf8"));
const REGIONS = new Set(vocab.regions.map((r) => r.token));
const TISSUES = new Set(vocab.tissues.map((t) => t.token));
const TOKEN_RE = /^[A-Za-z0-9]+(?:_[A-Za-z0-9]+)*$/;

const doneFiles = readdirSync(path.join(HERE, "shards")).filter((f) => f.endsWith(".done.json"));
const errors = [];
const warnings = [];
const byEntity = new Map();

for (const f of doneFiles) {
  const shard = JSON.parse(readFileSync(path.join(HERE, "shards", f), "utf8"));
  for (const s of shard.structures ?? []) {
    if (byEntity.has(s.entity_id)) errors.push(`duplicate entity across shards: ${s.entity_id} (${s.anki_slug})`);
    byEntity.set(s.entity_id, { ...s, _shard: f });
  }
}

// Coverage: every source structure classified exactly once.
const srcById = new Map(src.structures.map((s) => [s.entity_id, s]));
for (const [id, s] of srcById) {
  if (!byEntity.has(id)) errors.push(`MISSING classification: ${s.anki_slug} (${id})`);
}

const map = {};
const tagOwners = new Map(); // governed_tag -> [entity_id...]
const merges = [];
const lowConf = [];
const regionCount = {};
const tissueCount = {};

for (const [id, s] of byEntity) {
  if (!srcById.has(id)) { warnings.push(`extra entity not in source dump: ${id}`); continue; }
  const region = s.region, tissue = s.tissue;
  const structure = s.canonical_structure || s.anki_slug;
  if (!REGIONS.has(region)) errors.push(`bad region "${region}" for ${s.anki_slug}`);
  if (!TISSUES.has(tissue)) errors.push(`bad tissue "${tissue}" for ${s.anki_slug}`);
  if (!TOKEN_RE.test(structure)) errors.push(`bad structure token "${structure}" for ${s.anki_slug}`);
  if (s.merge_into) merges.push({ from: s.anki_slug, into: s.merge_into, entity_id: id });
  if (s.confidence === "low") lowConf.push(`${s.anki_slug} -> ${region}::${tissue} (${s.evidence ?? "no evidence"})`);
  if (!REGIONS.has(region) || !TISSUES.has(tissue)) continue;

  regionCount[region] = (regionCount[region] ?? 0) + 1;
  tissueCount[`${region}::${tissue}`] = (tissueCount[`${region}::${tissue}`] ?? 0) + 1;
  const path3 = [region, tissue, structure];
  const governed_tag = `SnapOrtho::Anatomy::${path3.join("::")}`;
  const ancestors = [
    `SnapOrtho::Anatomy::${region}`,
    `SnapOrtho::Anatomy::${region}::${tissue}`,
  ];
  map[id] = {
    entity_id: id, anki_slug: s.anki_slug, preferred_label: srcById.get(id).preferred_label,
    region, tissue, structure, path: path3, governed_tag, ancestors,
    deck_card_count: srcById.get(id).deck_card_count,
  };
  const owners = tagOwners.get(governed_tag) ?? [];
  owners.push(s.anki_slug);
  tagOwners.set(governed_tag, owners);
}

// Tag collisions: two distinct entities rendering the same leaf tag (real duplicate).
for (const [tag, owners] of tagOwners) {
  if (owners.length > 1) errors.push(`tag collision ${tag} <- ${owners.join(", ")}`);
}

// Write map (only if hard-valid; always write report).
const report = [];
report.push(`# Anatomy hierarchy reconcile report`);
report.push(``);
report.push(`- shards processed: ${doneFiles.length}`);
report.push(`- structures classified: ${byEntity.size} / ${src.totalStructures}`);
report.push(`- used-in-deck classified: ${Object.values(map).filter((m) => m.deck_card_count > 0).length} / ${src.usedInDeck}`);
report.push(`- hard errors: ${errors.length}`);
report.push(`- proposed merges: ${merges.length} · low-confidence: ${lowConf.length}`);
report.push(``);
report.push(`## Region distribution (structures / deck cards)`);
const cardsByRegion = {};
for (const m of Object.values(map)) cardsByRegion[m.region] = (cardsByRegion[m.region] ?? 0) + m.deck_card_count;
for (const r of vocab.regions.map((x) => x.token)) {
  if (!regionCount[r]) continue;
  report.push(`- ${r}: ${regionCount[r]} structures, ${cardsByRegion[r] ?? 0} deck cards`);
}
report.push(``);
report.push(`## Region::Tissue leaves`);
for (const k of Object.keys(tissueCount).sort()) report.push(`- ${k}: ${tissueCount[k]}`);
if (merges.length) { report.push(``, `## Proposed merges (NOT auto-applied — additive pass keeps both leaves)`); merges.forEach((m) => report.push(`- ${m.from} -> ${m.into}`)); }
if (lowConf.length) { report.push(``, `## Low-confidence (review)`); lowConf.forEach((l) => report.push(`- ${l}`)); }
if (errors.length) { report.push(``, `## HARD ERRORS (fix before apply)`); errors.forEach((e) => report.push(`- ${e}`)); }
if (warnings.length) { report.push(``, `## Warnings`); warnings.forEach((w) => report.push(`- ${w}`)); }

writeFileSync(path.join(HERE, "coverage-report.md"), report.join("\n") + "\n");

if (errors.length) {
  console.error(`RECONCILE FAILED: ${errors.length} hard errors. See coverage-report.md`);
  process.exit(1);
}

const outMap = {
  schemaVersion: vocab.schemaVersion,
  generatedAt: new Date().toISOString(),
  sourceManifestId: src.manifestId,
  deckReleaseId: src.deckReleaseId,
  structureCount: Object.keys(map).length,
  entities: map,
};
writeFileSync(path.join(HERE, "anatomy-hierarchy.map.json"), JSON.stringify(outMap, null, 2) + "\n");
console.error(`OK: wrote anatomy-hierarchy.map.json (${Object.keys(map).length} entities) + coverage-report.md`);
