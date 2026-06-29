import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const commonModulePromise = import(new URL("./kg-automation-common.ts", import.meta.url).href);

type ParsedArgs = {
  outDir: string;
  cohortSize: number;
  apply: boolean;
  dryRun: boolean;
  allowlistPath: string | null;
};

type PrioritizedNode = {
  nodeId: string;
  slug: string;
  title: string;
  bucket: string;
};

type ProposalRow = import("./kg-automation-common").ProposalRow;

type AllowlistEntry = {
  nodeId?: string;
  slug?: string;
  title?: string;
  specialty?: string | null;
  proposedEntityLabel?: string;
  proposedEntityType?: string;
  llmConfidence?: number;
  deterministicConfidence?: number | null;
  reason?: string;
};

type AllowlistArtifact = {
  allowedNodeSlugs?: string[];
  entries?: AllowlistEntry[];
};

type ReviewCandidate = {
  nodeId: string;
  slug: string;
  title: string;
  llmReview: {
    decision: string;
    proposed_entity_label: string;
    proposed_entity_type: string;
    confidence: number;
    safe_for_auto_apply: boolean;
  };
  deterministicPacket: {
    proposal: ProposalRow | null;
    exactOneCreateProposal: boolean;
    packetSizeIsOne: boolean;
    noSplitRisk: boolean;
    noGenericRisk: boolean;
    noExistingEntityConflict: boolean;
    allowedEntityType: boolean;
    normalizedLabelMatches: boolean;
    affectedObjectCountNonzero: boolean;
    reasons: string[];
    wouldAutoApprove: boolean;
  };
  safeForAutoApply: boolean;
  calibratedGate?: {
    passed: boolean;
    reasons: string[];
  };
};

type ReviewArtifact = {
  candidates?: ReviewCandidate[];
};

type ApprovalMode = "auto" | "allowlist";

type PacketDiagnostic = {
  packetKey: string;
  nodeSlug: string | null;
  nodeTitle: string | null;
  proposalType: string;
  mode: ApprovalMode;
  selectedByAllowlist: boolean;
  passedHardSafety: boolean;
  hardSafetyFailureReasons: string[];
  failedAutoOnlyHeuristic: boolean;
  autoOnlyFailureReasons: string[];
  approved: boolean;
  skippedReason: string | null;
};

type CohortSelectionDiagnostics = {
  allowlistCount: number | null;
  selectedFromAllowlist: string[];
  missingFromPrioritization: string[];
  missingReviewArtifact: string[];
  failedHardSafety: Array<{ nodeSlug: string | null; reasons: string[] }>;
  passedHardSafety: string[];
  appliedOrPlannedNodes: string[];
  skippedWithReasons: Array<{ nodeSlug: string | null; reasons: string[] }>;
};

function parseArgs(argv: string[]): ParsedArgs {
  let outDir = "reports";
  let cohortSize = 50;
  let allowlistPath: string | null = null;

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--out-dir") {
      outDir = argv[index + 1] ?? outDir;
      index += 1;
    } else if (arg === "--cohort-size") {
      const parsed = Number(argv[index + 1] ?? "50");
      cohortSize = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : cohortSize;
      index += 1;
    } else if (arg === "--allowlist") {
      allowlistPath = argv[index + 1] ?? allowlistPath;
      index += 1;
    }
  }

  return {
    outDir,
    cohortSize,
    apply: argv.includes("--apply"),
    dryRun: argv.includes("--dry-run"),
    allowlistPath,
  };
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

function extractJson(output: string) {
  const start = output.lastIndexOf("\n{");
  const jsonText = (start >= 0 ? output.slice(start + 1) : output.slice(output.indexOf("{"))).trim();
  return JSON.parse(jsonText);
}

function normalizeLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['".,()/:-]/g, " ")
    .replace(/\s+/g, " ");
}

function readAllowlistArtifact(filePath: string): AllowlistArtifact {
  return JSON.parse(readFileSync(filePath, "utf8")) as AllowlistArtifact;
}

function allowlistNodeSlugs(allowlist: AllowlistArtifact): Set<string> {
  const fromEntries = (allowlist.entries ?? [])
    .map((entry) => entry.slug)
    .filter((slug): slug is string => Boolean(slug));
  const fromSlugList = allowlist.allowedNodeSlugs ?? [];
  return new Set([...fromEntries, ...fromSlugList]);
}

/**
 * Multiple review-artifact pipelines can coexist under reports/ (the legacy
 * review-kg-blocked-node-cohort-with-llm.ts output and the newer
 * build-kg-ontology-with-llm.ts output). Picking "whichever file exists first"
 * silently joins an allowlist against the wrong review pass when both are
 * present, producing spurious "LLM decision is not approve_create" failures
 * for nodes the loaded artifact never actually reviewed. Instead, load every
 * candidate path and pick the first one whose candidate set is a superset of
 * the allowlist's node slugs.
 */
function readReviewArtifactForAllowlist(
  allowlistPath: string,
  allowlist: AllowlistArtifact
): ReviewArtifact | null {
  const reviewCandidates = [
    path.join(path.dirname(allowlistPath), "kg-blocked-node-llm-review.json"),
    path.join(path.dirname(allowlistPath), "kg-ontology-builder-review.json"),
  ];
  const requiredSlugs = allowlistNodeSlugs(allowlist);
  let firstParseable: ReviewArtifact | null = null;

  for (const reviewPath of reviewCandidates) {
    let artifact: ReviewArtifact;
    try {
      artifact = JSON.parse(readFileSync(reviewPath, "utf8")) as ReviewArtifact;
    } catch {
      continue;
    }
    firstParseable ??= artifact;

    if (requiredSlugs.size === 0) {
      return artifact;
    }
    const candidateSlugs = new Set((artifact.candidates ?? []).map((c) => c.slug));
    const coversAllowlist = [...requiredSlugs].every((slug) => candidateSlugs.has(slug));
    if (coversAllowlist) {
      return artifact;
    }
  }

  // No candidate file fully covers the allowlist; fall back to the first
  // parseable artifact rather than failing outright, but this case should be
  // investigated — it means the allowlist and review artifacts are out of sync.
  return firstParseable;
}

function proposalPacketKey(proposal: ProposalRow) {
  return String(proposal.metadata.review_packet_key ?? proposal.proposal_fingerprint);
}

function proposalNodeSlug(proposal: ProposalRow, cohortNodes: PrioritizedNode[]) {
  if (typeof proposal.metadata.source_curriculum_node_slug === "string") {
    return proposal.metadata.source_curriculum_node_slug;
  }
  if (typeof proposal.metadata.curriculum_node_id === "string") {
    return cohortNodes.find((node) => node.nodeId === proposal.metadata.curriculum_node_id)?.slug ?? null;
  }
  return null;
}

function proposalNodeTitle(proposal: ProposalRow, cohortNodes: PrioritizedNode[]) {
  if (typeof proposal.metadata.curriculum_node_title === "string") {
    return proposal.metadata.curriculum_node_title;
  }
  if (typeof proposal.metadata.curriculum_node_id === "string") {
    return cohortNodes.find((node) => node.nodeId === proposal.metadata.curriculum_node_id)?.title ?? null;
  }
  return null;
}

async function main() {
  const { ACTIVE_PROPOSAL_REVIEW_STATUSES, createServiceRoleClient, fetchAllRows, ensureOutDir } =
    await commonModulePromise;
  const args = parseArgs(process.argv);
  ensureOutDir(args.outDir);
  const supabase = createServiceRoleClient();
  const fetchAll = fetchAllRows as <T>(
    buildQuery: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>
  ) => Promise<T[]>;

  async function count(table: string) {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true }).eq("is_active", true);
    if (error) throw error;
    return count ?? 0;
  }

  async function snapshotCounts() {
    const [canonicalEntities, bridgedNodesRaw, canonicalCardLinks, canonicalQuestionLinks] = await Promise.all([
      count("canonical_entities"),
      fetchAll<{ curriculum_node_id: string }>((from, to) =>
        supabase
          .from("curriculum_node_entities")
          .select("curriculum_node_id")
          .eq("is_active", true)
          .eq("review_status", "approved")
          .eq("relation_type", "primary_coverage")
          .range(from, to)
      ),
      count("card_canonical_entity_links"),
      count("question_canonical_entity_links"),
    ]);
    return {
      canonicalEntities,
      bridgedCurriculumNodes: new Set(bridgedNodesRaw.map((row) => row.curriculum_node_id)).size,
      canonicalCardLinks,
      canonicalQuestionLinks,
    };
  }

  async function loadActiveProposals() {
    return fetchAll<ProposalRow>((from, to) =>
      supabase
        .from("kg_automation_proposals")
        .select("*")
        .eq("is_active", true)
        .in("review_status", ACTIVE_PROPOSAL_REVIEW_STATUSES)
        .range(from, to)
    );
  }

  const before = await snapshotCounts();
  const baselineRetarget = extractJson(runCommand("npm", ["run", "kg:retarget:report"]));

  runCommand("npm", ["run", "kg:automation:generate", "--", "--limit", String(args.cohortSize)]);
  const prioritization = extractJson(
    runCommand("npm", ["run", "kg:blocked:prioritize", "--", "--limit", String(args.cohortSize)])
  );
  const prioritizationJson = JSON.parse(
    readFileSync(path.join(args.outDir, "kg-blocked-node-prioritization.json"), "utf8")
  ) as {
    topNodes: PrioritizedNode[];
  };

  const safeCreateNodes = prioritizationJson.topNodes.filter(
    (node) => node.bucket === "safe exact entity-create candidates"
  );
  const prioritizedNodesBySlug = new Map(prioritizationJson.topNodes.map((node) => [node.slug, node]));

  const allowlistArtifact = args.allowlistPath ? readAllowlistArtifact(args.allowlistPath) : null;
  const reviewArtifact =
    args.allowlistPath && allowlistArtifact
      ? readReviewArtifactForAllowlist(args.allowlistPath, allowlistArtifact)
      : null;
  const allowlistedSlugs = allowlistArtifact
    ? new Set([
        ...(allowlistArtifact.allowedNodeSlugs ?? []).filter(
          (value): value is string => typeof value === "string" && value.trim().length > 0
        ),
        ...((allowlistArtifact.entries ?? [])
          .map((entry) => (typeof entry.slug === "string" ? entry.slug : null))
          .filter((value): value is string => !!value && value.trim().length > 0)),
      ])
    : null;

  const allowlistEntriesBySlug = new Map<string, AllowlistEntry>(
    (allowlistArtifact?.entries ?? [])
      .filter((entry): entry is AllowlistEntry & { slug: string } => typeof entry.slug === "string")
      .map((entry) => [entry.slug, entry])
  );
  const reviewCandidatesBySlug = new Map<string, ReviewCandidate>(
    (reviewArtifact?.candidates ?? [])
      .filter((candidate): candidate is ReviewCandidate => typeof candidate?.slug === "string")
      .map((candidate) => [candidate.slug, candidate])
  );

  const selectionDiagnostics: CohortSelectionDiagnostics = {
    allowlistCount: allowlistedSlugs?.size ?? null,
    selectedFromAllowlist: [],
    missingFromPrioritization: [],
    missingReviewArtifact: [],
    failedHardSafety: [],
    passedHardSafety: [],
    appliedOrPlannedNodes: [],
    skippedWithReasons: [],
  };

  const cohortNodes =
    allowlistedSlugs === null
      ? safeCreateNodes
      : [...allowlistedSlugs]
          .map((slug) => {
            const prioritizedNode = prioritizedNodesBySlug.get(slug);
            if (!prioritizedNode) {
              selectionDiagnostics.missingFromPrioritization.push(slug);
              return null;
            }
            const reviewCandidate = reviewCandidatesBySlug.get(slug);
            if (!reviewCandidate) {
              selectionDiagnostics.missingReviewArtifact.push(slug);
              return null;
            }
            selectionDiagnostics.selectedFromAllowlist.push(slug);
            return prioritizedNode;
          })
          .filter((node): node is PrioritizedNode => !!node);

  const activeProposals = await loadActiveProposals();
  const proposalsByNodeId = new Map<string, ProposalRow[]>();
  for (const proposal of activeProposals) {
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

  async function approveEligibleProposals(
    cohortSelection: PrioritizedNode[],
    proposalType: "create_canonical_entity" | "link_curriculum_node_to_entity" | "retarget_card_to_entity" | "retarget_question_to_entity",
    autoFilter: (proposal: ProposalRow, packet: ProposalRow[]) => { passed: boolean; reasons: string[] }
  ) {
    const proposals = await loadActiveProposals();
    const byPacket = new Map<string, ProposalRow[]>();
    for (const proposal of proposals) {
      const packetKey = proposalPacketKey(proposal);
      const bucket = byPacket.get(packetKey) ?? [];
      bucket.push(proposal);
      byPacket.set(packetKey, bucket);
    }

    const allowedSlugs = new Set(cohortSelection.map((node) => node.slug));
    const eligible: ProposalRow[] = [];
    const diagnostics: PacketDiagnostic[] = [];

    for (const [packetKey, packet] of byPacket.entries()) {
      const first = packet[0];
      const nodeSlug = proposalNodeSlug(first, cohortSelection);
      const nodeTitle = proposalNodeTitle(first, cohortSelection);
      if (!nodeSlug || !allowedSlugs.has(nodeSlug)) {
        continue;
      }

      const proposal = packet[0];
      const mode: ApprovalMode = allowlistEntriesBySlug.has(nodeSlug) ? "allowlist" : "auto";
      const selectedByAllowlist = mode === "allowlist";
      const hardSafetyFailureReasons: string[] = [];
      const autoOnlyFailureReasons: string[] = [];
      const reviewCandidate = reviewCandidatesBySlug.get(nodeSlug);
      const allowlistEntry = allowlistEntriesBySlug.get(nodeSlug);
      const nodeProposals = nodeIdFor(nodeSlug, cohortSelection)
        ? proposalsByNodeId.get(nodeIdFor(nodeSlug, cohortSelection) as string) ?? []
        : [];

      if (proposal.review_status === "approved" || proposal.review_status === "applied") {
        diagnostics.push({
          packetKey,
          nodeSlug,
          nodeTitle,
          proposalType: proposal.proposal_type,
          mode,
          selectedByAllowlist,
          passedHardSafety: false,
          hardSafetyFailureReasons: ["Proposal is already approved or applied."],
          failedAutoOnlyHeuristic: false,
          autoOnlyFailureReasons: [],
          approved: false,
          skippedReason: "already-approved-or-applied",
        });
        continue;
      }

      if (proposal.proposal_type !== proposalType) {
        continue;
      }

      if (mode === "allowlist" && proposalType === "create_canonical_entity") {
        const createProposalCount = packet.filter((candidate) => candidate.proposal_type === "create_canonical_entity").length;
        const hasSplitFlag = nodeProposals.some((candidate) => candidate.proposal_type === "flag_possible_split");
        const hasDisallowedProposalTypes = nodeProposals.some((candidate) =>
          [
            "add_entity_alias",
            "add_canonical_relationship",
            "link_concept_to_entity",
            "flag_possible_merge",
            "flag_ambiguous_mapping",
          ].includes(candidate.proposal_type)
        );
        const proposedType = proposal.proposed_entity_type ?? "";
        const node = cohortSelection.find((candidate) => candidate.slug === nodeSlug) ?? null;
        const reviewPacketKey = reviewCandidate?.deterministicPacket.proposal
          ? proposalPacketKey(reviewCandidate.deterministicPacket.proposal)
          : null;
        const proposedLabelMatchesReview =
          reviewCandidate !== undefined &&
          normalizeLabel(proposal.proposed_entity_label ?? "") ===
            normalizeLabel(reviewCandidate.llmReview.proposed_entity_label ?? "");
        const proposedLabelMatchesNode =
          normalizeLabel(proposal.proposed_entity_label ?? "") === normalizeLabel(node?.title ?? "");
        if (!allowlistEntry) {
          hardSafetyFailureReasons.push("Candidate slug is not present in the allowlist entries.");
        }
        if (!reviewCandidate) {
          hardSafetyFailureReasons.push("Candidate is missing from the LLM review artifact.");
        }
        if (reviewPacketKey !== packetKey) {
          hardSafetyFailureReasons.push("Review artifact packet key does not match the active proposal packet.");
        }
        if (createProposalCount !== 1) {
          hardSafetyFailureReasons.push(`Expected exactly one active create proposal, found ${createProposalCount}.`);
        }
        if (packet.length !== 1) {
          hardSafetyFailureReasons.push(`Expected packet size 1, found ${packet.length}.`);
        }
        if (hasSplitFlag) {
          hardSafetyFailureReasons.push("Active split-risk proposal exists for this node.");
        }
        if (hasDisallowedProposalTypes) {
          hardSafetyFailureReasons.push("Disallowed alias/merge/relationship/concept proposal exists for this node.");
        }
        if (reviewCandidate && !reviewCandidate.deterministicPacket.noGenericRisk) {
          hardSafetyFailureReasons.push("LLM review artifact marked this node as generic-risk.");
        }
        if (reviewCandidate && !reviewCandidate.deterministicPacket.noExistingEntityConflict) {
          hardSafetyFailureReasons.push("LLM review artifact detected an existing canonical entity conflict.");
        }
        if (!proposedType) {
          hardSafetyFailureReasons.push("Proposed entity type is missing.");
        }
        if (reviewCandidate && !reviewCandidate.deterministicPacket.allowedEntityType) {
          hardSafetyFailureReasons.push("LLM review artifact did not mark the proposed entity type as allowed.");
        }
        if (!(proposedLabelMatchesNode || proposedLabelMatchesReview)) {
          hardSafetyFailureReasons.push("Proposed label does not match the curriculum node label or reviewed label.");
        }
        if ((proposal.supporting_card_count ?? 0) + (proposal.supporting_question_count ?? 0) <= 0) {
          hardSafetyFailureReasons.push("Supporting card/question count is zero.");
        }
        if (reviewCandidate?.llmReview.decision !== "approve_create") {
          hardSafetyFailureReasons.push("LLM decision is not approve_create.");
        }
        if (reviewCandidate?.llmReview.safe_for_auto_apply !== true) {
          hardSafetyFailureReasons.push("LLM review did not mark this candidate safe_for_auto_apply.");
        }
        if (reviewCandidate?.safeForAutoApply !== true) {
          hardSafetyFailureReasons.push("Deterministic safety gate in the LLM review artifact did not pass.");
        }
        if (reviewCandidate?.calibratedGate?.passed === false) {
          hardSafetyFailureReasons.push("Calibrated LLM review gate did not pass.");
        }
        if (reviewCandidate && !reviewCandidate.deterministicPacket.exactOneCreateProposal) {
          hardSafetyFailureReasons.push("LLM review artifact does not confirm exactly one create proposal.");
        }
        if (reviewCandidate && !reviewCandidate.deterministicPacket.packetSizeIsOne) {
          hardSafetyFailureReasons.push("LLM review artifact does not confirm packet size 1.");
        }
        if (reviewCandidate && !reviewCandidate.deterministicPacket.noSplitRisk) {
          hardSafetyFailureReasons.push("LLM review artifact reports split-risk.");
        }
        if (reviewCandidate && !reviewCandidate.deterministicPacket.normalizedLabelMatches) {
          hardSafetyFailureReasons.push("LLM review artifact says normalized label does not match.");
        }
        if (reviewCandidate && !reviewCandidate.deterministicPacket.affectedObjectCountNonzero) {
          hardSafetyFailureReasons.push("LLM review artifact says affected object count is zero.");
        }

        const autoResult = autoFilter(proposal, packet);
        autoOnlyFailureReasons.push(...autoResult.reasons);
        const passedHardSafety = hardSafetyFailureReasons.length === 0;
        const approved = passedHardSafety;

        diagnostics.push({
          packetKey,
          nodeSlug,
          nodeTitle,
          proposalType: proposal.proposal_type,
          mode,
          selectedByAllowlist,
          passedHardSafety,
          hardSafetyFailureReasons,
          failedAutoOnlyHeuristic: !autoResult.passed,
          autoOnlyFailureReasons,
          approved,
          skippedReason: approved ? null : "failed-hard-safety",
        });

        if (passedHardSafety && nodeSlug) {
          selectionDiagnostics.passedHardSafety.push(nodeSlug);
        }
        if (!approved) {
          selectionDiagnostics.failedHardSafety.push({
            nodeSlug,
            reasons: hardSafetyFailureReasons,
          });
          selectionDiagnostics.skippedWithReasons.push({
            nodeSlug,
            reasons: hardSafetyFailureReasons,
          });
          continue;
        }
        if (nodeSlug) {
          selectionDiagnostics.appliedOrPlannedNodes.push(nodeSlug);
        }
        eligible.push(proposal);
        continue;
      }

      if (packet.length !== 1) {
        diagnostics.push({
          packetKey,
          nodeSlug,
          nodeTitle,
          proposalType: proposal.proposal_type,
          mode,
          selectedByAllowlist,
          passedHardSafety: false,
          hardSafetyFailureReasons: [`Expected packet size 1, found ${packet.length}.`],
          failedAutoOnlyHeuristic: false,
          autoOnlyFailureReasons: [],
          approved: false,
          skippedReason: "packet-size",
        });
        if (mode === "allowlist") {
          selectionDiagnostics.failedHardSafety.push({
            nodeSlug,
            reasons: [`Expected packet size 1, found ${packet.length}.`],
          });
          selectionDiagnostics.skippedWithReasons.push({
            nodeSlug,
            reasons: [`Expected packet size 1, found ${packet.length}.`],
          });
        }
        continue;
      }

      const autoResult = autoFilter(proposal, packet);
      const approved = autoResult.passed;
        diagnostics.push({
          packetKey,
          nodeSlug,
        nodeTitle,
        proposalType: proposal.proposal_type,
        mode,
        selectedByAllowlist,
        passedHardSafety: false,
        hardSafetyFailureReasons: [],
        failedAutoOnlyHeuristic: !autoResult.passed,
        autoOnlyFailureReasons: autoResult.reasons,
          approved,
          skippedReason: approved ? null : "failed-auto-heuristic",
        });
      if (mode === "allowlist" && approved && nodeSlug) {
        selectionDiagnostics.appliedOrPlannedNodes.push(nodeSlug);
      }
      if (!approved) {
        if (mode === "allowlist") {
          selectionDiagnostics.skippedWithReasons.push({
            nodeSlug,
            reasons: autoResult.reasons,
          });
        }
        continue;
      }
      eligible.push(proposal);
    }

    if (args.apply) {
      for (const proposal of eligible) {
        const { error } = await supabase
          .from("kg_automation_proposals")
          .update({
            review_status: "approved",
            reviewer_notes: `Approved by run-kg-blocked-node-cohort for ${proposalType}.`,
            metadata: {
              ...proposal.metadata,
              approved_by_script: "run-kg-blocked-node-cohort",
            },
          })
          .eq("id", proposal.id);
        if (error) throw error;
      }
    }

    return { eligible, diagnostics };
  }

  function nodeIdFor(slug: string, cohortSelection: PrioritizedNode[]) {
    return cohortSelection.find((node) => node.slug === slug)?.nodeId ?? null;
  }

  const approvedCreatesResult = await approveEligibleProposals(
    cohortNodes,
    "create_canonical_entity",
    (proposal) => {
      const reasons: string[] = [];
      if (proposal.confidence < 0.7) {
        reasons.push(`Confidence ${proposal.confidence.toFixed(2)} is below the auto threshold of 0.70.`);
      }
      if (proposal.conflict_count !== 0) {
        reasons.push(`Conflict count is ${proposal.conflict_count}.`);
      }
      if (!proposal.proposed_entity_type) {
        reasons.push("Proposed entity type is missing.");
      }
      if (!proposal.proposed_entity_label) {
        reasons.push("Proposed entity label is missing.");
      }
      if ((proposal.supporting_card_count ?? 0) + (proposal.supporting_question_count ?? 0) <= 0) {
        reasons.push("Supporting card/question count is zero.");
      }
      return { passed: reasons.length === 0, reasons };
    }
  );
  const approvedCreates = approvedCreatesResult.eligible;

  let createApplyDryRun: Record<string, unknown> | null = null;
  let createApply: Record<string, unknown> | null = null;
  if (approvedCreates.length > 0) {
    createApplyDryRun = extractJson(runCommand("npm", ["run", "kg:auto:apply-approved", "--", "--dry-run"]));
    if (args.apply) {
      createApply = extractJson(runCommand("npm", ["run", "kg:auto:apply-approved"]));
    }
  }

  runCommand("npm", ["run", "kg:automation:generate", "--", "--limit", String(args.cohortSize)]);

  const bridgeCohortNodes = cohortNodes;
  const wouldCreateNodes = new Set(
    approvedCreates
      .map((proposal) =>
        typeof proposal.metadata.curriculum_node_id === "string" ? proposal.metadata.curriculum_node_id : null
      )
      .filter((value): value is string => !!value)
  );
  const wouldCreateSlugs = new Set(
    cohortNodes.filter((node) => wouldCreateNodes.has(node.nodeId)).map((node) => node.slug)
  );
  const approvedBridgesResult = await approveEligibleProposals(
    bridgeCohortNodes,
    "link_curriculum_node_to_entity",
    (proposal) => {
      const reasons: string[] = [];
      if (proposal.confidence < 0.72) {
        reasons.push(`Confidence ${proposal.confidence.toFixed(2)} is below the auto threshold of 0.72.`);
      }
      if (proposal.conflict_count !== 0) {
        reasons.push(`Conflict count is ${proposal.conflict_count}.`);
      }
      if (proposal.proposed_bridge_type !== "primary_coverage") {
        reasons.push(`Proposed bridge type is ${proposal.proposed_bridge_type ?? "unknown"}.`);
      }
      if (
        normalizeLabel(proposal.proposed_entity_label ?? "") !==
        normalizeLabel(String(proposal.metadata.target_entity_label ?? ""))
      ) {
        reasons.push("Proposed entity label does not match target entity label.");
      }
      return { passed: reasons.length === 0, reasons };
    }
  );
  const approvedBridges = approvedBridgesResult.eligible;

  let bridgeApplyDryRun: Record<string, unknown> | null = null;
  let bridgeApply: Record<string, unknown> | null = null;
  if (approvedBridges.length > 0) {
    bridgeApplyDryRun = extractJson(runCommand("npm", ["run", "kg:auto:apply-approved", "--", "--dry-run"]));
    if (args.apply) {
      bridgeApply = extractJson(runCommand("npm", ["run", "kg:auto:apply-approved"]));
    }
  }

  runCommand("npm", ["run", "kg:retarget:generate"]);

  const approvedCardRetargetsResult = await approveEligibleProposals(
    bridgeCohortNodes,
    "retarget_card_to_entity",
    (proposal) => {
      const reasons: string[] = [];
      if (proposal.conflict_count !== 0) {
        reasons.push(`Conflict count is ${proposal.conflict_count}.`);
      }
      if (proposal.metadata.safe_retarget !== true) {
        reasons.push("safe_retarget flag is not true.");
      }
      if (
        !Array.isArray(proposal.metadata.affected_object_ids) ||
        proposal.metadata.affected_object_ids.length === 0
      ) {
        reasons.push("affected_object_ids are missing.");
      }
      return { passed: reasons.length === 0, reasons };
    }
  );
  const approvedCardRetargets = approvedCardRetargetsResult.eligible;
  const approvedQuestionRetargetsResult = await approveEligibleProposals(
    bridgeCohortNodes,
    "retarget_question_to_entity",
    (proposal) => {
      const reasons: string[] = [];
      if (proposal.conflict_count !== 0) {
        reasons.push(`Conflict count is ${proposal.conflict_count}.`);
      }
      if (proposal.metadata.safe_retarget !== true) {
        reasons.push("safe_retarget flag is not true.");
      }
      if (
        !Array.isArray(proposal.metadata.affected_object_ids) ||
        proposal.metadata.affected_object_ids.length === 0
      ) {
        reasons.push("affected_object_ids are missing.");
      }
      return { passed: reasons.length === 0, reasons };
    }
  );
  const approvedQuestionRetargets = approvedQuestionRetargetsResult.eligible;

  const retargetNodes = new Set<string>();
  for (const proposal of [...approvedCardRetargets, ...approvedQuestionRetargets]) {
    if (typeof proposal.metadata.source_curriculum_node_slug === "string") {
      retargetNodes.add(proposal.metadata.source_curriculum_node_slug);
    }
  }

  const retargetRuns: Array<Record<string, unknown>> = [];
  for (const slug of [...retargetNodes].sort()) {
    const dryRun = extractJson(runCommand("npm", ["run", "kg:retarget:apply", "--", "--node", slug, "--dry-run"]));
    if ((dryRun as { legacyMappingsTouched?: number }).legacyMappingsTouched !== 0) {
      throw new Error(`Retarget dry-run touched legacy mappings for ${slug}`);
    }
    let applyResult: Record<string, unknown> | null = null;
    if (args.apply) {
      applyResult = extractJson(runCommand("npm", ["run", "kg:retarget:apply", "--", "--node", slug]));
    }
    retargetRuns.push({ slug, dryRun, apply: applyResult });
  }

  const afterRetarget = extractJson(runCommand("npm", ["run", "kg:retarget:report"]));
  runCommand("npm", ["run", "kg:coverage:report"]);

  const after = await snapshotCounts();
  console.log(
    JSON.stringify(
      {
        mode: args.apply ? "apply" : args.dryRun ? "dry-run" : "review-only",
        cohortSize: args.cohortSize,
        allowlistPath: args.allowlistPath,
        allowlistedNodeCount: allowlistedSlugs?.size ?? null,
        prioritization,
        selectedCohortNodes: cohortNodes.map((node) => node.slug),
        allowlistDiagnostics: selectionDiagnostics,
        diagnostics: {
          selectedByAllowlist: approvedCreatesResult.diagnostics
            .filter((row) => row.mode === "allowlist")
            .map((row) => row.nodeSlug),
          passedHardSafety: approvedCreatesResult.diagnostics
            .filter((row) => row.mode === "allowlist" && row.passedHardSafety)
            .map((row) => row.nodeSlug),
          failedHardSafety: approvedCreatesResult.diagnostics
            .filter((row) => row.mode === "allowlist" && !row.passedHardSafety)
            .map((row) => ({
              nodeSlug: row.nodeSlug,
              reasons: row.hardSafetyFailureReasons,
            })),
          failedAutoOnlyHeuristicButAllowedByExplicitReview: approvedCreatesResult.diagnostics
            .filter(
              (row) => row.mode === "allowlist" && row.approved && row.failedAutoOnlyHeuristic
            )
            .map((row) => ({
              nodeSlug: row.nodeSlug,
              reasons: row.autoOnlyFailureReasons,
            })),
          approvedCreates: approvedCreatesResult.diagnostics
            .filter((row) => row.approved)
            .map((row) => row.nodeSlug),
          skippedCreates: approvedCreatesResult.diagnostics
            .filter((row) => !row.approved)
            .map((row) => ({
              nodeSlug: row.nodeSlug,
              mode: row.mode,
              skippedReason: row.skippedReason,
            })),
          createDiagnostics: approvedCreatesResult.diagnostics,
        },
        plannedProgression: {
          wouldCreateCanonicalEntities: approvedCreates.map((proposal) => proposal.proposed_entity_label),
          wouldCreateNodeSlugs: [...wouldCreateSlugs].sort(),
          wouldAttemptBridgeForNodeSlugs: [...wouldCreateSlugs].sort(),
          wouldAttemptRetargetForNodeSlugs: [...wouldCreateSlugs].sort(),
          downstreamDryRunBlockedBecauseCreateNotPersisted:
            args.dryRun && approvedCreates.length > 0,
        },
        approvedCreatePackets: approvedCreates.map((proposal) => proposal.proposed_entity_label),
        approvedBridgePackets: approvedBridges.map((proposal) => proposal.proposed_entity_label),
        approvedRetargetNodes: [...retargetNodes].sort(),
        createApplyDryRun,
        createApply,
        bridgeApplyDryRun,
        bridgeApply,
        retargetRuns,
        before,
        after,
        beforeCompletion: baselineRetarget,
        afterCompletion: afterRetarget,
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
