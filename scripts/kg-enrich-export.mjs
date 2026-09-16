#!/usr/bin/env node
/**
 * Export uncovered cards + candidate shortlists for in-session (Claude-as-frontier)
 * adjudication. No external API. Uses shared core (fixed text + dedup).
 * Run from snaportho-web/.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { loadEnv, makeClient, pull, DEFAULT_RELEASE, noteText, generateAliases, escRe, canonicalMap, tok } from "./lib/kg-enrich-core.mjs";

const OUT = process.env.OUT || "/private/tmp/claude-501/-Users-alexbaur-snaportho-dev/55416ace-fa33-4ab9-88ed-3e3e3cb1f5d2/scratchpad/kg-enrich";
const BATCH = Number(process.env.BATCH || 60);
const RELEASE = process.env.RELEASE || DEFAULT_RELEASE;
mkdirSync(OUT, { recursive: true });
const sb = makeClient(loadEnv());

console.log("loading…");
const rc = await pull(sb, "anki_deck_release_cards", "canonical_card_id,note_guid,deck_release_id");
const inRel = rc.filter((r) => r.deck_release_id === RELEASE);
const guidToCard = new Map(inRel.map((r) => [r.note_guid, r.canonical_card_id]));
const deckGuids = new Set(inRel.map((r) => r.note_guid));
const notesRaw = await pull(sb, "anki_notes", "anki_note_guid,sort_field,field_values", (q) => q.eq("is_active", true));
const notes = notesRaw.filter((n) => deckGuids.has(n.anki_note_guid)).map((n) => { const t = noteText(n); return { card: guidToCard.get(n.anki_note_guid), primary: t.primary, all: t.all }; });
const ents = await pull(sb, "canonical_entities", "id,preferred_label,normalized_label,slug,entity_type", (q) => q.eq("is_active", true));
const rep = canonicalMap(ents);
const entById = new Map(ents.map((e) => [e.id, e]));

// recompute Layer 0+1 covered set (match dry-run)
const a2e = new Map();
for (const e of ents) for (const a of generateAliases(e)) { if (!a2e.has(a)) a2e.set(a, new Set()); a2e.get(a).add(rep.get(e.id)); }
const GEN = notes.length * 0.25;
const covered = new Set();
for (const [a, owners] of a2e) { const re = new RegExp(`\\b${escRe(a)}\\b`); const hit = notes.filter((n) => re.test(n.all)); if (hit.length && hit.length <= GEN) for (const n of hit) covered.add(n.card); }
const uncovered = notes.filter((n) => !covered.has(n.card));
console.log(`covered ${covered.size}, uncovered ${uncovered.length}`);

// catalog of canonical (deduped) entities only
const repIds = new Set([...rep.values()]);
const catalog = ents.filter((e) => repIds.has(e.id)).map((e) => ({ id: e.id, label: e.preferred_label, type: e.entity_type }));
writeFileSync(`${OUT}/entity-catalog.json`, JSON.stringify(catalog));
console.log(`wrote entity-catalog.json (${catalog.length} canonical entities)`);

// candidate shortlist per uncovered card (token overlap on FULL text -> canonical rep)
const entTokens = ents.map((e) => ({ e, t: tok(e.preferred_label) })).filter((x) => x.t.length);
function shortlist(text) {
  const ct = new Set(tok(text));
  const best = new Map(); // repId -> {label,type,score}
  for (const { e, t } of entTokens) {
    let shared = 0; for (const w of t) if (ct.has(w)) shared++;
    if (!shared) continue;
    const coverage = shared / t.length;
    if (coverage < 0.5) continue;
    const repId = rep.get(e.id);
    const score = Number((coverage * Math.log2(1 + shared)).toFixed(3));
    const cur = best.get(repId);
    if (!cur || score > cur.score) best.set(repId, { id: repId, label: entById.get(repId).preferred_label, type: entById.get(repId).entity_type, score });
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, 12);
}

let b = 0, withCand = 0;
for (let i = 0; i < uncovered.length; i += BATCH) {
  const slice = uncovered.slice(i, i + BATCH).map((n) => { const cands = shortlist(n.all); if (cands.length) withCand++; return { card: n.card, text: n.primary.slice(0, 400), candidates: cands }; });
  writeFileSync(`${OUT}/uncovered-batch-${String(++b).padStart(3, "0")}.json`, JSON.stringify(slice));
}
console.log(`wrote ${b} batches (<=${BATCH}); ${withCand}/${uncovered.length} have >=1 candidate`);
