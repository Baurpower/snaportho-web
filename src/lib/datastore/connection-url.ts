import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const RDS_HOST_PATTERNS = [/\.rds\.amazonaws\.com/i, /snaportho-db\./i];

function hydrateDotEnvLocal() {
  const path = join(process.cwd(), '.env.local');
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

export type DatabaseConnectionResolution = {
  url: string;
  host: string;
  provider: 'supabase' | 'rds' | 'unknown';
  source: 'SUPABASE_DATABASE_URL' | 'DATABASE_URL';
};

function parseHost(connectionString: string) {
  try {
    return new URL(connectionString).hostname;
  } catch {
    return '';
  }
}

function classifyHost(host: string): DatabaseConnectionResolution['provider'] {
  if (!host) return 'unknown';
  if (host.includes('supabase.com')) return 'supabase';
  if (RDS_HOST_PATTERNS.some((pattern) => pattern.test(host))) return 'rds';
  return 'unknown';
}

/**
 * Resolves a direct Postgres connection string for operator scripts only.
 * Runtime application code must use Supabase JS (`createAdminClient`).
 */
export function resolveOperatorDatabaseUrl(options: { allowRds?: boolean } = {}): DatabaseConnectionResolution {
  hydrateDotEnvLocal();

  const supabaseDatabaseUrl = process.env.SUPABASE_DATABASE_URL?.trim();
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const url = supabaseDatabaseUrl || databaseUrl || '';

  if (!url) {
    throw new Error(
      'Missing database connection URL. Set SUPABASE_DATABASE_URL (preferred) or DATABASE_URL to the Supabase pooler.'
    );
  }

  const host = parseHost(url);
  const provider = classifyHost(host);
  const source = supabaseDatabaseUrl ? 'SUPABASE_DATABASE_URL' : 'DATABASE_URL';

  if (provider === 'rds' && !options.allowRds) {
    throw new Error(
      `Refusing RDS connection for operator script (host=${host}). ` +
        'Point SUPABASE_DATABASE_URL/DATABASE_URL at the Supabase pooler, or pass allowRds for explicit legacy export.'
    );
  }

  if (provider === 'unknown') {
    console.warn('[datastore] operator_connection_unknown_host', { host, source });
  } else {
    console.log('[datastore] operator_connection', { provider, host, source });
  }

  return { url, host, provider, source };
}