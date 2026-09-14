import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  episodeFileName,
  retrievalText,
  type NailedItCatalog,
  type NailedItEpisode,
} from "./nailed-it-index.ts";

const STOPWORDS = new Set([
  "the", "and", "for", "are", "was", "with", "that", "this", "from", "which", "have", "has",
  "not", "but", "can", "may", "will", "its", "into", "than", "then", "them", "these", "those",
  "who", "what", "when", "where", "how", "why", "does", "did", "you", "your", "his", "her",
  "their", "our", "all", "any", "each", "most", "more", "some", "such", "one", "two", "three",
  "also", "seen", "used", "use", "due", "per", "via", "both", "either", "between", "within",
  "episode", "podcast", "nailed", "ortho", "dr",
]);

const TITLE_WEIGHT = 2.8;
const BODY_WEIGHT = 1;

export type NailedItEpisodeCandidate = {
  id: string;
  title: string;
  url: string | null;
  clinical: boolean;
  linkable: boolean;
  join: NailedItEpisode["join"];
  series: NailedItEpisode["series"];
  score: number;
  snippet: string;
};

export type NailedItPassage = {
  episodeId: string;
  title: string;
  kind: "show-notes" | "body";
  score: number;
  text: string;
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
      const tf = docs[i]!.tf.get(term);
      if (!tf) continue;
      const denom = tf + K1 * (1 - B + (B * docs[i]!.len) / avgLen);
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
      if (termSet.has(words[j]!.replace(/[^a-z0-9]/g, ""))) hits += 1;
    }
    if (hits > bestHits) {
      bestHits = hits;
      bestStart = i;
    }
  }
  const approxCharStart = text.split(/\s+/).slice(0, bestStart).join(" ").length;
  return text.slice(approxCharStart, approxCharStart + 320).replace(/\s+/g, " ").trim();
}

export type LoadedNailedItIndex = {
  catalog: NailedItCatalog;
  catalogChecksum: string;
  episodeById: Map<string, NailedItEpisode>;
  retrieveEpisodes: (query: string, k: number, opts?: { clinicalOnly?: boolean }) => NailedItEpisodeCandidate[];
  retrievePassages: (episodeId: string, query: string, k?: number) => NailedItPassage[];
  passage: (episodeId: string, kind: "show-notes" | "body", maxChars?: number) => string;
};

export function buildNailedItIndex(
  catalog: NailedItCatalog,
  catalogRaw = "",
): LoadedNailedItIndex {
  const episodeById = new Map(catalog.episodes.map((e) => [e.id, e]));
  const searchable = catalog.episodes;
  const titleBm25 = buildBm25(searchable.map((e) => tokenize(e.title)));
  const bodyBm25 = buildBm25(searchable.map((e) => tokenize(retrievalText(e))));
  const catalogChecksum = createHash("sha256")
    .update(catalogRaw || JSON.stringify(catalog))
    .digest("hex");

  function retrieveEpisodes(
    query: string,
    k: number,
    opts: { clinicalOnly?: boolean } = {},
  ): NailedItEpisodeCandidate[] {
    const qTerms = [...new Set(tokenize(query))];
    const titleScores = scoreQuery(qTerms, titleBm25.docs, titleBm25.idf, titleBm25.avgLen);
    const bodyScores = scoreQuery(qTerms, bodyBm25.docs, bodyBm25.idf, bodyBm25.avgLen);
    const scores = new Float64Array(searchable.length);
    for (let i = 0; i < searchable.length; i++) {
      scores[i] = TITLE_WEIGHT * titleScores[i]! + BODY_WEIGHT * bodyScores[i]!;
    }
    const ranked = Array.from({ length: searchable.length }, (_, i) => i)
      .filter((i) => scores[i]! > 0)
      .filter((i) => (opts.clinicalOnly === false ? true : searchable[i]!.clinical))
      .sort((a, b) => scores[b]! - scores[a]!)
      .slice(0, k);
    return ranked.map((i) => {
      const e = searchable[i]!;
      return {
        id: e.id,
        title: e.title,
        url: e.url,
        clinical: e.clinical,
        linkable: e.linkable,
        join: e.join,
        series: e.series,
        score: Math.round(scores[i]! * 1000) / 1000,
        snippet: bestSnippet(retrievalText(e), qTerms) || e.title,
      };
    });
  }

  function retrievePassages(episodeId: string, query: string, k = 2): NailedItPassage[] {
    const episode = episodeById.get(episodeId);
    if (!episode) return [];
    const qTerms = [...new Set(tokenize(query))];
    const notes = episode.showNoteBullets.join("\n");
    const parts: NailedItPassage[] = [];
    if (notes) {
      parts.push({
        episodeId,
        title: episode.title,
        kind: "show-notes",
        score: 1,
        text: notes.slice(0, 1600),
      });
    }
    if (episode.bodyText) {
      parts.push({
        episodeId,
        title: episode.title,
        kind: "body",
        score: 0.6,
        text: bestSnippet(episode.bodyText, qTerms) || episode.bodyText.slice(0, 1200),
      });
    }
    return parts.slice(0, k);
  }

  function passage(episodeId: string, kind: "show-notes" | "body", maxChars = 1600): string {
    const episode = episodeById.get(episodeId);
    if (!episode) return "";
    if (kind === "show-notes") return episode.showNoteBullets.join("\n").slice(0, maxChars);
    return episode.bodyText.slice(0, maxChars);
  }

  return { catalog, catalogChecksum, episodeById, retrieveEpisodes, retrievePassages, passage };
}

export function loadNailedItIndex(indexDir: string): LoadedNailedItIndex {
  const catalogPath = path.join(indexDir, "catalog.json");
  const raw = readFileSync(catalogPath, "utf8");
  const catalog = JSON.parse(raw) as NailedItCatalog;
  const episodesDir = path.join(indexDir, "episodes");
  if (existsSync(episodesDir) && catalog.episodes.length === 0) {
    const loaded: NailedItEpisode[] = [];
    for (const name of readdirSync(episodesDir)) {
      if (!name.endsWith(".json")) continue;
      loaded.push(JSON.parse(readFileSync(path.join(episodesDir, name), "utf8")) as NailedItEpisode);
    }
    catalog.episodes = loaded;
  }
  // Prefer per-episode files when present so bodyText is the full indexed copy.
  if (existsSync(episodesDir)) {
    catalog.episodes = catalog.episodes.map((row) => {
      const file = path.join(episodesDir, episodeFileName(row.id));
      if (!existsSync(file)) return row;
      return JSON.parse(readFileSync(file, "utf8")) as NailedItEpisode;
    });
  }
  return buildNailedItIndex(catalog, raw);
}
