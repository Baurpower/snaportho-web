/**
 * Full SnapOrtho master-deck metadata pipeline.
 *
 * Commands:
 *   bootstrap-full-release  Create/reuse a draft release containing every active current card.
 *   run                     Run/resume the four-facet agent pipeline in shadow mode.
 *   status                  Report run, batch, assertion, and review-queue progress.
 *
 * Safety:
 * - model output is persisted only as proposed assertions;
 * - no assertion is accepted and no metadata/tag release is published here;
 * - card text is sent to OpenAI only with --authorize-external-processing=true;
 * - durable stage results contain evidence offsets/hashes, never card text.
 */
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// @ts-expect-error Direct Node strip-types runner imports TypeScript source.
import { LexicalTaxonomyRetriever, MasterDeckMetadataPipeline, METADATA_FACETS, METADATA_PIPELINE_VERSION, OpenAIMetadataAdapter, metadataChecksum, type CardPacket, type CardPipelineResult, type MetadataFacet, type PipelineCheckpointStore, type RoutedAssertion, type TaxonomyTerm } from "../src/lib/education/master-deck-metadata-pipeline.ts";
// @ts-expect-error Direct Node strip-types runner imports TypeScript source.
import { buildTagReleaseManifest, diffCardTags, renderCardTagManifest, type AcceptedTagAssertion, type TagExportPolicy, type TaxonomyTagNode } from "../src/lib/education/anki-tag-rendering.ts";

type Args = Map<string, string>;
type JsonRow = Record<string, any>;

const PIPELINE_RULES_VERSION = "master-deck-metadata-rules.2026-07-28.1";
const PROMPT_BUNDLE_VERSION = "master-deck-metadata-prompts.2026-07-28.1";
const EXPORT_POLICY_VERSION = "master-deck-anki-tags.2026-07-28.1";
const DEFAULT_TAXONOMY_VERSION = "0.1.0";
const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_CONCURRENCY = 3;
const DEFAULT_TAXONOMY_LIMIT = 40;
const CODEX_PACKET_VERSION = "snaportho-portable-tag-review-packet.2";
const CODEX_MODEL_ID = "codex-interactive";
const SIMPLE_RUN_VERSION = "snaportho-portable-review-cohorts.2";
const SIMPLE_DEFAULT_COHORT_SIZE = 100;
const SIMPLE_DEFAULT_AGENTS = 5;
const SIMPLE_DEFAULT_TAXONOMY_LIMIT = 12;

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
  const values: Record<string, string> = {};
  if (!existsSync(file)) return values;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean || clean.startsWith("#") || !clean.includes("=")) continue;
    const at = clean.indexOf("=");
    values[clean.slice(0, at).trim()] = clean.slice(at + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return values;
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha(value: unknown) {
  return createHash("sha256").update(typeof value === "string" ? value : stable(value)).digest("hex");
}

function integer(args: Args, key: string, fallback: number, min = 1, max = 1000) {
  const value = Number(args.get(key) ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`invalid_integer:${key}`);
  return value;
}

async function allRows(
  db: SupabaseClient,
  table: string,
  select: string,
  configure?: (query: any) => any,
): Promise<JsonRow[]> {
  const rows: JsonRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    let query: any = db.from(table).select(select).range(from, from + pageSize - 1);
    if (configure) query = configure(query);
    const { data, error } = await query;
    if (error) throw new Error(`${table}_read_failed:${error.message}`);
    const page = (data ?? []) as JsonRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

async function insertChunks(db: SupabaseClient, table: string, rows: JsonRow[], chunkSize = 300) {
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const { error } = await db.from(table).insert(rows.slice(offset, offset + chunkSize));
    if (error) throw new Error(`${table}_insert_failed:${error.message}`);
  }
}

function slugToken(label: string) {
  const tokens = label.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
  const standard = new Set(["ACL", "PCL", "ORIF", "TKA", "THA", "MRI", "CT", "EMG", "UCL"]);
  return tokens.map((token) => {
    const upper = token.toUpperCase();
    if (standard.has(upper)) return upper;
    return token.slice(0, 1).toUpperCase() + token.slice(1).toLowerCase();
  }).join("_") || "Unspecified";
}

function stripNonClinicalMarkup(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/\[sound:[^\]]+\]/gi, " ")
    .replace(/<img\b[^>]*>/gi, " ")
    .replace(/\{\{c\d+::([^{}]*?)(?:::[^{}]*?)?\}\}/gi, " $1 ")
    .replace(/\{\{[^}]+\}\}/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, "\"")
    .replace(/\s+/g, " ")
    .trim();
}

function fieldText(snapshot: unknown): Array<{ name: string; value: string }> {
  if (!Array.isArray(snapshot)) return [];
  return snapshot.flatMap((value, index) => {
    if (!value || typeof value !== "object") return [];
    const row = value as Record<string, unknown>;
    const name = String(row.name ?? row.fieldName ?? `Field_${index + 1}`);
    const raw = String(row.plainText ?? row.rawValue ?? row.value ?? "");
    return [{ name, value: stripNonClinicalMarkup(raw) }];
  }).filter((field) => field.value.length > 0);
}

function toCardPacket(releaseCard: JsonRow, version: JsonRow): CardPacket {
  const fields = fieldText(version.field_snapshot);
  const frontIndex = fields.findIndex((field) => /^(front|question|text|cloze)$/i.test(field.name));
  const frontField = fields[frontIndex >= 0 ? frontIndex : 0];
  const remaining = fields.filter((_, index) => index !== (frontIndex >= 0 ? frontIndex : 0));
  return {
    canonicalCardId: releaseCard.canonical_card_id,
    canonicalCardVersionId: releaseCard.canonical_card_version_id,
    contentHash: releaseCard.content_hash,
    front: frontField?.value ?? "",
    back: remaining.map((field) => `${field.name}: ${field.value}`).join("\n").slice(0, 16000),
    existingTags: Array.isArray(version.tag_snapshot) ? version.tag_snapshot.map(String) : [],
    deckPath: releaseCard.deck_path,
  };
}

async function bootstrapFullRelease(db: SupabaseClient, args: Args) {
  const releaseKey = args.get("--release-key") ?? "snaportho-metadata-full-active";
  const existing = await db.from("anki_deck_releases").select("id,release_key,status,manifest_checksum")
    .eq("release_key", releaseKey).maybeSingle();
  if (existing.error) throw new Error(`release_lookup_failed:${existing.error.message}`);
  if (existing.data) {
    const count = await db.from("anki_deck_release_cards").select("id", { count: "exact", head: true })
      .eq("deck_release_id", existing.data.id);
    if (count.error) throw new Error(`release_count_failed:${count.error.message}`);
    console.log(JSON.stringify({ reused: true, release: existing.data, cards: count.count }, null, 2));
    return;
  }

  if (args.get("--confirm-bootstrap") !== "CREATE_DRAFT_FULL_RELEASE") {
    throw new Error("bootstrap_requires_--confirm-bootstrap=CREATE_DRAFT_FULL_RELEASE");
  }
  const [cards, versions, notes, sourceCards, decks, batches] = await Promise.all([
    allRows(db, "canonical_cards", "id,current_version_id,anki_note_id,anki_card_id,is_active", (q) => q.eq("is_active", true)),
    allRows(db, "canonical_card_versions", "id,canonical_card_id,content_hash,is_active", (q) => q.eq("is_active", true)),
    allRows(db, "anki_notes", "id,anki_note_guid,is_active", (q) => q.eq("is_active", true)),
    allRows(db, "anki_cards", "id,anki_card_id,card_ord,deck_id,is_active", (q) => q.eq("is_active", true)),
    allRows(db, "anki_decks", "id,full_name,is_active", (q) => q.eq("is_active", true)),
    allRows(db, "anki_import_batches", "id,status,created_at", (q) => q.eq("status", "completed").order("created_at", { ascending: false })),
  ]);
  const versionById = new Map(versions.map((row) => [row.id, row]));
  const noteById = new Map(notes.map((row) => [row.id, row]));
  const sourceCardById = new Map(sourceCards.map((row) => [row.id, row]));
  const deckById = new Map(decks.map((row) => [row.id, row]));
  const members = cards.flatMap((card) => {
    const version = versionById.get(card.current_version_id);
    const note = noteById.get(card.anki_note_id);
    const sourceCard = sourceCardById.get(card.anki_card_id);
    const deck = sourceCard ? deckById.get(sourceCard.deck_id) : null;
    if (!version || version.canonical_card_id !== card.id || !note?.anki_note_guid || !sourceCard || !deck) return [];
    return [{
      canonical_card_id: card.id,
      canonical_card_version_id: version.id,
      note_guid: note.anki_note_guid,
      card_ordinal: sourceCard.card_ord,
      native_card_id_hint: sourceCard.anki_card_id == null ? null : String(sourceCard.anki_card_id),
      content_hash: version.content_hash,
      deck_path: deck.full_name,
    }];
  }).sort((a, b) => a.note_guid.localeCompare(b.note_guid) || a.card_ordinal - b.card_ordinal);
  if (!members.length || !batches[0]?.id) throw new Error("full_release_source_inventory_empty");
  const manifestChecksum = sha(members.map((member) => [
    member.canonical_card_id, member.canonical_card_version_id, member.content_hash,
  ]));
  const release = await db.from("anki_deck_releases").insert({
    release_key: releaseKey,
    release_version: args.get("--release-version") ?? `0.1.0-metadata-shadow`,
    import_batch_id: batches[0].id,
    status: "draft",
    manifest_schema_version: "snaportho-deck-manifest.v1",
    manifest_checksum: manifestChecksum,
    metadata: { purpose: "full_active_metadata_shadow_cohort", card_count: members.length },
  }).select("id,release_key,status,manifest_checksum").single();
  if (release.error) throw new Error(`release_insert_failed:${release.error.message}`);
  await insertChunks(db, "anki_deck_release_cards", members.map((member, index) => ({
    deck_release_id: release.data.id,
    ...member,
    ordering_key: `${String(index + 1).padStart(6, "0")}/${sha(`${member.note_guid}:${member.card_ordinal}`).slice(0, 16)}`,
    inclusion_status: "included",
    metadata: {},
  })));
  console.log(JSON.stringify({ reused: false, release: release.data, cards: members.length }, null, 2));
}

async function resolveRelease(db: SupabaseClient, args: Args) {
  const releaseKey = args.get("--release-key");
  let query = db.from("anki_deck_releases")
    .select("id,release_key,release_version,status,manifest_checksum,created_at");
  query = releaseKey
    ? query.eq("release_key", releaseKey)
    : query.eq("status", "published").order("published_at", { ascending: false }).limit(1);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`release_lookup_failed:${error.message}`);
  if (!data) throw new Error("deck_release_not_found; use --release-key or bootstrap-full-release");
  return data as JsonRow;
}

async function loadTaxonomy(db: SupabaseClient, taxonomyVersion: string) {
  const version = await db.from("metadata_taxonomy_versions")
    .select("id,version,lifecycle_status,definition_checksum").eq("version", taxonomyVersion).single();
  if (version.error) throw new Error(`taxonomy_version_lookup_failed:${version.error.message}`);
  if (!["frozen", "active"].includes(version.data.lifecycle_status)) throw new Error("taxonomy_must_be_frozen_or_active");
  const [entities, sourceAliases, concepts, conceptAliases] = await Promise.all([
    allRows(db, "canonical_entities", "id,preferred_label,slug,entity_type,status,is_active", (q) => q.eq("is_active", true)),
    allRows(db, "source_aliases", "entity_id,alias_value,entity_type,is_active", (q) => q.eq("is_active", true).eq("entity_type", "canonical_entity")),
    allRows(db, "metadata_concepts", "id,facet,slug,preferred_label,parent_concept_id,lifecycle_status,is_exportable",
      (q) => q.eq("taxonomy_version_id", version.data.id).eq("lifecycle_status", "active")),
    allRows(db, "metadata_concept_aliases", "metadata_concept_id,alias,review_status",
      (q) => q.eq("taxonomy_version_id", version.data.id).eq("review_status", "approved")),
  ]);
  const aliasesByEntity = new Map<string, string[]>();
  for (const row of sourceAliases) {
    const values = aliasesByEntity.get(row.entity_id) ?? [];
    values.push(String(row.alias_value));
    aliasesByEntity.set(row.entity_id, values);
  }
  const aliasesByConcept = new Map<string, string[]>();
  for (const row of conceptAliases) {
    const values = aliasesByConcept.get(row.metadata_concept_id) ?? [];
    values.push(String(row.alias));
    aliasesByConcept.set(row.metadata_concept_id, values);
  }
  const facetForEntity = (type: string): MetadataFacet | null =>
    type === "anatomy_structure" ? "anatomy"
      : ["condition", "complication"].includes(type) ? "diagnosis"
        : ["procedure", "treatment_principle", "fixation_method", "surgical_approach", "implant"].includes(type)
          ? "treatment" : null;
  const terms: TaxonomyTerm[] = entities.flatMap((entity) => {
    const facet = facetForEntity(entity.entity_type);
    if (!facet || ["deprecated", "replaced", "merged", "split"].includes(entity.status)) return [];
    return [{
      id: entity.id, facet, preferredLabel: entity.preferred_label,
      ankiSlug: slugToken(entity.preferred_label),
      aliases: [...new Set(aliasesByEntity.get(entity.id) ?? [])],
      parentIds: [], active: true,
    }];
  });
  for (const concept of concepts.filter((row) => row.facet === "specialty")) {
    terms.push({
      id: concept.id, facet: "specialty", preferredLabel: concept.preferred_label,
      ankiSlug: concept.slug, aliases: [...new Set(aliasesByConcept.get(concept.id) ?? [])],
      parentIds: concept.parent_concept_id ? [concept.parent_concept_id] : [], active: true,
    });
  }
  return { version: version.data as JsonRow, terms };
}

async function loadReleaseCards(db: SupabaseClient, releaseId: string, limit?: number) {
  const releaseCards = await allRows(
    db,
    "anki_deck_release_cards",
    "id,canonical_card_id,canonical_card_version_id,content_hash,deck_path,ordering_key,inclusion_status",
    (q) => q.eq("deck_release_id", releaseId).eq("inclusion_status", "included").order("ordering_key"),
  );
  const selected = limit ? releaseCards.slice(0, limit) : releaseCards;
  const ids = selected.map((row) => row.canonical_card_version_id);
  const versions: JsonRow[] = [];
  for (let offset = 0; offset < ids.length; offset += 100) {
    const { data, error } = await db.from("canonical_card_versions")
      .select("id,canonical_card_id,content_hash,field_snapshot,tag_snapshot,is_active")
      .in("id", ids.slice(offset, offset + 100));
    if (error) throw new Error(`card_version_read_failed:${error.message}`);
    versions.push(...(data ?? []));
  }
  const byId = new Map(versions.map((version) => [version.id, version]));
  return selected.map((releaseCard) => {
    const version = byId.get(releaseCard.canonical_card_version_id);
    if (!version || !version.is_active || version.canonical_card_id !== releaseCard.canonical_card_id
      || version.content_hash !== releaseCard.content_hash) {
      throw new Error(`stale_release_card:${releaseCard.canonical_card_id}`);
    }
    return { releaseCard, packet: toCardPacket(releaseCard, version) };
  });
}

class SupabaseCheckpointStore implements PipelineCheckpointStore {
  private readonly db: SupabaseClient;
  private readonly runId: string;
  private readonly batchId: string;
  private readonly taxonomyVersionId: string;
  private readonly terms: ReadonlyMap<string, TaxonomyTerm>;
  private readonly model: string;
  constructor(
    db: SupabaseClient,
    runId: string,
    batchId: string,
    taxonomyVersionId: string,
    terms: ReadonlyMap<string, TaxonomyTerm>,
    model: string,
  ) {
    this.db = db;
    this.runId = runId;
    this.batchId = batchId;
    this.taxonomyVersionId = taxonomyVersionId;
    this.terms = terms;
    this.model = model;
  }

  async get(cardVersionId: string, inputChecksum: string): Promise<CardPipelineResult | null> {
    const { data, error } = await this.db.from("metadata_pipeline_stage_results")
      .select("result").eq("pipeline_run_id", this.runId).eq("batch_id", this.batchId)
      .eq("canonical_card_version_id", cardVersionId).eq("stage", "consensus")
      .eq("input_checksum", inputChecksum)
      .order("attempt_number", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(`checkpoint_read_failed:${error.message}`);
    return (data?.result as CardPipelineResult | undefined) ?? null;
  }

  async put(result: CardPipelineResult): Promise<void> {
    const now = new Date().toISOString();
    const prior = await this.db.from("metadata_pipeline_stage_results")
      .select("attempt_number").eq("pipeline_run_id", this.runId).eq("batch_id", this.batchId)
      .eq("canonical_card_version_id", result.card.canonicalCardVersionId).eq("stage", "consensus")
      .eq("input_checksum", result.inputChecksum).order("attempt_number", { ascending: false }).limit(1).maybeSingle();
    if (prior.error) throw new Error(`checkpoint_attempt_read_failed:${prior.error.message}`);
    const attemptNumber = Number(prior.data?.attempt_number ?? 0) + 1;
    const stage = await this.db.from("metadata_pipeline_stage_results").insert({
      pipeline_run_id: this.runId,
      batch_id: this.batchId,
      canonical_card_id: result.card.canonicalCardId,
      canonical_card_version_id: result.card.canonicalCardVersionId,
      facet: null,
      stage: "consensus",
      agent_name: "master_deck_metadata_orchestrator",
      agent_version: METADATA_PIPELINE_VERSION,
      contract_version: METADATA_PIPELINE_VERSION,
      input_checksum: result.inputChecksum,
      output_checksum: metadataChecksum(result),
      status: result.status === "completed" ? "completed" : "failed",
      attempt_number: attemptNumber,
      result,
      warnings: [],
      failure_codes: result.failure ? [result.failure.code] : [],
      started_at: now,
      completed_at: now,
    }).select("id").single();
    if (stage.error) throw new Error(`checkpoint_insert_failed:${stage.error.message}`);
    if (result.status !== "completed") return;
    const proposalsByKey = new Map(result.proposals.map((proposal) => [`${proposal.facet}:${proposal.termId}`, proposal]));
    const rows = result.assertions.filter((assertion) => {
      const proposal = proposalsByKey.get(`${assertion.facet}:${assertion.termId}`);
      return assertion.decision !== "reject" && Boolean(proposal?.evidenceSpans.length);
    }).map((assertion) => {
      const proposal = proposalsByKey.get(`${assertion.facet}:${assertion.termId}`);
      const term = this.terms.get(assertion.termId);
      if (!proposal || !term) throw new Error(`assertion_proposal_missing:${assertion.termId}`);
      return {
        canonical_card_id: result.card.canonicalCardId,
        canonical_card_version_id: result.card.canonicalCardVersionId,
        facet: assertion.facet,
        canonical_entity_id: assertion.facet === "specialty" ? null : assertion.termId,
        metadata_concept_id: assertion.facet === "specialty" ? assertion.termId : null,
        assertion_role: assertion.assertionRole ?? "primary",
        polarity: "positive",
        confidence: assertion.confidence,
        decision: "proposed",
        provenance: "model",
        evidence_spans: proposal.evidenceSpans.map((span) => ({
          fieldName: span.field,
          start: span.start,
          end: span.end,
          contentHash: span.evidenceHash,
        })),
        rationale_codes: [...new Set([...assertion.reasonCodes, `route:${assertion.route}`, `risk:${assertion.riskTier}`])],
        alternatives: [],
        pipeline_run_id: this.runId,
        batch_id: this.batchId,
        stage_result_id: stage.data.id,
        taxonomy_version_id: this.taxonomyVersionId,
        rules_version: PIPELINE_RULES_VERSION,
        prompt_version: proposal.promptVersion,
        model_version: this.model,
      };
    });
    if (rows.length) {
      const existing = await this.db.from("card_metadata_assertions")
        .select("facet,canonical_entity_id,metadata_concept_id")
        .eq("canonical_card_version_id", result.card.canonicalCardVersionId)
        .neq("decision", "superseded");
      if (existing.error) throw new Error(`assertion_identity_read_failed:${existing.error.message}`);
      const existingKeys = new Set((existing.data ?? []).map((row) =>
        `${row.facet}:${row.canonical_entity_id ?? row.metadata_concept_id}`));
      const novelRows = rows.filter((row) =>
        !existingKeys.has(`${row.facet}:${row.canonical_entity_id ?? row.metadata_concept_id}`));
      if (!novelRows.length) return;
      const { error } = await this.db.from("card_metadata_assertions").insert(novelRows);
      if (error) throw new Error(`assertion_insert_failed:${error.message}`);
    }
  }
}

async function ensureRun(
  db: SupabaseClient,
  args: Args,
  release: JsonRow,
  taxonomy: JsonRow,
  model: string,
  cards: Array<{ releaseCard: JsonRow; packet: CardPacket }>,
) {
  const config = {
    pipeline: METADATA_PIPELINE_VERSION,
    rules: PIPELINE_RULES_VERSION,
    prompts: PROMPT_BUNDLE_VERSION,
    exportPolicy: EXPORT_POLICY_VERSION,
    model,
    batchSize: integer(args, "--batch-size", DEFAULT_BATCH_SIZE, 1, 500),
    taxonomyLimit: integer(args, "--taxonomy-limit", DEFAULT_TAXONOMY_LIMIT, 1, 100),
  };
  const inputChecksum = sha(cards.map(({ packet }) => [packet.canonicalCardVersionId, packet.contentHash]));
  const configurationChecksum = sha(config);
  const runKey = args.get("--run-key") ??
    `metadata-${release.release_key}-${taxonomy.version}-${inputChecksum.slice(0, 10)}-${configurationChecksum.slice(0, 10)}`.toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-").slice(0, 128);
  const existing = await db.from("metadata_pipeline_runs").select("*").eq("run_key", runKey).maybeSingle();
  if (existing.error) throw new Error(`run_lookup_failed:${existing.error.message}`);
  if (existing.data) return { run: existing.data as JsonRow, config };
  const inserted = await db.from("metadata_pipeline_runs").insert({
    run_key: runKey,
    deck_release_id: release.id,
    taxonomy_version_id: taxonomy.id,
    cohort_kind: release.status === "published" ? "published_release" : "full_import",
    cohort_definition: { release_key: release.release_key, card_count: cards.length },
    input_manifest_checksum: inputChecksum,
    configuration_checksum: configurationChecksum,
    deterministic_rules_version: PIPELINE_RULES_VERSION,
    deterministic_rules_checksum: sha(PIPELINE_RULES_VERSION),
    prompt_bundle_version: PROMPT_BUNDLE_VERSION,
    prompt_bundle_checksum: sha(PROMPT_BUNDLE_VERSION),
    model_manifest: model === CODEX_MODEL_ID
      ? { provider: "codex", operating_mode: "interactive_packet", model }
      : { provider: "openai", facet_model: model, critic_model: model },
    export_policy_version: EXPORT_POLICY_VERSION,
    export_policy_checksum: sha(EXPORT_POLICY_VERSION),
    status: "pending",
    safe_metadata: { machine_output_is_proposal_only: true },
  }).select("*").single();
  if (inserted.error) throw new Error(`run_insert_failed:${inserted.error.message}`);
  return { run: inserted.data as JsonRow, config };
}

async function ensureBatches(
  db: SupabaseClient,
  runId: string,
  cards: Array<{ releaseCard: JsonRow; packet: CardPacket }>,
  batchSize: number,
) {
  const existing = await allRows(db, "metadata_pipeline_batches", "*",
    (q) => q.eq("pipeline_run_id", runId).order("batch_key"));
  if (existing.length) return existing;
  const rows: JsonRow[] = [];
  for (let offset = 0; offset < cards.length; offset += batchSize) {
    const slice = cards.slice(offset, offset + batchSize);
    const ordinal = offset / batchSize + 1;
    rows.push({
      pipeline_run_id: runId,
      batch_key: `batch-${String(ordinal).padStart(4, "0")}`,
      cohort_key: slice[0]?.releaseCard.deck_path ?? "master-deck",
      ordered_card_version_ids: slice.map(({ packet }) => packet.canonicalCardVersionId),
      batch_checksum: sha(slice.map(({ packet }) => [packet.canonicalCardVersionId, packet.contentHash])),
      status: "pending",
      current_stage: "identity_validation",
    });
  }
  await insertChunks(db, "metadata_pipeline_batches", rows);
  return allRows(db, "metadata_pipeline_batches", "*",
    (q) => q.eq("pipeline_run_id", runId).order("batch_key"));
}

async function runPipeline(db: SupabaseClient, args: Args, env: Record<string, string>) {
  if (args.get("--authorize-external-processing") !== "true") {
    throw new Error("run_requires_--authorize-external-processing=true");
  }
  const release = await resolveRelease(db, args);
  const taxonomyVersion = args.get("--taxonomy-version") ?? DEFAULT_TAXONOMY_VERSION;
  const taxonomy = await loadTaxonomy(db, taxonomyVersion);
  const limit = args.has("--limit") ? integer(args, "--limit", 1, 1, 100000) : undefined;
  const cards = await loadReleaseCards(db, release.id, limit);
  const model = args.get("--model") ?? env.MASTER_DECK_METADATA_MODEL ?? env.BROBOT_STRONG_MODEL ?? "gpt-4o";
  const { run, config } = await ensureRun(db, args, release, taxonomy.version, model, cards);
  if (run.status === "completed") {
    console.log(JSON.stringify({ resumed: true, alreadyCompleted: true, runId: run.id, runKey: run.run_key }, null, 2));
    return;
  }
  const batches = await ensureBatches(db, run.id, cards, config.batchSize);
  const cardByVersion = new Map(cards.map((card) => [card.packet.canonicalCardVersionId, card]));
  const terms = new Map(taxonomy.terms.map((term) => [term.id, term]));
  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const adapter = new OpenAIMetadataAdapter(openai as any, model, PROMPT_BUNDLE_VERSION);
  const retriever = new LexicalTaxonomyRetriever(taxonomy.terms);
  const concurrency = integer(args, "--concurrency", DEFAULT_CONCURRENCY, 1, 20);

  const startedAt = run.started_at ?? new Date().toISOString();
  const running = await db.from("metadata_pipeline_runs").update({
    status: "running", started_at: startedAt, completed_at: null, failed_at: null,
  }).eq("id", run.id);
  if (running.error) throw new Error(`run_start_failed:${running.error.message}`);

  let completedCards = 0;
  let activeBatchId: string | null = null;
  let activeLeaseOwner: string | null = null;
  try {
    for (const batch of batches) {
      if (batch.status === "completed") {
        completedCards += batch.ordered_card_version_ids.length;
        continue;
      }
      const batchCards = batch.ordered_card_version_ids.map((id: string) => cardByVersion.get(id)?.packet)
        .filter((card: CardPacket | undefined): card is CardPacket => Boolean(card));
      if (batchCards.length !== batch.ordered_card_version_ids.length) throw new Error(`batch_card_missing:${batch.batch_key}`);
      const leaseOwner = `${process.pid}-${randomUUID()}`;
      activeBatchId = batch.id;
      activeLeaseOwner = leaseOwner;
      const lease = await db.from("metadata_pipeline_batches").update({
        status: "running", current_stage: "anatomy_agent", lease_owner: leaseOwner,
        leased_until: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        last_heartbeat_at: new Date().toISOString(), started_at: batch.started_at ?? new Date().toISOString(),
        completed_at: null, attempt_count: Number(batch.attempt_count ?? 0) + 1,
      }).eq("id", batch.id).in("status", ["pending", "failed", "leased", "running"]);
      if (lease.error) throw new Error(`batch_lease_failed:${lease.error.message}`);
      const store = new SupabaseCheckpointStore(db, run.id, batch.id, taxonomy.version.id, terms, model);
      const pipeline = new MasterDeckMetadataPipeline(retriever, adapter, adapter, store, terms);
      for (let offset = 0; offset < batchCards.length; offset += concurrency) {
        await Promise.all(batchCards.slice(offset, offset + concurrency).map((card) =>
          pipeline.processCard(card, run.id, batch.id, {
            taxonomyVersion, taxonomyLimit: config.taxonomyLimit, retryFailed: args.get("--retry-failed") === "true",
          }),
        ));
        completedCards += Math.min(concurrency, batchCards.length - offset);
        const heartbeat = await db.from("metadata_pipeline_batches").update({
          last_heartbeat_at: new Date().toISOString(),
          leased_until: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        }).eq("id", batch.id).eq("lease_owner", leaseOwner);
        if (heartbeat.error) throw new Error(`batch_heartbeat_failed:${heartbeat.error.message}`);
        console.log(JSON.stringify({ runKey: run.run_key, batch: batch.batch_key, completedCards, totalCards: cards.length }));
      }
      const finish = await db.from("metadata_pipeline_batches").update({
        status: "completed", current_stage: "completed", lease_owner: null, leased_until: null,
        last_heartbeat_at: new Date().toISOString(), completed_at: new Date().toISOString(),
      }).eq("id", batch.id).eq("lease_owner", leaseOwner);
      if (finish.error) throw new Error(`batch_finish_failed:${finish.error.message}`);
      activeBatchId = null;
      activeLeaseOwner = null;
    }
    const complete = await db.from("metadata_pipeline_runs").update({
      status: "completed", completed_at: new Date().toISOString(), failed_at: null,
    }).eq("id", run.id);
    if (complete.error) throw new Error(`run_complete_failed:${complete.error.message}`);
    console.log(JSON.stringify({
      completed: true, runId: run.id, runKey: run.run_key, releaseKey: release.release_key,
      cards: cards.length, model, machineAssertionsRemainProposed: true,
    }, null, 2));
  } catch (error) {
    if (activeBatchId && activeLeaseOwner) {
      await db.from("metadata_pipeline_batches").update({
        status: "failed", current_stage: "failed", lease_owner: null, leased_until: null,
        completed_at: new Date().toISOString(),
      }).eq("id", activeBatchId).eq("lease_owner", activeLeaseOwner);
    }
    await db.from("metadata_pipeline_runs").update({
      status: "failed", failed_at: new Date().toISOString(), completed_at: null,
    }).eq("id", run.id);
    throw error;
  }
}

type CodexPacketAssertion = {
  facet: MetadataFacet;
  termId: string;
  confidence: number;
  evidence: Array<{ field: "front" | "back"; quote: string }>;
  rationaleCodes: string[];
};

type CodexPacket = {
  schemaVersion: typeof CODEX_PACKET_VERSION;
  runId: string;
  runKey: string;
  batchId: string;
  batchKey: string;
  leaseOwner: string;
  taxonomyVersion: string;
  taxonomyVersionId: string;
  taxonomyLimit: number;
  inputChecksum: string;
  instructions: string[];
  reviewer?: { provider: string; model: string; reviewedAt: string };
  cards: Array<{
    canonicalCardId: string;
    canonicalCardVersionId: string;
    contentHash: string;
    front: string;
    back: string;
    deckPath: string;
    existingTags: string[];
    candidates: Record<MetadataFacet, Array<{
      termId: string;
      preferredLabel: string;
      aliases: string[];
      parentIds: string[];
      retrievalScore: number;
    }>>;
    reviewStatus?: "completed";
    reviewNotes?: string[];
    missingConcepts?: Array<{ facet: MetadataFacet; preferredLabel: string; rationale: string }>;
    assertions: CodexPacketAssertion[];
  }>;
};

function codexPacketInput(packet: Omit<CodexPacket, "inputChecksum"> | CodexPacket) {
  return {
    schemaVersion: packet.schemaVersion,
    runId: packet.runId,
    runKey: packet.runKey,
    batchId: packet.batchId,
    batchKey: packet.batchKey,
    taxonomyVersion: packet.taxonomyVersion,
    taxonomyVersionId: packet.taxonomyVersionId,
    taxonomyLimit: packet.taxonomyLimit,
    cards: packet.cards.map((card) => ({
      canonicalCardId: card.canonicalCardId,
      canonicalCardVersionId: card.canonicalCardVersionId,
      contentHash: card.contentHash,
      front: card.front,
      back: card.back,
      deckPath: card.deckPath,
      existingTags: card.existingTags,
      candidates: card.candidates,
    })),
  };
}

function codexPacketPath(args: Args, packet: Pick<CodexPacket, "runKey" | "batchKey">) {
  return path.resolve(args.get("--out") ?? `tmp/codex-metadata/${packet.runKey}/${packet.batchKey}.json`);
}

async function exportCodexBatch(db: SupabaseClient, args: Args) {
  const release = await resolveRelease(db, args);
  const taxonomyVersion = args.get("--taxonomy-version") ?? DEFAULT_TAXONOMY_VERSION;
  const taxonomy = await loadTaxonomy(db, taxonomyVersion);
  let cards = await loadReleaseCards(db, release.id);
  const excludeRunKeys = [
    ...(args.get("--exclude-run-keys") ?? "").split(","),
    args.get("--exclude-run-key") ?? "",
  ].map((value) => value.trim()).filter(Boolean);
  const excludedVersions = new Set<string>();
  for (const excludeRunKey of [...new Set(excludeRunKeys)]) {
    const excludedRun = await db.from("metadata_pipeline_runs").select("id")
      .eq("run_key", excludeRunKey).single();
    if (excludedRun.error) throw new Error(`codex_excluded_run_lookup_failed:${excludeRunKey}:${excludedRun.error.message}`);
    const completedStages = await allRows(
      db,
      "metadata_pipeline_stage_results",
      "canonical_card_version_id",
      (q) => q.eq("pipeline_run_id", excludedRun.data.id).eq("stage", "consensus").eq("status", "completed"),
    );
    for (const row of completedStages) {
      if (row.canonical_card_version_id) excludedVersions.add(row.canonical_card_version_id);
    }
  }
  cards = cards.filter((card) => !excludedVersions.has(card.packet.canonicalCardVersionId));
  const batchSize = integer(args, "--batch-size", 10, 1, 100);
  const taxonomyLimit = integer(args, "--taxonomy-limit", DEFAULT_TAXONOMY_LIMIT, 1, 100);
  const codexArgs = new Map(args);
  codexArgs.set("--batch-size", String(batchSize));
  codexArgs.set("--taxonomy-limit", String(taxonomyLimit));
  const { run, config } = await ensureRun(db, codexArgs, release, taxonomy.version, CODEX_MODEL_ID, cards);
  await ensureBatches(db, run.id, cards, config.batchSize);
  if (run.status === "pending") {
    const started = await db.from("metadata_pipeline_runs").update({
      status: "running", started_at: new Date().toISOString(), completed_at: null, failed_at: null,
    }).eq("id", run.id).eq("status", "pending");
    if (started.error) throw new Error(`codex_run_start_failed:${started.error.message}`);
  }
  if (run.status === "completed") {
    console.log(JSON.stringify({ completed: true, runId: run.id, runKey: run.run_key, message: "No remaining Codex batches." }, null, 2));
    return;
  }
  const leaseOwner = args.get("--worker-id") ?? `codex-${process.pid}-${randomUUID()}`;
  const claimed = await db.rpc("claim_metadata_pipeline_batch", {
    requested_run_id: run.id,
    worker_id: leaseOwner,
    lease_seconds: 3600,
  });
  if (claimed.error) throw new Error(`codex_batch_claim_failed:${claimed.error.message}`);
  const batch = claimed.data?.[0] as JsonRow | undefined;
  if (!batch) {
    console.log(JSON.stringify({ runId: run.id, runKey: run.run_key, availableBatch: false }, null, 2));
    return;
  }
  const byVersion = new Map(cards.map((card) => [card.packet.canonicalCardVersionId, card.packet]));
  const retriever = new LexicalTaxonomyRetriever(taxonomy.terms);
  const packetCards: CodexPacket["cards"] = [];
  for (const versionId of batch.ordered_card_version_ids as string[]) {
    const card = byVersion.get(versionId);
    if (!card) throw new Error(`codex_batch_card_missing:${versionId}`);
    const candidates = {} as CodexPacket["cards"][number]["candidates"];
    for (const facet of METADATA_FACETS) {
      candidates[facet] = (await retriever.retrieve({ card, facet, limit: taxonomyLimit })).map((term) => ({
        termId: term.id,
        preferredLabel: term.preferredLabel,
        aliases: term.aliases,
        parentIds: term.parentIds,
        retrievalScore: term.retrievalScore,
      }));
    }
    packetCards.push({
      canonicalCardId: card.canonicalCardId,
      canonicalCardVersionId: card.canonicalCardVersionId,
      contentHash: card.contentHash,
      front: card.front,
      back: card.back,
      deckPath: card.deckPath ?? "",
      existingTags: card.existingTags,
      candidates,
      assertions: [],
    });
  }
  const withoutChecksum = {
    schemaVersion: CODEX_PACKET_VERSION,
    runId: run.id,
    runKey: run.run_key,
    batchId: batch.id,
    batchKey: batch.batch_key,
    leaseOwner,
    taxonomyVersion,
    taxonomyVersionId: taxonomy.version.id,
    taxonomyLimit,
    instructions: [
      "Review every card independently. Fill only reviewer, reviewStatus, reviewNotes, missingConcepts, and assertions; do not modify identity, content, candidates, deckPath, or inputChecksum.",
      "Use only termId values present in that card's matching facet candidates.",
      "Classify the card's primary teaching subject, not every entity mentioned in the question or explanation.",
      "Use deckPath and existingTags as contextual evidence, but treat both as fallible and never copy them blindly.",
      "Do not tag an incidental structure used only as an insertion, origin, comparison, examination maneuver, complication, differential diagnosis, or structure-at-risk unless it is itself a teaching target.",
      "Specialty may be multi-label when genuinely useful, but give the most central specialty the highest confidence.",
      "Every assertion needs an exact front/back quote. Deck path alone cannot support diagnosis or treatment assertions.",
      "Use zero assertions for a facet when no candidate is supported; do not force a weak match.",
      "Set reviewStatus to completed even when assertions is empty. Record a truly missing governed concept in missingConcepts instead of forcing the wrong candidate.",
      "Confidence is 0..1. Rationale codes must be concise snake_case tokens.",
      "Do not place card text in rationale codes or any other metadata.",
      "Set reviewer.provider, reviewer.model, and reviewer.reviewedAt before returning the completed packet.",
    ],
    cards: packetCards,
  } satisfies Omit<CodexPacket, "inputChecksum">;
  const packet: CodexPacket = { ...withoutChecksum, inputChecksum: sha(codexPacketInput(withoutChecksum)) };
  const output = codexPacketPath(args, packet);
  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(packet, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  const retireRunKey = args.get("--retire-run-key")
    ?? (args.get("--retire-excluded-run") === "true" ? excludeRunKeys.at(-1) : undefined);
  if (retireRunKey) {
    const retiredAt = new Date().toISOString();
    const excludedRun = await db.from("metadata_pipeline_runs").select("id,status")
      .eq("run_key", retireRunKey).single();
    if (excludedRun.error) throw new Error(`codex_retire_run_lookup_failed:${excludedRun.error.message}`);
    const cancelledBatches = await db.from("metadata_pipeline_batches").update({
      status: "cancelled", current_stage: "failed", lease_owner: null, leased_until: null,
      completed_at: retiredAt,
    }).eq("pipeline_run_id", excludedRun.data.id).in("status", ["pending", "leased", "running", "failed"]);
    if (cancelledBatches.error) throw new Error(`codex_retire_batches_failed:${cancelledBatches.error.message}`);
    const retiredRun = await db.from("metadata_pipeline_runs").update({
      status: "cancelled", completed_at: retiredAt, failed_at: null,
    }).eq("id", excludedRun.data.id).neq("status", "completed");
    if (retiredRun.error) throw new Error(`codex_retire_run_failed:${retiredRun.error.message}`);
  }
  console.log(JSON.stringify({
    exported: true, apiCalls: 0, runId: run.id, runKey: run.run_key,
    batchId: batch.id, batchKey: batch.batch_key, cards: packet.cards.length,
    packet: output, leaseOwner, leaseExpiresAt: batch.leased_until,
    excludedCompletedRuns: [...new Set(excludeRunKeys)],
    excludedCompletedCards: excludedVersions.size,
    retiredRun: retireRunKey ?? null,
  }, null, 2));
}

async function ensureSimpleRun(
  db: SupabaseClient,
  args: Args,
  release: JsonRow,
  taxonomy: JsonRow,
  cards: Array<{ releaseCard: JsonRow; packet: CardPacket }>,
) {
  const runKey = args.get("--run-key") ?? "snaportho-codex-cohorts-v1";
  const existing = await db.from("metadata_pipeline_runs").select("*")
    .eq("run_key", runKey).maybeSingle();
  if (existing.error) throw new Error(`simple_run_lookup_failed:${existing.error.message}`);
  if (existing.data) {
    if (existing.data.deck_release_id !== release.id
      || existing.data.taxonomy_version_id !== taxonomy.id) {
      throw new Error("simple_run_release_or_taxonomy_mismatch");
    }
    return existing.data as JsonRow;
  }
  const inputChecksum = sha(cards.map(({ packet }) => [
    packet.canonicalCardVersionId,
    packet.contentHash,
  ]));
  const configuration = {
    pipeline: SIMPLE_RUN_VERSION,
    taxonomyLimit: SIMPLE_DEFAULT_TAXONOMY_LIMIT,
    model: "provider-neutral",
  };
  const now = new Date().toISOString();
  const inserted = await db.from("metadata_pipeline_runs").insert({
    run_key: runKey,
    deck_release_id: release.id,
    taxonomy_version_id: taxonomy.id,
    cohort_kind: release.status === "published" ? "published_release" : "full_import",
    cohort_definition: {
      release_key: release.release_key,
      total_card_count: cards.length,
      scheduling: "just_in_time_cohorts",
    },
    input_manifest_checksum: inputChecksum,
    configuration_checksum: sha(configuration),
    deterministic_rules_version: SIMPLE_RUN_VERSION,
    deterministic_rules_checksum: sha(SIMPLE_RUN_VERSION),
    prompt_bundle_version: CODEX_PACKET_VERSION,
    prompt_bundle_checksum: sha(CODEX_PACKET_VERSION),
    model_manifest: {
      provider: "portable",
      operating_mode: "resumable_provider_neutral_packets",
      model: "provider-supplied-at-import",
    },
    export_policy_version: EXPORT_POLICY_VERSION,
    export_policy_checksum: sha(EXPORT_POLICY_VERSION),
    status: "running",
    safe_metadata: {
      scheduling: "just_in_time",
      no_human_review_required: false,
      only_high_confidence_assertions_are_publishable: true,
    },
    started_at: now,
  }).select("*").single();
  if (inserted.error) throw new Error(`simple_run_insert_failed:${inserted.error.message}`);
  return inserted.data as JsonRow;
}

async function exportSimpleCodexCohort(db: SupabaseClient, args: Args) {
  const release = await resolveRelease(db, args);
  const taxonomyVersion = args.get("--taxonomy-version") ?? DEFAULT_TAXONOMY_VERSION;
  const taxonomy = await loadTaxonomy(db, taxonomyVersion);
  const cards = await loadReleaseCards(db, release.id);
  const run = await ensureSimpleRun(db, args, release, taxonomy.version, cards);
  const cohortSize = integer(
    args,
    "--cohort-size",
    SIMPLE_DEFAULT_COHORT_SIZE,
    1,
    500,
  );
  const agentCount = integer(
    args,
    "--agents",
    SIMPLE_DEFAULT_AGENTS,
    1,
    20,
  );
  const taxonomyLimit = integer(
    args,
    "--taxonomy-limit",
    SIMPLE_DEFAULT_TAXONOMY_LIMIT,
    1,
    30,
  );
  const [completedStages, acceptedAssertions, existingBatches] = await Promise.all([
    allRows(
      db,
      "metadata_pipeline_stage_results",
      "canonical_card_version_id",
      (query) => query.eq("pipeline_run_id", run.id).eq("stage", "consensus").eq("status", "completed"),
    ),
    allRows(
      db,
      "card_metadata_assertions",
      "canonical_card_version_id",
      (query) => query.eq("pipeline_run_id", run.id).eq("decision", "accepted"),
    ),
    allRows(
      db,
      "metadata_pipeline_batches",
      "batch_key,status,ordered_card_version_ids",
      (query) => query.eq("pipeline_run_id", run.id).order("batch_key"),
    ),
  ]);
  const unavailable = new Set<string>();
  for (const row of [...completedStages, ...acceptedAssertions]) {
    if (row.canonical_card_version_id) unavailable.add(row.canonical_card_version_id);
  }
  for (const batch of existingBatches) {
    if (batch.status === "cancelled" || batch.status === "failed") continue;
    for (const id of batch.ordered_card_version_ids ?? []) unavailable.add(id);
  }
  const selected = cards
    .filter(({ packet }) => !unavailable.has(packet.canonicalCardVersionId))
    .slice(0, cohortSize);
  if (!selected.length) {
    console.log(JSON.stringify({
      runKey: run.run_key,
      exported: false,
      reason: "no_unprocessed_cards",
      processedOrReservedCards: unavailable.size,
      releaseCards: cards.length,
    }, null, 2));
    return;
  }
  const priorCohortNumbers = existingBatches.flatMap((batch) => {
    const match = String(batch.batch_key).match(/^cohort-(\d+)-agent-\d+$/);
    return match ? [Number(match[1])] : [];
  });
  const cohortNumber = Math.max(0, ...priorCohortNumbers) + 1;
  const actualAgents = Math.min(agentCount, selected.length);
  const cardsPerAgent = Math.ceil(selected.length / actualAgents);
  const batchRows: JsonRow[] = [];
  for (let agentIndex = 0; agentIndex < actualAgents; agentIndex += 1) {
    const slice = selected.slice(
      agentIndex * cardsPerAgent,
      (agentIndex + 1) * cardsPerAgent,
    );
    if (!slice.length) continue;
    batchRows.push({
      pipeline_run_id: run.id,
      batch_key: `cohort-${String(cohortNumber).padStart(6, "0")}-agent-${String(agentIndex + 1).padStart(2, "0")}`,
      cohort_key: `cohort-${String(cohortNumber).padStart(6, "0")}`,
      ordered_card_version_ids: slice.map(({ packet }) => packet.canonicalCardVersionId),
      batch_checksum: sha(slice.map(({ packet }) => [
        packet.canonicalCardVersionId,
        packet.contentHash,
      ])),
      status: "pending",
      current_stage: "identity_validation",
    });
  }
  const created = await db.from("metadata_pipeline_batches").insert(batchRows)
    .select("*").order("batch_key");
  if (created.error) throw new Error(`simple_batches_insert_failed:${created.error.message}`);
  const cardByVersion = new Map(
    selected.map((card) => [card.packet.canonicalCardVersionId, card.packet]),
  );
  const retriever = new LexicalTaxonomyRetriever(taxonomy.terms);
  const outputDirectory = path.resolve(
    args.get("--out-dir")
      ?? `tmp/codex-metadata/${run.run_key}/cohort-${String(cohortNumber).padStart(6, "0")}`,
  );
  mkdirSync(outputDirectory, { recursive: true });
  const packets: Array<{
    batchKey: string;
    cards: number;
    packet: string;
    leaseOwner: string;
  }> = [];
  for (const batch of created.data ?? []) {
    const leaseOwner = `codex-${randomUUID()}`;
    const leased = await db.from("metadata_pipeline_batches").update({
      status: "running",
      current_stage: "consensus",
      lease_owner: leaseOwner,
      leased_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      last_heartbeat_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      attempt_count: 1,
    }).eq("id", batch.id).eq("status", "pending");
    if (leased.error) throw new Error(`simple_batch_lease_failed:${leased.error.message}`);
    const packetCards: CodexPacket["cards"] = [];
    for (const versionId of batch.ordered_card_version_ids as string[]) {
      const card = cardByVersion.get(versionId);
      if (!card) throw new Error(`simple_batch_card_missing:${versionId}`);
      const candidates = {} as CodexPacket["cards"][number]["candidates"];
      for (const facet of METADATA_FACETS) {
        candidates[facet] = (await retriever.retrieve({
          card,
          facet,
          limit: taxonomyLimit,
        })).map((term) => ({
          termId: term.id,
          preferredLabel: term.preferredLabel,
          aliases: [],
          parentIds: [],
          retrievalScore: term.retrievalScore,
        }));
      }
      packetCards.push({
        canonicalCardId: card.canonicalCardId,
        canonicalCardVersionId: card.canonicalCardVersionId,
        contentHash: card.contentHash,
        front: card.front,
        back: card.back,
        deckPath: card.deckPath ?? "",
        existingTags: card.existingTags,
        candidates,
        assertions: [],
      });
    }
    const packetWithoutChecksum = {
      schemaVersion: CODEX_PACKET_VERSION,
      runId: run.id,
      runKey: run.run_key,
      batchId: batch.id,
      batchKey: batch.batch_key,
      leaseOwner,
      taxonomyVersion,
      taxonomyVersionId: taxonomy.version.id,
      taxonomyLimit,
      instructions: [
        "Review every card independently; fill only reviewer, reviewStatus, reviewNotes, missingConcepts, and card.assertions.",
        "Tag the primary teaching subject, not every mentioned entity. Deck path and original tags are fallible context.",
        "Use only listed candidate term IDs and require an exact front/back quote for every assertion.",
        "Do not classify incidental anatomy, differentials, complications, structures-at-risk, or explanation mentions as primary subjects.",
        "Use no assertion for a facet when unsupported. Set reviewStatus=completed; use missingConcepts when the correct concept is absent. Set reviewer metadata.",
      ],
      cards: packetCards,
    } satisfies Omit<CodexPacket, "inputChecksum">;
    const packet: CodexPacket = {
      ...packetWithoutChecksum,
      inputChecksum: sha(codexPacketInput(packetWithoutChecksum)),
    };
    const output = path.join(outputDirectory, `${batch.batch_key}.json`);
    writeFileSync(output, `${JSON.stringify(packet, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    packets.push({
      batchKey: batch.batch_key,
      cards: packet.cards.length,
      packet: output,
      leaseOwner,
    });
  }
  console.log(JSON.stringify({
    exported: true,
    apiCalls: 0,
    runId: run.id,
    runKey: run.run_key,
    cohort: cohortNumber,
    cards: selected.length,
    agents: packets.length,
    taxonomyCandidatesPerFacet: taxonomyLimit,
    previouslyProcessedOrReserved: unavailable.size,
    remainingAfterThisCohort: Math.max(0, cards.length - unavailable.size - selected.length),
    packets,
  }, null, 2));
}

function validateCodexAssertions(packet: CodexPacket, terms: ReadonlyMap<string, TaxonomyTerm>) {
  return packet.cards.map((card) => {
    if (card.reviewStatus !== "completed") {
      throw new Error(`portable_review_card_incomplete:${card.canonicalCardVersionId}`);
    }
    const seen = new Set<string>();
    const proposals = card.assertions.map((item) => {
      if (!METADATA_FACETS.includes(item.facet) || !Number.isFinite(item.confidence)
        || item.confidence < 0 || item.confidence > 1 || !Array.isArray(item.evidence)
        || item.evidence.length === 0 || !Array.isArray(item.rationaleCodes)) {
        throw new Error(`invalid_codex_assertion:${card.canonicalCardVersionId}`);
      }
      const key = `${item.facet}:${item.termId}`;
      if (seen.has(key)) throw new Error(`duplicate_codex_assertion:${card.canonicalCardVersionId}:${key}`);
      seen.add(key);
      const allowed = new Set(card.candidates[item.facet].map((candidate) => candidate.termId));
      const term = terms.get(item.termId);
      if (!allowed.has(item.termId) || !term || term.facet !== item.facet) {
        throw new Error(`codex_term_not_in_candidate_packet:${card.canonicalCardVersionId}:${key}`);
      }
      const spans = item.evidence.map(({ field, quote }) => {
        if ((field !== "front" && field !== "back") || typeof quote !== "string" || !quote.length) {
          throw new Error(`invalid_codex_evidence:${card.canonicalCardVersionId}:${key}`);
        }
        const start = card[field].indexOf(quote);
        if (start < 0) throw new Error(`codex_evidence_not_exact:${card.canonicalCardVersionId}:${key}`);
        return { field, start, end: start + quote.length, evidenceHash: metadataChecksum(quote) };
      });
      return {
        facet: item.facet,
        termId: item.termId,
        confidence: item.confidence,
        evidence: spans.map((span) => span.evidenceHash),
        evidenceSpans: spans,
        rationaleCodes: [...new Set([...item.rationaleCodes, "portable_independent_review"])].sort(),
        agentId: `${packet.reviewer?.provider ?? "unknown"}:${packet.reviewer?.model ?? "unknown"}`,
        promptVersion: CODEX_PACKET_VERSION,
      };
    });
    const specialty = proposals.filter((proposal) => proposal.facet === "specialty")
      .sort((left, right) => right.confidence - left.confidence || left.termId.localeCompare(right.termId));
    const primarySpecialtyId = specialty[0]?.termId;
    const assertions: RoutedAssertion[] = proposals.map((proposal) => {
      const secondary = proposal.facet === "specialty" && proposal.termId !== primarySpecialtyId;
      const clinical = proposal.facet === "diagnosis" || proposal.facet === "treatment";
      return {
        facet: proposal.facet,
        termId: proposal.termId,
        assertionRole: secondary ? "secondary" : "primary",
        decision: "review",
        route: clinical ? "clinical_review" : "rapid_review",
        riskTier: clinical ? "high" : "medium",
        confidence: proposal.confidence,
        reasonCodes: [...new Set([...proposal.rationaleCodes, secondary ? "secondary_specialty_requires_review" : "codex_review_required"])].sort(),
        evidence: proposal.evidence,
        ankiTag: `SnapOrtho::${proposal.facet[0].toUpperCase()}${proposal.facet.slice(1)}::${terms.get(proposal.termId)!.ankiSlug}`,
      };
    });
    return { card, proposals, assertions };
  });
}

async function importCodexBatch(db: SupabaseClient, args: Args) {
  const input = args.get("--input");
  if (!input) throw new Error("--input is required");
  const packet = JSON.parse(readFileSync(path.resolve(input), "utf8")) as CodexPacket;
  if (packet.schemaVersion !== CODEX_PACKET_VERSION) throw new Error("unsupported_codex_packet_version");
  if (sha(codexPacketInput(packet)) !== packet.inputChecksum) throw new Error("codex_packet_input_was_modified");
  if (!packet.reviewer || !packet.reviewer.provider.trim() || !packet.reviewer.model.trim()
    || !Number.isFinite(Date.parse(packet.reviewer.reviewedAt))) {
    throw new Error("portable_review_packet_reviewer_metadata_required");
  }
  const run = await db.from("metadata_pipeline_runs").select("*").eq("id", packet.runId).eq("run_key", packet.runKey).single();
  if (run.error) throw new Error(`codex_run_lookup_failed:${run.error.message}`);
  const batch = await db.from("metadata_pipeline_batches").select("*").eq("id", packet.batchId)
    .eq("pipeline_run_id", packet.runId).eq("batch_key", packet.batchKey).single();
  if (batch.error) throw new Error(`codex_batch_lookup_failed:${batch.error.message}`);
  if (batch.data.status === "completed") {
    console.log(JSON.stringify({ imported: false, alreadyCompleted: true, runKey: packet.runKey, batchKey: packet.batchKey }, null, 2));
    return;
  }
  if (batch.data.lease_owner !== packet.leaseOwner) throw new Error("codex_packet_lease_owner_mismatch");
  const orderedIds = batch.data.ordered_card_version_ids as string[];
  if (stable(orderedIds) !== stable(packet.cards.map((card) => card.canonicalCardVersionId))) {
    throw new Error("codex_packet_batch_membership_mismatch");
  }
  const taxonomy = await loadTaxonomy(db, packet.taxonomyVersion);
  if (taxonomy.version.id !== packet.taxonomyVersionId) throw new Error("codex_taxonomy_version_mismatch");
  const terms = new Map(taxonomy.terms.map((term) => [term.id, term]));
  const validated = validateCodexAssertions(packet, terms);
  const reviewerModel = `${packet.reviewer.provider}:${packet.reviewer.model}`.slice(0, 200);
  const store = new SupabaseCheckpointStore(db, packet.runId, packet.batchId, packet.taxonomyVersionId, terms, reviewerModel);
  for (const item of validated) {
    const cardPacket: CardPacket = {
      canonicalCardId: item.card.canonicalCardId,
      canonicalCardVersionId: item.card.canonicalCardVersionId,
      contentHash: item.card.contentHash,
      front: item.card.front,
      back: item.card.back,
      existingTags: item.card.existingTags,
      deckPath: item.card.deckPath,
    };
    await store.put({
      contractVersion: METADATA_PIPELINE_VERSION,
      runId: packet.runId,
      batchId: packet.batchId,
      card: {
        canonicalCardId: item.card.canonicalCardId,
        canonicalCardVersionId: item.card.canonicalCardVersionId,
        contentHash: item.card.contentHash,
      },
      inputChecksum: metadataChecksum({ version: METADATA_PIPELINE_VERSION, taxonomyVersion: packet.taxonomyVersion, card: cardPacket }),
      status: "completed",
      proposals: item.proposals,
      criticFindings: [],
      assertions: item.assertions,
    });
  }
  let autoAccepted = 0;
  if (args.get("--confirm-auto-accept") === "ACCEPT_PORTABLE_REVIEW_0_98"
    && run.data.safe_metadata?.scheduling === "just_in_time") {
    const eligible = await db.from("card_metadata_assertions")
      .select("id")
      .eq("pipeline_run_id", packet.runId)
      .eq("batch_id", packet.batchId)
      .eq("decision", "proposed")
      .gte("confidence", 0.98);
    if (eligible.error) throw new Error(`simple_auto_accept_lookup_failed:${eligible.error.message}`);
    const eligibleIds = (eligible.data ?? []).map((row) => row.id);
    if (eligibleIds.length) {
      const accepted = await db.from("card_metadata_assertions").update({
        decision: "accepted",
        decision_method: "automated_policy",
        decision_policy_version: SIMPLE_RUN_VERSION,
        reviewed_at: new Date().toISOString(),
      }).in("id", eligibleIds).eq("decision", "proposed");
      if (accepted.error) throw new Error(`simple_auto_accept_failed:${accepted.error.message}`);
      autoAccepted = eligibleIds.length;
    }
  }
  const completedAt = new Date().toISOString();
  const finish = await db.from("metadata_pipeline_batches").update({
    status: "completed", current_stage: "completed", lease_owner: null, leased_until: null,
    last_heartbeat_at: completedAt, completed_at: completedAt,
  }).eq("id", packet.batchId).eq("lease_owner", packet.leaseOwner);
  if (finish.error) throw new Error(`codex_batch_finish_failed:${finish.error.message}`);
  const remaining = await db.from("metadata_pipeline_batches").select("id", { count: "exact", head: true })
    .eq("pipeline_run_id", packet.runId).neq("status", "completed");
  if (remaining.error) throw new Error(`codex_remaining_batches_failed:${remaining.error.message}`);
  if (remaining.count === 0 && run.data.safe_metadata?.scheduling !== "just_in_time") {
    const complete = await db.from("metadata_pipeline_runs").update({
      status: "completed", completed_at: completedAt, failed_at: null,
    }).eq("id", packet.runId);
    if (complete.error) throw new Error(`codex_run_complete_failed:${complete.error.message}`);
  }
  const persisted = await db.from("card_metadata_assertions").select("id", { count: "exact", head: true })
    .eq("pipeline_run_id", packet.runId).eq("batch_id", packet.batchId);
  if (persisted.error) throw new Error(`codex_persisted_assertion_count_failed:${persisted.error.message}`);
  console.log(JSON.stringify({
    imported: true, apiCalls: 0, runId: packet.runId, runKey: packet.runKey,
    batchId: packet.batchId, batchKey: packet.batchKey, cards: packet.cards.length,
    attemptedAssertions: validated.reduce((count, item) => count + item.assertions.length, 0),
    persistedAssertions: persisted.count, autoAccepted,
    remainingBatches: remaining.count,
  }, null, 2));
}

async function status(db: SupabaseClient, args: Args) {
  const runKey = args.get("--run-key");
  let query = db.from("metadata_pipeline_runs").select("*");
  query = runKey ? query.eq("run_key", runKey) : query.order("created_at", { ascending: false }).limit(1);
  const run = await query.maybeSingle();
  if (run.error) throw new Error(`run_status_failed:${run.error.message}`);
  if (!run.data) throw new Error("metadata_pipeline_run_not_found");
  const [batches, assertions, stages] = await Promise.all([
    allRows(db, "metadata_pipeline_batches", "status,attempt_count", (q) => q.eq("pipeline_run_id", run.data.id)),
    allRows(db, "card_metadata_assertions", "facet,decision,confidence,rationale_codes", (q) => q.eq("pipeline_run_id", run.data.id)),
    allRows(db, "metadata_pipeline_stage_results", "status,canonical_card_version_id", (q) => q.eq("pipeline_run_id", run.data.id).eq("stage", "consensus")),
  ]);
  const distribution = (rows: JsonRow[], key: string) => Object.fromEntries(
    [...new Set(rows.map((row) => String(row[key])))].sort()
      .map((value) => [value, rows.filter((row) => String(row[key]) === value).length]),
  );
  const latestStageByCard = new Map<string, JsonRow>();
  for (const stage of stages) {
    if (stage.canonical_card_version_id) latestStageByCard.set(stage.canonical_card_version_id, stage);
  }
  console.log(JSON.stringify({
    run: {
      id: run.data.id, runKey: run.data.run_key, status: run.data.status,
      createdAt: run.data.created_at, startedAt: run.data.started_at, completedAt: run.data.completed_at,
    },
    batches: distribution(batches, "status"),
    cards: distribution([...latestStageByCard.values()], "status"),
    assertions: {
      total: assertions.length,
      byFacet: distribution(assertions, "facet"),
      byDecision: distribution(assertions, "decision"),
      reviewRoutes: Object.fromEntries(["auto_accept", "rapid_review", "clinical_review", "taxonomy_review"]
        .map((route) => [route, assertions.filter((row) => row.rationale_codes?.includes(`route:${route}`)).length])),
    },
  }, null, 2));
}

async function findRun(db: SupabaseClient, args: Args) {
  const runKey = args.get("--run-key");
  if (!runKey) throw new Error("--run-key is required");
  const run = await db.from("metadata_pipeline_runs").select("*").eq("run_key", runKey).single();
  if (run.error) throw new Error(`run_lookup_failed:${run.error.message}`);
  return run.data as JsonRow;
}

async function classifyLegacyTags(db: SupabaseClient, args: Args) {
  if (args.get("--confirm-classification") !== "CREATE_PROPOSED_DISPOSITIONS") {
    throw new Error("classification_requires_--confirm-classification=CREATE_PROPOSED_DISPOSITIONS");
  }
  const taxonomyVersion = args.get("--taxonomy-version") ?? DEFAULT_TAXONOMY_VERSION;
  const taxonomy = await db.from("metadata_taxonomy_versions").select("id,version")
    .eq("version", taxonomyVersion).single();
  if (taxonomy.error) throw new Error(`taxonomy_lookup_failed:${taxonomy.error.message}`);
  const [tags, existing] = await Promise.all([
    allRows(db, "anki_tags", "id,raw_name,is_active", (q) => q.eq("is_active", true)),
    allRows(db, "anki_tag_dispositions", "anki_tag_id", (q) => q.eq("taxonomy_version_id", taxonomy.data.id)),
  ]);
  const already = new Set(existing.map((row) => row.anki_tag_id));
  const classify = (raw: string) => {
    const normalized = raw.trim().replace(/^#+/, "").trim().replace(/\s+/g, " ").toLowerCase();
    if (/snaportho::caseprep/i.test(raw)) return { disposition: "workflow_only", rationale: "CasePrep/session path is workflow context rather than a clinical facet." };
    if (/pocketpimped|netter/i.test(raw)) return { disposition: "source_only", rationale: "Source or collection provenance must remain separate from clinical facets." };
    if (/^#|::/.test(raw)) return { disposition: "navigation_only", rationale: "Nested source/deck navigation requires card-level clinical resolution." };
    if (/^(trauma|spine|hand|foot|ankle|shoulder|elbow|knee|hip|pelvis)$/i.test(raw)) {
      return { disposition: "ambiguous", rationale: "Broad clinical label is useful evidence but unsafe for global exact mapping." };
    }
    return { disposition: "ambiguous", rationale: "No safe global mapping; resolve against card content and governed taxonomy." };
  };
  const rows = tags.filter((tag) => !already.has(tag.id)).map((tag) => {
    const result = classify(String(tag.raw_name));
    return {
      anki_tag_id: tag.id,
      taxonomy_version_id: taxonomy.data.id,
      normalized_form: String(tag.raw_name).trim().replace(/^#+/, "").trim().replace(/\s+/g, " ").toLowerCase(),
      disposition: result.disposition,
      rationale: result.rationale,
      evidence: { classifier: "legacy-tag-disposition-rules.2026-07-28.1" },
      review_status: "proposed",
    };
  });
  if (rows.length) await insertChunks(db, "anki_tag_dispositions", rows);
  console.log(JSON.stringify({
    taxonomyVersion, totalRawTags: tags.length, existing: already.size, proposedCreated: rows.length,
    machineClassificationsRequireReview: true,
  }, null, 2));
}

async function applyAutoPolicy(db: SupabaseClient, args: Args) {
  if (args.get("--confirm-auto-policy") !== "ACCEPT_LOW_RISK_0_98") {
    throw new Error("auto_policy_requires_--confirm-auto-policy=ACCEPT_LOW_RISK_0_98");
  }
  const run = await findRun(db, args);
  const policyVersion = args.get("--policy-version") ?? "metadata-auto-accept.2026-07-28.1";
  const assertions = await allRows(
    db, "card_metadata_assertions", "id,facet,confidence,decision,rationale_codes",
    (q) => q.eq("pipeline_run_id", run.id).eq("decision", "proposed"),
  );
  const eligible = assertions.filter((row) =>
    ["anatomy", "specialty"].includes(row.facet)
    && Number(row.confidence) >= 0.98
    && row.rationale_codes?.includes("route:auto_accept")
    && row.rationale_codes?.includes("risk:low"),
  );
  for (let offset = 0; offset < eligible.length; offset += 200) {
    const ids = eligible.slice(offset, offset + 200).map((row) => row.id);
    const { error } = await db.from("card_metadata_assertions").update({
      decision: "accepted",
      decision_method: "automated_policy",
      decision_policy_version: policyVersion,
      reviewed_at: new Date().toISOString(),
    }).in("id", ids).eq("decision", "proposed");
    if (error) throw new Error(`auto_policy_update_failed:${error.message}`);
  }
  console.log(JSON.stringify({
    runKey: run.run_key, evaluated: assertions.length, accepted: eligible.length,
    policyVersion, diagnosisAndTreatmentRemainHumanReview: true,
  }, null, 2));
}

async function applyCodexAuditPolicy(db: SupabaseClient, args: Args) {
  if (args.get("--confirm-codex-audit") !== "ACCEPT_AUDITED_PROVISIONAL_TAGS") {
    throw new Error("codex_audit_requires_--confirm-codex-audit=ACCEPT_AUDITED_PROVISIONAL_TAGS");
  }
  const auditPath = args.get("--audit");
  const packetPaths = (args.get("--packets") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  if (!auditPath || !packetPaths.length) throw new Error("--audit and --packets are required");
  const audit = JSON.parse(readFileSync(path.resolve(auditPath), "utf8")) as {
    version: string;
    summary: { good: number; reject: number; questionable: number; total: number };
    exceptions: Array<{ cardVersionId: string; facet: string; termId: string; disposition: "reject" | "questionable" }>;
  };
  if (audit.version !== "snaportho-metadata-audit.1"
    || audit.exceptions.length !== audit.summary.reject + audit.summary.questionable) {
    throw new Error("invalid_codex_audit_artifact");
  }
  const cardVersionIds = new Set<string>();
  for (const packetPath of packetPaths) {
    const packet = JSON.parse(readFileSync(path.resolve(packetPath), "utf8")) as CodexPacket;
    if (packet.schemaVersion !== CODEX_PACKET_VERSION || sha(codexPacketInput(packet)) !== packet.inputChecksum) {
      throw new Error(`invalid_codex_packet:${packetPath}`);
    }
    for (const card of packet.cards) cardVersionIds.add(card.canonicalCardVersionId);
  }
  const assertions: JsonRow[] = [];
  const ids = [...cardVersionIds];
  for (let offset = 0; offset < ids.length; offset += 100) {
    const { data, error } = await db.from("card_metadata_assertions")
      .select("id,canonical_card_version_id,facet,canonical_entity_id,metadata_concept_id,decision")
      .in("canonical_card_version_id", ids.slice(offset, offset + 100))
      .neq("decision", "superseded");
    if (error) throw new Error(`codex_audit_assertion_read_failed:${error.message}`);
    assertions.push(...(data ?? []));
  }
  const key = (row: { canonical_card_version_id?: string; cardVersionId?: string; facet?: string; canonical_entity_id?: string | null; metadata_concept_id?: string | null; termId?: string }) =>
    `${row.canonical_card_version_id ?? row.cardVersionId}:${row.facet}:${row.canonical_entity_id ?? row.metadata_concept_id ?? row.termId}`;
  const exceptions = new Map(audit.exceptions.map((row) => [key(row), row.disposition]));
  if (assertions.length !== audit.summary.total) {
    throw new Error(`codex_audit_total_mismatch:expected_${audit.summary.total}:found_${assertions.length}`);
  }
  const good = assertions.filter((row) => !exceptions.has(key(row)));
  if (good.length !== audit.summary.good) throw new Error(`codex_audit_good_mismatch:${good.length}`);
  const pendingGood = good.filter((row) => row.decision === "proposed");
  const reviewedAt = new Date().toISOString();
  for (let offset = 0; offset < pendingGood.length; offset += 100) {
    const { error } = await db.from("card_metadata_assertions").update({
      decision: "accepted",
      decision_method: "automated_policy",
      decision_policy_version: "codex_audit_provisional_v1",
      reviewed_at: reviewedAt,
    }).in("id", pendingGood.slice(offset, offset + 100).map((row) => row.id)).eq("decision", "proposed");
    if (error) throw new Error(`codex_audit_accept_failed:${error.message}`);
  }
  console.log(JSON.stringify({
    auditedAssertions: assertions.length, acceptedGood: good.length,
    newlyAccepted: pendingGood.length, rejectedExcluded: audit.summary.reject,
    questionableExcluded: audit.summary.questionable,
    policyVersion: "codex_audit_provisional_v1",
  }, null, 2));
}

async function createMetadataRelease(db: SupabaseClient, args: Args) {
  if (args.get("--confirm-release") !== "CREATE_DRAFT_METADATA_RELEASE") {
    throw new Error("release_requires_--confirm-release=CREATE_DRAFT_METADATA_RELEASE");
  }
  const run = await findRun(db, args);
  const policyVersion = args.get("--accepted-policy-version");
  if (!policyVersion && run.status !== "completed") throw new Error("metadata_run_must_be_completed");
  const accepted = await allRows(
    db, "card_metadata_assertions", "id,canonical_card_version_id,facet,confidence",
    (q) => {
      let query = q.eq("decision", "accepted").order("id");
      query = policyVersion
        ? query.eq("decision_policy_version", policyVersion)
        : query.eq("pipeline_run_id", run.id);
      return query;
    },
  );
  if (!accepted.length) throw new Error("no_accepted_assertions_for_release");
  const releaseKey = args.get("--metadata-release-key") ?? `${run.run_key}-accepted`;
  const releaseVersion = args.get("--metadata-release-version") ?? "0.1.0-draft";
  const checksum = sha(accepted.map((row) => row.id).sort().join("\n"));
  const existing = await db.from("metadata_releases").select("*").eq("release_key", releaseKey).maybeSingle();
  if (existing.error) throw new Error(`metadata_release_lookup_failed:${existing.error.message}`);
  let release = existing.data as JsonRow | null;
  if (!release) {
    const inserted = await db.from("metadata_releases").insert({
      release_key: releaseKey,
      release_version: releaseVersion,
      deck_release_id: run.deck_release_id,
      taxonomy_version_id: run.taxonomy_version_id,
      pipeline_run_id: run.id,
      status: "draft",
      manifest_checksum: checksum,
    }).select("*").single();
    if (inserted.error) throw new Error(`metadata_release_insert_failed:${inserted.error.message}`);
    release = inserted.data;
  }
  if (!["draft", "review"].includes(release.status)) throw new Error("metadata_release_must_be_mutable_for_membership_reconciliation");
  if (release.manifest_checksum !== checksum) {
    const corrected = await db.from("metadata_releases").update({ manifest_checksum: checksum })
      .eq("id", release.id).in("status", ["draft", "review"]);
    if (corrected.error) throw new Error(`metadata_release_checksum_repair_failed:${corrected.error.message}`);
    release.manifest_checksum = checksum;
  }
  const existingMembers = await allRows(db, "metadata_release_assertions", "assertion_id",
    (q) => q.eq("metadata_release_id", release!.id));
  const existingMemberIds = new Set(existingMembers.map((row) => row.assertion_id));
  const missingMembers = accepted.filter((row) => !existingMemberIds.has(row.id));
  if (missingMembers.length) {
    await insertChunks(db, "metadata_release_assertions",
      missingMembers.map((row) => ({ metadata_release_id: release!.id, assertion_id: row.id })));
  }
  const finalMemberCount = existingMembers.length + missingMembers.length;
  if (finalMemberCount !== accepted.length) throw new Error("metadata_release_membership_count_mismatch");
  console.log(JSON.stringify({
    metadataReleaseId: release.id, releaseKey: release.release_key, status: release.status,
    acceptedAssertions: accepted.length, insertedMembers: missingMembers.length,
    manifestChecksum: checksum, published: false,
  }, null, 2));
}

async function renderTags(db: SupabaseClient, args: Args) {
  const releaseKey = args.get("--metadata-release-key");
  if (!releaseKey) throw new Error("--metadata-release-key is required");
  const release = await db.from("metadata_releases").select("*").eq("release_key", releaseKey).single();
  if (release.error) throw new Error(`metadata_release_lookup_failed:${release.error.message}`);
  const taxonomyVersion = await db.from("metadata_taxonomy_versions").select("id,version")
    .eq("id", release.data.taxonomy_version_id).single();
  if (taxonomyVersion.error) throw new Error(`taxonomy_lookup_failed:${taxonomyVersion.error.message}`);
  const taxonomy = await loadTaxonomy(db, taxonomyVersion.data.version);
  const members = await allRows(db, "metadata_release_assertions", "assertion_id",
    (q) => q.eq("metadata_release_id", release.data.id));
  const memberIds = members.map((row) => row.assertion_id);
  const assertionRows: JsonRow[] = [];
  for (let offset = 0; offset < memberIds.length; offset += 100) {
    const { data, error } = await db.from("card_metadata_assertions")
      .select("id,canonical_card_id,canonical_card_version_id,facet,canonical_entity_id,metadata_concept_id,decision")
      .in("id", memberIds.slice(offset, offset + 100)).eq("decision", "accepted");
    if (error) throw new Error(`release_assertion_read_failed:${error.message}`);
    assertionRows.push(...(data ?? []));
  }
  const facetName: Record<MetadataFacet, "Anatomy" | "Diagnosis" | "Treatment" | "Specialty"> = {
    anatomy: "Anatomy", diagnosis: "Diagnosis", treatment: "Treatment", specialty: "Specialty",
  };
  // Anatomy hierarchy overlay: multi-token Region/Tissue/Structure paths + exportable ancestors.
  // Other facets stay flat single-token paths. Map is optional so non-anatomy renders still work.
  const anatomyMapPath = path.resolve(
    "integrations/snaportho-anki/anatomy-hierarchy/anatomy-hierarchy.map.json",
  );
  type AnatomyHierarchyEntry = {
    entity_id: string;
    region: string;
    tissue: string;
    structure: string;
  };
  const anatomyMap = new Map<string, AnatomyHierarchyEntry>();
  if (existsSync(anatomyMapPath)) {
    const raw = JSON.parse(readFileSync(anatomyMapPath, "utf8")) as {
      entities?: Record<string, AnatomyHierarchyEntry>;
    };
    for (const entry of Object.values(raw.entities ?? {})) {
      anatomyMap.set(entry.entity_id, entry);
    }
  }
  const nodes: TaxonomyTagNode[] = [];
  const ancestorSeen = new Set<string>();
  for (const term of taxonomy.terms) {
    const facet = facetName[term.facet];
    const hierarchy = facet === "Anatomy" ? anatomyMap.get(term.id) : undefined;
    const pathTokens = hierarchy
      ? [hierarchy.region, hierarchy.tissue, hierarchy.structure]
      : [term.ankiSlug];
    nodes.push({
      canonicalEntityId: term.id,
      facet,
      path: pathTokens,
      exportable: true,
    });
    if (!hierarchy) continue;
    // Declare exportable Region and Region::Tissue ancestors so exportableParentClosure emits them.
    for (const depth of [1, 2] as const) {
      const ancestorPath = pathTokens.slice(0, depth);
      const key = `${facet}::${ancestorPath.join("::")}`;
      if (ancestorSeen.has(key)) continue;
      ancestorSeen.add(key);
      nodes.push({
        canonicalEntityId: `anatomy-ancestor:${ancestorPath.join("::")}`,
        facet,
        path: ancestorPath,
        exportable: true,
      });
    }
  }
  const policy: TagExportPolicy = {
    version: args.get("--export-policy-version") ?? EXPORT_POLICY_VERSION,
    taxonomyVersion: taxonomyVersion.data.version,
    publicExport: false,
    legacyMode: "none",
    hierarchyMode: args.get("--render-ancestor-tags") === "true" ? "closure" : "leaf_only",
  };
  const byVersion = new Map<string, JsonRow[]>();
  for (const row of assertionRows) {
    const values = byVersion.get(row.canonical_card_version_id) ?? [];
    values.push(row);
    byVersion.set(row.canonical_card_version_id, values);
  }
  const manifests = [...byVersion.entries()].map(([cardVersionId, rows]) => {
    const assertions: AcceptedTagAssertion[] = rows.map((row) => ({
      assertionId: row.id,
      canonicalCardVersionId: cardVersionId,
      canonicalEntityId: row.canonical_entity_id ?? row.metadata_concept_id,
      status: "accepted",
    }));
    const rendered = renderCardTagManifest({ canonicalCardVersionId: cardVersionId, assertions }, nodes, policy);
    if (args.get("--provisional-review") !== "true") return rendered;
    const core = {
      canonicalCardVersionId: rendered.canonicalCardVersionId,
      generatedTags: [...new Set([
        ...rendered.generatedTags,
        "SnapOrtho::Workflow::Needs_Metadata_Review",
      ])].sort(),
      assertionIds: rendered.assertionIds,
      taxonomyVersion: rendered.taxonomyVersion,
      exportPolicyVersion: rendered.exportPolicyVersion,
    };
    return { ...core, checksum: sha(core) };
  });
  const aggregate = buildTagReleaseManifest(manifests, policy);
  const publicationChecksum = sha([...manifests]
    .sort((left, right) => left.canonicalCardVersionId.localeCompare(right.canonicalCardVersionId))
    .map((manifest) => `${manifest.canonicalCardVersionId}|${manifest.checksum}`).join("\n"));
  if (args.get("--persist") !== "true") {
    console.log(JSON.stringify({
      dryRun: true, metadataReleaseKey: releaseKey, cardsWithAcceptedTags: manifests.length,
      aggregateChecksum: publicationChecksum, sample: manifests.slice(0, 3),
    }, null, 2));
    return;
  }
  if (args.get("--confirm-render") !== "PERSIST_DRAFT_TAG_MANIFEST") {
    throw new Error("render_persistence_requires_--confirm-render=PERSIST_DRAFT_TAG_MANIFEST");
  }
  const manifestKey = args.get("--manifest-key") ?? `${releaseKey}-${policy.version}`.toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-").slice(0, 128);
  const inserted = await db.from("rendered_anki_tag_manifests").insert({
    manifest_key: manifestKey,
    metadata_release_id: release.data.id,
    deck_release_id: release.data.deck_release_id,
    taxonomy_version_id: release.data.taxonomy_version_id,
    export_policy_version: policy.version,
    export_policy_checksum: sha(policy),
    transition_mode: "shadow",
    output_checksum: publicationChecksum,
    status: "draft",
    safe_metadata: {
      partial_until_all_required_facets_are_accepted: true,
      provisional_review_required: args.get("--provisional-review") === "true",
    },
  }).select("id,manifest_key,status").single();
  if (inserted.error) throw new Error(`render_manifest_insert_failed:${inserted.error.message}`);
  const cardIdByVersion = new Map(assertionRows.map((row) => [row.canonical_card_version_id, row.canonical_card_id]));
  const manifestCardRows = manifests.map((manifest) => {
    const diff = diffCardTags(manifest.canonicalCardVersionId, [], manifest.generatedTags);
    return {
      manifest_id: inserted.data.id,
      canonical_card_id: cardIdByVersion.get(manifest.canonicalCardVersionId),
      canonical_card_version_id: manifest.canonicalCardVersionId,
      rendered_tags: manifest.generatedTags,
      added_tags: diff.added,
      removed_tags: diff.removed,
      unchanged_tags: diff.unchanged,
      output_checksum: manifest.checksum,
    };
  });
  const insertedCards = await db.from("rendered_anki_tag_manifest_cards")
    .insert(manifestCardRows).select("id,canonical_card_version_id,rendered_tags");
  if (insertedCards.error) throw new Error(`render_manifest_cards_insert_failed:${insertedCards.error.message}`);
  const assertionsByVersion = new Map<string, JsonRow[]>();
  for (const row of assertionRows) {
    const values = assertionsByVersion.get(row.canonical_card_version_id) ?? [];
    values.push(row);
    assertionsByVersion.set(row.canonical_card_version_id, values);
  }
  const termById = new Map(taxonomy.terms.map((term) => [term.id, term]));
  const nodeById = new Map(nodes.map((node) => [node.canonicalEntityId, node]));
  const sources: JsonRow[] = [];
  for (const card of insertedCards.data ?? []) {
    const rows = assertionsByVersion.get(card.canonical_card_version_id) ?? [];
    const sourceByTag = new Map(rows.map((row) => {
      const targetId = row.canonical_entity_id ?? row.metadata_concept_id;
      const term = termById.get(targetId);
      const node = nodeById.get(targetId);
      return term && node ? [`SnapOrtho::${facetName[term.facet]}::${node.path.join("::")}`, row] : ["", row];
    }));
    for (const tag of card.rendered_tags as string[]) {
      const assertion = sourceByTag.get(tag);
      sources.push(assertion ? {
        manifest_card_id: card.id, rendered_tag: tag, source_kind: "assertion",
        assertion_id: assertion.id,
      } : {
        manifest_card_id: card.id, rendered_tag: tag, source_kind: "release_marker",
      });
    }
  }
  await insertChunks(db, "rendered_anki_tag_sources", sources);
  console.log(JSON.stringify({
    persisted: true, manifest: inserted.data, cards: manifests.length,
    aggregateChecksum: publicationChecksum, published: false,
  }, null, 2));
}

async function publishProvisionalTags(db: SupabaseClient, args: Args) {
  if (args.get("--confirm-publish") !== "PUBLISH_PROVISIONAL_REVIEW_TAGS") {
    throw new Error("publish_requires_--confirm-publish=PUBLISH_PROVISIONAL_REVIEW_TAGS");
  }
  const releaseKey = args.get("--metadata-release-key");
  const manifestKey = args.get("--manifest-key");
  if (!releaseKey || !manifestKey) throw new Error("--metadata-release-key and --manifest-key are required");
  const release = await db.from("metadata_releases").select("*").eq("release_key", releaseKey).single();
  if (release.error) throw new Error(`publish_release_lookup_failed:${release.error.message}`);
  const manifest = await db.from("rendered_anki_tag_manifests").select("*")
    .eq("manifest_key", manifestKey).eq("metadata_release_id", release.data.id).single();
  if (manifest.error) throw new Error(`publish_manifest_lookup_failed:${manifest.error.message}`);
  if (manifest.data.safe_metadata?.provisional_review_required !== true) {
    throw new Error("manifest_is_not_marked_for_provisional_review");
  }
  const [memberCount, cardCount] = await Promise.all([
    db.from("metadata_release_assertions").select("assertion_id", { count: "exact", head: true })
      .eq("metadata_release_id", release.data.id),
    db.from("rendered_anki_tag_manifest_cards").select("id", { count: "exact", head: true })
      .eq("manifest_id", manifest.data.id),
  ]);
  if (memberCount.error || cardCount.error) throw new Error("publish_count_verification_failed");
  if (memberCount.count !== 194 || cardCount.count !== 84) {
    throw new Error(`publish_count_mismatch:assertions_${memberCount.count}:cards_${cardCount.count}`);
  }
  const now = new Date().toISOString();
  if (release.data.status === "draft") {
    const reviewed = await db.from("metadata_releases").update({ status: "review", reviewed_at: now })
      .eq("id", release.data.id).eq("status", "draft");
    if (reviewed.error) throw new Error(`metadata_release_review_failed:${reviewed.error.message}`);
  }
  const publishedRelease = await db.from("metadata_releases").update({
    status: "published", reviewed_at: release.data.reviewed_at ?? now, published_at: now,
  }).eq("id", release.data.id).in("status", ["review", "published"]);
  if (publishedRelease.error) throw new Error(`metadata_release_publish_failed:${publishedRelease.error.message}`);
  if (manifest.data.status === "draft") {
    const validated = await db.from("rendered_anki_tag_manifests").update({ status: "validated", validated_at: now })
      .eq("id", manifest.data.id).eq("status", "draft");
    if (validated.error) throw new Error(`tag_manifest_validation_failed:${validated.error.message}`);
  }
  const publishedManifest = await db.from("rendered_anki_tag_manifests").update({
    status: "published", validated_at: manifest.data.validated_at ?? now, published_at: now,
  }).eq("id", manifest.data.id).in("status", ["validated", "published"]);
  if (publishedManifest.error) throw new Error(`tag_manifest_publish_failed:${publishedManifest.error.message}`);
  console.log(JSON.stringify({
    published: true, releaseKey, manifestKey, acceptedAssertions: memberCount.count,
    taggedCards: cardCount.count, provisionalReviewRequired: true,
    aggregateChecksum: manifest.data.output_checksum,
  }, null, 2));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args.get("--command") ?? "status";
  const env = { ...loadEnv(path.resolve(".env.local")), ...process.env };
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  if (command === "bootstrap-full-release") return bootstrapFullRelease(db, args);
  if (command === "codex-cohort-export" || command === "review-cohort-export") return exportSimpleCodexCohort(db, args);
  if (command === "codex-export" || command === "review-export") return exportCodexBatch(db, args);
  if (command === "codex-import" || command === "review-import") return importCodexBatch(db, args);
  if (command === "classify-legacy-tags") return classifyLegacyTags(db, args);
  if (command === "run") {
    if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required");
    return runPipeline(db, args, env);
  }
  if (command === "apply-auto-policy") return applyAutoPolicy(db, args);
  if (command === "apply-codex-audit") return applyCodexAuditPolicy(db, args);
  if (command === "create-metadata-release") return createMetadataRelease(db, args);
  if (command === "render-tags") return renderTags(db, args);
  if (command === "publish-provisional-tags") return publishProvisionalTags(db, args);
  if (command === "status") return status(db, args);
  throw new Error(`unknown_command:${command}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
