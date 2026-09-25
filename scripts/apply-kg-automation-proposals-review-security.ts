import { readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

import { requireStaging } from "./lib/education/kg-staging-guard.ts";

if (!process.argv.includes("--apply")) throw new Error("pass_--apply_to_apply_review_proposal_security_migration");
const guard = requireStaging("secure KG review-proposal imports");
const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).flatMap((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return [];
  const index = trimmed.indexOf("=");
  return [[trimmed.slice(0, index).trim(), trimmed.slice(index + 1).trim().replace(/^['\"]|['\"]$/g, "")]];
}));
if (!env.DATABASE_URL) throw new Error("DATABASE_URL required");
const sql = readFileSync(path.join("supabase", "migrations", "20260924_120000_kg_automation_proposals_review_security.sql"), "utf8");
const db = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false }, application_name: "kg_review_proposal_security" });
await db.connect();
try {
  await db.query("begin");
  await db.query(sql);
  const verification = await db.query(`
    select c.relrowsecurity, c.relforcerowsecurity,
      has_table_privilege('anon', c.oid, 'insert') as anon_insert,
      has_table_privilege('authenticated', c.oid, 'insert') as authenticated_insert,
      has_table_privilege('service_role', c.oid, 'insert') as service_insert
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'kg_automation_proposals'
  `);
  const row = verification.rows[0];
  if (!row?.relrowsecurity || !row.relforcerowsecurity || row.anon_insert || row.authenticated_insert || !row.service_insert) {
    throw new Error(`review_proposal_security_verification_failed:${JSON.stringify(row)}`);
  }
  await db.query("commit");
  console.log(JSON.stringify({ applied: true, guard, verification: row }, null, 2));
} catch (error) {
  await db.query("rollback").catch(() => undefined);
  throw error;
} finally {
  await db.end();
}
