import { existsSync, readFileSync } from "node:fs";
import pg from "pg";

function envFile(file: string): Record<string, string> {
  if (!existsSync(file)) return {};
  return Object.fromEntries(readFileSync(file, "utf8").split(/\r?\n/).flatMap((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return [];
    const index = trimmed.indexOf("=");
    return [[trimmed.slice(0, index).trim(), trimmed.slice(index + 1).trim().replace(/^['\"]|['\"]$/g, "")]];
  }));
}

const env = { ...envFile(".env.local"), ...process.env };
if (!env.DATABASE_URL) throw new Error("DATABASE_URL required");
const runId = process.argv.find((argument) => argument.startsWith("--run-id="))?.slice("--run-id=".length);
const db = new pg.Client({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  application_name: "card_claim_review_readiness",
});

await db.connect();
try {
  await db.query("begin read only");
  const tables = await db.query(`
    select c.relname, c.relrowsecurity, c.relforcerowsecurity,
      has_table_privilege('service_role', c.oid, 'insert') as service_insert,
      has_table_privilege('anon', c.oid, 'insert') as anon_insert,
      has_table_privilege('authenticated', c.oid, 'insert') as authenticated_insert
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('kg_automation_proposals', 'canonical_entities')
    order by c.relname
  `);
  const counts = await db.query(`
    select
      (select count(*) from public.kg_automation_proposals where is_active) as active_proposals,
      (select count(*) from public.canonical_entities) as canonical_entities
  `);
  const imported = runId
    ? await db.query(`
      select count(*)::int as count,
        count(*) filter (where review_status = 'needs_review')::int as needs_review,
        count(*) filter (where proposal_type = 'create_canonical_entity')::int as create_candidates,
        count(*) filter (where proposal_type = 'add_entity_alias')::int as alias_candidates
      from public.kg_automation_proposals
      where is_active and metadata->>'card_claim_review_run_id' = $1
    `, [runId])
    : null;
  if (tables.rows.length !== 2) throw new Error("required_review_or_canonical_table_missing");
  const review = tables.rows.find((row) => row.relname === "kg_automation_proposals");
  if (!review?.service_insert || review.anon_insert || review.authenticated_insert) {
    throw new Error(`review_proposal_access_control_not_ready:${JSON.stringify(review)}`);
  }
  console.log(JSON.stringify({ verified: true, tables: tables.rows, counts: counts.rows[0], ...(imported ? { imported: imported.rows[0] } : {}) }, null, 2));
} finally {
  await db.query("rollback").catch(() => undefined);
  await db.end();
}
