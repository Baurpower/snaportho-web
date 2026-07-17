import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import type { ProposalRecord, ProposalReviewStatus } from "./kg-automation-common.ts";
import { resolveTopic } from "./lib/education/kg-compiler/topic-registry.ts";
import type { MergedNeighborhoodDraft } from "./lib/education/kg-compiler/types.ts";
import {
  applyPostReviewInput,
  readMergedNeighborhoodDraft,
  relationshipKey,
} from "./lib/education/kg-finalization/post-review-input.ts";
import {
  CANONICAL_ENTITY_TYPES,
  validateRelationshipTriple,
} from "./lib/education/kg-relationship-registry.ts";

export const FINALIZED_STAGING_ADAPTER_VERSION = "cts-finalized-staging-v1";

export type ReviewDecision = {
  proposal_fingerprint: string;
  decision: "APPROVE" | "APPROVE_WITH_REVISION" | "REJECT" | string;
  reviewer?: string;
  reviewer_id?: string;
  reason?: string;
  applied?: boolean;
};

type AutoReviewDecision = {
  proposal_fingerprint: string;
  category: string;
  curationRoute?: string;
  rationale?: string[];
};

type AdapterOptions = {
  topic: string;
  baseDraft: string;
  postReviewInput: string;
  reviewDecisions: string;
  autoReview?: string;
  outputDir: string;
  batchKey?: string;
};

function parseArgs(argv: string[]): AdapterOptions {
  const values = new Map<string, string>();
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith("--") && argv[index + 1] && !argv[index + 1].startsWith("--")) {
      values.set(arg, argv[index + 1]);
      index += 1;
    }
  }
  const topic = values.get("--topic") ?? "";
  const ctsRoot = path.join("reports", "kg-verticals", "carpal-tunnel-syndrome");
  const isCts = topic === "carpal-tunnel-syndrome-neighborhood";
  const baseDraft = values.get("--base-draft") ?? values.get("--input-dir") ?? (isCts
    ? path.join(ctsRoot, "dry-run-manufacture", "carpal-tunnel-syndrome", "merged-neighborhood-draft.json")
    : "");
  const postReviewInput = values.get("--post-review-input") ?? (isCts
    ? path.join(ctsRoot, "final-readiness", "normalized-post-review-input.json")
    : "");
  const reviewDecisions = values.get("--review-decisions") ?? (isCts
    ? path.join(ctsRoot, "dry-run-manufacture", "cts-final-review-decisions.json")
    : "");
  const outputDir = values.get("--output-dir") ?? path.join("reports", "kg-staging");
  if (!topic || !baseDraft || !postReviewInput || !reviewDecisions) {
    throw new Error("Usage: --topic <key> --base-draft <file-or-dir> --post-review-input <json> --review-decisions <json> [--auto-review <json>] [--output-dir <dir>] [--batch-key <key>]");
  }
  return {
    topic,
    baseDraft,
    postReviewInput,
    reviewDecisions,
    autoReview: values.get("--auto-review"),
    outputDir,
    batchKey: values.get("--batch-key"),
  };
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashFile(filePath: string): string {
  return sha256(readFileSync(filePath));
}

function gitState() {
  try {
    return {
      commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
      dirty: execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim().length > 0,
    };
  } catch {
    return { commit: "unknown", dirty: true };
  }
}

function immutableWrite(filePath: string, value: unknown): void {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  if (existsSync(filePath)) {
    if (readFileSync(filePath, "utf8") !== content) throw new Error(`Refusing to overwrite immutable artifact: ${filePath}`);
    return;
  }
  writeFileSync(filePath, content, { flag: "wx" });
}

function proposalBase(pilotKey: string, batchKey: string, partial: Partial<ProposalRecord>): ProposalRecord {
  const { metadata, ...rest } = partial;
  return {
    proposal_fingerprint: "unknown",
    proposal_type: "create_canonical_entity",
    source_signal_type: "reference_import",
    source_signal_ids: [],
    specialty_id: null,
    proposed_entity_type: null,
    proposed_entity_label: null,
    proposed_existing_entity_id: null,
    proposed_subject_entity_id: null,
    proposed_predicate: null,
    proposed_object_entity_id: null,
    proposed_alias: null,
    proposed_bridge_type: null,
    confidence: 0.85,
    confidence_tier: "high",
    confidence_reason: FINALIZED_STAGING_ADAPTER_VERSION,
    evidence_summary: "Finalized post-review CTS graph",
    supporting_card_count: 0,
    supporting_question_count: 0,
    supporting_curriculum_node_count: 1,
    supporting_source_count: 3,
    conflict_count: 0,
    review_status: "needs_review",
    reviewed_by: null,
    reviewed_at: null,
    reviewer_notes: null,
    applied_at: null,
    superseded_by: null,
    comments: null,
    is_active: true,
    ...rest,
    metadata: {
      pilot: pilotKey,
      staging_batch_key: batchKey,
      review_packet_key: `pilot:${pilotKey}`,
      review_packet_label: "Carpal Tunnel Syndrome Finalized Neighborhood",
      factory_version: "kf-016",
      adapter_version: FINALIZED_STAGING_ADAPTER_VERSION,
      ...(metadata ?? {}),
    },
  };
}

function reviewMetadata(decision?: ReviewDecision, auto?: AutoReviewDecision): Record<string, unknown> {
  return {
    review_decision: decision?.decision ?? null,
    reviewer_role_label: decision?.reviewer ?? null,
    review_reason: decision?.reason ?? null,
    review_decision_applied: decision?.applied ?? null,
    auto_review_category: auto?.category ?? null,
    auto_review_route: auto?.curationRoute ?? null,
    auto_review_rationale: auto?.rationale ?? [],
  };
}

function statusFor(fingerprint: string, decisions: Map<string, ReviewDecision>, auto: Map<string, AutoReviewDecision>): ProposalReviewStatus | "absent" {
  const decision = decisions.get(fingerprint);
  if (decision?.decision === "REJECT") return "absent";
  if (decision?.decision === "APPROVE" || decision?.decision === "APPROVE_WITH_REVISION") return "approved";
  if (auto.get(fingerprint)?.category === "AUTO_APPROVE") return "approved";
  return "needs_review";
}

export function buildFinalizedProposalPacket(input: {
  graph: MergedNeighborhoodDraft;
  pilotKey: string;
  batchKey: string;
  curriculumNodeSlug: string;
  primaryEntitySlug: string;
  decisions: ReviewDecision[];
  autoReviewDecisions: AutoReviewDecision[];
}): { proposals: ProposalRecord[]; errors: string[]; rejected: string[] } {
  const decisions = new Map(input.decisions.map((item) => [item.proposal_fingerprint, item]));
  const auto = new Map(input.autoReviewDecisions.map((item) => [item.proposal_fingerprint, item]));
  const bySlug = new Map(input.graph.entities.map((entity) => [entity.slug, entity]));
  const proposals: ProposalRecord[] = [];
  const errors: string[] = [];
  const rejected = input.decisions.filter((item) => item.decision === "REJECT").map((item) => item.proposal_fingerprint).sort();

  for (const entity of [...input.graph.entities].sort((a, b) => a.slug.localeCompare(b.slug))) {
    const fingerprint = `create|${entity.entityType}|${entity.slug}`.toLowerCase();
    if (!CANONICAL_ENTITY_TYPES.includes(entity.entityType as never)) {
      errors.push(`Unsupported entity type ${entity.entityType} for ${entity.slug}`);
      continue;
    }
    const status = statusFor(fingerprint, decisions, auto);
    if (status === "absent") continue;
    proposals.push(proposalBase(input.pilotKey, input.batchKey, {
      proposal_fingerprint: fingerprint,
      proposal_type: "create_canonical_entity",
      proposed_entity_type: String(entity.entityType),
      proposed_entity_label: entity.preferredLabel,
      review_status: status,
      source_signal_ids: [input.curriculumNodeSlug],
      metadata: { slug: entity.slug, description: entity.description, ...entity.metadata, ...reviewMetadata(decisions.get(fingerprint), auto.get(fingerprint)) },
    }));
  }

  for (const relationship of [...input.graph.relationships].sort((a, b) => relationshipKey(a).localeCompare(relationshipKey(b)))) {
    const fingerprint = `rel|${relationshipKey(relationship)}`.toLowerCase();
    const subject = bySlug.get(relationship.subjectSlug);
    const object = bySlug.get(relationship.objectSlug);
    if (!subject || !object) {
      errors.push(`Missing endpoint for ${fingerprint}`);
      continue;
    }
    const validation = validateRelationshipTriple({
      subjectEndpointType: "canonical_entity",
      subjectEntityType: String(subject.entityType),
      predicate: relationship.predicate,
      objectEndpointType: "canonical_entity",
      objectEntityType: String(object.entityType),
    });
    if (!validation.valid) {
      errors.push(`${fingerprint}: ${validation.errors.join("; ")}`);
      continue;
    }
    const status = statusFor(fingerprint, decisions, auto);
    if (status === "absent") continue;
    proposals.push(proposalBase(input.pilotKey, input.batchKey, {
      proposal_fingerprint: fingerprint,
      proposal_type: "add_canonical_relationship",
      proposed_predicate: relationship.predicate,
      review_status: status,
      metadata: {
        subject_slug: relationship.subjectSlug,
        subject_entity_type: subject.entityType,
        object_slug: relationship.objectSlug,
        object_entity_type: object.entityType,
        relationship_metadata: relationship.metadata ?? {},
        ...reviewMetadata(decisions.get(fingerprint), auto.get(fingerprint)),
      },
    }));
  }

  // Claims and decision points remain in the finalized artifact and review ledger,
  // but this packet is scoped to object types supported by the canonical graph apply.

  const bridgeFingerprint = `bridge|${input.curriculumNodeSlug}|${input.primaryEntitySlug}`.toLowerCase();
  const bridgeStatus = statusFor(bridgeFingerprint, decisions, auto);
  if (bridgeStatus !== "absent") proposals.push(proposalBase(input.pilotKey, input.batchKey, {
    proposal_fingerprint: bridgeFingerprint,
    proposal_type: "link_curriculum_node_to_entity",
    proposed_bridge_type: "primary_coverage",
    review_status: bridgeStatus,
    confidence: 0.95,
    source_signal_type: "curriculum_node",
    source_signal_ids: [input.curriculumNodeSlug],
    metadata: { curriculum_node_slug: input.curriculumNodeSlug, primary_entity_slug: input.primaryEntitySlug, ...reviewMetadata(decisions.get(bridgeFingerprint), auto.get(bridgeFingerprint)) },
  }));

  const fingerprints = proposals.map((proposal) => proposal.proposal_fingerprint);
  if (new Set(fingerprints).size !== fingerprints.length) errors.push("Duplicate proposal fingerprints generated");
  return { proposals, errors, rejected };
}

async function main() {
  const options = parseArgs(process.argv);
  const topic = resolveTopic(options.topic);
  if (!topic) throw new Error(`Unknown topic: ${options.topic}`);
  const baseDraft = await readMergedNeighborhoodDraft(options.baseDraft);
  const overlay = JSON.parse(readFileSync(options.postReviewInput, "utf8")) as Record<string, unknown>;
  const graph = await applyPostReviewInput(baseDraft, overlay, options.postReviewInput);
  const decisions = JSON.parse(readFileSync(options.reviewDecisions, "utf8")) as ReviewDecision[];
  const inferredAutoReview = path.join(path.dirname(options.baseDraft.endsWith(".json") ? options.baseDraft : path.join(options.baseDraft, "x")), "ontology-auto-review.json");
  const autoReviewPath = options.autoReview ?? (existsSync(inferredAutoReview) ? inferredAutoReview : "");
  const autoReviewPayload = autoReviewPath ? JSON.parse(readFileSync(autoReviewPath, "utf8")) as { decisions?: AutoReviewDecision[] } : {};
  const semanticGraphHash = sha256(stable({ topic: options.topic, graph, decisions, autoReview: autoReviewPayload.decisions ?? [] }));
  const batchKey = options.batchKey ?? `cts-${semanticGraphHash.slice(0, 16)}`;
  const built = buildFinalizedProposalPacket({
    graph,
    pilotKey: topic.pilotKey,
    batchKey,
    curriculumNodeSlug: topic.sources.curriculumNodeSlug,
    primaryEntitySlug: topic.primaryEntitySlug,
    decisions,
    autoReviewDecisions: autoReviewPayload.decisions ?? [],
  });
  if (built.errors.length > 0) throw new Error(`Staging packet validation failed:\n${built.errors.join("\n")}`);
  const packetSemantic = { topic: options.topic, pilotKey: topic.pilotKey, batchKey, proposals: built.proposals };
  const packetHash = sha256(stable(packetSemantic));
  const outputTopicDir = options.topic === "carpal-tunnel-syndrome-neighborhood"
    ? "carpal-tunnel-syndrome"
    : options.topic;
  const outputDir = path.resolve(options.outputDir, outputTopicDir, batchKey);
  mkdirSync(outputDir, { recursive: true });
  const sourcePaths = [options.baseDraft, options.postReviewInput, options.reviewDecisions, ...(autoReviewPath ? [autoReviewPath] : [])]
    .map((item) => path.resolve(item.endsWith(".json") ? item : path.join(item, "merged-neighborhood-draft.json")));
  const manifest = {
    topic: options.topic,
    pilotKey: topic.pilotKey,
    batchKey,
    adapterVersion: FINALIZED_STAGING_ADAPTER_VERSION,
    git: gitState(),
    sourceArtifacts: sourcePaths.map((filePath) => ({ path: filePath, sha256: hashFile(filePath) })),
    entities: graph.entities.map((entity) => ({ fingerprint: `create|${entity.entityType}|${entity.slug}`.toLowerCase(), slug: entity.slug })).sort((a, b) => a.fingerprint.localeCompare(b.fingerprint)),
    relationships: graph.relationships.map((rel) => ({ fingerprint: `rel|${relationshipKey(rel)}`.toLowerCase(), triple: relationshipKey(rel) })).sort((a, b) => a.fingerprint.localeCompare(b.fingerprint)),
    proposalCounts: Object.entries(Object.groupBy(built.proposals, (proposal) => `${proposal.proposal_type}:${proposal.review_status}`)).map(([key, items]) => ({ key, count: items?.length ?? 0 })).sort((a, b) => a.key.localeCompare(b.key)),
    omittedOrRejected: built.rejected,
    semanticGraphHash,
    packetHash,
  };
  const packet = { ...packetSemantic, packetHash };
  const report = {
    ok: true,
    topic: options.topic,
    pilotKey: topic.pilotKey,
    batchKey,
    counts: { entities: graph.entities.length, relationships: graph.relationships.length, claims: graph.claims.length, decisionPoints: graph.decisionPoints.length, reviewDecisions: decisions.length, proposals: built.proposals.length },
    packetHash,
    rejected: built.rejected,
    claimsAndDecisionPoints: "retained_in_finalized_graph_excluded_from_canonical_apply_packet",
  };
  immutableWrite(path.join(outputDir, "finalized-graph.json"), graph);
  immutableWrite(path.join(outputDir, "proposal-packet.json"), packet);
  immutableWrite(path.join(outputDir, "proposal-manifest.json"), manifest);
  immutableWrite(path.join(outputDir, "transform-report.json"), report);
  console.log(JSON.stringify({ ...report, outputDir }, null, 2));
}

if (process.argv[1]?.endsWith("build-finalized-kg-staging-packet.ts")) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}
