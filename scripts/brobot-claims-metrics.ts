/* Durable claims-retrieval metrics for BroBot v3.
 *
 * Reads a benchmark file, a rerank-diagnostic output file (which carries the
 * full served order per prompt), and the pools file the diagnostic ran on.
 * Reports the rollout-gate metrics: pool recall, served recall, Recall@1 /
 * Recall@3, direct-answer-in-top-3, unsupported false serves, supported-query
 * empty rate, packet size, eligibility violations, served qualifier
 * conflicts, near-duplicate packet rate, and (with --cards) exact card-link
 * yield. P@5 is reported as secondary context only: labels are sparse and
 * unselected claims are not graded negatives.
 *
 * Usage:
 *   node --experimental-strip-types --experimental-loader ./tmp/alias-loader.mjs \
 *     scripts/brobot-claims-metrics.ts <benchmark.json> <diagOut.json> <pools.json> \
 *     [--cards <cardlinks.json>]
 *
 * cardlinks.json is produced by scripts/brobot-claims-fetch-cardlinks.ts and
 * maps claim IDs to their count of approved in-release card links.
 */
import fs from "node:fs";
import {
  eligibilityRecheck,
} from "../src/lib/brobot/kg/rerank";
import {
  compareQualifiers,
  qualifierPenaltyDimensions,
  qualifierVeto,
} from "../src/lib/brobot/kg/qualifiers";
import {
  detectUnsupportedTopic,
  normalizeRetrievalText,
} from "../src/lib/brobot/kg/query-understanding";

export const CLAIMS_METRICS_VERSION = "brobot-claims-metrics.v1" as const;

/** Token Jaccard threshold for flagging a near-duplicate served pair. */
const NEAR_DUPE_JACCARD = 0.6;

type BenchmarkPrompt = {
  id: string;
  prompt: string;
  context?: string;
  expectedClaimIds?: string[];
  hardNegativeClaimIds?: string[];
  noClaimExpected?: boolean;
};

type ServedEntry = { claimId: string; finalScore: number };

type DiagQuery = {
  id: string;
  served?: ServedEntry[];
  misses?: Array<{ claimId: string; class: string; detail: string }>;
  leaks?: Array<{ claimId: string; class: string; detail: string; finalScore: number }>;
};

function tokens(text: string): Set<string> {
  return new Set(
    normalizeRetrievalText(text).split(" ").filter((t) => t.length >= 2)
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  return inter / (a.size + b.size - inter);
}

function mean(values: number[]): number {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
}

function r4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function main(): void {
  const [benchmarkPath, diagPath, poolsPath, cardsFlag, cardsPath] = process.argv.slice(2);
  if (!benchmarkPath || !diagPath || !poolsPath) {
    console.error("usage: metrics <benchmark.json> <diagOut.json> <pools.json> [--cards <cardlinks.json>]");
    process.exit(1);
  }
  const BM = JSON.parse(fs.readFileSync(benchmarkPath, "utf8")) as { prompts: BenchmarkPrompt[] };
  const DIAG = JSON.parse(fs.readFileSync(diagPath, "utf8")) as {
    summary: Record<string, unknown>;
    queries: DiagQuery[];
  };
  const POOLS = JSON.parse(fs.readFileSync(poolsPath, "utf8")) as {
    results: Array<{ id: string; pool: Array<Record<string, unknown>> }>;
  };
  let cardLinks: Record<string, number> | null = null;
  if (cardsFlag === "--cards") {
    if (!cardsPath) {
      console.error("usage: --cards requires a cardlinks.json path");
      process.exit(1);
    }
    cardLinks = (JSON.parse(fs.readFileSync(cardsPath, "utf8")) as { links: Record<string, number> }).links;
  }

  const byId = new Map(BM.prompts.map((p) => [p.id, p]));
  const diagById = new Map(DIAG.queries.map((q) => [q.id, q]));
  const poolById = new Map(POOLS.results.map((r) => [r.id, r.pool]));

  const poolRecalls: number[] = [];
  const servedRecalls: number[] = [];
  let recallAt1 = 0;
  let recallAt3 = 0;
  let directAt3 = 0;
  let supportedN = 0;
  let unsupN = 0;
  let unsupFalseServe = 0;
  const unsupFalseServeIds: string[] = [];
  let supportedEmpty = 0;
  const supportedEmptyIds: string[] = [];
  const packetSizes: number[] = [];
  let pAt5Sum = 0;
  let pAt1Sum = 0;
  const eligibilityViolations: Array<{ promptId: string; claimId: string; reason: string }> = [];
  let vetoConflictsServed = 0;
  const vetoConflictIds: string[] = [];
  let penaltyConflictsServed = 0;
  let hnServedUndetected = 0;
  const hnUndetectedIds: string[] = [];
  let hnServedTotal = 0;
  let nearDupePackets = 0;
  const nearDupeIds: string[] = [];
  const maxPairSims: number[] = [];
  let servedWithLinks = 0;
  let servedTotal = 0;
  const twinServed: string[] = [];

  for (const [id, p] of byId) {
    const diag = diagById.get(id);
    const pool = poolById.get(id);
    if (!diag || !pool) continue;
    const served = diag.served ?? [];
    const q = p.context ? `${p.context} ${p.prompt}` : p.prompt;
    const isUnsup = Boolean(p.noClaimExpected) || detectUnsupportedTopic(p.prompt) !== null;
    if (isUnsup) {
      unsupN += 1;
      if (served.length > 0) {
        unsupFalseServe += 1;
        unsupFalseServeIds.push(id);
      }
      continue;
    }
    const expected = p.expectedClaimIds ?? [];
    if (expected.length === 0) continue;
    supportedN += 1;
    const poolIds = new Set(pool.map((c) => String(c.claimId)));
    const servedIds = served.map((s) => s.claimId);
    const servedSet = new Set(servedIds);
    const poolHit = expected.filter((e) => poolIds.has(e)).length;
    poolRecalls.push(poolHit / expected.length);
    const servedHit = expected.filter((e) => servedSet.has(e)).length;
    servedRecalls.push(servedHit / expected.length);
    if (expected.some((e) => servedIds[0] === e)) recallAt1 += 1;
    const top3 = new Set(servedIds.slice(0, 3));
    if (expected.some((e) => top3.has(e))) recallAt3 += 1;
    if (top3.has(expected[0])) directAt3 += 1;
    if (served.length === 0) {
      supportedEmpty += 1;
      supportedEmptyIds.push(id);
    }
    packetSizes.push(served.length);
    const denom5 = Math.max(1, Math.min(5, served.length));
    pAt5Sum += servedIds.slice(0, 5).filter((s) => expected.includes(s)).length / denom5;
    pAt1Sum += servedIds.length > 0 && expected.includes(servedIds[0]) ? 1 : 0;

    const hardNegatives = new Set(p.hardNegativeClaimIds ?? []);
    const poolRowById = new Map(pool.map((c) => [String(c.claimId), c]));
    // Eligibility + qualifier-conflict audit over the served packet.
    for (const sid of servedIds) {
      servedTotal += 1;
      if (cardLinks && (cardLinks[sid] ?? 0) > 0) servedWithLinks += 1;
      const row = poolRowById.get(sid);
      if (row) {
        const violation = eligibilityRecheck({
          reviewStatus: row.reviewStatus as "approved",
          contentSource: row.contentSource as "verified",
          approvalMethod: row.approvalMethod as "human_review",
          trustTier: row.trustTier as "A",
        });
        if (violation) eligibilityViolations.push({ promptId: id, claimId: sid, reason: violation });
        const cmp = compareQualifiers(
          q,
          String(row.claimText ?? ""),
          typeof row.predicate === "string" ? row.predicate : null
        );
        const veto = qualifierVeto(cmp);
        if (veto) {
          vetoConflictsServed += 1;
          vetoConflictIds.push(`${id}:${sid}:${veto}`);
        } else if (qualifierPenaltyDimensions(cmp).length > 0) {
          penaltyConflictsServed += 1;
        }
        if (hardNegatives.has(sid)) {
          hnServedTotal += 1;
          const anyConflict = (Object.values(cmp) as Array<{ state: string }>).some(
            (r) => r.state === "conflict"
          );
          if (!anyConflict) {
            hnServedUndetected += 1;
            hnUndetectedIds.push(`${id}:${sid}`);
          }
        }
      }
    }
    // Near-duplicate packet check over served claim texts.
    const texts = servedIds.map((sid) => String(poolRowById.get(sid)?.claimText ?? ""));
    const toks = texts.map(tokens);
    let maxSim = 0;
    let dupe = false;
    for (let i = 0; i < toks.length; i += 1) {
      for (let j = i + 1; j < toks.length; j += 1) {
        const sim = jaccard(toks[i], toks[j]);
        if (sim > maxSim) maxSim = sim;
        if (sim >= NEAR_DUPE_JACCARD) dupe = true;
      }
    }
    if (toks.length >= 2) maxPairSims.push(maxSim);
    if (dupe) {
      nearDupePackets += 1;
      nearDupeIds.push(id);
    }
    if ((diag.misses ?? []).some((m) => m.detail.startsWith("identical_twin_selected") || m.detail.startsWith("content_served_as_twin"))) {
      twinServed.push(id);
    }
  }

  const report = {
    version: CLAIMS_METRICS_VERSION,
    diagVersion: DIAG.summary.version ?? null,
    rerankVersion: DIAG.summary.rerankVersion ?? null,
    cardLinksAvailable: cardLinks !== null,
    n: supportedN + unsupN,
    supportedN,
    unsupportedN: unsupN,
    poolRecall: r4(mean(poolRecalls)),
    servedRecall: r4(mean(servedRecalls)),
    recallAt1: r4(supportedN ? recallAt1 / supportedN : 0),
    recallAt3: r4(supportedN ? recallAt3 / supportedN : 0),
    directAnswerRecallAt3: r4(supportedN ? directAt3 / supportedN : 0),
    unsupportedFalseServe: unsupFalseServe,
    unsupportedFalseServeRate: r4(unsupN ? unsupFalseServe / unsupN : 0),
    unsupportedFalseServeIds: unsupFalseServeIds,
    supportedEmpty,
    supportedEmptyRate: r4(supportedN ? supportedEmpty / supportedN : 0),
    supportedEmptyIds,
    meanPacketSize: r4(mean(packetSizes)),
    maxPacketSize: packetSizes.length ? Math.max(...packetSizes) : 0,
    eligibilityViolations: eligibilityViolations.length,
    eligibilityViolationList: eligibilityViolations,
    vetoConflictsServed,
    vetoConflictList: vetoConflictIds,
    penaltyConflictsServed,
    hardNegativesServed: hnServedTotal,
    hardNegativesServedUndetected: hnServedUndetected,
    hardNegativeUndetectedList: hnUndetectedIds,
    exactCardLinkYield: cardLinks ? r4(servedTotal ? servedWithLinks / servedTotal : 0) : null,
    exactCardLinkServed: cardLinks ? servedWithLinks : null,
    exactCardLinkServedTotal: cardLinks ? servedTotal : null,
    nearDupePacketRate: r4(supportedN ? nearDupePackets / supportedN : 0),
    nearDupePackets,
    nearDupeIds,
    meanMaxPairSim: r4(mean(maxPairSims)),
    twinServedCount: twinServed.length,
    twinServedIds: twinServed,
    pAt5Secondary: r4(supportedN ? pAt5Sum / supportedN : 0),
    pAt1Secondary: r4(supportedN ? pAt1Sum / supportedN : 0),
    missClasses: DIAG.summary.missClasses ?? {},
    leakClasses: DIAG.summary.leakClasses ?? {},
  };
  console.log(JSON.stringify(report, null, 1));
}

main();
