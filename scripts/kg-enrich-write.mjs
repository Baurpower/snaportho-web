#!/usr/bin/env node
/**
 * Create AI-proposed entities + write lexical links to the master KG.
 * DRY RUN by default (no writes). Pass --write to execute.
 *
 * Entities: canonical_entities, review_status='unreviewed' (later-review bucket),
 *   metadata.source='ai_enrichment_v1' + run_id (rollback cohort).
 * Links: card_canonical_entity_links, created_by_source='system', match_basis='alias',
 *   review_status='unreviewed', rollback_batch_key=run_id, metadata.source='ai_enrichment_v1'.
 * Provenance guard: never touches existing (card,entity) pairs.
 * Run from snaportho-web/.  node scripts/kg-enrich-write.mjs [--write]
 */
import { readFileSync } from "node:fs";
import { loadEnv, makeClient, pull, DEFAULT_RELEASE, noteText, generateAliases, escRe, canonicalMap } from "./lib/kg-enrich-core.mjs";

const WRITE = process.argv.includes("--write");
const DIR = "/private/tmp/claude-501/-Users-alexbaur-snaportho-dev/55416ace-fa33-4ab9-88ed-3e3e3cb1f5d2/scratchpad/kg-enrich";
const RUN_ID = process.env.RUN_ID || `ai_enrich_${new Date().toISOString().slice(0,19).replace(/[:T]/g,"")}`;
const sb = makeClient(loadEnv());
const proposed = JSON.parse(readFileSync(`${DIR}/proposed-entities-FINAL.json`, "utf8")).entities;

const norm = (s) => String(s||"").toLowerCase().trim().replace(/\s+/g," ");
const slugify = (s) => norm(s).replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80);

console.log(`MODE: ${WRITE ? "WRITE" : "DRY RUN"}   run_id=${RUN_ID}`);

// --- load deck + existing KG ---
const rc = await pull(sb,"anki_deck_release_cards","canonical_card_id,note_guid,deck_release_id");
const inRel = rc.filter(r=>r.deck_release_id===DEFAULT_RELEASE);
const g2c = new Map(inRel.map(r=>[r.note_guid,r.canonical_card_id]));
const dg = new Set(inRel.map(r=>r.note_guid));
const deckCardIds = new Set(inRel.map(r=>r.canonical_card_id));
const nraw = await pull(sb,"anki_notes","anki_note_guid,sort_field,field_values",q=>q.eq("is_active",true));
const notes = nraw.filter(n=>dg.has(n.anki_note_guid)).map(n=>{const t=noteText(n);return{card:g2c.get(n.anki_note_guid),primary:t.primary,all:t.all};});
const existing = await pull(sb,"canonical_entities","id,preferred_label,normalized_label,slug,entity_type",q=>q.eq("is_active",true));
const existingNorm = new Map(existing.map(e=>[norm(e.preferred_label),e.id]));
const existingSlugs = new Set(existing.map(e=>e.slug).filter(Boolean));

// --- split proposed into NEW vs already-exists ---
const toCreate = []; const proposedOwner = new Map(); // label -> id or temp
const seenSlugs = new Set(existingSlugs);
for (const p of proposed) {
  const exId = existingNorm.get(norm(p.label));
  if (exId) { proposedOwner.set(p.label, exId); continue; }   // concept already in KG
  let slug = slugify(p.label); let s = slug, k = 2; while (seenSlugs.has(s)) s = `${slug}-${k++}`;
  seenSlugs.add(s);
  const tempId = `TEMP:${p.label}`;
  toCreate.push({ p, slug: s, tempId });
  proposedOwner.set(p.label, tempId);
}
console.log(`proposed: ${proposed.length}; to CREATE: ${toCreate.length}; already-exist (reuse): ${proposed.length-toCreate.length}`);

// --- create entities (or assign temp ids in dry run) ---
const labelToId = new Map();
if (WRITE && toCreate.length) {
  const rows = toCreate.map(({p,slug})=>({
    entity_type: p.type, preferred_label: p.label, normalized_label: norm(p.label), slug,
    description: null, status: "reviewed", review_status: "unreviewed", is_active: true,
    metadata: { source: "ai_enrichment_v1", run_id: RUN_ID, aliases: p.aliases || [] },
  }));
  for (let i=0;i<rows.length;i+=100){
    const { data, error } = await sb.from("canonical_entities").insert(rows.slice(i,i+100)).select("id,preferred_label");
    if (error) { console.error("ENTITY INSERT ERR", error.message); process.exit(1); }
    for (const r of data) labelToId.set(r.preferred_label, r.id);
  }
  console.log(`created ${labelToId.size} entities`);
} else {
  for (const {p,tempId} of toCreate) labelToId.set(p.label, tempId);
}
const ownerId = (label) => { const v = proposedOwner.get(label); return v?.startsWith?.("TEMP:") ? (WRITE?labelToId.get(label):v) : v; };

// --- build alias -> ownerEntityId map (existing + proposed) ---
const rep = canonicalMap(existing);
const a2e = new Map();
const addAlias = (a, id) => { const k=norm(a); if(k.length<3) return; if(!a2e.has(k)) a2e.set(k,new Set()); a2e.get(k).add(id); };
for (const e of existing) for (const a of generateAliases(e)) addAlias(a, rep.get(e.id));
for (const p of proposed) { const id = ownerId(p.label) ?? (WRITE?labelToId.get(p.label):`TEMP:${p.label}`); for (const a of [p.label, ...(p.aliases||[])]) addAlias(a, id); }

// --- lexical match over deck ---
const GEN = notes.length*0.25;
const cand = new Map();
for (const [a, owners] of a2e) {
  const re = new RegExp(`\\b${escRe(a)}\\b`); const words=a.split(" ").length;
  const hits=[]; for (const n of notes){ if(!re.test(n.all)) continue; hits.push({n,primary:re.test(n.primary)}); }
  if (!hits.length || hits.length>GEN) continue;
  const rarity = 1 - hits.length/GEN;
  for (const {n,primary} of hits){
    let c = words>=2?0.86:0.66; c += 0.08*rarity; c += primary?0.06:-0.12; c=Math.max(0.4,Math.min(0.97,c));
    for (const id of owners){ const key=`${n.card}|${id}`; const prev=cand.get(key); if(!prev||c>prev.conf) cand.set(key,{card:n.card,ent:id,conf:c}); }
  }
}
// cap 5/card
const byCard=new Map(); for(const v of cand.values()){ if(!byCard.has(v.card))byCard.set(v.card,[]); byCard.get(v.card).push(v);}
let links=[]; for(const[,arr]of byCard){arr.sort((a,b)=>b.conf-a.conf); links.push(...arr.slice(0,5));}

// --- provenance guard: drop pairs already present ---
const existLinks = await pull(sb,"card_canonical_entity_links","canonical_card_id,canonical_entity_id");
const havePair = new Set(existLinks.map(l=>`${l.canonical_card_id}|${l.canonical_entity_id}`));
const before = links.length;
links = links.filter(l => !String(l.ent).startsWith("TEMP:") || !WRITE).filter(l => !havePair.has(`${l.card}|${l.ent}`));
const coveredCards = new Set(links.map(l=>l.card));

console.log(`\nlinks to insert: ${links.length} (skipped ${before-links.length} existing pairs); covering ${coveredCards.size}/${deckCardIds.size} deck cards`);
const hist={}; for(const l of links){const b=(Math.floor(l.conf*10)/10).toFixed(1);hist[b]=(hist[b]||0)+1;}
console.log("confidence histogram:", hist);

if (!WRITE) {
  console.log(`\nSAMPLE new entities (first 8):`);
  for (const {p} of toCreate.slice(0,8)) console.log(`  [${p.type}] ${p.label}  aliases: ${(p.aliases||[]).slice(0,3).join(", ")}…`);
  console.log(`\n(DRY RUN — no writes. Re-run with --write to execute.)`);
  process.exit(0);
}

// --- write links ---
const rows = links.map(l=>({
  canonical_card_id: l.card, canonical_entity_id: l.ent,
  match_basis: "alias", mapping_confidence: Number(l.conf.toFixed(3)),
  review_status: "unreviewed", created_by_source: "system", rollback_batch_key: RUN_ID,
  metadata: { source: "ai_enrichment_v1", run_id: RUN_ID },
}));
let inserted=0;
for (let i=0;i<rows.length;i+=500){
  const { data, error } = await sb.from("card_canonical_entity_links").insert(rows.slice(i,i+500)).select("id");
  if (error){ console.error("LINK INSERT ERR at",i,error.message); process.exit(1); }
  inserted += data.length;
}
console.log(`\nWROTE ${labelToId.size} entities + ${inserted} links. run_id=${RUN_ID}`);
console.log(`Rollback: delete links where rollback_batch_key='${RUN_ID}'; delete entities where metadata->>'run_id'='${RUN_ID}'.`);
