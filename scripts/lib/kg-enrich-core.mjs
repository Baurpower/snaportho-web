/**
 * Shared core for KG enrichment scripts (single source of truth).
 * No external API. Text extraction, alias generation, lexical matching,
 * candidate shortlisting. Imported by kg-enrich-dryrun / kg-enrich-export / writer.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

export const DEFAULT_RELEASE = "7764b632-5622-4f1b-959d-1874908fc46d"; // v0.3.1-cloze-media

export function loadEnv(path = "./.env.local") {
  return Object.fromEntries(
    readFileSync(path, "utf8").split("\n").filter((l) => l.includes("=")).map((l) => {
      const i = l.indexOf("="); let v = l.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      return [l.slice(0, i).trim(), v];
    }));
}
export function makeClient(env = loadEnv()) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}
export async function pull(sb, table, cols, filter) {
  let out = [], from = 0; const size = 1000;
  for (;;) {
    let q = sb.from(table).select(cols).range(from, from + size - 1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) { console.error(`pull ${table} ERR`, error.message); break; }
    out = out.concat(data); if (data.length < size) break; from += size;
  }
  return out;
}

export const QUALIFIERS = new Set(["pediatric","adult","acute","chronic","traumatic","atraumatic","open","closed","left","right","bilateral","proximal","distal","medial","lateral","anterior","posterior","primary","secondary","type","grade","stage","conventional","idiopathic","adolescent","juvenile"]);
export const STOP = new Set(["the","and","of","a","an","in","on","for","with","to","by","what","which","is","are","when","how","does","from","that","this"]);

const stripHtml = (s) => String(s).replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/gi, " ");
const revealCloze = (s) => String(s).replace(/\{\{c\d+::(.*?)(::.*?)?\}\}/gs, "$1");

/**
 * Extract searchable text from an anki_notes row. field_values is an array of
 * {name, ordinal, rawValue, plainText}. Returns { primary, all }:
 *   primary = the Q&A field(s) (ordinal 0 / name "Text"/"OME") — strong signal
 *   all     = every field concatenated (incl. Extra/Lecture Notes) — supporting signal
 */
export function noteText(n) {
  const clean = (s) => stripHtml(revealCloze(String(s || ""))).toLowerCase().replace(/\s+/g, " ").trim();
  let primary = clean(n.sort_field);
  const parts = [primary];
  const fv = n.field_values;
  if (Array.isArray(fv)) {
    for (const f of fv) {
      const txt = clean(f?.plainText ?? f?.rawValue ?? "");
      if (!txt) continue;
      parts.push(txt);
      if (f?.ordinal === 0 || /^(text|ome)$/i.test(String(f?.name || ""))) primary += " " + txt;
    }
  } else if (fv && typeof fv === "object") {
    for (const v of Object.values(fv)) parts.push(clean(v));
  } else if (typeof fv === "string") {
    parts.push(clean(fv));
  }
  return { primary: primary.replace(/\s+/g, " ").trim(), all: parts.join(" ").replace(/\s+/g, " ").trim() };
}

const singP = (w) => { const o = new Set([w]); if (/ies$/.test(w)) o.add(w.replace(/ies$/, "y")); else if (/([sxz]|ch|sh)es$/.test(w)) o.add(w.replace(/es$/, "")); else if (/s$/.test(w) && !/ss$/.test(w)) o.add(w.replace(/s$/, "")); else { o.add(w + "s"); if (/y$/.test(w)) o.add(w.replace(/y$/, "ies")); } return [...o]; };
const plP = (p) => { const t = p.split(" "); if (!t.length) return [p]; return singP(t[t.length - 1]).map((v) => [...t.slice(0, -1), v].join(" ")); };

export function generateAliases(e) {
  const seeds = new Set();
  const add = (s) => { const t = String(s || "").toLowerCase().trim().replace(/\s+/g, " "); if (t) seeds.add(t); };
  add(e.preferred_label); add(e.normalized_label); if (e.slug) add(String(e.slug).replace(/[-_]+/g, " "));
  for (const s of [...seeds]) {
    const m = s.match(/^(.*?)\s*\(([^)]+)\)\s*$/); if (m) { add(m[1]); add(m[2]); }
    if (s.includes(" - ")) add(s.split(" - ")[0]);
    let tk = s.replace(/[()]/g, "").split(" ").filter(Boolean);
    while (tk.length > 1 && QUALIFIERS.has(tk[0])) { tk = tk.slice(1); add(tk.join(" ")); }
    while (tk.length > 1 && QUALIFIERS.has(tk[tk.length - 1])) { tk = tk.slice(0, -1); add(tk.join(" ")); }
  }
  for (const s of [...seeds]) for (const v of plP(s)) add(v);
  return [...seeds].filter((a) => a.length >= 4 && !STOP.has(a) && !QUALIFIERS.has(a));
}

export const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const tok = (s) => [...new Set(String(s).toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(" ").filter((w) => w.length >= 4 && !STOP.has(w) && !QUALIFIERS.has(w)))];

/**
 * Collapse near-duplicate entities (singular/plural of same label) to one
 * representative (prefer singular form; stable by id). Returns Map(id -> repId).
 */
export function canonicalMap(ents) {
  const sing = (w) => w.replace(/ies\b/g, "y").replace(/([sxz]|ch|sh)es\b/g, "$1").replace(/([^s])s\b/g, "$1");
  const key = (e) => sing(String(e.preferred_label || "").toLowerCase().trim().replace(/\s+/g, " "));
  const clusters = new Map();
  for (const e of ents) { const k = key(e); if (!clusters.has(k)) clusters.set(k, []); clusters.get(k).push(e); }
  const rep = new Map();
  for (const [, arr] of clusters) {
    arr.sort((a, b) => String(a.preferred_label).length - String(b.preferred_label).length || String(a.id).localeCompare(String(b.id)));
    const r = arr[0].id;
    for (const e of arr) rep.set(e.id, r);
  }
  return rep;
}
