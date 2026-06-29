const commonModulePromise = import(new URL("./kg-automation-common.ts", import.meta.url).href);

type ProposalRow = import("./kg-automation-common").ProposalRow;

type ParsedArgs = {
  dryRun: boolean;
  packetKey: string;
  allowAliases: boolean;
  allowConceptBridges: boolean;
  allowRelationships: boolean;
  allowRiskFlags: boolean;
  allowProvenance: boolean;
};

function parseArgs(argv: string[]): ParsedArgs {
  let packetKey = "";

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--packet") {
      packetKey = argv[index + 1] ?? packetKey;
      index += 1;
    }
  }

  if (!packetKey) {
    throw new Error("Missing required --packet argument.");
  }

  return {
    dryRun: argv.includes("--dry-run"),
    packetKey,
    allowAliases: argv.includes("--allow-aliases"),
    allowConceptBridges: argv.includes("--allow-concept-bridges"),
    allowRelationships: argv.includes("--allow-relationships"),
    allowRiskFlags: argv.includes("--allow-risk-flags"),
    allowProvenance: argv.includes("--allow-provenance"),
  };
}

function isSafeByDefault(proposal: ProposalRow) {
  return (
    proposal.proposal_type === "create_canonical_entity" ||
    proposal.proposal_type === "link_curriculum_node_to_entity"
  );
}

async function main() {
  const { ACTIVE_PROPOSAL_REVIEW_STATUSES, createServiceRoleClient, resolvePacketSelection, resolveReviewerIdentity } =
    await commonModulePromise;
  const args = parseArgs(process.argv);
  const reviewer = resolveReviewerIdentity(process.argv);
  const supabase = createServiceRoleClient();

  const { error: probeError } = await supabase.from("kg_automation_proposals").select("id").limit(1);
  if (probeError) {
    throw probeError;
  }

  const { data, error } = await supabase
    .from("kg_automation_proposals")
    .select("*")
    .eq("is_active", true)
    .in("review_status", ACTIVE_PROPOSAL_REVIEW_STATUSES)
    .order("confidence", { ascending: false });

  if (error) {
    throw error;
  }

  const resolved = resolvePacketSelection((data ?? []) as ProposalRow[], args.packetKey);
  if (!resolved) {
    throw new Error(`No live proposals found for packet ${args.packetKey}.`);
  }
  const packetProposals: ProposalRow[] = resolved.proposals;
  const resolvedPacketKey = resolved.packetKey;

  const eligible = packetProposals.filter((proposal) => {
    if (proposal.review_status === "approved" || proposal.review_status === "applied") {
      return false;
    }
    if (isSafeByDefault(proposal)) {
      return true;
    }
    if (args.allowAliases && proposal.proposal_type === "add_entity_alias") {
      return true;
    }
    if (args.allowConceptBridges && proposal.proposal_type === "link_concept_to_entity") {
      return true;
    }
    if (args.allowRelationships && proposal.proposal_type === "add_canonical_relationship") {
      return true;
    }
    if (args.allowProvenance && proposal.proposal_type === "add_provenance_record") {
      return true;
    }
    if (args.allowRiskFlags && proposal.proposal_type.startsWith("flag_")) {
      return true;
    }
    return false;
  });

  const skipped = packetProposals.filter((proposal) => !eligible.includes(proposal));

  if (!args.dryRun) {
    for (const proposal of eligible) {
      const { error: updateError } = await supabase
        .from("kg_automation_proposals")
        .update({
          review_status: "approved",
          reviewed_by: reviewer.reviewerId,
          reviewed_at: reviewer.reviewedAt,
          reviewer_notes: `Approved by approve-kg-automation-packet for packet ${resolvedPacketKey}${
            reviewer.reviewerLabel ? ` (reviewer: ${reviewer.reviewerLabel})` : ""
          }.`,
          metadata: {
            ...proposal.metadata,
            approval_packet_key: resolvedPacketKey,
            approved_by_script: "approve-kg-automation-packet",
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

  console.log(
    JSON.stringify(
      {
        dryRun: args.dryRun,
        packetKey: resolvedPacketKey,
        packetProposalCount: packetProposals.length,
        approvedCount: eligible.length,
        skippedCount: skipped.length,
        approvedProposalTypes: eligible.map((proposal) => proposal.proposal_type),
        skippedProposalTypes: skipped.map((proposal) => proposal.proposal_type),
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
