import { writeFileSync } from "node:fs";
import path from "node:path";

type ProposalRow = import("./kg-automation-common").ProposalRow;

const commonModulePromise = import(new URL("./kg-automation-common.ts", import.meta.url).href);

type ParsedArgs = {
  outDir: string;
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

function countBy(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

async function main() {
  const { ensureOutDir, getReviewPacketKey, getReviewPacketLabel, loadProposalRows } = await commonModulePromise;
  const args = parseArgs(process.argv);
  const { proposals, source } = (await loadProposalRows(args.outDir)) as {
    proposals: ProposalRow[];
    source: string;
  };
  ensureOutDir(args.outDir);

  const grouped = new Map<
    string,
    {
      label: string;
      specialtyName: string | null;
      curriculumNodePath: string | null;
      proposals: ProposalRow[];
      maxConfidence: number;
      safeApprovalCount: number;
      pendingReviewCount: number;
    }
  >();

  for (const proposal of proposals) {
    const packetKey = getReviewPacketKey(proposal);
    const bucket = grouped.get(packetKey) ?? {
      label: getReviewPacketLabel(proposal),
      specialtyName:
        typeof proposal.metadata.specialty_name === "string" ? proposal.metadata.specialty_name : null,
      curriculumNodePath:
        typeof proposal.metadata.curriculum_node_path === "string"
          ? proposal.metadata.curriculum_node_path
          : null,
      proposals: [] as ProposalRow[],
      maxConfidence: 0,
      safeApprovalCount: 0,
      pendingReviewCount: 0,
    };
    bucket.proposals.push(proposal);
    bucket.maxConfidence = Math.max(bucket.maxConfidence, proposal.confidence);
    if (
      proposal.review_status !== "approved" &&
      proposal.review_status !== "applied" &&
      (proposal.proposal_type === "create_canonical_entity" ||
        proposal.proposal_type === "link_curriculum_node_to_entity")
    ) {
      bucket.safeApprovalCount += 1;
    }
    if (proposal.review_status === "generated" || proposal.review_status === "needs_review") {
      bucket.pendingReviewCount += 1;
    }
    grouped.set(packetKey, bucket);
  }

  const packets = [...grouped.entries()]
    .map(([packetKey, bucket]) => ({
      packetKey,
      ...bucket,
    }))
    .sort((left, right) => {
      if (right.maxConfidence !== left.maxConfidence) {
        return right.maxConfidence - left.maxConfidence;
      }
      return right.proposals.length - left.proposals.length;
    });

  const lines: string[] = [];
  lines.push("# KG Automation Packet Status");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Proposal source: ${source}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Active proposals: ${proposals.length}`);
  lines.push(`- Packets: ${packets.length}`);
  for (const [status, count] of countBy(proposals.map((proposal) => proposal.review_status))) {
    lines.push(`- ${status}: ${count}`);
  }
  lines.push("");
  lines.push("## Top Packets");
  lines.push("");

  if (packets.length === 0) {
    lines.push("- No packets available.");
  } else {
    for (const packet of packets.slice(0, 25)) {
      lines.push(
        `- ${packet.label}${packet.specialtyName ? ` [${packet.specialtyName}]` : ""}: ${packet.proposals.length} proposals, max confidence ${packet.maxConfidence.toFixed(3)}, pending review ${packet.pendingReviewCount}, safe approvals ${packet.safeApprovalCount}`
      );
      lines.push(`  Packet key: ${packet.packetKey}`);
      if (packet.curriculumNodePath) {
        lines.push(`  Path: ${packet.curriculumNodePath}`);
      }
      lines.push(
        `  Types: ${countBy(packet.proposals.map((proposal) => proposal.proposal_type))
          .map(([type, count]) => `${type} ${count}`)
          .join(", ")}`
      );
    }
  }

  const outputPath = path.join(args.outDir, "kg-automation-packet-status.md");
  writeFileSync(outputPath, `${lines.join("\n").trim()}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        outputPath,
        proposalSource: source,
        proposalCount: proposals.length,
        packetCount: packets.length,
        topPackets: packets.slice(0, 10).map((packet) => ({
          packetKey: packet.packetKey,
          label: packet.label,
          proposalCount: packet.proposals.length,
          maxConfidence: Number(packet.maxConfidence.toFixed(3)),
          safeApprovalCount: packet.safeApprovalCount,
        })),
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
