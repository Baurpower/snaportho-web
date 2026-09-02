/**
 * Miller's Review enrichment runner (self-contained, review-gated).
 *
 * No external API is used. An LLM operator (Claude Code in this session, Codex, or
 * Grok) reads the brief and writes a sidecar of fills; `apply-sidecar` merges it.
 *
 * Commands:
 *   --command=audit         Count blank vs. filled `Millers` across the published release.
 *   --command=build         Select blank-`Millers` cards, retrieve PDF candidates, write a
 *                           sealed pending packet + a brief (with source passages) + a
 *                           sidecar template for the operator to fill.
 *   --command=apply-sidecar Merge an operator-filled sidecar into a reviewed packet.
 *
 * Then a human reviews the reviewed packet; publish with scripts/publish-millers-overlay.ts.
 *
 * Retrieval source of truth: the Miller's corpus JSON built by
 *   scripts/lib/education/millers_extract.py  (see tmp/millers-enrichment/index/).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
// @ts-expect-error Direct Node strip-types runner imports TypeScript source.
import {
  MILLERS_ENRICHMENT_CONTRACT,
  MILLERS_ENRICHMENT_RUN_KEY,
  applyMillersSidecar,
  briefPacketFileName,
  fieldsFromSnapshot,
  isBlankResource,
  pendingPacketFileName,
  plainText,
  reviewedPacketFileName,
  searchQueryForCard,
  sealEnrichmentPacket,
  sidecarPacketFileName,
  type MillersEnrichmentCard,
  type MillersEnrichmentPacket,
  type MillersEnrichmentSidecar,
} from "../src/lib/education/millers-enrichment-packet.ts";
// @ts-expect-error Direct Node strip-types runner imports TypeScript source.
import { loadMillersIndex, type LoadedIndex } from "../src/lib/education/millers-retrieval.ts";

type Row = Record<string, any>;
type Args = Map<string, string>;

const DEFAULT_CORPUS = "tmp/millers-enrichment/index/millers-corpus.json";
const CANDIDATES_PER_CARD = 4;

function parseArgs(values: string[]): Args {
  const result = new Map<string, string>();
  for (const value of values) {
    if (!value.startsWith("--")) continue;
    const at = value.indexOf("=");
    result.set(at < 0 ? value : value.slice(0, at), at < 0 ? "true" : value.slice(at + 1));
  }
  return result;
}

function loadEnv(file: string): Record<string, string> {
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith("#") && line.includes("="))
      .map((line) => {
        const at = line.indexOf("=");
        return [line.slice(0, at).trim(), line.slice(at + 1).trim().replace(/^['"]|['"]$/g, "")];
      }),
  );
}

function writeJson(filePath: string, value: unknown) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
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

async function loadPublishedRelease(db: SupabaseClient, args: Args): Promise<Row> {
  const requestedVersion = args.get("--release-version");
  let query = db.from("anki_sync_v2_releases").select("*");
  query = requestedVersion
    ? query.eq("release_version", requestedVersion)
    : query.eq("status", "published").order("release_sequence", { ascending: false }).limit(1);
  const result = await query.maybeSingle();
  if (result.error) throw new Error(`sync_v2_release_lookup_failed:${result.error.message}`);
  if (!result.data || result.data.status !== "published") throw new Error("published_sync_v2_release_not_found");
  return result.data as Row;
}

async function loadOfficialNotes(db: SupabaseClient, release: Row) {
  const members = await allRows(db, "anki_sync_v2_release_notes", "note_id,note_version_id,ordering_key", (q) =>
    q.eq("release_id", release.id).order("ordering_key"));
  const notes = await allRows(db, "anki_sync_v2_notes", "id,stable_guid,status");
  const noteById = new Map(notes.map((r) => [r.id, r]));
  const versions: Row[] = [];
  const versionIds = members.map((r) => r.note_version_id);
  for (let offset = 0; offset < versionIds.length; offset += 100) {
    const response = await db.from("anki_sync_v2_note_versions")
      .select("id,note_id,field_snapshot,governed_tags,content_checksum,deck_path")
      .in("id", versionIds.slice(offset, offset + 100));
    if (response.error) throw new Error(`sync_v2_note_versions_read_failed:${response.error.message}`);
    versions.push(...(response.data ?? []));
  }
  const versionById = new Map(versions.map((r) => [r.id, r]));
  return members.map((member) => {
    const note = noteById.get(member.note_id);
    const version = versionById.get(member.note_version_id);
    if (!note || !version) throw new Error(`missing_official_note:${member.note_id}`);
    return { member, note, version, fields: fieldsFromSnapshot(version.field_snapshot) };
  });
}

function baseCard(row: Awaited<ReturnType<typeof loadOfficialNotes>>[number]): MillersEnrichmentCard {
  const front = plainText(row.fields.Text ?? row.fields.Front ?? "");
  const extra = plainText(row.fields.Extra ?? "");
  return {
    noteId: String(row.note.id),
    noteVersionId: String(row.version.id),
    stableGuid: String(row.note.stable_guid),
    contentChecksum: String(row.version.content_checksum),
    deckPath: String(row.version.deck_path),
    front,
    extra,
    governedTags: Array.isArray(row.version.governed_tags) ? row.version.governed_tags.map(String) : [],
    currentMillers: row.fields.Millers ?? "",
    searchQuery: searchQueryForCard(row.fields.Text ?? front, row.fields.Extra ?? "", String(row.version.deck_path)),
    candidates: [],
  };
}

async function commandAudit(db: SupabaseClient, args: Args) {
  const release = await loadPublishedRelease(db, args);
  const notes = await loadOfficialNotes(db, release);
  let filled = 0;
  for (const row of notes) if (!isBlankResource(row.fields.Millers)) filled += 1;
  const summary = {
    authoritativeSource: "anki_sync_v2",
    releaseVersion: release.release_version,
    releaseId: release.id,
    notes: notes.length,
    millersFilled: filled,
    millersBlank: notes.length - filled,
  };
  console.log(JSON.stringify(summary, null, 2));
}

async function commandBuild(db: SupabaseClient, args: Args) {
  const release = await loadPublishedRelease(db, args);
  const notes = await loadOfficialNotes(db, release);
  const ix = loadMillersIndex(path.resolve(args.get("--corpus") ?? DEFAULT_CORPUS));
  const limit = args.get("--limit") ? Number(args.get("--limit")) : Infinity;
  const outDir = path.resolve(args.get("--out") ?? `tmp/millers-enrichment/${release.release_version}`);

  // Exclude cards already authored in prior reviewed packets in this dir. Unpublished
  // fills still read as blank in the DB, so without this a new batch re-pulls them.
  const already = new Set<string>();
  if (existsSync(outDir)) {
    for (const name of readdirSync(outDir)) {
      if (!/-reviewed\.json$/.test(name)) continue;
      const prior = JSON.parse(readFileSync(path.join(outDir, name), "utf8")) as MillersEnrichmentPacket;
      for (const c of prior.cards ?? []) already.add(c.stableGuid);
    }
  }

  const blank = notes.filter((row) => isBlankResource(row.fields.Millers) && !already.has(String(row.note.stable_guid)));
  const selected = blank.slice(0, Number.isFinite(limit) ? limit : blank.length);
  const cards: MillersEnrichmentCard[] = selected.map((row) => {
    const card = baseCard(row);
    card.candidates = ix.retrieve(card.searchQuery, CANDIDATES_PER_CARD);
    return card;
  });

  const batchKey = args.get("--batch-key") ?? `${release.release_version}-${new Date().toISOString().slice(0, 10)}`;
  const instructions = [
    "Source of truth: Miller's Review of Orthopaedics, 8th ed. (retrieved passages only).",
    "Write an ORIGINAL teaching summary in your own words — never copy sentences verbatim.",
    "Anchor the summary to the card's front so it reinforces that specific teaching point.",
    "Cite the printed page of the passage you used (printedPage). Use a range only if warranted.",
    "If no retrieved passage clearly covers the card, skip it with skipReason=no_matching_content.",
  ];
  const packet = sealEnrichmentPacket({
    schemaVersion: MILLERS_ENRICHMENT_CONTRACT,
    runKey: MILLERS_ENRICHMENT_RUN_KEY,
    sourceReleaseId: String(release.id),
    sourceReleaseVersion: String(release.release_version),
    corpusChecksum: ix.corpusChecksum,
    batchKey,
    instructions,
    cards,
  });

  const pendingPath = path.join(outDir, pendingPacketFileName(batchKey));
  const briefPath = path.join(outDir, briefPacketFileName(batchKey));
  const sidecarPath = path.join(outDir, sidecarPacketFileName(batchKey));
  writeJson(pendingPath, packet);
  // Brief carries the source passages so an offline operator can write original prose.
  writeJson(briefPath, {
    batchKey,
    inputChecksum: packet.inputChecksum,
    corpusChecksum: ix.corpusChecksum,
    instructions,
    sidecarSchema: {
      allowedPrintedPagesPerCard: "choose printedPage from this card's candidates only",
      card: { stableGuid: "string", status: "\"filled\"|\"skipped\"", skipReason: "if skipped", summary: "40-900 chars, ORIGINAL prose", printedPage: "integer from candidates", printedPageEnd: "optional", sectionPath: "optional", evidence: "<=240-char source quote, reviewer-only" },
    },
    cards: cards.map((c) => ({
      stableGuid: c.stableGuid,
      front: c.front,
      deckPath: c.deckPath,
      allowedPrintedPages: c.candidates.map((cand) => cand.printedPage).filter((p) => p !== null),
      passages: c.candidates.map((cand) => ({
        printedPage: cand.printedPage,
        sectionPath: cand.sectionPath,
        score: cand.score,
        text: passageForCandidate(ix, cand.pdfPage),
      })),
    })),
  });
  // Sidecar template: operator fills status/summary/printedPage per card, in place.
  const template: MillersEnrichmentSidecar = {
    batchKey,
    inputChecksum: packet.inputChecksum,
    operator: { provider: "REPLACE_ME", model: "REPLACE_ME", generatedAt: "REPLACE_ME_ISO8601" },
    cards: cards.map((c) => ({ stableGuid: c.stableGuid, status: "filled" })),
  };
  writeJson(sidecarPath, template);
  console.log(JSON.stringify({
    releaseVersion: release.release_version,
    blank: blank.length,
    selected: cards.length,
    pending: pendingPath,
    brief: briefPath,
    sidecarTemplate: sidecarPath,
    corpusChecksum: ix.corpusChecksum.slice(0, 12),
  }, null, 2));
}

/** Full page window around the query hit, for the generator's source context. */
function passageForCandidate(ix: LoadedIndex, pdfPage: number): string {
  const page = ix.corpus.pages.find((p: any) => p.pdf_page === pdfPage);
  return page ? String(page.text).slice(0, 1600) : "";
}

async function commandApplySidecar(args: Args) {
  const pendingPath = path.resolve(required(args, "--pending"));
  const sidecarPath = path.resolve(required(args, "--sidecar"));
  const packet = JSON.parse(readFileSync(pendingPath, "utf8")) as MillersEnrichmentPacket;
  if (packet.schemaVersion !== MILLERS_ENRICHMENT_CONTRACT) throw new Error("unsupported_packet_version");
  const sidecar = JSON.parse(readFileSync(sidecarPath, "utf8")) as MillersEnrichmentSidecar;
  const reviewed = applyMillersSidecar(packet, sidecar);
  const filled = reviewed.cards.filter((c) => c.enrichmentStatus === "filled").length;
  const skipped = reviewed.cards.filter((c) => c.enrichmentStatus === "skipped").length;
  const outPath = path.resolve(args.get("--out") ?? path.join(path.dirname(pendingPath), reviewedPacketFileName(packet.batchKey)));
  writeJson(outPath, reviewed);
  console.log(JSON.stringify({ wrote: outPath, filled, skipped, operator: sidecar.operator }, null, 2));
}

function required(args: Args, name: string): string {
  const value = args.get(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args.get("--command");
  if (command === "apply-sidecar") return commandApplySidecar(args);
  const db = dbClient();
  if (command === "audit") return commandAudit(db, args);
  if (command === "build") return commandBuild(db, args);
  throw new Error("usage: --command=audit|build|apply-sidecar");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
