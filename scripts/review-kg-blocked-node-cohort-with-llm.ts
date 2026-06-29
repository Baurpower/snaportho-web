import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import { z } from "zod";
import type { CoverageCanonicalEntity } from "./lib/education/kg-canonical-coverage.ts";

const commonModulePromise = import(new URL("./kg-automation-common.ts", import.meta.url).href);
const coverageModulePromise = import(
  new URL("./lib/education/kg-canonical-coverage.ts", import.meta.url).href
);

type ParsedArgs = {
  cohortSize: number;
  specialty: string | null;
  dryRun: boolean;
  rescoreExisting: boolean;
  model: string;
  outDir: string;
  inputPath: string;
  confidenceThreshold: number;
  existingReviewPath: string;
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
  bucket:
    | "safe exact entity-create candidates"
    | "likely entity-create candidates needing review"
    | "likely alias/merge candidates"
    | "split-risk"
    | "generic/non-entity nodes"
    | "empty/no-mapping nodes";
  reason: string;
};

type PrioritizationReport = {
  generatedAt: string;
  totalBlockedNodes: number;
  topNodes: PrioritizedNode[];
};

type ProposalRow = import("./kg-automation-common").ProposalRow;

type CanonicalEntityCandidate = {
  id: string;
  label: string;
  entityType: string;
  aliases: string[];
};

type LegacyCardLink = {
  canonical_card_id: string;
  curriculum_node_id: string | null;
};

type LegacyQuestionLink = {
  external_question_id: string;
  curriculum_node_id: string | null;
};

type CanonicalCardRow = {
  id: string;
  title: string | null;
};

type ExternalQuestionRow = {
  id: string;
  external_question_id: string;
  topic_raw: string | null;
  topic_slug: string | null;
};

type SourceAliasRow = {
  entity_type: string;
  entity_id: string;
  alias_value: string;
};

type NearbyEntity = {
  id: string;
  label: string;
  entityType: string;
  similarity: number;
  matchedOn: "label" | "alias";
  matchedValue: string;
};

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

type EvidencePacket = {
  curriculum_path: string;
  node_title: string;
  specialty: string | null;
  legacy_card_count: number;
  legacy_question_count: number;
  total_affected_objects: number;
  proposed_entity_label: string;
  proposed_entity_type: string | null;
  top_nearby_existing_entities: NearbyEntity[];
  aliases_or_near_matches: string[];
  split_risk_flags: string[];
  generic_risk_flags: string[];
  representative_card_titles: string[];
  representative_question_titles: string[];
  deterministic_confidence: number | null;
  deterministic_reasons: string[];
};

const REVIEW_OUTPUT_SCHEMA = z.object({
  decision: z.enum([
    "approve_create",
    "hold_generic",
    "hold_split_risk",
    "merge_with_existing",
    "needs_alias",
    "wrong_entity_type",
    "needs_human_review",
  ]),
  proposed_entity_label: z.string().min(1),
  proposed_entity_type: z.string().min(1),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1),
  risks: z.array(z.string()),
  existing_entity_id: z.string().uuid().nullable(),
  safe_for_auto_apply: z.boolean(),
});

type ReviewOutput = z.infer<typeof REVIEW_OUTPUT_SCHEMA>;

type CandidateReview = {
  nodeId: string;
  slug: string;
  title: string;
  specialty: string | null;
  curriculumPath: string;
  bucket: PrioritizedNode["bucket"];
  deterministicBucketReason: string;
  llmReview: ReviewOutput;
  deterministicPacket: DeterministicPacket;
  safeForAutoApply: boolean;
  llmApproved: boolean;
  evidencePacket: EvidencePacket;
  calibratedGate: CalibratedGateResult;
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
  reason: string;
};

type CalibratedGateTier = "exact_specific" | "alias_or_near" | "weaker_evidence";

type CalibratedGateResult = {
  passed: boolean;
  threshold: number;
  tier: CalibratedGateTier;
  reasons: string[];
};

const DEFAULT_INPUT_PATH = path.join("reports", "kg-blocked-node-prioritization.json");
const DEFAULT_EXISTING_REVIEW_PATH = path.join("reports", "kg-blocked-node-llm-review.json");
const DEFAULT_MODEL = "gpt-4.1-mini";
const DEFAULT_CONFIDENCE_THRESHOLD = 0.8;
const ALLOWED_ENTITY_TYPES = new Set([
  "condition",
  "procedure",
  "anatomy_structure",
  "implant",
  "classification_system",
  "biomechanics_concept",
]);
const STRICT_AUTO_APPLY_ENTITY_TYPES = new Set(["condition", "procedure"]);

function parseArgs(argv: string[]): ParsedArgs {
  let cohortSize = 50;
  let specialty: string | null = null;
  let model = DEFAULT_MODEL;
  let outDir = "reports";
  let inputPath = DEFAULT_INPUT_PATH;
  let confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD;
  let existingReviewPath = DEFAULT_EXISTING_REVIEW_PATH;

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--cohort-size") {
      const parsed = Number(argv[index + 1] ?? "50");
      cohortSize = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : cohortSize;
      index += 1;
    } else if (arg === "--specialty") {
      specialty = argv[index + 1] ?? specialty;
      index += 1;
    } else if (arg === "--model") {
      model = argv[index + 1] ?? model;
      index += 1;
    } else if (arg === "--out-dir") {
      outDir = argv[index + 1] ?? outDir;
      index += 1;
    } else if (arg === "--input") {
      inputPath = argv[index + 1] ?? inputPath;
      index += 1;
    } else if (arg === "--confidence-threshold") {
      const parsed = Number(argv[index + 1] ?? String(DEFAULT_CONFIDENCE_THRESHOLD));
      confidenceThreshold =
        Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : confidenceThreshold;
      index += 1;
    } else if (arg === "--existing-review") {
      existingReviewPath = argv[index + 1] ?? existingReviewPath;
      index += 1;
    }
  }

  return {
    cohortSize,
    specialty,
    dryRun: argv.includes("--dry-run"),
    rescoreExisting: argv.includes("--rescore-existing"),
    model,
    outDir,
    inputPath,
    confidenceThreshold,
    existingReviewPath,
  };
}

function normalizeLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['".,()/:-]/g, " ")
    .replace(/\s+/g, " ");
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

function jaccardSimilarity(left: string, right: string) {
  const leftTokens = new Set(normalizeLabel(left).split(" ").filter(Boolean));
  const rightTokens = new Set(normalizeLabel(right).split(" ").filter(Boolean));
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union === 0 ? 0 : intersection / union;
}

function compareNullableStrings(left: string | null, right: string | null) {
  return (left ?? "").localeCompare(right ?? "");
}

function classifyCalibratedTier(review: {
  title: string;
  llmReview: { proposed_entity_label: string; proposed_entity_type: string };
  deterministicPacket: DeterministicPacket;
  evidencePacket: EvidencePacket;
}) {
  const normalizedNodeLabel = normalizeLabel(review.title);
  const normalizedProposedLabel = normalizeLabel(review.llmReview.proposed_entity_label);
  const normalizedNearMatches = new Set(
    review.evidencePacket.aliases_or_near_matches.map((value) => normalizeLabel(value))
  );
  const exactNormalizedMatch = normalizedNodeLabel === normalizedProposedLabel;
  const nearOrAliasMatch = normalizedNearMatches.has(normalizedProposedLabel);
  const strictType = STRICT_AUTO_APPLY_ENTITY_TYPES.has(review.llmReview.proposed_entity_type);
  if (exactNormalizedMatch && strictType) {
    return { tier: "exact_specific" as const, threshold: 0.6 };
  }
  if (nearOrAliasMatch) {
    return { tier: "alias_or_near" as const, threshold: 0.7 };
  }
  return { tier: "weaker_evidence" as const, threshold: 0.8 };
}

function applyCalibratedGate(review: {
  title: string;
  llmReview: { decision: string; proposed_entity_label: string; proposed_entity_type: string; confidence: number };
  deterministicPacket: DeterministicPacket;
  evidencePacket: EvidencePacket;
}) : CalibratedGateResult {
  const { tier, threshold } = classifyCalibratedTier(review);
  const reasons: string[] = [];
  const exactNormalizedMatch =
    normalizeLabel(review.title) === normalizeLabel(review.llmReview.proposed_entity_label);
  const strictType = STRICT_AUTO_APPLY_ENTITY_TYPES.has(review.llmReview.proposed_entity_type);

  if (review.llmReview.decision !== "approve_create") {
    reasons.push("LLM decision is not approve_create.");
  }
  if (!review.deterministicPacket.wouldAutoApprove) {
    reasons.push(...review.deterministicPacket.reasons);
  }
  if (!exactNormalizedMatch) {
    reasons.push("Exact normalized node label does not equal proposed entity label.");
  }
  if (!strictType) {
    reasons.push(`Entity type ${review.llmReview.proposed_entity_type} is not condition or procedure.`);
  }
  if (!review.deterministicPacket.affectedObjectCountNonzero) {
    reasons.push("Affected card/question count is zero.");
  }
  if (!review.deterministicPacket.noExistingEntityConflict) {
    reasons.push("Existing entity conflict detected.");
  }
  if (!review.deterministicPacket.noSplitRisk) {
    reasons.push("Split-risk flag detected.");
  }
  if (!review.deterministicPacket.noGenericRisk) {
    reasons.push("Generic-risk flag detected.");
  }
  if (review.llmReview.confidence < threshold) {
    reasons.push(
      `LLM confidence ${review.llmReview.confidence.toFixed(2)} is below calibrated threshold ${threshold.toFixed(2)}.`
    );
  }

  return {
    passed: reasons.length === 0,
    threshold,
    tier,
    reasons,
  };
}

function loadOpenAIApiKey(loadEnvFile: (filePath: string) => Record<string, string>) {
  if (process.env.OPENAI_API_KEY?.trim()) {
    return process.env.OPENAI_API_KEY.trim();
  }

  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    throw new Error("OPENAI_API_KEY is not configured and .env.local is missing.");
  }

  const fileEnv = loadEnvFile(envPath);
  const apiKey = fileEnv.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  return apiKey;
}

function buildNearbyEntityIndex(entities: CanonicalEntityCandidate[], title: string, limit = 5): NearbyEntity[] {
  return entities
    .map((entity) => {
      const labelScore = jaccardSimilarity(title, entity.label);
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
        label: entity.label,
        entityType: entity.entityType,
        similarity: Math.max(labelScore, bestAliasScore, 0),
        matchedOn: useAlias ? ("alias" as const) : ("label" as const),
        matchedValue: useAlias ? bestAlias : entity.label,
      };
    })
    .sort(
      (left, right) =>
        right.similarity - left.similarity ||
        left.label.localeCompare(right.label) ||
        left.entityType.localeCompare(right.entityType)
    )
    .slice(0, limit);
}

function detectExactExistingEntityConflict(
  nodeTitle: string,
  proposal: ProposalRow | null,
  nearbyEntities: NearbyEntity[],
  aliasMapByEntityId: Map<string, string[]>
) {
  const targetLabel = normalizeLabel(proposal?.proposed_entity_label ?? nodeTitle);
  if (!targetLabel) {
    return false;
  }

  for (const entity of nearbyEntities) {
    if (normalizeLabel(entity.label) === targetLabel) {
      return true;
    }
    const aliases = aliasMapByEntityId.get(entity.id) ?? [];
    if (aliases.some((alias) => normalizeLabel(alias) === targetLabel)) {
      return true;
    }
  }

  return false;
}

function buildDeterministicPacket(
  node: PrioritizedNode,
  proposals: ProposalRow[],
  nearbyEntities: NearbyEntity[],
  aliasMapByEntityId: Map<string, string[]>
): DeterministicPacket {
  const createProposals = proposals.filter((proposal) => proposal.proposal_type === "create_canonical_entity");
  const proposal = createProposals.length === 1 ? createProposals[0] : null;
  const packetKey =
    proposal &&
    (typeof proposal.metadata.review_packet_key === "string"
      ? proposal.metadata.review_packet_key
      : proposal.proposal_fingerprint);
  const packet =
    proposal && packetKey
      ? proposals.filter((candidate) => {
          const candidatePacketKey =
            typeof candidate.metadata.review_packet_key === "string"
              ? candidate.metadata.review_packet_key
              : candidate.proposal_fingerprint;
          return candidatePacketKey === packetKey;
        })
      : [];

  const exactOneCreateProposal = createProposals.length === 1;
  const packetSizeIsOne = packet.length === 1;
  const noSplitRisk =
    !node.splitRisk && !proposals.some((candidate) => candidate.proposal_type === "flag_possible_split");
  const noGenericRisk = !node.genericRisk;
  const noExistingEntityConflict =
    proposal !== null &&
    !proposal.proposed_existing_entity_id &&
    proposal.conflict_count === 0 &&
    !detectExactExistingEntityConflict(node.title, proposal, nearbyEntities, aliasMapByEntityId);
  const proposedEntityType = proposal?.proposed_entity_type ?? node.inferredEntityType;
  const allowedEntityType = !!proposedEntityType && ALLOWED_ENTITY_TYPES.has(proposedEntityType);
  const proposedLabel = proposal?.proposed_entity_label ?? node.title;
  const normalizedLabelMatches = normalizeLabel(proposedLabel) === normalizeLabel(node.title);
  const affectedObjectCountNonzero =
    node.totalAffectedObjects > 0 &&
    ((proposal?.supporting_card_count ?? 0) > 0 || (proposal?.supporting_question_count ?? 0) > 0);

  const reasons: string[] = [];
  if (!exactOneCreateProposal) {
    reasons.push(`Expected exactly one create_canonical_entity proposal, found ${createProposals.length}.`);
  }
  if (!packetSizeIsOne) {
    reasons.push(`Expected a single-proposal packet, found packet size ${packet.length}.`);
  }
  if (!noSplitRisk) {
    reasons.push("Split-risk flag present in deterministic evidence.");
  }
  if (!noGenericRisk) {
    reasons.push("Generic/non-entity risk present in deterministic evidence.");
  }
  if (!noExistingEntityConflict) {
    reasons.push("Existing canonical entity conflict detected.");
  }
  if (!allowedEntityType) {
    reasons.push(`Proposed entity type ${proposedEntityType ?? "unknown"} is not in the auto-apply allowlist.`);
  }
  if (!normalizedLabelMatches) {
    reasons.push("Normalized proposed label does not match the curriculum node label.");
  }
  if (!affectedObjectCountNonzero) {
    reasons.push("Affected object count is zero in deterministic evidence.");
  }

  const wouldAutoApprove =
    exactOneCreateProposal &&
    packetSizeIsOne &&
    noSplitRisk &&
    noGenericRisk &&
    noExistingEntityConflict &&
    allowedEntityType &&
    normalizedLabelMatches &&
    affectedObjectCountNonzero;

  return {
    proposal,
    packet,
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
    wouldAutoApprove,
  };
}

function buildEvidencePacket(
  node: PrioritizedNode,
  deterministicPacket: DeterministicPacket,
  nearbyEntities: NearbyEntity[],
  representativeCardTitles: string[],
  representativeQuestionTitles: string[]
): EvidencePacket {
  const proposal = deterministicPacket.proposal;
  const splitRiskFlags: string[] = [];
  const genericRiskFlags: string[] = [];
  if (node.splitRisk) {
    splitRiskFlags.push("Prioritization report marked this node as split-risk.");
  }
  if (deterministicPacket.packet.some((candidate) => candidate.proposal_type === "flag_possible_split")) {
    splitRiskFlags.push("An active flag_possible_split proposal exists.");
  }
  if (node.genericRisk) {
    genericRiskFlags.push("Prioritization report marked this node as generic/non-entity.");
  }

  return {
    curriculum_path: node.curriculumPath,
    node_title: node.title,
    specialty: node.specialty,
    legacy_card_count: node.legacyCardMappings,
    legacy_question_count: node.legacyQuestionMappings,
    total_affected_objects: node.totalAffectedObjects,
    proposed_entity_label: proposal?.proposed_entity_label ?? node.title,
    proposed_entity_type: proposal?.proposed_entity_type ?? node.inferredEntityType,
    top_nearby_existing_entities: nearbyEntities,
    aliases_or_near_matches: nearbyEntities
      .flatMap((entity) => [entity.label, entity.matchedOn === "alias" ? entity.matchedValue : null])
      .filter((value): value is string => !!value)
      .slice(0, 8),
    split_risk_flags: splitRiskFlags,
    generic_risk_flags: genericRiskFlags,
    representative_card_titles: representativeCardTitles,
    representative_question_titles: representativeQuestionTitles,
    deterministic_confidence: deterministicPacket.deterministicConfidence,
    deterministic_reasons: deterministicPacket.reasons.length > 0
      ? deterministicPacket.reasons
      : [
          deterministicPacket.deterministicConfidenceReason ??
            "Deterministic candidate is structurally safe under current rules.",
        ],
  };
}

function buildPrompt(evidencePacket: EvidencePacket) {
  return [
    {
      role: "system" as const,
      content:
        "You review blocked curriculum-node candidates for canonical entity creation in an orthopaedic knowledge graph. " +
        "Return exactly one JSON object, no markdown. Be conservative. Approve only when the node clearly refers to a single specific canonical entity and the proposed entity type is correct. " +
        "If the label is generic, educational, split-risk, a likely alias, or should merge with an existing entity, do not approve_create. " +
        "Set safe_for_auto_apply to false unless the case is clearly safe; the caller will run its own deterministic gate afterward.",
    },
    {
      role: "user" as const,
      content: JSON.stringify(
        {
          task: "Classify this blocked curriculum-node candidate for canonical entity creation.",
          output_schema: {
            decision: [
              "approve_create",
              "hold_generic",
              "hold_split_risk",
              "merge_with_existing",
              "needs_alias",
              "wrong_entity_type",
              "needs_human_review",
            ],
            proposed_entity_label: "string",
            proposed_entity_type: "string",
            confidence: "number 0.0-1.0",
            reason: "string",
            risks: ["string"],
            existing_entity_id: "uuid or null",
            safe_for_auto_apply: "boolean",
          },
          evidence_packet: evidencePacket,
        },
        null,
        2
      ),
    },
  ];
}

async function reviewCandidate(openai: OpenAI, model: string, evidencePacket: EvidencePacket): Promise<ReviewOutput> {
  const completion = await openai.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: buildPrompt(evidencePacket),
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  const json = extractJsonObject(raw);
  if (!json) {
    throw new Error("Blocked-node LLM reviewer returned no parseable JSON object.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new Error(
      `Blocked-node LLM reviewer returned invalid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const candidate = { ...(parsed as Record<string, unknown>) };
    if (typeof candidate.proposed_entity_label !== "string" || candidate.proposed_entity_label.trim().length === 0) {
      candidate.proposed_entity_label = evidencePacket.proposed_entity_label;
    }
    if (typeof candidate.proposed_entity_type !== "string" || candidate.proposed_entity_type.trim().length === 0) {
      candidate.proposed_entity_type = evidencePacket.proposed_entity_type ?? "condition";
    }
    if (!Array.isArray(candidate.risks)) {
      candidate.risks = [];
    }
    if (candidate.existing_entity_id === undefined) {
      candidate.existing_entity_id = null;
    }
    if (typeof candidate.safe_for_auto_apply !== "boolean") {
      candidate.safe_for_auto_apply = false;
    }
    parsed = candidate;
  }

  const validation = REVIEW_OUTPUT_SCHEMA.safeParse(parsed);
  if (!validation.success) {
    throw new Error(`Blocked-node LLM reviewer JSON failed schema validation: ${validation.error.message}`);
  }

  return validation.data;
}

function buildDryRunReview(evidencePacket: EvidencePacket): ReviewOutput {
  return {
    decision: "needs_human_review",
    proposed_entity_label: evidencePacket.proposed_entity_label,
    proposed_entity_type: evidencePacket.proposed_entity_type ?? "condition",
    confidence: 0,
    reason: "Dry-run skipped the external LLM call and produced no model judgment.",
    risks: ["llm_not_called_in_dry_run"],
    existing_entity_id: null,
    safe_for_auto_apply: false,
  };
}

async function main() {
  const { ACTIVE_PROPOSAL_REVIEW_STATUSES, createServiceRoleClient, ensureOutDir, fetchAllRows, loadEnvFile } =
    await commonModulePromise;
  const { loadCanonicalCoverageSnapshot } = await coverageModulePromise;
  const args = parseArgs(process.argv);
  ensureOutDir(args.outDir);

  if (args.rescoreExisting) {
    const existingReview = JSON.parse(readFileSync(args.existingReviewPath, "utf8")) as {
      generatedAt?: string;
      model?: string;
      llmExecuted?: boolean;
      candidates: CandidateReview[];
      cohortSizeRequested?: number;
      specialtyFilter?: string | null;
    };
    const rescoredCandidates = (existingReview.candidates ?? []).map((candidate) => {
      const calibratedGate = applyCalibratedGate(candidate);
      return {
        ...candidate,
        calibratedGate,
        llmReview: {
          ...candidate.llmReview,
          safe_for_auto_apply: calibratedGate.passed,
        },
        safeForAutoApply: calibratedGate.passed,
      };
    });

    rescoredCandidates.sort(
      (left, right) =>
        right.evidencePacket.total_affected_objects - left.evidencePacket.total_affected_objects ||
        compareNullableStrings(left.specialty, right.specialty) ||
        left.curriculumPath.localeCompare(right.curriculumPath)
    );

    const allowlistEntries: AllowlistEntry[] = rescoredCandidates
      .filter((review) => review.safeForAutoApply)
      .map((review) => ({
        nodeId: review.nodeId,
        slug: review.slug,
        title: review.title,
        specialty: review.specialty,
        proposedEntityLabel: review.llmReview.proposed_entity_label,
        proposedEntityType: review.llmReview.proposed_entity_type,
        llmConfidence: review.llmReview.confidence,
        deterministicConfidence: review.deterministicPacket.deterministicConfidence,
        calibratedThreshold: review.calibratedGate.threshold,
        calibratedTier: review.calibratedGate.tier,
        reason: review.llmReview.reason,
      }));

    const calibration = {
      llmApprovesButDeterministicBlocks: rescoredCandidates
        .filter((review) => review.llmApproved && !review.deterministicPacket.wouldAutoApprove)
        .map((review) => review.slug),
      deterministicSafeButLlmHolds: rescoredCandidates
        .filter((review) => !review.llmApproved && review.deterministicPacket.wouldAutoApprove)
        .map((review) => review.slug),
      bothApprove: rescoredCandidates
        .filter((review) => review.llmApproved && review.deterministicPacket.wouldAutoApprove)
        .map((review) => review.slug),
      bothHold: rescoredCandidates
        .filter((review) => !review.llmApproved && !review.deterministicPacket.wouldAutoApprove)
        .map((review) => review.slug),
    };

    const reviewJsonPath = path.join(args.outDir, "kg-blocked-node-llm-review.json");
    const reviewMarkdownPath = path.join(args.outDir, "kg-blocked-node-llm-review.md");
    const allowlistPath = path.join(args.outDir, "kg-blocked-node-cohort-allowlist.json");

    writeFileSync(
      reviewJsonPath,
      `${JSON.stringify(
        {
          ...existingReview,
          generatedAt: new Date().toISOString(),
          mode: "rescore-existing",
          llmExecuted: existingReview.llmExecuted ?? true,
          confidenceThreshold: args.confidenceThreshold,
          calibratedThresholds: {
            exact_specific: 0.6,
            alias_or_near: 0.7,
            weaker_evidence: 0.8,
          },
          reviewedCandidateCount: rescoredCandidates.length,
          calibration: {
            llmApprovesButDeterministicBlocks: calibration.llmApprovesButDeterministicBlocks.length,
            deterministicSafeButLlmHolds: calibration.deterministicSafeButLlmHolds.length,
            bothApprove: calibration.bothApprove.length,
            bothHold: calibration.bothHold.length,
            disagreements: calibration,
          },
          candidates: rescoredCandidates,
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    writeFileSync(
      allowlistPath,
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          model: existingReview.model ?? args.model,
          llmExecuted: existingReview.llmExecuted ?? true,
          confidenceThreshold: args.confidenceThreshold,
          calibratedThresholds: {
            exact_specific: 0.6,
            alias_or_near: 0.7,
            weaker_evidence: 0.8,
          },
          cohortSizeRequested: existingReview.cohortSizeRequested ?? args.cohortSize,
          specialtyFilter: existingReview.specialtyFilter ?? args.specialty,
          allowedNodeSlugs: allowlistEntries.map((entry) => entry.slug),
          entries: allowlistEntries,
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const lines: string[] = [];
    lines.push("# KG Blocked Node LLM Review");
    lines.push("");
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push("Mode: rescore-existing");
    lines.push(`Model: ${existingReview.model ?? args.model}`);
    lines.push("Thresholds: exact_specific=0.60, alias_or_near=0.70, weaker_evidence=0.80");
    lines.push(`Candidates reviewed: ${rescoredCandidates.length}`);
    lines.push(`Allowlist candidates: ${allowlistEntries.length}`);
    lines.push("");
    lines.push("## Calibration");
    lines.push("");
    lines.push(`- LLM approves but deterministic blocks: ${calibration.llmApprovesButDeterministicBlocks.length}`);
    lines.push(`- Deterministic thinks safe but LLM holds: ${calibration.deterministicSafeButLlmHolds.length}`);
    lines.push(`- Both approve: ${calibration.bothApprove.length}`);
    lines.push(`- Both hold: ${calibration.bothHold.length}`);
    lines.push("");
    lines.push("## Candidate Review");
    lines.push("");
    lines.push("| Curriculum path | Total | LLM decision | LLM confidence | Tier | Threshold | Auto-apply |");
    lines.push("|---|---:|---|---:|---|---:|---|");
    for (const review of rescoredCandidates) {
      lines.push(
        `| ${review.curriculumPath} | ${review.evidencePacket.total_affected_objects} | ${review.llmReview.decision} | ${review.llmReview.confidence.toFixed(2)} | ${review.calibratedGate.tier} | ${review.calibratedGate.threshold.toFixed(2)} | ${review.safeForAutoApply ? "yes" : "no"} |`
      );
    }
    lines.push("");
    lines.push("## Notes");
    lines.push("");
    for (const review of rescoredCandidates) {
      lines.push(
        `- ${review.curriculumPath}: ${review.llmReview.decision} (${review.llmReview.confidence.toFixed(
          2
        )}). ${review.llmReview.reason} Gate: ${
          review.calibratedGate.passed
            ? `passed at ${review.calibratedGate.threshold.toFixed(2)} (${review.calibratedGate.tier}).`
            : review.calibratedGate.reasons.join(" ")
        }`
      );
    }
    writeFileSync(reviewMarkdownPath, `${lines.join("\n")}\n`, "utf8");

    console.log(
      JSON.stringify(
        {
          reviewJsonPath,
          reviewMarkdownPath,
          allowlistPath,
          reviewedCandidateCount: rescoredCandidates.length,
          allowlistCount: allowlistEntries.length,
          calibration: {
            llmApprovesButDeterministicBlocks: calibration.llmApprovesButDeterministicBlocks.length,
            deterministicSafeButLlmHolds: calibration.deterministicSafeButLlmHolds.length,
            bothApprove: calibration.bothApprove.length,
            bothHold: calibration.bothHold.length,
          },
        },
        null,
        2
      )
    );
    return;
  }

  const prioritization = JSON.parse(readFileSync(args.inputPath, "utf8")) as PrioritizationReport;
  const specialtyFilter = args.specialty?.trim().toLowerCase() ?? null;
  const selectedNodes = prioritization.topNodes
    .filter((node) => !specialtyFilter || (node.specialty ?? "").trim().toLowerCase() === specialtyFilter)
    .slice(0, args.cohortSize);

  const supabase = createServiceRoleClient();
  const fetchAll = fetchAllRows as <T>(
    buildQuery: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>
  ) => Promise<T[]>;

  const snapshot = await loadCanonicalCoverageSnapshot(
    supabase as unknown as Parameters<typeof loadCanonicalCoverageSnapshot>[0]
  );

  const [legacyCardLinks, legacyQuestionLinks, canonicalCards, externalQuestions, sourceAliases, proposals] =
    await Promise.all([
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
        supabase.from("canonical_cards").select("id,title").eq("is_active", true).range(from, to)
      ),
      fetchAll<ExternalQuestionRow>((from, to) =>
        supabase
          .from("external_questions")
          .select("id,external_question_id,topic_raw,topic_slug")
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
          .in("review_status", ACTIVE_PROPOSAL_REVIEW_STATUSES)
          .range(from, to)
      ),
    ]);

  const nodeIds = new Set(selectedNodes.map((node) => node.nodeId));
  const cardIdsByNode = new Map<string, Set<string>>();
  const questionIdsByNode = new Map<string, Set<string>>();
  for (const row of legacyCardLinks) {
    if (!row.curriculum_node_id || !nodeIds.has(row.curriculum_node_id)) continue;
    const bucket = cardIdsByNode.get(row.curriculum_node_id) ?? new Set<string>();
    bucket.add(row.canonical_card_id);
    cardIdsByNode.set(row.curriculum_node_id, bucket);
  }
  for (const row of legacyQuestionLinks) {
    if (!row.curriculum_node_id || !nodeIds.has(row.curriculum_node_id)) continue;
    const bucket = questionIdsByNode.get(row.curriculum_node_id) ?? new Set<string>();
    bucket.add(row.external_question_id);
    questionIdsByNode.set(row.curriculum_node_id, bucket);
  }

  const cardById = new Map(canonicalCards.map((row) => [row.id, row]));
  const questionById = new Map(externalQuestions.map((row) => [row.id, row]));
  const aliasMapByEntityId = new Map<string, string[]>();
  for (const row of sourceAliases.filter((alias) => alias.entity_type === "canonical_entity")) {
    const bucket = aliasMapByEntityId.get(row.entity_id) ?? [];
    bucket.push(row.alias_value);
    aliasMapByEntityId.set(row.entity_id, bucket);
  }

  const proposalsByNodeId = new Map<string, ProposalRow[]>();
  for (const proposal of proposals) {
    const nodeId =
      typeof proposal.metadata.source_curriculum_node_id === "string"
        ? proposal.metadata.source_curriculum_node_id
        : typeof proposal.metadata.curriculum_node_id === "string"
          ? proposal.metadata.curriculum_node_id
          : null;
    if (!nodeId || !nodeIds.has(nodeId)) continue;
    const bucket = proposalsByNodeId.get(nodeId) ?? [];
    bucket.push(proposal);
    proposalsByNodeId.set(nodeId, bucket);
  }

  const canonicalEntityCandidates: CanonicalEntityCandidate[] = (
    snapshot.canonicalEntities as CoverageCanonicalEntity[]
  )
    .filter((entity) => entity.is_active)
    .map((entity) => ({
      id: entity.id,
      label: entity.preferred_label,
      entityType: entity.entity_type,
      aliases: aliasMapByEntityId.get(entity.id) ?? [],
    }));

  const openai = args.dryRun
    ? null
    : new OpenAI({
        apiKey: loadOpenAIApiKey(loadEnvFile as (filePath: string) => Record<string, string>),
      });
  const candidateReviews: CandidateReview[] = [];

  for (const node of selectedNodes) {
    const nearbyEntities = buildNearbyEntityIndex(canonicalEntityCandidates, node.title);
    const nodeProposals = proposalsByNodeId.get(node.nodeId) ?? [];
    const deterministicPacket = buildDeterministicPacket(node, nodeProposals, nearbyEntities, aliasMapByEntityId);
    const representativeCardTitles = [...(cardIdsByNode.get(node.nodeId) ?? new Set<string>())]
      .map((cardId) => cardById.get(cardId)?.title?.trim())
      .filter((title): title is string => !!title)
      .slice(0, 5);
    const representativeQuestionTitles = [...(questionIdsByNode.get(node.nodeId) ?? new Set<string>())]
      .map((questionId) => {
        const question = questionById.get(questionId);
        return question?.topic_raw?.trim() || question?.topic_slug?.trim() || question?.external_question_id;
      })
      .filter((title): title is string => !!title)
      .slice(0, 5);

    const evidencePacket = buildEvidencePacket(
      node,
      deterministicPacket,
      nearbyEntities,
      representativeCardTitles,
      representativeQuestionTitles
    );
    const llmReview =
      openai === null ? buildDryRunReview(evidencePacket) : await reviewCandidate(openai, args.model, evidencePacket);
    const calibratedGate = applyCalibratedGate({
      title: node.title,
      llmReview,
      deterministicPacket,
      evidencePacket,
    });
    const safeForAutoApply = calibratedGate.passed;

    candidateReviews.push({
      nodeId: node.nodeId,
      slug: node.slug,
      title: node.title,
      specialty: node.specialty,
      curriculumPath: node.curriculumPath,
      bucket: node.bucket,
      deterministicBucketReason: node.reason,
      llmReview: {
        ...llmReview,
        safe_for_auto_apply: safeForAutoApply,
      },
      deterministicPacket,
      safeForAutoApply,
      llmApproved: llmReview.decision === "approve_create",
      evidencePacket,
      calibratedGate,
    });
  }

  candidateReviews.sort(
    (left, right) =>
      right.evidencePacket.total_affected_objects - left.evidencePacket.total_affected_objects ||
      compareNullableStrings(left.specialty, right.specialty) ||
      left.curriculumPath.localeCompare(right.curriculumPath)
  );

  const allowlistEntries: AllowlistEntry[] = candidateReviews
    .filter((review) => review.safeForAutoApply)
    .map((review) => ({
      nodeId: review.nodeId,
      slug: review.slug,
      title: review.title,
      specialty: review.specialty,
      proposedEntityLabel: review.llmReview.proposed_entity_label,
      proposedEntityType: review.llmReview.proposed_entity_type,
      llmConfidence: review.llmReview.confidence,
      deterministicConfidence: review.deterministicPacket.deterministicConfidence,
      calibratedThreshold: review.calibratedGate.threshold,
      calibratedTier: review.calibratedGate.tier,
      reason: review.llmReview.reason,
    }));

  const calibration = {
    llmApprovesButDeterministicBlocks: candidateReviews
      .filter((review) => review.llmApproved && !review.deterministicPacket.wouldAutoApprove)
      .map((review) => review.slug),
    deterministicSafeButLlmHolds: candidateReviews
      .filter((review) => !review.llmApproved && review.deterministicPacket.wouldAutoApprove)
      .map((review) => review.slug),
    bothApprove: candidateReviews
      .filter((review) => review.llmApproved && review.deterministicPacket.wouldAutoApprove)
      .map((review) => review.slug),
    bothHold: candidateReviews
      .filter((review) => !review.llmApproved && !review.deterministicPacket.wouldAutoApprove)
      .map((review) => review.slug),
  };

  const reviewJsonPath = path.join(args.outDir, "kg-blocked-node-llm-review.json");
  const reviewMarkdownPath = path.join(args.outDir, "kg-blocked-node-llm-review.md");
  const allowlistPath = path.join(args.outDir, "kg-blocked-node-cohort-allowlist.json");

  writeFileSync(
    reviewJsonPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        mode: args.dryRun ? "dry-run" : "review-only",
        llmExecuted: !args.dryRun,
        inputPath: args.inputPath,
        model: args.model,
        confidenceThreshold: args.confidenceThreshold,
        calibratedThresholds: {
          exact_specific: 0.6,
          alias_or_near: 0.7,
          weaker_evidence: 0.8,
        },
        cohortSizeRequested: args.cohortSize,
        specialtyFilter: args.specialty,
        reviewedCandidateCount: candidateReviews.length,
        calibration: {
          llmApprovesButDeterministicBlocks: calibration.llmApprovesButDeterministicBlocks.length,
          deterministicSafeButLlmHolds: calibration.deterministicSafeButLlmHolds.length,
          bothApprove: calibration.bothApprove.length,
          bothHold: calibration.bothHold.length,
          disagreements: calibration,
        },
        candidates: candidateReviews,
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  writeFileSync(
    allowlistPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        model: args.model,
        llmExecuted: !args.dryRun,
        confidenceThreshold: args.confidenceThreshold,
        calibratedThresholds: {
          exact_specific: 0.6,
          alias_or_near: 0.7,
          weaker_evidence: 0.8,
        },
        cohortSizeRequested: args.cohortSize,
        specialtyFilter: args.specialty,
        allowedNodeSlugs: allowlistEntries.map((entry) => entry.slug),
        entries: allowlistEntries,
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  const lines: string[] = [];
  lines.push("# KG Blocked Node LLM Review");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Mode: ${args.dryRun ? "dry-run" : "review-only"}`);
  lines.push(`Model: ${args.model}`);
  lines.push("Thresholds: exact_specific=0.60, alias_or_near=0.70, weaker_evidence=0.80");
  lines.push(`Candidates reviewed: ${candidateReviews.length}`);
  lines.push(`Allowlist candidates: ${allowlistEntries.length}`);
  lines.push("");
  lines.push("## Calibration");
  lines.push("");
  lines.push(`- LLM approves but deterministic blocks: ${calibration.llmApprovesButDeterministicBlocks.length}`);
  lines.push(`- Deterministic thinks safe but LLM holds: ${calibration.deterministicSafeButLlmHolds.length}`);
  lines.push(`- Both approve: ${calibration.bothApprove.length}`);
  lines.push(`- Both hold: ${calibration.bothHold.length}`);
  lines.push("");
  lines.push("## Candidate Review");
  lines.push("");
  lines.push("| Curriculum path | Specialty | Total | Deterministic | LLM decision | LLM confidence | Tier | Threshold | Auto-apply |");
  lines.push("|---|---|---:|---|---|---:|---|---:|---|");
  for (const review of candidateReviews) {
    lines.push(
      `| ${review.curriculumPath} | ${review.specialty ?? "n/a"} | ${review.evidencePacket.total_affected_objects} | ${review.deterministicPacket.wouldAutoApprove ? "safe" : "blocked"} | ${review.llmReview.decision} | ${review.llmReview.confidence.toFixed(2)} | ${review.calibratedGate.tier} | ${review.calibratedGate.threshold.toFixed(2)} | ${review.safeForAutoApply ? "yes" : "no"} |`
    );
  }
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  for (const review of candidateReviews) {
    const deterministicReason =
      review.deterministicPacket.reasons.length > 0
        ? review.deterministicPacket.reasons.join(" ")
        : "Deterministic gate passes.";
    lines.push(
      `- ${review.curriculumPath}: ${review.llmReview.decision} (${review.llmReview.confidence.toFixed(
        2
      )}). ${review.llmReview.reason} Deterministic gate: ${deterministicReason} Calibrated gate: ${
        review.calibratedGate.passed
          ? `passed at ${review.calibratedGate.threshold.toFixed(2)} (${review.calibratedGate.tier}).`
          : review.calibratedGate.reasons.join(" ")
      }`
    );
  }

  writeFileSync(reviewMarkdownPath, `${lines.join("\n")}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        reviewJsonPath,
        reviewMarkdownPath,
        allowlistPath,
        reviewedCandidateCount: candidateReviews.length,
        allowlistCount: allowlistEntries.length,
        calibration: {
          llmApprovesButDeterministicBlocks: calibration.llmApprovesButDeterministicBlocks.length,
          deterministicSafeButLlmHolds: calibration.deterministicSafeButLlmHolds.length,
          bothApprove: calibration.bothApprove.length,
          bothHold: calibration.bothHold.length,
        },
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
