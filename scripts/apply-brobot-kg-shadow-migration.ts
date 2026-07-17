import { readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

import { resolveOperatorDatabaseUrl } from "../src/lib/datastore/connection-url.ts";

const releaseId = "kg-beta-20260716-002";
const confirmation = process.env.BROBOT_KG_SHADOW_PRODUCTION_CONFIRM;
if (confirmation !== releaseId) {
  throw new Error(
    `Set BROBOT_KG_SHADOW_PRODUCTION_CONFIRM=${releaseId} to apply the additive shadow migration`
  );
}

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260716_150000_brobot_kg_shadow_retrieval.sql"
);
const connection = resolveOperatorDatabaseUrl();
if (connection.provider !== "supabase") {
  throw new Error(`Refusing non-Supabase migration target (provider=${connection.provider})`);
}

const client = new pg.Client({
  connectionString: connection.url,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  const activeRelease = await client.query(
    `select release_id, status, publication_status, manifest_hash
     from public.kg_production_releases where release_id = $1`,
    [releaseId]
  );
  if (
    activeRelease.rowCount !== 1 ||
    !["active", "partially_active"].includes(activeRelease.rows[0].status) ||
    !["beta_active", "reviewed_active"].includes(activeRelease.rows[0].publication_status)
  ) {
    throw new Error(`Pinned release is not active: ${JSON.stringify(activeRelease.rows[0] ?? null)}`);
  }
  const releaseBefore = activeRelease.rows[0];
  const canonicalBefore = await client.query(`
    select
      (select count(*)::int from public.canonical_entities) entity_count,
      (select count(*)::int from public.canonical_relationships) relationship_count,
      (select count(*)::int from public.educational_claims) claim_count,
      (select count(*)::int from public.decision_points) decision_point_count
  `);

  await client.query(readFileSync(migrationPath, "utf8"));

  const verification = await client.query(`
    select
      to_regclass('public.brobot_kg_retrieval_events') is not null events_table,
      to_regclass('public.brobot_kg_growth_queue') is not null growth_table,
      to_regprocedure('public.retrieve_brobot_kg_shadow(text,text,text[],text[],text[],integer,integer,integer,integer)') is not null retrieval_rpc,
      to_regprocedure('public.aggregate_brobot_kg_gap_event()') is not null aggregate_function,
      exists (
        select 1 from pg_trigger
        where tgrelid = 'public.brobot_kg_retrieval_events'::regclass
          and tgname = 'aggregate_brobot_kg_gap_event' and not tgisinternal
      ) aggregate_trigger,
      (select relrowsecurity from pg_class where oid = 'public.brobot_kg_retrieval_events'::regclass) events_rls,
      (select relrowsecurity from pg_class where oid = 'public.brobot_kg_growth_queue'::regclass) growth_rls
  `);
  if (!Object.values(verification.rows[0]).every(Boolean)) {
    throw new Error(`Migration verification failed: ${JSON.stringify(verification.rows[0])}`);
  }

  const rpcDefinition = await client.query(`
    select p.provolatile, pg_get_functiondef(p.oid) definition
    from pg_proc p
    where p.oid = 'public.retrieve_brobot_kg_shadow(text,text,text[],text[],text[],integer,integer,integer,integer)'::regprocedure
  `);
  if (rpcDefinition.rows[0]?.provolatile !== "s") throw new Error("Retrieval RPC is not STABLE");
  if (/\b(insert|update|delete|merge|truncate)\b/i.test(rpcDefinition.rows[0]?.definition ?? "")) {
    throw new Error("Retrieval RPC definition contains a mutation keyword");
  }

  const testRequestId = crypto.randomUUID();
  const testRetrievalId = crypto.randomUUID();
  const testConcept = `shadow-production-validation-${testRequestId}`;
  await client.query(
    `insert into public.brobot_kg_retrieval_events (
       request_id,retrieval_id,query_hash,normalized_concept,mode,subintent,release_id,
       retrieval_status,trigger_reasons,candidate_count,cache_status,stage_timings_ms,
       retrieval_latency_ms,packet_token_estimate,policy_version,packet_schema_version,gap_signals
     ) values ($1,$2,$3,$4,'general','overview',$5,'miss',array['production_validation'],0,
       'miss','{}'::jsonb,1,0,'brobot-kg-shadow-v1','brobot-kg-packet-v1',$6::jsonb)`,
    [
      testRequestId,
      testRetrievalId,
      testRequestId.replaceAll("-", ""),
      testConcept,
      releaseId,
      JSON.stringify([
        {
          gapType: "missing_entity",
          normalizedConcept: testConcept,
          confidence: 0.99,
          reasons: ["production_validation"],
        },
      ]),
    ]
  );
  const growth = await client.query(
    `select id,total_query_count,gap_type,normalized_concept
     from public.brobot_kg_growth_queue where normalized_concept = $1`,
    [testConcept]
  );
  if (growth.rowCount !== 1 || growth.rows[0].gap_type !== "missing_entity") {
    throw new Error(`Growth trigger verification failed: ${JSON.stringify(growth.rows)}`);
  }
  await client.query(`delete from public.brobot_kg_growth_queue where normalized_concept = $1`, [testConcept]);
  await client.query(`delete from public.brobot_kg_retrieval_events where request_id = $1`, [testRequestId]);

  const canonicalAfter = await client.query(`
    select
      (select count(*)::int from public.canonical_entities) entity_count,
      (select count(*)::int from public.canonical_relationships) relationship_count,
      (select count(*)::int from public.educational_claims) claim_count,
      (select count(*)::int from public.decision_points) decision_point_count
  `);
  const releaseAfter = await client.query(
    `select release_id, status, publication_status, manifest_hash
     from public.kg_production_releases where release_id = $1`,
    [releaseId]
  );
  if (JSON.stringify(canonicalBefore.rows[0]) !== JSON.stringify(canonicalAfter.rows[0])) {
    throw new Error("Canonical KG counts changed during shadow migration verification");
  }
  if (JSON.stringify(releaseBefore) !== JSON.stringify(releaseAfter.rows[0])) {
    throw new Error("Pinned release changed during shadow migration verification");
  }

  console.log(JSON.stringify({
    ok: true,
    releaseId,
    target: { provider: connection.provider, host: connection.host, source: connection.source },
    migration: path.relative(process.cwd(), migrationPath),
    verification: verification.rows[0],
    rpcStable: true,
    growthTriggerTest: "passed_and_cleaned_up",
    canonicalCountsUnchanged: true,
    releaseUnchanged: true,
  }, null, 2));
} finally {
  await client.end();
}
