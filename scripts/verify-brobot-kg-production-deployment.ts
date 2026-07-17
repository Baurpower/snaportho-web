import pg from "pg";

import { resolveOperatorDatabaseUrl } from "../src/lib/datastore/connection-url.ts";

const releaseId = "kg-beta-20260716-002";
const connection = resolveOperatorDatabaseUrl();
const client = new pg.Client({ connectionString: connection.url, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  const release = await client.query(
    `select release_id,status,publication_status,review_tier from public.kg_production_releases where release_id=$1`,
    [releaseId]
  );
  const rpc = await client.query(`
    select pg_get_function_arguments(p.oid) arguments,
           p.provolatile,
           has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_execute,
           has_function_privilege('service_role',p.oid,'EXECUTE') service_execute,
           has_function_privilege('anon',p.oid,'EXECUTE') anon_execute
    from pg_proc p
    where p.oid='public.retrieve_brobot_kg_shadow(text,text,text[],text[],text[],integer,integer,integer,integer)'::regprocedure
  `);
  const tables = await client.query(`
    select c.relname table_name,c.relrowsecurity rls,
           has_table_privilege('authenticated',c.oid,'SELECT') authenticated_select,
           has_table_privilege('authenticated',c.oid,'INSERT') authenticated_insert,
           has_table_privilege('service_role',c.oid,'SELECT') service_select,
           has_table_privilege('service_role',c.oid,'INSERT') service_insert
    from pg_class c
    where c.oid in ('public.brobot_kg_retrieval_events'::regclass,'public.brobot_kg_growth_queue'::regclass)
    order by c.relname
  `);
  const policies = await client.query(`
    select tablename,policyname,roles,cmd from pg_policies
    where schemaname='public' and tablename in ('brobot_kg_retrieval_events','brobot_kg_growth_queue')
    order by tablename,policyname
  `);
  const indexes = await client.query(`
    select tablename,indexname from pg_indexes
    where schemaname='public' and tablename in ('brobot_kg_retrieval_events','brobot_kg_growth_queue')
    order by tablename,indexname
  `);
  const trigger = await client.query(`
    select tgname, tgenabled from pg_trigger
    where tgrelid='public.brobot_kg_retrieval_events'::regclass and not tgisinternal
    order by tgname
  `);
  const wrongRelease = await client.query<{ payload: Record<string, unknown> }>(
    `select public.retrieve_brobot_kg_shadow('not-the-pinned-release','ankle fracture','{}','{}','{}',8,8,10,2) payload`
  );
  console.log(JSON.stringify({
    release: release.rows[0] ?? null,
    rpc: rpc.rows[0] ?? null,
    tables: tables.rows,
    policies: policies.rows,
    indexes: indexes.rows,
    triggers: trigger.rows,
    wrongReleaseReturnedObjects:
      Array.isArray(wrongRelease.rows[0]?.payload?.candidates) &&
      (wrongRelease.rows[0].payload.candidates as unknown[]).length > 0,
  }, null, 2));
} finally {
  await client.end();
}
