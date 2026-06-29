import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  classifyAnkiTagRole,
  normalizeTagToken,
  type AnkiTagRole,
} from "./anki-kg-tag-rules.ts";

type DatabaseClient = ReturnType<typeof createClient>;

const MAPPER_VERSION = "anki-kg-mapper-v1";
const HIGH_CONFIDENCE_THRESHOLD = 0.9;
const MEDIUM_CONFIDENCE_THRESHOLD = 0.75;

const HIGH_PRIORITY_PREFIXES = [
  "Marty McFlyin's Ortho Deck::3) OrthoBullets::Trauma::Upper Extremity",
  "Marty McFlyin's Ortho Deck::3) OrthoBullets::Shoulder & Elbow::Shoulder",
  "Marty McFlyin's Ortho Deck::3) OrthoBullets::Trauma::Lower Extremity",
  "Marty McFlyin's Ortho Deck::3) OrthoBullets::Trauma::General Trauma",
  "Marty McFlyin's Ortho Deck::2) Pocket Pimped::14 Pediatrics::14.05 Lower Extremity",
  "Marty McFlyin's Ortho Deck::3) OrthoBullets::Recon::Hip Reconstruction",
  "Marty McFlyin's Ortho Deck::3) OrthoBullets::Knee & Sports::Knee",
  "Marty McFlyin's Ortho Deck::3) OrthoBullets::Pediatrics::Pediatric Syndromes",
  "Marty McFlyin's Ortho Deck::3) OrthoBullets::Basic Science::MSK Science",
  "Marty McFlyin's Ortho Deck::2) Pocket Pimped::06 Hand::06.02 Hand Conditions",
];

const SPECIALTY_RULES = [
  { slug: "trauma", aliases: ["trauma", "general trauma"] },
  { slug: "spine", aliases: ["spine"] },
  { slug: "shoulder-elbow", aliases: ["shoulder and elbow", "shoulder elbow", "shoulder", "elbow"] },
  { slug: "knee-sports", aliases: ["knee and sports", "knee sports", "sports"] },
  { slug: "pediatrics", aliases: ["pediatrics", "pediatric", "peds"] },
  { slug: "recon", aliases: ["recon", "adult reconstruction", "hip reconstruction"] },
  { slug: "hand", aliases: ["hand"] },
  { slug: "foot-ankle", aliases: ["foot and ankle", "foot ankle"] },
  { slug: "pathology", aliases: ["pathology", "tumor", "oncology"] },
  { slug: "basic-science", aliases: ["basic science", "msk science"] },
  { slug: "anatomy", aliases: ["anatomy"] },
];

type MappingOptions = {
  batchId: string;
  dryRun: boolean;
  apply: boolean;
  limit: number | null;
  deckPrefix: string | null;
  minConfidence: number;
  outDir: string;
};

type MappingSummary = {
  totalCardsConsidered: number;
  highConfidenceMappings: number;
  mediumConfidenceMappings: number;
  noMapping: number;
  appliedMappings: number;
  candidateMappings: number;
  topMappedNodes: Array<{ slug: string; title: string; count: number }>;
  unmappedTags: Array<{ tag: string; count: number }>;
  unmappedDeckBranches: Array<{ branch: string; count: number }>;
  provenanceTags: Array<{ tag: string; count: number }>;
  examplesHighConfidence: Array<MappingExample>;
  examplesQuestionable: Array<MappingExample>;
  recommendedAliasAdditions: Array<{ label: string; count: number }>;
  validation: {
    duplicateAppliedLinkKeys: number;
    sourceOnlyAppliedMappings: number;
    mappingsMissingConfidence: number;
    mappingsWithWrongMethod: number;
  };
};

type MappingExample = {
  canonicalCardId: string;
  deckName: string;
  mappedNodeTitle: string | null;
  mappedNodeSlug: string | null;
  confidence: number | null;
  matchedLabels: string[];
  reviewStatus: string;
  reasons: string[];
};

type CardContext = {
  canonicalCardId: string;
  noteId: string;
  cardId: string;
  deckId: string | null;
  deckName: string;
  deckPath: string[];
  tags: string[];
  title: string | null;
};

type NodeDescriptor = {
  id: string;
  slug: string;
  title: string;
  shortLabel: string | null;
  nodeType: string;
  specialtyId: string | null;
  specialtySlug: string | null;
};

type AliasEntry = {
  nodeId: string;
  nodeSlug: string;
  nodeTitle: string;
  specialtyId: string | null;
  specialtySlug: string | null;
  aliasSource: "title" | "short_label" | "slug" | "curriculum_alias" | "source_alias";
};

type NodeCandidate = {
  node: NodeDescriptor;
  matchedLabels: Set<string>;
  matchedByTag: boolean;
  matchedByDeck: boolean;
  matchedBySourceAlias: boolean;
  matchedRoleKinds: Set<AnkiTagRole>;
  specialtyMatch: boolean;
  evidence: string[];
  confidence: number;
  reviewStatus: "auto_mapped" | "needs_review";
};

type MappingDecision = {
  card: CardContext;
  inferredSpecialtySlug: string | null;
  provenanceTags: string[];
  selected: NodeCandidate | null;
  candidates: NodeCandidate[];
  status: "high" | "medium" | "none";
  questionableReasons: string[];
};

type CleanupResult = {
  runId: string;
  candidateRowsDeleted: number;
  cardKnowledgeLinksDeleted: number;
};

function chunkArray<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function describeUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === "object") {
    try {
      return JSON.stringify(error);
    } catch {
      return "[unserializable error object]";
    }
  }
  return String(error);
}

function buildBatchError(
  tableName: string,
  batchIndex: number,
  batchSize: number,
  firstRecord: Record<string, unknown> | undefined,
  runId: string,
  error: unknown
) {
  const details =
    error && typeof error === "object"
      ? {
          code: (error as Record<string, unknown>).code,
          details: (error as Record<string, unknown>).details,
          hint: (error as Record<string, unknown>).hint,
          message: (error as Record<string, unknown>).message,
        }
      : {
          message: String(error),
        };

  const wrapped = new Error(
    JSON.stringify(
      {
        tableName,
        batchIndex,
        batchSize,
        mappingRunId: runId,
        firstRecordKeys: firstRecord ? Object.keys(firstRecord) : [],
        error: details,
      },
      null,
      2
    )
  );

  Object.assign(wrapped, {
    tableName,
    batchIndex,
    batchSize,
    mappingRunId: runId,
    firstRecord,
    originalError: error,
  });

  return wrapped;
}

function loadEnvFile(filePath: string) {
  const env = Object.create(null) as Record<string, string>;
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }

  return env;
}

function getSupabaseAdminClient(): DatabaseClient {
  const envFilePath = path.join(process.cwd(), ".env.local");
  if (existsSync(envFilePath)) {
    const env = loadEnvFile(envFilePath);
    for (const [key, value] of Object.entries(env)) {
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
  pageSize = 1000
) {
  const rows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const page = await fetchPage(from, from + pageSize - 1);
    rows.push(...page);
    if (page.length < pageSize) {
      break;
    }
  }

  return rows;
}

function stripNumbering(segment: string): string {
  return segment.replace(/^\d+[\d.)\s-]*/, "").trim();
}

function humanizeSlug(value: string): string {
  return value.replace(/[-_]+/g, " ").trim();
}

function normalizeLabel(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/&/g, " and ")
    .replace(/::/g, " ")
    .replace(/[_/()-]+/g, " ")
    .replace(/[^\w\s]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

function normalizedSet(values: Iterable<string>): string[] {
  return [...new Set([...values].map((value) => normalizeLabel(value)).filter(Boolean))];
}

function inferSourceFamily(deckName: string): string {
  const normalized = normalizeLabel(deckName);
  if (normalized.includes("orthobullets")) {
    return "orthobullets";
  }
  if (normalized.includes("pocket pimped")) {
    return "pocket-pimped";
  }
  if (normalized.includes("netter")) {
    return "netter";
  }
  if (normalized.includes("aaos res study")) {
    return "aaos-res-study";
  }
  if (normalized.includes("hip and knee book")) {
    return "hip-knee-book";
  }
  return "other";
}

function inferSpecialty(values: string[]): string | null {
  const normalized = values.map((value) => normalizeLabel(value));
  for (const specialty of SPECIALTY_RULES) {
    if (
      specialty.aliases.some((alias) =>
        normalized.some((value) => value.includes(normalizeLabel(alias)))
      )
    ) {
      return specialty.slug;
    }
  }
  return null;
}

function removeLeadingSpecialty(label: string, specialtySlug: string | null): string {
  if (!specialtySlug) {
    return label;
  }

  const rule = SPECIALTY_RULES.find((item) => item.slug === specialtySlug);
  if (!rule) {
    return label;
  }

  let value = label;
  for (const alias of rule.aliases) {
    const normalizedAlias = normalizeLabel(alias);
    const normalizedValue = normalizeLabel(value);
    if (normalizedValue.startsWith(normalizedAlias + " ")) {
      value = value.slice(alias.length).trim();
      break;
    }
  }

  return value.trim();
}

function extractTagLabels(rawTag: string, specialtySlug: string | null): string[] {
  const labels = new Set<string>();
  const segments = rawTag.split("::").map((segment) => stripNumbering(segment)).filter(Boolean);

  labels.add(rawTag);
  for (const segment of segments) {
    labels.add(segment);
    labels.add(removeLeadingSpecialty(segment, specialtySlug));
  }

  if (segments.length > 1) {
    labels.add(segments.slice(1).join(" "));
  }

  const leaf = segments[segments.length - 1] ?? rawTag;
  labels.add(leaf);
  labels.add(removeLeadingSpecialty(leaf, specialtySlug));

  return normalizedSet(labels);
}

function extractDeckLabels(deckPath: string[], specialtySlug: string | null): string[] {
  const cleanedSegments = deckPath.map(stripNumbering).filter(Boolean);
  const labels = new Set<string>();
  if (cleanedSegments.length === 0) {
    return [];
  }

  const sourceIndex = cleanedSegments.findIndex((segment) =>
    ["OrthoBullets", "Pocket Pimped", "Netter's Concise Orthopaedic Anatomy", "AAOS Res Study", "Hip and Knee Book"].includes(segment)
  );
  const scoped = sourceIndex >= 0 ? cleanedSegments.slice(sourceIndex + 1) : cleanedSegments.slice(1);

  for (const segment of scoped.slice(-3)) {
    labels.add(segment);
    labels.add(removeLeadingSpecialty(segment, specialtySlug));
  }

  if (scoped.length >= 2) {
    labels.add(scoped.slice(-2).join(" "));
  }

  return normalizedSet(labels);
}

function createReasonableAliasCandidates(node: NodeDescriptor): string[] {
  return normalizedSet([
    node.title,
    node.shortLabel ?? "",
    humanizeSlug(node.slug),
  ]);
}

function isBroadNormalizedLabel(label: string): boolean {
  const normalized = normalizeTagToken(label);
  return [
    "trauma",
    "shoulder",
    "elbow",
    "hand",
    "foot",
    "ankle",
    "hip",
    "knee",
    "sports",
    "pediatrics",
    "anatomy",
    "muscles",
    "bones",
    "general anatomy",
    "general knowledge",
    "upper extremity",
    "lower extremity",
    "pelvis",
    "spine",
    "xrays",
  ].includes(normalized);
}

async function loadCardContexts(supabase: DatabaseClient, options: MappingOptions): Promise<CardContext[]> {
  const canonicalCards = await fetchAllRows(async (from, to) => {
    const { data, error } = await supabase
      .from("canonical_cards")
      .select("id, anki_note_id, anki_card_id, title")
      .range(from, to);
    if (error) {
      throw error;
    }
    return (data ?? []) as Array<Record<string, unknown>>;
  });

  const notes = await fetchAllRows(async (from, to) => {
    const { data, error } = await supabase
      .from("anki_notes")
      .select("id, import_batch_id")
      .eq("import_batch_id", options.batchId)
      .range(from, to);
    if (error) {
      throw error;
    }
    return (data ?? []) as Array<Record<string, unknown>>;
  });
  const noteIds = new Set(notes.map((note) => String(note.id)));

  const cards = await fetchAllRows(async (from, to) => {
    const { data, error } = await supabase
      .from("anki_cards")
      .select("id, note_id, deck_id")
      .eq("import_batch_id", options.batchId)
      .range(from, to);
    if (error) {
      throw error;
    }
    return (data ?? []) as Array<Record<string, unknown>>;
  });

  const cardsById = new Map(cards.map((card) => [String(card.id), card]));
  const relevantCanonical = canonicalCards.filter(
    (row) =>
      noteIds.has(String(row.anki_note_id ?? "")) &&
      cardsById.has(String(row.anki_card_id ?? ""))
  );

  const deckIds = [...new Set(cards.map((card) => String(card.deck_id ?? "")).filter(Boolean))];
  const decks: Array<Record<string, unknown>> = [];
  for (const chunk of chunkArray(deckIds, 200)) {
    const { data, error } = await supabase
      .from("anki_decks")
      .select("id, full_name, deck_path")
      .in("id", chunk);
    if (error) {
      throw error;
    }
    decks.push(...((data ?? []) as Array<Record<string, unknown>>));
  }
  const decksById = new Map(decks.map((deck) => [String(deck.id), deck]));

  const noteTagRows = await fetchAllRows(async (from, to) => {
    const { data, error } = await supabase
      .from("anki_note_tags")
      .select("note_id, tag_id")
      .eq("import_batch_id", options.batchId)
      .range(from, to);
    if (error) {
      throw error;
    }
    return (data ?? []) as Array<Record<string, unknown>>;
  });

  const tagRows = await fetchAllRows(async (from, to) => {
    const { data, error } = await supabase
      .from("anki_tags")
      .select("id, raw_name")
      .eq("import_batch_id", options.batchId)
      .range(from, to);
    if (error) {
      throw error;
    }
    return (data ?? []) as Array<Record<string, unknown>>;
  });
  const tagsById = new Map(tagRows.map((tag) => [String(tag.id), String(tag.raw_name)]));

  const tagsByNoteId = new Map<string, string[]>();
  for (const row of noteTagRows) {
    const noteId = String(row.note_id);
    const tagName = tagsById.get(String(row.tag_id));
    if (!tagName) {
      continue;
    }
    const bucket = tagsByNoteId.get(noteId) ?? [];
    bucket.push(tagName);
    tagsByNoteId.set(noteId, bucket);
  }

  const contexts = relevantCanonical.map((row) => {
    const noteId = String(row.anki_note_id);
    const cardId = String(row.anki_card_id);
    const card = cardsById.get(cardId);
    const deck = card ? decksById.get(String(card.deck_id ?? "")) : null;
    const deckPath = Array.isArray(deck?.deck_path) ? (deck?.deck_path as string[]) : [];
    return {
      canonicalCardId: String(row.id),
      noteId,
      cardId,
      deckId: card ? String(card.deck_id ?? "") || null : null,
      deckName: String(deck?.full_name ?? ""),
      deckPath,
      tags: [...new Set(tagsByNoteId.get(noteId) ?? [])].sort((a, b) => a.localeCompare(b)),
      title: (row.title as string | null) ?? null,
    };
  });

  const filtered = contexts.filter((context) =>
    options.deckPrefix ? context.deckName.startsWith(options.deckPrefix) : true
  );

  return options.limit ? filtered.slice(0, options.limit) : filtered;
}

async function loadKnowledgeGraph(supabase: DatabaseClient) {
  const [specialties, nodes, sourceAliases, concepts, conceptAliases] = await Promise.all([
    fetchAllRows(async (from, to) => {
      const { data, error } = await supabase
        .from("specialties")
        .select("id, slug, name")
        .eq("is_active", true)
        .range(from, to);
      if (error) {
        throw error;
      }
      return (data ?? []) as Array<Record<string, unknown>>;
    }),
    fetchAllRows(async (from, to) => {
      const { data, error } = await supabase
        .from("curriculum_nodes")
        .select("id, slug, title, short_label, node_type, specialty_id")
        .eq("is_active", true)
        .range(from, to);
      if (error) {
        throw error;
      }
      return (data ?? []) as Array<Record<string, unknown>>;
    }),
    fetchAllRows(async (from, to) => {
      const { data, error } = await supabase
        .from("source_aliases")
        .select("entity_id, entity_type, alias_value")
        .eq("entity_type", "curriculum_node")
        .eq("is_active", true)
        .range(from, to);
      if (error) {
        throw error;
      }
      return (data ?? []) as Array<Record<string, unknown>>;
    }),
    fetchAllRows(async (from, to) => {
      const { data, error } = await supabase
        .from("concepts")
        .select("id, curriculum_node_id, canonical_name")
        .eq("is_active", true)
        .range(from, to);
      if (error) {
        throw error;
      }
      return (data ?? []) as Array<Record<string, unknown>>;
    }),
    fetchAllRows(async (from, to) => {
      const { data, error } = await supabase
        .from("concept_aliases")
        .select("concept_id, alias_name")
        .eq("is_active", true)
        .range(from, to);
      if (error) {
        throw error;
      }
      return (data ?? []) as Array<Record<string, unknown>>;
    }),
  ]);

  const specialtyById = new Map(
    specialties.map((row) => [String(row.id), { slug: String(row.slug), name: String(row.name) }])
  );

  const nodeAliasRows: Array<Record<string, unknown>> = [];
  try {
    const rows = await fetchAllRows(async (from, to) => {
      const { data, error } = await supabase
        .from("curriculum_node_aliases")
        .select("curriculum_node_id, alias_name, normalized_alias")
        .eq("is_active", true)
        .range(from, to);
      if (error) {
        throw error;
      }
      return (data ?? []) as Array<Record<string, unknown>>;
    });
    nodeAliasRows.push(...rows);
  } catch {
    // Dry runs can proceed before the migration is applied.
  }

  const nodeDescriptors = nodes.map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    shortLabel: (row.short_label as string | null) ?? null,
    nodeType: String(row.node_type),
    specialtyId: (row.specialty_id as string | null) ?? null,
    specialtySlug: row.specialty_id ? specialtyById.get(String(row.specialty_id))?.slug ?? null : null,
  }));

  const nodeById = new Map(nodeDescriptors.map((node) => [node.id, node]));
  const aliasIndex = new Map<string, AliasEntry[]>();

  function addAlias(normalizedAlias: string, entry: AliasEntry) {
    if (!normalizedAlias) {
      return;
    }
    const bucket = aliasIndex.get(normalizedAlias) ?? [];
    if (!bucket.some((existing) => existing.nodeId === entry.nodeId && existing.aliasSource === entry.aliasSource)) {
      bucket.push(entry);
      aliasIndex.set(normalizedAlias, bucket);
    }
  }

  for (const node of nodeDescriptors) {
    for (const normalizedAlias of createReasonableAliasCandidates(node)) {
      addAlias(normalizedAlias, {
        nodeId: node.id,
        nodeSlug: node.slug,
        nodeTitle: node.title,
        specialtyId: node.specialtyId,
        specialtySlug: node.specialtySlug,
        aliasSource: normalizedAlias === normalizeLabel(node.title) ? "title" : "slug",
      });
    }
    if (node.shortLabel) {
      addAlias(normalizeLabel(node.shortLabel), {
        nodeId: node.id,
        nodeSlug: node.slug,
        nodeTitle: node.title,
        specialtyId: node.specialtyId,
        specialtySlug: node.specialtySlug,
        aliasSource: "short_label",
      });
    }
  }

  for (const row of sourceAliases) {
    const node = nodeById.get(String(row.entity_id));
    if (!node) {
      continue;
    }
    addAlias(normalizeLabel(String(row.alias_value)), {
      nodeId: node.id,
      nodeSlug: node.slug,
      nodeTitle: node.title,
      specialtyId: node.specialtyId,
      specialtySlug: node.specialtySlug,
      aliasSource: "source_alias",
    });
  }

  for (const row of nodeAliasRows) {
    const node = nodeById.get(String(row.curriculum_node_id));
    if (!node) {
      continue;
    }
    addAlias(String(row.normalized_alias), {
      nodeId: node.id,
      nodeSlug: node.slug,
      nodeTitle: node.title,
      specialtyId: node.specialtyId,
      specialtySlug: node.specialtySlug,
      aliasSource: "curriculum_alias",
    });
  }

  const conceptAliasLookup = new Map<string, number>();
  for (const row of concepts) {
    const name = normalizeLabel(String(row.canonical_name));
    conceptAliasLookup.set(name, (conceptAliasLookup.get(name) ?? 0) + 1);
  }
  for (const row of conceptAliases) {
    const name = normalizeLabel(String(row.alias_name));
    conceptAliasLookup.set(name, (conceptAliasLookup.get(name) ?? 0) + 1);
  }

  return {
    nodeDescriptors,
    nodeById,
    aliasIndex,
    conceptAliasLookup,
  };
}

function evaluateCard(
  card: CardContext,
  graph: Awaited<ReturnType<typeof loadKnowledgeGraph>>,
  minConfidence: number
): MappingDecision {
  const sourceFamily = inferSourceFamily(card.deckName);
  const specialtyFromDeck = inferSpecialty(card.deckPath);
  const specialtyFromTags = inferSpecialty(card.tags);
  const inferredSpecialtySlug = specialtyFromDeck ?? specialtyFromTags;

  const provenanceTags = card.tags.filter((tag) => classifyAnkiTagRole(tag) === "source_provenance");
  const topicalTags = card.tags.filter((tag) => {
    const role = classifyAnkiTagRole(tag);
    return role !== "source_provenance" && role !== "deck_navigation";
  });

  const candidateByNodeId = new Map<string, NodeCandidate>();

  function touchCandidate(match: AliasEntry, origin: "tag" | "deck", rawLabel: string, role: AnkiTagRole) {
    const node = graph.nodeById.get(match.nodeId);
    if (!node) {
      return;
    }

    const current = candidateByNodeId.get(match.nodeId) ?? {
      node,
      matchedLabels: new Set<string>(),
      matchedByTag: false,
      matchedByDeck: false,
      matchedBySourceAlias: false,
      matchedRoleKinds: new Set<AnkiTagRole>(),
      specialtyMatch: Boolean(inferredSpecialtySlug && inferredSpecialtySlug === node.specialtySlug),
      evidence: [],
      confidence: 0,
      reviewStatus: "needs_review",
    };

    current.matchedLabels.add(rawLabel);
    current.matchedRoleKinds.add(role);
    current.specialtyMatch =
      current.specialtyMatch || Boolean(inferredSpecialtySlug && inferredSpecialtySlug === node.specialtySlug);
    if (origin === "tag") {
      current.matchedByTag = true;
    }
    if (origin === "deck") {
      current.matchedByDeck = true;
    }
    if (match.aliasSource === "source_alias") {
      current.matchedBySourceAlias = true;
    }
    current.evidence.push(`${origin}:${rawLabel}:${match.aliasSource}`);
    candidateByNodeId.set(match.nodeId, current);
  }

  for (const tag of topicalTags) {
    const role = classifyAnkiTagRole(tag);
    const labels = extractTagLabels(tag, inferredSpecialtySlug);
    for (const label of labels) {
      const matches = graph.aliasIndex.get(label) ?? [];
      for (const match of matches) {
        touchCandidate(match, "tag", label, role);
      }
    }
  }

  const deckLabels = extractDeckLabels(card.deckPath, inferredSpecialtySlug);
  for (const label of deckLabels) {
    const matches = graph.aliasIndex.get(label) ?? [];
    for (const match of matches) {
      touchCandidate(match, "deck", label, "deck_navigation");
    }
  }

  const candidates = [...candidateByNodeId.values()].map((candidate) => {
    let confidence = 0.0;
    if (candidate.matchedByTag) {
      confidence += 0.58;
    }
    if (candidate.matchedByDeck) {
      confidence += 0.18;
    }
    if (candidate.specialtyMatch) {
      confidence += 0.14;
    }
    if (candidate.matchedBySourceAlias) {
      confidence += 0.08;
    }
    if (candidate.matchedLabels.size > 1) {
      confidence += 0.03;
    }

    const hasOnlyBroadSignal =
      candidate.matchedRoleKinds.size > 0 &&
      [...candidate.matchedRoleKinds].every((role) => role === "broad_bucket" || role === "deck_navigation");
    if (hasOnlyBroadSignal) {
      confidence = Math.min(confidence, 0.68);
    }
    if (candidate.node.nodeType === "specialty") {
      confidence = Math.min(confidence, 0.72);
    }
    if (sourceFamily === "orthobullets" && candidate.matchedByTag && candidate.specialtyMatch) {
      confidence += 0.03;
    }

    candidate.confidence = Math.min(Number(confidence.toFixed(3)), 0.99);
    candidate.reviewStatus = candidate.confidence >= minConfidence ? "auto_mapped" : "needs_review";
    return candidate;
  });

  candidates.sort((left, right) => right.confidence - left.confidence || left.node.title.localeCompare(right.node.title));

  const questionableReasons: string[] = [];
  if (topicalTags.length === 0 && provenanceTags.length > 0) {
    questionableReasons.push("source_only_tags");
  }

  const selected = candidates[0] ?? null;
  if (!selected) {
    return {
      card,
      inferredSpecialtySlug,
      provenanceTags,
      selected: null,
      candidates: [],
      status: "none",
      questionableReasons,
    };
  }

  if (candidates.length > 1 && candidates[1].confidence >= selected.confidence - 0.05) {
    selected.confidence = Math.max(Number((selected.confidence - 0.12).toFixed(3)), 0);
    selected.reviewStatus = selected.confidence >= minConfidence ? "auto_mapped" : "needs_review";
    questionableReasons.push("ambiguous_top_match");
  }
  if (!selected.matchedByTag && selected.matchedByDeck) {
    questionableReasons.push("deck_only_match");
  }
  if ([...selected.matchedLabels].every((label) => isBroadNormalizedLabel(label))) {
    questionableReasons.push("broad_label_match");
  }
  if (selected.node.nodeType === "specialty") {
    questionableReasons.push("specialty_level_match");
  }

  if (provenanceTags.length === card.tags.length) {
    selected.confidence = 0;
    selected.reviewStatus = "needs_review";
    questionableReasons.push("provenance_only");
  }

  let status: "high" | "medium" | "none" = "none";
  if (selected.confidence >= HIGH_CONFIDENCE_THRESHOLD && selected.reviewStatus === "auto_mapped") {
    status = "high";
  } else if (selected.confidence >= MEDIUM_CONFIDENCE_THRESHOLD) {
    status = "medium";
  }

  return {
    card,
    inferredSpecialtySlug,
    provenanceTags,
    selected,
    candidates: candidates.slice(0, 3),
    status,
    questionableReasons,
  };
}

function summarizeMappings(decisions: MappingDecision[], minConfidence: number): MappingSummary {
  const topNodeCounts = new Map<string, { slug: string; title: string; count: number }>();
  const unmappedTags = new Map<string, number>();
  const unmappedDeckBranches = new Map<string, number>();
  const provenanceTagCounts = new Map<string, number>();
  const aliasRecommendations = new Map<string, number>();
  const highExamples: MappingExample[] = [];
  const questionableExamples: MappingExample[] = [];

  for (const decision of decisions) {
    for (const tag of decision.provenanceTags) {
      provenanceTagCounts.set(tag, (provenanceTagCounts.get(tag) ?? 0) + 1);
    }

    if (decision.status === "high" && decision.selected) {
      const key = decision.selected.node.slug;
      const bucket = topNodeCounts.get(key) ?? {
        slug: decision.selected.node.slug,
        title: decision.selected.node.title,
        count: 0,
      };
      bucket.count += 1;
      topNodeCounts.set(key, bucket);
      if (highExamples.length < 10) {
        highExamples.push({
          canonicalCardId: decision.card.canonicalCardId,
          deckName: decision.card.deckName,
          mappedNodeTitle: decision.selected.node.title,
          mappedNodeSlug: decision.selected.node.slug,
          confidence: decision.selected.confidence,
          matchedLabels: [...decision.selected.matchedLabels],
          reviewStatus: decision.selected.reviewStatus,
          reasons: decision.questionableReasons,
        });
      }
    }

    if (decision.status !== "high") {
      const branch = decision.card.deckPath.slice(0, 4).join("::");
      unmappedDeckBranches.set(branch, (unmappedDeckBranches.get(branch) ?? 0) + 1);
      for (const tag of decision.card.tags) {
        const role = classifyAnkiTagRole(tag);
        if (role === "source_provenance") {
          continue;
        }
        unmappedTags.set(tag, (unmappedTags.get(tag) ?? 0) + 1);
        aliasRecommendations.set(tag, (aliasRecommendations.get(tag) ?? 0) + 1);
      }
      if (questionableExamples.length < 10) {
        questionableExamples.push({
          canonicalCardId: decision.card.canonicalCardId,
          deckName: decision.card.deckName,
          mappedNodeTitle: decision.selected?.node.title ?? null,
          mappedNodeSlug: decision.selected?.node.slug ?? null,
          confidence: decision.selected?.confidence ?? null,
          matchedLabels: decision.selected ? [...decision.selected.matchedLabels] : [],
          reviewStatus: decision.selected?.reviewStatus ?? "needs_review",
          reasons: decision.questionableReasons,
        });
      }
    }
  }

  const highCount = decisions.filter((decision) => decision.status === "high").length;
  const mediumCount = decisions.filter((decision) => decision.status === "medium").length;
  const noMappingCount = decisions.filter((decision) => decision.status === "none").length;
  const candidateCount = decisions.reduce((sum, decision) => sum + decision.candidates.length, 0);

  const applied = decisions.filter(
    (decision) =>
      decision.selected &&
      decision.selected.confidence >= minConfidence &&
      decision.selected.reviewStatus === "auto_mapped"
  );
  const duplicateAppliedKeyCount =
    applied.length -
    new Set(
      applied.map((decision) => `${decision.card.canonicalCardId}:${decision.selected?.node.id ?? ""}`)
    ).size;

  return {
    totalCardsConsidered: decisions.length,
    highConfidenceMappings: highCount,
    mediumConfidenceMappings: mediumCount,
    noMapping: noMappingCount,
    appliedMappings: applied.length,
    candidateMappings: candidateCount,
    topMappedNodes: [...topNodeCounts.values()].sort((left, right) => right.count - left.count).slice(0, 25),
    unmappedTags: [...unmappedTags.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 50),
    unmappedDeckBranches: [...unmappedDeckBranches.entries()]
      .map(([branch, count]) => ({ branch, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 25),
    provenanceTags: [...provenanceTagCounts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 25),
    examplesHighConfidence: highExamples,
    examplesQuestionable: questionableExamples,
    recommendedAliasAdditions: [...aliasRecommendations.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 25),
    validation: {
      duplicateAppliedLinkKeys: duplicateAppliedKeyCount,
      sourceOnlyAppliedMappings: applied.filter((decision) => decision.questionableReasons.includes("source_only_tags")).length,
      mappingsMissingConfidence: applied.filter((decision) => !decision.selected?.confidence).length,
      mappingsWithWrongMethod: 0,
    },
  };
}

function toMarkdown(summary: MappingSummary, title: string, isApply: boolean) {
  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Total cards considered: ${summary.totalCardsConsidered}`);
  lines.push(`- Cards with high-confidence mappings: ${summary.highConfidenceMappings}`);
  lines.push(`- Cards with medium-confidence mappings: ${summary.mediumConfidenceMappings}`);
  lines.push(`- Cards with no mapping: ${summary.noMapping}`);
  lines.push(`- ${isApply ? "Applied mappings" : "High-confidence mappings eligible for apply"}: ${summary.appliedMappings}`);
  lines.push(`- Candidate mappings recorded: ${summary.candidateMappings}`);
  lines.push("");
  lines.push("## Top Mapped Nodes");
  lines.push("");
  for (const item of summary.topMappedNodes.slice(0, 20)) {
    lines.push(`- ${item.title} (\`${item.slug}\`): ${item.count}`);
  }
  lines.push("");
  lines.push("## Unmapped Tags");
  lines.push("");
  for (const item of summary.unmappedTags.slice(0, 20)) {
    lines.push(`- ${item.tag}: ${item.count}`);
  }
  lines.push("");
  lines.push("## Unmapped Deck Branches");
  lines.push("");
  for (const item of summary.unmappedDeckBranches.slice(0, 15)) {
    lines.push(`- ${item.branch}: ${item.count}`);
  }
  lines.push("");
  lines.push("## Provenance Tags Detected");
  lines.push("");
  for (const item of summary.provenanceTags.slice(0, 15)) {
    lines.push(`- ${item.tag}: ${item.count}`);
  }
  lines.push("");
  lines.push("## High-Confidence Examples");
  lines.push("");
  for (const item of summary.examplesHighConfidence.slice(0, 8)) {
    lines.push(
      `- ${item.deckName} -> ${item.mappedNodeTitle} (\`${item.mappedNodeSlug}\`) confidence ${item.confidence} via ${item.matchedLabels.join(", ")}`
    );
  }
  lines.push("");
  lines.push("## Questionable Examples");
  lines.push("");
  for (const item of summary.examplesQuestionable.slice(0, 8)) {
    lines.push(
      `- ${item.deckName} -> ${item.mappedNodeTitle ?? "unmapped"} confidence ${item.confidence ?? "n/a"} reasons: ${item.reasons.join(", ")}`
    );
  }
  lines.push("");
  lines.push("## Recommended Next Alias Additions");
  lines.push("");
  for (const item of summary.recommendedAliasAdditions.slice(0, 15)) {
    lines.push(`- ${item.label}: ${item.count}`);
  }
  lines.push("");
  lines.push("## Validation");
  lines.push("");
  lines.push(`- Duplicate applied card-node keys: ${summary.validation.duplicateAppliedLinkKeys}`);
  lines.push(`- Applied mappings sourced only from provenance tags: ${summary.validation.sourceOnlyAppliedMappings}`);
  lines.push(`- Applied mappings missing confidence: ${summary.validation.mappingsMissingConfidence}`);
  lines.push(`- Applied mappings with wrong method: ${summary.validation.mappingsWithWrongMethod}`);
  lines.push("");
  return lines.join("\n");
}

async function assertApplySupportTables(supabase: DatabaseClient) {
  for (const table of ["curriculum_node_aliases", "anki_kg_mapping_runs", "anki_kg_mapping_candidates"]) {
    const { error } = await supabase.from(table).select("id").limit(1);
    if (error) {
      throw new Error(`Required mapping support table ${table} is not available: ${error.message}`);
    }
  }
}

async function insertRunRecord(supabase: DatabaseClient, options: MappingOptions) {
  const { data, error } = await supabase
    .from("anki_kg_mapping_runs")
    .insert({
      import_batch_id: options.batchId,
      mapper_version: MAPPER_VERSION,
      run_mode: options.apply ? "apply" : "dry_run",
      status: "pending",
      min_confidence: options.minConfidence,
      deck_prefix: options.deckPrefix,
      limit_count: options.limit,
      metadata: {
        high_priority_prefixes: HIGH_PRIORITY_PREFIXES,
      },
      comments: "Deterministic Anki-to-KG mapping v1 run.",
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return String(data.id);
}

async function cleanupMappingRunArtifacts(
  supabase: DatabaseClient,
  runId: string,
  failureDetails: string
): Promise<CleanupResult> {
  const { count: candidateRowCount, error: candidateCountError } = await supabase
    .from("anki_kg_mapping_candidates")
    .select("id", { count: "exact", head: true })
    .eq("mapping_run_id", runId);
  if (candidateCountError) {
    throw candidateCountError;
  }
  if ((candidateRowCount ?? 0) > 0) {
    const { error } = await supabase
      .from("anki_kg_mapping_candidates")
      .delete()
      .eq("mapping_run_id", runId);
    if (error) {
      throw error;
    }
  }

  const linkRows = await fetchAllRows(async (from, to) => {
    const { data, error } = await supabase
      .from("card_knowledge_links")
      .select("id")
      .contains("metadata", { mapping_run_id: runId })
      .range(from, to);
    if (error) {
      throw error;
    }
    return (data ?? []) as Array<Record<string, unknown>>;
  });
  const linkIds = linkRows.map((row) => String(row.id));
  if (linkIds.length > 0) {
    for (const chunk of chunkArray(linkIds, 200)) {
      const { error } = await supabase.from("card_knowledge_links").delete().in("id", chunk);
      if (error) {
        throw error;
      }
    }
  }

  const { error: runUpdateError } = await supabase
    .from("anki_kg_mapping_runs")
    .update({
      status: "failed",
      comments: failureDetails,
    })
    .eq("id", runId)
    .neq("status", "completed");
  if (runUpdateError) {
    throw runUpdateError;
  }

  return {
    runId,
    candidateRowsDeleted: candidateRowCount ?? 0,
    cardKnowledgeLinksDeleted: linkIds.length,
  };
}

async function cleanupIncompleteRunsForBatch(
  supabase: DatabaseClient,
  batchId: string
): Promise<CleanupResult[]> {
  const { data: runs, error } = await supabase
    .from("anki_kg_mapping_runs")
    .select("id,status")
    .eq("import_batch_id", batchId)
    .in("status", ["failed", "pending"]);
  if (error) {
    throw error;
  }

  const cleanupResults: CleanupResult[] = [];
  for (const run of runs ?? []) {
    cleanupResults.push(
      await cleanupMappingRunArtifacts(
        supabase,
        String(run.id),
        `Deterministic mapping run ${String(run.id)} cleaned before retry because it was ${String(run.status)} with partial artifacts.`
      )
    );
  }

  return cleanupResults;
}

async function applyMappings(
  supabase: DatabaseClient,
  runId: string,
  decisions: MappingDecision[],
  summary: MappingSummary
) {
  const highConfidenceDecisions = decisions.filter(
    (decision) =>
      decision.selected &&
      decision.selected.reviewStatus === "auto_mapped" &&
      decision.selected.confidence >= HIGH_CONFIDENCE_THRESHOLD
  );

  const generatedCandidateRows = decisions.flatMap((decision) =>
    decision.candidates.map((candidate, index) => ({
      mapping_run_id: runId,
      canonical_card_id: decision.card.canonicalCardId,
      specialty_id: candidate.node.specialtyId,
      curriculum_node_id: candidate.node.id,
      concept_id: null,
      candidate_rank: index + 1,
      mapping_confidence: candidate.confidence,
      review_status: index === 0 && candidate.reviewStatus === "auto_mapped" ? "auto_mapped" : "needs_review",
      mapper_type: "deterministic",
      is_selected: index === 0,
      metadata: {
        inferred_specialty_slug: decision.inferredSpecialtySlug,
        matched_labels: [...candidate.matchedLabels],
        evidence: candidate.evidence,
        questionable_reasons: decision.questionableReasons,
      },
      comments: "Deterministic mapping candidate from Anki-to-KG mapper v1.",
      is_active: true,
    }))
  );

  const candidateRowByKey = new Map<string, Record<string, unknown>>();
  for (const row of generatedCandidateRows) {
    const key = [
      String(row.mapping_run_id),
      String(row.canonical_card_id),
      String(row.curriculum_node_id ?? "null"),
      String(row.concept_id ?? "null"),
    ].join(":");
    const existing = candidateRowByKey.get(key);
    if (!existing) {
      candidateRowByKey.set(key, row);
      continue;
    }

    const existingConfidence = Number(existing.mapping_confidence ?? 0);
    const nextConfidence = Number(row.mapping_confidence ?? 0);
    if (nextConfidence > existingConfidence) {
      const mergedMetadata = {
        ...(existing.metadata as Record<string, unknown>),
        ...(row.metadata as Record<string, unknown>),
        matched_labels: [
          ...new Set([
            ...(((existing.metadata as Record<string, unknown>)?.matched_labels as string[] | undefined) ?? []),
            ...(((row.metadata as Record<string, unknown>)?.matched_labels as string[] | undefined) ?? []),
          ]),
        ],
        evidence: [
          ...new Set([
            ...(((existing.metadata as Record<string, unknown>)?.evidence as string[] | undefined) ?? []),
            ...(((row.metadata as Record<string, unknown>)?.evidence as string[] | undefined) ?? []),
          ]),
        ],
        questionable_reasons: [
          ...new Set([
            ...(((existing.metadata as Record<string, unknown>)?.questionable_reasons as string[] | undefined) ?? []),
            ...(((row.metadata as Record<string, unknown>)?.questionable_reasons as string[] | undefined) ?? []),
          ]),
        ],
      };
      candidateRowByKey.set(key, {
        ...row,
        metadata: mergedMetadata,
      });
    }
  }
  const candidateRows = [...candidateRowByKey.values()];

  for (const [chunkIndex, chunk] of chunkArray(candidateRows, 200).entries()) {
    if (chunk.length === 0) {
      continue;
    }
    const { error } = await supabase.from("anki_kg_mapping_candidates").insert(chunk);
    if (error) {
      throw buildBatchError(
        "anki_kg_mapping_candidates",
        chunkIndex,
        chunk.length,
        chunk[0],
        runId,
        error
      );
    }
  }

  const cardIds = highConfidenceDecisions.map((decision) => decision.card.canonicalCardId);
  const existingLinks = cardIds.length
    ? await fetchAllRows(async (from, to) => {
        const chunkIds = cardIds.slice(from, to + 1);
        if (chunkIds.length === 0) {
          return [];
        }
        const { data, error } = await supabase
          .from("card_knowledge_links")
          .select("id, canonical_card_id, curriculum_node_id, concept_id, link_method")
          .in("canonical_card_id", chunkIds)
          .eq("is_active", true);
        if (error) {
          throw error;
        }
        return (data ?? []) as Array<Record<string, unknown>>;
      }, 200)
    : [];

  const existingByKey = new Map(
    existingLinks.map((row) => [
      `${row.canonical_card_id}:${row.curriculum_node_id ?? ""}:${row.concept_id ?? ""}`,
      row,
    ])
  );

  const inserts: Array<Record<string, unknown>> = [];
  const updates: Array<{ id: string; payload: Record<string, unknown> }> = [];
  const aliasRows: Array<Record<string, unknown>> = [];

  for (const decision of highConfidenceDecisions) {
    const selected = decision.selected;
    if (!selected) {
      continue;
    }
    const key = `${decision.card.canonicalCardId}:${selected.node.id}:`;
    const payload = {
      canonical_card_id: decision.card.canonicalCardId,
      specialty_id: selected.node.specialtyId,
      curriculum_node_id: selected.node.id,
      learning_objective_id: null,
      concept_id: null,
      mapping_confidence: selected.confidence,
      review_status: "auto_mapped",
      link_method: "deterministic",
      is_primary: true,
      metadata: {
        mapper_version: MAPPER_VERSION,
        mapping_run_id: runId,
        matched_labels: [...selected.matchedLabels],
        evidence: selected.evidence,
      },
      comments: "Auto-mapped by deterministic Anki-to-KG mapping v1.",
      is_active: true,
    };

    const existing = existingByKey.get(key);
    if (existing) {
      updates.push({
        id: String(existing.id),
        payload,
      });
    } else {
      inserts.push(payload);
    }

    for (const label of selected.matchedLabels) {
      aliasRows.push({
        curriculum_node_id: selected.node.id,
        alias_name: label,
        normalized_alias: normalizeLabel(label),
        alias_type: selected.matchedByTag ? "tag_label" : "deck_label",
        metadata: {
          mapper_version: MAPPER_VERSION,
          mapping_run_id: runId,
        },
        comments: "Derived from high-confidence deterministic Anki mapping.",
        is_active: true,
      });
    }
  }

  const updateById = new Map<string, Record<string, unknown>>();
  for (const update of updates) {
    const existing = updateById.get(update.id);
    if (!existing || Number(update.payload.mapping_confidence ?? 0) > Number(existing.mapping_confidence ?? 0)) {
      updateById.set(update.id, update.payload);
    }
  }

  const insertByKey = new Map<string, Record<string, unknown>>();
  for (const insert of inserts) {
    const key = [
      String(insert.canonical_card_id),
      String(insert.curriculum_node_id ?? "null"),
      String(insert.concept_id ?? "null"),
      "deterministic",
    ].join(":");
    const existing = insertByKey.get(key);
    if (!existing || Number(insert.mapping_confidence ?? 0) > Number(existing.mapping_confidence ?? 0)) {
      if (existing) {
        const mergedMetadata = {
          ...(existing.metadata as Record<string, unknown>),
          ...(insert.metadata as Record<string, unknown>),
          matched_labels: [
            ...new Set([
              ...(((existing.metadata as Record<string, unknown>)?.matched_labels as string[] | undefined) ?? []),
              ...(((insert.metadata as Record<string, unknown>)?.matched_labels as string[] | undefined) ?? []),
            ]),
          ],
          evidence: [
            ...new Set([
              ...(((existing.metadata as Record<string, unknown>)?.evidence as string[] | undefined) ?? []),
              ...(((insert.metadata as Record<string, unknown>)?.evidence as string[] | undefined) ?? []),
            ]),
          ],
        };
        insertByKey.set(key, {
          ...insert,
          metadata: mergedMetadata,
        });
      } else {
        insertByKey.set(key, insert);
      }
    }
  }

  for (const [updateIndex, [id, payload]] of [...updateById.entries()].entries()) {
    const { error } = await supabase
      .from("card_knowledge_links")
      .update(payload)
      .eq("id", id);
    if (error) {
      throw buildBatchError("card_knowledge_links:update", updateIndex, 1, payload, runId, error);
    }
  }

  const dedupedInserts = [...insertByKey.values()];
  for (const [chunkIndex, chunk] of chunkArray(dedupedInserts, 200).entries()) {
    if (chunk.length === 0) {
      continue;
    }
    const { error } = await supabase.from("card_knowledge_links").insert(chunk);
    if (error) {
      throw buildBatchError("card_knowledge_links:insert", chunkIndex, chunk.length, chunk[0], runId, error);
    }
  }

  const aliasByKey = new Map<string, Record<string, unknown>>();
  for (const row of aliasRows) {
    const key = `${String(row.curriculum_node_id)}:${String(row.normalized_alias)}`;
    const existing = aliasByKey.get(key);
    if (!existing) {
      aliasByKey.set(key, row);
      continue;
    }
    aliasByKey.set(key, {
      ...row,
      metadata: {
        ...(existing.metadata as Record<string, unknown>),
        ...(row.metadata as Record<string, unknown>),
      },
    });
  }
  const dedupedAliasRows = [...aliasByKey.values()];

  const aliasNodeIds = [...new Set(dedupedAliasRows.map((row) => String(row.curriculum_node_id)))];
  const existingAliases: Array<Record<string, unknown>> = [];
  for (const chunk of chunkArray(aliasNodeIds, 200)) {
    if (chunk.length === 0) {
      continue;
    }
    const { data, error } = await supabase
      .from("curriculum_node_aliases")
      .select("curriculum_node_id, normalized_alias")
      .in("curriculum_node_id", chunk);
    if (error) {
      throw buildBatchError("curriculum_node_aliases:lookup", 0, chunk.length, { curriculum_node_ids: chunk }, runId, error);
    }
    existingAliases.push(...((data ?? []) as Array<Record<string, unknown>>));
  }
  const existingAliasKeys = new Set(
    existingAliases.map((row) => `${String(row.curriculum_node_id)}:${String(row.normalized_alias)}`)
  );
  const aliasInsertRows = dedupedAliasRows.filter(
    (row) => !existingAliasKeys.has(`${String(row.curriculum_node_id)}:${String(row.normalized_alias)}`)
  );

  for (const [chunkIndex, chunk] of chunkArray(aliasInsertRows, 200).entries()) {
    if (chunk.length === 0) {
      continue;
    }
    const { error } = await supabase.from("curriculum_node_aliases").insert(chunk);
    if (error) {
      throw buildBatchError("curriculum_node_aliases:insert", chunkIndex, chunk.length, chunk[0], runId, error);
    }
  }

  const { error: updateRunError } = await supabase
    .from("anki_kg_mapping_runs")
    .update({
      status: "completed",
      total_cards_considered: summary.totalCardsConsidered,
      high_confidence_count: summary.highConfidenceMappings,
      medium_confidence_count: summary.mediumConfidenceMappings,
      no_mapping_count: summary.noMapping,
      applied_mapping_count: summary.appliedMappings,
      candidate_mapping_count: summary.candidateMappings,
      metadata: {
        mapper_version: MAPPER_VERSION,
        top_mapped_nodes: summary.topMappedNodes.slice(0, 10),
      },
    })
    .eq("id", runId);
  if (updateRunError) {
    throw buildBatchError("anki_kg_mapping_runs:update", 0, 1, { id: runId }, runId, updateRunError);
  }
}

export async function runAnkiKgMapping(options: MappingOptions) {
  const supabase = getSupabaseAdminClient();
  const cards = await loadCardContexts(supabase, options);
  const graph = await loadKnowledgeGraph(supabase);
  const decisions = cards.map((card) => evaluateCard(card, graph, options.minConfidence));
  const summary = summarizeMappings(decisions, options.minConfidence);

  let runId: string | null = null;
  if (options.apply) {
    await assertApplySupportTables(supabase);
    await cleanupIncompleteRunsForBatch(supabase, options.batchId);
    runId = await insertRunRecord(supabase, options);
    try {
      await applyMappings(supabase, runId, decisions, summary);
    } catch (error) {
      await cleanupMappingRunArtifacts(
        supabase,
        runId,
        `Deterministic mapping failed: ${describeUnknownError(error)}`
      );
      throw error;
    }
  }

  const dryRunReportPath = path.join(options.outDir, "anki-kg-mapping-v1-dry-run.md");
  const applyReportPath = path.join(options.outDir, "anki-kg-mapping-v1-report.md");
  mkdirSync(options.outDir, { recursive: true });
  writeFileSync(
    options.apply ? applyReportPath : dryRunReportPath,
    toMarkdown(
      summary,
      options.apply ? "Anki KG Mapping v1 Report" : "Anki KG Mapping v1 Dry Run",
      options.apply
    )
  );

  return {
    runId,
    summary,
    decisions,
    dryRunReportPath,
    applyReportPath,
  };
}
