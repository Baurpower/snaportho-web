/**
 * Evidence Packet CLI
 *
 * Usage: npm run kg:evidence -- --topic ankle-fracture
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { buildEvidencePacket } from "./lib/education/kg-evidence/evidence-packet-builder.ts";
import {
  buildEvidenceManifest,
  buildEvidenceSummaryMarkdown,
  countEvidenceBySource,
} from "./lib/education/kg-evidence/evidence-summary.ts";
import { listRegisteredTopics } from "./lib/education/kg-compiler/topic-registry.ts";

function parseArgs(argv: string[]) {
  let topic = "";
  let outDir = "reports/kg-evidence";
  let dbBacked = false;
  let includeStatic = true;
  let includeProposals = true;
  let includeQuality = true;
  let strict = false;

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--topic") {
      topic = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--out" || arg === "--out-dir") {
      outDir = argv[i + 1] ?? outDir;
      i += 1;
    } else if (arg === "--db-backed") {
      dbBacked = true;
    } else if (arg === "--include-static") {
      includeStatic = true;
    } else if (arg === "--no-static") {
      includeStatic = false;
    } else if (arg === "--include-proposals") {
      includeProposals = true;
    } else if (arg === "--no-proposals") {
      includeProposals = false;
    } else if (arg === "--include-quality") {
      includeQuality = true;
    } else if (arg === "--no-quality") {
      includeQuality = false;
    } else if (arg === "--strict") {
      strict = true;
    } else if (arg === "--help" || arg === "-h") {
      topic = "__help__";
    }
  }

  return { topic, outDir, dbBacked, includeStatic, includeProposals, includeQuality, strict };
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.topic || args.topic === "__help__") {
    console.log(
      [
        "Usage: npm run kg:evidence -- --topic <topic-key> [options]",
        "",
        "Options:",
        "  --db-backed          Prefer canonical DB snapshot and proposals",
        "  --out <dir>          Output directory (default: reports/kg-evidence)",
        "  --no-static          Skip static Prepare collector",
        "  --no-proposals       Skip proposal/review collectors",
        "  --no-quality         Skip quality/gap collector",
        "  --strict             Fail on collector errors",
        "",
        "Registered topics:",
        ...listRegisteredTopics().map((t) => `  - ${t.topicKey} (${t.displayName})`),
      ].join("\n")
    );
    process.exitCode = args.topic === "__help__" ? 0 : 1;
    return;
  }

  const { packet } = await buildEvidencePacket({
    topic: args.topic,
    dbBacked: args.dbBacked,
    includeStatic: args.includeStatic,
    includeProposals: args.includeProposals,
    includeQuality: args.includeQuality,
    strict: args.strict,
  });

  const topicDir = path.join(process.cwd(), args.outDir, packet.topicId);
  mkdirSync(topicDir, { recursive: true });

  const manifest = buildEvidenceManifest(packet);
  const summaryMd = buildEvidenceSummaryMarkdown(packet);
  const bySource = countEvidenceBySource(packet);

  writeFileSync(path.join(topicDir, "evidence-packet.json"), `${JSON.stringify(packet, null, 2)}\n`);
  writeFileSync(path.join(topicDir, "evidence-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(path.join(topicDir, "evidence-warnings.json"), `${JSON.stringify(packet.warnings, null, 2)}\n`);
  writeFileSync(path.join(topicDir, "evidence-summary.md"), `${summaryMd}\n`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        topic: packet.topicId,
        packetId: packet.packetId,
        outDir: topicDir,
        evidenceItems: packet.sourceEvidence.length,
        bySource,
        proposals: packet.existingProposals.length,
        gaps: packet.gaps.length,
        warnings: packet.warnings.length,
        databaseModified: false,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});