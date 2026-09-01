/**
 * Removes the orphaned sync-v2 materialize draft (release + release_notes + the
 * note_versions it inserted that are no longer referenced by any release).
 * One-off cleanup so the standard publisher can build a fresh successor.
 *
 * Usage: node --experimental-strip-types scripts/cleanup-orphan-materialize-draft.ts --release-id <uuid> [--apply]
 */
import pg from "pg";
import { resolveOperatorDatabaseUrl } from "../src/lib/datastore/connection-url.ts";

function arg(name: string) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; }

async function main() {
  const apply = process.argv.includes("--apply");
  const releaseId = arg("--release-id"); if (!releaseId) throw new Error("--release-id required");
  const { url } = resolveOperatorDatabaseUrl();
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const rel = await client.query(`select id,release_version,status from anki_sync_v2_releases where id=$1`, [releaseId]);
    if (!rel.rows.length) throw new Error("release_not_found");
    if (rel.rows[0].status !== "draft") throw new Error(`refusing_non_draft:${rel.rows[0].status}`);
    const links = await client.query(`select note_version_id from anki_sync_v2_release_notes where release_id=$1`, [releaseId]);
    const versionIds = [...new Set(links.rows.map((r) => r.note_version_id))];
    const orphanCheck = await client.query(
      `select v.id from anki_sync_v2_note_versions v
       where v.id = any($1::uuid[])
         and not exists (select 1 from anki_sync_v2_release_notes rn where rn.note_version_id=v.id and rn.release_id<>$2)`,
      [versionIds, releaseId],
    );
    const orphanVersionIds = orphanCheck.rows.map((r) => r.id);
    const plan = { releaseId, releaseVersion: rel.rows[0].release_version, releaseNotes: links.rowCount, orphanNoteVersions: orphanVersionIds.length, apply };
    if (!apply) { console.log(JSON.stringify({ ...plan, mode: "dry-run" }, null, 2)); return; }
    await client.query("begin");
    await client.query(`delete from anki_sync_v2_release_notes where release_id=$1`, [releaseId]);
    if (orphanVersionIds.length) {
      await client.query(`delete from anki_sync_v2_note_versions where id = any($1::uuid[])`, [orphanVersionIds]);
    }
    await client.query(`delete from anki_sync_v2_releases where id=$1`, [releaseId]);
    await client.query("commit");
    console.log(JSON.stringify({ ...plan, deleted: true }, null, 2));
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
