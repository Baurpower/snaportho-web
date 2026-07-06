/**
 * One-time operator backfill: import paid donations from legacy Vapor GET /donations
 * into Supabase public.donations. Idempotent on stripe_id.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

const { Client } = pg;

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

type VaporDonation = {
  name: string;
  amount: number;
  dateISO: string;
  via?: string;
  note?: string | null;
};

type VaporResponse = {
  donations: VaporDonation[];
  totals: { sumCents: number; count: number };
};

async function main() {
  hydrateDotEnvLocal();
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error('DATABASE_URL required');

  const res = await fetch('https://api.snap-ortho.com/donations?limit=200');
  if (!res.ok) throw new Error(`Vapor donations fetch failed: ${res.status}`);
  const payload = (await res.json()) as VaporResponse;

  const client = new Client({ connectionString: url });
  await client.connect();

  let inserted = 0;
  let skipped = 0;
  try {
    for (const [index, donation] of payload.donations.entries()) {
      const stripeId = `legacy_import_${index}_${donation.dateISO}`;
      const amountCents = donation.amount * 100;
      const displayName = donation.name?.trim() || 'Anonymous';
      const anonymous = displayName.toLowerCase() === 'anonymous';

      const result = await client.query(
        `INSERT INTO donations
           (billing_name, display_name, anonymous, email, message, amount, stripe_id, status, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'paid',$8::timestamptz)
         ON CONFLICT (stripe_id) DO NOTHING
         RETURNING id`,
        [
          displayName,
          displayName,
          anonymous,
          'legacy-import@snap-ortho.com',
          donation.note ?? null,
          amountCents,
          stripeId,
          donation.dateISO || new Date().toISOString(),
        ]
      );
      if (result.rowCount) inserted += 1;
      else skipped += 1;
    }

    const totals = await client.query(
      `SELECT COUNT(*)::bigint AS row_count, COALESCE(SUM(amount),0)::bigint AS sum_cents FROM donations WHERE status='paid'`
    );

    console.log(
      JSON.stringify(
        {
          importedAt: new Date().toISOString(),
          vaporCount: payload.donations.length,
          inserted,
          skipped,
          supabase: totals.rows[0],
        },
        null,
        2
      )
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[backfill-donations-from-vapor-api] failed', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});