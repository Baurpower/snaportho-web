const commonModulePromise = import(new URL("./kg-automation-common.ts", import.meta.url).href);

type ProposalRow = import("./kg-automation-common").ProposalRow;

type ParsedArgs = {
  dryRun: boolean;
  proposalType: string;
  bridgeType: string | null;
  requireExactNormalizedMatch: boolean;
};

function parseArgs(argv: string[]): ParsedArgs {
  let proposalType = "";
  let bridgeType: string | null = null;

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--proposal-type") {
      proposalType = argv[index + 1] ?? proposalType;
      index += 1;
    } else if (arg === "--bridge-type") {
      bridgeType = argv[index + 1] ?? bridgeType;
      index += 1;
    }
  }

  if (!proposalType) {
    throw new Error("Missing required --proposal-type argument.");
  }

  return {
    dryRun: argv.includes("--dry-run"),
    proposalType,
    bridgeType,
    requireExactNormalizedMatch: !argv.includes("--allow-non-exact-match"),
  };
}

function groupByPacket(proposals: ProposalRow[]) {
  const grouped = new Map<string, ProposalRow[]>();

  for (const proposal of proposals) {
    const packetKey = String(proposal.metadata.review_packet_key ?? proposal.proposal_fingerprint);
    const bucket = grouped.get(packetKey) ?? [];
    bucket.push(proposal);
    grouped.set(packetKey, bucket);
  }

  return grouped;
}

function getPacketLabel(proposals: ProposalRow[]) {
  const first = proposals[0];
  return String(
    first?.metadata.review_packet_label ??
      first?.metadata.curriculum_node_path ??
      first?.proposed_entity_label ??
      first?.proposal_fingerprint ??
      "unknown-packet"
  );
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function getTargetEntityLabel(proposal: ProposalRow) {
  return typeof proposal.metadata.target_entity_label === "string" ? proposal.metadata.target_entity_label : null;
}

async function main() {
  const { ACTIVE_PROPOSAL_REVIEW_STATUSES, createServiceRoleClient, normalizeLabel, resolveReviewerIdentity } =
    await commonModulePromise;
  const args = parseArgs(process.argv);
  const reviewer = resolveReviewerIdentity(process.argv);
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("kg_automation_proposals")
    .select("*")
    .eq("is_active", true)
    .in("review_status", ACTIVE_PROPOSAL_REVIEW_STATUSES)
    .order("confidence", { ascending: false });

  if (error) {
    throw error;
  }

  const grouped = groupByPacket((data ?? []) as ProposalRow[]);
  const eligible: ProposalRow[] = [];
  const skippedPackets: Array<{
    packetKey: string;
    packetLabel: string;
    reasons: string[];
    proposalTypes: string[];
    proposalCount: number;
  }> = [];

  for (const [packetKey, packetProposals] of grouped.entries()) {
    const packetLabel = getPacketLabel(packetProposals);
    const proposalTypes = unique(packetProposals.map((proposal) => proposal.proposal_type));
    const reasons: string[] = [];

    if (proposalTypes.length !== 1 || proposalTypes[0] !== args.proposalType) {
      reasons.push(`packet contains non-target proposal types: ${proposalTypes.join(", ")}`);
    }

    const reviewable = packetProposals.filter(
      (proposal) => proposal.review_status !== "approved" && proposal.review_status !== "applied"
    );

    if (reviewable.length === 0) {
      reasons.push("packet has no review-open proposals");
    }

    const matching = reviewable.filter((proposal) => proposal.proposal_type === args.proposalType);

    if (matching.length !== reviewable.length) {
      reasons.push("packet contains review-open proposals outside the requested type");
    }

    for (const proposal of matching) {
      if (proposal.conflict_count > 0) {
        reasons.push("proposal has conflicts");
      }
      if (proposal.confidence_tier === "low") {
        reasons.push("proposal confidence is low");
      }
      if (args.bridgeType && proposal.proposed_bridge_type !== args.bridgeType) {
        reasons.push(`bridge type ${proposal.proposed_bridge_type ?? "null"} is not ${args.bridgeType}`);
      }
      if (args.requireExactNormalizedMatch) {
        const targetEntityLabel = getTargetEntityLabel(proposal);
        if (!targetEntityLabel) {
          reasons.push("proposal is missing target_entity_label metadata");
        } else if (normalizeLabel(proposal.proposed_entity_label ?? "") !== normalizeLabel(targetEntityLabel)) {
          reasons.push(
            `normalized node/entity labels differ: ${proposal.proposed_entity_label ?? "null"} vs ${targetEntityLabel}`
          );
        }
      }
    }

    if (reasons.length > 0) {
      skippedPackets.push({
        packetKey,
        packetLabel,
        reasons: unique(reasons),
        proposalTypes,
        proposalCount: packetProposals.length,
      });
      continue;
    }

    eligible.push(...matching);
  }

  if (!args.dryRun) {
    for (const proposal of eligible) {
      const { error: updateError } = await supabase
        .from("kg_automation_proposals")
        .update({
          review_status: "approved",
          reviewed_by: reviewer.reviewerId,
          reviewed_at: reviewer.reviewedAt,
          reviewer_notes: `Approved by approve-kg-automation-batch for proposal type ${args.proposalType}${
            reviewer.reviewerLabel ? ` (reviewer: ${reviewer.reviewerLabel})` : ""
          }.`,
          metadata: {
            ...proposal.metadata,
            approved_by_script: "approve-kg-automation-batch",
            batch_approval_proposal_type: args.proposalType,
            batch_approval_bridge_type: args.bridgeType,
            reviewer_id: reviewer.reviewerId,
            reviewer_label: reviewer.reviewerLabel,
          },
        })
        .eq("id", proposal.id);

      if (updateError) {
        throw updateError;
      }
    }
  }

  const approvedPacketLabels = unique(
    eligible.map((proposal) =>
      String(
        proposal.metadata.review_packet_label ??
          proposal.metadata.curriculum_node_path ??
          proposal.proposed_entity_label ??
          proposal.proposal_fingerprint
      )
    )
  );

  console.log(
    JSON.stringify(
      {
        dryRun: args.dryRun,
        proposalType: args.proposalType,
        bridgeType: args.bridgeType,
        requireExactNormalizedMatch: args.requireExactNormalizedMatch,
        approvedProposalCount: eligible.length,
        approvedPacketCount: approvedPacketLabels.length,
        approvedPackets: approvedPacketLabels,
        skippedPacketCount: skippedPackets.length,
        skippedPackets,
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
