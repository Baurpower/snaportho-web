import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
// @ts-expect-error Direct Node strip-types runner imports TypeScript source.
import { checksum } from "../src/lib/education/anki-note-sync-v2.ts";
// @ts-expect-error Direct Node strip-types runner imports TypeScript source.
import {
  ORTHOBULLETS_ENRICHMENT_CONTRACT,
  ORTHOBULLETS_ENRICHMENT_RUN_KEY,
  applyOrthobulletsSidecar,
  briefPacketFileName,
  buildEnrichmentBrief,
  fieldsFromSnapshot,
  isBlankResource,
  overlayOrthobulletsFields,
  overlaysFromVerifiedPacket,
  pendingPacketFileName,
  plainText,
  reviewedPacketFileName,
  sealEnrichmentPacket,
  searchQueryForCard,
  type OrthobulletsEnrichmentPacket,
  type OrthobulletsEnrichmentSidecar,
  type OrthobulletsFieldOverlay,
} from "../src/lib/education/orthobullets-enrichment-packet.ts";

type Row = Record<string, any>;
type Args = Map<string, string>;

function parseArgs(values: string[]): Args {
  const result = new Map<string, string>();
  for (const value of values) {
    if (!value.startsWith("--")) continue;
    const at = value.indexOf("=");
    result.set(at < 0 ? value : value.slice(0, at), at < 0 ? "true" : value.slice(at + 1));
  }
  return result;
}

function loadEnv(file: string) {
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

function required(args: Args, name: string): string {
  const value = args.get(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function writeJson(filePath: string, value: unknown) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
}

function dbClient(): SupabaseClient {
  const values = { ...loadEnv(path.resolve(".env.local")), ...process.env };
  const url = values.NEXT_PUBLIC_SUPABASE_URL;
  const key = values.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function allRows(
  db: SupabaseClient,
  table: string,
  select: string,
  filter: (query: any) => any = (query) => query,
): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const response = await filter(db.from(table).select(select).range(from, from + 999));
    if (response.error) throw new Error(`${table}:${response.error.message}`);
    rows.push(...(response.data ?? []));
    if (!response.data || response.data.length < 1000) return rows;
  }
}

async function loadPublishedRelease(db: SupabaseClient, args: Args) {
  const requestedVersion = args.get("--release-version");
  let query = db.from("anki_sync_v2_releases").select("*");
  query = requestedVersion
    ? query.eq("release_version", requestedVersion)
    : query.eq("status", "published").order("release_sequence", { ascending: false }).limit(1);
  const result = await query.maybeSingle();
  if (result.error) throw new Error(`sync_v2_release_lookup_failed:${result.error.message}`);
  if (!result.data || result.data.status !== "published") {
    throw new Error("published_sync_v2_release_not_found");
  }
  return result.data as Row;
}

async function loadOfficialNotes(db: SupabaseClient, release: Row) {
  const members = await allRows(
    db,
    "anki_sync_v2_release_notes",
    "note_id,note_version_id,ordering_key,expected_card_ordinals",
    (query) => query.eq("release_id", release.id).order("ordering_key"),
  );
  const notes = await allRows(db, "anki_sync_v2_notes", "id,stable_guid,status");
  const noteById = new Map(notes.map((row) => [row.id, row]));
  const versions: Row[] = [];
  const versionIds = members.map((row) => row.note_version_id);
  for (let offset = 0; offset < versionIds.length; offset += 100) {
    const response = await db.from("anki_sync_v2_note_versions")
      .select("id,note_id,version_number,field_snapshot,governed_tags,content_checksum,tags_checksum,deck_path")
      .in("id", versionIds.slice(offset, offset + 100));
    if (response.error) throw new Error(`sync_v2_note_versions_read_failed:${response.error.message}`);
    versions.push(...(response.data ?? []));
  }
  const versionById = new Map(versions.map((row) => [row.id, row]));
  return members.map((member) => {
    const note = noteById.get(member.note_id);
    const version = versionById.get(member.note_version_id);
    if (!note || !version) throw new Error(`missing_official_note:${member.note_id}`);
    const fields = fieldsFromSnapshot(version.field_snapshot);
    return { member, note, version, fields };
  });
}

function cardFromOfficial(row: Awaited<ReturnType<typeof loadOfficialNotes>>[number]) {
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
    currentOrthobullets: row.fields.Orthobullets ?? "",
    currentOrthobulletsLink: row.fields.Orthobullets_Link ?? "",
    searchQuery: searchQueryForCard(row.fields.Text ?? front, String(row.version.deck_path)),
  };
}

async function commandAudit(db: SupabaseClient, args: Args) {
  const release = await loadPublishedRelease(db, args);
  const notes = await loadOfficialNotes(db, release);
  let bullets = 0;
  let links = 0;
  let both = 0;
  let neither = 0;
  for (const row of notes) {
    const hasBullets = !isBlankResource(row.fields.Orthobullets);
    const hasLink = !isBlankResource(row.fields.Orthobullets_Link);
    if (hasBullets) bullets += 1;
    if (hasLink) links += 1;
    if (hasBullets && hasLink) both += 1;
    if (!hasBullets && !hasLink) neither += 1;
  }
  const summary = {
    authoritativeSource: "anki_sync_v2",
    releaseVersion: release.release_version,
    releaseId: release.id,
    notes: notes.length,
    orthobulletsFilled: bullets,
    orthobulletsLinkFilled: links,
    bothFilled: both,
    neitherFilled: neither,
    targetSuccessor: "0.0.5",
  };
  const out = args.get("--out");
  if (out) {
    const file = path.resolve(out);
    mkdirSync(path.dirname(file), { recursive: true });
    writeJson(file, summary);
  }
  console.log(JSON.stringify(summary, null, 2));
}

async function commandExport(db: SupabaseClient, args: Args) {
  const release = await loadPublishedRelease(db, args);
  const notes = await loadOfficialNotes(db, release);
  const skipFilled = args.get("--skip-filled") !== "false";
  const packetSize = Number(args.get("--packet-size") ?? 5);
  const agents = Number(args.get("--agents") ?? 20);
  const limit = args.has("--limit") ? Number(args.get("--limit")) : undefined;
  const offset = Number(args.get("--offset") ?? 0);
  if (!Number.isInteger(packetSize) || packetSize < 1 || packetSize > 20) {
    throw new Error("invalid_packet_size");
  }
  if (!Number.isInteger(agents) || agents < 1 || agents > 40) {
    throw new Error("invalid_agents");
  }
  const eligible = notes.filter((row) => {
    if (!skipFilled) return true;
    return isBlankResource(row.fields.Orthobullets) || isBlankResource(row.fields.Orthobullets_Link);
  });
  const selected = eligible.slice(offset, limit == null ? undefined : offset + limit);
  const cohortNumber = Number(args.get("--cohort") ?? 1);
  const out = path.resolve(
    args.get("--out")
      ?? `tmp/orthobullets-enrichment/${release.release_version}/cohort-${String(cohortNumber).padStart(6, "0")}`,
  );
  mkdirSync(out, { recursive: true });
  const actualAgents = Math.min(agents, Math.ceil(selected.length / packetSize) || 0);
  const packets: Array<{ batchKey: string; cards: number; pending: string; brief: string }> = [];
  for (let agentIndex = 0; agentIndex < actualAgents; agentIndex += 1) {
    const slice = selected.slice(agentIndex * packetSize, (agentIndex + 1) * packetSize);
    if (!slice.length) continue;
    const batchKey = `cohort-${String(cohortNumber).padStart(6, "0")}-agent-${String(agentIndex + 1).padStart(2, "0")}`;
    const packet = sealEnrichmentPacket({
      schemaVersion: ORTHOBULLETS_ENRICHMENT_CONTRACT,
      runKey: ORTHOBULLETS_ENRICHMENT_RUN_KEY,
      sourceReleaseId: String(release.id),
      sourceReleaseVersion: String(release.release_version),
      batchKey,
      instructions: [
        "Open Orthobullets in the browser or fetch the public topic page. Do not use a SnapOrtho API.",
        "Match the card's primary teaching point, not a loosely related chapter.",
        "Write original SnapOrtho teaching bullets. Never copy Orthobullets sentences or lists.",
        "Put the canonical https://www.orthobullets.com/{section}/{id}/{slug} URL in orthobulletsLink.",
        "Skip when no public topic page clearly teaches this cloze.",
        "Do not edit Text, Extra, tags, identities, or checksums.",
      ],
      cards: slice.map(cardFromOfficial),
    });
    const pendingPath = path.join(out, pendingPacketFileName(batchKey));
    const briefPath = path.join(out, briefPacketFileName(batchKey));
    if (!existsSync(pendingPath)) writeJson(pendingPath, packet);
    if (!existsSync(briefPath)) writeJson(briefPath, buildEnrichmentBrief(packet));
    packets.push({ batchKey, cards: packet.cards.length, pending: pendingPath, brief: briefPath });
  }
  const manifest = {
    contract: ORTHOBULLETS_ENRICHMENT_CONTRACT,
    runKey: ORTHOBULLETS_ENRICHMENT_RUN_KEY,
    sourceReleaseId: release.id,
    sourceReleaseVersion: release.release_version,
    skipFilled,
    eligible: eligible.length,
    exported: selected.length,
    packets,
  };
  writeJson(path.join(out, "manifest.json"), manifest);
  console.log(JSON.stringify({ ...manifest, out, packets: packets.length }, null, 2));
}

function commandApplySidecar(args: Args) {
  const pendingPath = path.resolve(required(args, "--pending"));
  const sidecarPath = path.resolve(required(args, "--sidecar"));
  const outPath = path.resolve(args.get("--out") ?? pendingPath.replace(/-pending\.json$/, "-reviewed.json"));
  const packet = JSON.parse(readFileSync(pendingPath, "utf8")) as OrthobulletsEnrichmentPacket;
  const sidecar = JSON.parse(readFileSync(sidecarPath, "utf8")) as OrthobulletsEnrichmentSidecar;
  const merged = applyOrthobulletsSidecar(packet, sidecar);
  writeJson(outPath, merged);
  const filled = merged.cards.filter((card) => card.enrichmentStatus === "filled").length;
  const skipped = merged.cards.filter((card) => card.enrichmentStatus === "skipped").length;
  console.log(JSON.stringify({
    merged: true,
    out: outPath,
    cards: merged.cards.length,
    filled,
    skipped,
  }, null, 2));
}

function commandValidateSidecar(args: Args) {
  const pendingPath = path.resolve(required(args, "--packet"));
  const sidecarPath = path.resolve(required(args, "--sidecar"));
  const packet = JSON.parse(readFileSync(pendingPath, "utf8")) as OrthobulletsEnrichmentPacket;
  const sidecar = JSON.parse(readFileSync(sidecarPath, "utf8")) as OrthobulletsEnrichmentSidecar;
  const merged = applyOrthobulletsSidecar(packet, sidecar);
  const filled = merged.cards.filter((card) => card.enrichmentStatus === "filled").length;
  console.log(JSON.stringify({
    ok: true,
    batchKey: merged.batchKey,
    cards: merged.cards.length,
    filled,
    skipped: merged.cards.length - filled,
  }, null, 2));
}

function loadOverlaysFromDir(input: string): OrthobulletsFieldOverlay[] {
  const files: string[] = [];
  const start = path.resolve(input);
  if (statSync(start).isFile()) files.push(start);
  else {
    const names = readdirSync(start);
    const verified = names.filter((name) => name.endsWith("-verified.json"));
    const reviewed = names.filter((name) => name.endsWith("-reviewed.json"));
    for (const name of (verified.length ? verified : reviewed)) {
      files.push(path.join(start, name));
    }
  }
  const overlays: OrthobulletsFieldOverlay[] = [];
  const seen = new Set<string>();
  for (const file of files.sort()) {
    const packet = JSON.parse(readFileSync(file, "utf8")) as OrthobulletsEnrichmentPacket;
    if (packet.schemaVersion !== ORTHOBULLETS_ENRICHMENT_CONTRACT) {
      throw new Error(`unexpected_contract:${file}`);
    }
    for (const overlay of overlaysFromVerifiedPacket(packet)) {
      if (seen.has(overlay.stableGuid)) {
        throw new Error(`duplicate_overlay:${overlay.stableGuid}`);
      }
      seen.add(overlay.stableGuid);
      overlays.push(overlay);
    }
  }
  return overlays;
}

async function commandMaterialize(db: SupabaseClient, args: Args) {
  const release = await loadPublishedRelease(db, args);
  const notes = await loadOfficialNotes(db, release);
  const overlays = loadOverlaysFromDir(required(args, "--input"));
  const overlayByGuid = new Map(overlays.map((row) => [row.stableGuid, row]));
  const successorVersion = args.get("--successor-version") ?? "0.0.5";
  const apply = args.has("--apply");
  const patched: Array<{
    stableGuid: string;
    noteId: string;
    sourceVersionId: string;
    sourceVersionNumber: number;
    sourceContentChecksum: string;
    nextContentChecksum: string;
    fields: Record<string, string>;
    governedTags: string[];
    deckPath: string;
    expectedCardOrdinals: number[];
    topicTitle: string;
  }> = [];
  const stale: string[] = [];
  const missing: string[] = [];
  const noteByGuid = new Map(notes.map((row) => [String(row.note.stable_guid), row]));
  for (const overlay of overlays) {
    const row = noteByGuid.get(overlay.stableGuid);
    if (!row) {
      missing.push(overlay.stableGuid);
      continue;
    }
    if (String(row.version.content_checksum) !== overlay.sourceContentChecksum) {
      stale.push(overlay.stableGuid);
      continue;
    }
    const fields = overlayOrthobulletsFields(row.fields, overlay);
    patched.push({
      stableGuid: overlay.stableGuid,
      noteId: String(row.note.id),
      sourceVersionId: String(row.version.id),
      sourceVersionNumber: Number(row.version.version_number),
      sourceContentChecksum: overlay.sourceContentChecksum,
      nextContentChecksum: checksum(fields),
      fields,
      governedTags: Array.isArray(row.version.governed_tags) ? row.version.governed_tags.map(String) : [],
      deckPath: String(row.version.deck_path),
      expectedCardOrdinals: Array.isArray(row.member.expected_card_ordinals)
        ? row.member.expected_card_ordinals.map(Number)
        : [0],
      topicTitle: overlay.topicTitle,
    });
  }
  if (missing.length || stale.length) {
    throw new Error(`overlay_identity_failed:missing=${missing.length}:stale=${stale.length}`);
  }
  const patchedByGuid = new Map(patched.map((row) => [row.stableGuid, row]));
  const successorNotes = notes.map((row) => {
    const overlay = patchedByGuid.get(String(row.note.stable_guid));
    return {
      noteId: String(row.note.id),
      stableGuid: String(row.note.stable_guid),
      orderingKey: String(row.member.ordering_key),
      expectedCardOrdinals: overlay?.expectedCardOrdinals
        ?? (Array.isArray(row.member.expected_card_ordinals) ? row.member.expected_card_ordinals.map(Number) : [0]),
      sourceVersionId: String(row.version.id),
      sourceVersionNumber: Number(row.version.version_number),
      deckPath: String(row.version.deck_path),
      governedTags: Array.isArray(row.version.governed_tags) ? row.version.governed_tags.map(String) : [],
      contentChecksum: overlay?.nextContentChecksum ?? String(row.version.content_checksum),
      tagsChecksum: String(row.version.tags_checksum),
      fields: overlay?.fields ?? row.fields,
      changed: Boolean(overlay),
      topicTitle: overlay?.topicTitle ?? null,
    };
  });
  const notesChecksum = checksum(successorNotes.map((row) => [
    row.stableGuid,
    row.contentChecksum,
    row.deckPath,
    row.expectedCardOrdinals,
  ]));
  const tagsChecksum = checksum(successorNotes.map((row) => [row.stableGuid, row.tagsChecksum]));
  const aggregateChecksum = checksum({
    notes: checksum({ notesChecksum, tagsChecksum }),
    media: String(release.media_checksum),
  });
  const plan = {
    sourceReleaseId: release.id,
    sourceReleaseVersion: release.release_version,
    successorVersion,
    officialNotes: notes.length,
    overlays: overlays.length,
    patched: patched.length,
    unchanged: notes.length - patched.length,
    notesChecksum,
    aggregateChecksum,
    apply,
    publish: false,
  };
  const out = path.resolve(
    args.get("--out") ?? `tmp/orthobullets-enrichment/${release.release_version}/successor-${successorVersion}.json`,
  );
  mkdirSync(path.dirname(out), { recursive: true });
  writeJson(out, {
    ...plan,
    notes: patched.map((row) => ({
      stableGuid: row.stableGuid,
      sourceVersionId: row.sourceVersionId,
      nextContentChecksum: row.nextContentChecksum,
      topicTitle: row.topicTitle,
      orthobulletsLink: row.fields.Orthobullets_Link,
    })),
  });
  if (!apply) {
    console.log(JSON.stringify({ ...plan, out }, null, 2));
    return;
  }
  const existingDraft = await db.from("anki_sync_v2_releases")
    .select("id,status,release_version,aggregate_checksum")
    .eq("release_version", successorVersion)
    .maybeSingle();
  if (existingDraft.error) throw existingDraft.error;
  if (existingDraft.data && existingDraft.data.status !== "draft") {
    throw new Error(`successor_exists:${successorVersion}:${existingDraft.data.status}`);
  }
  if (existingDraft.data && existingDraft.data.aggregate_checksum !== aggregateChecksum) {
    throw new Error("existing_draft_checksum_mismatch");
  }
  let draftId = existingDraft.data?.id as string | undefined;
  if (!draftId) {
    const created = await db.from("anki_sync_v2_releases").insert({
      release_version: successorVersion,
      predecessor_release_id: release.id,
      status: "draft",
      notes_checksum: notesChecksum,
      tags_checksum: tagsChecksum,
      media_checksum: String(release.media_checksum),
      note_types_checksum: String(release.note_types_checksum ?? "0".repeat(64)),
      aggregate_checksum: aggregateChecksum,
      expected_note_count: notes.length,
      expected_card_count: Number(release.expected_card_count),
      expected_media_count: Number(release.expected_media_count ?? 0),
      minimum_addon_version: String(release.minimum_addon_version ?? "1.0.0"),
    }).select("id").single();
    if (created.error) throw created.error;
    draftId = created.data.id;
  }
  for (const row of successorNotes) {
    let versionId = row.sourceVersionId;
    if (row.changed) {
      const nextNumber = row.sourceVersionNumber + 1;
      const existingVersion = await db.from("anki_sync_v2_note_versions")
        .select("id,content_checksum")
        .eq("note_id", row.noteId)
        .eq("version_number", nextNumber)
        .maybeSingle();
      if (existingVersion.error) throw existingVersion.error;
      if (existingVersion.data) {
        if (existingVersion.data.content_checksum !== row.contentChecksum) {
          throw new Error(`existing_successor_checksum_mismatch:${row.stableGuid}`);
        }
        versionId = existingVersion.data.id;
      } else {
        const fieldHashes = Object.fromEntries(
          Object.entries(row.fields).map(([name, value]) => [name, checksum(value)]),
        );
        const inserted = await db.from("anki_sync_v2_note_versions").insert({
          note_id: row.noteId,
          version_number: nextNumber,
          predecessor_version_id: row.sourceVersionId,
          note_type_key: "SnapOrtho Master",
          field_snapshot: row.fields,
          field_hashes: fieldHashes,
          governed_tags: row.governedTags,
          content_checksum: row.contentChecksum,
          tags_checksum: row.tagsChecksum,
          deck_path: row.deckPath,
        }).select("id").single();
        if (inserted.error) throw inserted.error;
        versionId = inserted.data.id;
      }
    }
    await db.from("anki_sync_v2_release_notes").upsert({
      release_id: draftId,
      note_id: row.noteId,
      note_version_id: versionId,
      ordering_key: row.orderingKey,
      expected_card_ordinals: row.expectedCardOrdinals,
    }, { onConflict: "release_id,note_id" }).throwOnError();
  }
  console.log(JSON.stringify({ ...plan, draftReleaseId: draftId, out, status: "draft" }, null, 2));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args.get("--command") ?? "audit";
  if (command === "apply-sidecar") return commandApplySidecar(args);
  if (command === "validate-sidecar") return commandValidateSidecar(args);
  const db = dbClient();
  if (command === "audit") return commandAudit(db, args);
  if (command === "export") return commandExport(db, args);
  if (command === "materialize") return commandMaterialize(db, args);
  throw new Error(`unknown_command:${command}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
