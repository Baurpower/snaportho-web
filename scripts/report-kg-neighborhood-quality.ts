/**
 * Report neighborhood quality metrics for KG pilots.
 * Ankle pilot works offline from spec; optional DB enrichment later.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  defaultAnkleQualityInput,
  scoreNeighborhoodQuality,
  ankleSourceSummary,
} from "./lib/education/kg-neighborhood-quality.ts";

function parseArgs(argv: string[]) {
  let pilot = "ankle";
  let outDir = "reports/kg-pilots";
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--pilot") {
      pilot = argv[i + 1] ?? pilot;
      i += 1;
    } else if (argv[i] === "--out-dir") {
      outDir = argv[i + 1] ?? outDir;
      i += 1;
    }
  }
  return { pilot, outDir };
}

async function main() {
  const args = parseArgs(process.argv);
  mkdirSync(path.join(process.cwd(), args.outDir), { recursive: true });

  if (args.pilot !== "ankle") {
    console.error(`Only ankle pilot is implemented. Requested: ${args.pilot}`);
    process.exitCode = 1;
    return;
  }

  const proposalPath = path.join(process.cwd(), "reports", "kg-pilots", "ankle-proposal-packet.json");
  let approvedEntityCount = 0;
  let approvedRelationshipCount = 0;

  if (existsSync(proposalPath)) {
    const packet = JSON.parse(readFileSync(proposalPath, "utf8")) as {
      summary?: { entityProposals?: number; relationshipProposals?: number };
    };
    // Pre-apply: nothing approved in DB
    void packet;
  }

  const input = defaultAnkleQualityInput();
  const report = scoreNeighborhoodQuality({
    ...input,
    approvedEntityCount,
    approvedRelationshipCount,
  });

  const output = {
    generatedAt: new Date().toISOString(),
    pilot: args.pilot,
    sourceSummary: ankleSourceSummary(),
    quality: report,
  };

  const mdLines = [
    "# Ankle Neighborhood Quality Report",
    "",
    `Generated: ${output.generatedAt}`,
    "",
    "## Estimated maturity",
    "",
    `**Level ${report.estimatedMaturityLevel}**`,
    "",
    ...report.maturityRationale.map((r) => `- ${r}`),
    "",
    "## Metrics",
    "",
    "| Metric | Value |",
    "|--------|------:|",
    ...Object.entries(report.metrics).map(([k, v]) => `| ${k} | ${v} |`),
    "",
    "## Blockers",
    "",
    ...(report.blockers.length ? report.blockers.map((b) => `- ${b}`) : ["- None"]),
    "",
    `Traversal smoke-test ready: **${report.readyForTraversalSmokeTest ? "yes (spec-level)" : "no"}**`,
    "",
  ];

  const jsonPath = path.join(process.cwd(), args.outDir, "ankle-neighborhood-quality.json");
  const mdPath = path.join(process.cwd(), args.outDir, "ankle-neighborhood-quality.md");
  writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  writeFileSync(mdPath, `${mdLines.join("\n")}\n`, "utf8");

  console.log(JSON.stringify({ jsonPath, mdPath, estimatedMaturityLevel: report.estimatedMaturityLevel, blockers: report.blockers.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});