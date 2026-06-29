import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import { z } from "zod";

const commonModulePromise = import(new URL("./kg-automation-common.ts", import.meta.url).href);

type ParsedArgs = {
  limit: number;
  outDir: string;
  inputPath: string;
  model: string;
  dryRun: boolean;
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
  currentBlockedReason: string;
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
  nearbyCanonicalEntities: Array<{
    id: string;
    label: string;
    entityType: string;
    similarity: number;
    matchedOn: "label" | "alias";
    matchedValue: string;
  }>;
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
  analyzedNodes: number;
  packets: EvidencePacket[];
};

type ProposalRow = import("./kg-automation-common").ProposalRow;

type SourceAliasRow = {
  entity_type: string;
  entity_id: string;
  alias_value: string;
};

type CanonicalEntityRow = {
  id: string;
  preferred_label: string;
  normalized_label: string;
  entity_type: string;
  is_active: boolean;
};

const ONTOLOGY_OUTPUT_SCHEMA = z.object({
  decision: z.enum([
    "create_entity",
    "map_to_existing",
    "create_alias",
    "split_node",
    "hold_generic",
    "hold_unclear",
  ]),
  preferred_label: z.string().min(1),
  entity_type: z.enum([
    "condition",
    "procedure",
    "anatomy_structure",
    "classification_system",
    "complication",
    "diagnostic_test",
    "imaging_finding",
    "implant",
    "treatment_principle",
    "biomechanics_concept",
    "exam_maneuver",
    "surgical_approach",
    "surgical_positioning",
  ]),
  aliases: z.array(z.string().min(1)),
  existing_entity_id: z.string().uuid().nullable(),
  rationale: z.string().min(1),
  confidence: z.number().min(0).max(1),
  risk_flags: z.array(z.string()),
  recommended_bridge_type: z.literal("primary_coverage"),
  safe_for_review: z.boolean(),
});

type OntologyOutput = z.infer<typeof ONTOLOGY_OUTPUT_SCHEMA>;

type DecisionCategory =
  | "create_entity"
  | "map_to_existing"
  | "create_alias"
  | "split_node"
  | "hold_generic"
  | "hold_unclear";

type DeterministicPacket = {
  proposal: ProposalRow | null;
  packet: ProposalRow[];
  exactOneCreateProposal: boolean;
  packetSizeIsOne: boolean;
  noSplitRisk: boolean;
  noGenericRisk: boolean;
  noExistingEntityConflict: boolean;
  allowedEntityType: boolean;
  normalizedLabelMatches: boolean;
  affectedObjectCountNonzero: boolean;
  deterministicConfidence: number | null;
  deterministicConfidenceReason: string | null;
  reasons: string[];
  wouldAutoApprove: boolean;
};

type OntologyReviewCandidate = {
  nodeId: string;
  slug: string;
  title: string;
  specialty: string | null;
  curriculumPath: string;
  ontologyDecision: OntologyOutput;
  llmReview: {
    decision: string;
    proposed_entity_label: string;
    proposed_entity_type: string;
    confidence: number;
    reason: string;
    risks: string[];
    existing_entity_id: string | null;
    safe_for_auto_apply: boolean;
  };
  deterministicPacket: DeterministicPacket;
  safeForAutoApply: boolean;
  evidencePacket: EvidencePacket;
  calibratedGate: {
    passed: boolean;
    threshold: number;
    tier: string;
    reasons: string[];
  };
  validator: {
    passed: boolean;
    reasons: string[];
    rejectedBy: string[];
  };
  proposalPreview: {
    proposalTypes: string[];
    rollbackBatchKey: string | null;
    expectedCardGain: number;
    expectedQuestionGain: number;
  };
  relationshipPreview: Array<{
    subjectLabel: string;
    predicate: string;
    objectLabel: string;
    basis: string;
  }>;
  disagreementWithOldHeuristic: string | null;
};

type AllowlistEntry = {
  nodeId: string;
  slug: string;
  title: string;
  specialty: string | null;
  proposedEntityLabel: string;
  proposedEntityType: string;
  llmConfidence: number;
  deterministicConfidence: number | null;
  calibratedThreshold: number;
  calibratedTier: string;
  packetKey: string | null;
  reason: string;
};

type ReviewReport = {
  generatedAt: string;
  model: string;
  nodesAnalyzed: number;
  decisionCounts: Record<DecisionCategory, number>;
  allowlistSize: number;
  expectedMigrationGain: {
    cards: number;
    questions: number;
  };
  candidates: OntologyReviewCandidate[];
};

const DEFAULT_MODEL = "gpt-4.1-mini";
const DEFAULT_INPUT_PATH = path.join("reports", "kg-ontology-evidence-packets.json");
const STRICT_AUTO_APPLY_ENTITY_TYPES = new Set(["condition", "procedure"]);
const ALLOWED_ENTITY_TYPES = new Set([
  "condition",
  "procedure",
  "anatomy_structure",
  "classification_system",
  "complication",
  "diagnostic_test",
  "imaging_finding",
  "implant",
  "treatment_principle",
  "biomechanics_concept",
  "exam_maneuver",
  "surgical_approach",
  "surgical_positioning",
]);
const GENERIC_LABELS = new Set([
  "trauma",
  "fractures",
  "arthritis",
  "infection",
  "tumor",
  "tumors",
  "spine",
  "hand",
  "foot",
  "ankle",
  "hip",
  "knee",
  "shoulder",
  "elbow",
  "wrist",
  "pelvis",
]);

function parseArgs(argv: string[]): ParsedArgs {
  let limit = 100;
  let outDir = "reports";
  let inputPath = DEFAULT_INPUT_PATH;
  let model = DEFAULT_MODEL;

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--limit") {
      const parsed = Number(argv[index + 1] ?? "100");
      limit = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : limit;
      index += 1;
    } else if (arg === "--out-dir") {
      outDir = argv[index + 1] ?? outDir;
      index += 1;
    } else if (arg === "--input") {
      inputPath = argv[index + 1] ?? inputPath;
      index += 1;
    } else if (arg === "--model") {
      model = argv[index + 1] ?? model;
      index += 1;
    }
  }

  return {
    limit,
    outDir,
    inputPath,
    model,
    dryRun: argv.includes("--dry-run"),
  };
}

function normalizeLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['".,()/:-]/g, " ")
    .replace(/\s+/g, " ");
}

function compareNullable(left: string | null, right: string | null) {
  return (left ?? "").localeCompare(right ?? "");
}

function loadOpenAIApiKey(loadEnvFile: (filePath: string) => Record<string, string>) {
  if (process.env.OPENAI_API_KEY?.trim()) {
    return process.env.OPENAI_API_KEY.trim();
  }
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    throw new Error("OPENAI_API_KEY is not configured and .env.local is missing.");
  }
  const env = loadEnvFile(envPath);
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  return apiKey;
}

function extractJsonObject(raw: string): string | null {
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first === -1 || last === -1 || first >= last) {
    return null;
  }
  return trimmed.slice(first, last + 1);
}

function classifyCalibratedTier(review: {
  title: string;
  ontologyDecision: OntologyOutput;
  evidencePacket: EvidencePacket;
}) {
  const normalizedNodeLabel = normalizeLabel(review.title);
  const normalizedProposedLabel = normalizeLabel(review.ontologyDecision.preferred_label);
  const normalizedNearMatches = new Set(
    review.evidencePacket.aliasNearMatches.map((value) => normalizeLabel(value))
  );
  const exactNormalizedMatch = normalizedNodeLabel === normalizedProposedLabel;
  const nearOrAliasMatch = normalizedNearMatches.has(normalizedProposedLabel);
  const strictType = STRICT_AUTO_APPLY_ENTITY_TYPES.has(review.ontologyDecision.entity_type);
  if (exactNormalizedMatch && strictType) {
    return { tier: "exact_specific", threshold: 0.6 };
  }
  if (nearOrAliasMatch) {
    return { tier: "alias_or_near", threshold: 0.7 };
  }
  return { tier: "weaker_evidence", threshold: 0.8 };
}

function convertToCompatibilityDecision(decision: OntologyOutput): string {
  if (decision.decision === "create_entity") {
    return "approve_create";
  }
  if (decision.decision === "split_node") {
    return "hold_split_risk";
  }
  if (decision.decision === "hold_generic") {
    return "hold_generic";
  }
  if (decision.decision === "map_to_existing") {
    return "merge_with_existing";
  }
  if (decision.decision === "create_alias") {
    return "needs_alias";
  }
  return "needs_human_review";
}

function buildDryRunDecision(packet: EvidencePacket): OntologyOutput {
  const exactSpecific =
    !packet.riskSignals.splitRisk &&
    !packet.riskSignals.genericRisk &&
    packet.riskSignals.labelSpecificity === "high" &&
    packet.migrationImpact.totalAffectedObjects > 0;

  return {
    decision: exactSpecific ? "create_entity" : packet.riskSignals.genericRisk ? "hold_generic" : "hold_unclear",
    preferred_label: packet.title,
    entity_type: "condition",
    aliases: packet.externalSignals.curriculumAliases.slice(0, 5),
    existing_entity_id: null,
    rationale: exactSpecific
      ? "Dry-run placeholder: specific blocked node with nonzero mapped objects."
      : "Dry-run placeholder: evidence requires external review.",
    confidence: exactSpecific ? 0.65 : 0.35,
    risk_flags: [
      ...(packet.riskSignals.splitRisk ? ["split_risk"] : []),
      ...(packet.riskSignals.genericRisk ? ["generic_risk"] : []),
    ],
    recommended_bridge_type: "primary_coverage",
    safe_for_review: exactSpecific,
  };
}

async function reviewCandidate(openai: OpenAI, model: string, packet: EvidencePacket): Promise<OntologyOutput> {
  const completion = await openai.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are reviewing blocked orthopedic curriculum nodes for a medical knowledge graph. " +
          "Return exactly one JSON object, no markdown. Favor hold_generic or hold_unclear whenever the node could be broad, educational, ambiguous, alias-only, or split-risk. " +
          "Approve create_entity only for a single specific clinical entity clearly supported by the evidence packet.",
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            task: "Classify this blocked curriculum node for ontology generation.",
            output_schema: {
              decision: [
                "create_entity",
                "map_to_existing",
                "create_alias",
                "split_node",
                "hold_generic",
                "hold_unclear",
              ],
              preferred_label: "string",
              entity_type:
                "condition | procedure | anatomy_structure | classification_system | complication | diagnostic_test | imaging_finding | implant | treatment_principle | biomechanics_concept | exam_maneuver | surgical_approach | surgical_positioning",
              aliases: ["string"],
              existing_entity_id: "uuid or null",
              rationale: "string",
              confidence: "number 0.0-1.0",
              risk_flags: ["string"],
              recommended_bridge_type: "primary_coverage",
              safe_for_review: "boolean",
            },
            evidence_packet: {
              curriculum_path: packet.curriculumPath,
              node_title: packet.title,
              specialty: packet.specialty,
              blocked_reason: packet.blockedReason,
              risk_signals: packet.riskSignals,
              migration_impact: packet.migrationImpact,
              parent: packet.ontologyContext.parent,
              children: packet.ontologyContext.children.slice(0, 6),
              siblings: packet.ontologyContext.siblings.slice(0, 6),
              learning_objectives: packet.ontologyContext.learningObjectives.slice(0, 5),
              representative_cards: packet.representativeContent.cardTitles.slice(0, 4),
              representative_card_snippets: packet.representativeContent.cardSnippets.slice(0, 3),
              representative_questions: packet.representativeContent.questionTitles.slice(0, 4),
              representative_question_snippets: packet.representativeContent.questionSnippets.slice(0, 3),
              orthobullets_paths: packet.externalSignals.orthobulletsPaths.slice(0, 5),
              anki_deck_paths: packet.externalSignals.ankiDeckPaths.slice(0, 6),
              anki_tags: packet.externalSignals.ankiTags.slice(0, 6),
              curriculum_aliases: packet.externalSignals.curriculumAliases.slice(0, 6),
              source_aliases: packet.externalSignals.sourceAliases.slice(0, 6),
              nearby_existing_entities: packet.nearbyCanonicalEntities.slice(0, 5),
              alias_near_matches: packet.aliasNearMatches.slice(0, 8),
            },
          },
          null,
          2
        ),
      },
    ],
  });

  const rawText = completion.choices[0]?.message?.content ?? "";
  const jsonText = extractJsonObject(rawText);
  if (!jsonText) {
    throw new Error(`Model did not return parseable JSON for ${packet.slug}. Raw output: ${rawText}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(
      `Ontology builder returned invalid JSON for ${packet.slug}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const candidate = { ...(parsed as Record<string, unknown>) };
    if (typeof candidate.preferred_label !== "string" || candidate.preferred_label.trim().length === 0) {
      candidate.preferred_label = packet.title;
    }
    const rawEntityType =
      typeof candidate.entity_type === "string" ? candidate.entity_type.trim() : "";
    if (rawEntityType.length === 0) {
      candidate.entity_type = "condition";
    } else if (!ALLOWED_ENTITY_TYPES.has(rawEntityType)) {
      // The model proposed an entity_type outside the schema enum. Never let an
      // unrecognized type slip through as a create/map decision — downgrade to a
      // human-reviewable hold instead of crashing the whole batch on .parse().
      candidate.entity_type = "condition";
      candidate.decision = "hold_unclear";
      candidate.safe_for_review = false;
      candidate.confidence = Math.min(
        typeof candidate.confidence === "number" ? candidate.confidence : 0,
        0.2
      );
      candidate.risk_flags = [
        ...(Array.isArray(candidate.risk_flags) ? candidate.risk_flags : []),
        `invalid_entity_type_from_model:${rawEntityType}`,
      ];
      candidate.rationale = `Model proposed unrecognized entity_type "${rawEntityType}"; held for human review. Original rationale: ${
        typeof candidate.rationale === "string" ? candidate.rationale : "none provided"
      }`;
    } else {
      candidate.entity_type = rawEntityType;
    }
    if (!Array.isArray(candidate.aliases)) {
      candidate.aliases = [];
    }
    if (candidate.existing_entity_id === undefined) {
      candidate.existing_entity_id = null;
    }
    if (typeof candidate.rationale !== "string" || candidate.rationale.trim().length === 0) {
      candidate.rationale = "Model response omitted rationale.";
    }
    if (typeof candidate.confidence !== "number") {
      candidate.confidence = 0;
    }
    if (!Array.isArray(candidate.risk_flags)) {
      candidate.risk_flags = [];
    }
    if (candidate.recommended_bridge_type !== "primary_coverage") {
      candidate.recommended_bridge_type = "primary_coverage";
    }
    if (typeof candidate.safe_for_review !== "boolean") {
      candidate.safe_for_review = false;
    }
    parsed = candidate;
  }

  return ONTOLOGY_OUTPUT_SCHEMA.parse(parsed);
}

function buildDeterministicPacket(
  packet: EvidencePacket,
  activeProposals: ProposalRow[],
  entitiesByNormalizedLabel: Map<string, CanonicalEntityRow[]>,
  aliasEntityIdsByNormalizedAlias: Map<string, Set<string>>,
  decision: OntologyOutput
): DeterministicPacket {
  const createProposals = activeProposals.filter((proposal) => proposal.proposal_type === "create_canonical_entity");
  const proposal = createProposals.length === 1 ? createProposals[0] : null;
  const packetKey =
    proposal &&
    (typeof proposal.metadata.review_packet_key === "string"
      ? proposal.metadata.review_packet_key
      : proposal.proposal_fingerprint);
  const packetRows =
    proposal && packetKey
      ? activeProposals.filter((candidate) => {
          const candidatePacketKey =
            typeof candidate.metadata.review_packet_key === "string"
              ? candidate.metadata.review_packet_key
              : candidate.proposal_fingerprint;
          return candidatePacketKey === packetKey;
        })
      : [];

  const normalizedLabel = normalizeLabel(decision.preferred_label);
  const existingExact = entitiesByNormalizedLabel.get(normalizedLabel) ?? [];
  const aliasExact = aliasEntityIdsByNormalizedAlias.get(normalizedLabel) ?? new Set<string>();
  const noExistingEntityConflict = existingExact.length === 0 && aliasExact.size === 0;
  const exactOneCreateProposal = createProposals.length === 1;
  const packetSizeIsOne = packetRows.length === 1;
  const noSplitRisk = !packet.riskSignals.splitRisk;
  const noGenericRisk = !packet.riskSignals.genericRisk && !GENERIC_LABELS.has(normalizedLabel);
  const allowedEntityType = ALLOWED_ENTITY_TYPES.has(decision.entity_type);
  const normalizedLabelMatches = normalizeLabel(packet.title) === normalizedLabel;
  const affectedObjectCountNonzero = packet.migrationImpact.totalAffectedObjects > 0;

  const reasons: string[] = [];
  if (!exactOneCreateProposal) {
    reasons.push(`Expected exactly one create_canonical_entity proposal, found ${createProposals.length}.`);
  }
  if (!packetSizeIsOne) {
    reasons.push(`Expected packet size 1, found ${packetRows.length}.`);
  }
  if (!noSplitRisk) {
    reasons.push("Split-risk flag present in evidence packet.");
  }
  if (!noGenericRisk) {
    reasons.push("Generic-risk signal present in evidence packet.");
  }
  if (!noExistingEntityConflict) {
    reasons.push("Existing canonical label or alias conflict detected.");
  }
  if (!allowedEntityType) {
    reasons.push(`Entity type ${decision.entity_type} is not allowed.`);
  }
  if (!normalizedLabelMatches) {
    reasons.push("Preferred label does not exactly normalize to the curriculum node label.");
  }
  if (!affectedObjectCountNonzero) {
    reasons.push("Affected object count is zero.");
  }

  return {
    proposal,
    packet: packetRows,
    exactOneCreateProposal,
    packetSizeIsOne,
    noSplitRisk,
    noGenericRisk,
    noExistingEntityConflict,
    allowedEntityType,
    normalizedLabelMatches,
    affectedObjectCountNonzero,
    deterministicConfidence: proposal?.confidence ?? null,
    deterministicConfidenceReason: proposal?.confidence_reason ?? null,
    reasons,
    wouldAutoApprove: reasons.length === 0,
  };
}

function validateDecision(
  packet: EvidencePacket,
  decision: OntologyOutput,
  deterministicPacket: DeterministicPacket
) {
  const rejectedBy: string[] = [];
  const reasons: string[] = [];
  const normalizedLabel = normalizeLabel(decision.preferred_label);
  const hasSpecificEvidence =
    packet.representativeContent.cardTitles.length > 0 ||
    packet.representativeContent.questionTitles.length > 0 ||
    packet.ontologyContext.learningObjectives.length > 0;

  if (!ALLOWED_ENTITY_TYPES.has(decision.entity_type)) {
    rejectedBy.push("invalid_entity_type");
    reasons.push(`Entity type ${decision.entity_type} is not supported.`);
  }
  if (decision.recommended_bridge_type !== "primary_coverage") {
    rejectedBy.push("unsupported_bridge_type");
    reasons.push("Bridge type must remain primary_coverage.");
  }
  if (packet.riskSignals.splitRisk && decision.decision !== "split_node") {
    rejectedBy.push("split_risk");
    reasons.push("Split-risk nodes must stay split_node.");
  }
  if ((packet.riskSignals.genericRisk || GENERIC_LABELS.has(normalizedLabel)) && decision.decision !== "hold_generic") {
    rejectedBy.push("generic_risk");
    reasons.push("Generic nodes must stay hold_generic.");
  }
  if (decision.confidence < 0.55 && decision.decision !== "hold_generic" && decision.decision !== "hold_unclear") {
    rejectedBy.push("low_confidence");
    reasons.push(`Confidence ${decision.confidence.toFixed(2)} is below the minimum review threshold.`);
  }
  if (!normalizedLabel) {
    rejectedBy.push("bad_normalization");
    reasons.push("Preferred label does not normalize cleanly.");
  }
  if (!hasSpecificEvidence && decision.decision !== "hold_unclear") {
    rejectedBy.push("weak_evidence");
    reasons.push("Evidence packet lacks representative content for a positive action.");
  }
  if (decision.decision === "map_to_existing" && !decision.existing_entity_id) {
    rejectedBy.push("missing_existing_entity");
    reasons.push("map_to_existing requires an existing_entity_id.");
  }
  if (decision.decision === "create_alias" && !decision.existing_entity_id) {
    rejectedBy.push("missing_existing_entity");
    reasons.push("create_alias requires an existing_entity_id.");
  }
  if (decision.decision === "create_entity" && !deterministicPacket.normalizedLabelMatches) {
    rejectedBy.push("label_mismatch");
    reasons.push("create_entity is not supported when the preferred label differs from the node label.");
  }

  return {
    passed: rejectedBy.length === 0,
    reasons,
    rejectedBy,
  };
}

function buildRelationshipPreview(packet: EvidencePacket, decision: OntologyOutput) {
  const previews: Array<{ subjectLabel: string; predicate: string; objectLabel: string; basis: string }> = [];
  if (decision.decision !== "create_entity") {
    return previews;
  }
  if (decision.entity_type === "condition") {
    for (const entity of packet.nearbyCanonicalEntities) {
      if (entity.entityType === "classification_system") {
        previews.push({
          subjectLabel: decision.preferred_label,
          predicate: "has_classification",
          objectLabel: entity.label,
          basis: "Nearby canonical classification entity appeared in the evidence packet.",
        });
      } else if (entity.entityType === "anatomy_structure") {
        previews.push({
          subjectLabel: decision.preferred_label,
          predicate: "involves_anatomy",
          objectLabel: entity.label,
          basis: "Nearby canonical anatomy entity appeared in the evidence packet.",
        });
      }
      if (previews.length >= 3) {
        break;
      }
    }
  }
  if (decision.entity_type === "procedure") {
    for (const entity of packet.nearbyCanonicalEntities) {
      if (entity.entityType === "implant") {
        previews.push({
          subjectLabel: decision.preferred_label,
          predicate: "uses_implant",
          objectLabel: entity.label,
          basis: "Nearby canonical implant entity appeared in the evidence packet.",
        });
      } else if (entity.entityType === "surgical_approach") {
        previews.push({
          subjectLabel: decision.preferred_label,
          predicate: "uses_approach",
          objectLabel: entity.label,
          basis: "Nearby canonical approach entity appeared in the evidence packet.",
        });
      } else if (entity.entityType === "surgical_positioning") {
        previews.push({
          subjectLabel: decision.preferred_label,
          predicate: "uses_positioning",
          objectLabel: entity.label,
          basis: "Nearby canonical positioning entity appeared in the evidence packet.",
        });
      }
      if (previews.length >= 3) {
        break;
      }
    }
  }
  return previews;
}

function buildDisagreement(packet: EvidencePacket, decision: OntologyOutput) {
  if (decision.decision === "create_entity" && packet.oldHeuristic.bucket !== "safe exact entity-create candidates") {
    return `LLM proposed create_entity while old heuristic bucket was ${packet.oldHeuristic.bucket}.`;
  }
  if (decision.decision === "map_to_existing" && packet.oldHeuristic.bucket.includes("entity-create")) {
    return "LLM preferred map_to_existing where the old heuristic leaned toward entity creation.";
  }
  if (decision.decision === "hold_generic" && !packet.riskSignals.genericRisk) {
    return "LLM held the node as generic despite the old deterministic classifier not flagging generic-risk.";
  }
  return null;
}

function buildMarkdown(report: ReviewReport, allowlist: AllowlistEntry[]) {
  const lines: string[] = [];
  lines.push("# KG Ontology Builder Review");
  lines.push("");
  lines.push(`- Generated: ${report.generatedAt}`);
  lines.push(`- Model: ${report.model}`);
  lines.push(`- Nodes analyzed: ${report.nodesAnalyzed}`);
  lines.push(`- Allowlist size: ${report.allowlistSize}`);
  lines.push(
    `- Expected migration gain if allowlist is applied: ${report.expectedMigrationGain.cards} cards, ${report.expectedMigrationGain.questions} questions`
  );
  lines.push("");
  lines.push("## Decision Counts");
  lines.push("");
  for (const [decision, count] of Object.entries(report.decisionCounts)) {
    lines.push(`- ${decision}: ${count}`);
  }
  lines.push("");
  lines.push("## Allowlist");
  lines.push("");
  for (const entry of allowlist) {
    lines.push(
      `- ${entry.title} (${entry.proposedEntityType}, confidence ${entry.llmConfidence.toFixed(2)}, threshold ${entry.calibratedThreshold.toFixed(2)})`
    );
  }
  lines.push("");
  lines.push("## Top Disagreements");
  lines.push("");
  for (const candidate of report.candidates.filter((row) => row.disagreementWithOldHeuristic).slice(0, 15)) {
    lines.push(`- ${candidate.title}: ${candidate.disagreementWithOldHeuristic}`);
  }
  lines.push("");
  lines.push("## Candidate Details");
  lines.push("");
  for (const candidate of report.candidates.slice(0, 25)) {
    lines.push(`### ${candidate.title}`);
    lines.push("");
    lines.push(`- Curriculum path: ${candidate.curriculumPath}`);
    lines.push(`- Decision: ${candidate.ontologyDecision.decision}`);
    lines.push(`- Preferred label: ${candidate.ontologyDecision.preferred_label}`);
    lines.push(`- Entity type: ${candidate.ontologyDecision.entity_type}`);
    lines.push(`- Confidence: ${candidate.ontologyDecision.confidence.toFixed(2)}`);
    lines.push(`- Validator passed: ${candidate.validator.passed}`);
    lines.push(`- Safe for auto apply: ${candidate.safeForAutoApply}`);
    lines.push(
      `- Proposal preview: ${candidate.proposalPreview.proposalTypes.join(" → ") || "hold-only"}`
    );
    lines.push(`- Rationale: ${candidate.ontologyDecision.rationale}`);
    if (candidate.validator.reasons.length > 0) {
      lines.push(`- Validator reasons: ${candidate.validator.reasons.join("; ")}`);
    }
    if (candidate.relationshipPreview.length > 0) {
      lines.push(
        `- Relationship preview: ${candidate.relationshipPreview
          .map((row) => `${row.subjectLabel} ${row.predicate} ${row.objectLabel}`)
          .join("; ")}`
      );
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const { createServiceRoleClient, ensureOutDir, fetchAllRows, loadEnvFile } = await commonModulePromise;
  const args = parseArgs(process.argv);
  ensureOutDir(args.outDir);

  const inputPath = path.isAbsolute(args.inputPath) ? args.inputPath : path.join(process.cwd(), args.inputPath);
  const report = JSON.parse(readFileSync(inputPath, "utf8")) as EvidencePacketReport;
  const packets = report.packets.slice(0, args.limit);

  const supabase = createServiceRoleClient();
  const fetchAll = fetchAllRows as <T>(
    buildQuery: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>
  ) => Promise<T[]>;

  const [canonicalEntities, sourceAliases, proposals] = await Promise.all([
    fetchAll<CanonicalEntityRow>((from, to) =>
      supabase
        .from("canonical_entities")
        .select("id,preferred_label,normalized_label,entity_type,is_active")
        .eq("is_active", true)
        .range(from, to)
    ),
    fetchAll<SourceAliasRow>((from, to) =>
      supabase
        .from("source_aliases")
        .select("entity_type,entity_id,alias_value")
        .eq("is_active", true)
        .range(from, to)
    ),
    fetchAll<ProposalRow>((from, to) =>
      supabase
        .from("kg_automation_proposals")
        .select("*")
        .eq("is_active", true)
        .in("review_status", ["generated", "needs_review", "approved"])
        .range(from, to)
    ),
  ]);

  const entitiesByNormalizedLabel = new Map<string, CanonicalEntityRow[]>();
  for (const entity of canonicalEntities) {
    const bucket = entitiesByNormalizedLabel.get(entity.normalized_label) ?? [];
    bucket.push(entity);
    entitiesByNormalizedLabel.set(entity.normalized_label, bucket);
  }

  const aliasEntityIdsByNormalizedAlias = new Map<string, Set<string>>();
  for (const row of sourceAliases.filter((alias) => alias.entity_type === "canonical_entity")) {
    const key = normalizeLabel(row.alias_value);
    const bucket = aliasEntityIdsByNormalizedAlias.get(key) ?? new Set<string>();
    bucket.add(row.entity_id);
    aliasEntityIdsByNormalizedAlias.set(key, bucket);
  }

  const proposalsByNodeId = new Map<string, ProposalRow[]>();
  for (const proposal of proposals) {
    const nodeId =
      typeof proposal.metadata.source_curriculum_node_id === "string"
        ? proposal.metadata.source_curriculum_node_id
        : typeof proposal.metadata.curriculum_node_id === "string"
          ? proposal.metadata.curriculum_node_id
          : null;
    if (!nodeId) {
      continue;
    }
    const bucket = proposalsByNodeId.get(nodeId) ?? [];
    bucket.push(proposal);
    proposalsByNodeId.set(nodeId, bucket);
  }

  const openai = args.dryRun
    ? null
    : new OpenAI({
        apiKey: loadOpenAIApiKey(loadEnvFile as (filePath: string) => Record<string, string>),
      });

  const candidates: OntologyReviewCandidate[] = [];
  const decisionCounts: Record<DecisionCategory, number> = {
    create_entity: 0,
    map_to_existing: 0,
    create_alias: 0,
    split_node: 0,
    hold_generic: 0,
    hold_unclear: 0,
  };

  for (const packet of packets) {
    let ontologyDecision: OntologyOutput;
    if (openai === null) {
      ontologyDecision = buildDryRunDecision(packet);
    } else {
      try {
        ontologyDecision = await reviewCandidate(openai, args.model, packet);
      } catch (error) {
        // A single bad/unparseable LLM response must not abort the whole batch.
        // Hold for human review and keep going; the failure reason is preserved
        // in risk_flags/rationale for audit.
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[kg:ontology:build-llm] reviewCandidate failed for ${packet.slug}: ${message}`);
        ontologyDecision = {
          decision: "hold_unclear",
          preferred_label: packet.title,
          entity_type: "condition",
          aliases: [],
          existing_entity_id: null,
          rationale: `LLM review failed and was held for human review: ${message}`,
          confidence: 0,
          risk_flags: ["llm_review_error"],
          recommended_bridge_type: "primary_coverage",
          safe_for_review: false,
        };
      }
    }
    decisionCounts[ontologyDecision.decision] += 1;

    const deterministicPacket = buildDeterministicPacket(
      packet,
      proposalsByNodeId.get(packet.nodeId) ?? [],
      entitiesByNormalizedLabel,
      aliasEntityIdsByNormalizedAlias,
      ontologyDecision
    );
    const { tier, threshold } = classifyCalibratedTier({
      title: packet.title,
      ontologyDecision,
      evidencePacket: packet,
    });
    const calibratedReasons: string[] = [];
    if (convertToCompatibilityDecision(ontologyDecision) !== "approve_create") {
      calibratedReasons.push("Decision is not create_entity / approve_create.");
    }
    if (ontologyDecision.confidence < threshold) {
      calibratedReasons.push(
        `LLM confidence ${ontologyDecision.confidence.toFixed(2)} is below calibrated threshold ${threshold.toFixed(2)}.`
      );
    }
    if (!deterministicPacket.wouldAutoApprove) {
      calibratedReasons.push(...deterministicPacket.reasons);
    }

    const validator = validateDecision(packet, ontologyDecision, deterministicPacket);
    const safeForAutoApply =
      validator.passed &&
      ontologyDecision.decision === "create_entity" &&
      convertToCompatibilityDecision(ontologyDecision) === "approve_create" &&
      deterministicPacket.wouldAutoApprove &&
      ontologyDecision.confidence >= threshold &&
      STRICT_AUTO_APPLY_ENTITY_TYPES.has(ontologyDecision.entity_type);

    const proposalTypes =
      ontologyDecision.decision === "create_entity"
        ? ["create_canonical_entity", "link_curriculum_node_to_entity", "retarget_card_to_entity", "retarget_question_to_entity"]
        : ontologyDecision.decision === "map_to_existing"
          ? ["link_curriculum_node_to_entity"]
          : ontologyDecision.decision === "create_alias"
            ? ["add_entity_alias"]
            : ontologyDecision.decision === "split_node"
              ? ["flag_possible_split"]
              : [];

    const createProposal = deterministicPacket.proposal;
    const packetKey =
      createProposal &&
      (typeof createProposal.metadata.review_packet_key === "string"
        ? createProposal.metadata.review_packet_key
        : createProposal.proposal_fingerprint);

    candidates.push({
      nodeId: packet.nodeId,
      slug: packet.slug,
      title: packet.title,
      specialty: packet.specialty,
      curriculumPath: packet.curriculumPath,
      ontologyDecision,
      llmReview: {
        decision: convertToCompatibilityDecision(ontologyDecision),
        proposed_entity_label: ontologyDecision.preferred_label,
        proposed_entity_type: ontologyDecision.entity_type,
        confidence: ontologyDecision.confidence,
        reason: ontologyDecision.rationale,
        risks: ontologyDecision.risk_flags,
        existing_entity_id: ontologyDecision.existing_entity_id,
        safe_for_auto_apply: safeForAutoApply,
      },
      deterministicPacket,
      safeForAutoApply,
      evidencePacket: packet,
      calibratedGate: {
        passed: calibratedReasons.length === 0,
        threshold,
        tier,
        reasons: calibratedReasons,
      },
      validator,
      proposalPreview: {
        proposalTypes,
        rollbackBatchKey: `retarget:${packet.slug}`,
        expectedCardGain: packet.migrationImpact.legacyCardCount,
        expectedQuestionGain: packet.migrationImpact.legacyQuestionCount,
      },
      relationshipPreview: buildRelationshipPreview(packet, ontologyDecision),
      disagreementWithOldHeuristic: buildDisagreement(packet, ontologyDecision),
    });
  }

  candidates.sort(
    (left, right) =>
      right.evidencePacket.migrationImpact.totalAffectedObjects -
        left.evidencePacket.migrationImpact.totalAffectedObjects ||
      compareNullable(left.specialty, right.specialty) ||
      left.curriculumPath.localeCompare(right.curriculumPath)
  );

  const allowlistEntries: AllowlistEntry[] = candidates
    .filter((candidate) => candidate.safeForAutoApply)
    .map((candidate) => {
      const proposal = candidate.deterministicPacket.proposal;
      const packetKey =
        proposal &&
        (typeof proposal.metadata.review_packet_key === "string"
          ? proposal.metadata.review_packet_key
          : proposal.proposal_fingerprint);
      return {
        nodeId: candidate.nodeId,
        slug: candidate.slug,
        title: candidate.title,
        specialty: candidate.specialty,
        proposedEntityLabel: candidate.ontologyDecision.preferred_label,
        proposedEntityType: candidate.ontologyDecision.entity_type,
        llmConfidence: candidate.ontologyDecision.confidence,
        deterministicConfidence: candidate.deterministicPacket.deterministicConfidence,
        calibratedThreshold: candidate.calibratedGate.threshold,
        calibratedTier: candidate.calibratedGate.tier,
        packetKey: packetKey ?? null,
        reason: candidate.ontologyDecision.rationale,
      };
    });

  const reviewReport: ReviewReport = {
    generatedAt: new Date().toISOString(),
    model: args.model,
    nodesAnalyzed: candidates.length,
    decisionCounts,
    allowlistSize: allowlistEntries.length,
    expectedMigrationGain: {
      cards: allowlistEntries.reduce((sum, entry) => {
        const candidate = candidates.find((row) => row.slug === entry.slug);
        return sum + (candidate?.proposalPreview.expectedCardGain ?? 0);
      }, 0),
      questions: allowlistEntries.reduce((sum, entry) => {
        const candidate = candidates.find((row) => row.slug === entry.slug);
        return sum + (candidate?.proposalPreview.expectedQuestionGain ?? 0);
      }, 0),
    },
    candidates,
  };

  const jsonPath = path.join(args.outDir, "kg-ontology-builder-review.json");
  const mdPath = path.join(args.outDir, "kg-ontology-builder-review.md");
  const allowlistPath = path.join(args.outDir, "kg-ontology-builder-allowlist.json");

  writeFileSync(jsonPath, `${JSON.stringify(reviewReport, null, 2)}\n`, "utf8");
  writeFileSync(mdPath, buildMarkdown(reviewReport, allowlistEntries), "utf8");
  writeFileSync(
    allowlistPath,
    `${JSON.stringify(
      {
        generatedAt: reviewReport.generatedAt,
        allowedNodeSlugs: allowlistEntries.map((entry) => entry.slug),
        entries: allowlistEntries,
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  console.log(
    JSON.stringify(
      {
        generatedAt: reviewReport.generatedAt,
        nodesAnalyzed: reviewReport.nodesAnalyzed,
        decisionCounts: reviewReport.decisionCounts,
        allowlistSize: reviewReport.allowlistSize,
        expectedMigrationGain: reviewReport.expectedMigrationGain,
        jsonPath,
        mdPath,
        allowlistPath,
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
