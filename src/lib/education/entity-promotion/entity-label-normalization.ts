/** Conservative entity-label normalization and lexical similarity signals.
 *
 * Safe: case, whitespace, punctuation, unicode, abbreviation formatting.
 * Never automatic: clinical synonymy, plural folding of irregular/ambiguous
 * forms, acronym expansion. Those enter the graph only via reviewed aliases.
 */

const UNICODE_QUOTE_RE = /[‘’‚‛‹›“”„‟]/g;
const UNICODE_DASH_RE = /[‐‑‒–—―]/g;
const LEADING_ARTICLE_RE = /^(the|a|an)\s+/i;
const PUNCT_KEEP_SLASH_RE = /[.,;:!?'"()[\]{}<>*_|~`]/g;

export function normalizeEntityLabelForMatch(raw: string): string {
  let text = raw.normalize("NFKC");
  text = text.replace(UNICODE_QUOTE_RE, "'");
  text = text.replace(UNICODE_DASH_RE, "-");
  text = text.replace(/&gt;/gi, ">").replace(/&lt;/gi, "<").replace(/&amp;/gi, "&");
  // Possessives ("Ewing's sarcoma" -> "ewing sarcoma") so eponyms match
  // across possessive/non-possessive spellings. Runs before punctuation
  // removal, which would otherwise strand a meaningless "s" token.
  text = text.replace(/'s\b/gi, "");
  // Strip leading articles before punctuation removal so dotted acronyms
  // ("A.C.L.") are not mistaken for an article + remainder.
  text = text.replace(/\s+/g, " ").trim().replace(LEADING_ARTICLE_RE, "");
  text = text.replace(PUNCT_KEEP_SLASH_RE, " ");
  text = text.replace(/-/g, " ");
  text = text.replace(/\s+/g, " ").trim().toLowerCase();
  // Conservative plural folding (Step 2): regular -s/-es plurals plus
  // reviewed Greek/Latin families, guarded by an unfoldable-singular
  // denylist. Tokens under 4 chars (MCS) and -ss/-us endings never fold.
  text = text
    .split(" ")
    .map((token) => foldRegularPlural(token))
    .join(" ");
  return text;
}

/** High-value irregular plurals in orthopaedic text. Kept tiny on purpose;
 * anything uncertain stays unfolded (recall loss beats false conflation). */
const IRREGULAR_PLURALS: ReadonlyMap<string, string> = new Map([
  ["menisci", "meniscus"],
  ["phalanges", "phalanx"],
  ["vertebrae", "vertebra"],
  ["bursae", "bursa"],
  ["cortices", "cortex"],
  ["apices", "apex"],
  ["indices", "index"],
  ["calices", "calyx"],
  ["nares", "naris"],
  ["diagnoses", "diagnosis"],
]);

/** Singulars that must never fold: invariant nouns, Latin -is forms, and
 * singulars whose folded form would be a different word (bases/base is
 * handled by the -ases rule instead). Membership beats stemming. */
const UNFOLDABLE_SINGULARS: ReadonlySet<string> = new Set([
  "lens",
  "menses",
  "herpes",
  "diabetes",
  "species",
  "series",
  "forceps",
  "facies",
  "naris",
  "pubis",
  "cutis",
  "subcutis",
]);

function foldRegularPlural(token: string): string {
  const irregular = IRREGULAR_PLURALS.get(token);
  if (irregular) return irregular;
  if (UNFOLDABLE_SINGULARS.has(token)) return token;
  if (token.length < 4) return token;
  if (!token.endsWith("s")) return token;
  if (token.endsWith("ss") || token.endsWith("us")) return token;
  if (token.endsWith("ies")) return token; // left unfolded: facies guard, recall loss acceptable
  if (token.endsWith("sis")) return token; // Greek singular: scoliosis, arthrodesis, diagnosis
  if (token.endsWith("itis")) return token; // inflammatory singular: tendinitis, bursitis, tenosynovitis
  if (token.endsWith("itides")) return `${token.slice(0, -5)}tis`; // tendinitides->tendinitis
  if (token.endsWith("lis")) return token; // Latin singular: gracilis, radialis, femoralis
  // -stasis plurals precede the -ases rule (metastases->metastasis,
  // stases->stasis); no regular English plural ends in -stases.
  if (token.endsWith("stases")) return `${token.slice(0, -3)}sis`;
  // Regular -e(s) plurals: strip only the -s (cases->case, bases->base,
  // phases->phase). Must precede the -ses rule so -ases never becomes -asis.
  if (token.endsWith("ases")) return token.slice(0, -1);
  // Consonant + -es plurals (abscesses->abscess, arches->arch, sinuses->sinus).
  if (
    token.endsWith("sses")
    || token.endsWith("ches")
    || token.endsWith("shes")
    || token.endsWith("uses")
  ) {
    return token.slice(0, -2);
  }
  // Greek -sis plurals (diagnoses->diagnosis, prostheses->prosthesis,
  // epiphyses->epiphysis, metastases->metastasis).
  if (token.endsWith("ses")) return `${token.slice(0, -3)}sis`;
  return token.slice(0, -1);
}

/** Equality key for duplicate detection (promotion recheck, alias safety).
 * Same function as match normalization: folding can only merge keys, never
 * split them, so dedup matches are a superset of exact matches. */
export function dedupKeyForLabel(raw: string): string {
  return normalizeEntityLabelForMatch(raw);
}

/** Match keys for one label: full normalized form plus conservative
 * variants (parenthetical split, acronym-dot stripping). */
export function entityMatchKeys(raw: string): string[] {
  const keys = new Set<string>();
  const full = normalizeEntityLabelForMatch(raw);
  if (full) keys.add(full);
  // "anterior cruciate ligament (ACL)" -> base + inner acronym. The inner
  // key is added ONLY for acronym-like inners: location qualifiers such as
  // "Radial Nerve Safe Zone (Humerus)" must never match bare "Humerus".
  const paren = raw.match(/^(.*?)\(\s*([^()]{1,24})\s*\)\s*$/);
  if (paren) {
    const base = normalizeEntityLabelForMatch(paren[1]);
    if (base) keys.add(base);
    const innerRaw = paren[2].trim();
    if (innerRaw && innerRaw.length <= 12 && looksLikeAcronym(innerRaw)) {
      const inner = normalizeEntityLabelForMatch(innerRaw);
      if (inner) keys.add(inner);
    }
  }
  // "A.C.L." -> "a c l" -> "acl": collapse single-letter runs.
  if (/^([a-z] )+[a-z]$/.test(full)) keys.add(full.replace(/ /g, ""));
  const deDotted = full.replace(/\b([a-z])\.\s?(?=[a-z]\b)/g, "$1").replace(/\./g, "");
  if (deDotted && deDotted !== full) keys.add(deDotted.replace(/\s+/g, " ").trim());
  return [...keys].filter(Boolean);
}

export function tokenizeLabel(normalized: string): string[] {
  return normalized.split(" ").filter(Boolean);
}

/** Jaccard similarity over token sets. */
export function tokenJaccard(left: string, right: string): number {
  const a = new Set(tokenizeLabel(left));
  const b = new Set(tokenizeLabel(right));
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const token of a) if (b.has(token)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Containment: fraction of the shorter label's tokens present in the longer.
 * High containment with extra tokens on one side suggests elision
 * ("femoral" vs "femoral nerve") — handled as a review signal, never an
 * automatic merge. */
export function tokenContainment(left: string, right: string): number {
  const a = new Set(tokenizeLabel(left));
  const b = new Set(tokenizeLabel(right));
  if (a.size === 0 || b.size === 0) return 0;
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
  let inter = 0;
  for (const token of smaller) if (larger.has(token)) inter++;
  return inter / smaller.size;
}

function trigrams(text: string): Set<string> {
  const padded = `  ${text}  `;
  const out = new Set<string>();
  for (let i = 0; i + 3 <= padded.length; i++) out.add(padded.slice(i, i + 3));
  return out;
}

/** Trigram Dice similarity over the padded label strings. */
export function trigramSimilarity(left: string, right: string): number {
  const a = trigrams(left);
  const b = trigrams(right);
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const gram of a) if (b.has(gram)) inter++;
  return (2 * inter) / (a.size + b.size);
}

/** Short uppercase-heavy labels are likely acronyms ("ACL", "ORIF", "PIN"). */
export function looksLikeAcronym(raw: string): boolean {
  const compact = raw.replace(/[^A-Za-z]/g, "");
  if (compact.length < 2 || compact.length > 8) return false;
  const upper = compact.replace(/[^A-Z]/g, "").length;
  return upper / compact.length >= 0.6 && !/\s/.test(raw.trim());
}

/** Detect "X (ABC)" / "ABC (X)" expansion patterns for acronym alias typing. */
export function splitParenExpansion(raw: string): { base: string; inner: string } | null {
  const match = raw.match(/^(.*?)\(\s*([^()]{1,40})\s*\)\s*$/);
  if (!match) return null;
  const base = match[1].trim();
  const inner = match[2].trim();
  if (!base || !inner) return null;
  return { base, inner };
}
