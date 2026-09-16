#!/usr/bin/env node
/**
 * Simulate coverage if proposed-entities.json were added to the KG. No writes.
 * Reports: coverage lift, how many previously-uncovered cards now link,
 * generic aliases (noise), and dead entities (0 matches) to refine.
 * Run from snaportho-web/.
 */
import { readFileSync } from "node:fs";
import { loadEnv, makeClient, pull, DEFAULT_RELEASE, noteText, generateAliases, escRe, canonicalMap } from "./lib/kg-enrich-core.mjs";

const DIR = "/private/tmp/claude-501/-Users-alexbaur-snaportho-dev/55416ace-fa33-4ab9-88ed-3e3e3cb1f5d2/scratchpad/kg-enrich";
const sb = makeClient(loadEnv());
const proposed = JSON.parse(readFileSync(`${DIR}/proposed-entities.json`, "utf8")).entities.slice();
try { proposed.push(...JSON.parse(readFileSync(`${DIR}/proposed-entities-additions.json`, "utf8")).entities); } catch { /* v1 only */ }

const rc = await pull(sb, "anki_deck_release_cards", "canonical_card_id,note_guid,deck_release_id");
const inRel = rc.filter((r) => r.deck_release_id === DEFAULT_RELEASE);
const g2c = new Map(inRel.map((r) => [r.note_guid, r.canonical_card_id]));
const dg = new Set(inRel.map((r) => r.note_guid));
const deckCardIds = new Set(inRel.map((r) => r.canonical_card_id));
const nraw = await pull(sb, "anki_notes", "anki_note_guid,sort_field,field_values", (q) => q.eq("is_active", true));
const notes = nraw.filter((n) => dg.has(n.anki_note_guid)).map((n) => { const t = noteText(n); return { card: g2c.get(n.anki_note_guid), all: t.all }; });
const ents = await pull(sb, "canonical_entities", "id,preferred_label,normalized_label,slug,entity_type", (q) => q.eq("is_active", true));
const GEN = notes.length * 0.25;

function coverageFrom(aliasMap) {
  const covered = new Set(); const perAlias = new Map();
  for (const [a] of aliasMap) {
    const re = new RegExp(`\\b${escRe(a)}\\b`);
    let c = 0; const hit = [];
    for (const n of notes) if (re.test(n.all)) { c++; hit.push(n.card); }
    perAlias.set(a, c);
    if (c > 0 && c <= GEN) for (const card of hit) covered.add(card);
  }
  return { covered, perAlias };
}

// baseline: existing entities only
const baseMap = new Map();
for (const e of ents) for (const a of generateAliases(e)) baseMap.set(a, true);
const base = coverageFrom(baseMap);

// existing + proposed
const fullMap = new Map(baseMap);
const proposedAliasOwner = new Map(); // alias -> label
for (const p of proposed) for (const a of [p.label, ...(p.aliases || [])]) { const k = a.toLowerCase().trim(); if (k.length >= 3) { fullMap.set(k, true); proposedAliasOwner.set(k, p.label); } }
const full = coverageFrom(fullMap);

// per-proposed-entity: how many cards its aliases hit (non-generic)
const entHitCards = new Map(); const genericAliases = [];
for (const p of proposed) {
  const cards = new Set();
  for (const a of [p.label, ...(p.aliases || [])]) {
    const k = a.toLowerCase().trim(); if (k.length < 3) continue;
    const c = full.perAlias.get(k) || 0;
    if (c > GEN) { genericAliases.push({ label: p.label, alias: k, c }); continue; }
    const re = new RegExp(`\\b${escRe(k)}\\b`);
    for (const n of notes) if (re.test(n.all)) cards.add(n.card);
  }
  entHitCards.set(p.label, cards.size);
}

const prevUncovered = [...deckCardIds].filter((c) => !base.covered.has(c));
const nowCovered = prevUncovered.filter((c) => full.covered.has(c));
const dead = proposed.filter((p) => (entHitCards.get(p.label) || 0) === 0);

console.log("================ SIMULATION: proposed entities ================");
console.log(`proposed entities: ${proposed.length}`);
console.log(`baseline coverage (existing KG): ${base.covered.size}/${deckCardIds.size} (${(100*base.covered.size/deckCardIds.size).toFixed(1)}%)`);
console.log(`with proposed:                   ${full.covered.size}/${deckCardIds.size} (${(100*full.covered.size/deckCardIds.size).toFixed(1)}%)`);
console.log(`previously-uncovered cards now linked: ${nowCovered.length} / ${prevUncovered.length}`);
console.log(`STILL uncovered after proposed: ${deckCardIds.size - full.covered.size}`);
console.log(`\nGENERIC aliases (>25% of deck = noise, will be dropped): ${genericAliases.length}`);
for (const g of genericAliases.sort((a,b)=>b.c-a.c).slice(0,20)) console.log(`  "${g.alias}" (${g.label}) -> ${g.c} cards`);
console.log(`\nDEAD proposed entities (0 card matches, refine aliases or drop): ${dead.length}`);
for (const d of dead) console.log(`  ${d.label}`);
// dump still-uncovered card texts for bucket-assignment
import { writeFileSync } from "node:fs";
const stillUnc = new Set([...deckCardIds].filter((c) => !full.covered.has(c)));
writeFileSync(`${DIR}/still-uncovered.txt`, notes.filter((n) => stillUnc.has(n.card)).map((n) => `${n.card}\t${n.all.slice(0,150)}`).join("\n"));

console.log(`\nTOP proposed entities by cards linked:`);
for (const [label, n] of [...entHitCards.entries()].sort((a,b)=>b[1]-a[1]).slice(0,20)) console.log(`  ${n}\t${label}`);
