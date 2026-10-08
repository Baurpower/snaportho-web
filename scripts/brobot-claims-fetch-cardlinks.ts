/* Fetch approved in-release card-link counts for served claims.
 *
 * Reads a rerank-diagnostic output file (per-prompt served order), collects
 * every served claim ID, and counts its approved card links against a PGlite
 * snapshot of production. Writes the { claimId: count } map consumed by
 * scripts/brobot-claims-metrics.ts --cards for the exact-card-link-yield
 * metric. The PGlite module path and snapshot directory are arguments because
 * PGlite is a local eval dependency, not a project dependency.
 *
 * Usage:
 *   node --experimental-strip-types \
 *     scripts/brobot-claims-fetch-cardlinks.ts <diagOut.json> <pgliteDir> <dbDir> <out.json>
 *
 * pgliteDir: directory containing @electric-sql/pglite (e.g. /tmp/pglite-test/node_modules)
 */
import fs from "node:fs";

export const CARDLINKS_FETCH_VERSION = "brobot-cardlinks-fetch.v1" as const;

async function main(): Promise<void> {
  const [diagPath, pgliteDir, dbDir, outPath] = process.argv.slice(2);
  if (!diagPath || !pgliteDir || !dbDir || !outPath) {
    console.error("usage: fetch-cardlinks <diagOut.json> <pgliteDir> <dbDir> <out.json>");
    process.exit(1);
  }
  const DIAG = JSON.parse(fs.readFileSync(diagPath, "utf8")) as {
    queries: Array<{ served?: Array<{ claimId: string }> }>;
  };
  const ids = [...new Set(DIAG.queries.flatMap((q) => (q.served ?? []).map((s) => s.claimId)))];
  const { PGlite } = (await import(`${pgliteDir}/@electric-sql/pglite/dist/index.js`)) as {
    PGlite: new (opts: { dataDir: string }) => {
      query: (sql: string, params: unknown[]) => Promise<{ rows: unknown[] }>;
      close: () => Promise<void>;
    };
  };
  const db = new PGlite({ dataDir: dbDir });
  try {
    const result = await db.query(
      `select l.claim_id, count(*) as n from public.card_claim_links l
       join public.anki_deck_release_cards m on m.canonical_card_version_id = l.canonical_card_version_id
         and m.inclusion_status = 'included'
       where l.claim_id = any($1) and l.is_active and l.review_status in ('approved','auto_approved')
       group by l.claim_id`,
      [ids]
    );
    const links: Record<string, number> = {};
    for (const row of result.rows as Array<{ claim_id: string; n: string }>) {
      links[row.claim_id] = Number(row.n);
    }
    fs.writeFileSync(
      outPath,
      JSON.stringify({ version: CARDLINKS_FETCH_VERSION, generatedAt: new Date().toISOString(), servedIds: ids.length, links }, null, 1)
    );
    console.log(JSON.stringify({ servedIds: ids.length, linked: Object.keys(links).length }));
  } finally {
    await db.close();
  }
}

await main();
