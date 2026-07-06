import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

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

async function main() {
  hydrateDotEnvLocal();
  const rawToken = process.argv[2];
  if (!rawToken) throw new Error('Usage: verify-device-token-write.ts <raw-token>');

  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const res = await client.query(
      `SELECT token_hash, platform, app_version, timezone, environment, last_seen_at, created_at
       FROM user_device_tokens
       WHERE token_hash = $1 OR app_version = '9.9.9-rollout'
       ORDER BY last_seen_at DESC NULLS LAST
       LIMIT 5`,
      [tokenHash]
    );
    console.log(JSON.stringify({ tokenHashPrefix: tokenHash.slice(0, 12), rows: res.rows }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});