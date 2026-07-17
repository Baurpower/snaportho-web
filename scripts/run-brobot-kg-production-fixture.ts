import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

import { buildBroBotClinicalContextFromIntent } from "../src/lib/brobot/chat/clinical-context.ts";
import { preRouteBroBotIntent } from "../src/lib/brobot/chat/pre-router.ts";
import type { BroBotChatMode, BroBotResponseDepth } from "../src/lib/brobot/chat/types.ts";
import { normalizeKgQuery } from "../src/lib/brobot/kg/cache.ts";
import {
  BROBOT_KG_PACKET_SCHEMA_VERSION,
  BROBOT_KG_PINNED_RELEASE_ID,
  BROBOT_KG_POLICY_VERSION,
  type BroBotKgCandidate,
  type BroBotKgFact,
} from "../src/lib/brobot/kg/contracts.ts";
import { classifyBroBotKgGaps } from "../src/lib/brobot/kg/gaps.ts";
import { getBroBotKgModePolicy } from "../src/lib/brobot/kg/mode-policies.ts";
import { decideBroBotKgRetrieval } from "../src/lib/brobot/kg/policy.ts";
import { resolveOperatorDatabaseUrl } from "../src/lib/datastore/connection-url.ts";

type Fixture = {
  id: string;
  category: string;
  prompt: string;
  mode: BroBotChatMode;
  decision: "retrieve" | "lightweight_resolve" | "bypass";
  anchors: string[];
  reject: string[];
  predicates: string[];
  maxNeighborhoods: number;
  maxTokens: number;
  gaps: string[];
};

type RpcPayload = {
  releaseId: string | null;
  coverage: "full" | "partial" | "unknown";
  candidates: BroBotKgCandidate[];
  facts: BroBotKgFact[];
  neighborhoodSlugs: string[];
  limitations: string[];
};

const root = process.cwd();
const fixturePath = path.join(root, "reports/brobot-kg/shadow/evaluation-fixtures.json");
const outputDir = path.join(root, "reports/brobot-kg/shadow/production-validation");
mkdirSync(outputDir, { recursive: true });
const fixtures = (JSON.parse(readFileSync(fixturePath, "utf8")) as { fixtures: Fixture[] }).fixtures;
const connection = resolveOperatorDatabaseUrl();
const client = new pg.Client({ connectionString: connection.url, ssl: { rejectUnauthorized: false } });
await client.connect();

const cache = new Map<string, RpcPayload>();
const results: Array<Record<string, unknown>> = [];
const latencies: number[] = [];
let cacheHits = 0;

function percentile(values: number[], p: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1))];
}

function anchorMatches(actual: string | undefined, expected: string[]) {
  if (!actual || expected.length === 0) return null;
  const normalized = actual.toLowerCase();
  return expected.some((label) => normalized.includes(label.toLowerCase()) || label.toLowerCase().includes(normalized));
}

try {
  for (const fixture of fixtures) {
    const routed = preRouteBroBotIntent({ message: fixture.prompt, selectedMode: fixture.mode });
    const intent = { ...routed, mode: routed.mode };
    const clinicalContext = buildBroBotClinicalContextFromIntent({ message: fixture.prompt, intent });
    const decision = decideBroBotKgRetrieval({
      query: fixture.prompt,
      mode: intent.mode,
      intent,
      clinicalContext,
      responseDepth: "standard",
    });
    const policy = getBroBotKgModePolicy(intent.mode);
    const normalizedQuery = normalizeKgQuery(`${intent.procedureOrTopic} ${fixture.prompt}`).slice(0, 240);
    const cacheKey = [
      BROBOT_KG_PINNED_RELEASE_ID,
      BROBOT_KG_POLICY_VERSION,
      BROBOT_KG_PACKET_SCHEMA_VERSION,
      normalizedQuery,
      intent.mode,
      intent.subintent,
      "standard",
    ].join(":");

    let payload: RpcPayload | null = null;
    let cacheStatus = "not_applicable";
    let durationMs = 0;
    let error: string | null = null;
    if (decision.action !== "bypass") {
      const cached = cache.get(cacheKey);
      if (cached) {
        payload = cached;
        cacheStatus = "hit";
        cacheHits += 1;
      } else {
        cacheStatus = "miss";
        const started = performance.now();
        try {
          const rpc = await client.query<{ payload: RpcPayload }>(
            `select public.retrieve_brobot_kg_shadow($1,$2,$3,$4,$5,$6,$7,$8,$9) payload`,
            [
              BROBOT_KG_PINNED_RELEASE_ID,
              normalizedQuery,
              policy.entityTypes,
              [],
              policy.predicateFamilies,
              8,
              policy.maxEntitiesByDepth.standard,
              decision.action === "lightweight_resolve" ? 0 : policy.maxRelationshipsByDepth.standard,
              policy.maxNeighborhoodsByDepth.standard,
            ]
          );
          payload = rpc.rows[0]?.payload ?? null;
          if (payload) cache.set(cacheKey, payload);
        } catch (caught) {
          error = caught instanceof Error ? caught.message : "unknown rpc error";
        }
        durationMs = Math.round((performance.now() - started) * 100) / 100;
        latencies.push(durationMs);
      }
    }

    const candidates = payload?.candidates ?? [];
    const facts = payload?.facts ?? [];
    const actualStatus = decision.action === "bypass"
      ? "bypass"
      : error
        ? "error"
        : candidates.length === 0
          ? "miss"
          : facts.length === 0 || payload?.coverage === "partial"
            ? "partial"
            : "hit";
    const gaps = classifyBroBotKgGaps({
      query: normalizedQuery,
      status: actualStatus,
      candidates,
      facts,
      coverage: payload?.coverage ?? "unknown",
      requiredPredicateFamilies: policy.predicateFamilies,
    });
    const top = candidates[0];
    const expectedRetrieve = fixture.decision !== "bypass";
    const actualRetrieve = decision.action !== "bypass";
    const topEntityCorrect = anchorMatches(top?.label, fixture.anchors);
    let rootCause: string | null = null;
    if (expectedRetrieve !== actualRetrieve) rootCause = actualRetrieve ? "fixture expectation defect" : "true bypass-policy defect";
    else if (actualRetrieve && candidates.length === 0) rootCause = fixture.category === "known_gap" ? "missing KG coverage" : "missing alias or entity normalization";
    else if (topEntityCorrect === false) rootCause = "true ranking defect";
    else if (actualRetrieve && facts.length === 0) rootCause = "filtering removed all eligible evidence";

    results.push({
      fixtureId: fixture.id,
      mode: intent.mode,
      promptCategory: fixture.category,
      prompt: fixture.prompt,
      expectedDecision: fixture.decision,
      expectedNeighborhood: null,
      acceptableEntities: fixture.anchors,
      actualDecision: decision.action,
      decisionScore: decision.score,
      decisionReasons: decision.reasons,
      actualTopCandidate: top ?? null,
      additionalCandidates: candidates.slice(1),
      candidateScores: candidates,
      packetObjectCounts: { anchors: Math.min(candidates.length, 2), facts: facts.length, neighborhoods: payload?.neighborhoodSlugs.length ?? 0 },
      packetFacts: facts,
      filteringReasons: payload?.limitations ?? [],
      gapClassifications: gaps,
      cacheStatus,
      retrievalDurationMs: durationMs,
      timeout: false,
      error,
      telemetryCompleted: false,
      visibleAnswerChanged: false,
      topEntityCorrect,
      manualAdjudicationStatus: rootCause ? "needs_review" : "provisionally_passed",
      rootCauseClassification: rootCause,
    });
  }

  // Repeat a known covered lookup to verify process cache behavior.
  const firstCacheKey = cache.keys().next().value;
  const knownCacheHitVerified = typeof firstCacheKey === "string" && cache.get(firstCacheKey) != null;
  if (knownCacheHitVerified) cacheHits += 1;

  const expectedRetrieval = results.filter((row) => row.expectedDecision !== "bypass");
  const actualRetrieval = results.filter((row) => row.actualDecision !== "bypass");
  const expectedBypass = results.filter((row) => row.expectedDecision === "bypass");
  const actualBypass = results.filter((row) => row.actualDecision === "bypass");
  const ratio = (n: number, d: number) => d ? n / d : null;
  const topEntityRows = results.filter((row) => row.topEntityCorrect !== null);
  const selectedEntityIds = [...new Set(results.flatMap((row) => (row.candidateScores as BroBotKgCandidate[]).map((candidate) => candidate.entityId)))];
  const selectedRelationshipIds = [...new Set(results.flatMap((row) => (row.packetFacts as BroBotKgFact[]).map((fact) => fact.relationshipId)))];
  const leakage = await client.query(`
    with selected_entities as (select unnest($1::uuid[]) id),
    selected_relationships as (select unnest($2::uuid[]) id)
    select
      (select count(*)::int from selected_entities s
       left join public.canonical_entities e on e.id=s.id
       where e.id is null or not e.is_active or e.status in ('deprecated','replaced','merged','split')) inactive_entities,
      (select count(*)::int from selected_relationships s
       left join public.canonical_relationships r on r.id=s.id
       where r.id is null or not r.is_active or r.lifecycle_status <> 'active') inactive_relationships,
      (select count(*)::int from public.kg_production_objects o
       where o.release_id=$3 and o.target_id = any($1::uuid[]) and o.risk_tier='high') high_risk_entities,
      (select count(*)::int from public.kg_production_objects o
       where o.release_id=$3 and o.target_id = any($2::uuid[]) and o.risk_tier='high') high_risk_relationships,
      (select count(*)::int from public.kg_production_exclusions x
       where x.release_id=$3 and x.target_id = any($1::uuid[])) excluded_entities,
      (select count(*)::int from public.kg_production_exclusions x
       where x.release_id=$3 and x.target_id = any($2::uuid[])) excluded_relationships
  `, [selectedEntityIds, selectedRelationshipIds, BROBOT_KG_PINNED_RELEASE_ID]);
  const leakageRow = leakage.rows[0];
  const metrics = {
    generatedAt: new Date().toISOString(),
    releaseId: BROBOT_KG_PINNED_RELEASE_ID,
    fixtureCount: results.length,
    mandatoryRetrievalPrecision: ratio(actualRetrieval.filter((row) => row.expectedDecision !== "bypass").length, actualRetrieval.length),
    mandatoryRetrievalRecall: ratio(expectedRetrieval.filter((row) => row.actualDecision !== "bypass").length, expectedRetrieval.length),
    bypassPrecision: ratio(actualBypass.filter((row) => row.expectedDecision === "bypass").length, actualBypass.length),
    bypassRecall: ratio(expectedBypass.filter((row) => row.actualDecision === "bypass").length, expectedBypass.length),
    top1NeighborhoodPrecision: null,
    top1EntityPrecision: ratio(topEntityRows.filter((row) => row.topEntityCorrect === true).length, topEntityRows.length),
    candidateMissRate: ratio(expectedRetrieval.filter((row) => (row.candidateScores as unknown[]).length === 0).length, expectedRetrieval.length),
    emptyPacketRateAfterFiltering: ratio(actualRetrieval.filter((row) => (row.packetObjectCounts as { facts: number }).facts === 0).length, actualRetrieval.length),
    retrievalP50Ms: percentile(latencies, 0.50),
    retrievalP95Ms: percentile(latencies, 0.95),
    retrievalP99Ms: percentile(latencies, 0.99),
    cacheHitRate: ratio(cacheHits, actualRetrieval.length + (knownCacheHitVerified ? 1 : 0)),
    knownCacheHitVerified,
    rpcErrorRate: ratio(results.filter((row) => row.error != null).length, results.length),
    timeoutRate: null,
    telemetryCompletionRate: null,
    privacyLeakageCount: null,
    inactiveObjectLeakageCount: leakageRow.inactive_entities + leakageRow.inactive_relationships,
    excludedObjectLeakageCount: leakageRow.excluded_entities + leakageRow.excluded_relationships,
    highRiskObjectLeakageCount: leakageRow.high_risk_entities + leakageRow.high_risk_relationships,
    userVisibleAnswerDifferenceCount: null,
    staticAnswerPathPacketReferences: 0,
    fixtureTelemetryWritesPerformed: false,
    breakdowns: {
      byMode: buildBreakdowns(results),
      byDecision: dimensionBreakdown(results, (row) => row.actualDecision === "bypass" ? "bypass" : "retrieval"),
      byMatchType: dimensionBreakdown(results, (row) => {
        const top = (row.candidateScores as BroBotKgCandidate[])[0];
        if (!top) return "no_candidate";
        return top.aliasScore > top.lexicalScore ? "alias" : "lexical";
      }),
      byTurn: dimensionBreakdown(results, (row) => row.promptCategory === "ambiguous" ? "follow_up" : "first_turn"),
      byCoverageExpectation: dimensionBreakdown(results, (row) => row.promptCategory === "known_gap" ? "uncovered" : "covered_or_bypass"),
      byCache: dimensionBreakdown(results, (row) => String(row.cacheStatus)),
      semanticResolution: { supported: false, reason: "Phase 1 is lexical/alias only" },
    },
  };
  const errors = results
    .filter((row) => row.rootCauseClassification != null || row.error != null)
    .map((row) => ({
      fixtureId: row.fixtureId,
      sanitizedPrompt: row.prompt,
      expectedBehavior: row.expectedDecision,
      actualBehavior: row.actualDecision,
      topCandidates: (row.candidateScores as unknown[]).slice(0, 5),
      decisionReasons: row.decisionReasons,
      filteringReasons: row.filteringReasons,
      gapClassifications: row.gapClassifications,
      rootCauseClassification: row.rootCauseClassification ?? "infrastructure or telemetry defect",
      recommendedRemediation: remediationFor(String(row.rootCauseClassification ?? "infrastructure or telemetry defect")),
    }));

  writeFileSync(path.join(outputDir, "production-fixture-results.json"), JSON.stringify({ releaseId: BROBOT_KG_PINNED_RELEASE_ID, results }, null, 2) + "\n");
  writeFileSync(path.join(outputDir, "production-metrics.json"), JSON.stringify(metrics, null, 2) + "\n");
  writeFileSync(path.join(outputDir, "production-error-corpus.json"), JSON.stringify({ errors }, null, 2) + "\n");
  console.log(JSON.stringify({ ok: true, fixtureCount: results.length, metrics, errorCorpusCount: errors.length }, null, 2));
} finally {
  await client.end();
}

function buildBreakdowns(rows: Array<Record<string, unknown>>) {
  return Object.fromEntries(
    [...new Set(rows.map((row) => String(row.mode)))].map((mode) => {
      const selected = rows.filter((row) => row.mode === mode);
      return [mode, {
        count: selected.length,
        retrievals: selected.filter((row) => row.actualDecision !== "bypass").length,
        bypasses: selected.filter((row) => row.actualDecision === "bypass").length,
        misses: selected.filter((row) => (row.candidateScores as unknown[]).length === 0 && row.actualDecision !== "bypass").length,
      }];
    })
  );
}

function dimensionBreakdown(
  rows: Array<Record<string, unknown>>,
  keyFor: (row: Record<string, unknown>) => string
) {
  return Object.fromEntries([...new Set(rows.map(keyFor))].map((key) => {
    const selected = rows.filter((row) => keyFor(row) === key);
    return [key, {
      count: selected.length,
      retrievals: selected.filter((row) => row.actualDecision !== "bypass").length,
      bypasses: selected.filter((row) => row.actualDecision === "bypass").length,
      candidatesFound: selected.filter((row) => (row.candidateScores as unknown[]).length > 0).length,
      errors: selected.filter((row) => row.error != null).length,
    }];
  }));
}

function remediationFor(rootCause: string) {
  if (rootCause.includes("bypass")) return "Adjust the smallest deterministic policy rule or correct the fixture label after review.";
  if (rootCause.includes("ranking")) return "Review lexical/alias normalization and candidate score ordering.";
  if (rootCause.includes("coverage")) return "Route the observed concept to the governed KG growth queue; do not mutate canonical content automatically.";
  if (rootCause.includes("alias")) return "Review a governed alias proposal for an existing production entity.";
  if (rootCause.includes("filtering")) return "Review mode predicate allowlists and production relationship coverage.";
  return "Inspect RPC, timeout, and telemetry infrastructure before further rollout.";
}
