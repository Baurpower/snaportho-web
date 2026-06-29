import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

type ProposalRow = import("./kg-automation-common").ProposalRow;

const commonModulePromise = import(new URL("./kg-automation-common.ts", import.meta.url).href);

type ParsedArgs = {
  outDir: string;
  packetKey: string;
};

function parseArgs(argv: string[]): ParsedArgs {
  let outDir = "reports";
  let packetKey = "";

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--out-dir") {
      outDir = argv[index + 1] ?? outDir;
      index += 1;
    } else if (arg === "--packet") {
      packetKey = argv[index + 1] ?? packetKey;
      index += 1;
    }
  }

  if (!packetKey) {
    throw new Error("Missing required --packet argument.");
  }

  return { outDir, packetKey };
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function countBy(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

function proposalTargetSummary(proposal: ProposalRow) {
  if (proposal.proposal_type === "create_canonical_entity") {
    return `${proposal.proposed_entity_label} -> ${proposal.proposed_entity_type}`;
  }
  if (proposal.proposal_type === "link_curriculum_node_to_entity") {
    return `${proposal.metadata.curriculum_node_title ?? proposal.proposed_entity_label} -> ${proposal.metadata.target_entity_label ?? proposal.proposed_existing_entity_id}`;
  }
  if (proposal.proposal_type === "link_concept_to_entity") {
    return `${proposal.metadata.concept_name ?? proposal.proposed_entity_label} -> ${proposal.metadata.target_entity_label ?? proposal.proposed_existing_entity_id}`;
  }
  if (proposal.proposal_type === "add_entity_alias") {
    return `${proposal.proposed_alias} -> ${proposal.metadata.target_entity_label ?? proposal.proposed_existing_entity_id}`;
  }
  if (proposal.proposal_type === "add_canonical_relationship") {
    return `${proposal.proposed_subject_entity_id} ${proposal.proposed_predicate} ${proposal.proposed_object_entity_id}`;
  }
  return proposal.proposed_entity_label ?? proposal.proposal_fingerprint;
}

function recommendationForProposal(proposal: ProposalRow) {
  if (
    proposal.proposal_type === "create_canonical_entity" ||
    proposal.proposal_type === "link_curriculum_node_to_entity"
  ) {
    return "Safe approval candidate";
  }
  if (proposal.proposal_type === "link_concept_to_entity" || proposal.proposal_type === "add_entity_alias") {
    return "Review after seed bridge/entity approval";
  }
  if (proposal.proposal_type === "add_canonical_relationship") {
    return "Hold for explicit clinical review";
  }
  return "Review as a risk/context flag only";
}

async function main() {
  const { ensureOutDir, getReviewPacketLabel, loadProposalRows, resolvePacketSelection } =
    await commonModulePromise;
  const args = parseArgs(process.argv);
  const { proposals, source } = (await loadProposalRows(args.outDir)) as {
    proposals: ProposalRow[];
    source: string;
  };
  const resolved = resolvePacketSelection(proposals, args.packetKey) as {
    packetKey: string;
    proposals: ProposalRow[];
  } | null;

  if (!resolved) {
    throw new Error(`No proposals found for packet ${args.packetKey}.`);
  }

  const packetProposals = resolved.proposals.sort((left, right) => right.confidence - left.confidence);

  const resolvedPacketKey = resolved.packetKey;

  ensureOutDir(args.outDir);
  const packetDir = path.join(args.outDir, "kg-automation-packets");
  mkdirSync(packetDir, { recursive: true });

  const first = packetProposals[0];
  const packetLabel = getReviewPacketLabel(first);
  const specialtyName =
    typeof first.metadata.specialty_name === "string" ? first.metadata.specialty_name : null;
  const curriculumNodePath =
    typeof first.metadata.curriculum_node_path === "string" ? first.metadata.curriculum_node_path : null;
  const curriculumNodeTitle =
    typeof first.metadata.curriculum_node_title === "string" ? first.metadata.curriculum_node_title : null;

  const lines: string[] = [];
  lines.push(`# KG Automation Review Packet: ${packetLabel}`);
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Proposal source: ${source}`);
  lines.push(`Packet key: ${resolvedPacketKey}`);
  if (specialtyName) {
    lines.push(`Specialty: ${specialtyName}`);
  }
  if (curriculumNodePath) {
    lines.push(`Curriculum node path: ${curriculumNodePath}`);
  }
  if (curriculumNodeTitle && curriculumNodeTitle !== curriculumNodePath) {
    lines.push(`Curriculum node title: ${curriculumNodeTitle}`);
  }
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Proposals in packet: ${packetProposals.length}`);
  lines.push(
    `- Proposal types: ${countBy(packetProposals.map((proposal) => proposal.proposal_type))
      .map(([type, count]) => `${type} ${count}`)
      .join(", ")}`
  );
  lines.push(
    `- Review statuses: ${countBy(packetProposals.map((proposal) => proposal.review_status))
      .map(([status, count]) => `${status} ${count}`)
      .join(", ")}`
  );
  lines.push("");
  lines.push("## Proposals");
  lines.push("");

  for (const proposal of packetProposals) {
    lines.push(
      `- ${proposal.proposal_type} | ${proposal.confidence_tier} ${proposal.confidence.toFixed(3)} | ${proposalTargetSummary(proposal)}`
    );
    lines.push(`  Status: ${proposal.review_status}`);
    lines.push(`  Recommended action: ${recommendationForProposal(proposal)}`);
    lines.push(
      `  Support: cards ${proposal.supporting_card_count}, questions ${proposal.supporting_question_count}, nodes ${proposal.supporting_curriculum_node_count}, sources ${proposal.supporting_source_count}, conflicts ${proposal.conflict_count}`
    );
    lines.push(`  Evidence: ${proposal.evidence_summary}`);
    lines.push(`  Confidence reasoning: ${proposal.confidence_reason}`);
    if (proposal.proposed_alias) {
      lines.push(`  Alias: ${proposal.proposed_alias}`);
    }
    if (proposal.proposed_bridge_type) {
      lines.push(`  Bridge type: ${proposal.proposed_bridge_type}`);
    }
    if (proposal.proposed_predicate) {
      lines.push(`  Predicate: ${proposal.proposed_predicate}`);
    }
    const sourceNames = Array.isArray(proposal.metadata.source_names)
      ? proposal.metadata.source_names.filter((value): value is string => typeof value === "string")
      : [];
    if (sourceNames.length > 0) {
      lines.push(`  Evidence sources: ${sourceNames.join(", ")}`);
    }
  }

  const outputPath = path.join(packetDir, `${slugify(resolvedPacketKey)}.md`);
  writeFileSync(outputPath, `${lines.join("\n").trim()}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        outputPath,
        proposalSource: source,
        packetKey: resolvedPacketKey,
        packetLabel,
        proposalCount: packetProposals.length,
        proposalTypes: countBy(packetProposals.map((proposal) => proposal.proposal_type)).map(
          ([type, count]) => ({ type, count })
        ),
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
