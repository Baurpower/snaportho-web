/**
 * Compare legacy RDS `devices` vs Supabase `user_device_tokens` after backfill.
 *
 * Usage:
 *   LEGACY_DATABASE_URL=postgresql://...rds... \
 *   SUPABASE_DATABASE_URL=postgresql://...supabase... \
 *   npm run devices:validate-backfill
 */

import pg from 'pg';

const { Client } = pg;

type CountRow = { count: string };
type MetricRow = { metric: string; value: string | null };

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function classifyHost(url: string) {
  try {
    const host = new URL(url).hostname;
    if (host.includes('supabase.com')) return 'supabase';
    if (host.includes('rds.amazonaws.com') || host.includes('snaportho-db.')) return 'rds';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

async function queryMetrics(client: pg.Client, label: 'rds_devices' | 'supabase_tokens') {
  if (label === 'rds_devices') {
    const total = await client.query<CountRow>('SELECT COUNT(*)::text AS count FROM devices');
    const distinctTokens = await client.query<CountRow>(
      'SELECT COUNT(DISTINCT device_token)::text AS count FROM devices'
    );
    const nullUser = await client.query<CountRow>(
      "SELECT COUNT(*)::text AS count FROM devices WHERE learn_user_id IS NULL OR learn_user_id = 'anonymous'"
    );
    const latestSeen = await client.query<MetricRow>(
      'SELECT MAX(last_seen)::text AS value FROM devices'
    );

    return {
      table: 'devices',
      rowCount: Number(total.rows[0]?.count ?? 0),
      distinctTokenCount: Number(distinctTokens.rows[0]?.count ?? 0),
      nullUserIdCount: Number(nullUser.rows[0]?.count ?? 0),
      duplicateTokenCount: null as number | null,
      latestLastSeenAt: latestSeen.rows[0]?.value,
    };
  }

  const total = await client.query<CountRow>('SELECT COUNT(*)::text AS count FROM user_device_tokens');
  const distinctTokens = await client.query<CountRow>(
    'SELECT COUNT(DISTINCT token_hash)::text AS count FROM user_device_tokens'
  );
  const nullUser = await client.query<CountRow>(
    'SELECT COUNT(*)::text AS count FROM user_device_tokens WHERE user_id IS NULL'
  );
  const duplicates = await client.query<CountRow>(`
    SELECT COALESCE(SUM(dup_count), 0)::text AS count
    FROM (
      SELECT COUNT(*) - 1 AS dup_count
      FROM user_device_tokens
      GROUP BY token_hash, environment
      HAVING COUNT(*) > 1
    ) d
  `);
  const latestSeen = await client.query<MetricRow>(
    'SELECT MAX(last_seen_at)::text AS value FROM user_device_tokens'
  );

  return {
    table: 'user_device_tokens',
    rowCount: Number(total.rows[0]?.count ?? 0),
    distinctTokenCount: Number(distinctTokens.rows[0]?.count ?? 0),
    nullUserIdCount: Number(nullUser.rows[0]?.count ?? 0),
    duplicateTokenCount: Number(duplicates.rows[0]?.count ?? 0),
    latestLastSeenAt: latestSeen.rows[0]?.value,
  };
}

async function main() {
  const legacyUrl = requiredEnv('LEGACY_DATABASE_URL');
  const supabaseUrl = requiredEnv('SUPABASE_DATABASE_URL');

  const legacyHost = classifyHost(legacyUrl);
  const supabaseHost = classifyHost(supabaseUrl);

  if (legacyHost !== 'rds') {
    console.warn('[devices:validate-backfill] LEGACY_DATABASE_URL host is not RDS — continuing for operator review', {
      host: legacyHost,
    });
  }
  if (supabaseHost !== 'supabase') {
    throw new Error('SUPABASE_DATABASE_URL must point at Supabase');
  }

  const legacyClient = new Client({ connectionString: legacyUrl });
  const supabaseClient = new Client({ connectionString: supabaseUrl });

  await legacyClient.connect();
  await supabaseClient.connect();

  try {
    const rds = await queryMetrics(legacyClient, 'rds_devices');
    const supabase = await queryMetrics(supabaseClient, 'supabase_tokens');

    const report = {
      generatedAt: new Date().toISOString(),
      rds,
      supabase,
      checks: {
        supabaseRowCountGteRds: supabase.rowCount >= rds.rowCount,
        supabaseDistinctTokensGteRds: supabase.distinctTokenCount >= rds.distinctTokenCount,
        supabaseDuplicateTokensZero: supabase.duplicateTokenCount === 0,
      },
    };

    console.log(JSON.stringify(report, null, 2));

    const failed = Object.entries(report.checks).filter(([, ok]) => !ok);
    if (failed.length > 0) {
      console.error('[devices:validate-backfill] validation failed', Object.fromEntries(failed));
      process.exitCode = 1;
    }
  } finally {
    await legacyClient.end();
    await supabaseClient.end();
  }
}

main().catch((error) => {
  console.error('[devices:validate-backfill] error', error);
  process.exitCode = 1;
});