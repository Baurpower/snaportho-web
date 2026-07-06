/**
 * Production rollout verification for RDS removal.
 * Reads credentials from .env.local — never prints secrets.
 *
 * Usage:
 *   node --experimental-strip-types scripts/verify-production-rollout.ts
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

const { Client } = pg;
const ROOT = process.cwd();

function hydrateDotEnvLocal() {
  const path = join(ROOT, '.env.local');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
}

function buildLegacyDatabaseUrl(): string | null {
  const direct = process.env.LEGACY_DATABASE_URL?.trim();
  if (direct) return direct;

  const host = process.env.POSTGRES_HOST?.trim();
  const user = process.env.POSTGRES_USER?.trim();
  const pass = process.env.POSTGRES_PASSWORD?.trim();
  const db = process.env.POSTGRES_DB?.trim() ?? 'postgres';
  if (!host || !user || !pass) return null;

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:5432/${db}?sslmode=require`;
}

function supabaseDatabaseUrl(): string | null {
  return process.env.SUPABASE_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim() || null;
}

async function tableExists(client: pg.Client, table: string) {
  const res = await client.query(
    `SELECT to_regclass($1) IS NOT NULL AS exists`,
    [`public.${table}`]
  );
  return Boolean(res.rows[0]?.exists);
}

async function columnCheck(client: pg.Client, table: string, columns: string[]) {
  const res = await client.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );
  const present = new Set(res.rows.map((r) => r.column_name as string));
  return Object.fromEntries(columns.map((c) => [c, present.has(c)]));
}

async function countQuery(client: pg.Client, sql: string) {
  const res = await client.query(sql);
  return res.rows[0] ?? {};
}

async function main() {
  hydrateDotEnvLocal();
  const verifiedAt = new Date().toISOString();

  const report: Record<string, unknown> = {
    verifiedAt,
    schema: {},
    counts: {},
    productionProbes: {},
    stripe: {},
    blockers: [] as string[],
    passed: [] as string[],
  };

  const blockers = report.blockers as string[];
  const passed = report.passed as string[];

  const supaUrl = supabaseDatabaseUrl();
  const legacyUrl = buildLegacyDatabaseUrl();

  if (!supaUrl) {
    blockers.push('Missing SUPABASE_DATABASE_URL or DATABASE_URL');
  }

  if (supaUrl) {
    const supaClient = new Client({ connectionString: supaUrl });
    await supaClient.connect();
    try {
      const tables = ['user_device_tokens', 'donations', 'case_prep_logs'] as const;
      for (const table of tables) {
        const exists = await tableExists(supaClient, table);
        (report.schema as Record<string, unknown>)[table] = { exists };
        if (!exists) blockers.push(`Supabase table missing: ${table}`);
        else passed.push(`Supabase table exists: ${table}`);
      }

      if ((report.schema as Record<string, { exists: boolean }>).user_device_tokens?.exists) {
        const cols = await columnCheck(supaClient, 'user_device_tokens', [
          'user_id', 'token', 'token_hash', 'platform', 'environment', 'timezone',
          'receive_notifications', 'app_version', 'build_number', 'last_seen_at', 'created_at', 'updated_at',
        ]);
        (report.schema as Record<string, unknown>).user_device_tokens_columns = cols;
        const missingCols = Object.entries(cols).filter(([, ok]) => !ok).map(([c]) => c);
        if (missingCols.length) blockers.push(`user_device_tokens missing columns: ${missingCols.join(', ')}`);
        else passed.push('user_device_tokens columns OK');
      }

      if ((report.schema as Record<string, { exists: boolean }>).donations?.exists) {
        const cols = await columnCheck(supaClient, 'donations', [
          'stripe_id', 'stripe_event_id', 'amount', 'status', 'email', 'anonymous', 'display_name', 'created_at',
        ]);
        (report.schema as Record<string, unknown>).donations_columns = cols;
      }

      const counts = report.counts as Record<string, unknown>;
      if ((report.schema as Record<string, { exists: boolean }>).user_device_tokens?.exists) {
        counts.user_device_tokens = await countQuery(supaClient, `
          SELECT
            COUNT(*)::bigint AS row_count,
            COUNT(DISTINCT token_hash)::bigint AS distinct_token_hash,
            COUNT(*) FILTER (WHERE user_id IS NULL)::bigint AS null_user_id,
            MAX(last_seen_at)::text AS latest_last_seen_at
          FROM user_device_tokens
        `);
      }
      if ((report.schema as Record<string, { exists: boolean }>).donations?.exists) {
        counts.donations = await countQuery(supaClient, `
          SELECT COUNT(*)::bigint AS row_count, COALESCE(SUM(amount),0)::bigint AS sum_cents
          FROM donations WHERE status = 'paid'
        `);
      }
      if ((report.schema as Record<string, { exists: boolean }>).case_prep_logs?.exists) {
        counts.case_prep_logs = await countQuery(supaClient, `
          SELECT COUNT(*)::bigint AS row_count, MAX(created_at)::text AS latest_created_at
          FROM case_prep_logs
        `);
      }
    } finally {
      await supaClient.end();
    }
  }

  if (legacyUrl) {
    const legacyClient = new Client({ connectionString: legacyUrl, ssl: { rejectUnauthorized: false } });
    try {
      await legacyClient.connect();
      const devices = await countQuery(legacyClient, `
        SELECT
          COUNT(*)::bigint AS row_count,
          COUNT(DISTINCT device_token)::bigint AS distinct_token,
          COUNT(*) FILTER (WHERE learn_user_id IS NULL OR learn_user_id = 'anonymous')::bigint AS null_user_id,
          MAX(last_seen)::text AS latest_last_seen
        FROM devices
      `);
      (report.counts as Record<string, unknown>).rds_devices = devices;

      const supaRows = Number((report.counts as Record<string, { row_count?: string }>).user_device_tokens?.row_count ?? 0);
      const rdsRows = Number(devices.row_count ?? 0);
      const parity = {
        supabaseRowCountGteRds: supaRows >= rdsRows,
        supabaseRowCount: supaRows,
        rdsRowCount: rdsRows,
      };
      (report.counts as Record<string, unknown>).device_parity = parity;
      if (parity.supabaseRowCountGteRds) passed.push('user_device_tokens count >= RDS devices');
      else blockers.push(`user_device_tokens (${supaRows}) < RDS devices (${rdsRows})`);
    } catch (error) {
      (report.counts as Record<string, unknown>).rds_devices = {
        error: error instanceof Error ? error.message : String(error),
      };
      blockers.push('Could not query RDS devices table');
    } finally {
      await legacyClient.end().catch(() => undefined);
    }
  } else {
    blockers.push('LEGACY_DATABASE_URL / POSTGRES_* not available for RDS parity check');
  }

  // Production HTTP probes (no auth secrets sent)
  const probes = [
    { name: 'fundraising_donations_api', url: 'https://snap-ortho.com/api/donations?limit=5' },
    { name: 'vapor_health', url: 'https://api.snap-ortho.com/hello' },
    { name: 'vapor_legacy_donations', url: 'https://api.snap-ortho.com/donations?limit=5' },
  ];

  for (const probe of probes) {
    try {
      const res = await fetch(probe.url, { signal: AbortSignal.timeout(12000) });
      const contentType = res.headers.get('content-type') ?? '';
      let bodySummary: unknown = { status: res.status, contentType };
      if (contentType.includes('application/json')) {
        const json = (await res.json()) as Record<string, unknown>;
        if (probe.name === 'fundraising_donations_api') {
          bodySummary = {
            status: res.status,
            source: json.source,
            donationCount: Array.isArray(json.donations) ? json.donations.length : null,
            totals: json.totals,
          };
          if (res.ok && String(json.source).includes('supabase')) passed.push('Production /api/donations serves Supabase');
          else if (res.ok) blockers.push('Production /api/donations not reporting supabase source');
        } else if (probe.name === 'vapor_legacy_donations') {
          bodySummary = {
            status: res.status,
            source: json.source,
            donationCount: Array.isArray(json.donations) ? json.donations.length : null,
          };
        }
      } else {
        bodySummary = { status: res.status, bodyPreview: (await res.text()).slice(0, 120) };
      }
      (report.productionProbes as Record<string, unknown>)[probe.name] = bodySummary;
    } catch (error) {
      (report.productionProbes as Record<string, unknown>)[probe.name] = {
        error: error instanceof Error ? error.message : String(error),
      };
      blockers.push(`Probe failed: ${probe.name}`);
    }
  }

  // CPT suggest probe
  try {
    const res = await fetch('https://api.snap-ortho.com/cpt/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ case_description: 'Closed reduction distal radius fracture' }),
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    (report.productionProbes as Record<string, unknown>).cpt_suggest = {
      status: res.status,
      contentType: res.headers.get('content-type'),
      bodyPreview: text.slice(0, 200),
    };
    if (res.status !== 404) {
      passed.push(`/cpt/suggest responds (${res.status}) — service appears deployed`);
    } else {
      blockers.push('/cpt/suggest returned 404 on production');
    }
  } catch (error) {
    (report.productionProbes as Record<string, unknown>).cpt_suggest = {
      error: error instanceof Error ? error.message : String(error),
    };
  }

  report.stripe = {
    donationWebhookSecretConfigured: Boolean(
      process.env.STRIPE_DONATION_WEBHOOK_SECRET?.trim() ||
        process.env.STRIPE_WEBHOOK_SECRET_DONATIONS?.trim()
    ),
    subscriptionWebhookSecretConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
    targetDonationWebhookUrl: 'https://snap-ortho.com/api/stripe/donation-webhook',
    subscriptionWebhookPath: '/api/stripe/webhook',
  };

  if (!report.stripe.donationWebhookSecretConfigured) {
    blockers.push('STRIPE_DONATION_WEBHOOK_SECRET not set locally — Stripe dashboard cutover unverified');
  }

  report.summary = {
    blockerCount: blockers.length,
    passedCount: passed.length,
    readyForRdsShutdown: blockers.length === 0,
  };

  console.log(JSON.stringify(report, null, 2));
  if (blockers.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error('[verify-production-rollout] fatal', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});