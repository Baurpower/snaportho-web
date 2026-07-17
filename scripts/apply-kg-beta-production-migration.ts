import { readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

import { resolveOperatorDatabaseUrl } from "../src/lib/datastore/connection-url.ts";
import { requireStaging } from "./lib/education/kg-staging-guard.ts";

const releaseId = "kg-beta-20260716-002";
if (process.env.KG_PRODUCTION_CONFIRM !== releaseId) {
  throw new Error(`Set KG_PRODUCTION_CONFIRM=${releaseId} to apply the scoped production overlay migration`);
}
const guard = requireStaging("beta production release overlay migration");
const migrationPath = path.join(process.cwd(), "supabase", "migrations", "20260716_040000_kg_beta_production_release.sql");
const client = new pg.Client({ connectionString: resolveOperatorDatabaseUrl().url, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(readFileSync(migrationPath, "utf8"));
  const verification = await client.query(`
    select
      to_regclass('public.kg_production_releases') is not null as releases_table,
      to_regclass('public.kg_production_neighborhoods') is not null as neighborhoods_table,
      to_regclass('public.kg_production_objects') is not null as objects_table,
      to_regclass('public.kg_production_neighborhood_objects') is not null as neighborhood_objects_table,
      to_regclass('public.kg_production_exclusions') is not null as exclusions_table,
      to_regclass('public.kg_graph_feedback_events') is not null as feedback_table,
      to_regclass('public.kg_graph_feedback_signals') is not null as feedback_signals_table,
      to_regprocedure('public.get_kg_production_neighborhood(text)') is not null as neighborhood_query,
      to_regprocedure('public.find_kg_production_topics(text,integer)') is not null as topic_query
  `);
  if (!Object.values(verification.rows[0]).every(Boolean)) throw new Error(`Migration verification failed: ${JSON.stringify(verification.rows[0])}`);
  console.log(JSON.stringify({ ok: true, releaseId, guard, migration: path.relative(process.cwd(), migrationPath), ...verification.rows[0] }, null, 2));
} finally {
  await client.end();
}
