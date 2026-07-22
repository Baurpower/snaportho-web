/** Read-only cohort selection, draft manifest, candidates, and blank review packet. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

import {
  DECK_MANIFEST_CONTRACT_VERSION, computeDeckManifestChecksum, deterministicUuid, generateVersionMappingCandidates,
  safeJson, selectRepresentativeCohort, sha256, validatePublishedDeckManifest,
  type CardSignalInput, type CohortMetrics, type DeckManifestCardV1, type EntitySignalInput,
} from "../src/lib/education/deck-foundation.ts";
import { serializeCsv } from "./lib/education/review-csv.ts";

const { Client } = pg;
const DEFAULT_OUT = "/tmp/snaportho-deck-foundation";

function loadEnv(file: string) {
  const result: Record<string, string> = {};
  if (!existsSync(file)) return result;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const clean = line.trim(); if (!clean || clean.startsWith("#") || !clean.includes("=")) continue;
    const at = clean.indexOf("="); result[clean.slice(0, at).trim()] = clean.slice(at + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return result;
}
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}
function fieldNames(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap((row) => row && typeof row === "object" ? Object.keys(row) : []);
  return value && typeof value === "object" ? Object.keys(value) : [];
}
function tokens(value: unknown): string[] {
  return [...new Set(strings(value).join(" ").toLowerCase().replace(/<[^>]+>/g, " ").split(/[^a-z0-9]+/).filter((v) => v.length > 2))];
}

async function main() {
  const outDir = path.resolve(process.argv.find((v) => v.startsWith("--out="))?.slice(6) || DEFAULT_OUT);
  const env = { ...loadEnv(path.resolve(".env.local")), ...process.env };
  if (!env.DATABASE_URL?.trim()) throw new Error("DATABASE_URL is required for the read-only cohort audit");
  const db = new Client({ connectionString: env.DATABASE_URL.trim(), ssl: { rejectUnauthorized: false }, application_name: "anki_deck_cohort_readonly" });
  await db.connect(); let rolledBack = false;
  try {
    await db.query("begin"); await db.query("set transaction read only"); await db.query("set local statement_timeout='90s'");
    const mode = (await db.query<{ transaction_read_only: string }>("show transaction_read_only")).rows[0]?.transaction_read_only;
    if (mode !== "on") throw new Error(`Read-only guard failed: ${mode}`);
    const cards = (await db.query<{
      canonical_card_id: string; canonical_card_version_id: string; current_version_id: string; note_id: string;
      note_guid: string | null; card_ordinal: number; native_card_id_hint: string | null; content_hash: string;
      deck_path: string; tags: string[]; field_snapshot: unknown; active: boolean; curriculum_mapped: boolean;
      entity_ids: string[]; entity_types: string[];
    }>(`select c.id canonical_card_id,v.id canonical_card_version_id,c.current_version_id,c.anki_note_id note_id,
      n.anki_note_guid note_guid,ac.card_ord card_ordinal,ac.anki_card_id native_card_id_hint,v.content_hash,
      d.full_name deck_path,v.tag_snapshot tags,v.field_snapshot,
      (c.is_active and v.is_active and n.is_active and ac.is_active) active,
      exists(select 1 from public.card_knowledge_links k where k.canonical_card_id=c.id and k.is_active) curriculum_mapped,
      coalesce((select array_agg(distinct l.canonical_entity_id::text) from public.card_canonical_entity_links l where l.canonical_card_id=c.id and l.is_active),'{}'),
      coalesce((select array_agg(distinct e.entity_type) from public.card_canonical_entity_links l join public.canonical_entities e on e.id=l.canonical_entity_id where l.canonical_card_id=c.id and l.is_active),'{}')
      from public.canonical_cards c join public.canonical_card_versions v on v.id=c.current_version_id
      join public.anki_notes n on n.id=c.anki_note_id join public.anki_cards ac on ac.id=c.anki_card_id
      join public.anki_decks d on d.id=ac.deck_id order by d.full_name,c.id`)).rows;
    const entities = (await db.query<{ id: string; preferred_label: string; normalized_label: string; entity_type: string; aliases: string[]; source_aliases: string[]; is_active: boolean; status: string }>(`
      select e.id,e.preferred_label,e.normalized_label,e.entity_type,e.is_active,e.status,
      coalesce(array_remove(array_agg(distinct case when sa.entity_type='canonical_entity' then sa.alias_value end),null),'{}') aliases,
      coalesce(array_remove(array_agg(distinct case when sa.source_id is not null then sa.alias_value end),null),'{}') source_aliases
      from public.canonical_entities e left join public.source_aliases sa on sa.entity_id=e.id and sa.is_active
      group by e.id`)).rows;

    const normalized: CardSignalInput[] = cards.map((c) => ({
      canonicalCardId: c.canonical_card_id, canonicalCardVersionId: c.canonical_card_version_id,
      currentVersionId: c.current_version_id, noteId: c.note_id, noteGuid: c.note_guid, cardOrdinal: c.card_ordinal,
      nativeCardIdHint: c.native_card_id_hint, contentHash: c.content_hash, deckPath: c.deck_path,
      tags: c.tags ?? [], fieldNames: fieldNames(c.field_snapshot), normalizedContentTokens: tokens(c.field_snapshot),
      active: c.active, curriculumMapped: c.curriculum_mapped, existingCanonicalEntityIds: c.entity_ids ?? [],
    }));
    const byBranch = new Map<string, CardSignalInput[]>();
    for (const card of normalized) { const rows = byBranch.get(card.deckPath) ?? []; rows.push(card); byBranch.set(card.deckPath, rows); }
    const entityTypeById = new Map(entities.map((e) => [e.id, e.entity_type]));
    const entityInputs: EntitySignalInput[] = entities.map((e) => ({ id: e.id, preferredLabel: e.preferred_label, normalizedLabel: e.normalized_label,
      entityType: e.entity_type, aliases: e.aliases ?? [], sourceAliases: e.source_aliases ?? [], active: e.is_active, lifecycleStatus: e.status }));
    const metrics: CohortMetrics[] = [...byBranch.entries()].map(([deckBranch, rows]) => {
      const identities = rows.map((r) => `${r.noteGuid}:${r.cardOrdinal}`); const unique = new Set(identities);
      const preview = rows.length >= 50 && rows.length <= 200 ? generateVersionMappingCandidates(rows, entityInputs) : [];
      const entityTypes = [...new Set(preview.map((candidate) => entityTypeById.get(candidate.canonicalEntityId) ?? "unknown"))].sort();
      const ambiguousCards = new Set(preview.filter((candidate) => candidate.ambiguityFlags.length > 0).map((candidate) => candidate.canonicalCardId));
      return { deckBranch, cardCount: rows.length, uniqueNoteCount: new Set(rows.map((r) => r.noteId)).size,
        curriculumMappedCount: rows.filter((r) => r.curriculumMapped).length,
        canonicalLinkedCount: rows.filter((r) => r.existingCanonicalEntityIds.length > 0).length, entityTypes,
        duplicateIdentityCount: identities.length - unique.size, missingIdentityCount: rows.filter((r) => !r.noteGuid || r.cardOrdinal < 0).length,
        currentVersionErrorCount: rows.filter((r) => r.currentVersionId !== r.canonicalCardVersionId || !r.active).length,
        ambiguousAliasCount: ambiguousCards.size, tagSignalCardCount: new Set(preview.map((candidate) => candidate.canonicalCardId)).size };
    });
    const selection = selectRepresentativeCohort(metrics); if (!selection.selected) throw new Error("No eligible 50-200 card cohort");
    const selectedCards = byBranch.get(selection.selected.deckBranch)!;
    const candidates = generateVersionMappingCandidates(selectedCards, entityInputs);
    const cardsWithCandidates = new Set(candidates.map((c) => c.canonicalCardId));
    const ambiguousCards = new Set(candidates.filter((c) => c.ambiguityFlags.length).map((c) => c.canonicalCardId));
    const manifestCards: DeckManifestCardV1[] = [...selectedCards].sort((a,b) => a.noteGuid!.localeCompare(b.noteGuid!) || a.cardOrdinal-b.cardOrdinal).map((card,index) => ({
      canonicalCardId: card.canonicalCardId, canonicalCardVersionId: card.canonicalCardVersionId, noteGuid: card.noteGuid!, cardOrdinal: card.cardOrdinal,
      nativeCardIdHint: card.nativeCardIdHint, contentHash: card.contentHash, deckPath: card.deckPath,
      orderingKey: `${String(index+1).padStart(4,"0")}/${sha256(`${card.noteGuid}:${card.cardOrdinal}`).slice(0,16)}`, inclusionStatus: "included", canonicalEntityIds: [], metadata: {},
    }));
    const manifest = { contractVersion: DECK_MANIFEST_CONTRACT_VERSION, releaseId: deterministicUuid(`draft|${selection.selected.deckBranch}`),
      releaseKey: `draft-${sha256(selection.selected.deckBranch).slice(0,12)}`, releaseVersion: "0.1.0-draft", releaseStatus: "draft",
      manifestChecksum: computeDeckManifestChecksum(manifestCards), minimumAddonVersion: null, cards: manifestCards, metadata: { generatedBy: "read_only_cohort_selector" } };
    const manifestErrors = validatePublishedDeckManifest(manifest, {
      expectedVersionByCard: new Map(selectedCards.map((card)=>[card.canonicalCardId,card.canonicalCardVersionId])),
      approvedEntityIdsByCardVersion: new Map(selectedCards.map((card)=>[card.canonicalCardVersionId,new Set<string>()])),
    });
    if (manifestErrors.length) throw new Error(`Generated draft manifest failed validation: ${manifestErrors.join(",")}`);
    const report = { generatedAt: new Date().toISOString(), safety: { transactionReadOnly: mode, transactionDisposition: "rollback", reportsContainCardBodies: false },
      selected: selection.selected, rationale: "Highest deterministic score among 50-200-card branches with valid current identities; score rewards mapping/tag signals and entity diversity while penalizing burden.",
      exclusions: selection.ranked.slice(0,20).filter((r) => r.deckBranch !== selection.selected!.deckBranch), cards: manifestCards.map(({ canonicalEntityIds,metadata,...safe }) => safe),
      candidateMetrics: { candidateCount: candidates.length, cardsWithCandidate: cardsWithCandidates.size, noCandidateCards: selectedCards.length-cardsWithCandidates.size,
        noCandidateRatePct: Math.round((selectedCards.length-cardsWithCandidates.size)/selectedCards.length*1000)/10,
        ambiguousCards: ambiguousCards.size, ambiguityRatePct: Math.round(ambiguousCards.size/selectedCards.length*1000)/10,
        byEntityType: Object.fromEntries([...new Set(candidates.map((c) => entityTypeById.get(c.canonicalEntityId) ?? "unknown"))].sort().map((type) => [type,candidates.filter((c) => (entityTypeById.get(c.canonicalEntityId) ?? "unknown")===type).length])),
        curriculumCoveredCards: selectedCards.filter((c) => c.curriculumMapped).length,
        historicalDirectLinkedCards: selectedCards.filter((c) => c.existingCanonicalEntityIds.length).length,
        directHumanReviewedCurrentVersionCards: 0 } };
    const reviewRows = candidates.map((c) => ({ ...c, deckBranch: selection.selected!.deckBranch,
      noteGuid: selectedCards.find((x) => x.canonicalCardId===c.canonicalCardId)?.noteGuid ?? "",
      cardOrdinal: selectedCards.find((x) => x.canonicalCardId===c.canonicalCardId)?.cardOrdinal ?? -1,
      tags: (selectedCards.find((x) => x.canonicalCardId===c.canonicalCardId)?.tags ?? []).join("|"),
      entityType: entityTypeById.get(c.canonicalEntityId) ?? "unknown", mappingRole: c.proposedMappingRole,
      provenanceMethod: "direct_human_review", reviewerDecision: "", reviewerConfidence: "", reviewerNotes: "", reviewerIdentity: "" }));
    mkdirSync(outDir,{recursive:true});
    writeFileSync(path.join(outDir,"cohort-selection.json"),safeJson(report));
    writeFileSync(path.join(outDir,"draft-deck-manifest.json"),safeJson(manifest));
    writeFileSync(path.join(outDir,"mapping-candidates.json"),safeJson(candidates));
    writeFileSync(path.join(outDir,"mapping-review-packet.csv"),serializeCsv(reviewRows));
    writeFileSync(path.join(outDir,"cohort-selection.md"),`# Selected Anki mapping cohort\n\n- Branch: ${selection.selected.deckBranch}\n- Cards: ${selection.selected.cardCount}\n- Notes: ${selection.selected.uniqueNoteCount}\n- Candidates: ${candidates.length}\n- No-candidate rate: ${report.candidateMetrics.noCandidateRatePct}%\n- Ambiguity rate: ${report.candidateMetrics.ambiguityRatePct}%\n\nNo card bodies or mapping approvals are included.\n`);
    await db.query("rollback"); rolledBack=true;
    process.stdout.write(JSON.stringify({outDir,selected:selection.selected.deckBranch,cards:selection.selected.cardCount,notes:selection.selected.uniqueNoteCount,...report.candidateMetrics},null,2)+"\n");
  } finally { if (!rolledBack) { try { await db.query("rollback"); } catch {} } await db.end(); }
}
main().catch((error)=>{ console.error(error instanceof Error?error.message:String(error)); process.exitCode=1; });
