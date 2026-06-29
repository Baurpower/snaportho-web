type CanonicalCoverageSnapshot = import("./lib/education/kg-canonical-coverage").CanonicalCoverageSnapshot;
type ProposalRecord = import("./kg-automation-common").ProposalRecord;
type ProposalSnapshot = import("./kg-automation-common").ProposalSnapshot;

const commonModulePromise = import(new URL("./kg-automation-common.ts", import.meta.url).href);
const coverageModulePromise = import(
  new URL("./lib/education/kg-canonical-coverage.ts", import.meta.url).href
);
const relationshipRegistryPromise = import(
  new URL("./lib/education/kg-relationship-registry.ts", import.meta.url).href
);

type ParsedArgs = {
  outDir: string;
  limit: number;
};

type CurriculumNodeAlias = {
  id: string;
  curriculum_node_id: string;
  alias_name: string;
  alias_type: string;
  normalized_alias: string;
};

type ConceptAlias = {
  id: string;
  concept_id: string;
  alias_name: string;
  alias_type: string;
};

type SourceAlias = {
  id: string;
  entity_type: string;
  entity_id: string;
  alias_kind: string;
  alias_value: string;
  source_id: string;
};

type ExternalSource = {
  id: string;
  slug: string;
  name: string;
};

type LearningObjective = {
  id: string;
  curriculum_node_id: string;
  objective_text: string;
};

type AnkiCardRef = {
  anki_card_id: string | null;
  deck_id: string | null;
};

type CanonicalCardRef = {
  id: string;
  anki_note_id: string | null;
  anki_card_id: string | null;
};

type AnkiDeck = {
  id: string;
  full_name: string;
  deck_path: string[];
};

type AnkiNoteRef = {
  id: string;
  anki_note_id: string | null;
};

type AnkiNoteTag = {
  note_id: string;
  tag_id: string;
};

type AnkiTag = {
  id: string;
  raw_name: string;
};

type ExistingProposal = {
  id: string;
  proposal_fingerprint: string;
  review_status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  applied_at: string | null;
  superseded_by: string | null;
};

type CanonicalRelationship = {
  id: string;
  subject_entity_id: string;
  predicate: string;
  object_entity_id: string;
};

type LabelSignal = {
  id: string;
  label: string;
  origin: string;
  source_id?: string;
};

type MatchCandidate = {
  entityId: string;
  label: string;
  entityType: string;
  score: number;
  reasons: string[];
};

type GenerationDebugRow = {
  curriculum_node_id: string;
  curriculum_node_path: string;
  curriculum_node_title: string;
  inferred_entity_type: string | null;
  card_count: number;
  question_count: number;
  total_mappings: number;
  exact_entity_id: string | null;
  exact_entity_label: string | null;
  top_match_entity_id: string | null;
  top_match_label: string | null;
  top_match_type: string | null;
  top_match_score: number | null;
  top_match_reasons: string[];
  decision:
    | "ambiguous_mapping"
    | "bridge_existing_entity"
    | "create_canonical_entity"
    | "suppressed_create"
    | "no_supported_decision";
  decision_reason: string;
};

function parseArgs(argv: string[]): ParsedArgs {
  let outDir = "reports";
  let limit = 50;

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--out-dir") {
      outDir = argv[index + 1] ?? outDir;
      index += 1;
    } else if (arg === "--limit") {
      const parsed = Number(argv[index + 1] ?? "50");
      limit = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : limit;
      index += 1;
    }
  }

  return { outDir, limit };
}

function inferEntityType(title: string) {
  const normalized = normalizeLabel(title);
  const conditionTokens = [
    "fracture",
    "tear",
    "myelopathy",
    "radiculopathy",
    "necrosis",
    "instability",
    "insufficiency",
    "tendinopathy",
    "arthritis",
    "syndrome",
    "sprain",
    "strain",
    "injury",
    "herniation",
    "stenosis",
    "scoliosis",
    "infection",
    "osteomyelitis",
    "dysplasia",
    "valgus",
    "rigidus",
    "dislocation",
    "rupture",
    "tumor",
    "sarcoma",
    "coalition",
    "nonunion",
    "impingement",
    "deformity",
    "ulcer",
    "disease",
    "palsy",
  ];
  if (
    conditionTokens.some((token) => normalized.includes(token))
  ) {
    return "condition";
  }
  if (normalized.includes("classification")) {
    return "classification_system";
  }
  if (
    normalized.includes("material properties") ||
    normalized.includes("biomechanics") ||
    normalized.includes("mechanics")
  ) {
    return "biomechanics_concept";
  }
  if (
    normalized.includes("artery") ||
    normalized.includes("nerve") ||
    normalized.includes("ligament") ||
    normalized.includes("tendon") ||
    normalized.includes("muscle")
  ) {
    return "anatomy_structure";
  }
  if (
    normalized.includes("arthroplasty") ||
    normalized.includes("fixation") ||
    normalized.includes("approach") ||
    normalized.includes("nailing")
  ) {
    return "procedure";
  }
  if (normalized.includes("implant") || normalized.includes("nail") || normalized.includes("plate")) {
    return "implant";
  }

  return null;
}

function normalizeLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['".,()/]/g, " ")
    .replace(/\s+/g, " ");
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function toConfidenceTier(score: number) {
  if (score >= 0.85) {
    return "high";
  }
  if (score >= 0.65) {
    return "medium";
  }
  return "low";
}

function defaultReviewStatus(tier: "high" | "medium" | "low") {
  return tier === "low" ? "generated" : "needs_review";
}

function typeMatchesConcept(entityType: string, conceptType: string) {
  const map: Record<string, string[]> = {
    anatomy: ["anatomy_structure"],
    biomechanics: ["biomechanics_concept"],
    classification: ["classification_system"],
    complication: ["complication"],
    procedure: ["procedure", "implant"],
    imaging: ["imaging_finding", "diagnostic_test"],
    terminology: ["condition", "classification_system", "procedure"],
    indication: ["treatment_principle", "procedure"],
    fact: ["condition", "procedure", "anatomy_structure"],
  };

  return (map[conceptType] ?? []).includes(entityType);
}

function genericPenalty(title: string) {
  const normalized = normalizeLabel(title);
  const genericTokens = [
    "considerations",
    "principles",
    "overview",
    "basics",
    "general",
    "orthopaedic implants",
    "implant basics",
  ];
  return genericTokens.some((token) => normalized.includes(token)) ? 0.18 : 0;
}

function splitFlagScore(title: string) {
  const normalized = normalizeLabel(title);
  return normalized.includes(" and ") || normalized.includes(" / ") || normalized.includes("&") ? 0.58 : 0;
}

function shouldSuppressEntityCreation(title: string) {
  const normalized = normalizeLabel(title);
  return normalized === "orthopaedic implants" || normalized === "legal considerations in orthopaedic practice";
}

function distinctCount(values: string[]) {
  return new Set(values.filter(Boolean)).size;
}

function dedupeLabels(signals: LabelSignal[]) {
  const seen = new Set<string>();
  const output: LabelSignal[] = [];

  for (const signal of signals) {
    const normalized = normalizeLabel(signal.label);
    if (!normalized || seen.has(`${normalized}:${signal.origin}`)) {
      continue;
    }

    seen.add(`${normalized}:${signal.origin}`);
    output.push(signal);
  }

  return output;
}

function buildLabelIndexes(
  snapshot: CanonicalCoverageSnapshot,
  canonicalEntitySourceAliases: SourceAlias[]
) {
  const entityById = new Map(snapshot.canonicalEntities.map((row) => [row.id, row]));
  const exactEntityByLabelAndType = new Map<string, MatchCandidate>();
  const labelIndex = new Map<string, MatchCandidate[]>();
  const slugIndex = new Map<string, MatchCandidate[]>();

  for (const entity of snapshot.canonicalEntities) {
    const baseCandidate: MatchCandidate = {
      entityId: entity.id,
      label: entity.preferred_label,
      entityType: entity.entity_type,
      score: 0,
      reasons: [],
    };

    const preferredKey = normalizeLabel(entity.preferred_label);
    exactEntityByLabelAndType.set(`${preferredKey}:${entity.entity_type}`, baseCandidate);
    const preferredBucket = labelIndex.get(preferredKey) ?? [];
    preferredBucket.push(baseCandidate);
    labelIndex.set(preferredKey, preferredBucket);

    if (entity.slug) {
      const slugBucket = slugIndex.get(entity.slug) ?? [];
      slugBucket.push(baseCandidate);
      slugIndex.set(entity.slug, slugBucket);
    }
  }

  for (const alias of canonicalEntitySourceAliases) {
    const entity = entityById.get(alias.entity_id);
    if (!entity) {
      continue;
    }

    const bucket = labelIndex.get(normalizeLabel(alias.alias_value)) ?? [];
    bucket.push({
      entityId: entity.id,
      label: entity.preferred_label,
      entityType: entity.entity_type,
      score: 0,
      reasons: [],
    });
    labelIndex.set(normalizeLabel(alias.alias_value), bucket);
  }

  return { entityById, exactEntityByLabelAndType, labelIndex, slugIndex };
}

function scoreSupport(cardCount: number, questionCount: number) {
  const total = cardCount + questionCount;
  if (total >= 20) return 0.15;
  if (total >= 10) return 0.1;
  if (total >= 5) return 0.05;
  return 0;
}

function findEntityMatches(
  title: string,
  slug: string,
  labels: LabelSignal[],
  indexes: ReturnType<typeof buildLabelIndexes>
) {
  const candidates = new Map<string, MatchCandidate>();
  const baseLabel = normalizeLabel(title);

  for (const candidate of indexes.labelIndex.get(baseLabel) ?? []) {
    candidates.set(candidate.entityId, {
      ...candidate,
      score: Math.max(candidates.get(candidate.entityId)?.score ?? 0, 0.55),
      reasons: ["exact normalized label"],
    });
  }

  for (const label of labels) {
    for (const candidate of indexes.labelIndex.get(normalizeLabel(label.label)) ?? []) {
      const prior = candidates.get(candidate.entityId);
      const score = label.origin === "source_alias" ? 0.32 : 0.24;
      candidates.set(candidate.entityId, {
        ...candidate,
        score: Math.max(prior?.score ?? 0, score),
        reasons: [...new Set([...(prior?.reasons ?? []), `${label.origin} match`])],
      });
    }
  }

  for (const candidate of indexes.slugIndex.get(slugify(title)) ?? []) {
    const prior = candidates.get(candidate.entityId);
    candidates.set(candidate.entityId, {
      ...candidate,
      score: Math.max(prior?.score ?? 0, 0.2),
      reasons: [...new Set([...(prior?.reasons ?? []), "slug match"])],
    });
  }

  for (const candidate of indexes.slugIndex.get(slug) ?? []) {
    const prior = candidates.get(candidate.entityId);
    candidates.set(candidate.entityId, {
      ...candidate,
      score: Math.max(prior?.score ?? 0, 0.2),
      reasons: [...new Set([...(prior?.reasons ?? []), "existing slug match"])],
    });
  }

  return [...candidates.values()].sort((left, right) => right.score - left.score);
}

function makeProposal(
  partial: Omit<ProposalRecord, "review_status" | "reviewed_by" | "reviewed_at" | "reviewer_notes" | "applied_at" | "superseded_by" | "comments" | "is_active">
) {
  const tier = partial.confidence_tier;
  return {
    ...partial,
    review_status: defaultReviewStatus(tier),
    reviewed_by: null,
    reviewed_at: null,
    reviewer_notes: null,
    applied_at: null,
    superseded_by: null,
    comments: null,
    is_active: true,
  } satisfies ProposalRecord;
}

function isStrongCurriculumBridgeMatch(args: {
  nodeTitle: string;
  inferredType: string | null;
  totalMappings: number;
  labelPenalty: number;
  supportScore: number;
  topMatch: MatchCandidate | null;
}) {
  const { inferredType, labelPenalty, nodeTitle, supportScore, topMatch, totalMappings } = args;
  if (!topMatch) {
    return false;
  }

  const score = topMatch.score + supportScore - labelPenalty;
  if (score >= 0.7) {
    return true;
  }

  const exactLabelMatch = normalizeLabel(topMatch.label) === normalizeLabel(nodeTitle);
  const compatibleType = !inferredType || topMatch.entityType === inferredType;

  return exactLabelMatch && compatibleType && totalMappings >= 5;
}

function buildExactEntityMatch(
  nodeTitle: string,
  inferredType: string | null,
  indexes: ReturnType<typeof buildLabelIndexes>
) {
  const normalizedTitle = normalizeLabel(nodeTitle);
  if (!inferredType) {
    return null;
  }

  const exact = indexes.exactEntityByLabelAndType.get(`${normalizedTitle}:${inferredType}`) ?? null;
  if (!exact) {
    return null;
  }

  return {
    ...exact,
    score: Math.max(exact.score, 0.6),
    reasons: ["exact normalized label + entity type"],
  } satisfies MatchCandidate;
}

async function main() {
  const { chunkArray, createServiceRoleClient, ensureOutDir, writeSnapshot } = await commonModulePromise;
  const { buildCurriculumNodePath, findCurriculumBridgeGaps, loadCanonicalCoverageSnapshot } =
    await coverageModulePromise;
  const { getGenerationRelationRules, validateRelationshipTriple } = await relationshipRegistryPromise;
  const args = parseArgs(process.argv);
  ensureOutDir(args.outDir);

  const supabase = createServiceRoleClient();
  const snapshot = (await loadCanonicalCoverageSnapshot(
    supabase as unknown as Parameters<typeof loadCanonicalCoverageSnapshot>[0]
  )) as CanonicalCoverageSnapshot;

  const [
    curriculumNodeAliasesResult,
    conceptAliasesResult,
    sourceAliasesResult,
    externalSourcesResult,
    learningObjectivesResult,
    canonicalCardsResult,
    ankiCardsResult,
    ankiDecksResult,
    ankiNotesResult,
    ankiNoteTagsResult,
    ankiTagsResult,
    canonicalRelationshipsResult,
    // TODO(kg-scale): these reads are unpaginated and silently cap at Supabase's
    // 1000-row default. Adopt fetchAllRows() from kg-automation-common before the
    // anki_cards / anki_notes / source_aliases tables exceed 1000 rows. See
    // docs/kg-automation-scale-hardening-todo.md.
  ] = await Promise.all([
    supabase.from("curriculum_node_aliases").select("id,curriculum_node_id,alias_name,alias_type,normalized_alias").eq("is_active", true),
    supabase.from("concept_aliases").select("id,concept_id,alias_name,alias_type").eq("is_active", true),
    supabase.from("source_aliases").select("id,entity_type,entity_id,alias_kind,alias_value,source_id").eq("is_active", true),
    supabase.from("external_sources").select("id,slug,name").eq("is_active", true),
    supabase.from("learning_objectives").select("id,curriculum_node_id,objective_text").eq("is_active", true),
    supabase.from("canonical_cards").select("id,anki_note_id,anki_card_id").eq("is_active", true),
    supabase.from("anki_cards").select("anki_card_id,deck_id").eq("is_active", true),
    supabase.from("anki_decks").select("id,full_name,deck_path").eq("is_active", true),
    supabase.from("anki_notes").select("id,anki_note_id").eq("is_active", true),
    supabase.from("anki_note_tags").select("note_id,tag_id").eq("is_active", true),
    supabase.from("anki_tags").select("id,raw_name").eq("is_active", true),
    supabase
      .from("canonical_relationships")
      .select("id,subject_entity_id,predicate,object_entity_id")
      .eq("is_active", true)
      .eq("subject_entity_type", "canonical_entity")
      .eq("object_entity_type", "canonical_entity"),
  ]);

  for (const result of [
    curriculumNodeAliasesResult,
    conceptAliasesResult,
    sourceAliasesResult,
    externalSourcesResult,
    learningObjectivesResult,
    canonicalCardsResult,
    ankiCardsResult,
    ankiDecksResult,
    ankiNotesResult,
    ankiNoteTagsResult,
    ankiTagsResult,
    canonicalRelationshipsResult,
  ]) {
    if (result.error) {
      throw result.error;
    }
  }

  const curriculumNodeAliases = (curriculumNodeAliasesResult.data ?? []) as CurriculumNodeAlias[];
  const conceptAliases = (conceptAliasesResult.data ?? []) as ConceptAlias[];
  const sourceAliases = (sourceAliasesResult.data ?? []) as SourceAlias[];
  const externalSources = (externalSourcesResult.data ?? []) as ExternalSource[];
  const learningObjectives = (learningObjectivesResult.data ?? []) as LearningObjective[];
  const canonicalCards = (canonicalCardsResult.data ?? []) as CanonicalCardRef[];
  const ankiCards = (ankiCardsResult.data ?? []) as AnkiCardRef[];
  const ankiDecks = (ankiDecksResult.data ?? []) as AnkiDeck[];
  const ankiNotes = (ankiNotesResult.data ?? []) as AnkiNoteRef[];
  const ankiNoteTags = (ankiNoteTagsResult.data ?? []) as AnkiNoteTag[];
  const ankiTags = (ankiTagsResult.data ?? []) as AnkiTag[];
  const canonicalRelationships = (canonicalRelationshipsResult.data ?? []) as CanonicalRelationship[];

  const curriculumGaps = findCurriculumBridgeGaps(snapshot);
  const curriculumNodeById = new Map(snapshot.curriculumNodes.map((row) => [row.id, row]));
  const specialtyById = new Map(snapshot.specialties.map((row) => [row.id, row]));
  const sourceById = new Map(externalSources.map((row) => [row.id, row]));
  const learningObjectivesByNodeId = new Map<string, LearningObjective[]>();
  const curriculumAliasesByNodeId = new Map<string, CurriculumNodeAlias[]>();
  const conceptAliasesByConceptId = new Map<string, ConceptAlias[]>();
  const sourceAliasesByEntityKey = new Map<string, SourceAlias[]>();

  for (const row of learningObjectives) {
    const bucket = learningObjectivesByNodeId.get(row.curriculum_node_id) ?? [];
    bucket.push(row);
    learningObjectivesByNodeId.set(row.curriculum_node_id, bucket);
  }
  for (const row of curriculumNodeAliases) {
    const bucket = curriculumAliasesByNodeId.get(row.curriculum_node_id) ?? [];
    bucket.push(row);
    curriculumAliasesByNodeId.set(row.curriculum_node_id, bucket);
  }
  for (const row of conceptAliases) {
    const bucket = conceptAliasesByConceptId.get(row.concept_id) ?? [];
    bucket.push(row);
    conceptAliasesByConceptId.set(row.concept_id, bucket);
  }
  for (const row of sourceAliases) {
    const key = `${row.entity_type}:${row.entity_id}`;
    const bucket = sourceAliasesByEntityKey.get(key) ?? [];
    bucket.push(row);
    sourceAliasesByEntityKey.set(key, bucket);
  }

  const cardById = new Map(canonicalCards.map((row) => [row.id, row]));
  const cardDeckIdByRawAnkiCardId = new Map(ankiCards.map((row) => [row.anki_card_id ?? "", row.deck_id]));
  const deckById = new Map(ankiDecks.map((row) => [row.id, row]));
  const noteIdByRawAnkiNoteId = new Map(ankiNotes.map((row) => [row.anki_note_id ?? "", row.id]));
  const tagById = new Map(ankiTags.map((row) => [row.id, row]));
  const tagIdsByNoteId = new Map<string, string[]>();
  for (const row of ankiNoteTags) {
    const bucket = tagIdsByNoteId.get(row.note_id) ?? [];
    bucket.push(row.tag_id);
    tagIdsByNoteId.set(row.note_id, bucket);
  }

  const nodeCardIds = new Map<string, string[]>();
  const nodeQuestionIds = new Map<string, string[]>();
  const conceptCardIds = new Map<string, string[]>();
  const conceptQuestionIds = new Map<string, string[]>();
  const deckLabelsByNodeId = new Map<string, Set<string>>();
  const tagLabelsByNodeId = new Map<string, Set<string>>();

  for (const link of snapshot.cardKnowledgeLinks) {
    if (link.curriculum_node_id) {
      const nodeBucket = nodeCardIds.get(link.curriculum_node_id) ?? [];
      nodeBucket.push(link.canonical_card_id);
      nodeCardIds.set(link.curriculum_node_id, nodeBucket);
    }
    if (link.concept_id) {
      const conceptBucket = conceptCardIds.get(link.concept_id) ?? [];
      conceptBucket.push(link.canonical_card_id);
      conceptCardIds.set(link.concept_id, conceptBucket);
    }

    const card = cardById.get(link.canonical_card_id);
    if (link.curriculum_node_id && card?.anki_card_id) {
      const deckId = cardDeckIdByRawAnkiCardId.get(card.anki_card_id) ?? null;
      const deck = deckId ? deckById.get(deckId) ?? null : null;
      if (deck) {
        const labels = deckLabelsByNodeId.get(link.curriculum_node_id) ?? new Set<string>();
        labels.add(deck.full_name);
        for (const branch of deck.deck_path) {
          labels.add(branch);
        }
        deckLabelsByNodeId.set(link.curriculum_node_id, labels);
      }
    }

    if (link.curriculum_node_id && card?.anki_note_id) {
      const noteId = noteIdByRawAnkiNoteId.get(card.anki_note_id) ?? null;
      if (noteId) {
        const labels = tagLabelsByNodeId.get(link.curriculum_node_id) ?? new Set<string>();
        for (const tagId of tagIdsByNoteId.get(noteId) ?? []) {
          const tag = tagById.get(tagId);
          if (tag) {
            labels.add(tag.raw_name);
          }
        }
        tagLabelsByNodeId.set(link.curriculum_node_id, labels);
      }
    }
  }

  for (const link of snapshot.questionCurriculumMappings) {
    if (link.curriculum_node_id) {
      const nodeBucket = nodeQuestionIds.get(link.curriculum_node_id) ?? [];
      nodeBucket.push(link.external_question_id);
      nodeQuestionIds.set(link.curriculum_node_id, nodeBucket);
    }
    if (link.concept_id) {
      const conceptBucket = conceptQuestionIds.get(link.concept_id) ?? [];
      conceptBucket.push(link.external_question_id);
      conceptQuestionIds.set(link.concept_id, conceptBucket);
    }
  }

  const entitySourceAliases = sourceAliases.filter((row) => row.entity_type === "canonical_entity");
  const labelIndexes = buildLabelIndexes(snapshot, entitySourceAliases);
  const proposalsByFingerprint = new Map<string, ProposalRecord>();
  const generationDebugRows: GenerationDebugRow[] = [];

  function pushProposal(proposal: ProposalRecord) {
    if (!proposalsByFingerprint.has(proposal.proposal_fingerprint)) {
      proposalsByFingerprint.set(proposal.proposal_fingerprint, proposal);
    }
  }

  for (const gap of curriculumGaps.slice(0, args.limit)) {
    const node = curriculumNodeById.get(gap.curriculum_node_id);
    if (!node) {
      continue;
    }

    const specialty = node.specialty_id ? specialtyById.get(node.specialty_id) ?? null : null;
    const aliases = curriculumAliasesByNodeId.get(node.id) ?? [];
    const sourceAliasRows = sourceAliasesByEntityKey.get(`curriculum_node:${node.id}`) ?? [];
    const deckLabels = [...(deckLabelsByNodeId.get(node.id) ?? new Set<string>())];
    const tagLabels = [...(tagLabelsByNodeId.get(node.id) ?? new Set<string>())];
    const learningObjectiveRows = learningObjectivesByNodeId.get(node.id) ?? [];

    const labelSignals = dedupeLabels([
      ...aliases.map((row) => ({ id: row.id, label: row.alias_name, origin: "curriculum_node_alias" as const })),
      ...sourceAliasRows.map((row) => ({ id: row.id, label: row.alias_value, origin: "source_alias" as const, source_id: row.source_id })),
      ...deckLabels.map((label) => ({ id: `deck:${slugify(label)}`, label, origin: "anki_deck_path" as const })),
      ...tagLabels.map((label) => ({ id: `tag:${slugify(label)}`, label, origin: "anki_tag" as const })),
    ]);

    const matches = findEntityMatches(node.title, node.slug, labelSignals, labelIndexes);
    const totalMappings = gap.card_count + gap.question_count;
    const inferredType = inferEntityType(node.title);
    const supportScore = scoreSupport(gap.card_count, gap.question_count);
    const labelPenalty = genericPenalty(node.title);
    const exactEntityMatch = buildExactEntityMatch(node.title, inferredType, labelIndexes);
    const topMatch =
      exactEntityMatch && (!matches[0] || matches[0].entityId !== exactEntityMatch.entityId)
        ? exactEntityMatch
        : matches[0] ?? exactEntityMatch ?? null;
    const effectiveMatches =
      exactEntityMatch && (!matches[0] || matches[0].entityId !== exactEntityMatch.entityId)
        ? [exactEntityMatch, ...matches]
        : matches;

    if (effectiveMatches.length > 1 && effectiveMatches[0].score - effectiveMatches[1].score <= 0.08) {
      const confidence = Math.max(0.55, effectiveMatches[0].score + supportScore - 0.22);
      const tier = toConfidenceTier(confidence);
      pushProposal(
        makeProposal({
          proposal_fingerprint: `ambiguous-node:${node.id}:${effectiveMatches.slice(0, 3).map((row) => row.entityId).join(":")}`,
          proposal_type: "flag_ambiguous_mapping",
          source_signal_type: "curriculum_node",
          source_signal_ids: [node.id],
          specialty_id: specialty?.id ?? null,
          proposed_entity_type: inferredType,
          proposed_entity_label: node.title,
          proposed_existing_entity_id: effectiveMatches[0]?.entityId ?? null,
          proposed_subject_entity_id: null,
          proposed_predicate: null,
          proposed_object_entity_id: null,
          proposed_alias: null,
          proposed_bridge_type: null,
          confidence,
          confidence_tier: tier,
          confidence_reason: `Multiple candidate canonical entities matched the same curriculum node with near-tied scores (${effectiveMatches
            .slice(0, 3)
            .map((row) => `${row.label} ${row.score.toFixed(2)}`)
            .join(", ")}).`,
          evidence_summary: `${gap.node_path} produced overlapping entity matches and should be reviewed before any bridge or entity creation is applied.`,
          supporting_card_count: gap.card_count,
          supporting_question_count: gap.question_count,
          supporting_curriculum_node_count: 1,
          supporting_source_count: distinctCount([
            aliases.length ? "curriculum_node_alias" : "",
            sourceAliasRows.length ? "source_alias" : "",
            deckLabels.length ? "anki_deck_path" : "",
            tagLabels.length ? "anki_tag" : "",
            gap.question_count > 0 ? "external_question_curriculum_mapping" : "",
            gap.card_count > 0 ? "card_knowledge_link" : "",
          ]),
          conflict_count: effectiveMatches.length,
          metadata: {
            curriculum_node_id: node.id,
            curriculum_node_title: node.title,
            curriculum_node_path: gap.node_path,
            specialty_name: specialty?.name ?? null,
            candidate_entities: effectiveMatches.slice(0, 5),
            review_packet_key: `branch:${node.slug}`,
            review_packet_label: gap.node_path,
            source_labels: labelSignals.map((row) => ({ label: row.label, origin: row.origin })),
            source_names: sourceAliasRows
              .map((row) => sourceById.get(row.source_id)?.name ?? null)
              .filter((value): value is string => Boolean(value)),
          },
        })
      );
      generationDebugRows.push({
        curriculum_node_id: node.id,
        curriculum_node_path: gap.node_path,
        curriculum_node_title: node.title,
        inferred_entity_type: inferredType,
        card_count: gap.card_count,
        question_count: gap.question_count,
        total_mappings: totalMappings,
        exact_entity_id: exactEntityMatch?.entityId ?? null,
        exact_entity_label: exactEntityMatch?.label ?? null,
        top_match_entity_id: effectiveMatches[0]?.entityId ?? null,
        top_match_label: effectiveMatches[0]?.label ?? null,
        top_match_type: effectiveMatches[0]?.entityType ?? null,
        top_match_score: effectiveMatches[0]?.score ?? null,
        top_match_reasons: effectiveMatches[0]?.reasons ?? [],
        decision: "ambiguous_mapping",
        decision_reason: "Multiple strong entity matches remained within the ambiguity threshold.",
      });
      continue;
    }

    if (
      isStrongCurriculumBridgeMatch({
        nodeTitle: node.title,
        inferredType,
        totalMappings,
        labelPenalty,
        supportScore,
        topMatch,
      })
    ) {
      const baseBridgeScore = (topMatch?.score ?? 0) + supportScore - labelPenalty;
      const confidence = Math.min(0.97, Math.max(0.72, baseBridgeScore));
      const tier = toConfidenceTier(confidence);
      pushProposal(
        makeProposal({
          proposal_fingerprint: `bridge-node:${node.id}:${topMatch.entityId}:primary_coverage`,
          proposal_type: "link_curriculum_node_to_entity",
          source_signal_type: "curriculum_node",
          source_signal_ids: [node.id],
          specialty_id: specialty?.id ?? null,
          proposed_entity_type: null,
          proposed_entity_label: node.title,
          proposed_existing_entity_id: topMatch.entityId,
          proposed_subject_entity_id: null,
          proposed_predicate: null,
          proposed_object_entity_id: null,
          proposed_alias: null,
          proposed_bridge_type: "primary_coverage",
          confidence,
          confidence_tier: tier,
          confidence_reason: `${topMatch.reasons.join(", ")} plus ${gap.card_count} card links and ${gap.question_count} question links for the same curriculum node.`,
          evidence_summary: `${gap.node_path} closely matches canonical entity ${topMatch.label} and has recurring support across existing mappings.`,
          supporting_card_count: gap.card_count,
          supporting_question_count: gap.question_count,
          supporting_curriculum_node_count: 1,
          supporting_source_count: distinctCount([
            aliases.length ? "curriculum_node_alias" : "",
            sourceAliasRows.length ? "source_alias" : "",
            deckLabels.length ? "anki_deck_path" : "",
            tagLabels.length ? "anki_tag" : "",
            gap.question_count > 0 ? "external_question_curriculum_mapping" : "",
            gap.card_count > 0 ? "card_knowledge_link" : "",
          ]),
          conflict_count: Math.max(0, effectiveMatches.length - 1),
          metadata: {
            curriculum_node_id: node.id,
            curriculum_node_title: node.title,
            curriculum_node_path: gap.node_path,
            specialty_name: specialty?.name ?? null,
            target_entity_label: topMatch.label,
            target_entity_type: topMatch.entityType,
            review_packet_key: `branch:${node.slug}`,
            review_packet_label: gap.node_path,
            source_labels: labelSignals.map((row) => ({ label: row.label, origin: row.origin })),
            source_names: sourceAliasRows
              .map((row) => sourceById.get(row.source_id)?.name ?? null)
              .filter((value): value is string => Boolean(value)),
          },
        })
      );
      generationDebugRows.push({
        curriculum_node_id: node.id,
        curriculum_node_path: gap.node_path,
        curriculum_node_title: node.title,
        inferred_entity_type: inferredType,
        card_count: gap.card_count,
        question_count: gap.question_count,
        total_mappings: totalMappings,
        exact_entity_id: exactEntityMatch?.entityId ?? null,
        exact_entity_label: exactEntityMatch?.label ?? null,
        top_match_entity_id: topMatch?.entityId ?? null,
        top_match_label: topMatch?.label ?? null,
        top_match_type: topMatch?.entityType ?? null,
        top_match_score: topMatch?.score ?? null,
        top_match_reasons: topMatch?.reasons ?? [],
        decision: "bridge_existing_entity",
        decision_reason:
          exactEntityMatch && topMatch?.entityId === exactEntityMatch.entityId
            ? "Exact existing canonical entity match found for an unbridged node."
            : "Strong existing canonical entity match exceeded bridge threshold.",
      });

      const canonicalEntity = labelIndexes.entityById.get(topMatch.entityId);
      if (canonicalEntity) {
        for (const aliasSignal of labelSignals.slice(0, 5)) {
          if (normalizeLabel(aliasSignal.label) === normalizeLabel(canonicalEntity.preferred_label)) {
            continue;
          }

          pushProposal(
            makeProposal({
              proposal_fingerprint: `alias:${topMatch.entityId}:${normalizeLabel(aliasSignal.label)}:${aliasSignal.origin}`,
              proposal_type: "add_entity_alias",
              source_signal_type: aliasSignal.origin,
              source_signal_ids: [aliasSignal.id, node.id],
              specialty_id: specialty?.id ?? null,
              proposed_entity_type: null,
              proposed_entity_label: canonicalEntity.preferred_label,
              proposed_existing_entity_id: canonicalEntity.id,
              proposed_subject_entity_id: null,
              proposed_predicate: null,
              proposed_object_entity_id: null,
              proposed_alias: aliasSignal.label,
              proposed_bridge_type: null,
              confidence: Math.min(0.9, 0.58 + supportScore),
              confidence_tier: toConfidenceTier(Math.min(0.9, 0.58 + supportScore)),
              confidence_reason: `${aliasSignal.origin} supplied an alternate label for a strongly matched curriculum node.`,
              evidence_summary: `${aliasSignal.label} appears alongside ${canonicalEntity.preferred_label} in the ${gap.node_path} curriculum cluster.`,
              supporting_card_count: gap.card_count,
              supporting_question_count: gap.question_count,
              supporting_curriculum_node_count: 1,
              supporting_source_count: 1,
              conflict_count: 0,
              metadata: {
                curriculum_node_id: node.id,
                curriculum_node_title: node.title,
                curriculum_node_path: gap.node_path,
                specialty_name: specialty?.name ?? null,
                alias_origin: aliasSignal.origin,
                target_entity_label: canonicalEntity.preferred_label,
                target_entity_type: canonicalEntity.entity_type,
                review_packet_key: `branch:${node.slug}`,
                review_packet_label: gap.node_path,
              },
            })
          );
        }
      }
      continue;
    }

    if (
      inferredType &&
      totalMappings >= 5 &&
      !shouldSuppressEntityCreation(node.title) &&
      (!topMatch ||
        normalizeLabel(topMatch.label) !== normalizeLabel(node.title) ||
        topMatch.entityType !== inferredType)
    ) {
      const confidence = Math.max(0.52, Math.min(0.91, 0.56 + supportScore - labelPenalty));
      const tier = toConfidenceTier(confidence);
      pushProposal(
        makeProposal({
          proposal_fingerprint: `create-entity:${node.id}:${slugify(node.title)}:${inferredType}`,
          proposal_type: "create_canonical_entity",
          source_signal_type: "curriculum_node",
          source_signal_ids: [node.id, ...learningObjectiveRows.slice(0, 3).map((row) => row.id)],
          specialty_id: specialty?.id ?? null,
          proposed_entity_type: inferredType,
          proposed_entity_label: node.title,
          proposed_existing_entity_id: null,
          proposed_subject_entity_id: null,
          proposed_predicate: null,
          proposed_object_entity_id: null,
          proposed_alias: null,
          proposed_bridge_type: null,
          confidence,
          confidence_tier: tier,
          confidence_reason: `No strong existing canonical entity match was found, but ${totalMappings} mapped educational assets support a stable ${inferredType} candidate.`,
          evidence_summary: `${gap.node_path} is a high-traffic unbridged curriculum node with recurring card/question support and consistent label signals.`,
          supporting_card_count: gap.card_count,
          supporting_question_count: gap.question_count,
          supporting_curriculum_node_count: 1,
          supporting_source_count: distinctCount([
            aliases.length ? "curriculum_node_alias" : "",
            sourceAliasRows.length ? "source_alias" : "",
            deckLabels.length ? "anki_deck_path" : "",
            tagLabels.length ? "anki_tag" : "",
            gap.question_count > 0 ? "external_question_curriculum_mapping" : "",
            gap.card_count > 0 ? "card_knowledge_link" : "",
          ]),
          conflict_count: effectiveMatches.length,
          metadata: {
            curriculum_node_id: node.id,
            curriculum_node_title: node.title,
            curriculum_node_path: gap.node_path,
            specialty_name: specialty?.name ?? null,
            source_labels: labelSignals.map((row) => ({ label: row.label, origin: row.origin })),
            deck_labels: deckLabels.slice(0, 10),
            tag_labels: tagLabels.slice(0, 10),
            source_names: sourceAliasRows
              .map((row) => sourceById.get(row.source_id)?.name ?? null)
              .filter((value): value is string => Boolean(value)),
            review_packet_key: `branch:${node.slug}`,
            review_packet_label: gap.node_path,
          },
        })
      );
      generationDebugRows.push({
        curriculum_node_id: node.id,
        curriculum_node_path: gap.node_path,
        curriculum_node_title: node.title,
        inferred_entity_type: inferredType,
        card_count: gap.card_count,
        question_count: gap.question_count,
        total_mappings: totalMappings,
        exact_entity_id: exactEntityMatch?.entityId ?? null,
        exact_entity_label: exactEntityMatch?.label ?? null,
        top_match_entity_id: topMatch?.entityId ?? null,
        top_match_label: topMatch?.label ?? null,
        top_match_type: topMatch?.entityType ?? null,
        top_match_score: topMatch?.score ?? null,
        top_match_reasons: topMatch?.reasons ?? [],
        decision: "create_canonical_entity",
        decision_reason: "No acceptable existing canonical entity bridge target was available for this unbridged node.",
      });
    } else if (shouldSuppressEntityCreation(node.title)) {
      generationDebugRows.push({
        curriculum_node_id: node.id,
        curriculum_node_path: gap.node_path,
        curriculum_node_title: node.title,
        inferred_entity_type: inferredType,
        card_count: gap.card_count,
        question_count: gap.question_count,
        total_mappings: totalMappings,
        exact_entity_id: exactEntityMatch?.entityId ?? null,
        exact_entity_label: exactEntityMatch?.label ?? null,
        top_match_entity_id: topMatch?.entityId ?? null,
        top_match_label: topMatch?.label ?? null,
        top_match_type: topMatch?.entityType ?? null,
        top_match_score: topMatch?.score ?? null,
        top_match_reasons: topMatch?.reasons ?? [],
        decision: "suppressed_create",
        decision_reason: "Entity creation is explicitly suppressed for this generic curriculum label.",
      });
    } else {
      generationDebugRows.push({
        curriculum_node_id: node.id,
        curriculum_node_path: gap.node_path,
        curriculum_node_title: node.title,
        inferred_entity_type: inferredType,
        card_count: gap.card_count,
        question_count: gap.question_count,
        total_mappings: totalMappings,
        exact_entity_id: exactEntityMatch?.entityId ?? null,
        exact_entity_label: exactEntityMatch?.label ?? null,
        top_match_entity_id: topMatch?.entityId ?? null,
        top_match_label: topMatch?.label ?? null,
        top_match_type: topMatch?.entityType ?? null,
        top_match_score: topMatch?.score ?? null,
        top_match_reasons: topMatch?.reasons ?? [],
        decision: "no_supported_decision",
        decision_reason: "The node did not meet either bridge or create thresholds in this pass.",
      });
    }

    const splitScore = splitFlagScore(node.title);
    if (splitScore > 0) {
      pushProposal(
        makeProposal({
          proposal_fingerprint: `flag-split:${node.id}:${slugify(node.title)}`,
          proposal_type: "flag_possible_split",
          source_signal_type: "curriculum_node",
          source_signal_ids: [node.id],
          specialty_id: specialty?.id ?? null,
          proposed_entity_type: inferredType,
          proposed_entity_label: node.title,
          proposed_existing_entity_id: null,
          proposed_subject_entity_id: null,
          proposed_predicate: null,
          proposed_object_entity_id: null,
          proposed_alias: null,
          proposed_bridge_type: null,
          confidence: splitScore,
          confidence_tier: toConfidenceTier(splitScore),
          confidence_reason: "Composite label suggests this curriculum node may contain multiple canonical entities or sub-branches.",
          evidence_summary: `${gap.node_path} should be reviewed as a packet before any entity creation is applied.`,
          supporting_card_count: gap.card_count,
          supporting_question_count: gap.question_count,
          supporting_curriculum_node_count: 1,
          supporting_source_count: 1,
          conflict_count: 0,
          metadata: {
            curriculum_node_id: node.id,
            curriculum_node_title: node.title,
            curriculum_node_path: gap.node_path,
            specialty_name: specialty?.name ?? null,
            review_packet_key: `branch:${node.slug}`,
            review_packet_label: gap.node_path,
          },
        })
      );
    }
  }

  for (const concept of snapshot.concepts) {
    const cardCount = (conceptCardIds.get(concept.id) ?? []).length;
    const questionCount = (conceptQuestionIds.get(concept.id) ?? []).length;
    if (cardCount + questionCount === 0) {
      continue;
    }

    const conceptAliasesForConcept = conceptAliasesByConceptId.get(concept.id) ?? [];
    const sourceAliasRows = sourceAliasesByEntityKey.get(`concept:${concept.id}`) ?? [];
    const node = curriculumNodeById.get(concept.curriculum_node_id);
    const specialty = node?.specialty_id ? specialtyById.get(node.specialty_id) ?? null : null;
    const labelSignals = dedupeLabels([
      ...conceptAliasesForConcept.map((row) => ({ id: row.id, label: row.alias_name, origin: "concept_alias" as const })),
      ...sourceAliasRows.map((row) => ({ id: row.id, label: row.alias_value, origin: "source_alias" as const, source_id: row.source_id })),
    ]);
    const matches = findEntityMatches(concept.canonical_name, concept.slug, labelSignals, labelIndexes).filter((row) =>
      typeMatchesConcept(row.entityType, concept.concept_type)
    );

    const topMatch = matches[0] ?? null;
    if (!topMatch) {
      continue;
    }

    const confidence = Math.min(0.96, topMatch.score + scoreSupport(cardCount, questionCount) + 0.08);
    if (confidence < 0.68) {
      continue;
    }

    const path = node ? buildCurriculumNodePath(node.id, new Map(snapshot.curriculumNodes.map((row) => [row.id, row]))) : null;
    pushProposal(
      makeProposal({
        proposal_fingerprint: `bridge-concept:${concept.id}:${topMatch.entityId}:equivalent_to`,
        proposal_type: "link_concept_to_entity",
        source_signal_type: "concept",
        source_signal_ids: [concept.id],
        specialty_id: specialty?.id ?? null,
        proposed_entity_type: null,
        proposed_entity_label: concept.canonical_name,
        proposed_existing_entity_id: topMatch.entityId,
        proposed_subject_entity_id: null,
        proposed_predicate: null,
        proposed_object_entity_id: null,
        proposed_alias: null,
        proposed_bridge_type: "equivalent_to",
        confidence,
        confidence_tier: toConfidenceTier(confidence),
        confidence_reason: `${topMatch.reasons.join(", ")} plus concept type compatibility (${concept.concept_type} -> ${topMatch.entityType}).`,
        evidence_summary: `${concept.canonical_name} aligns with canonical entity ${topMatch.label} inside ${path ?? "its curriculum context"}.`,
        supporting_card_count: cardCount,
        supporting_question_count: questionCount,
        supporting_curriculum_node_count: 1,
        supporting_source_count: distinctCount([
          conceptAliasesForConcept.length ? "concept_alias" : "",
          sourceAliasRows.length ? "source_alias" : "",
          questionCount > 0 ? "external_question_curriculum_mapping" : "",
          cardCount > 0 ? "card_knowledge_link" : "",
        ]),
        conflict_count: Math.max(0, matches.length - 1),
        metadata: {
          concept_id: concept.id,
          concept_name: concept.canonical_name,
          concept_type: concept.concept_type,
          curriculum_node_id: node?.id ?? null,
          curriculum_node_title: node?.title ?? null,
          curriculum_node_path: path,
          specialty_name: specialty?.name ?? null,
          target_entity_label: topMatch.label,
          source_names: sourceAliasRows
            .map((row) => sourceById.get(row.source_id)?.name ?? null)
            .filter((value): value is string => Boolean(value)),
          review_packet_key: node ? `branch:${node.slug}` : `concept:${concept.slug}`,
          review_packet_label: path ?? concept.canonical_name,
        },
      })
    );
  }

  const duplicateGroups = new Map<string, string[]>();
  for (const entity of snapshot.canonicalEntities) {
    const key = normalizeLabel(entity.preferred_label);
    const bucket = duplicateGroups.get(key) ?? [];
    bucket.push(entity.id);
    duplicateGroups.set(key, bucket);
  }

  for (const [normalized, entityIds] of duplicateGroups.entries()) {
    if (entityIds.length < 2) {
      continue;
    }

    const labels = entityIds.map((id) => labelIndexes.entityById.get(id)?.preferred_label ?? id);
    pushProposal(
      makeProposal({
        proposal_fingerprint: `duplicate-entity:${normalized}:${entityIds.sort().join(":")}`,
        proposal_type: "flag_duplicate_entity",
        source_signal_type: "canonical_entity",
        source_signal_ids: entityIds,
        specialty_id: null,
        proposed_entity_type: null,
        proposed_entity_label: labels[0] ?? normalized,
        proposed_existing_entity_id: entityIds[0] ?? null,
        proposed_subject_entity_id: null,
        proposed_predicate: null,
        proposed_object_entity_id: null,
        proposed_alias: null,
        proposed_bridge_type: null,
        confidence: 0.94,
        confidence_tier: "high",
        confidence_reason: "Multiple active canonical entities share the same normalized label.",
        evidence_summary: `Canonical entities ${labels.join(", ")} should be reviewed for merge or dedupe handling.`,
        supporting_card_count: 0,
        supporting_question_count: 0,
        supporting_curriculum_node_count: 0,
        supporting_source_count: 1,
        conflict_count: entityIds.length,
        metadata: {
          duplicate_entity_ids: entityIds,
          duplicate_entity_labels: labels,
          review_packet_key: `entity-dup:${normalized}`,
          review_packet_label: labels[0] ?? normalized,
        },
      })
    );
  }

  for (const proposal of [...proposalsByFingerprint.values()]) {
    if (proposal.proposal_type !== "link_curriculum_node_to_entity") {
      continue;
    }

    const nodeId = String(proposal.metadata.curriculum_node_id ?? "");
    const node = curriculumNodeById.get(nodeId);
    const targetEntity = proposal.proposed_existing_entity_id
      ? labelIndexes.entityById.get(proposal.proposed_existing_entity_id)
      : null;
    if (!node || !targetEntity) {
      continue;
    }

    const conceptRows = snapshot.concepts.filter((row) => row.curriculum_node_id === node.id);
    const matchedEntities = conceptRows
      .map((concept) => {
        const conceptAliasesForConcept = conceptAliasesByConceptId.get(concept.id) ?? [];
        const conceptSignals = dedupeLabels(
          conceptAliasesForConcept.map((row) => ({
            id: row.id,
            label: row.alias_name,
            origin: "concept_alias" as const,
          }))
        );
        const matches = findEntityMatches(concept.canonical_name, concept.slug, conceptSignals, labelIndexes).filter(
          (row) => typeMatchesConcept(row.entityType, concept.concept_type)
        );
        return { concept, match: matches[0] ?? null };
      })
      .filter((row) => row.match !== null);

    for (const row of matchedEntities) {
      // Relationship rules come from the shared registry (src/lib/education/
      // kg-relationship-registry.ts) rather than a hardcoded list here, so the
      // generator and the apply/validation path can never drift. In an edge,
      // the curriculum node's primary entity (`targetEntity`) is the subject and
      // the matched concept entity (`row.match`) is the object.
      const relationRules = getGenerationRelationRules();

      for (const rule of relationRules) {
        if (
          !rule.subjectEntityTypes.includes(targetEntity.entity_type) ||
          !rule.objectEntityTypes.includes(row.match?.entityType ?? "")
        ) {
          continue;
        }

        // Defense in depth: never emit a triple the registry would reject.
        const tripleValidation = validateRelationshipTriple({
          subjectEndpointType: "canonical_entity",
          subjectEntityType: targetEntity.entity_type,
          predicate: rule.predicate,
          objectEndpointType: "canonical_entity",
          objectEntityType: row.match?.entityType ?? null,
        });
        if (!tripleValidation.valid) {
          continue;
        }

        const alreadyExists = canonicalRelationships.some(
          (relationship) =>
            relationship.subject_entity_id === targetEntity.id &&
            relationship.object_entity_id === row.match?.entityId &&
            relationship.predicate === rule.predicate
        );
        if (alreadyExists || !row.match) {
          continue;
        }

        const conceptSupport =
          (conceptCardIds.get(row.concept.id) ?? []).length + (conceptQuestionIds.get(row.concept.id) ?? []).length;
        const confidence = Math.min(0.88, 0.62 + scoreSupport(proposal.supporting_card_count, proposal.supporting_question_count) + scoreSupport(conceptSupport, 0));
        pushProposal(
          makeProposal({
            proposal_fingerprint: `relationship:${targetEntity.id}:${rule.predicate}:${row.match.entityId}:${node.id}`,
            proposal_type: "add_canonical_relationship",
            source_signal_type: "curriculum_cluster",
            source_signal_ids: [node.id, row.concept.id],
            specialty_id: proposal.specialty_id,
            proposed_entity_type: null,
            proposed_entity_label: targetEntity.preferred_label,
            proposed_existing_entity_id: null,
            proposed_subject_entity_id: targetEntity.id,
            proposed_predicate: rule.predicate,
            proposed_object_entity_id: row.match.entityId,
            proposed_alias: null,
            proposed_bridge_type: null,
            confidence,
            confidence_tier: toConfidenceTier(confidence),
            confidence_reason: `${targetEntity.preferred_label} and ${row.match.label} co-occur inside the same curriculum branch with compatible entity types.`,
            evidence_summary: `${proposal.metadata.curriculum_node_path ?? node.title} suggests ${rule.predicate} between ${targetEntity.preferred_label} and ${row.match.label}.`,
            supporting_card_count: proposal.supporting_card_count,
            supporting_question_count: proposal.supporting_question_count,
            supporting_curriculum_node_count: 1,
            supporting_source_count: 2,
            conflict_count: 0,
            metadata: {
              curriculum_node_id: node.id,
              curriculum_node_title: node.title,
              curriculum_node_path: proposal.metadata.curriculum_node_path ?? node.title,
              specialty_name: proposal.metadata.specialty_name ?? null,
              related_concept_id: row.concept.id,
              related_concept_name: row.concept.canonical_name,
              review_packet_key: proposal.metadata.review_packet_key ?? `branch:${node.slug}`,
              review_packet_label: proposal.metadata.review_packet_label ?? node.title,
            },
          })
        );
      }
    }
  }

  const proposals = [...proposalsByFingerprint.values()].sort((left, right) => right.confidence - left.confidence);
  const snapshotPayload: ProposalSnapshot = {
    generatedAt: new Date().toISOString(),
    tableAvailable: false,
    persistedToDatabase: false,
    proposalCount: proposals.length,
    proposals,
  };

  let tableAvailable = false;
  try {
    const { error } = await supabase.from("kg_automation_proposals").select("id").limit(1);
    if (error) {
      throw error;
    }
    tableAvailable = true;
  } catch (error) {
    tableAvailable = false;
  }

  let persistedToDatabase = false;
  let reconciledApprovedCreateCount = 0;
  if (tableAvailable && proposals.length > 0) {
    const approvedCreateRowsResult = await supabase
      .from("kg_automation_proposals")
      .select("id,proposed_entity_label,proposed_entity_type,metadata")
      .eq("is_active", true)
      .eq("proposal_type", "create_canonical_entity")
      .eq("review_status", "approved");

    if (approvedCreateRowsResult.error) {
      throw approvedCreateRowsResult.error;
    }

    for (const row of (approvedCreateRowsResult.data ?? []) as Array<{
      id: string;
      proposed_entity_label: string | null;
      proposed_entity_type: string | null;
      metadata: Record<string, unknown>;
    }>) {
      if (!row.proposed_entity_label || !row.proposed_entity_type) {
        continue;
      }

      const exactEntity = labelIndexes.exactEntityByLabelAndType.get(
        `${normalizeLabel(row.proposed_entity_label)}:${row.proposed_entity_type}`
      );
      if (!exactEntity) {
        continue;
      }

      const { error } = await supabase
        .from("kg_automation_proposals")
        .update({
          review_status: "applied",
          applied_at: new Date().toISOString(),
          metadata: {
            ...row.metadata,
            reconciled_by_script: "generate-kg-automation-proposals",
            reconciled_reason: "Exact canonical entity already exists for approved create proposal.",
            reconciled_entity_id: exactEntity.entityId,
          },
        })
        .eq("id", row.id);

      if (error) {
        throw error;
      }

      reconciledApprovedCreateCount += 1;
    }

    const fingerprints = proposals.map((row) => row.proposal_fingerprint);
    const existingByFingerprint = new Map<string, ExistingProposal>();

    for (const chunk of chunkArray(fingerprints, 100)) {
      const { data, error } = await supabase
        .from("kg_automation_proposals")
        .select(
          "id,proposal_fingerprint,review_status,reviewed_by,reviewed_at,reviewer_notes,applied_at,superseded_by"
        )
        .eq("is_active", true)
        .in("proposal_fingerprint", chunk);

      if (error) {
        throw error;
      }

      for (const row of (data ?? []) as ExistingProposal[]) {
        existingByFingerprint.set(row.proposal_fingerprint, row);
      }
    }

    const reviewedStatus = new Set(["approved", "rejected", "applied", "superseded"]);
    const inserts: ProposalRecord[] = [];
    const updates: Array<{ id: string; payload: ProposalRecord }> = [];

    for (const proposal of proposals) {
      const existing = existingByFingerprint.get(proposal.proposal_fingerprint);
      if (!existing) {
        inserts.push(proposal);
        continue;
      }

      const payload = reviewedStatus.has(existing.review_status)
        ? {
        ...proposal,
        review_status: existing.review_status as ProposalRecord["review_status"],
        reviewed_by: existing.reviewed_by,
        reviewed_at: existing.reviewed_at,
        reviewer_notes: existing.reviewer_notes,
        applied_at: existing.applied_at,
        superseded_by: existing.superseded_by,
          }
        : proposal;

      updates.push({ id: existing.id, payload });
    }

    for (const chunk of chunkArray(inserts, 100)) {
      const { error } = await supabase.from("kg_automation_proposals").insert(chunk);
      if (error) {
        throw error;
      }
    }

    // TODO(kg-scale): N+1 update loop — one round-trip per existing proposal.
    // Fine at tens of proposals; batch these (or move to an RPC) before the
    // active proposal set reaches the hundreds. See
    // docs/kg-automation-scale-hardening-todo.md.
    for (const update of updates) {
      const { error } = await supabase
        .from("kg_automation_proposals")
        .update(update.payload)
        .eq("id", update.id);

      if (error) {
        throw error;
      }
    }

    persistedToDatabase = true;
  }

  snapshotPayload.tableAvailable = tableAvailable;
  snapshotPayload.persistedToDatabase = persistedToDatabase;
  const snapshotPath = writeSnapshot(args.outDir, snapshotPayload);
  const debugPath = `${args.outDir}/kg-automation-generation-debug.json`;
  await import("node:fs").then(({ writeFileSync }) => {
    writeFileSync(
      debugPath,
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          rows: generationDebugRows,
        },
        null,
        2
      )}\n`,
      "utf8"
    );
  });

  console.log(
    JSON.stringify(
      {
        proposalCount: proposals.length,
        tableAvailable,
        persistedToDatabase,
        reconciledApprovedCreateCount,
        snapshotPath,
        debugPath,
        proposalsByType: proposals.reduce<Record<string, number>>((accumulator, proposal) => {
          accumulator[proposal.proposal_type] = (accumulator[proposal.proposal_type] ?? 0) + 1;
          return accumulator;
        }, {}),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  commonModulePromise
    .then(({ serializeError }) => {
      console.error(JSON.stringify(serializeError(error), null, 2));
      process.exit(1);
    })
    .catch(() => {
      console.error(String(error));
      process.exit(1);
    });
});
