import pg from "pg";

import { resolveOperatorDatabaseUrl } from "../src/lib/datastore/connection-url.ts";

const releaseId = "kg-beta-20260716-002";
const gapTypes = [
  "missing_neighborhood",
  "missing_entity",
  "weak_candidate_ranking",
  "empty_packet_after_filtering",
  "partial_neighborhood_coverage",
  "missing_predicate_family",
  "missing_claim",
  "missing_decision_point",
] as const;
const runId = crypto.randomUUID();
const conceptPrefix = `shadow-growth-validation-${runId}`;
const connection = resolveOperatorDatabaseUrl();
const client = new pg.Client({ connectionString: connection.url, ssl: { rejectUnauthorized: false } });
await client.connect();

const canonicalBefore = await client.query(`
  select
    (select count(*)::int from public.canonical_entities) entities,
    (select count(*)::int from public.canonical_relationships) relationships,
    (select count(*)::int from public.educational_claims) claims,
    (select count(*)::int from public.decision_points) decision_points,
    (select count(*)::int from public.kg_automation_proposals) proposals
`);

try {
  for (const [index, gapType] of gapTypes.entries()) {
    const concept = `${conceptPrefix}-${gapType}`;
    const repetitions = gapType === "missing_entity" ? 2 : 1;
    for (let repetition = 0; repetition < repetitions; repetition += 1) {
      await client.query(
        `insert into public.brobot_kg_retrieval_events (
          request_id,retrieval_id,query_hash,normalized_concept,mode,subintent,release_id,
          retrieval_status,trigger_reasons,candidate_count,cache_status,stage_timings_ms,
          retrieval_latency_ms,packet_token_estimate,policy_version,packet_schema_version,gap_signals
        ) values ($1,$2,$3,$4,$5,'overview',$6,'miss',array['growth_validation'],0,
          'miss','{}'::jsonb,1,0,'brobot-kg-shadow-v1','brobot-kg-packet-v1',$7::jsonb)`,
        [
          crypto.randomUUID(),
          crypto.randomUUID(),
          `${runId.replaceAll("-", "")}${index}${repetition}`,
          concept,
          index % 2 ? "oite" : "or_prep",
          releaseId,
          JSON.stringify([{
            gapType,
            normalizedConcept: concept,
            candidateEntityId: null,
            candidateNeighborhood: `validation-neighborhood-${index}`,
            confidence: 0.91,
            reasons: ["controlled_production_validation"],
          }]),
        ]
      );
    }
  }

  const queue = await client.query(
    `select normalized_concept,gap_type,total_query_count,gap_confidence_component,
            candidate_neighborhood,proposed_repair_type,example_sanitized_queries
     from public.brobot_kg_growth_queue
     where normalized_concept like $1
     order by gap_type`,
    [`${conceptPrefix}%`]
  );
  if (queue.rowCount !== gapTypes.length) {
    throw new Error(`Expected ${gapTypes.length} queue rows, got ${queue.rowCount}`);
  }
  const repeated = queue.rows.find((row) => row.gap_type === "missing_entity");
  if (repeated?.total_query_count !== 2) {
    throw new Error(`Repeated signal did not aggregate: ${JSON.stringify(repeated)}`);
  }
  if (queue.rows.some((row) => row.example_sanitized_queries.length !== 0)) {
    throw new Error("Validation unexpectedly retained sanitized query text");
  }

  const canonicalAfter = await client.query(`
    select
      (select count(*)::int from public.canonical_entities) entities,
      (select count(*)::int from public.canonical_relationships) relationships,
      (select count(*)::int from public.educational_claims) claims,
      (select count(*)::int from public.decision_points) decision_points,
      (select count(*)::int from public.kg_automation_proposals) proposals
  `);
  if (JSON.stringify(canonicalBefore.rows[0]) !== JSON.stringify(canonicalAfter.rows[0])) {
    throw new Error("Canonical, claim, decision-point, or proposal counts changed");
  }

  console.log(JSON.stringify({
    ok: true,
    releaseId,
    gapTypesValidated: queue.rows.map((row) => row.gap_type),
    duplicateAggregation: { gapType: "missing_entity", totalQueryCount: repeated.total_query_count },
    retainedFields: queue.rows.map((row) => ({
      gapType: row.gap_type,
      normalizedConceptPresent: Boolean(row.normalized_concept),
      neighborhoodPresent: Boolean(row.candidate_neighborhood),
      confidence: row.gap_confidence_component,
      proposedRepairType: row.proposed_repair_type,
    })),
    sanitizedQueriesRetained: 0,
    canonicalAndProposalCountsUnchanged: true,
  }, null, 2));
} finally {
  await client.query(`delete from public.brobot_kg_growth_queue where normalized_concept like $1`, [`${conceptPrefix}%`]);
  await client.query(`delete from public.brobot_kg_retrieval_events where normalized_concept like $1`, [`${conceptPrefix}%`]);
  await client.end();
}
