import { readFileSync } from "node:fs";
import pg from "pg";

import { requireStaging } from "./lib/education/kg-staging-guard.ts";

function requiredArg(name: string) {
  const value = process.argv.find((argument) => argument.startsWith(`${name}=`))?.slice(name.length + 1);
  if (!value) throw new Error(`missing_required_argument:${name}`);
  return value;
}

function envFile(file: string): Record<string, string> {
  return Object.fromEntries(readFileSync(file, "utf8").split(/\r?\n/).flatMap((line) => {
    const value = line.trim();
    const index = value.indexOf("=");
    if (!value || value.startsWith("#") || index < 0) return [];
    return [[value.slice(0, index).trim(), value.slice(index + 1).trim().replace(/^['\"]|['\"]$/g, "")]];
  }));
}

if (process.argv.find((argument) => argument === "--confirm=SUPERSEDE_CARD_CLAIM_REVIEW_RUN") === undefined) {
  throw new Error("pass_--confirm=SUPERSEDE_CARD_CLAIM_REVIEW_RUN");
}

const oldRunId = requiredArg("--old-run-id");
const replacementRunId = requiredArg("--replacement-run-id");
if (oldRunId === replacementRunId) throw new Error("replacement_run_id_must_differ");
const guard = requireStaging("supersede stale card-claim ontology review run");
const env = { ...envFile(".env.local"), ...process.env };
if (!env.DATABASE_URL) throw new Error("DATABASE_URL required");

const db = new pg.Client({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  application_name: "card_claim_review_run_supersede",
});
await db.connect();
try {
  await db.query("begin");
  const before = await db.query(`
    select review_status, count(*)::int as count
    from public.kg_automation_proposals
    where is_active and metadata->>'card_claim_review_run_id' = $1
    group by review_status
  `, [oldRunId]);
  const nonReviewable = before.rows.filter((row) => row.review_status !== "needs_review");
  if (nonReviewable.length) throw new Error(`refusing_to_supersede_non_review_rows:${JSON.stringify(nonReviewable)}`);
  const update = await db.query(`
    update public.kg_automation_proposals
    set is_active = false,
        review_status = 'superseded',
        metadata = metadata || jsonb_build_object(
          'superseded_by_review_run_id', $2::text,
          'superseded_reason', 'clean_current_release_packet_replaced_stale_review_candidates'
        )
    where is_active and metadata->>'card_claim_review_run_id' = $1
    returning id
  `, [oldRunId, replacementRunId]);
  const remaining = await db.query(`
    select count(*)::int as count
    from public.kg_automation_proposals
    where is_active and metadata->>'card_claim_review_run_id' = $1
  `, [oldRunId]);
  if (remaining.rows[0]?.count !== 0) throw new Error("old_review_run_still_active");
  await db.query("commit");
  console.log(JSON.stringify({ applied: true, guard, oldRunId, replacementRunId, superseded: update.rowCount ?? 0 }, null, 2));
} catch (error) {
  await db.query("rollback").catch(() => undefined);
  throw error;
} finally {
  await db.end();
}
