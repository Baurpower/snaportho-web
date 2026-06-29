import { writeFileSync } from "node:fs";
import path from "node:path";
import type {
  CoverageCanonicalEntity,
  CoverageCurriculumBridge,
  CoverageCurriculumNode,
  CoverageSpecialty,
} from "./lib/education/kg-canonical-coverage.ts";

const commonModulePromise = import(new URL("./kg-automation-common.ts", import.meta.url).href);
const coverageModulePromise = import(
  new URL("./lib/education/kg-canonical-coverage.ts", import.meta.url).href
);

type ParsedArgs = {
  outDir: string;
  limit: number;
};

type ProposalRow = import("./kg-automation-common").ProposalRow;

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
  bucket:
    | "safe exact entity-create candidates"
    | "likely entity-create candidates needing review"
    | "likely alias/merge candidates"
    | "split-risk"
    | "generic/non-entity nodes"
    | "empty/no-mapping nodes";
  reason: string;
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

function normalizeLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['".,()/]/g, " ")
    .replace(/\s+/g, " ");
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
  if (conditionTokens.some((token) => normalized.includes(token))) {
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
    normalized.includes("nailing") ||
    normalized.includes("replacement")
  ) {
    return "procedure";
  }
  if (normalized.includes("implant") || normalized.includes("nail") || normalized.includes("plate")) {
    return "implant";
  }

  return null;
}

function genericRisk(title: string) {
  const normalized = normalizeLabel(title);
  const genericTokens = [
    "considerations",
    "principles",
    "overview",
    "basics",
    "general",
    "orthopaedic implants",
    "implant basics",
    "exam",
    "imaging",
    "definitions",
    "exercise science",
    "management",
    "resuscitation",
  ];
  return genericTokens.some((token) => normalized.includes(token));
}

function splitRisk(title: string) {
  const normalized = normalizeLabel(title);
  return normalized.includes(" and ") || normalized.includes(" / ") || normalized.includes("&");
}

function labelSpecificity(title: string, inferredEntityType: string | null, isGeneric: boolean, isSplit: boolean) {
  if (isGeneric || isSplit) {
    return "low" as const;
  }
  const tokenCount = normalizeLabel(title)
    .split(" ")
    .filter(Boolean).length;
  if (inferredEntityType && tokenCount >= 2) {
    return "high" as const;
  }
  if (inferredEntityType) {
    return "medium" as const;
  }
  return tokenCount >= 2 ? ("medium" as const) : ("low" as const);
}

function jaccardSimilarity(left: string, right: string) {
  const leftTokens = new Set(normalizeLabel(left).split(" ").filter(Boolean));
  const rightTokens = new Set(normalizeLabel(right).split(" ").filter(Boolean));
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union === 0 ? 0 : intersection / union;
}

async function main() {
  const { createServiceRoleClient, ensureOutDir, fetchAllRows } = await commonModulePromise;
  const { buildCurriculumNodePath, loadCanonicalCoverageSnapshot } = await coverageModulePromise;
  const args = parseArgs(process.argv);
  ensureOutDir(args.outDir);

  const supabase = createServiceRoleClient();
  const snapshot = await loadCanonicalCoverageSnapshot(
    supabase as unknown as Parameters<typeof loadCanonicalCoverageSnapshot>[0]
  );
  const fetchAll = fetchAllRows as <T>(
    buildQuery: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>
  ) => Promise<T[]>;

  const [legacyCardLinks, legacyQuestionLinks, canonicalCards, canonicalQuestions, sourceAliases, proposals] =
    await Promise.all([
      fetchAll<{
        canonical_card_id: string;
        curriculum_node_id: string | null;
      }>((from, to) =>
        supabase
          .from("card_knowledge_links")
          .select("canonical_card_id,curriculum_node_id")
          .eq("is_active", true)
          .range(from, to)
      ),
      fetchAll<{
        external_question_id: string;
        curriculum_node_id: string | null;
      }>((from, to) =>
        supabase
          .from("external_question_curriculum_mappings")
          .select("external_question_id,curriculum_node_id")
          .eq("is_active", true)
          .range(from, to)
      ),
      fetchAll<{
        canonical_card_id: string;
        source_curriculum_node_id: string | null;
      }>((from, to) =>
        supabase
          .from("card_canonical_entity_links")
          .select("canonical_card_id,source_curriculum_node_id")
          .eq("is_active", true)
          .range(from, to)
      ),
      fetchAll<{
        external_question_id: string;
        source_curriculum_node_id: string | null;
      }>((from, to) =>
        supabase
          .from("question_canonical_entity_links")
          .select("external_question_id,source_curriculum_node_id")
          .eq("is_active", true)
          .range(from, to)
      ),
      fetchAll<{
        entity_type: string;
        entity_id: string;
        alias_value: string;
      }>((from, to) =>
        supabase
          .from("source_aliases")
          .select("entity_type,entity_id,alias_value")
          .eq("is_active", true)
          .range(from, to)
      ),
      fetchAll<ProposalRow>((from, to) =>
        supabase.from("kg_automation_proposals").select("*").eq("is_active", true).range(from, to)
      ),
    ]);

  const nodeById = new Map<string, CoverageCurriculumNode>(
    (snapshot.curriculumNodes as CoverageCurriculumNode[]).map((row): [string, CoverageCurriculumNode] => [
      row.id,
      row,
    ])
  );
  const specialtyById = new Map<string, string>(
    (snapshot.specialties as CoverageSpecialty[]).map((row): [string, string] => [row.id, row.name])
  );
  const bridgedNodeIds = new Set(
    (snapshot.curriculumNodeEntityLinks as CoverageCurriculumBridge[])
      .filter((row) => row.is_active && row.review_status === "approved" && row.relation_type === "primary_coverage")
      .map((row) => row.curriculum_node_id)
  );

  const legacyCardsByNode = new Map<string, Set<string>>();
  const legacyQuestionsByNode = new Map<string, Set<string>>();
  for (const row of legacyCardLinks) {
    if (!row.curriculum_node_id) continue;
    const bucket = legacyCardsByNode.get(row.curriculum_node_id) ?? new Set<string>();
    bucket.add(row.canonical_card_id);
    legacyCardsByNode.set(row.curriculum_node_id, bucket);
  }
  for (const row of legacyQuestionLinks) {
    if (!row.curriculum_node_id) continue;
    const bucket = legacyQuestionsByNode.get(row.curriculum_node_id) ?? new Set<string>();
    bucket.add(row.external_question_id);
    legacyQuestionsByNode.set(row.curriculum_node_id, bucket);
  }

  const canonicalCardsByNode = new Map<string, Set<string>>();
  const canonicalQuestionsByNode = new Map<string, Set<string>>();
  for (const row of canonicalCards) {
    if (!row.source_curriculum_node_id) continue;
    const bucket = canonicalCardsByNode.get(row.source_curriculum_node_id) ?? new Set<string>();
    bucket.add(row.canonical_card_id);
    canonicalCardsByNode.set(row.source_curriculum_node_id, bucket);
  }
  for (const row of canonicalQuestions) {
    if (!row.source_curriculum_node_id) continue;
    const bucket = canonicalQuestionsByNode.get(row.source_curriculum_node_id) ?? new Set<string>();
    bucket.add(row.external_question_id);
    canonicalQuestionsByNode.set(row.source_curriculum_node_id, bucket);
  }

  const entityAliasMap = new Map<string, string[]>();
  for (const row of sourceAliases.filter((alias) => alias.entity_type === "canonical_entity")) {
    const bucket = entityAliasMap.get(row.entity_id) ?? [];
    bucket.push(row.alias_value);
    entityAliasMap.set(row.entity_id, bucket);
  }

  const proposalsByNodeId = new Map<string, ProposalRow[]>();
  for (const proposal of proposals) {
    const nodeId =
      typeof proposal.metadata.source_curriculum_node_id === "string"
        ? proposal.metadata.source_curriculum_node_id
        : typeof proposal.metadata.curriculum_node_id === "string"
          ? proposal.metadata.curriculum_node_id
          : null;
    if (!nodeId) continue;
    const bucket = proposalsByNodeId.get(nodeId) ?? [];
    bucket.push(proposal);
    proposalsByNodeId.set(nodeId, bucket);
  }

  const canonicalEntityCandidates = (snapshot.canonicalEntities as CoverageCanonicalEntity[]).map((entity) => ({
    id: entity.id,
    label: entity.preferred_label,
    entityType: entity.entity_type,
    aliases: entityAliasMap.get(entity.id) ?? [],
  }));

  const prioritized: PrioritizedNode[] = [];
  const nodeIds = new Set([...legacyCardsByNode.keys(), ...legacyQuestionsByNode.keys()]);
  for (const nodeId of nodeIds) {
    const node = nodeById.get(nodeId);
    if (!node) continue;
    const legacyCardCount = legacyCardsByNode.get(nodeId)?.size ?? 0;
    const legacyQuestionCount = legacyQuestionsByNode.get(nodeId)?.size ?? 0;
    const totalAffectedObjects = legacyCardCount + legacyQuestionCount;
    const canonicalCardCount = canonicalCardsByNode.get(nodeId)?.size ?? 0;
    const canonicalQuestionCount = canonicalQuestionsByNode.get(nodeId)?.size ?? 0;

    const fullyRetargeted =
      bridgedNodeIds.has(nodeId) &&
      (legacyCardCount === 0 || canonicalCardCount >= legacyCardCount) &&
      (legacyQuestionCount === 0 || canonicalQuestionCount >= legacyQuestionCount);
    if (fullyRetargeted) {
      continue;
    }

    const inferredType = inferEntityType(node.title);
    const isGeneric = genericRisk(node.title);
    const isSplit = splitRisk(node.title);
    const specificity = labelSpecificity(node.title, inferredType, isGeneric, isSplit);
    const packetProposals = proposalsByNodeId.get(nodeId) ?? [];
    const hasSplitFlag = packetProposals.some((proposal) => proposal.proposal_type === "flag_possible_split");
    const pathLabel = buildCurriculumNodePath(node.id, nodeById) ?? node.title;

    let bestNearMatchLabel: string | null = null;
    let bestNearMatchType: string | null = null;
    let bestNearMatchScore: number | null = null;

    for (const candidate of canonicalEntityCandidates) {
      const scores = [jaccardSimilarity(node.title, candidate.label), ...candidate.aliases.map((alias) => jaccardSimilarity(node.title, alias))];
      const score = Math.max(...scores);
      if (bestNearMatchScore === null || score > bestNearMatchScore) {
        bestNearMatchScore = score;
        bestNearMatchLabel = candidate.label;
        bestNearMatchType = candidate.entityType;
      }
    }

    let bucket: PrioritizedNode["bucket"];
    let reason: string;
    if (totalAffectedObjects === 0) {
      bucket = "empty/no-mapping nodes";
      reason = "No active legacy card or question mappings exist for this node.";
    } else if (isSplit || hasSplitFlag) {
      bucket = "split-risk";
      reason = hasSplitFlag
        ? "An active split-risk proposal exists for this node."
        : "The label composition suggests multiple entities or a split-risk concept.";
    } else if (isGeneric || specificity === "low") {
      bucket = "generic/non-entity nodes";
      reason = "The label appears generic, educational, or not specific enough for safe automatic entity creation.";
    } else if ((bestNearMatchScore ?? 0) >= 0.45 && normalizeLabel(bestNearMatchLabel ?? "") !== normalizeLabel(node.title)) {
      bucket = "likely alias/merge candidates";
      reason = `The strongest existing canonical near-match is ${bestNearMatchLabel} (${(bestNearMatchScore ?? 0).toFixed(2)} similarity).`;
    } else if (inferredType && specificity === "high" && (bestNearMatchScore ?? 0) < 0.45) {
      bucket = "safe exact entity-create candidates";
      reason = "Specific clinical label, obvious entity type, and no strong existing canonical near-match.";
    } else {
      bucket = "likely entity-create candidates needing review";
      reason = "A canonical entity likely needs to be created, but the packet still needs human review.";
    }

    prioritized.push({
      nodeId,
      slug: node.slug,
      title: node.title,
      specialty: node.specialty_id ? specialtyById.get(node.specialty_id) ?? null : null,
      curriculumPath: pathLabel,
      depth: pathLabel.split(" > ").length,
      legacyCardMappings: legacyCardCount,
      legacyQuestionMappings: legacyQuestionCount,
      totalAffectedObjects,
      inferredEntityType: inferredType,
      labelSpecificity: specificity,
      splitRisk: isSplit || hasSplitFlag,
      genericRisk: isGeneric,
      bestNearMatchLabel,
      bestNearMatchType,
      bestNearMatchScore,
      bucket,
      reason,
    });
  }

  prioritized.sort(
    (left, right) =>
      right.totalAffectedObjects - left.totalAffectedObjects ||
      right.legacyQuestionMappings - left.legacyQuestionMappings ||
      right.legacyCardMappings - left.legacyCardMappings ||
      left.curriculumPath.localeCompare(right.curriculumPath)
  );

  const topNodes = prioritized.slice(0, args.limit);
  const bucketCounts = new Map<string, number>();
  for (const row of prioritized) {
    bucketCounts.set(row.bucket, (bucketCounts.get(row.bucket) ?? 0) + 1);
  }

  const lines: string[] = [];
  lines.push("# KG Blocked Node Prioritization");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Blocked curriculum nodes with legacy mappings considered: ${prioritized.length}`);
  lines.push(`- Prioritized cohort size: ${topNodes.length}`);
  lines.push("- Buckets:");
  for (const [bucket, count] of [...bucketCounts.entries()].sort((left, right) => right[1] - left[1])) {
    lines.push(`- ${bucket}: ${count}`);
  }
  lines.push("");
  lines.push("## Top Cohort");
  lines.push("");
  lines.push("| Rank | Curriculum path | Specialty | Cards | Questions | Total | Bucket | Type | Specificity | Split | Generic | Near match |");
  lines.push("|---:|---|---|---:|---:|---:|---|---|---|---|---|---|");
  for (const [index, row] of topNodes.entries()) {
    const nearMatch =
      row.bestNearMatchLabel && row.bestNearMatchScore !== null
        ? `${row.bestNearMatchLabel} (${row.bestNearMatchScore.toFixed(2)})`
        : "none";
    lines.push(
      `| ${index + 1} | ${row.curriculumPath} | ${row.specialty ?? "n/a"} | ${row.legacyCardMappings} | ${row.legacyQuestionMappings} | ${row.totalAffectedObjects} | ${row.bucket} | ${row.inferredEntityType ?? "unknown"} | ${row.labelSpecificity} | ${row.splitRisk ? "yes" : "no"} | ${row.genericRisk ? "yes" : "no"} | ${nearMatch} |`
    );
  }
  lines.push("");
  lines.push("## Review Notes");
  lines.push("");
  for (const row of topNodes) {
    lines.push(`- ${row.curriculumPath}: ${row.reason}`);
  }

  const markdownPath = path.join(args.outDir, "kg-blocked-node-prioritization.md");
  writeFileSync(markdownPath, `${lines.join("\n")}\n`, "utf8");

  const jsonPath = path.join(args.outDir, "kg-blocked-node-prioritization.json");
  writeFileSync(
    jsonPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalBlockedNodes: prioritized.length,
        topNodes,
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  console.log(
    JSON.stringify(
      {
        markdownPath,
        jsonPath,
        totalBlockedNodes: prioritized.length,
        topNodeCount: topNodes.length,
        safeCreateCandidateCount: topNodes.filter((row) => row.bucket === "safe exact entity-create candidates").length,
      },
      null,
      2
    )
  );
}

main().catch(async (error) => {
  const { serializeError } = await commonModulePromise;
  console.error(JSON.stringify(serializeError(error), null, 2));
  process.exit(1);
});
