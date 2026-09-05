/**
 * One-off: build a targeted worklist of the 1,241 Codex-cohort Orthobullets fills
 * (the "just repeats the question" batch) so they can be regenerated with real
 * teaching bullets. Joins the codex guids (+ their already-validated canonical
 * links) from /tmp/codex_clean.json to the live card text in the published
 * sync-v2 release. Read-only.
 *
 *   npx tsx scripts/build-codex-refill-worklist.ts [--codex=/tmp/codex_clean.json] [--out=tmp/codex-refill/worklist.json]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
// @ts-expect-error Direct Node strip-types runner imports TypeScript source.
import { fieldsFromSnapshot, plainText, restatesCardQuestion } from "../src/lib/education/orthobullets-enrichment-packet.ts";

type Row = Record<string, any>;

function loadEnv(file: string) {
  if (!existsSync(file)) return {} as Record<string, string>;
  return Object.fromEntries(
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith("#") && line.includes("="))
      .map((line) => {
        const at = line.indexOf("=");
        return [line.slice(0, at).trim(), line.slice(at + 1).trim().replace(/^['"]|['"]$/g, "")];
      }),
  ) as Record<string, string>;
}

function dbClient(): SupabaseClient {
  const values = { ...loadEnv(path.resolve(".env.local")), ...process.env };
  const url = values.NEXT_PUBLIC_SUPABASE_URL;
  const key = values.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function allRows(db: SupabaseClient, table: string, select: string, filter: (q: any) => any = (q) => q): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const response = await filter(db.from(table).select(select).range(from, from + 999));
    if (response.error) throw new Error(`${table}:${response.error.message}`);
    rows.push(...(response.data ?? []));
    if (!response.data || response.data.length < 1000) return rows;
  }
}

async function main() {
  const args = new Map(process.argv.slice(2).map((v) => {
    const at = v.indexOf("=");
    return at < 0 ? [v, "true"] : [v.slice(0, at), v.slice(at + 1)];
  }));
  const codexPath = args.get("--codex") ?? "/tmp/codex_clean.json";
  const outPath = path.resolve(args.get("--out") ?? "tmp/codex-refill/worklist.json");
  const codex = JSON.parse(readFileSync(codexPath, "utf8")) as Record<string, { link: string; bullets: string[] }>;
  const codexGuids = new Set(Object.keys(codex));

  const db = dbClient();
  const release = (await db
    .from("anki_sync_v2_releases")
    .select("*")
    .eq("status", "published")
    .order("release_sequence", { ascending: false })
    .limit(1)
    .maybeSingle()).data as Row;
  if (!release) throw new Error("published_sync_v2_release_not_found");

  const members = await allRows(db, "anki_sync_v2_release_notes", "note_id,note_version_id", (q) => q.eq("release_id", release.id));
  const notes = await allRows(db, "anki_sync_v2_notes", "id,stable_guid,status");
  const noteById = new Map(notes.map((r) => [r.id, r]));
  const versionIds = members.map((m) => m.note_version_id);
  const versionById = new Map<string, Row>();
  for (let i = 0; i < versionIds.length; i += 100) {
    const resp = await db
      .from("anki_sync_v2_note_versions")
      .select("id,field_snapshot,deck_path,content_checksum")
      .in("id", versionIds.slice(i, i + 100));
    if (resp.error) throw new Error(resp.error.message);
    for (const v of resp.data ?? []) versionById.set(v.id, v);
  }

  const work: any[] = [];
  let matched = 0;
  let stillEcho = 0;
  for (const m of members) {
    const note = noteById.get(m.note_id);
    if (!note || !codexGuids.has(note.stable_guid)) continue;
    matched += 1;
    const version = versionById.get(m.note_version_id);
    const fields = fieldsFromSnapshot(version?.field_snapshot);
    const front = plainText(fields.Text ?? fields.Front ?? "");
    const extra = plainText(fields.Extra ?? "");
    const codexEntry = codex[note.stable_guid];
    const isEcho = (codexEntry.bullets ?? []).some((b) => restatesCardQuestion(b, front));
    if (isEcho) stillEcho += 1;
    work.push({
      noteGuid: note.stable_guid,
      deckPath: String(version?.deck_path ?? ""),
      front,
      extra,
      currentLink: codexEntry.link,
      currentBullets: codexEntry.bullets,
      isQuestionEcho: isEcho,
    });
  }

  work.sort((a, b) => Number(b.isQuestionEcho) - Number(a.isQuestionEcho) || a.deckPath.localeCompare(b.deckPath));
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify({ releaseVersion: release.release_version, total: work.length, questionEchoes: stillEcho, cards: work }, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ codexGuids: codexGuids.size, matched, questionEchoes: stillEcho, out: outPath }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
