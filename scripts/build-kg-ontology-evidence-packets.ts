import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import type {
  AnkiCardRow,
  AnkiDeckRow,
  AnkiNoteRow,
  AnkiNoteTagRow,
  AnkiTagRow,
  CanonicalCardRow,
  CanonicalCardVersionRow,
  CurriculumNodeAliasRow,
  ExternalQuestionRow,
  LearningObjectiveRow,
  SourceAliasRow,
} from "./lib/education/ontology-db-types.ts";

const commonModulePromise = import(new URL("./kg-automation-common.ts", import.meta.url).href);
const coverageModulePromise = import(
  new URL("./lib/education/kg-canonical-coverage.ts", import.meta.url).href
);

type ParsedArgs = {
  limit: number;
  specialty: string | null;
  outDir: string;
};

type PrioritizedNode = {
  nodeId: string;
  slug: string;
  title: string;
  specialty: string | null;
  curriculumPath: string;
  depth: number;
  legacyCardMappings: number;
  legacyQuestionMappings: number;
  totalAffectedObjects: number;
  inferredEntityType: string | null;
  labelSpecificity: "high" | "medium" | "low";
  splitRisk: boolean;
  genericRisk: boolean;
  bestNearMatchLabel: string | null;
  bestNearMatchType: string | null;
  bestNearMatchScore: number | null;
  bucket: string;
  reason: string;
};

type PrioritizationReport = {
  generatedAt: string;
  totalBlockedNodes: number;
  topNodes: PrioritizedNode[];
};

type CoverageNode = {
  id: string;
  parent_id: string | null;
  specialty_id: string | null;
  slug: string;
  title: string;
  node_type: string;
  is_active: boolean;
};

type CoverageSpecialty = {
  id: string;
  slug: string;
  name: string;
};

type CoverageEntity = {
  id: string;
  preferred_label: string;
  entity_type: string;
  is_active: boolean;
};

type LegacyCardLink = {
  canonical_card_id: string;
  curriculum_node_id: string | null;
};

type LegacyQuestionLink = {
  external_question_id: string;
  curriculum_node_id: string | null;
};

type ProposalRow = import("./kg-automation-common").ProposalRow;

type NearbyEntity = {
  id: string;
  label: string;
  entityType: string;
  similarity: number;
  matchedOn: "label" | "alias";
  matchedValue: string;
};

type EvidencePacket = {
  nodeId: string;
  slug: string;
  title: string;
  specialty: string | null;
  curriculumPath: string;
  depth: number;
  nodeType: string | null;
  blockedBucket: string;
  blockedReason: string;
  currentBlockedReason: "no_canonical_entity_yet" | "split_risk" | "generic_risk" | "other";
  migrationImpact: {
    legacyCardCount: number;
    legacyQuestionCount: number;
    totalAffectedObjects: number;
  };
  riskSignals: {
    splitRisk: boolean;
    genericRisk: boolean;
    labelSpecificity: "high" | "medium" | "low";
  };
  ontologyContext: {
    parent: { id: string; slug: string; title: string; nodeType: string } | null;
    children: Array<{ id: string; slug: string; title: string; nodeType: string }>;
    siblings: Array<{ id: string; slug: string; title: string; nodeType: string }>;
    learningObjectives: string[];
  };
  representativeContent: {
    cardTitles: string[];
    cardSnippets: string[];
    questionTitles: string[];
    questionSnippets: string[];
  };
  externalSignals: {
    orthobulletsPaths: string[];
    ankiDeckPaths: string[];
    ankiTags: string[];
    curriculumAliases: string[];
    sourceAliases: Array<{ alias: string; sourceName: string | null; sourceSlug: string | null }>;
  };
  nearbyCanonicalEntities: NearbyEntity[];
  aliasNearMatches: string[];
  oldHeuristic: {
    bucket: string;
    bestNearMatchLabel: string | null;
    bestNearMatchType: string | null;
    bestNearMatchScore: number | null;
    activeProposalTypes: string[];
    activeCreatePacketKey: string | null;
  };
};

type EvidencePacketReport = {
  generatedAt: string;
  prioritizationGeneratedAt: string;
  totalBlockedNodes: number;
  analyzedNodes: number;
  packets: EvidencePacket[];
};

type ExternalSourceRow = {
  id: string;
  slug: string;
  name: string;
};

function parseArgs(argv: string[]): ParsedArgs {
  let limit = 100;
  let specialty: string | null = null;
  let outDir = "reports";

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--limit") {
      const parsed = Number(argv[index + 1] ?? "100");
      limit = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : limit;
      index += 1;
    } else if (arg === "--specialty") {
      specialty = argv[index + 1] ?? specialty;
      index += 1;
    } else if (arg === "--out-dir") {
      outDir = argv[index + 1] ?? outDir;
      index += 1;
    }
  }

  return { limit, specialty, outDir };
}

function runCommand(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  }

  return result.stdout;
}

function normalizeLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['".,()/:-]/g, " ")
    .replace(/\s+/g, " ");
}

function cleanText(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function truncate(value: string, limit = 220) {
  return value.length <= limit ? value : `${value.slice(0, Math.max(0, limit - 1)).trim()}…`;
}

function uniqueSorted(values: Iterable<string>) {
  return [...new Set([...values].filter((value) => value.trim().length > 0))].sort((left, right) =>
    left.localeCompare(right)
  );
}

function compareNullable(left: string | null, right: string | null) {
  return (left ?? "").localeCompare(right ?? "");
}

function jaccardSimilarity(left: string, right: string) {
  const leftTokens = new Set(normalizeLabel(left).split(" ").filter(Boolean));
  const rightTokens = new Set(normalizeLabel(right).split(" ").filter(Boolean));
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union === 0 ? 0 : intersection / union;
}

function extractJsonStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      if (typeof entry === "string") {
        return cleanText(entry);
      }
      if (entry && typeof entry === "object") {
        const named = entry as Record<string, unknown>;
        return [
          typeof named.text === "string" ? named.text : "",
          typeof named.value === "string" ? named.value : "",
          typeof named.html === "string" ? named.html : "",
        ]
          .map((candidate) => cleanText(candidate))
          .find(Boolean) ?? "";
      }
      return "";
    })
    .filter((entry): entry is string => entry.length > 0);
}

function extractCardSnippet(version: CanonicalCardVersionRow | null) {
  if (!version) {
    return null;
  }
  const candidates = [
    ...extractJsonStringArray(version.field_snapshot),
    ...Object.values(version.raw_html_snapshot ?? {})
      .filter((value): value is string => typeof value === "string")
      .map((value) => cleanText(value)),
  ];
  const snippet = candidates.find((value) => value.length >= 20) ?? candidates[0] ?? null;
  return snippet ? truncate(snippet) : null;
}

function extractQuestionTitle(question: ExternalQuestionRow) {
  return (
    (typeof question.metadata.title === "string" ? cleanText(question.metadata.title) : "") ||
    (typeof question.metadata.prompt === "string" ? cleanText(question.metadata.prompt) : "") ||
    question.topic_raw?.trim() ||
    question.topic_slug?.trim() ||
    question.external_question_id
  );
}

function extractQuestionSnippet(question: ExternalQuestionRow) {
  const metadata = question.metadata as Record<string, unknown>;
  const direct = ["stem", "question_stem", "prompt", "question", "title"]
    .map((key) => (typeof metadata[key] === "string" ? cleanText(String(metadata[key])) : ""))
    .find((value) => value.length >= 20);
  if (direct) {
    return truncate(direct);
  }
  return truncate(extractQuestionTitle(question));
}

function buildNearbyEntityIndex(
  entities: Array<CoverageEntity & { aliases: string[] }>,
  title: string,
  limit = 7
): NearbyEntity[] {
  return entities
    .map((entity) => {
      const labelScore = jaccardSimilarity(title, entity.preferred_label);
      let bestAlias = "";
      let bestAliasScore = -1;
      for (const alias of entity.aliases) {
        const score = jaccardSimilarity(title, alias);
        if (score > bestAliasScore) {
          bestAliasScore = score;
          bestAlias = alias;
        }
      }
      const useAlias = bestAliasScore > labelScore;
      return {
        id: entity.id,
        label: entity.preferred_label,
        entityType: entity.entity_type,
        similarity: Math.max(labelScore, bestAliasScore, 0),
        matchedOn: useAlias ? ("alias" as const) : ("label" as const),
        matchedValue: useAlias ? bestAlias : entity.preferred_label,
      };
    })
    .filter((entity) => entity.similarity > 0)
    .sort(
      (left, right) =>
        right.similarity - left.similarity ||
        left.label.localeCompare(right.label) ||
        left.entityType.localeCompare(right.entityType)
    )
    .slice(0, limit);
}

function buildMarkdown(report: EvidencePacketReport) {
  const lines: string[] = [];
  lines.push("# KG Ontology Evidence Packets");
  lines.push("");
  lines.push(`- Generated: ${report.generatedAt}`);
  lines.push(`- Prioritization snapshot: ${report.prioritizationGeneratedAt}`);
  lines.push(`- Blocked nodes in prioritization snapshot: ${report.totalBlockedNodes}`);
  lines.push(`- Evidence packets built: ${report.analyzedNodes}`);
  lines.push("");
  lines.push("## Top Packets");
  lines.push("");

  for (const packet of report.packets.slice(0, 25)) {
    lines.push(`### ${packet.title}`);
    lines.push("");
    lines.push(`- Slug: \`${packet.slug}\``);
    lines.push(`- Specialty: ${packet.specialty ?? "Unknown"}`);
    lines.push(`- Curriculum path: ${packet.curriculumPath}`);
    lines.push(
      `- Impact: ${packet.migrationImpact.legacyCardCount} cards, ${packet.migrationImpact.legacyQuestionCount} questions, ${packet.migrationImpact.totalAffectedObjects} total`
    );
    lines.push(`- Blocked bucket: ${packet.blockedBucket}`);
    lines.push(`- Blocked reason: ${packet.blockedReason}`);
    lines.push(
      `- Risk signals: split=${packet.riskSignals.splitRisk}, generic=${packet.riskSignals.genericRisk}, specificity=${packet.riskSignals.labelSpecificity}`
    );
    lines.push(
      `- Nearby canonical entities: ${packet.nearbyCanonicalEntities
        .slice(0, 5)
        .map((entity) => `${entity.label} (${entity.entityType}, ${entity.similarity.toFixed(2)})`)
        .join("; ") || "None"}`
    );
    lines.push(
      `- Representative cards: ${packet.representativeContent.cardTitles.slice(0, 3).join("; ") || "None"}`
    );
    lines.push(
      `- Representative questions: ${packet.representativeContent.questionTitles.slice(0, 3).join("; ") || "None"}`
    );
    lines.push(
      `- Orthobullets/alias signals: ${packet.externalSignals.orthobulletsPaths.slice(0, 4).join("; ") || "None"}`
    );
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const { createServiceRoleClient, ensureOutDir, fetchAllRows } = await commonModulePromise;
  const { loadCanonicalCoverageSnapshot } = await coverageModulePromise;
  const args = parseArgs(process.argv);
  ensureOutDir(args.outDir);

  runCommand("npm", [
    "run",
    "kg:blocked:prioritize",
    "--",
    "--limit",
    String(args.limit),
    ...(args.specialty ? ["--specialty", args.specialty] : []),
  ]);

  const prioritizationPath = path.join(args.outDir, "kg-blocked-node-prioritization.json");
  const prioritization = JSON.parse(readFileSync(prioritizationPath, "utf8")) as PrioritizationReport;
  const selectedNodes = prioritization.topNodes
    .filter((node) => (args.specialty ? node.specialty === args.specialty : true))
    .slice(0, args.limit);

  const supabase = createServiceRoleClient();
  const fetchAll = fetchAllRows as <T>(
    buildQuery: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>
  ) => Promise<T[]>;
  const snapshot = await loadCanonicalCoverageSnapshot(
    supabase as unknown as Parameters<typeof loadCanonicalCoverageSnapshot>[0]
  );

  const nodeIds = new Set(selectedNodes.map((node) => node.nodeId));
  const cardIds = new Set<string>();
  const questionIds = new Set<string>();

  const [
    legacyCardLinks,
    legacyQuestionLinks,
    canonicalCards,
    cardVersions,
    externalQuestions,
    curriculumNodeAliases,
    sourceAliases,
    externalSources,
    learningObjectives,
    ankiCards,
    ankiDecks,
    ankiNotes,
    ankiNoteTags,
    ankiTags,
    proposals,
  ] = await Promise.all([
    fetchAll<LegacyCardLink>((from, to) =>
      supabase
        .from("card_knowledge_links")
        .select("canonical_card_id,curriculum_node_id")
        .eq("is_active", true)
        .range(from, to)
    ),
    fetchAll<LegacyQuestionLink>((from, to) =>
      supabase
        .from("external_question_curriculum_mappings")
        .select("external_question_id,curriculum_node_id")
        .eq("is_active", true)
        .range(from, to)
    ),
    fetchAll<CanonicalCardRow>((from, to) =>
      supabase
        .from("canonical_cards")
        .select("id,title,current_version_id,anki_note_id,anki_card_id")
        .eq("is_active", true)
        .range(from, to)
    ),
    fetchAll<CanonicalCardVersionRow>((from, to) =>
      supabase
        .from("canonical_card_versions")
        .select("id,canonical_card_id,field_snapshot,raw_html_snapshot")
        .eq("is_active", true)
        .range(from, to)
    ),
    fetchAll<ExternalQuestionRow>((from, to) =>
      supabase
        .from("external_questions")
        .select("id,external_question_id,topic_raw,topic_slug,metadata,source_id")
        .eq("is_active", true)
        .range(from, to)
    ),
    fetchAll<CurriculumNodeAliasRow>((from, to) =>
      supabase
        .from("curriculum_node_aliases")
        .select("id,curriculum_node_id,alias_name")
        .eq("is_active", true)
        .range(from, to)
    ),
    fetchAll<SourceAliasRow>((from, to) =>
      supabase
        .from("source_aliases")
        .select("id,source_id,entity_type,entity_id,alias_kind,alias_value")
        .eq("is_active", true)
        .range(from, to)
    ),
    fetchAll<ExternalSourceRow>((from, to) =>
      supabase.from("external_sources").select("id,slug,name").eq("is_active", true).range(from, to)
    ),
    fetchAll<LearningObjectiveRow>((from, to) =>
      supabase
        .from("learning_objectives")
        .select("id,curriculum_node_id,objective_text,sort_order")
        .eq("is_active", true)
        .range(from, to)
    ),
    fetchAll<AnkiCardRow>((from, to) =>
      supabase.from("anki_cards").select("id,anki_card_id,deck_id,note_id").eq("is_active", true).range(from, to)
    ),
    fetchAll<AnkiDeckRow>((from, to) =>
      supabase
        .from("anki_decks")
        .select("id,full_name,deck_path")
        .eq("is_active", true)
        .range(from, to)
    ),
    fetchAll<AnkiNoteRow>((from, to) =>
      supabase.from("anki_notes").select("id,anki_note_id").eq("is_active", true).range(from, to)
    ),
    fetchAll<AnkiNoteTagRow>((from, to) =>
      supabase.from("anki_note_tags").select("note_id,tag_id").eq("is_active", true).range(from, to)
    ),
    fetchAll<AnkiTagRow>((from, to) =>
      supabase.from("anki_tags").select("id,raw_name").eq("is_active", true).range(from, to)
    ),
    fetchAll<ProposalRow>((from, to) =>
      supabase.from("kg_automation_proposals").select("*").eq("is_active", true).range(from, to)
    ),
  ]);

  const sourceById = new Map(externalSources.map((row) => [row.id, row]));
  const cardById = new Map(canonicalCards.map((row) => [row.id, row]));
  const versionById = new Map(cardVersions.map((row) => [row.id, row]));
  const questionById = new Map(externalQuestions.map((row) => [row.id, row]));
  const nodeById = new Map<string, CoverageNode>(
    (snapshot.curriculumNodes as CoverageNode[]).map((row): [string, CoverageNode] => [row.id, row])
  );
  const specialtyById = new Map<string, CoverageSpecialty>(
    (snapshot.specialties as CoverageSpecialty[]).map((row): [string, CoverageSpecialty] => [row.id, row])
  );

  const childNodesByParentId = new Map<string, CoverageNode[]>();
  for (const row of snapshot.curriculumNodes as CoverageNode[]) {
    if (!row.parent_id) {
      continue;
    }
    const bucket = childNodesByParentId.get(row.parent_id) ?? [];
    bucket.push(row);
    childNodesByParentId.set(row.parent_id, bucket);
  }

  const curriculumAliasesByNodeId = new Map<string, string[]>();
  for (const row of curriculumNodeAliases) {
    if (!nodeIds.has(row.curriculum_node_id)) {
      continue;
    }
    const bucket = curriculumAliasesByNodeId.get(row.curriculum_node_id) ?? [];
    bucket.push(row.alias_name);
    curriculumAliasesByNodeId.set(row.curriculum_node_id, bucket);
  }

  const sourceAliasesByEntityKey = new Map<string, SourceAliasRow[]>();
  const aliasMapByEntityId = new Map<string, string[]>();
  for (const row of sourceAliases) {
    const key = `${row.entity_type}:${row.entity_id}`;
    const bucket = sourceAliasesByEntityKey.get(key) ?? [];
    bucket.push(row);
    sourceAliasesByEntityKey.set(key, bucket);
    if (row.entity_type === "canonical_entity") {
      const aliases = aliasMapByEntityId.get(row.entity_id) ?? [];
      aliases.push(row.alias_value);
      aliasMapByEntityId.set(row.entity_id, aliases);
    }
  }

  const learningObjectivesByNodeId = new Map<string, LearningObjectiveRow[]>();
  for (const row of learningObjectives) {
    if (!nodeIds.has(row.curriculum_node_id)) {
      continue;
    }
    const bucket = learningObjectivesByNodeId.get(row.curriculum_node_id) ?? [];
    bucket.push(row);
    learningObjectivesByNodeId.set(row.curriculum_node_id, bucket);
  }
  for (const rows of learningObjectivesByNodeId.values()) {
    rows.sort((left, right) => left.sort_order - right.sort_order || left.objective_text.localeCompare(right.objective_text));
  }

  const ankiCardByRawCardId = new Map(ankiCards.map((row) => [row.anki_card_id ?? "", row]));
  const noteIdByRawNoteId = new Map(ankiNotes.map((row) => [row.anki_note_id ?? "", row.id]));
  const deckById = new Map(ankiDecks.map((row) => [row.id, row]));
  const tagById = new Map(ankiTags.map((row) => [row.id, row]));
  const tagIdsByNoteId = new Map<string, string[]>();
  for (const row of ankiNoteTags) {
    const bucket = tagIdsByNoteId.get(row.note_id) ?? [];
    bucket.push(row.tag_id);
    tagIdsByNoteId.set(row.note_id, bucket);
  }

  const cardIdsByNode = new Map<string, Set<string>>();
  const questionIdsByNode = new Map<string, Set<string>>();
  const deckLabelsByNodeId = new Map<string, Set<string>>();
  const tagLabelsByNodeId = new Map<string, Set<string>>();

  for (const link of legacyCardLinks) {
    if (!link.curriculum_node_id || !nodeIds.has(link.curriculum_node_id)) {
      continue;
    }
    const cardBucket = cardIdsByNode.get(link.curriculum_node_id) ?? new Set<string>();
    cardBucket.add(link.canonical_card_id);
    cardIdsByNode.set(link.curriculum_node_id, cardBucket);
    cardIds.add(link.canonical_card_id);

    const card = cardById.get(link.canonical_card_id);
    if (card?.anki_card_id) {
      const ankiCard = ankiCardByRawCardId.get(card.anki_card_id);
      const deck = ankiCard?.deck_id ? deckById.get(ankiCard.deck_id) ?? null : null;
      if (deck) {
        const deckLabels = deckLabelsByNodeId.get(link.curriculum_node_id) ?? new Set<string>();
        deckLabels.add(deck.full_name);
        for (const branch of deck.deck_path ?? []) {
          deckLabels.add(branch);
        }
        deckLabelsByNodeId.set(link.curriculum_node_id, deckLabels);
      }
    }

    if (card?.anki_note_id) {
      const noteId = noteIdByRawNoteId.get(card.anki_note_id) ?? null;
      if (noteId) {
        const tags = tagLabelsByNodeId.get(link.curriculum_node_id) ?? new Set<string>();
        for (const tagId of tagIdsByNoteId.get(noteId) ?? []) {
          const tag = tagById.get(tagId);
          if (tag) {
            tags.add(tag.raw_name);
          }
        }
        tagLabelsByNodeId.set(link.curriculum_node_id, tags);
      }
    }
  }

  for (const link of legacyQuestionLinks) {
    if (!link.curriculum_node_id || !nodeIds.has(link.curriculum_node_id)) {
      continue;
    }
    const bucket = questionIdsByNode.get(link.curriculum_node_id) ?? new Set<string>();
    bucket.add(link.external_question_id);
    questionIdsByNode.set(link.curriculum_node_id, bucket);
    questionIds.add(link.external_question_id);
  }

  const proposalsByNodeId = new Map<string, ProposalRow[]>();
  for (const proposal of proposals) {
    const nodeId =
      typeof proposal.metadata.source_curriculum_node_id === "string"
        ? proposal.metadata.source_curriculum_node_id
        : typeof proposal.metadata.curriculum_node_id === "string"
          ? proposal.metadata.curriculum_node_id
          : null;
    if (!nodeId || !nodeIds.has(nodeId)) {
      continue;
    }
    const bucket = proposalsByNodeId.get(nodeId) ?? [];
    bucket.push(proposal);
    proposalsByNodeId.set(nodeId, bucket);
  }

  const canonicalEntityCandidates = (snapshot.canonicalEntities as CoverageEntity[])
    .filter((entity) => entity.is_active)
    .map((entity) => ({ ...entity, aliases: aliasMapByEntityId.get(entity.id) ?? [] }));

  const packets: EvidencePacket[] = selectedNodes.map((node) => {
    const coverageNode = nodeById.get(node.nodeId) ?? null;
    const parent = coverageNode?.parent_id ? nodeById.get(coverageNode.parent_id) ?? null : null;
    const children = (childNodesByParentId.get(node.nodeId) ?? [])
      .sort((left, right) => left.title.localeCompare(right.title))
      .slice(0, 8);
    const siblings = parent
      ? (childNodesByParentId.get(parent.id) ?? [])
          .filter((row) => row.id !== node.nodeId)
          .sort((left, right) => left.title.localeCompare(right.title))
          .slice(0, 8)
      : [];
    const specialtyName =
      node.specialty ??
      (coverageNode?.specialty_id ? specialtyById.get(coverageNode.specialty_id)?.name ?? null : null);
    const representativeCardTitles = [...(cardIdsByNode.get(node.nodeId) ?? new Set<string>())]
      .map((id) => cardById.get(id)?.title?.trim())
      .filter((value): value is string => !!value)
      .slice(0, 6);
    const representativeCardSnippets = [...(cardIdsByNode.get(node.nodeId) ?? new Set<string>())]
      .map((id) => {
        const card = cardById.get(id) ?? null;
        const version = card?.current_version_id ? versionById.get(card.current_version_id) ?? null : null;
        return extractCardSnippet(version);
      })
      .filter((value): value is string => !!value)
      .slice(0, 6);
    const representativeQuestionTitles = [...(questionIdsByNode.get(node.nodeId) ?? new Set<string>())]
      .map((id) => {
        const question = questionById.get(id);
        return question ? extractQuestionTitle(question) : null;
      })
      .filter((value): value is string => !!value)
      .slice(0, 6);
    const representativeQuestionSnippets = [...(questionIdsByNode.get(node.nodeId) ?? new Set<string>())]
      .map((id) => {
        const question = questionById.get(id);
        return question ? extractQuestionSnippet(question) : null;
      })
      .filter((value): value is string => !!value)
      .slice(0, 6);
    const sourceAliasRows = sourceAliasesByEntityKey.get(`curriculum_node:${node.nodeId}`) ?? [];
    const nearbyEntities = buildNearbyEntityIndex(canonicalEntityCandidates, node.title);
    const aliasNearMatches = uniqueSorted([
      ...nearbyEntities.map((entity) => entity.matchedValue),
      ...(node.bestNearMatchLabel ? [node.bestNearMatchLabel] : []),
    ]).slice(0, 12);
    const orthobulletsPaths = uniqueSorted([
      ...sourceAliasRows
        .filter((row) => {
          const source = sourceById.get(row.source_id);
          return (
            source?.slug?.toLowerCase().includes("orthobullets") ||
            source?.name?.toLowerCase().includes("orthobullets") ||
            row.alias_value.toLowerCase().includes("orthobullets")
          );
        })
        .map((row) => row.alias_value),
      ...[...(deckLabelsByNodeId.get(node.nodeId) ?? new Set<string>())].filter((label) =>
        label.toLowerCase().includes("orthobullets")
      ),
      ...[...(tagLabelsByNodeId.get(node.nodeId) ?? new Set<string>())].filter((label) =>
        label.toLowerCase().includes("orthobullets")
      ),
    ]);
    const activeProposals = proposalsByNodeId.get(node.nodeId) ?? [];
    const createProposal = activeProposals.find((proposal) => proposal.proposal_type === "create_canonical_entity") ?? null;
    const activeCreatePacketKey =
      createProposal &&
      (typeof createProposal.metadata.review_packet_key === "string"
        ? createProposal.metadata.review_packet_key
        : createProposal.proposal_fingerprint);

    return {
      nodeId: node.nodeId,
      slug: node.slug,
      title: node.title,
      specialty: specialtyName,
      curriculumPath: node.curriculumPath,
      depth: node.depth,
      nodeType: coverageNode?.node_type ?? null,
      blockedBucket: node.bucket,
      blockedReason: node.reason,
      currentBlockedReason: node.splitRisk
        ? "split_risk"
        : node.genericRisk
          ? "generic_risk"
          : node.bucket.includes("no canonical")
            ? "no_canonical_entity_yet"
            : "other",
      migrationImpact: {
        legacyCardCount: node.legacyCardMappings,
        legacyQuestionCount: node.legacyQuestionMappings,
        totalAffectedObjects: node.totalAffectedObjects,
      },
      riskSignals: {
        splitRisk: node.splitRisk,
        genericRisk: node.genericRisk,
        labelSpecificity: node.labelSpecificity,
      },
      ontologyContext: {
        parent: parent
          ? { id: parent.id, slug: parent.slug, title: parent.title, nodeType: parent.node_type }
          : null,
        children: children.map((row) => ({ id: row.id, slug: row.slug, title: row.title, nodeType: row.node_type })),
        siblings: siblings.map((row) => ({ id: row.id, slug: row.slug, title: row.title, nodeType: row.node_type })),
        learningObjectives: (learningObjectivesByNodeId.get(node.nodeId) ?? [])
          .map((row) => cleanText(row.objective_text))
          .filter(Boolean)
          .slice(0, 8),
      },
      representativeContent: {
        cardTitles: representativeCardTitles,
        cardSnippets: representativeCardSnippets,
        questionTitles: representativeQuestionTitles,
        questionSnippets: representativeQuestionSnippets,
      },
      externalSignals: {
        orthobulletsPaths,
        ankiDeckPaths: uniqueSorted(deckLabelsByNodeId.get(node.nodeId) ?? []).slice(0, 12),
        ankiTags: uniqueSorted(tagLabelsByNodeId.get(node.nodeId) ?? []).slice(0, 12),
        curriculumAliases: uniqueSorted(curriculumAliasesByNodeId.get(node.nodeId) ?? []).slice(0, 12),
        sourceAliases: sourceAliasRows
          .map((row) => ({
            alias: row.alias_value,
            sourceName: sourceById.get(row.source_id)?.name ?? null,
            sourceSlug: sourceById.get(row.source_id)?.slug ?? null,
          }))
          .sort(
            (left, right) =>
              compareNullable(left.sourceName, right.sourceName) || left.alias.localeCompare(right.alias)
          )
          .slice(0, 12),
      },
      nearbyCanonicalEntities: nearbyEntities,
      aliasNearMatches,
      oldHeuristic: {
        bucket: node.bucket,
        bestNearMatchLabel: node.bestNearMatchLabel,
        bestNearMatchType: node.bestNearMatchType,
        bestNearMatchScore: node.bestNearMatchScore,
        activeProposalTypes: uniqueSorted(activeProposals.map((proposal) => proposal.proposal_type)),
        activeCreatePacketKey: activeCreatePacketKey ?? null,
      },
    } satisfies EvidencePacket;
  });

  packets.sort(
    (left, right) =>
      right.migrationImpact.totalAffectedObjects - left.migrationImpact.totalAffectedObjects ||
      compareNullable(left.specialty, right.specialty) ||
      left.curriculumPath.localeCompare(right.curriculumPath)
  );

  const report: EvidencePacketReport = {
    generatedAt: new Date().toISOString(),
    prioritizationGeneratedAt: prioritization.generatedAt,
    totalBlockedNodes: prioritization.totalBlockedNodes,
    analyzedNodes: packets.length,
    packets,
  };

  const jsonPath = path.join(args.outDir, "kg-ontology-evidence-packets.json");
  const mdPath = path.join(args.outDir, "kg-ontology-evidence-packets.md");
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(mdPath, buildMarkdown(report), "utf8");

  console.log(
    JSON.stringify(
      {
        generatedAt: report.generatedAt,
        analyzedNodes: report.analyzedNodes,
        totalBlockedNodes: report.totalBlockedNodes,
        jsonPath,
        mdPath,
      },
      null,
      2
    )
  );
}

main().catch(async (error) => {
  const { serializeError } = await commonModulePromise;
  console.error(JSON.stringify({ error: serializeError(error) }, null, 2));
  process.exit(1);
});
