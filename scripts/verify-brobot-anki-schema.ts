/**
 * Read-only BroBot Anki schema drift verifier.
 *
 * The expected contract is intentionally checked in below. The script opens a
 * READ ONLY transaction, reads PostgreSQL catalogs, writes a local JSON report,
 * rolls back, and exits non-zero when required schema objects drift.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

const TABLES = [
  "brobot_anki_device_links",
  "brobot_anki_device_tokens",
  "brobot_anki_addon_devices",
  "brobot_anki_prep_requests",
  "brobot_anki_study_sessions",
  "brobot_anki_session_matches",
] as const;

type ExpectedColumn = { type: string; nullable: boolean };
type ExpectedTable = {
  columns: Record<string, ExpectedColumn>;
  constraints: string[];
  indexes: string[];
  triggers: string[];
  policies: string[];
  rlsEnabled: boolean;
  rlsForced: boolean;
  serviceRolePrivileges: string[];
};

// Filled by the additive baseline migration. Keep this contract synchronized
// with the migration; drift in either direction must fail verification.
const EXPECTED: Record<(typeof TABLES)[number], ExpectedTable> = {
  brobot_anki_device_links: {
    columns: {
      id: { type: "uuid", nullable: false }, link_code: { type: "text", nullable: false },
      device_name: { type: "text", nullable: false }, user_id: { type: "uuid", nullable: true },
      status: { type: "text", nullable: false }, approved_at: { type: "timestamp with time zone", nullable: true },
      exchanged_at: { type: "timestamp with time zone", nullable: true }, revoked_at: { type: "timestamp with time zone", nullable: true },
      expires_at: { type: "timestamp with time zone", nullable: false }, created_at: { type: "timestamp with time zone", nullable: false },
      updated_at: { type: "timestamp with time zone", nullable: false },
    },
    constraints: ["brobot_anki_device_links_link_code_key", "brobot_anki_device_links_pkey", "brobot_anki_device_links_status_check", "brobot_anki_device_links_user_id_fkey"],
    indexes: ["brobot_anki_device_links_link_code_key", "brobot_anki_device_links_pkey", "brobot_anki_device_links_status_idx", "brobot_anki_device_links_user_id_idx"],
    triggers: ["set_brobot_anki_device_links_updated_at"], policies: ["brobot_anki_service_role_all"],
    rlsEnabled: true, rlsForced: true, serviceRolePrivileges: ["DELETE", "INSERT", "SELECT", "UPDATE"],
  },
  brobot_anki_device_tokens: {
    columns: {
      id: { type: "uuid", nullable: false }, device_link_id: { type: "uuid", nullable: false },
      user_id: { type: "uuid", nullable: false }, device_name: { type: "text", nullable: false },
      token_hash: { type: "text", nullable: false }, last_used_at: { type: "timestamp with time zone", nullable: true },
      revoked_at: { type: "timestamp with time zone", nullable: true }, created_at: { type: "timestamp with time zone", nullable: false },
      updated_at: { type: "timestamp with time zone", nullable: false },
    },
    constraints: ["brobot_anki_device_tokens_device_link_id_fkey", "brobot_anki_device_tokens_device_link_id_key", "brobot_anki_device_tokens_pkey", "brobot_anki_device_tokens_token_hash_key", "brobot_anki_device_tokens_user_id_fkey"],
    indexes: ["brobot_anki_device_tokens_device_link_id_key", "brobot_anki_device_tokens_pkey", "brobot_anki_device_tokens_revoked_at_idx", "brobot_anki_device_tokens_token_hash_key", "brobot_anki_device_tokens_user_id_idx"],
    triggers: ["set_brobot_anki_device_tokens_updated_at"], policies: ["brobot_anki_service_role_all"],
    rlsEnabled: true, rlsForced: true, serviceRolePrivileges: ["DELETE", "INSERT", "SELECT", "UPDATE"],
  },
  brobot_anki_addon_devices: {
    columns: {
      id: { type: "uuid", nullable: false }, user_id: { type: "uuid", nullable: false },
      device_name: { type: "text", nullable: true }, anki_profile_name: { type: "text", nullable: true },
      addon_version: { type: "text", nullable: true }, last_seen_at: { type: "timestamp with time zone", nullable: true },
      is_active: { type: "boolean", nullable: false }, created_at: { type: "timestamp with time zone", nullable: false },
      updated_at: { type: "timestamp with time zone", nullable: false },
    },
    constraints: ["brobot_anki_addon_devices_pkey", "brobot_anki_addon_devices_user_id_fkey"],
    indexes: ["brobot_anki_addon_devices_pkey", "brobot_anki_addon_devices_user_active_idx"],
    triggers: ["set_brobot_anki_addon_devices_updated_at"], policies: ["brobot_anki_service_role_all"],
    rlsEnabled: true, rlsForced: true, serviceRolePrivileges: ["DELETE", "INSERT", "SELECT", "UPDATE"],
  },
  brobot_anki_prep_requests: {
    columns: {
      id: { type: "uuid", nullable: false }, user_id: { type: "uuid", nullable: false },
      title: { type: "text", nullable: false }, raw_case_input: { type: "text", nullable: false },
      diagnosis: { type: "text", nullable: true }, procedure: { type: "text", nullable: true },
      body_region: { type: "text", nullable: true }, subspecialty: { type: "text", nullable: true },
      generated_summary: { type: "text", nullable: true }, generated_keywords: { type: "jsonb", nullable: false },
      generated_topics: { type: "jsonb", nullable: false }, suggested_tags: { type: "jsonb", nullable: false },
      status: { type: "text", nullable: false }, sent_to_anki_at: { type: "timestamp with time zone", nullable: true },
      pulled_by_addon_at: { type: "timestamp with time zone", nullable: true }, completed_at: { type: "timestamp with time zone", nullable: true },
      error_message: { type: "text", nullable: true }, created_at: { type: "timestamp with time zone", nullable: false },
      updated_at: { type: "timestamp with time zone", nullable: false },
    },
    constraints: ["brobot_anki_prep_requests_pkey", "brobot_anki_prep_requests_status_check", "brobot_anki_prep_requests_user_id_fkey"],
    indexes: ["brobot_anki_prep_requests_pkey", "brobot_anki_prep_requests_user_status_idx"],
    triggers: ["set_brobot_anki_prep_requests_updated_at"], policies: ["brobot_anki_service_role_all"],
    rlsEnabled: true, rlsForced: true, serviceRolePrivileges: ["DELETE", "INSERT", "SELECT", "UPDATE"],
  },
  brobot_anki_study_sessions: {
    columns: {
      id: { type: "uuid", nullable: false }, user_id: { type: "uuid", nullable: false },
      prep_request_id: { type: "uuid", nullable: false }, addon_device_id: { type: "uuid", nullable: true },
      session_title: { type: "text", nullable: false }, applied_base_tag: { type: "text", nullable: false },
      applied_case_tag: { type: "text", nullable: true }, applied_request_tag: { type: "text", nullable: true },
      matching_strategy: { type: "text", nullable: false }, total_cards_found: { type: "integer", nullable: false },
      total_cards_tagged: { type: "integer", nullable: false }, max_cards: { type: "integer", nullable: true },
      min_match_score: { type: "numeric", nullable: true }, include_cloze_siblings: { type: "boolean", nullable: false },
      total_candidates_found: { type: "integer", nullable: false }, status: { type: "text", nullable: false },
      created_at: { type: "timestamp with time zone", nullable: false }, updated_at: { type: "timestamp with time zone", nullable: false },
    },
    constraints: ["brobot_anki_study_sessions_addon_device_id_fkey", "brobot_anki_study_sessions_counts_check", "brobot_anki_study_sessions_matching_strategy_check", "brobot_anki_study_sessions_pkey", "brobot_anki_study_sessions_prep_request_id_fkey", "brobot_anki_study_sessions_status_check", "brobot_anki_study_sessions_user_id_fkey"],
    indexes: ["brobot_anki_study_sessions_pkey", "brobot_anki_study_sessions_prep_request_idx", "brobot_anki_study_sessions_user_created_idx"],
    triggers: ["set_brobot_anki_study_sessions_updated_at"], policies: ["brobot_anki_service_role_all"],
    rlsEnabled: true, rlsForced: true, serviceRolePrivileges: ["DELETE", "INSERT", "SELECT", "UPDATE"],
  },
  brobot_anki_session_matches: {
    columns: {
      id: { type: "uuid", nullable: false }, user_id: { type: "uuid", nullable: false },
      session_id: { type: "uuid", nullable: false }, raw_anki_card_id: { type: "bigint", nullable: true },
      raw_anki_note_id: { type: "bigint", nullable: true }, deck_name: { type: "text", nullable: true },
      card_preview: { type: "text", nullable: true }, match_score: { type: "numeric", nullable: true },
      matched_keywords: { type: "text[]", nullable: false }, match_reason: { type: "text", nullable: true },
      included: { type: "boolean", nullable: false }, created_at: { type: "timestamp with time zone", nullable: false },
    },
    constraints: ["brobot_anki_session_matches_pkey", "brobot_anki_session_matches_score_check", "brobot_anki_session_matches_session_id_fkey", "brobot_anki_session_matches_user_id_fkey"],
    indexes: ["brobot_anki_session_matches_pkey", "idx_brobot_anki_session_matches_session", "idx_brobot_anki_session_matches_user"],
    triggers: [], policies: ["brobot_anki_service_role_all"],
    rlsEnabled: true, rlsForced: true, serviceRolePrivileges: ["DELETE", "INSERT", "SELECT", "UPDATE"],
  },
};

function loadEnv(filePath: string) {
  const values: Record<string, string> = {};
  if (!existsSync(filePath)) return values;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    values[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return values;
}

function normalizeType(row: { data_type: string; udt_name: string }) {
  if (row.data_type === "ARRAY") return `${row.udt_name.slice(1)}[]`;
  if (row.data_type === "USER-DEFINED") return row.udt_name;
  return row.data_type;
}

async function main() {
  const snapshotOnly = process.argv.includes("--snapshot-only");
  const outArg = process.argv.find((value) => value.startsWith("--out="));
  const outPath = path.resolve(outArg?.slice(6) || "reports/educational-content-layer/anki-launch-foundation/brobot-anki-schema-verification.json");
  const env = { ...loadEnv(path.resolve(".env.local")), ...process.env };
  if (!env.DATABASE_URL?.trim()) throw new Error("DATABASE_URL is required");

  const client = new Client({
    connectionString: env.DATABASE_URL.trim(),
    ssl: { rejectUnauthorized: false },
    application_name: "brobot_anki_schema_readonly_verifier",
  });
  await client.connect();
  const query = async <T>(sql: string, values: unknown[] = []) => (await client.query<T>(sql, values)).rows;
  let rolledBack = false;
  try {
    await client.query("begin");
    await client.query("set transaction read only");
    await client.query("set local statement_timeout = '60s'");
    const readOnly = (await query<{ transaction_read_only: string }>("show transaction_read_only"))[0]?.transaction_read_only;
    if (readOnly !== "on") throw new Error(`Read-only guard failed: ${readOnly}`);

    const columns = await query<{
      table_name: string; column_name: string; data_type: string; udt_name: string;
      is_nullable: "YES" | "NO"; column_default: string | null;
    }>(`
      select table_name,column_name,data_type,udt_name,is_nullable,column_default
      from information_schema.columns
      where table_schema='public' and table_name = any($1::text[])
      order by table_name,ordinal_position
    `, [TABLES]);
    const constraints = await query<{ table_name: string; constraint_name: string; constraint_type: string; definition: string }>(`
      select c.relname table_name,con.conname constraint_name,
        case con.contype when 'p' then 'PRIMARY KEY' when 'f' then 'FOREIGN KEY'
          when 'u' then 'UNIQUE' when 'c' then 'CHECK' else con.contype::text end constraint_type,
        pg_get_constraintdef(con.oid,true) definition
      from pg_constraint con
      join pg_class c on c.oid=con.conrelid
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname = any($1::text[])
      order by c.relname,con.conname
    `, [TABLES]);
    const indexes = await query<{ table_name: string; index_name: string; definition: string }>(`
      select tablename table_name,indexname index_name,indexdef definition
      from pg_indexes where schemaname='public' and tablename = any($1::text[])
      order by tablename,indexname
    `, [TABLES]);
    const triggers = await query<{ table_name: string; trigger_name: string; definition: string }>(`
      select event_object_table table_name,trigger_name,action_statement definition
      from information_schema.triggers
      where event_object_schema='public' and event_object_table = any($1::text[])
      order by event_object_table,trigger_name
    `, [TABLES]);
    const rls = await query<{ table_name: string; rls_enabled: boolean; rls_forced: boolean }>(`
      select c.relname table_name,c.relrowsecurity rls_enabled,c.relforcerowsecurity rls_forced
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind='r' and c.relname = any($1::text[])
      order by c.relname
    `, [TABLES]);
    const policies = await query<{ table_name: string; policy_name: string; command: string; roles: string[]; using_expression: string | null; check_expression: string | null }>(`
      select tablename table_name,policyname policy_name,cmd command,roles,
        qual using_expression,with_check check_expression
      from pg_policies where schemaname='public' and tablename = any($1::text[])
      order by tablename,policyname
    `, [TABLES]);
    const grants = await query<{ table_name: string; grantee: string; privilege_type: string }>(`
      select c.relname table_name,r.rolname grantee,x.privilege_type
      from pg_class c
      join pg_namespace n on n.oid=c.relnamespace
      cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x
      join pg_roles r on r.oid=x.grantee
      where n.nspname='public' and c.relname = any($1::text[])
      order by c.relname,r.rolname,x.privilege_type
    `, [TABLES]);

    const actual = Object.fromEntries(TABLES.map((tableName) => [tableName, {
      columns: columns.filter((row) => row.table_name === tableName).map((row) => ({ ...row, normalized_type: normalizeType(row) })),
      constraints: constraints.filter((row) => row.table_name === tableName),
      indexes: indexes.filter((row) => row.table_name === tableName),
      triggers: triggers.filter((row) => row.table_name === tableName),
      rls: rls.find((row) => row.table_name === tableName) ?? null,
      policies: policies.filter((row) => row.table_name === tableName),
      grants: grants.filter((row) => row.table_name === tableName),
    }]));

    const errors: string[] = [];
    if (!snapshotOnly) {
      for (const tableName of TABLES) {
        const expected = EXPECTED[tableName];
        const table = actual[tableName];
        if (!table.columns.length) {
          errors.push(`${tableName}: missing table`);
          continue;
        }
        const actualColumns = new Map(table.columns.map((row) => [row.column_name, row]));
        for (const [columnName, column] of Object.entries(expected.columns)) {
          const found = actualColumns.get(columnName);
          if (!found) errors.push(`${tableName}.${columnName}: missing column`);
          else {
            if (found.normalized_type !== column.type) errors.push(`${tableName}.${columnName}: type ${found.normalized_type}, expected ${column.type}`);
            if ((found.is_nullable === "YES") !== column.nullable) errors.push(`${tableName}.${columnName}: nullable=${found.is_nullable}, expected ${column.nullable}`);
          }
        }
        for (const columnName of actualColumns.keys()) {
          if (!(columnName in expected.columns)) errors.push(`${tableName}.${columnName}: unexpected column`);
        }
        const constraintNames = new Set(table.constraints.map((row) => row.constraint_name));
        for (const name of expected.constraints) if (!constraintNames.has(name)) errors.push(`${tableName}: missing constraint ${name}`);
        const indexNames = new Set(table.indexes.map((row) => row.index_name));
        for (const name of expected.indexes) if (!indexNames.has(name)) errors.push(`${tableName}: missing index ${name}`);
        const triggerNames = new Set(table.triggers.map((row) => row.trigger_name));
        for (const name of expected.triggers) if (!triggerNames.has(name)) errors.push(`${tableName}: missing trigger ${name}`);
        const policyNames = new Set(table.policies.map((row) => row.policy_name));
        for (const name of expected.policies) if (!policyNames.has(name)) errors.push(`${tableName}: missing policy ${name}`);
        for (const policy of table.policies) {
          if (!expected.policies.includes(policy.policy_name)) errors.push(`${tableName}: unexpected policy ${policy.policy_name}`);
          if (policy.roles.some((role) => role !== "service_role")) errors.push(`${tableName}: policy ${policy.policy_name} exposes ${policy.roles.join(",")}`);
        }
        if (table.rls?.rls_enabled !== expected.rlsEnabled) errors.push(`${tableName}: rls_enabled=${table.rls?.rls_enabled}, expected ${expected.rlsEnabled}`);
        if (table.rls?.rls_forced !== expected.rlsForced) errors.push(`${tableName}: rls_forced=${table.rls?.rls_forced}, expected ${expected.rlsForced}`);
        const servicePrivileges = table.grants.filter((row) => row.grantee === "service_role").map((row) => row.privilege_type).sort();
        for (const privilege of expected.serviceRolePrivileges) if (!servicePrivileges.includes(privilege)) errors.push(`${tableName}: service_role missing ${privilege}`);
        for (const privilege of servicePrivileges) if (!expected.serviceRolePrivileges.includes(privilege)) errors.push(`${tableName}: service_role has unexpected ${privilege}`);
        for (const row of table.grants) {
          if (["anon", "authenticated"].includes(row.grantee)) errors.push(`${tableName}: forbidden direct ${row.privilege_type} grant to ${row.grantee}`);
        }
      }
    }

    const result = {
      generatedAt: new Date().toISOString(),
      databaseHost: new URL(env.DATABASE_URL).hostname,
      safety: { transactionReadOnly: readOnly, transactionDisposition: "rollback" },
      mode: snapshotOnly ? "snapshot_only" : "verify",
      valid: errors.length === 0,
      errors,
      actual,
    };
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n", "utf8");
    await client.query("rollback");
    rolledBack = true;
    process.stdout.write(JSON.stringify({ outPath, valid: result.valid, errors: result.errors, safety: result.safety }, null, 2) + "\n");
    if (!snapshotOnly && errors.length) process.exitCode = 1;
  } finally {
    if (!rolledBack) {
      try { await client.query("rollback"); } catch {}
    }
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
