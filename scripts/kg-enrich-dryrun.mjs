#!/usr/bin/env node
/**
 * KG Enrichment Layer 0+1 DRY RUN (no writes). Uses shared core.
 * Matches aliases against full card text (primary Q&A + supporting fields),
 * weights primary-field hits higher, collapses near-duplicate entities.
 * Run from snaportho-web/:  node scripts/kg-enrich-dryrun.mjs
 */
import { loadEnv, makeClient, pull, DEFAULT_RELEASE, noteText, generateAliases, escRe, canonicalMap } from "./lib/kg-enrich-core.mjs";

const sb = makeClient(loadEnv());
const RELEASE = process.env.RELEASE || DEFAULT_RELEASE;

console.log("loading…");
const rc = await pull(sb, "anki_deck_release_cards", "canonical_card_id,note_guid,deck_release_id");
const inRel = rc.filter((r) => r.deck_release_id === RELEASE);
const guidToCard = new Map(inRel.map((r) => [r.note_guid, r.canonical_card_id]));
const deckGuids = new Set(inRel.map((r) => r.note_guid));
const deckCardIds = new Set(inRel.map((r) => r.canonical_card_id));

const notesRaw = await pull(sb, "anki_notes", "anki_note_guid,sort_field,field_values", (q) => q.eq("is_active", true));
const notes = notesRaw.filter((n) => deckGuids.has(n.anki_note_guid)).map((n) => { const t = noteText(n); return { card: guidToCard.get(n.anki_note_guid), primary: t.primary, all: t.all }; });

const ents = await pull(sb, "canonical_entities", "id,preferred_label,normalized_label,slug,entity_type", (q) => q.eq("is_active", true));
const rep = canonicalMap(ents);
const entById = new Map(ents.map((e) => [e.id, e]));
const links = await pull(sb, "card_canonical_entity_links", "canonical_card_id,is_active");
const preCovered = new Set(links.filter((l) => l.is_active !== false).map((l) => l.canonical_card_id));
console.log(`deck cards ${deckCardIds.size}, notes ${notes.length}, entities ${ents.length}`);

// aliases -> entities
const a2e = new Map();
for (const e of ents) for (const a of generateAliases(e)) { if (!a2e.has(a)) a2e.set(a, new Set()); a2e.get(a).add(rep.get(e.id)); }

// document frequency (on full text) for specificity + generic filter
const GEN = notes.length * 0.25;
const cand = new Map(); // card|repEnt -> {card,ent,conf,alias,field}
let generic = 0;
for (const [a, owners] of a2e) {
  const re = new RegExp(`\\b${escRe(a)}\\b`);
  const words = a.split(" ").length;
  const hits = [];
  for (const n of notes) { const inAll = re.test(n.all); if (!inAll) continue; hits.push({ n, primary: re.test(n.primary) }); }
  if (hits.length === 0) continue;
  if (hits.length > GEN) { generic++; continue; }
  const rarity = 1 - hits.length / GEN;
  for (const { n, primary } of hits) {
    // base by alias specificity; boost primary-field hits, discount supporting-only
    let c = words >= 2 ? 0.86 : 0.66;
    c += 0.08 * rarity;
    c += primary ? 0.06 : -0.12;
    c = Math.max(0.4, Math.min(0.97, c));
    for (const repId of owners) {
      const key = `${n.card}|${repId}`;
      const prev = cand.get(key);
      if (!prev || c > prev.conf) cand.set(key, { card: n.card, ent: repId, conf: c, alias: a, field: primary ? "primary" : "supporting" });
    }
  }
}

// cap 5/card
const byCard = new Map();
for (const v of cand.values()) { if (!byCard.has(v.card)) byCard.set(v.card, []); byCard.get(v.card).push(v); }
const accepted = [];
for (const [, arr] of byCard) { arr.sort((a, b) => b.conf - a.conf); accepted.push(...arr.slice(0, 5)); }

// report
const coveredCards = new Set(accepted.map((a) => a.card));
const usedEnts = new Set(accepted.map((a) => a.ent));
const hist = {}; for (const a of accepted) { const b = (Math.floor(a.conf * 10) / 10).toFixed(1); hist[b] = (hist[b] || 0) + 1; }
const primaryN = accepted.filter((a) => a.field === "primary").length;

console.log("\n================ DRY RUN (Layer 0+1, fixed text + dedup) ================");
console.log(`generic aliases skipped: ${generic}`);
console.log(`accepted links: ${accepted.length} (primary-field ${primaryN}, supporting ${accepted.length - primaryN}); avg ${(accepted.length/Math.max(1,coveredCards.size)).toFixed(2)}/covered card`);
console.log(`\nCOVERAGE`);
console.log(`  cards covered: ${coveredCards.size}/${deckCardIds.size} (${(100*coveredCards.size/deckCardIds.size).toFixed(1)}%)   [was 9.5% exact-label]`);
console.log(`  entities used (canonicalized): ${usedEnts.size}   [was 35]`);
console.log(`  new vs existing links: ${[...coveredCards].filter((c) => !preCovered.has(c)).length}`);
console.log(`  still uncovered -> in-session frontier: ${deckCardIds.size - coveredCards.size}`);
console.log(`\nCONFIDENCE HISTOGRAM`);
for (const k of Object.keys(hist).sort()) console.log(`  ${k}: ${"█".repeat(Math.round(hist[k]/20))} ${hist[k]}`);
const label = (id) => entById.get(id)?.preferred_label + ` [${entById.get(id)?.entity_type}]`;
console.log(`\nSAMPLE high-conf (primary):`);
for (const a of accepted.filter((x)=>x.field==="primary").sort((x,y)=>y.conf-x.conf).slice(0,8)) console.log(`  ${a.conf.toFixed(2)} ${label(a.ent)} via "${a.alias}"`);
console.log(`SAMPLE supporting-only (lower conf):`);
for (const a of accepted.filter((x)=>x.field==="supporting").slice(0,8)) console.log(`  ${a.conf.toFixed(2)} ${label(a.ent)} via "${a.alias}"`);
console.log("\n(no writes)");
