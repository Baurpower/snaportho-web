import { writeFileSync } from "node:fs";
import path from "node:path";

type ProposalRecord = import("./kg-automation-common").ProposalRecord;

const commonModulePromise = import(new URL("./kg-automation-common.ts", import.meta.url).href);

type ParsedArgs = {
  outDir: string;
};

type ProposalRow = ProposalRecord & {
  id?: string;
};

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

function countBy<T extends string>(values: T[]) {
  const counts = new Map<T, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

function groupEditorialQueue(proposals: ProposalRow[]) {
  const grouped = new Map<
    string,
    {
      label: string;
      specialtyName: string | null;
      proposals: ProposalRow[];
      score: number;
      primaryScore: number;
    }
  >();

  for (const proposal of proposals) {
    const packetKey = String(proposal.metadata.review_packet_key ?? proposal.proposal_fingerprint);
    const packetLabel = String(
      proposal.metadata.review_packet_label ??
        proposal.metadata.curriculum_node_path ??
        proposal.proposed_entity_label ??
        proposal.proposal_fingerprint
    );
    const specialtyName =
      proposal.metadata.specialty_name && typeof proposal.metadata.specialty_name === "string"
        ? proposal.metadata.specialty_name
        : null;
    const bucket = grouped.get(packetKey) ?? {
      label: packetLabel,
      specialtyName,
      proposals: [],
      score: 0,
      primaryScore: 0,
    };
    bucket.proposals.push(proposal);
    const isRiskFlag = proposal.proposal_type.startsWith("flag_");
    const weightedScore = isRiskFlag ? proposal.confidence * 0.05 : proposal.confidence;
    bucket.score += weightedScore;
    if (!isRiskFlag) {
      bucket.primaryScore = Math.max(bucket.primaryScore, proposal.confidence);
    } else if (bucket.primaryScore === 0) {
      bucket.primaryScore = Math.max(bucket.primaryScore, proposal.confidence * 0.05);
    }
    grouped.set(packetKey, bucket);
  }

  return [...grouped.values()]
    .sort((left, right) => {
      if (right.primaryScore !== left.primaryScore) {
        return right.primaryScore - left.primaryScore;
      }
      return right.score - left.score;
    })
    .slice(0, 25);
}

async function loadProposals(outDir: string): Promise<{ proposals: ProposalRow[]; source: string }> {
  const { loadProposalRows } = await commonModulePromise;
  return loadProposalRows(outDir);
}

async function main() {
  const { ensureOutDir } = await commonModulePromise;
  const args = parseArgs(process.argv);
  const { proposals, source } = await loadProposals(args.outDir);
  ensureOutDir(args.outDir);

  const byType = countBy(proposals.map((row) => row.proposal_type));
  const byConfidence = countBy(proposals.map((row) => row.confidence_tier));
  const bySpecialty = countBy(
    proposals.map((row) =>
      typeof row.metadata.specialty_name === "string" && row.metadata.specialty_name
        ? row.metadata.specialty_name
        : "Unassigned"
    )
  );

  const creationProposals = proposals.filter((row) => row.proposal_type === "create_canonical_entity");
  const curriculumBridgeProposals = proposals.filter((row) => row.proposal_type === "link_curriculum_node_to_entity");
  const conceptBridgeProposals = proposals.filter((row) => row.proposal_type === "link_concept_to_entity");
  const aliasProposals = proposals.filter((row) => row.proposal_type === "add_entity_alias");
  const relationshipProposals = proposals.filter((row) => row.proposal_type === "add_canonical_relationship");
  const riskFlags = proposals.filter((row) => row.proposal_type.startsWith("flag_"));
  const editorialQueue = groupEditorialQueue(proposals);

  const lines: string[] = [];
  lines.push("# KG Automation Proposals Report");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Proposal source: ${source}`);
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push(`- Total proposals: ${proposals.length}`);
  lines.push("- Proposals by type:");
  for (const [key, count] of byType) {
    lines.push(`- ${key}: ${count}`);
  }
  lines.push("- Proposals by confidence:");
  for (const [key, count] of byConfidence) {
    lines.push(`- ${key}: ${count}`);
  }
  lines.push("- Proposals by specialty:");
  for (const [key, count] of bySpecialty.slice(0, 12)) {
    lines.push(`- ${key}: ${count}`);
  }
  if (proposals.length === 0) {
    lines.push("- No proposals are available yet. Run `kg:automation:generate` against a reachable Supabase environment first.");
  }
  lines.push("");

  lines.push("## Entity Creation Proposals");
  lines.push("");
  if (creationProposals.length === 0) {
    lines.push("- None");
  } else {
    for (const proposal of creationProposals.slice(0, 15)) {
      lines.push(
        `- ${proposal.proposed_entity_label} -> \`${proposal.proposed_entity_type}\` (${proposal.confidence_tier}, ${proposal.confidence.toFixed(3)}). Cards: ${proposal.supporting_card_count}, Questions: ${proposal.supporting_question_count}.`
      );
      lines.push(`  Evidence: ${proposal.evidence_summary}`);
    }
  }
  lines.push("");

  lines.push("## Curriculum Bridge Proposals");
  lines.push("");
  if (curriculumBridgeProposals.length === 0) {
    lines.push("- None");
  } else {
    for (const proposal of curriculumBridgeProposals.slice(0, 15)) {
      lines.push(
        `- ${proposal.metadata.curriculum_node_path ?? proposal.proposed_entity_label} -> ${proposal.metadata.target_entity_label ?? proposal.proposed_existing_entity_id} (${proposal.confidence_tier}, ${proposal.confidence.toFixed(3)})`
      );
      lines.push(`  Evidence: ${proposal.evidence_summary}`);
    }
  }
  lines.push("");

  lines.push("## Concept Bridge Proposals");
  lines.push("");
  if (conceptBridgeProposals.length === 0) {
    lines.push("- None");
  } else {
    for (const proposal of conceptBridgeProposals.slice(0, 15)) {
      lines.push(
        `- ${proposal.metadata.concept_name ?? proposal.proposed_entity_label} -> ${proposal.metadata.target_entity_label ?? proposal.proposed_existing_entity_id} via \`${proposal.proposed_bridge_type}\` (${proposal.confidence_tier}, ${proposal.confidence.toFixed(3)})`
      );
      lines.push(`  Evidence: ${proposal.evidence_summary}`);
    }
  }
  lines.push("");

  lines.push("## Alias Proposals");
  lines.push("");
  if (aliasProposals.length === 0) {
    lines.push("- None");
  } else {
    for (const proposal of aliasProposals.slice(0, 15)) {
      lines.push(
        `- ${proposal.proposed_alias} -> ${proposal.metadata.target_entity_label ?? proposal.proposed_existing_entity_id} (origin: ${proposal.metadata.alias_origin ?? proposal.source_signal_type})`
      );
    }
  }
  lines.push("");

  lines.push("## Relationship Proposals");
  lines.push("");
  if (relationshipProposals.length === 0) {
    lines.push("- None");
  } else {
    for (const proposal of relationshipProposals.slice(0, 15)) {
      lines.push(
        `- ${proposal.proposed_subject_entity_id} \`${proposal.proposed_predicate}\` ${proposal.proposed_object_entity_id} (${proposal.confidence_tier}, ${proposal.confidence.toFixed(3)})`
      );
      lines.push(`  Evidence: ${proposal.evidence_summary}`);
    }
  }
  lines.push("");

  lines.push("## Risk Flags");
  lines.push("");
  if (riskFlags.length === 0) {
    lines.push("- None");
  } else {
    for (const proposal of riskFlags.slice(0, 20)) {
      lines.push(
        `- ${proposal.proposal_type}: ${proposal.metadata.review_packet_label ?? proposal.proposed_entity_label ?? proposal.proposal_fingerprint} (${proposal.confidence_tier}, ${proposal.confidence.toFixed(3)})`
      );
    }
  }
  lines.push("");

  lines.push("## Recommended Editorial Queue");
  lines.push("");
  for (const packet of editorialQueue) {
    lines.push(
      `- ${packet.label}${packet.specialtyName ? ` [${packet.specialtyName}]` : ""}: ${packet.proposals.length} proposals, combined score ${packet.score.toFixed(3)}`
    );
    const examples = packet.proposals.slice(0, 3).map((row) => `${row.proposal_type} (${row.confidence_tier})`);
    lines.push(`  Examples: ${examples.join(", ")}`);
  }
  lines.push("");

  const outputPath = path.join(args.outDir, "kg-automation-proposals-report.md");
  writeFileSync(outputPath, `${lines.join("\n").trim()}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        outputPath,
        proposalSource: source,
        proposalCount: proposals.length,
        topEditorialPackets: editorialQueue.slice(0, 10).map((packet) => packet.label),
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
