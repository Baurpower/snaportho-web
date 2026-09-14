/**
 * Nailed It Ortho enrichment runner (self-contained, review-gated).
 *
 * Index builds a local RSS+WordPress catalog. Map/fill packets are sealed for a
 * Grok operator who writes a sidecar; apply-sidecar merges it. Nailed_It /
 * Nailed_It_Link are composed later by scripts/publish-nailed-it-overlay.ts.
 *
 * Commands:
 *   --command=index         Fetch RSS + WP, join, write tmp/nailed-it-enrichment/index
 *   --command=audit         Count blank vs filled Nailed_It across the published release
 *   --command=export-map    Stage A packets: top episode candidates per blank card
 *   --command=export-fill   Stage B packets from mapped reviewed packets
 *   --command=apply-sidecar Merge a map or fill sidecar into a reviewed packet
 *   --command=validate-sidecar  Apply without writing
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
// @ts-expect-error Direct Node strip-types runner imports TypeScript source.
import {
  BODY_INDEX_CHARS,
  RSS_FEED_URLS,
  WP_CATEGORIES_URL,
  WP_POSTS_URL,
  episodeFileName,
  joinCatalog,
  parseRss,
  parseWpCategories,
  parseWpPosts,
  type NailedItCatalog,
  type NailedItEpisode,
} from "../src/lib/education/nailed-it-index.ts";
// @ts-expect-error Direct Node strip-types runner imports TypeScript source.
import { loadNailedItIndex, type LoadedNailedItIndex } from "../src/lib/education/nailed-it-retrieval.ts";
// @ts-expect-error Direct Node strip-types runner imports TypeScript source.
import {
  NAILED_IT_ENRICHMENT_CONTRACT,
  NAILED_IT_FILL_RUN_KEY,
  NAILED_IT_MAP_RUN_KEY,
  applyNailedItFillSidecar,
  applyNailedItMapSidecar,
  briefPacketFileName,
  decideNailedItFill,
  decideNailedItMap,
  buildFillBrief,
  buildMapBrief,
  fieldsFromSnapshot,
  isBlankResource,
  pendingPacketFileName,
  plainText,
  reviewedPacketFileName,
  searchQueryForCard,
  sealFillPacket,
  sealMapPacket,
  sidecarPacketFileName,
  type NailedItFillCard,
  type NailedItFillPacket,
  type NailedItFillSidecar,
  type NailedItMapCard,
  type NailedItMapPacket,
  type NailedItMapSidecar,
  type NailedItMappedEpisode,
} from "../src/lib/education/nailed-it-enrichment-packet.ts";

type Row = Record<string, any>;
type Args = Map<string, string>;

const DEFAULT_INDEX = "tmp/nailed-it-enrichment/index";
const MAP_CANDIDATES = 12;
const MAP_BASELINE_CANDIDATES = 8;
const USER_AGENT = "SnapOrthoNailedItIndexer/1.0 (educational catalog; +https://snaportho.com)";

function mapCandidatesForCard(
  ix: LoadedNailedItIndex,
  card: ReturnType<typeof baseMapCard>,
) {
  const plainQuery = searchQueryForCard(card.front, card.extra, card.deckPath, []);
  const baseline = ix.retrieveEpisodes(plainQuery, MAP_BASELINE_CANDIDATES);
  if (card.searchQuery === plainQuery) return baseline.slice(0, MAP_CANDIDATES);
  const enriched = ix.retrieveEpisodes(card.searchQuery, MAP_CANDIDATES);
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

function baseMapCard(row: Awaited<ReturnType<typeof loadOfficialNotes>>[number]): Omit<NailedItMapCard, "candidates"> {
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
    currentNailedIt: row.fields.Nailed_It ?? "",
    currentNailedItLink: row.fields.Nailed_It_Link ?? "",
    searchQuery: searchQueryForCard(row.fields.Text ?? front, row.fields.Extra ?? "", String(row.version.deck_path), governedTags),
  };
}

function loadIndex(args: Args): LoadedNailedItIndex {
  const indexDir = path.resolve(args.get("--index") ?? DEFAULT_INDEX);
  if (!existsSync(path.join(indexDir, "catalog.json"))) {
    throw new Error(`nailed_it_index_missing:${indexDir} (run --command=index)`);
  }
  return loadNailedItIndex(indexDir);
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url: string): Promise<{ body: string; headers: Headers }> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/json, */*" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`fetch_failed:${response.status}:${url}`);
  return { body: await response.text(), headers: response.headers };
}

async function commandIndex(args: Args) {
  const out = path.resolve(args.get("--out") ?? DEFAULT_INDEX);
  const cacheDir = path.resolve(args.get("--cache") ?? path.join(path.dirname(out), "cache"));
  mkdirSync(cacheDir, { recursive: true });
  mkdirSync(path.join(out, "episodes"), { recursive: true });

  let rssXml: string;
  let rssUrl = RSS_FEED_URLS[0];
  let wpPostsRaw: unknown;
  let wpCatsRaw: unknown;

  const fixture = args.get("--fixture");
  if (fixture) {
    const dir = path.resolve(fixture);
    rssXml = readFileSync(path.join(dir, "rss.xml"), "utf8");
    wpPostsRaw = JSON.parse(readFileSync(path.join(dir, "wp-posts.json"), "utf8"));
    wpCatsRaw = JSON.parse(readFileSync(path.join(dir, "wp-categories.json"), "utf8"));
    rssUrl = "fixture://rss.xml";
  } else if (args.get("--offline") === "true") {
    rssXml = readFileSync(path.join(cacheDir, "rss.xml"), "utf8");
    wpPostsRaw = JSON.parse(readFileSync(path.join(cacheDir, "wp-posts.json"), "utf8"));
    wpCatsRaw = JSON.parse(readFileSync(path.join(cacheDir, "wp-categories.json"), "utf8"));
    rssUrl = readFileSync(path.join(cacheDir, "rss-url.txt"), "utf8").trim() || RSS_FEED_URLS[0];
  } else {
    let lastError: unknown;
    for (const url of RSS_FEED_URLS) {
      try {
        const fetched = await fetchText(url);
        rssXml = fetched.body;
        rssUrl = url;
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError || !rssXml!) throw lastError ?? new Error("rss_fetch_failed");
    writeFileSync(path.join(cacheDir, "rss.xml"), rssXml);
    writeFileSync(path.join(cacheDir, "rss-url.txt"), `${rssUrl}\n`);

    const cats = await fetchText(`${WP_CATEGORIES_URL}?per_page=100`);
    wpCatsRaw = JSON.parse(cats.body);
    writeFileSync(path.join(cacheDir, "wp-categories.json"), `${JSON.stringify(wpCatsRaw, null, 2)}\n`);

    const posts: unknown[] = [];
    let page = 1;
    let totalPages = 1;
    while (page <= totalPages) {
      const url = `${WP_POSTS_URL}?per_page=100&page=${page}&_fields=id,date,slug,link,title,content,categories`;
      const fetched = await fetchText(url);
      const chunk = JSON.parse(fetched.body);
      if (!Array.isArray(chunk)) throw new Error("wp_posts_not_array");
      posts.push(...chunk);
      const headerPages = Number(fetched.headers.get("x-wp-totalpages") ?? "1");
      if (Number.isInteger(headerPages) && headerPages > 0) totalPages = headerPages;
      else if (chunk.length < 100) totalPages = page;
      page += 1;
      if (page <= totalPages) await sleep(200);
    }
    wpPostsRaw = posts;
    writeFileSync(path.join(cacheDir, "wp-posts.json"), `${JSON.stringify(posts)}\n`);
  }

  let rss = parseRss(rssXml);
  const limit = args.get("--limit") ? Number(args.get("--limit")) : undefined;
  if (limit && Number.isInteger(limit) && limit > 0) rss = rss.slice(0, limit);
  const posts = parseWpPosts(wpPostsRaw);
  const categories = parseWpCategories(wpCatsRaw);
  const { catalog, status } = joinCatalog({
    rss,
    posts,
    categories,
    generatedAt: new Date().toISOString(),
    rssUrl,
  });

  const slimCatalog: NailedItCatalog = {
    meta: catalog.meta,
    episodes: catalog.episodes.map((episode) => ({
      ...episode,
      bodyText: episode.bodyText.slice(0, 400),
      showNoteBullets: episode.showNoteBullets.slice(0, 8),
    })),
  };
  writeJson(path.join(out, "catalog.json"), slimCatalog);
  writeJson(path.join(out, "status.json"), status);
  writeFileSync(
    path.join(out, "needs-review.jsonl"),
    `${status.needsReview.map((row) => JSON.stringify(row)).join("\n")}${status.needsReview.length ? "\n" : ""}`,
  );
  for (const episode of catalog.episodes) {
    const copy: NailedItEpisode = { ...episode, bodyText: episode.bodyText.slice(0, BODY_INDEX_CHARS) };
    writeJson(path.join(out, "episodes", episodeFileName(episode.id)), copy);
  }
  console.log(JSON.stringify({ out, ...catalog.meta, bodyCharsCap: BODY_INDEX_CHARS }, null, 2));
}

async function commandAudit(db: SupabaseClient, args: Args) {
  const release = await loadPublishedRelease(db, args);
  const notes = await loadOfficialNotes(db, release);
  let filled = 0;
  let links = 0;
  let both = 0;
  for (const row of notes) {
    const hasField = !isBlankResource(row.fields.Nailed_It);
    const hasLink = !isBlankResource(row.fields.Nailed_It_Link);
    if (hasField) filled += 1;
    if (hasLink) links += 1;
    if (hasField && hasLink) both += 1;
  }
  const summary = {
    authoritativeSource: "anki_sync_v2",
    releaseVersion: release.release_version,
    releaseId: release.id,
    notes: notes.length,
    nailedItFilled: filled,
    nailedItLinkFilled: links,
    bothFilled: both,
    neitherFilled: notes.length - filled - links + both,
  };
  console.log(JSON.stringify(summary, null, 2));
}

async function commandExportMap(db: SupabaseClient, args: Args) {
  const release = await loadPublishedRelease(db, args);
  const notes = await loadOfficialNotes(db, release);
  const ix = loadIndex(args);
  const skipFilled = args.get("--skip-filled") !== "false";
  const packetSize = Number(args.get("--packet-size") ?? 10);
  const agents = Number(args.get("--agents") ?? 400);
  const limit = args.has("--limit") ? Number(args.get("--limit")) : undefined;
  const offset = Number(args.get("--offset") ?? 0);
  if (!Number.isInteger(packetSize) || packetSize < 1 || packetSize > 20) throw new Error("invalid_packet_size");
  if (!Number.isInteger(agents) || agents < 1 || agents > 500) throw new Error("invalid_agents");

  const cohortNumber = Number(args.get("--cohort") ?? 1);
  const out = path.resolve(
    args.get("--out") ?? `tmp/nailed-it-enrichment/${release.release_version}/map-cohort-${String(cohortNumber).padStart(6, "0")}`,
  );
  const already = new Set([
    ...guidsAlready(out, "-reviewed.json"),
    ...guidsAlready(out, "-pending.json"),
    ...guidsAlready(out, "-verified.json"),
  ]);
  const eligible = notes.filter((row) => {
    if (already.has(String(row.note.stable_guid))) return false;
    if (!skipFilled) return true;
    return isBlankResource(row.fields.Nailed_It) || isBlankResource(row.fields.Nailed_It_Link);
  });
  const selected = eligible.slice(offset, limit == null ? undefined : offset + limit);
  mkdirSync(out, { recursive: true });
  const actualAgents = Math.min(agents, Math.ceil(selected.length / packetSize) || 0);
  const packets: Array<{ batchKey: string; cards: number; pending: string; brief: string }> = [];
  const instructions = [
    "Source of truth: the candidate Nailed It Ortho episodes in this brief. Do not invent episode IDs.",
    "Pick 1 episode (optional second related episode) from this card's candidates. First is primary and must be linkable.",
    "Skip rss-only / non-linkable primaries with rss_only_no_link. Skip Finance/OrthoBiz for clinical clozes.",
    "Do not edit Extra, Text, tags, identities, or checksums. Do not fetch naileditortho.com.",
  ];
  for (let agentIndex = 0; agentIndex < actualAgents; agentIndex += 1) {
    const slice = selected.slice(agentIndex * packetSize, (agentIndex + 1) * packetSize);
    if (!slice.length) continue;
    const batchKey = `map-${String(cohortNumber).padStart(6, "0")}-agent-${String(agentIndex + 1).padStart(2, "0")}`;
    const cards: NailedItMapCard[] = slice.map((row) => {
      const card = baseMapCard(row);
      return { ...card, candidates: mapCandidatesForCard(ix, card) };
    });
    const packet = sealMapPacket({
      schemaVersion: NAILED_IT_ENRICHMENT_CONTRACT,
      runKey: NAILED_IT_MAP_RUN_KEY,
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
        cards: cards.map((c) => ({ stableGuid: c.stableGuid, status: "mapped", episodes: [] })),
      });
    }
    packets.push({ batchKey, cards: packet.cards.length, pending: pendingPath, brief: briefPath });
  }
  const manifest = {
    contract: NAILED_IT_ENRICHMENT_CONTRACT,
    runKey: NAILED_IT_MAP_RUN_KEY,
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

function loadMappedCards(input: string): Map<string, { card: NailedItMapCard; sourceReleaseId: string; sourceReleaseVersion: string }> {
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
  const out = new Map<string, { card: NailedItMapCard; sourceReleaseId: string; sourceReleaseVersion: string }>();
  for (const file of use.sort()) {
    const packet = JSON.parse(readFileSync(file, "utf8")) as NailedItMapPacket;
    if (packet.stage !== "map") continue;
    for (const card of packet.cards) {
      if (card.enrichmentStatus !== "mapped" || !card.episodes?.length) continue;
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
  const agents = Number(args.get("--agents") ?? 200);
  const limit = args.has("--limit") ? Number(args.get("--limit")) : undefined;
  const offset = Number(args.get("--offset") ?? 0);
  if (!Number.isInteger(packetSize) || packetSize < 1 || packetSize > 20) throw new Error("invalid_packet_size");
  if (!Number.isInteger(agents) || agents < 1 || agents > 500) throw new Error("invalid_agents");

  const cohortNumber = Number(args.get("--cohort") ?? 1);
  const out = path.resolve(
    args.get("--out") ?? `tmp/nailed-it-enrichment/${release.release_version}/fill-cohort-${String(cohortNumber).padStart(6, "0")}`,
  );
  const already = new Set([
    ...guidsAlready(out, "-reviewed.json"),
    ...guidsAlready(out, "-pending.json"),
    ...guidsAlready(out, "-verified.json"),
  ]);
  const noteByGuid = new Map(notes.map((row) => [String(row.note.stable_guid), row]));
  const selected: Array<{ row: Awaited<ReturnType<typeof loadOfficialNotes>>[number]; mapped: NailedItMappedEpisode[]; searchQuery: string }> = [];
  for (const [guid, mappedRow] of mapped) {
    if (already.has(guid)) continue;
    const row = noteByGuid.get(guid);
    if (!row) continue;
    if (!isBlankResource(row.fields.Nailed_It) && !isBlankResource(row.fields.Nailed_It_Link) && args.get("--skip-filled") !== "false") {
      continue;
    }
    selected.push({ row, mapped: mappedRow.card.episodes!, searchQuery: mappedRow.card.searchQuery });
  }
  const sliced = selected.slice(offset, limit == null ? undefined : offset + limit);
  mkdirSync(out, { recursive: true });
  const actualAgents = Math.min(agents, Math.ceil(sliced.length / packetSize) || 0);
  const packets: Array<{ batchKey: string; cards: number; pending: string; brief: string }> = [];
  const instructions = [
    "Source of truth: retrieved Nailed It show-note bullets and body snippets for the mapped episodes only.",
    "Write ORIGINAL SnapOrtho teaching bullets (1–3) that teach THIS card's cloze. Never copy show-note sentences.",
    "Primary episode needs bullets. Do not guess timestamps; omit startSec unless a transcript timestamp is in the brief.",
    "Do not invent episode IDs or URLs. Do not fetch naileditortho.com. Do not edit Extra.",
    "Skip the card when the episode is on-topic but does not teach this cloze.",
  ];
  for (let agentIndex = 0; agentIndex < actualAgents; agentIndex += 1) {
    const slice = sliced.slice(agentIndex * packetSize, (agentIndex + 1) * packetSize);
    if (!slice.length) continue;
    const batchKey = `fill-${String(cohortNumber).padStart(6, "0")}-agent-${String(agentIndex + 1).padStart(2, "0")}`;
    const cards: NailedItFillCard[] = slice.map((item) => {
      const base = baseMapCard(item.row);
      const passages = item.mapped.flatMap((ep) => ix.retrievePassages(ep.id, item.searchQuery, 2));
      return {
        ...base,
        mappedEpisodes: item.mapped,
        passages,
      };
    });
    const packet = sealFillPacket({
      schemaVersion: NAILED_IT_ENRICHMENT_CONTRACT,
      runKey: NAILED_IT_FILL_RUN_KEY,
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
    if (!existsSync(briefPath)) writeJson(briefPath, buildFillBrief(packet));
    if (!existsSync(sidecarPath)) {
      writeJson(sidecarPath, {
        batchKey,
        inputChecksum: packet.inputChecksum,
        reviewer: { provider: "REPLACE_ME", model: "REPLACE_ME", reviewedAt: "REPLACE_ME_ISO8601" },
        cards: cards.map((c) => ({
          stableGuid: c.stableGuid,
          status: "filled",
          episodes: c.mappedEpisodes.map((ep) => ({ id: ep.id, bullets: [] })),
        })),
      });
    }
    packets.push({ batchKey, cards: packet.cards.length, pending: pendingPath, brief: briefPath });
  }
  const manifest = {
    contract: NAILED_IT_ENRICHMENT_CONTRACT,
    runKey: NAILED_IT_FILL_RUN_KEY,
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

function commandAutoMap(args: Args) {
  const cohort = path.resolve(required(args, "--cohort"));
  if (!existsSync(cohort) || !statSync(cohort).isDirectory()) {
    throw new Error(`cohort_missing:${cohort}`);
  }
  const names = readdirSync(cohort).filter((n) => n.endsWith("-pending.json")).sort();
  if (!names.length) throw new Error(`no_pending_packets:${cohort}`);
  const force = args.get("--force") === "true";
  const reviewer = {
    provider: "xai",
    model: "grok-4.6-auto-map",
    reviewedAt: new Date().toISOString(),
  };
  const summary = { packets: 0, cards: 0, mapped: 0, skipped: 0, applied: 0, failed: 0 };
  const skipReasons: Record<string, number> = {};
  for (const name of names) {
    const pendingPath = path.join(cohort, name);
    const packet = JSON.parse(readFileSync(pendingPath, "utf8")) as NailedItMapPacket;
    if (packet.stage !== "map") continue;
    const reviewedPath = path.join(cohort, reviewedPacketFileName(packet.batchKey));
    if (existsSync(reviewedPath) && !force) continue;
    if (existsSync(reviewedPath) && force) unlinkSync(reviewedPath);
    const sidecar = {
      batchKey: packet.batchKey,
      inputChecksum: packet.inputChecksum,
      reviewer,
      cards: packet.cards.map((card) => decideNailedItMap(card)),
    };
    const sidecarPath = path.join(cohort, sidecarPacketFileName(packet.batchKey));
    writeJson(sidecarPath, sidecar);
    summary.packets += 1;
    summary.cards += sidecar.cards.length;
    for (const card of sidecar.cards) {
      if (card.status === "mapped") summary.mapped += 1;
      else {
        summary.skipped += 1;
        const reason = card.skipReason ?? "unknown";
        skipReasons[reason] = (skipReasons[reason] ?? 0) + 1;
      }
    }
    try {
      const merged = applyNailedItMapSidecar(packet, sidecar);
      writeJson(reviewedPath, merged);
      summary.applied += 1;
    } catch (error) {
      summary.failed += 1;
      console.error(`auto_map_apply_failed:${name}:${error instanceof Error ? error.message : error}`);
    }
  }
  const report = { ...summary, skipReasons, cohort };
  writeJson(path.join(cohort, "auto-map-report.json"), report);
  console.log(JSON.stringify(report, null, 2));
}

function commandAutoFill(args: Args) {
  const cohort = path.resolve(required(args, "--cohort"));
  if (!existsSync(cohort) || !statSync(cohort).isDirectory()) {
    throw new Error(`cohort_missing:${cohort}`);
  }
  const names = readdirSync(cohort).filter((n) => n.endsWith("-pending.json")).sort();
  if (!names.length) throw new Error(`no_pending_packets:${cohort}`);
  const force = args.get("--force") === "true";
  const reviewer = {
    provider: "xai",
    model: "grok-4.6-auto-fill",
    reviewedAt: new Date().toISOString(),
  };
  const summary = { packets: 0, cards: 0, filled: 0, skipped: 0, applied: 0, failed: 0 };
  const skipReasons: Record<string, number> = {};
  for (const name of names) {
    const pendingPath = path.join(cohort, name);
    const packet = JSON.parse(readFileSync(pendingPath, "utf8")) as NailedItFillPacket;
    if (packet.stage !== "fill") continue;
    const reviewedPath = path.join(cohort, reviewedPacketFileName(packet.batchKey));
    if (existsSync(reviewedPath) && !force) continue;
    if (existsSync(reviewedPath) && force) unlinkSync(reviewedPath);
    const sidecar = {
      batchKey: packet.batchKey,
      inputChecksum: packet.inputChecksum,
      reviewer,
      cards: packet.cards.map((card) => decideNailedItFill(card)),
    };
    const sidecarPath = path.join(cohort, sidecarPacketFileName(packet.batchKey));
    writeJson(sidecarPath, sidecar);
    summary.packets += 1;
    summary.cards += sidecar.cards.length;
    for (const card of sidecar.cards) {
      if (card.status === "filled") summary.filled += 1;
      else {
        summary.skipped += 1;
        const reason = card.skipReason ?? "unknown";
        skipReasons[reason] = (skipReasons[reason] ?? 0) + 1;
      }
    }
    try {
      const merged = applyNailedItFillSidecar(packet, sidecar);
      writeJson(reviewedPath, merged);
      summary.applied += 1;
    } catch (error) {
      summary.failed += 1;
      console.error(`auto_fill_apply_failed:${name}:${error instanceof Error ? error.message : error}`);
    }
  }
  const report = { ...summary, skipReasons, cohort };
  writeJson(path.join(cohort, "auto-fill-report.json"), report);
  console.log(JSON.stringify(report, null, 2));
}

function commandApplySidecar(args: Args, write: boolean) {
  const pendingPath = path.resolve(required(args, write ? "--pending" : "--packet"));
  const sidecarPath = path.resolve(required(args, "--sidecar"));
  const packet = JSON.parse(readFileSync(pendingPath, "utf8")) as NailedItMapPacket | NailedItFillPacket;
  if (packet.schemaVersion !== NAILED_IT_ENRICHMENT_CONTRACT) throw new Error("unsupported_packet_version");
  const sidecar = JSON.parse(readFileSync(sidecarPath, "utf8")) as NailedItMapSidecar | NailedItFillSidecar;
  let merged: NailedItMapPacket | NailedItFillPacket;
  if (packet.stage === "map") {
    merged = applyNailedItMapSidecar(packet, sidecar as NailedItMapSidecar);
  } else if (packet.stage === "fill") {
    merged = applyNailedItFillSidecar(packet, sidecar as NailedItFillSidecar);
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
  if (command === "auto-map") return commandAutoMap(args);
  if (command === "auto-fill") return commandAutoFill(args);
  if (command === "apply-sidecar") return commandApplySidecar(args, true);
  if (command === "validate-sidecar") return commandApplySidecar(args, false);
  const db = dbClient();
  if (command === "audit") return commandAudit(db, args);
  if (command === "export-map") return commandExportMap(db, args);
  if (command === "export-fill") return commandExportFill(db, args);
  throw new Error("usage: --command=index|audit|export-map|export-fill|auto-map|auto-fill|apply-sidecar|validate-sidecar");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
