import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

type Row = Record<string, any>;
type Args = Map<string, string>;
type Facet = "anatomy" | "diagnosis" | "treatment" | "specialty";

const CONTRACT = "snaportho-sync-v2-portable-tag-review.v1";
const FACETS: Facet[] = ["anatomy", "diagnosis", "treatment", "specialty"];

function args(values: string[]): Args {
  const result = new Map<string, string>();
  for (const value of values) {
    if (!value.startsWith("--")) continue;
    const at = value.indexOf("=");
    result.set(at < 0 ? value : value.slice(0, at), at < 0 ? "true" : value.slice(at + 1));
  }
  return result;
}
function env(file: string) {
  return Object.fromEntries(readFileSync(file, "utf8").split(/\r?\n/)
    .filter((line) => line && !line.trim().startsWith("#") && line.includes("="))
    .map((line) => { const at = line.indexOf("="); return [line.slice(0, at).trim(), line.slice(at + 1).trim().replace(/^['"]|['"]$/g, "")]; }));
}
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
}
function checksum(value: unknown) { return createHash("sha256").update(stable(value)).digest("hex"); }
function plain(value: string) {
  return value.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/\[sound:[^\]]+\]/gi, " ").replace(/<img\b[^>]*>/gi, " ")
    .replace(/\{\{c\d+::([^{}]*?)(?:::[^{}]*?)?\}\}/gi, " $1 ").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&#39;/gi, "'").replace(/&quot;/gi, "\"").replace(/\s+/g, " ").trim();
}
function tokens(value: string) { return new Set(value.toLowerCase().match(/[a-z0-9]+/g) ?? []); }
function slugToken(label: string) { return label.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean).map((token) => token.toUpperCase() === token && token.length <= 5 ? token : token[0]?.toUpperCase() + token.slice(1).toLowerCase()).join("_"); }

async function main() {
  const inputArgs = args(process.argv.slice(2));
  const values = { ...env(path.resolve(".env.local")), ...process.env };
  const db = createClient(values.NEXT_PUBLIC_SUPABASE_URL, values.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  async function pages(table: string, select: string, filter: (query: any) => any = (query) => query) {
    const result: Row[] = [];
    for (let from = 0; ; from += 1000) {
      const response = await filter(db.from(table).select(select).range(from, from + 999));
      if (response.error) throw new Error(`${table}:${response.error.message}`);
      result.push(...(response.data ?? [])); if (!response.data || response.data.length < 1000) return result;
    }
  }
  const requestedVersion = inputArgs.get("--release-version");
  let releaseQuery = db.from("anki_sync_v2_releases").select("*");
  releaseQuery = requestedVersion ? releaseQuery.eq("release_version", requestedVersion) : releaseQuery.eq("status", "published").order("release_sequence", { ascending: false }).limit(1);
  const releaseResult = await releaseQuery.maybeSingle();
  if (releaseResult.error) throw releaseResult.error;
  if (!releaseResult.data || releaseResult.data.status !== "published") throw new Error("published_sync_v2_release_not_found");
  const release = releaseResult.data as Row;
  const out = path.resolve(inputArgs.get("--out") ?? `tmp/sync-v2-tag-review/${release.release_version}`);
  const batchSize = Number(inputArgs.get("--batch-size") ?? 20);
  const limit = inputArgs.has("--limit") ? Number(inputArgs.get("--limit")) : undefined;
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) throw new Error("invalid_batch_size");

  const members = await pages("anki_sync_v2_release_notes", "note_id,note_version_id,ordering_key,expected_card_ordinals", (query) => query.eq("release_id", release.id).order("ordering_key"));
  const selectedMembers = limit ? members.slice(0, limit) : members;
  const versionIds = selectedMembers.map((row) => row.note_version_id);
  const versions: Row[] = [];
  for (let offset = 0; offset < versionIds.length; offset += 100) {
    const response = await db.from("anki_sync_v2_note_versions").select("id,note_id,version_number,note_type_key,field_snapshot,governed_tags,content_checksum,tags_checksum,deck_path").in("id", versionIds.slice(offset, offset + 100));
    if (response.error) throw response.error; versions.push(...(response.data ?? []));
  }
  const versionById = new Map(versions.map((row) => [row.id, row]));

  const taxonomyVersion = await db.from("metadata_taxonomy_versions").select("id,version").eq("lifecycle_status", "frozen").order("created_at", { ascending: false }).limit(1).single();
  if (taxonomyVersion.error) throw taxonomyVersion.error;
  const [entities, concepts] = await Promise.all([
    pages("canonical_entities", "id,preferred_label,entity_type,status,is_active", (query) => query.eq("is_active", true)),
    pages("metadata_concepts", "id,facet,preferred_label,slug,lifecycle_status,is_exportable", (query) => query.eq("taxonomy_version_id", taxonomyVersion.data.id).eq("lifecycle_status", "active")),
  ]);
  const entityFacet = (type: string): Facet | null => type === "anatomy_structure" ? "anatomy" : ["condition", "complication"].includes(type) ? "diagnosis" : ["procedure", "treatment_principle", "fixation_method", "surgical_approach", "implant"].includes(type) ? "treatment" : null;
  const terms = [
    ...entities.flatMap((row) => { const facet = entityFacet(row.entity_type); return facet && !["deprecated", "replaced", "merged", "split"].includes(row.status) ? [{ termId: row.id, facet, preferredLabel: row.preferred_label, tag: `SnapOrtho::${facet[0].toUpperCase()}${facet.slice(1)}::${slugToken(row.preferred_label)}` }] : []; }),
    ...concepts.filter((row) => row.facet === "specialty" && row.is_exportable).map((row) => ({ termId: row.id, facet: "specialty" as const, preferredLabel: row.preferred_label, tag: `SnapOrtho::Specialty::${row.slug}` })),
  ];
  const taxonomyLimit = Number(inputArgs.get("--taxonomy-limit") ?? 20);
  const cards = selectedMembers.map((member) => {
    const version = versionById.get(member.note_version_id); if (!version) throw new Error(`missing_note_version:${member.note_version_id}`);
    const fields = version.field_snapshot as Record<string, string>;
    const front = plain(String(fields.Text ?? fields.Front ?? fields.Question ?? Object.values(fields)[0] ?? ""));
    const back = plain(Object.entries(fields).filter(([name]) => !["Text", "Front", "Question"].includes(name)).map(([name, value]) => `${name}: ${value}`).join("\n")).slice(0, 16000);
    const source = `${front} ${back} ${version.deck_path} ${(version.governed_tags ?? []).join(" ")}`.toLowerCase();
    const sourceTokens = tokens(source);
    const candidates = Object.fromEntries(FACETS.map((facet) => [facet, terms.filter((term) => term.facet === facet).map((term) => {
      const labelTokens = tokens(term.preferredLabel); const exact = source.includes(term.preferredLabel.toLowerCase()); const overlap = [...labelTokens].filter((token) => sourceTokens.has(token)).length;
      return { ...term, retrievalScore: Math.min(1, (exact ? 0.75 : 0) + 0.25 * overlap / Math.max(1, labelTokens.size)) };
    }).filter((term) => term.retrievalScore > 0 || facet === "specialty").sort((a, b) => b.retrievalScore - a.retrievalScore || a.termId.localeCompare(b.termId)).slice(0, taxonomyLimit)]));
    return { noteId: member.note_id, noteVersionId: version.id, versionNumber: version.version_number, contentChecksum: version.content_checksum, tagsChecksum: version.tags_checksum, noteTypeKey: version.note_type_key, deckPath: version.deck_path, expectedCardOrdinals: member.expected_card_ordinals, front, back, currentGovernedTags: version.governed_tags ?? [], candidates, reviewStatus: "pending", proposedTags: [], assertions: [], reviewNotes: [], missingConcepts: [] };
  });
  const immutableManifest = { contract: CONTRACT, source: { table: "anki_sync_v2_releases", releaseId: release.id, releaseVersion: release.release_version, releaseSequence: release.release_sequence, aggregateChecksum: release.aggregate_checksum, notesChecksum: release.notes_checksum, tagsChecksum: release.tags_checksum }, taxonomy: taxonomyVersion.data, orderedNoteVersionIds: cards.map((card) => card.noteVersionId), orderedContentChecksums: cards.map((card) => card.contentChecksum) };
  const sourceChecksum = checksum(immutableManifest);
  mkdirSync(out, { recursive: true });
  const manifestPath = path.join(out, "manifest.json");
  if (existsSync(manifestPath)) {
    const existing = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (existing.sourceChecksum !== sourceChecksum) throw new Error("existing_review_manifest_source_mismatch");
  }
  const packets = [];
  for (let offset = 0; offset < cards.length; offset += batchSize) {
    const batchCards = cards.slice(offset, offset + batchSize);
    const ordinal = offset / batchSize + 1;
    const packet = { contract: CONTRACT, sourceChecksum, batchKey: `batch-${String(ordinal).padStart(4, "0")}`, batchChecksum: checksum(batchCards.map((card) => [card.noteVersionId, card.contentChecksum, card.tagsChecksum])), instructions: ["Review every note independently and tag its primary teaching subject.", "Use currentGovernedTags only as fallible prior output.", "Fill reviewStatus, assertions, proposedTags, reviewNotes, and missingConcepts only.", "Never modify note identity, text, deckPath, candidates, or checksums.", "Do not tag incidental anatomy, differentials, complications, structures at risk, or explanation-only mentions.", "Every assertion must use a listed termId and an exact front/back quote. Empty facet output is valid."], reviewer: null, cards: batchCards };
    const packetPath = path.join(out, `${packet.batchKey}.json`);
    if (!existsSync(packetPath)) writeFileSync(packetPath, `${JSON.stringify(packet, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    packets.push({ batchKey: packet.batchKey, cards: batchCards.length, path: packetPath });
  }
  writeFileSync(manifestPath, `${JSON.stringify({ ...immutableManifest, sourceChecksum, cards: cards.length, batches: packets }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  console.log(JSON.stringify({ authoritativeSource: "anki_sync_v2", releaseVersion: release.release_version, releaseId: release.id, cards: cards.length, batches: packets.length, sourceChecksum, out }, null, 2));
}
main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
