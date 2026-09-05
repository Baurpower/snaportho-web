/**
 * ROCK curriculum enrichment runner (self-contained, review-gated).
 *
 * No external API is used. An LLM operator (Grok in-session) reads the brief
 * and writes a sidecar; apply-sidecar merges it. ROCK / ROCK_Link are resource
 * fields composed later by scripts/publish-rock-overlay.ts.
 *
 * Commands:
 *   --command=index         Extract local PDFs via rock_extract.py
 *   --command=audit         Count blank vs filled ROCK across the published release
 *   --command=export-map    Stage A packets: top chapter candidates per blank card
 *   --command=export-fill   Stage B packets from mapped reviewed packets
 *   --command=apply-sidecar Merge a map or fill sidecar into a reviewed packet
 *   --command=validate-sidecar  Apply without writing
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
// @ts-expect-error Direct Node strip-types runner imports TypeScript source.
import {
  ROCK_ENRICHMENT_CONTRACT,
  ROCK_FILL_RUN_KEY,
  ROCK_MAP_RUN_KEY,
  applyRockFillSidecar,
  applyRockMapSidecar,
  briefPacketFileName,
  buildFillBrief,
  buildMapBrief,
  fieldsFromSnapshot,
  isBlankResource,
  isPendingPacketFileName,
  pendingPacketFileName,
  plainText,
  reviewedPacketFileName,
  searchQueryForCard,
  sealFillPacket,
  sealMapPacket,
  sidecarPacketFileName,
  type RockFillCard,
  type RockFillPacket,
  type RockFillSidecar,
  type RockMapCard,
  type RockMapPacket,
  type RockMapSidecar,
  type RockMappedChapter,
} from "../src/lib/education/rock-enrichment-packet.ts";
// @ts-expect-error Direct Node strip-types runner imports TypeScript source.
import { loadRockIndex, type LoadedRockIndex } from "../src/lib/education/rock-retrieval.ts";

type Row = Record<string, any>;
type Args = Map<string, string>;

const DEFAULT_INDEX = "tmp/rock-enrichment/index";
const MAP_CANDIDATES = 12;
// The plain query (front + extra only) is the regression-proof baseline: its
// top candidates are always kept. Tag-enriched retrieval then fills the
// remaining slots with chapters it surfaces that the plain query missed, so
// governed tags can only add recall, never displace a good plain candidate.
const MAP_BASELINE_CANDIDATES = 8;

function mapCandidatesForCard(
  ix: LoadedRockIndex,
  card: ReturnType<typeof baseMapCard>,
): ReturnType<LoadedRockIndex["retrieveChapters"]> {
  const plainQuery = searchQueryForCard(card.front, card.extra, card.deckPath, []);
  const baseline = ix.retrieveChapters(plainQuery, MAP_BASELINE_CANDIDATES);
  if (card.searchQuery === plainQuery) return baseline.slice(0, MAP_CANDIDATES);
  const enriched = ix.retrieveChapters(card.searchQuery, MAP_CANDIDATES);
  const merged = [...baseline];
  const have = new Set(baseline.map((c) => c.id));
  for (const cand of enriched) {
    if (merged.length >= MAP_CANDIDATES) break;
    if (have.has(cand.id)) continue;
    have.add(cand.id);
    merged.push(cand);
  }
  return merged.sort((a, b) => b.score - a.score);
}
const PAGES_PER_CHAPTER = 4;

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

function required(args: Args, name: string): string {
  const value = args.get(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
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

function baseMapCard(row: Awaited<ReturnType<typeof loadOfficialNotes>>[number]): Omit<RockMapCard, "candidates"> {
  const front = plainText(row.fields.Text ?? row.fields.Front ?? "");
  const extra = plainText(row.fields.Extra ?? "");
  const governedTags = Array.isArray(row.version.governed_tags) ? row.version.governed_tags.map(String) : [];
  return {
    noteId: String(row.note.id),
    noteVersionId: String(row.version.id),
    stableGuid: String(row.note.stable_guid),
    contentChecksum: String(row.version.content_checksum),
    deckPath: String(row.version.deck_path),
    front,
    extra,
    governedTags,
    currentRock: row.fields.ROCK ?? "",
    currentRockLink: row.fields.ROCK_Link ?? "",
    searchQuery: searchQueryForCard(row.fields.Text ?? front, row.fields.Extra ?? "", String(row.version.deck_path), governedTags),
  };
}

function loadIndex(args: Args): LoadedRockIndex {
  const indexDir = path.resolve(args.get("--index") ?? DEFAULT_INDEX);
  if (!existsSync(path.join(indexDir, "catalog.json"))) {
    throw new Error(`rock_index_missing:${indexDir} (run --command=index)`);
  }
  return loadRockIndex(indexDir);
}

function guidsAlready(outDir: string, suffix: string): Set<string> {
  const already = new Set<string>();
  if (!existsSync(outDir)) return already;
  for (const name of readdirSync(outDir)) {
    if (!name.endsWith(suffix)) continue;
    const prior = JSON.parse(readFileSync(path.join(outDir, name), "utf8")) as { cards?: Array<{ stableGuid?: string }> };
    for (const c of prior.cards ?? []) if (c.stableGuid) already.add(c.stableGuid);
  }
  return already;
}

function commandIndex(args: Args) {
  const script = path.resolve("scripts/lib/education/rock_extract.py");
  const out = args.get("--out") ?? DEFAULT_INDEX;
  const library = args.get("--library");
  const pyArgs = ["python3", script, "--out", path.resolve(out)];
  if (library) pyArgs.push("--library", path.resolve(library));
  if (args.get("--limit")) pyArgs.push("--limit", String(args.get("--limit")));
  if (args.get("--ids")) pyArgs.push("--ids", String(args.get("--ids")));
  const result = spawnSync(pyArgs[0], pyArgs.slice(1), { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`rock_extract_failed:${result.status}`);
}

async function commandAudit(db: SupabaseClient, args: Args) {
  const release = await loadPublishedRelease(db, args);
  const notes = await loadOfficialNotes(db, release);
  let rock = 0;
  let links = 0;
  let both = 0;
  for (const row of notes) {
    const hasRock = !isBlankResource(row.fields.ROCK);
    const hasLink = !isBlankResource(row.fields.ROCK_Link);
    if (hasRock) rock += 1;
    if (hasLink) links += 1;
    if (hasRock && hasLink) both += 1;
  }
  const summary = {
    authoritativeSource: "anki_sync_v2",
    releaseVersion: release.release_version,
    releaseId: release.id,
    notes: notes.length,
    rockFilled: rock,
    rockLinkFilled: links,
    bothFilled: both,
    neitherFilled: notes.length - rock - links + both,
  };
  console.log(JSON.stringify(summary, null, 2));
}

async function commandExportMap(db: SupabaseClient, args: Args) {
  const release = await loadPublishedRelease(db, args);
  const notes = await loadOfficialNotes(db, release);
  const ix = loadIndex(args);
  const skipFilled = args.get("--skip-filled") !== "false";
  const packetSize = Number(args.get("--packet-size") ?? 10);
  const agents = Number(args.get("--agents") ?? 20);
  const limit = args.has("--limit") ? Number(args.get("--limit")) : undefined;
  const offset = Number(args.get("--offset") ?? 0);
  if (!Number.isInteger(packetSize) || packetSize < 1 || packetSize > 20) throw new Error("invalid_packet_size");
  if (!Number.isInteger(agents) || agents < 1 || agents > 40) throw new Error("invalid_agents");

  const cohortNumber = Number(args.get("--cohort") ?? 1);
  const out = path.resolve(
    args.get("--out") ?? `tmp/rock-enrichment/${release.release_version}/map-cohort-${String(cohortNumber).padStart(6, "0")}`,
  );
  const already = guidsAlready(out, "-reviewed.json");
  const eligible = notes.filter((row) => {
    if (already.has(String(row.note.stable_guid))) return false;
    if (!skipFilled) return true;
    return isBlankResource(row.fields.ROCK) || isBlankResource(row.fields.ROCK_Link);
  });
  const selected = eligible.slice(offset, limit == null ? undefined : offset + limit);
  mkdirSync(out, { recursive: true });
  const actualAgents = Math.min(agents, Math.ceil(selected.length / packetSize) || 0);
  const packets: Array<{ batchKey: string; cards: number; pending: string; brief: string }> = [];
  const instructions = [
    "Source of truth: the candidate ROCK chapters in this brief. Do not invent chapter IDs.",
    "Pick 1–3 chapters from this card's candidates. First is primary; others must independently teach the cloze.",
    "Do not attach alias duplicates of the same title. Skip when no candidate honestly teaches this cloze.",
    "Do not edit Extra, Text, tags, identities, or checksums. Do not fetch rock.aaos.org.",
  ];
  for (let agentIndex = 0; agentIndex < actualAgents; agentIndex += 1) {
    const slice = selected.slice(agentIndex * packetSize, (agentIndex + 1) * packetSize);
    if (!slice.length) continue;
    const batchKey = `map-${String(cohortNumber).padStart(6, "0")}-agent-${String(agentIndex + 1).padStart(2, "0")}`;
    const cards: RockMapCard[] = slice.map((row) => {
      const card = baseMapCard(row);
      return { ...card, candidates: mapCandidatesForCard(ix, card) };
    });
    const packet = sealMapPacket({
      schemaVersion: ROCK_ENRICHMENT_CONTRACT,
      runKey: ROCK_MAP_RUN_KEY,
      stage: "map",
      sourceReleaseId: String(release.id),
      sourceReleaseVersion: String(release.release_version),
      corpusChecksum: ix.catalogChecksum,
      batchKey,
      instructions,
      cards,
    });
    const pendingPath = path.join(out, pendingPacketFileName(batchKey));
    const briefPath = path.join(out, briefPacketFileName(batchKey));
    const sidecarPath = path.join(out, sidecarPacketFileName(batchKey));
    if (!existsSync(pendingPath)) writeJson(pendingPath, packet);
    if (!existsSync(briefPath)) writeJson(briefPath, buildMapBrief(packet));
    if (!existsSync(sidecarPath)) {
      writeJson(sidecarPath, {
        batchKey,
        inputChecksum: packet.inputChecksum,
        reviewer: { provider: "REPLACE_ME", model: "REPLACE_ME", reviewedAt: "REPLACE_ME_ISO8601" },
        cards: cards.map((c) => ({ stableGuid: c.stableGuid, status: "mapped", chapters: [] })),
      });
    }
    packets.push({ batchKey, cards: packet.cards.length, pending: pendingPath, brief: briefPath });
  }
  const manifest = {
    contract: ROCK_ENRICHMENT_CONTRACT,
    runKey: ROCK_MAP_RUN_KEY,
    stage: "map",
    sourceReleaseId: release.id,
    sourceReleaseVersion: release.release_version,
    corpusChecksum: ix.catalogChecksum,
    skipFilled,
    eligible: eligible.length,
    exported: selected.length,
    packets,
  };
  writeJson(path.join(out, "manifest.json"), manifest);
  console.log(JSON.stringify({ ...manifest, out, packets: packets.length }, null, 2));
}

function loadMappedCards(input: string): Map<string, { card: RockMapCard; sourceReleaseId: string; sourceReleaseVersion: string }> {
  const start = path.resolve(input);
  const files: string[] = [];
  if (statSync(start).isFile()) files.push(start);
  else {
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (name.endsWith("-verified.json") || name.endsWith("-reviewed.json")) files.push(full);
      }
    };
    walk(start);
  }
  const verified = files.filter((f) => f.endsWith("-verified.json"));
  const use = verified.length ? verified : files.filter((f) => f.endsWith("-reviewed.json"));
  const out = new Map<string, { card: RockMapCard; sourceReleaseId: string; sourceReleaseVersion: string }>();
  for (const file of use.sort()) {
    const packet = JSON.parse(readFileSync(file, "utf8")) as RockMapPacket;
    if (packet.stage !== "map") continue;
    for (const card of packet.cards) {
      if (card.enrichmentStatus !== "mapped" || !card.chapters?.length) continue;
      if (out.has(card.stableGuid)) continue;
      out.set(card.stableGuid, {
        card,
        sourceReleaseId: packet.sourceReleaseId,
        sourceReleaseVersion: packet.sourceReleaseVersion,
      });
    }
  }
  return out;
}

async function commandExportFill(db: SupabaseClient, args: Args) {
  const release = await loadPublishedRelease(db, args);
  const notes = await loadOfficialNotes(db, release);
  const ix = loadIndex(args);
  const mapped = loadMappedCards(required(args, "--mapped"));
  const packetSize = Number(args.get("--packet-size") ?? 5);
  const agents = Number(args.get("--agents") ?? 20);
  const limit = args.has("--limit") ? Number(args.get("--limit")) : undefined;
  const offset = Number(args.get("--offset") ?? 0);
  if (!Number.isInteger(packetSize) || packetSize < 1 || packetSize > 20) throw new Error("invalid_packet_size");
  if (!Number.isInteger(agents) || agents < 1 || agents > 40) throw new Error("invalid_agents");

  const cohortNumber = Number(args.get("--cohort") ?? 1);
  const out = path.resolve(
    args.get("--out") ?? `tmp/rock-enrichment/${release.release_version}/fill-cohort-${String(cohortNumber).padStart(6, "0")}`,
  );
  const already = new Set([
    ...guidsAlready(out, "-reviewed.json"),
    ...guidsAlready(out, "-verified.json"),
  ]);
  const noteByGuid = new Map(notes.map((row) => [String(row.note.stable_guid), row]));
  const selected: Array<{ row: Awaited<ReturnType<typeof loadOfficialNotes>>[number]; mapped: RockMappedChapter[]; searchQuery: string }> = [];
  for (const [guid, mappedRow] of mapped) {
    if (already.has(guid)) continue;
    const row = noteByGuid.get(guid);
    if (!row) continue;
    if (!isBlankResource(row.fields.ROCK) && !isBlankResource(row.fields.ROCK_Link) && args.get("--skip-filled") !== "false") {
      continue;
    }
    selected.push({ row, mapped: mappedRow.card.chapters!, searchQuery: mappedRow.card.searchQuery });
  }
  const sliced = selected.slice(offset, limit == null ? undefined : offset + limit);
  mkdirSync(out, { recursive: true });
  const actualAgents = Math.min(agents, Math.ceil(sliced.length / packetSize) || 0);
  const packets: Array<{ batchKey: string; cards: number; pending: string; brief: string }> = [];
  const instructions = [
    "Source of truth: retrieved ROCK PDF passages for the mapped chapters only.",
    "Write ORIGINAL SnapOrtho teaching bullets. Never copy AAOS sentences.",
    "Primary chapter (first) needs 2–6 cloze-specific bullets. Secondaries must earn their slot or be omitted.",
    "Do not invent chapter IDs or URLs. Do not fetch rock.aaos.org. Do not edit Extra.",
    "Skip the card when none of the passages teach this cloze.",
  ];
  for (let agentIndex = 0; agentIndex < actualAgents; agentIndex += 1) {
    const slice = sliced.slice(agentIndex * packetSize, (agentIndex + 1) * packetSize);
    if (!slice.length) continue;
    const batchKey = `fill-${String(cohortNumber).padStart(6, "0")}-agent-${String(agentIndex + 1).padStart(2, "0")}`;
    const cards: RockFillCard[] = slice.map((item) => {
      const base = baseMapCard(item.row);
      const pageCandidates = item.mapped.flatMap((ch) => ix.retrievePages(ch.id, item.searchQuery, PAGES_PER_CHAPTER));
      return {
        ...base,
        mappedChapters: item.mapped,
        pageCandidates,
      };
    });
    const packet = sealFillPacket({
      schemaVersion: ROCK_ENRICHMENT_CONTRACT,
      runKey: ROCK_FILL_RUN_KEY,
      stage: "fill",
      sourceReleaseId: String(release.id),
      sourceReleaseVersion: String(release.release_version),
      corpusChecksum: ix.catalogChecksum,
      batchKey,
      instructions,
      cards,
    });
    const pendingPath = path.join(out, pendingPacketFileName(batchKey));
    const briefPath = path.join(out, briefPacketFileName(batchKey));
    const sidecarPath = path.join(out, sidecarPacketFileName(batchKey));
    if (!existsSync(pendingPath)) writeJson(pendingPath, packet);
    if (!existsSync(briefPath)) writeJson(briefPath, buildFillBrief(packet, (id, page) => ix.passage(id, page)));
    if (!existsSync(sidecarPath)) {
      writeJson(sidecarPath, {
        batchKey,
        inputChecksum: packet.inputChecksum,
        reviewer: { provider: "REPLACE_ME", model: "REPLACE_ME", reviewedAt: "REPLACE_ME_ISO8601" },
        cards: cards.map((c) => ({
          stableGuid: c.stableGuid,
          status: "filled",
          chapters: c.mappedChapters.map((ch) => ({ id: ch.id, bullets: [] })),
        })),
      });
    }
    packets.push({ batchKey, cards: packet.cards.length, pending: pendingPath, brief: briefPath });
  }
  const manifest = {
    contract: ROCK_ENRICHMENT_CONTRACT,
    runKey: ROCK_FILL_RUN_KEY,
    stage: "fill",
    sourceReleaseId: release.id,
    sourceReleaseVersion: release.release_version,
    corpusChecksum: ix.catalogChecksum,
    mapped: mapped.size,
    exported: sliced.length,
    packets,
  };
  writeJson(path.join(out, "manifest.json"), manifest);
  console.log(JSON.stringify({ ...manifest, out, packets: packets.length }, null, 2));
}

function commandApplySidecar(args: Args, write: boolean) {
  const pendingPath = path.resolve(required(args, write ? "--pending" : "--packet"));
  const sidecarPath = path.resolve(required(args, "--sidecar"));
  const packet = JSON.parse(readFileSync(pendingPath, "utf8")) as RockMapPacket | RockFillPacket;
  if (packet.schemaVersion !== ROCK_ENRICHMENT_CONTRACT) throw new Error("unsupported_packet_version");
  const sidecar = JSON.parse(readFileSync(sidecarPath, "utf8")) as RockMapSidecar | RockFillSidecar;
  let merged: RockMapPacket | RockFillPacket;
  if (packet.stage === "map") {
    merged = applyRockMapSidecar(packet, sidecar as RockMapSidecar);
  } else if (packet.stage === "fill") {
    merged = applyRockFillSidecar(packet, sidecar as RockFillSidecar);
  } else {
    throw new Error("unknown_packet_stage");
  }
  const filled = merged.cards.filter((c) => c.enrichmentStatus === "filled" || c.enrichmentStatus === "mapped").length;
  const skipped = merged.cards.filter((c) => c.enrichmentStatus === "skipped").length;
  if (write) {
    const outPath = path.resolve(args.get("--out") ?? path.join(path.dirname(pendingPath), reviewedPacketFileName(packet.batchKey)));
    writeJson(outPath, merged);
    console.log(JSON.stringify({
      merged: true,
      out: outPath,
      stage: packet.stage,
      cards: merged.cards.length,
      filled,
      skipped,
    }, null, 2));
    return;
  }
  console.log(JSON.stringify({
    ok: true,
    batchKey: merged.batchKey,
    stage: packet.stage,
    cards: merged.cards.length,
    filled,
    skipped,
  }, null, 2));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args.get("--command");
  if (command === "index") return commandIndex(args);
  if (command === "apply-sidecar") return commandApplySidecar(args, true);
  if (command === "validate-sidecar") return commandApplySidecar(args, false);
  const db = dbClient();
  if (command === "audit") return commandAudit(db, args);
  if (command === "export-map") return commandExportMap(db, args);
  if (command === "export-fill") return commandExportFill(db, args);
  throw new Error("usage: --command=index|audit|export-map|export-fill|apply-sidecar|validate-sidecar");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
