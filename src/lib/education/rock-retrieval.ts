import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const STOPWORDS = new Set([
  "the", "and", "for", "are", "was", "with", "that", "this", "from", "which", "have", "has",
  "not", "but", "can", "may", "will", "its", "into", "than", "then", "them", "these", "those",
  "who", "what", "when", "where", "how", "why", "does", "did", "you", "your", "his", "her",
  "their", "our", "all", "any", "each", "most", "more", "some", "such", "one", "two", "three",
  "also", "seen", "used", "use", "due", "per", "via", "both", "either", "between", "within",
  "chapter", "rock", "aaos",
]);

const TITLE_WEIGHT = 2.8;
const BODY_WEIGHT = 1;

export type RockCatalogChapter = {
  id: string;
  title: string;
  titleKey: string;
  url: string;
  filename: string | null;
  pages: number;
  bytes: number;
  extractableChars: number;
  charsPerPage: number;
  status: string;
  extractable: boolean;
  canonicalId: string;
  aliasIds: string[];
  isCanonical: boolean;
  error?: string | null;
};

export type RockPage = { pdf_page: number; text: string; chars: number; reference?: boolean };

// Reference/bibliography pages are dense with the chapter's own topic words
// inside citation titles, so BM25 ranks them above teaching pages. They are
// never valid grounding for a fill. Prefer the extractor's `reference` flag;
// fall back to an inline heuristic for indexes built before the flag existed.
const CITATION_MARKERS =
  /PubMed|Full Text|Am J |J Bone Joint|Foot Ankle Int|Clin Orthop|J Am Acad Orthop|Arthrosc|;\d{4};\d|\bvol \d|\beds:|, ed \d/gi;
const NUM_CITATION = /(?:^|\s)\d{1,3}\.\s+[A-Z][A-Za-z'’-]+ [A-Z]{1,3}[,: ]/g;

function isReferencePage(page: RockPage): boolean {
  if (typeof page.reference === "boolean") return page.reference;
  const text = page.text ?? "";
  const markers = (text.match(CITATION_MARKERS) ?? []).length;
  const numCites = (text.match(NUM_CITATION) ?? []).length;
  if (/\b(Recommended Readings|References)\b/i.test(text) && markers + numCites >= 3) return true;
  return markers >= 5 || numCites >= 5;
}

export type RockChapterCorpus = {
  id: string;
  title: string;
  url: string;
  filename?: string;
  pages: RockPage[];
};

export type RockChapterCandidate = {
  id: string;
  title: string;
  url: string;
  canonicalId: string;
  extractable: boolean;
  score: number;
  snippet: string;
};

export type RockPageCandidate = {
  chapterId: string;
  title: string;
  pdfPage: number;
  score: number;
  snippet: string;
};

type Bm25Doc = { tokens: string[]; tf: Map<string, number>; len: number };

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

function buildBm25(tokenLists: string[][]): {
  docs: Bm25Doc[];
  idf: Map<string, number>;
  avgLen: number;
} {
  const N = tokenLists.length;
  const df = new Map<string, number>();
  const docs: Bm25Doc[] = tokenLists.map((tokens) => {
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    for (const t of new Set(tokens)) df.set(t, (df.get(t) ?? 0) + 1);
    return { tokens, tf, len: tokens.length };
  });
  const idf = new Map<string, number>();
  for (const [t, d] of df) idf.set(t, Math.log(1 + (N - d + 0.5) / (d + 0.5)));
  const avgLen = docs.reduce((a, d) => a + d.len, 0) / Math.max(1, N);
  return { docs, idf, avgLen };
}

function scoreQuery(
  qTerms: string[],
  docs: Bm25Doc[],
  idf: Map<string, number>,
  avgLen: number,
): Float64Array {
  const K1 = 1.5;
  const B = 0.75;
  const scores = new Float64Array(docs.length);
  for (const term of qTerms) {
    const termIdf = idf.get(term);
    if (termIdf === undefined) continue;
    for (let i = 0; i < docs.length; i++) {
      const tf = docs[i].tf.get(term);
      if (!tf) continue;
      const denom = tf + K1 * (1 - B + (B * docs[i].len) / avgLen);
      scores[i] += termIdf * ((tf * (K1 + 1)) / denom);
    }
  }
  return scores;
}

function bestSnippet(text: string, qTerms: string[]): string {
  const lower = text.toLowerCase();
  const termSet = new Set(qTerms);
  const words = lower.split(/\s+/);
  let bestStart = 0;
  let bestHits = -1;
  const WINDOW = 50;
  for (let i = 0; i < words.length; i += 10) {
    let hits = 0;
    for (let j = i; j < Math.min(words.length, i + WINDOW); j++) {
      if (termSet.has(words[j].replace(/[^a-z0-9]/g, ""))) hits += 1;
    }
    if (hits > bestHits) {
      bestHits = hits;
      bestStart = i;
    }
  }
  const approxCharStart = text.split(/\s+/).slice(0, bestStart).join(" ").length;
  return text.slice(approxCharStart, approxCharStart + 320).replace(/\s+/g, " ").trim();
}

export type LoadedRockIndex = {
  catalog: { meta: Record<string, unknown>; chapters: RockCatalogChapter[] };
  catalogChecksum: string;
  chapterById: Map<string, RockCatalogChapter>;
  retrieveChapters: (query: string, k: number) => RockChapterCandidate[];
  retrievePages: (chapterId: string, query: string, k: number) => RockPageCandidate[];
  passage: (chapterId: string, pdfPage: number, maxChars?: number) => string;
};

export function buildRockIndex(
  catalog: { meta?: Record<string, unknown>; chapters: RockCatalogChapter[] },
  corpora: RockChapterCorpus[],
  catalogRaw = "",
): LoadedRockIndex {
  const chapterById = new Map(catalog.chapters.map((c) => [c.id, c]));
  const corpusById = new Map(corpora.map((c) => [c.id, c]));
  const canonical = catalog.chapters.filter((c) => c.isCanonical !== false);
  const searchable = canonical.length ? canonical : catalog.chapters;
  const titleBm25 = buildBm25(searchable.map((c) => tokenize(c.title)));
  const bodyBm25 = buildBm25(searchable.map((c) => {
    const corpus = corpusById.get(c.id);
    const body = corpus
      ? corpus.pages.filter((p) => !isReferencePage(p)).map((p) => p.text).join("\n")
      : "";
    return tokenize(`${c.title}\n${body.slice(0, 20000)}`);
  }));
  const catalogChecksum = createHash("sha256")
    .update(catalogRaw || JSON.stringify(catalog))
    .digest("hex");

  function retrieveChapters(query: string, k: number): RockChapterCandidate[] {
    const qTerms = [...new Set(tokenize(query))];
    const titleScores = scoreQuery(qTerms, titleBm25.docs, titleBm25.idf, titleBm25.avgLen);
    const bodyScores = scoreQuery(qTerms, bodyBm25.docs, bodyBm25.idf, bodyBm25.avgLen);
    const scores = new Float64Array(searchable.length);
    for (let i = 0; i < searchable.length; i++) {
      scores[i] = TITLE_WEIGHT * titleScores[i] + BODY_WEIGHT * bodyScores[i];
    }
    const ranked = Array.from({ length: searchable.length }, (_, i) => i)
      .filter((i) => scores[i] > 0)
      .sort((a, b) => scores[b] - scores[a])
      .slice(0, k);
    return ranked.map((i) => {
      const c = searchable[i];
      const corpus = corpusById.get(c.id);
      const body = corpus
        ? corpus.pages.filter((p) => !isReferencePage(p)).map((p) => p.text).join("\n")
        : c.title;
      return {
        id: c.id,
        title: c.title,
        url: c.url,
        canonicalId: c.canonicalId || c.id,
        extractable: Boolean(c.extractable),
        score: Math.round(scores[i] * 1000) / 1000,
        snippet: bestSnippet(body, qTerms) || c.title,
      };
    });
  }

  function retrievePages(chapterId: string, query: string, k: number): RockPageCandidate[] {
    const chapter = chapterById.get(chapterId);
    const corpus = corpusById.get(chapterId);
    if (!chapter || !corpus) return [];
    const pages = corpus.pages.filter((p) => p.chars >= 40 && !isReferencePage(p));
    if (!pages.length) return [];
    const pageBm25 = buildBm25(pages.map((p) => tokenize(p.text)));
    const qTerms = [...new Set(tokenize(query))];
    const scores = scoreQuery(qTerms, pageBm25.docs, pageBm25.idf, pageBm25.avgLen);
    const ranked = Array.from({ length: pages.length }, (_, i) => i)
      .filter((i) => scores[i] > 0)
      .sort((a, b) => scores[b] - scores[a])
      .slice(0, k);
    return ranked.map((i) => ({
      chapterId,
      title: chapter.title,
      pdfPage: pages[i].pdf_page,
      score: Math.round(scores[i] * 1000) / 1000,
      snippet: bestSnippet(pages[i].text, qTerms),
    }));
  }

  function passage(chapterId: string, pdfPage: number, maxChars = 1600): string {
    const corpus = corpusById.get(chapterId);
    const page = corpus?.pages.find((p) => p.pdf_page === pdfPage);
    return page ? page.text.slice(0, maxChars) : "";
  }

  return {
    catalog: { meta: catalog.meta ?? {}, chapters: catalog.chapters },
    catalogChecksum,
    chapterById,
    retrieveChapters,
    retrievePages,
    passage,
  };
}

export function loadRockIndex(indexDir: string): LoadedRockIndex {
  const catalogPath = path.join(indexDir, "catalog.json");
  const raw = readFileSync(catalogPath, "utf8");
  const catalog = JSON.parse(raw) as { meta?: Record<string, unknown>; chapters: RockCatalogChapter[] };
  const chaptersDir = path.join(indexDir, "chapters");
  const corpora: RockChapterCorpus[] = [];
  if (existsSync(chaptersDir)) {
    for (const name of readdirSync(chaptersDir)) {
      if (!name.endsWith(".json")) continue;
      const body = JSON.parse(readFileSync(path.join(chaptersDir, name), "utf8")) as RockChapterCorpus;
      corpora.push(body);
    }
  }
  return buildRockIndex(catalog, corpora, raw);
}

export function catalogUrlForId(chapterId: string): string {
  return `https://rock.aaos.org/coursecontent.aspx?id=${chapterId}`;
}
