/* Durable rerank diagnostic for BroBot claims retrieval.
 *
 * For each benchmark prompt with a pre-fetched candidate pool, records the
 * full rerank trajectory (pool rank -> scored rank -> selected rank), score
 * decomposition, MMR/diversity effects, thresholds, and a deterministic
 * root-cause classification for every recall miss, leak, and unsupported
 * false-serve.
 *
 * Usage:
 *   node --experimental-strip-types --experimental-loader ./tmp/alias-loader.mjs \
 *     scripts/brobot-claims-rerank-diagnose.ts <benchmark.json> <pools.json> <out.json> \
 *     [promptId,filter] ['{"minScore":0.25}']
 *
 * Pools are produced by tmp/bb-eval-v3.ts (QU -> v3 RPC, production-faithful).
 * Scoring uses DEFAULT_RERANK_PARAMS plus the optional JSON override, so the
 * diagnostic always reflects production behavior unless an override is given.
 */
import fs from "node:fs";
import {
  BROBOT_RERANK_VERSION,
  DEFAULT_RERANK_PARAMS,
  dedupeCandidates,
  rerankClaims,
  scoreCandidates,
  type BroBotRerankParams,
  type BroBotRerankScored,
} from "../src/lib/brobot/kg/rerank";
import {
  compareQualifiers,
  qualifierVeto,
  type BroBotQualifierDimension,
} from "../src/lib/brobot/kg/qualifiers";
import {
  assessSupport,
  detectUnsupportedTopic,
  normalizeRetrievalText,
} from "../src/lib/brobot/kg/query-understanding";

export const RERANK_DIAG_VERSION = "brobot-rerank-diagnose.v1" as const;

export type MissClass =
  | "qualifier_conflict_not_penalized"
  | "entity_crowding"
  | "facet_mismatch"
  | "lexical_underweight"
  | "semantic_overmatch"
  | "mmr_eviction"
  | "threshold_error"
  | "unsupported_query_error"
  | "benchmark_label_issue"
  | "other";

type Parts = Record<string, number>;

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Approximate TS covers(): normalized substring with singular folding. */
function coversApprox(normText: string, tokenSet: Set<string>, term: string): boolean {
  if (term.length < 4) return tokenSet.has(term);
  if (normText.includes(term)) return true;
  if (term.length > 3 && term.endsWith("s") && normText.includes(term.slice(0, -1))) return true;
  if (term.length >= 10 && normText.includes(term.slice(0, -3))) return true;
  return false;
}

function jaccardTokens(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let inter = 0;
  for (const token of setA) if (setB.has(token)) inter += 1;
  return inter / (setA.size + setB.size - inter);
}

function lexicalOf(parts: Parts): number {
  return num(parts.text) + num(parts.questionCoverage);
}

function nonLexicalOf(parts: Parts): number {
  return num(parts.entity) + num(parts.card) + num(parts.mode) + num(parts.trust) + num(parts.mentionCoherence);
}

export type CompetitorRecord = {
  claimId: string;
  claimText: string;
  trustTier: string;
  isExpected: boolean;
  isHardNegative: boolean;
  poolRank: number | null;
  scoredRank: number | null;
  finalRank: number | null;
  finalScore: number;
  dropReason: string | null;
  scores: {
    lexical: number;
    entity: number;
    facet: number;
    facetFactor: number;
    card: number;
    trust: number;
    topicMiss: number;
    topAnchorMiss: number;
    coherence: number;
    mode: number;
    quality: number;
    graph: number;
    typeFactor: number;
    popFactor: number;
  };
  exactTermHits: number;
  exactTermTotal: number;
  claimFacets: string[];
  primaryEntityLabel: string | null;
  mmr: {
    maxSimToHigherSelected: number;
    maxSimToSelected: number;
    diversityCut: boolean;
  };
  /** Qualifier comparison vs the query: veto dimension, conflicts, matches. */
  qualifierStates: {
    veto: BroBotQualifierDimension | null;
    conflicts: BroBotQualifierDimension[];
    matches: BroBotQualifierDimension[];
  };
};

export type MissRecord = {
  claimId: string;
  class: MissClass;
  detail: string;
  poolRank: number | null;
  finalScore: number | null;
  dropReason: string | null;
};

function buildCompetitor(input: {
  scoredById: Map<string, BroBotRerankScored>;
  poolOrder: Map<string, number>;
  selectedOrder: Map<string, number>;
  dropById: Map<string, string>;
  claimId: string;
  claimText: string;
  trustTier: string;
  primaryEntityLabel: string | null;
  terms: readonly string[];
  expected: Set<string>;
  hardNegatives: Set<string>;
  selectedTokensByRank: Array<{ claimId: string; tokens: readonly string[] }>;
  queryTokenSet: Set<string>;
  dropScore: number | null;
  queryText: string;
  claimPredicate: string | null;
}): CompetitorRecord {
  const scored = input.scoredById.get(input.claimId);
  const comparison = compareQualifiers(input.queryText, input.claimText, input.claimPredicate);
  const conflicts = (Object.keys(comparison) as BroBotQualifierDimension[]).filter(
    (dimension) => comparison[dimension].state === "conflict"
  );
  const matches = (Object.keys(comparison) as BroBotQualifierDimension[]).filter(
    (dimension) => comparison[dimension].state === "match"
  );
  const parts = scored?.scoreParts ?? {};
  const normText = ` ${normalizeRetrievalText(input.claimText)} `;
  const tokenSet = new Set(normalizeRetrievalText(input.claimText).split(" ").filter(Boolean));
  const exactTermHits = input.terms.filter((term) => coversApprox(normText, tokenSet, term)).length;
  const finalRank = input.selectedOrder.get(input.claimId) ?? null;
  const claimTokens = scored?.tokens ?? [];
  const novelty = claimTokens.filter((token) => !input.queryTokenSet.has(token));
  let maxSim = 0;
  let maxSimAny = 0;
  for (const other of input.selectedTokensByRank) {
    if (other.claimId === input.claimId) continue;
    const otherNovelty = other.tokens.filter((token) => !input.queryTokenSet.has(token));
    const sim = jaccardTokens(novelty, otherNovelty);
    maxSimAny = Math.max(maxSimAny, sim);
    const otherRank = input.selectedOrder.get(other.claimId) ?? Infinity;
    if (finalRank !== null && otherRank < finalRank) {
      maxSim = Math.max(maxSim, sim);
    }
  }
  return {
    claimId: input.claimId,
    claimText: input.claimText.slice(0, 200),
    trustTier: input.trustTier,
    isExpected: input.expected.has(input.claimId),
    isHardNegative: input.hardNegatives.has(input.claimId),
    poolRank: input.poolOrder.get(input.claimId) ?? null,
    scoredRank: scored ? [...input.scoredById.values()].findIndex((c) => c.claimId === input.claimId) + 1 : null,
    finalRank: finalRank !== null ? finalRank + 1 : null,
    finalScore: scored?.finalScore ?? input.dropScore ?? 0,
    dropReason: input.dropById.get(input.claimId) ?? null,
    scores: {
      lexical: lexicalOf(parts),
      entity: num(parts.entity),
      facet: num(parts.facet),
      facetFactor: parts.facetMismatchFactor ?? 1,
      card: num(parts.card),
      trust: num(parts.trust),
      topicMiss: num(parts.topicMiss),
      topAnchorMiss: num(parts.topAnchorMiss),
      coherence: num(parts.mentionCoherence),
      mode: num(parts.mode),
      quality: num(parts.quality),
      graph: num(parts.graphDistance),
      typeFactor: parts.typeMismatchFactor ?? 1,
      popFactor: parts.popMismatchFactor ?? 1,
    },
    exactTermHits,
    exactTermTotal: input.terms.length,
    claimFacets: scored?.claimFacets ?? [],
    primaryEntityLabel: input.primaryEntityLabel,
    mmr: {
      maxSimToHigherSelected: Math.round(maxSim * 1000) / 1000,
      maxSimToSelected: Math.round(maxSimAny * 1000) / 1000,
      diversityCut: input.dropById.get(input.claimId) === "diversity_cut",
    },
    qualifierStates: {
      veto: qualifierVeto(comparison),
      conflicts,
      matches,
    },
  };
}

type ClassifyInput = {
  expectedId: string;
  inPool: boolean;
  poolRank: number | null;
  dropReason: string | null;
  expectedFinal: number | null;
  expectedParts: Parts | null;
  expectedTermHits: number;
  /** Top selected competitor by final score, if any. */
  best: CompetitorRecord | null;
  /** Top-5 selected competitors. */
  topSelected: CompetitorRecord[];
  /** Lowest final score among ALL selected (the MMR cut line). */
  cutScore: number;
  /** Max novelty-jaccard similarity to any selected claim. */
  maxSimToSelected: number;
  /** Served hard negative outranking the expected claim, if any. */
  outrankingHardNegative: CompetitorRecord | null;
  /** True when an identical-text twin of the expected claim was selected. */
  twinSelected: boolean;
  minScore: number;
};

export function classifyMiss(input: ClassifyInput): { class: MissClass; detail: string } {
  if (!input.inPool) return { class: "other", detail: "pool_absent" };
  const reason = input.dropReason ?? "";
  if (reason.startsWith("unsupported_topic:")) {
    return { class: "unsupported_query_error", detail: "false_abstention" };
  }
  if (reason === "no_facet_compatible_claim") {
    return { class: "facet_mismatch", detail: "packet_facet_gate" };
  }
  if (reason === "aboutness_primary_mismatch") {
    return { class: "entity_crowding", detail: "aboutness_primary_mismatch" };
  }
  if (reason.startsWith("eligibility_recheck_failed")) {
    return { class: "other", detail: reason };
  }
  if (reason.startsWith("qualifier_veto:")) {
    return { class: "other", detail: `false_qualifier_veto:${reason.slice("qualifier_veto:".length)}` };
  }
  if (reason === "duplicate_text") {
    return input.twinSelected
      ? { class: "benchmark_label_issue", detail: "identical_twin_selected" }
      : { class: "other", detail: "duplicate_text_twin_unselected" };
  }
  if (reason === "near_duplicate_collapse") {
    if (input.maxSimToSelected >= 0.6) {
      return { class: "benchmark_label_issue", detail: `content_served_as_twin:sim=${input.maxSimToSelected.toFixed(2)}` };
    }
    return { class: "mmr_eviction", detail: "collapsed_twin_unselected" };
  }
  if (reason === "diversity_cut") {
    if (input.maxSimToSelected >= 0.6) {
      return { class: "benchmark_label_issue", detail: `content_served_as_sibling:sim=${input.maxSimToSelected.toFixed(2)}` };
    }
    const lowest = input.cutScore;
    const facetFactor = input.expectedParts?.facetMismatchFactor ?? 1;
    const unpenalized = facetFactor > 0 && facetFactor < 1
      ? (input.expectedFinal ?? 0) / facetFactor
      : (input.expectedFinal ?? -Infinity);
    if (facetFactor < 1 && unpenalized >= lowest) {
      return { class: "facet_mismatch", detail: "facet_penalty_caused_cut" };
    }
    const pure = (input.expectedFinal ?? -Infinity) >= lowest;
    return { class: "mmr_eviction", detail: pure ? "pure_mmr_eviction" : "scored_below_cut" };
  }
  if (reason !== "below_relevance_threshold") {
    return { class: "other", detail: reason || "unknown" };
  }
  // Threshold drop: compare the expected claim against the winner.
  if (input.expectedTermHits === 0) {
    return { class: "benchmark_label_issue", detail: "zero_term_overlap" };
  }
  if (input.outrankingHardNegative) {
    const dims = input.outrankingHardNegative.qualifierStates.conflicts;
    return {
      class: "qualifier_conflict_not_penalized",
      detail: `served_hard_negative:${input.outrankingHardNegative.claimId.slice(0, 8)}:${dims.length ? dims.join("+") : "no_detected_conflict"}`,
    };
  }
  const crowded = input.topSelected.filter(
    (c) => c.scores.lexical < 0.1 && c.scores.entity > 0.05
  ).length;
  if (crowded >= 2 && input.best && lexicalOf(input.expectedParts ?? {}) >= 0.15) {
    return { class: "entity_crowding", detail: `${crowded}_entity_only_competitors` };
  }
  const best = input.best;
  if (best && (input.expectedParts?.facetMismatchFactor ?? 1) < 1 && best.scores.facetFactor === 1) {
    return { class: "facet_mismatch", detail: "expected_facet_penalized_winner_not" };
  }
  if (best && input.expectedParts) {
    const lexE = lexicalOf(input.expectedParts);
    const lexC = best.scores.lexical;
    const nonE = nonLexicalOf(input.expectedParts);
    const nonC = best.scores.entity + best.scores.card + best.scores.mode + best.scores.trust + best.scores.coherence;
    if (lexE >= lexC + 0.05 && (input.expectedFinal ?? 0) < best.finalScore) {
      return { class: "lexical_underweight", detail: `lexE=${lexE.toFixed(2)}_lexC=${lexC.toFixed(2)}` };
    }
    if (nonC - nonE > 0.1 && Math.abs(best.scores.topicMiss - num(input.expectedParts.topicMiss)) <= 0.05) {
      return { class: "semantic_overmatch", detail: `nonlex_gap=${(nonC - nonE).toFixed(2)}` };
    }
  }
  return { class: "threshold_error", detail: input.topSelected.length === 0 ? "empty_packet" : "weak_all_around" };
}

export function classifyLeak(input: {
  finalScore: number;
  topicMiss: number;
  minScore: number;
  conflictDims: BroBotQualifierDimension[];
}): {
  class: MissClass;
  detail: string;
} {
  if (input.conflictDims.length > 0) {
    return {
      class: "qualifier_conflict_not_penalized",
      detail: `survived_conflict:${input.conflictDims.join("+")}`,
    };
  }
  if (input.topicMiss >= -0.05 && input.finalScore >= input.minScore + 0.1) {
    return { class: "other", detail: "qualifier_module_gap:no_conflict_detected" };
  }
  if (input.finalScore < input.minScore + 0.1) {
    return { class: "threshold_error", detail: "marginal_serve" };
  }
  return { class: "semantic_overmatch", detail: "mid_final_partial_miss" };
}

function main(): void {
  const [benchmarkPath, poolsPath, outPath, filterArg = "", paramsArg = "{}"] = process.argv.slice(2);
  if (!benchmarkPath || !poolsPath || !outPath) {
    console.error("usage: diagnose <benchmark.json> <pools.json> <out.json> [id,filter] ['{overrides}']");
    process.exit(1);
  }
  const params: BroBotRerankParams = { ...DEFAULT_RERANK_PARAMS, ...JSON.parse(paramsArg) };
  const BM = JSON.parse(fs.readFileSync(benchmarkPath, "utf8"));
  const POOLS = JSON.parse(fs.readFileSync(poolsPath, "utf8"));
  const byId = new Map(BM.prompts.map((p: { id: string }) => [p.id, p]));
  const only = filterArg ? new Set(filterArg.split(",")) : null;

  const queries: Array<Record<string, unknown>> = [];
  const missClasses: Record<string, number> = {};
  const leakClasses: Record<string, number> = {};
  let rs = 0;
  let rn = 0;
  let leaks = 0;
  const leakIds: string[] = [];
  let unsup = 0;
  let unsupN = 0;
  let empty = 0;
  let packetSizeSum = 0;
  let packetSizeN = 0;

  for (const res of POOLS.results) {
    if (only && !only.has(res.id)) continue;
    const p = byId.get(res.id) as {
      prompt: string; context?: string; expectedClaimIds?: string[];
      hardNegativeClaimIds?: string[]; noClaimExpected?: boolean;
    };
    const q = p.context ? `${p.context} ${p.prompt}` : p.prompt;
    const unsupportedTopic = detectUnsupportedTopic(p.prompt);
    const out = rerankClaims({
      query: q, terms: res.qu.terms, facets: res.qu.facets, candidates: res.pool,
      params, unsupportedTopic, supportLevel: assessSupport(p.prompt).level,
      termIdf: res.qu.termIdf, anchors: res.anchors,
    });
    // Full-parts scoring (threshold disabled) so dropped claims keep parts.
    const { unique } = dedupeCandidates(res.pool);
    const full = scoreCandidates({
      query: q, terms: res.qu.terms, facets: res.qu.facets, candidates: unique,
      params: { ...params, minScore: Number.NEGATIVE_INFINITY },
      termIdf: res.qu.termIdf, anchors: res.anchors,
    });
    const scoredById = new Map(full.scored.map((c) => [c.claimId, c]));
    const poolOrder = new Map<string, number>(res.pool.map((c: { claimId: string }, i: number) => [c.claimId, i + 1]));
    const selectedOrder = new Map<string, number>(out.selected.map((c, i: number) => [c.claimId, i]));
    const dropById = new Map<string, string>(out.dropped.map((d) => [d.claimId, d.reason]));
    const dropScoreById = new Map<string, number>(out.dropped.map((d) => [d.claimId, d.finalScore]));
    const expected = new Set<string>(p.expectedClaimIds ?? []);
    const hardNegatives = new Set<string>(p.hardNegativeClaimIds ?? []);
    const selectedTokensByRank = out.selected.map((c) => ({
      claimId: c.claimId,
      tokens: scoredById.get(c.claimId)?.tokens ?? [],
    }));
    const queryTokenSet = new Set(
      normalizeRetrievalText(q).split(" ").filter((t) => t.length >= 2)
    );
    const poolById = new Map<string, { claimText: string; trustTier: string; primaryEntityLabel: string | null; predicate: string | null }>(
      res.pool.map((c: { claimId: string; claimText: string; trustTier: string; primaryEntityLabel?: string | null; predicate?: string | null }) => [
        c.claimId,
        { claimText: c.claimText, trustTier: c.trustTier, primaryEntityLabel: c.primaryEntityLabel ?? null, predicate: c.predicate ?? null },
      ])
    );
    const mkCompetitor = (claimId: string): CompetitorRecord => {
      const meta = poolById.get(claimId) ?? { claimText: "", trustTier: "?", primaryEntityLabel: null, predicate: null };
      return buildCompetitor({
        scoredById, poolOrder, selectedOrder, dropById, claimId,
        claimText: meta.claimText, trustTier: meta.trustTier,
        primaryEntityLabel: meta.primaryEntityLabel,
        terms: res.qu.terms, expected, hardNegatives, selectedTokensByRank, queryTokenSet,
        dropScore: dropScoreById.get(claimId) ?? null,
        queryText: q,
        claimPredicate: meta.predicate,
      });
    };
    // Top competitors: selected first, then highest-scored unselected.
    // Missed expected claims and served hard negatives are always included.
    const competitorIds: string[] = [...out.selected.map((c) => c.claimId)];
    for (const c of full.scored) {
      if (competitorIds.length >= 8) break;
      if (!selectedOrder.has(c.claimId)) competitorIds.push(c.claimId);
    }
    for (const id of expected) {
      if (!competitorIds.includes(id) && poolById.has(id)) competitorIds.push(id);
    }
    for (const c of out.selected) {
      if (hardNegatives.has(c.claimId) && !competitorIds.includes(c.claimId)) competitorIds.push(c.claimId);
    }
    const competitors = competitorIds.map(mkCompetitor);
    const topSelected = competitors.filter((c) => c.finalRank !== null).slice(0, 5);
    const best = topSelected[0] ?? null;

    const queryRecord: Record<string, unknown> = {
      id: res.id,
      query: p.prompt,
      queryUnderstanding: {
        terms: res.qu.terms,
        facets: res.qu.facets,
        variants: res.qu.variants ?? [],
        unsupportedTopic,
        support: assessSupport(p.prompt),
      },
      served: out.selected.map((c) => ({ claimId: c.claimId, finalScore: c.finalScore })),
      coverage: out.coverage,
      limitations: out.limitations,
      thresholds: { minScore: params.minScore, maxClaims: params.maxClaims, strongScore: params.strongScore },
      competitors,
      misses: [] as MissRecord[],
      leaks: [] as Array<{ claimId: string; class: MissClass; detail: string; finalScore: number }>,
    };

    const isUnsup = Boolean(p.noClaimExpected) || unsupportedTopic !== null;
    packetSizeSum += out.selected.length;
    packetSizeN += 1;
    if (isUnsup) {
      unsupN += 1;
      if (out.selected.length > 0) {
        unsup += 1;
        missClasses.unsupported_query_error = (missClasses.unsupported_query_error ?? 0) + 1;
        (queryRecord.misses as MissRecord[]).push({
          claimId: "(packet)",
          class: "unsupported_query_error",
          detail: `served_${out.selected.length}_for_unsupported`,
          poolRank: null,
          finalScore: null,
          dropReason: null,
        });
      }
      queries.push(queryRecord);
      continue;
    }
    if (expected.size === 0) {
      queries.push(queryRecord);
      continue;
    }
    rn += 1;
    const sel = new Set(out.selected.map((c) => c.claimId));
    const hit = [...expected].filter((id) => sel.has(id)).length;
    rs += hit / expected.size;
    if (out.selected.length === 0) empty += 1;
    const hnServed = out.selected.filter((c) => hardNegatives.has(c.claimId));
    if (hnServed.length > 0) {
      leaks += 1;
      leakIds.push(res.id);
      for (const h of hnServed) {
        const rec = mkCompetitor(h.claimId);
        const cls = classifyLeak({
          finalScore: rec.finalScore,
          topicMiss: rec.scores.topicMiss,
          minScore: params.minScore,
          conflictDims: rec.qualifierStates.conflicts,
        });
        leakClasses[cls.class] = (leakClasses[cls.class] ?? 0) + 1;
        (queryRecord.leaks as Array<Record<string, unknown>>).push({
          claimId: h.claimId, class: cls.class, detail: cls.detail, finalScore: rec.finalScore,
        });
      }
    }
    for (const id of expected) {
      if (sel.has(id)) continue;
      const rec = poolById.has(id) ? mkCompetitor(id) : null;
      const outranking = topSelected.find((c) => c.isHardNegative && c.finalScore > (rec?.finalScore ?? 0)) ?? null;
      const twinSelected = rec !== null && competitors.some(
        (c) =>
          c.finalRank !== null &&
          c.claimId !== id &&
          normalizeRetrievalText(c.claimText) === normalizeRetrievalText(poolById.get(id)?.claimText ?? "\0")
      );
      const allSelected = competitors.filter((c) => c.finalRank !== null);
      const cls = classifyMiss({
        expectedId: id,
        inPool: poolById.has(id),
        poolRank: poolOrder.get(id) ?? null,
        dropReason: dropById.get(id) ?? null,
        expectedFinal: rec?.finalScore ?? null,
        expectedParts: rec ? scoredById.get(id)?.scoreParts ?? null : null,
        expectedTermHits: rec?.exactTermHits ?? 0,
        best,
        topSelected,
        cutScore: allSelected.length ? Math.min(...allSelected.map((c) => c.finalScore)) : Infinity,
        maxSimToSelected: rec?.mmr.maxSimToSelected ?? 0,
        outrankingHardNegative: outranking,
        twinSelected,
        minScore: params.minScore,
      });
      missClasses[cls.class] = (missClasses[cls.class] ?? 0) + 1;
      (queryRecord.misses as MissRecord[]).push({
        claimId: id,
        class: cls.class,
        detail: cls.detail,
        poolRank: poolOrder.get(id) ?? null,
        finalScore: rec?.finalScore ?? null,
        dropReason: dropById.get(id) ?? null,
      });
    }
    queries.push(queryRecord);
  }

  const summary = {
    version: RERANK_DIAG_VERSION,
    rerankVersion: BROBOT_RERANK_VERSION,
    params,
    n: queries.length,
    meanRecall: rs / Math.max(1, rn),
    leakRate: leaks / Math.max(1, queries.length),
    leaks,
    leakIds,
    unsupRate: unsup / Math.max(1, unsupN),
    unsup,
    unsupN,
    emptyRate: empty / Math.max(1, rn),
    meanPacketSize: packetSizeSum / Math.max(1, packetSizeN),
    missClasses,
    leakClasses,
  };
  fs.writeFileSync(outPath, JSON.stringify({ summary, queries }, null, 1));
  console.log(JSON.stringify(summary, (k, v) => (k === "params" ? undefined : v), 1));
}

main();
