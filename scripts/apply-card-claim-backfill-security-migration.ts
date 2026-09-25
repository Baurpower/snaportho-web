import { readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const apply = process.argv.includes("--apply");
if (!apply) throw new Error("pass_--apply_to_deploy_card_claim_backfill_security_migration");

const envPath = path.join(process.cwd(), ".env.local");
const env = Object.fromEntries(readFileSync(envPath, "utf8").split(/\r?\n/)
  .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
  .map((line) => {
    const at = line.indexOf("=");
    return [line.slice(0, at).trim(), line.slice(at + 1).trim().replace(/^['"]|['"]$/g, "")];
  }));
const databaseUrl = process.env.DATABASE_URL ?? env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL_required");

const migration = path.join(process.cwd(), "supabase/migrations/20260923_120000_card_claim_backfill.sql");
const db = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false }, application_name: "card_claim_backfill_security_migration" });
await db.connect();
try {
  await db.query(readFileSync(migration, "utf8"));
  const result = await db.query(`
    select c.relname, c.relrowsecurity, c.relforcerowsecurity,
      has_table_privilege('anon', c.oid, 'select') as anon_select,
      has_table_privilege('authenticated', c.oid, 'select') as authenticated_select
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in ('card_claim_backfill_runs', 'card_claim_backfill_items')
    order by c.relname
  `);
  if (result.rows.length !== 2 || result.rows.some((row) => !row.relrowsecurity || !row.relforcerowsecurity || row.anon_select || row.authenticated_select)) {
    throw new Error("card_claim_backfill_security_verification_failed");
  }
  console.log(JSON.stringify({ migration, verified: result.rows }, null, 2));
} finally {
  await db.end();
}
