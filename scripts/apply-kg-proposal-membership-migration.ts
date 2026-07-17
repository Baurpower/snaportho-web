import { readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

import { resolveOperatorDatabaseUrl } from "../src/lib/datastore/connection-url.ts";
import { requireStaging } from "./lib/education/kg-staging-guard.ts";

const guard = requireStaging("proposal batch membership migration");
const migrationPath = path.join(process.cwd(), "supabase/migrations/20260715_120000_kg_proposal_batch_memberships.sql");
const client = new pg.Client({ connectionString: resolveOperatorDatabaseUrl().url, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query("begin");
  await client.query(readFileSync(migrationPath, "utf8"));
  const verification = await client.query(`
    select
      (select count(*)::int from public.kg_automation_proposals where is_active) as active_proposals,
      (select count(*)::int from public.kg_proposal_batch_memberships) as memberships,
      (select count(*)::int from public.kg_automation_proposals p where p.is_active and not exists (select 1 from public.kg_proposal_batch_memberships m where m.proposal_id = p.id)) as active_without_membership,
      (select count(*)::int from public.kg_proposal_batch_memberships m left join public.kg_automation_proposals p on p.id = m.proposal_id where p.id is null) as orphan_memberships,
      (select count(*)::int from (select proposal_id,batch_key,count(*) from public.kg_proposal_batch_memberships group by proposal_id,batch_key having count(*) > 1) d) as duplicate_memberships
  `);
  if (verification.rows[0].active_without_membership !== 0 || verification.rows[0].orphan_memberships !== 0 || verification.rows[0].duplicate_memberships !== 0) throw new Error(`Backfill verification failed: ${JSON.stringify(verification.rows[0])}`);
  await client.query("commit");
  const byBatch = await client.query(`select batch_key, count(*)::int as memberships, count(*) filter (where apply_disposition = 'already_applied')::int as applied, count(*) filter (where apply_disposition = 'pending')::int as approved_unapplied from public.kg_proposal_batch_memberships group by batch_key order by count(*) desc, batch_key`);
  console.log(JSON.stringify({ ok: true, guard, migrationPath, ...verification.rows[0], byBatch: byBatch.rows }, null, 2));
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
