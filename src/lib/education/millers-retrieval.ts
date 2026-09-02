import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import type { MillersCandidate } from "./millers-enrichment-packet.ts";

type CorpusPage = { pdf_page: number; printed_page: number | null; text: string };
type CorpusTocEntry = {
  level: number;
  title: string;
  pdf_page: number;
  pdf_page_end: number;
  printed_page: number | null;
};
type Corpus = {
  meta: Record<string, unknown> & { page_count: number };
  toc: CorpusTocEntry[];
  pages: CorpusPage[];
};

const STOPWORDS = new Set([
  "the", "and", "for", "are", "was", "with", "that", "this", "from", "which", "have", "has",
  "not", "but", "can", "may", "will", "its", "into", "than", "then", "them", "these", "those",
  "who", "what", "when", "where", "how", "why", "does", "did", "you", "your", "his", "her",
  "their", "our", "all", "any", "each", "most", "more", "some", "such", "one", "two", "three",
  "also", "seen", "used", "use", "due", "per", "via", "both", "either", "between", "within",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

export type LoadedIndex = {
  corpus: Corpus;
  corpusChecksum: string;
  sectionPathForPdfPage: (pdfPage: number) => string;
  retrieve: (query: string, k: number) => MillersCandidate[];
};

/** Build the section heading path ("A › B › C") for every pdf page from the TOC. */
function buildSectionPaths(corpus: Corpus): Map<number, string> {
  const byPage = new Map<number, string>();
  // For each page, find the deepest TOC entry whose span contains it; walk up its
  // ancestors (the nearest preceding entry at each shallower level) for the path.
  const toc = corpus.toc;
  for (let p = 1; p <= corpus.meta.page_count; p++) {
    // deepest containing entry = highest level whose [pdf_page, pdf_page_end] holds p
    let best: CorpusTocEntry | null = null;
    for (const e of toc) {
      if (p >= e.pdf_page && p <= e.pdf_page_end) {
        if (!best || e.level > best.level) best = e;
      }
    }
    if (!best) {
      byPage.set(p, "");
      continue;
    }
    // walk up ancestors by scanning backwards for the nearest lower level
    const path: string[] = [best.title];
    let wantLevel = best.level - 1;
    const bestIdx = toc.indexOf(best);
    for (let i = bestIdx - 1; i >= 0 && wantLevel >= 1; i--) {
      if (toc[i].level === wantLevel) {
        path.unshift(toc[i].title);
        wantLevel--;
      }
    }
    byPage.set(p, path.join(" › "));
  }
  return byPage;
}

export function loadMillersIndex(corpusPath: string): LoadedIndex {
  const raw = readFileSync(corpusPath, "utf8");
  const corpus = JSON.parse(raw) as Corpus;
  const corpusChecksum = createHash("sha256").update(raw).digest("hex");
  const sectionPaths = buildSectionPaths(corpus);

  // BM25 index over content pages (skip front matter with no printed number).
  const docs = corpus.pages.filter((pg) => pg.printed_page !== null && pg.text.length > 60);
  const N = docs.length;
  const tokensByDoc = docs.map((d) => tokenize(d.text));
  const df = new Map<string, number>();
  for (const toks of tokensByDoc) {
    for (const t of new Set(toks)) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const idf = new Map<string, number>();
  for (const [t, d] of df) idf.set(t, Math.log(1 + (N - d + 0.5) / (d + 0.5)));
  const tfByDoc = tokensByDoc.map((toks) => {
    const m = new Map<string, number>();
    for (const t of toks) m.set(t, (m.get(t) ?? 0) + 1);
    return m;
  });
  const lens = tokensByDoc.map((t) => t.length);
  const avgLen = lens.reduce((a, b) => a + b, 0) / Math.max(1, N);
  const K1 = 1.5;
  const B = 0.75;

  function retrieve(query: string, k: number): MillersCandidate[] {
    const qTerms = [...new Set(tokenize(query))];
    const scores = new Float64Array(N);
    for (const term of qTerms) {
      const termIdf = idf.get(term);
      if (termIdf === undefined) continue;
      for (let i = 0; i < N; i++) {
        const tf = tfByDoc[i].get(term);
        if (!tf) continue;
        const denom = tf + K1 * (1 - B + (B * lens[i]) / avgLen);
        scores[i] += termIdf * ((tf * (K1 + 1)) / denom);
      }
    }
    const ranked = Array.from({ length: N }, (_, i) => i)
      .filter((i) => scores[i] > 0)
      .sort((a, b) => scores[b] - scores[a])
      .slice(0, k);
    return ranked.map((i) => {
      const d = docs[i];
      return {
        sectionPath: sectionPaths.get(d.pdf_page) ?? "",
        printedPage: d.printed_page,
        pdfPage: d.pdf_page,
        score: Math.round(scores[i] * 1000) / 1000,
        snippet: bestSnippet(d.text, qTerms),
      } satisfies MillersCandidate;
    });
  }

  return {
    corpus,
    corpusChecksum,
    sectionPathForPdfPage: (p) => sectionPaths.get(p) ?? "",
    retrieve,
  };
}

/** Return the ~320-char window around the densest cluster of query terms. */
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
      if (termSet.has(words[j].replace(/[^a-z0-9]/g, ""))) hits++;
    }
    if (hits > bestHits) {
      bestHits = hits;
      bestStart = i;
    }
  }
  // map word index back to a char slice on the original-cased text
  const approxCharStart = text.split(/\s+/).slice(0, bestStart).join(" ").length;
  return text.slice(approxCharStart, approxCharStart + 320).replace(/\s+/g, " ").trim();
}
