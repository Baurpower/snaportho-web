import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const commonModulePromise = import(new URL("./kg-automation-common.ts", import.meta.url).href);

type ParsedArgs = {
  outDir: string;
};

type DebugRow = {
  curriculum_node_id: string;
  curriculum_node_path: string | null;
  curriculum_node_title: string;
  card_count: number;
  question_count: number;
  total_mappings: number;
  decision: string;
  decision_reason: string;
};

type ProposalRow = import("./kg-automation-common").ProposalRow;

const MANUAL_GENERIC_LABELS = new Set(["Material Properties"]);

function parseArgs(argv: string[]): ParsedArgs {
  let outDir = "reports";

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--out-dir") {
      outDir = argv[index + 1] ?? outDir;
      index += 1;
    }
  }

  return { outDir };
}

function uniqueSorted(values: Iterable<string>) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function toPercent(part: number, whole: number) {
  return `${((part / Math.max(1, whole)) * 100).toFixed(1)}%`;
}

function loadDebugRows(outDir: string) {
  const debugPath = path.join(outDir, "kg-automation-generation-debug.json");
  if (!existsSync(debugPath)) {
    return [] as DebugRow[];
  }

  const payload = JSON.parse(readFileSync(debugPath, "utf8")) as { rows?: DebugRow[] };
  return Array.isArray(payload.rows) ? payload.rows : [];
}

async function main() {
  const { createServiceRoleClient, ensureOutDir, fetchAllRows } = await commonModulePromise;
  const args = parseArgs(process.argv);
  ensureOutDir(args.outDir);
  const supabase = createServiceRoleClient();
  const fetchAll = fetchAllRows as <T>(
    buildQuery: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>
  ) => Promise<T[]>;

  const [
    legacyCardLinks,
    legacyQuestionLinks,
    canonicalCardLinks,
    canonicalQuestionLinks,
    curriculumNodes,
    bridgeRows,
    proposals,
  ] = await Promise.all([
    fetchAll<{
      id: string;
      canonical_card_id: string;
      curriculum_node_id: string | null;
      is_active: boolean;
    }>((from, to) =>
      supabase
        .from("card_knowledge_links")
        .select("id,canonical_card_id,curriculum_node_id,is_active")
        .eq("is_active", true)
        .range(from, to)
    ),
    fetchAll<{
      id: string;
      external_question_id: string;
      curriculum_node_id: string | null;
      is_active: boolean;
    }>((from, to) =>
      supabase
        .from("external_question_curriculum_mappings")
        .select("id,external_question_id,curriculum_node_id,is_active")
        .eq("is_active", true)
        .range(from, to)
    ),
    fetchAll<{
      canonical_card_id: string;
      source_curriculum_node_id: string | null;
      rollback_batch_key: string | null;
      is_active: boolean;
    }>((from, to) =>
      supabase
        .from("card_canonical_entity_links")
        .select("canonical_card_id,source_curriculum_node_id,rollback_batch_key,is_active")
        .eq("is_active", true)
        .range(from, to)
    ),
    fetchAll<{
      external_question_id: string;
      source_curriculum_node_id: string | null;
      rollback_batch_key: string | null;
      is_active: boolean;
    }>((from, to) =>
      supabase
        .from("question_canonical_entity_links")
        .select("external_question_id,source_curriculum_node_id,rollback_batch_key,is_active")
        .eq("is_active", true)
        .range(from, to)
    ),
    fetchAll<{
      id: string;
      title: string;
      slug: string;
    }>((from, to) =>
      supabase.from("curriculum_nodes").select("id,title,slug").range(from, to)
    ),
    fetchAll<{
      id: string;
      curriculum_node_id: string;
      canonical_entity_id: string | null;
      relation_type: string;
      review_status: string;
      is_active: boolean;
    }>((from, to) =>
      supabase
        .from("curriculum_node_entities")
        .select("id,curriculum_node_id,canonical_entity_id,relation_type,review_status,is_active")
        .eq("is_active", true)
        .eq("review_status", "approved")
        .eq("relation_type", "primary_coverage")
        .range(from, to)
    ),
    fetchAll<ProposalRow>((from, to) =>
      supabase
        .from("kg_automation_proposals")
        .select("*")
        .eq("is_active", true)
        .range(from, to)
    ),
  ]);

  const debugRows = loadDebugRows(args.outDir);
  const debugByNodeId = new Map(debugRows.map((row) => [row.curriculum_node_id, row]));
  const nodeById = new Map(curriculumNodes.map((row) => [row.id, row]));
  const bridgeByNodeId = new Map(
    bridgeRows
      .filter((row) => row.canonical_entity_id)
      .map((row) => [row.curriculum_node_id, row])
  );

  const legacyCardIdsByNode = new Map<string, Set<string>>();
  const legacyQuestionIdsByNode = new Map<string, Set<string>>();
  for (const row of legacyCardLinks) {
    if (!row.curriculum_node_id) continue;
    const bucket = legacyCardIdsByNode.get(row.curriculum_node_id) ?? new Set<string>();
    bucket.add(row.canonical_card_id);
    legacyCardIdsByNode.set(row.curriculum_node_id, bucket);
  }
  for (const row of legacyQuestionLinks) {
    if (!row.curriculum_node_id) continue;
    const bucket = legacyQuestionIdsByNode.get(row.curriculum_node_id) ?? new Set<string>();
    bucket.add(row.external_question_id);
    legacyQuestionIdsByNode.set(row.curriculum_node_id, bucket);
  }

  const canonicalCardIdsByNode = new Map<string, Set<string>>();
  const canonicalQuestionIdsByNode = new Map<string, Set<string>>();
  for (const row of canonicalCardLinks) {
    if (!row.source_curriculum_node_id) continue;
    const bucket = canonicalCardIdsByNode.get(row.source_curriculum_node_id) ?? new Set<string>();
    bucket.add(row.canonical_card_id);
    canonicalCardIdsByNode.set(row.source_curriculum_node_id, bucket);
  }
  for (const row of canonicalQuestionLinks) {
    if (!row.source_curriculum_node_id) continue;
    const bucket = canonicalQuestionIdsByNode.get(row.source_curriculum_node_id) ?? new Set<string>();
    bucket.add(row.external_question_id);
    canonicalQuestionIdsByNode.set(row.source_curriculum_node_id, bucket);
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

  const legacyNodeIds = uniqueSorted([
    ...legacyCardIdsByNode.keys(),
    ...legacyQuestionIdsByNode.keys(),
  ]);

  const fullyRetargeted: Array<{
    nodeId: string;
    label: string;
    slug: string;
    cardCount: number;
    questionCount: number;
  }> = [];
  const blockedNodes: Array<{
    nodeId: string;
    label: string;
    slug: string;
    path: string;
    bucket: string;
    reason: string;
    legacyCardCount: number;
    legacyQuestionCount: number;
  }> = [];

  for (const nodeId of legacyNodeIds) {
    const node = nodeById.get(nodeId);
    const debug = debugByNodeId.get(nodeId);
    const nodeProposals = proposalsByNodeId.get(nodeId) ?? [];
    const legacyCardCount = legacyCardIdsByNode.get(nodeId)?.size ?? 0;
    const legacyQuestionCount = legacyQuestionIdsByNode.get(nodeId)?.size ?? 0;
    const canonicalCardCount = canonicalCardIdsByNode.get(nodeId)?.size ?? 0;
    const canonicalQuestionCount = canonicalQuestionIdsByNode.get(nodeId)?.size ?? 0;
    const hasApprovedBridge = bridgeByNodeId.has(nodeId);

    const fullyCardRetargeted = legacyCardCount === 0 || canonicalCardCount >= legacyCardCount;
    const fullyQuestionRetargeted = legacyQuestionCount === 0 || canonicalQuestionCount >= legacyQuestionCount;

    if (hasApprovedBridge && fullyCardRetargeted && fullyQuestionRetargeted) {
      fullyRetargeted.push({
        nodeId,
        label: node?.title ?? debug?.curriculum_node_title ?? nodeId,
        slug: node?.slug ?? "unknown",
        cardCount: legacyCardCount,
        questionCount: legacyQuestionCount,
      });
      continue;
    }

    if (legacyCardCount === 0 && legacyQuestionCount === 0) {
      blockedNodes.push({
        nodeId,
        label: node?.title ?? debug?.curriculum_node_title ?? nodeId,
        slug: node?.slug ?? "unknown",
        path: debug?.curriculum_node_path ?? node?.title ?? nodeId,
        bucket: "blocked because no legacy card/question mappings exist",
        reason: "No active legacy card or question mappings exist for this curriculum node.",
        legacyCardCount,
        legacyQuestionCount,
      });
      continue;
    }

    const splitProposal = nodeProposals.find((proposal) => proposal.proposal_type.startsWith("flag_"));
    const createProposal = nodeProposals.find((proposal) => proposal.proposal_type === "create_canonical_entity");
    const debugDecision = debug?.decision ?? null;
    let bucket = "blocked because no canonical entity exists yet";
    let reason =
      debug?.decision_reason ??
      "No approved primary_coverage bridge and no safe additive retarget path were available in this pass.";

    if (splitProposal || debugDecision === "ambiguous_mapping") {
      bucket = "blocked because node is ambiguous/split-risk";
      reason = splitProposal
        ? `Automation raised ${splitProposal.proposal_type}; this node stays manual until the split risk is resolved.`
        : debug?.decision_reason ?? "Multiple strong canonical targets kept this node ambiguous.";
    } else if (debugDecision === "suppressed_create" || MANUAL_GENERIC_LABELS.has(node?.title ?? "")) {
      bucket = "blocked because label is too generic";
      reason = debug?.decision_reason ?? "The node label is too generic to auto-create safely.";
    } else if (createProposal && createProposal.confidence_tier === "low") {
      bucket = "blocked because no canonical entity exists yet";
      reason = `Only a low-confidence create_canonical_entity proposal exists (${createProposal.confidence.toFixed(3)}); manual canonical modeling is still required.`;
    } else if (createProposal) {
      bucket = "blocked because no canonical entity exists yet";
      reason = `A create_canonical_entity proposal exists (${createProposal.confidence.toFixed(3)}), but it was intentionally not auto-applied under the current guardrails.`;
    }

    blockedNodes.push({
      nodeId,
      label: node?.title ?? debug?.curriculum_node_title ?? nodeId,
      slug: node?.slug ?? "unknown",
      path: debug?.curriculum_node_path ?? node?.title ?? nodeId,
      bucket,
      reason,
      legacyCardCount,
      legacyQuestionCount,
    });
  }

  fullyRetargeted.sort((left, right) => left.label.localeCompare(right.label));
  blockedNodes.sort(
    (left, right) =>
      right.legacyCardCount + right.legacyQuestionCount - (left.legacyCardCount + left.legacyQuestionCount) ||
      left.label.localeCompare(right.label)
  );

  const rollbackBatchKeys = uniqueSorted([
    ...canonicalCardLinks.map((row) => row.rollback_batch_key).filter((value): value is string => Boolean(value)),
    ...canonicalQuestionLinks
      .map((row) => row.rollback_batch_key)
      .filter((value): value is string => Boolean(value)),
  ]);

  const totalLegacyCardMappings = legacyCardLinks.length;
  const totalLegacyQuestionMappings = legacyQuestionLinks.length;
  const canonicalRetargetedCardMappings = canonicalCardLinks.length;
  const canonicalRetargetedQuestionMappings = canonicalQuestionLinks.length;

  const blockedByBucket = new Map<string, number>();
  for (const row of blockedNodes) {
    blockedByBucket.set(row.bucket, (blockedByBucket.get(row.bucket) ?? 0) + 1);
  }

  const lines: string[] = [];
  lines.push("# Legacy Retargeting Completion Report");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Total legacy card mappings: ${totalLegacyCardMappings}`);
  lines.push(`- Total legacy question mappings: ${totalLegacyQuestionMappings}`);
  lines.push(`- Canonical-retargeted card mappings: ${canonicalRetargetedCardMappings} (${toPercent(canonicalRetargetedCardMappings, totalLegacyCardMappings)})`);
  lines.push(`- Canonical-retargeted question mappings: ${canonicalRetargetedQuestionMappings} (${toPercent(canonicalRetargetedQuestionMappings, totalLegacyQuestionMappings)})`);
  lines.push(`- Fully retargeted legacy curriculum nodes: ${fullyRetargeted.length}`);
  lines.push(`- Remaining blocked legacy curriculum nodes: ${blockedNodes.length}`);
  lines.push(`- Legacy card_knowledge_links unchanged: ${legacyCardLinks.length}`);
  lines.push(`- Legacy external_question_curriculum_mappings unchanged: ${legacyQuestionLinks.length}`);
  lines.push("");
  lines.push("## Bucket Summary");
  lines.push("");
  if (blockedByBucket.size === 0) {
    lines.push("- No blocked legacy curriculum nodes remain.");
  } else {
    for (const [bucket, count] of [...blockedByBucket.entries()].sort((left, right) => right[1] - left[1])) {
      lines.push(`- ${bucket}: ${count}`);
    }
  }
  lines.push("");
  lines.push("## Fully Retargeted Nodes");
  lines.push("");
  lines.push("| Curriculum node | Slug | Legacy card mappings | Legacy question mappings |");
  lines.push("|---|---|---:|---:|");
  for (const row of fullyRetargeted) {
    lines.push(`| ${row.label} | ${row.slug} | ${row.cardCount} | ${row.questionCount} |`);
  }
  lines.push("");
  lines.push("## Remaining Blocked Nodes");
  lines.push("");
  lines.push("| Curriculum node | Bucket | Legacy card mappings | Legacy question mappings | Reason |");
  lines.push("|---|---|---:|---:|---|");
  for (const row of blockedNodes) {
    lines.push(
      `| ${row.path} | ${row.bucket} | ${row.legacyCardCount} | ${row.legacyQuestionCount} | ${row.reason.replace(/\|/g, "\\|")} |`
    );
  }
  lines.push("");
  lines.push("## Rollback Batch Keys");
  lines.push("");
  for (const key of rollbackBatchKeys) {
    lines.push(`- \`${key}\``);
  }
  lines.push("");
  lines.push("## Recommendation");
  lines.push("");
  if (
    canonicalRetargetedCardMappings / Math.max(1, totalLegacyCardMappings) >= 0.95 &&
    canonicalRetargetedQuestionMappings / Math.max(1, totalLegacyQuestionMappings) >= 0.95 &&
    blockedNodes.length === 0
  ) {
    lines.push(
      "- Legacy read paths are close to deprecation-ready. Keep a short shadow-read window, compare canonical vs legacy responses in BroBot and Student Workspace, then retire the old path once parity remains stable."
    );
  } else {
    lines.push(
      "- Do not deprecate BroBot or Student Workspace legacy read paths yet. Current additive migration reaches only partial row parity, and blocked curriculum nodes still need manual canonical modeling or packet review. Revisit deprecation once card and question migration both exceed 95% and blocked high-traffic nodes are resolved."
    );
  }

  const outputPath = path.join(args.outDir, "legacy-retargeting-completion-report.md");
  writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        outputPath,
        totalLegacyCardMappings,
        totalLegacyQuestionMappings,
        canonicalRetargetedCardMappings,
        canonicalRetargetedQuestionMappings,
        fullyRetargetedNodeCount: fullyRetargeted.length,
        blockedNodeCount: blockedNodes.length,
        rollbackBatchKeyCount: rollbackBatchKeys.length,
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
