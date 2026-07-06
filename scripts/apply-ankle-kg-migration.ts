/**
 * Apply ankle pilot vocabulary migration to staging only.
 *
 * Usage:
 *   KG_TARGET_ENV=staging npm run kg:pilot:ankle:migrate-apply
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

import { resolveOperatorDatabaseUrl } from "../src/lib/datastore/connection-url.ts";
import { resolveEnv } from "./kg-automation-common.ts";
import { requireStaging } from "./lib/education/kg-staging-guard.ts";

const { Client } = pg;

function getDatabaseUrl(): string {
  return resolveOperatorDatabaseUrl().url;
}

async function verifyMigration(client: pg.Client) {
  const checks = [
    {
      name: "educational_claims_table",
      sql: `select to_regclass('public.educational_claims') as reg`,
    },
    {
      name: "decision_points_table",
      sql: `select to_regclass('public.decision_points') as reg`,
    },
    {
      name: "classification_grade_entity_type",
      sql: `select pg_get_constraintdef(oid) as def from pg_constraint where conname = 'canonical_entities_type_check'`,
    },
    {
      name: "injured_in_predicate",
      sql: `select pg_get_constraintdef(oid) as def from pg_constraint where conname = 'canonical_relationships_predicate_check'`,
    },
    {
      name: "propose_educational_claim_type",
      sql: `select pg_get_constraintdef(oid) as def from pg_constraint where conname = 'kg_automation_proposals_type_check'`,
    },
  ];

  const results: Record<string, boolean> = {};
  for (const check of checks) {
    const res = await client.query(check.sql);
    const val = String(res.rows[0]?.reg ?? res.rows[0]?.def ?? "");
    if (check.name.endsWith("_table")) {
      results[check.name] = val !== "" && val !== "null";
    } else {
      results[check.name] = val.includes("classification_grade") ||
        val.includes("injured_in") ||
        val.includes("propose_educational_claim");
    }
  }
  return results;
}

async function main() {
  const guard = requireStaging("ankle migration apply");
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL required to apply migration");
  }

  const migrationPath = path.join(
    process.cwd(),
    "supabase/migrations/20260705_120000_ankle_pilot_kg_vocabulary.sql"
  );
  const sql = readFileSync(migrationPath, "utf8");

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const before = await verifyMigration(client).catch(() => ({}));
  const alreadyApplied =
    before.educational_claims_table && before.decision_points_table && before.injured_in_predicate;

  if (!alreadyApplied) {
    await client.query(sql);
  }

  const after = await verifyMigration(client);
  await client.end();

  const report = {
    appliedAt: new Date().toISOString(),
    migrationPath,
    guard,
    alreadyApplied,
    verification: after,
    command: "KG_TARGET_ENV=staging npm run kg:pilot:ankle:migrate-apply",
    supabaseUrlHost: new URL(resolveEnv().supabaseUrl).hostname,
  };

  console.log(JSON.stringify(report, null, 2));

  const allOk = after.educational_claims_table &&
    after.decision_points_table &&
    after.classification_grade_entity_type &&
    after.injured_in_predicate &&
    after.propose_educational_claim_type;

  if (!allOk) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});