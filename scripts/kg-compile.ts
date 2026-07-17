/**
 * Ontology Compiler CLI — primary entry point for KG neighborhood expansion.
 *
 * Usage: npm run kg:compile -- --topic ankle-fracture
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildAgentAssignmentPlan,
  buildAgentContractSummary,
  buildAgentOutputSummary,
  buildReviewerBurdenEstimate,
  buildUnmetAgentCapabilities,
} from "./lib/education/kg-agent-framework/agent-reports.ts";
import { getAgentRegistry } from "./lib/education/kg-agent-framework/registry.ts";
import { registerDefaultAgents } from "./lib/education/kg-agent-framework/register-default-agents.ts";
import {
  buildClaimBuilderSummaryMd,
  buildEvidenceClaimTrace,
} from "./lib/education/kg-agent-framework/claim-builder/claim-builder-reports.ts";
import { compileNeighborhood } from "./lib/education/kg-compiler/compiler.ts";
import { listRegisteredTopics } from "./lib/education/kg-compiler/topic-registry.ts";

function parseArgs(argv: string[]) {
  let topic = "";
  let outDir = "reports/kg-compiler";
  let dbBacked = false;
  let strictDb = false;
  let batchKey = "";
  let useEvidence = false;
  let evidencePath = "";

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--topic") {
      topic = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--out-dir") {
      outDir = argv[i + 1] ?? outDir;
      i += 1;
    } else if (arg === "--db-backed") {
      dbBacked = true;
    } else if (arg === "--strict-db") {
      dbBacked = true;
      strictDb = true;
    } else if (arg === "--batch-key") {
      batchKey = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--use-evidence") {
      useEvidence = true;
    } else if (arg === "--evidence") {
      evidencePath = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      topic = "__help__";
    }
  }

  return { topic, outDir, dbBacked, strictDb, batchKey, useEvidence, evidencePath };
}

function buildSummaryMarkdown(result: Awaited<ReturnType<typeof compileNeighborhood>>) {
  const { plan, gaps, workPlan, autoReview, publication } = result;
  const topGaps = gaps.slice(0, 12);

  return [
    `# Ontology Compiler — ${plan.displayName}`,
    "",
    `Generated: ${plan.generatedAt}`,
    "",
    "## Executive summary",
    "",
    `| Metric | Value |`,
    `|--------|------:|`,
    `| Entities | ${plan.neighborhood.entityCount} |`,
    `| Relationships | ${plan.neighborhood.relationshipCount} |`,
    `| Claims (draft) | ${plan.neighborhood.claimCount} |`,
    `| Decision points (draft) | ${plan.neighborhood.decisionPointCount} |`,
    `| Ontology gaps | ${plan.gaps.total} |`,
    `| Work items | ${plan.workPlan.workItemCount} |`,
    `| Proposals reviewed | ${plan.review.totalProposals} |`,
    `| Auto-approved | ${plan.review.autoApproved} (${100 - plan.review.humanReviewPercent}%) |`,
    `| Human review queue | ${plan.review.humanReview} (${plan.review.humanReviewPercent}%) |`,
    `| Maturity | Level ${publication.currentLevel} / ${publication.requiredLevel} required |`,
    `| Publication ready | **${publication.ready ? "yes" : "no"}** |`,
    "",
    "## Pipeline stages",
    "",
    ...plan.stages.map(
      (s) => `- **Stage ${s.stage} — ${s.name}** (${s.status}): ${s.summary}`
    ),
    "",
    "## Required agents",
    "",
    ...plan.workPlan.agentsRequired.map((a) => `- ${a}`),
    "",
    "## Top gaps",
    "",
    ...(topGaps.length
      ? topGaps.map(
          (g) =>
            `- **[${g.priority}]** ${g.kind}: ${g.reason} _(rule: ${g.ontologyRule}, reviewer: ${g.requiredReviewer})_`
        )
      : ["- None"]),
    "",
    "## Publication blockers",
    "",
    ...(publication.blockers.length
      ? publication.blockers.map((b) => `- ${b}`)
      : ["- None"]),
    "",
    "## Auto-review distribution",
    "",
    `| Category | Count |`,
    `|----------|------:|`,
    `| AUTO_APPROVE | ${autoReview.summary.AUTO_APPROVE} |`,
    `| SAFE_REVIEW | ${autoReview.summary.SAFE_REVIEW} |`,
    `| EXPERT_REVIEW | ${autoReview.summary.EXPERT_REVIEW} |`,
    `| REJECT | ${autoReview.summary.REJECT} |`,
    "",
    "## Constraints",
    "",
    "- Database modified: **no**",
    "- Auto-published: **no**",
    "",
    "## Next command",
    "",
    "```bash",
    "npm run kg:pilot:ankle:curate   # run factory curation on proposals",
    "npm run kg:pilot:ankle:review   # export human review queue",
    "```",
    "",
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.topic || args.topic === "__help__") {
    console.log(
      [
        "Usage: npm run kg:compile -- --topic <topic-key> [--db-backed] [--strict-db] [--batch-key <key>] [--use-evidence] [--evidence <path>]",
        "",
        "Registered topics:",
        ...listRegisteredTopics().map((t) => `  - ${t.topicKey} (${t.displayName})`),
      ].join("\n")
    );
    process.exitCode = args.topic === "__help__" ? 0 : 1;
    return;
  }

  const result = await compileNeighborhood({
    topic: args.topic,
    dbBacked: args.dbBacked,
    strictDb: args.strictDb,
    batchKey: args.batchKey || undefined,
    useEvidence: args.useEvidence,
    evidencePath: args.evidencePath || undefined,
  });
  const topicDir = path.join(process.cwd(), args.outDir, result.plan.topicKey);
  mkdirSync(topicDir, { recursive: true });

  registerDefaultAgents();
  const registry = getAgentRegistry();
  const assignmentPlan = buildAgentAssignmentPlan(
    result.plan.topicKey,
    result.plan.pilotKey,
    result.gaps,
    result.workPlan,
    registry
  );
  const unmetCapabilities = buildUnmetAgentCapabilities(result.plan.topicKey, result.gaps, registry);
  const reviewerBurdenMd = buildReviewerBurdenEstimate(result.autoReview, result.workPlan);
  const contractSummaryMd = buildAgentContractSummary(
    result.plan.topicKey,
    assignmentPlan,
    unmetCapabilities
  );
  const agentOutputSummaryMd = result.agentExecution
    ? buildAgentOutputSummary(result.agentExecution)
    : "# Agent Output Summary\n\nNo agent execution report.\n";

  const writes: Array<[string, unknown]> = [
    ["ontology-compiler-plan.json", result.plan],
    ["ontology-gap-report.json", { generatedAt: result.plan.generatedAt, gaps: result.gaps, summary: result.plan.gaps }],
    ["ontology-work-plan.json", result.workPlan],
    ["ontology-auto-review.json", result.autoReview],
    ["ontology-publication-readiness.json", result.publication],
    ["publication-readiness.json", result.publication],
    ["ontology-merged-draft.json", result.mergedDraft],
    ["merged-neighborhood-draft.json", result.mergedDraft],
    ["ontology-neighborhood-plan.json", result.neighborhoodPlan],
    ["ontology-human-review-queue.json", result.humanReviewItems],
    [
      "ontology-data-source.json",
      {
        neighborhood: result.dataSource.neighborhood,
        proposals: result.dataSource.proposals,
        dbCounts: result.dataSource.dbSnapshot?.dbCounts,
        dbLoaded: result.dataSource.dbSnapshot?.loaded ?? false,
      },
    ],
    ["agent-assignment-plan.json", assignmentPlan],
    ["unmet-agent-capabilities.json", unmetCapabilities],
    ...(result.agentExecution ? [["agent-execution-report.json", result.agentExecution] as [string, unknown]] : []),
    ...(result.conflictReport ? [["conflict-report.json", result.conflictReport] as [string, unknown]] : []),
    ...(result.claimBuilderReport
      ? [
          ["claim-builder-output.json", result.claimBuilderReport] as [string, unknown],
          ["evidence-claim-trace.json", buildEvidenceClaimTrace(result.claimBuilderReport)] as [
            string,
            unknown,
          ],
        ]
      : []),
  ];

  for (const [name, payload] of writes) {
    writeFileSync(path.join(topicDir, name), `${JSON.stringify(payload, null, 2)}\n`);
  }

  const summaryMd = buildSummaryMarkdown(result);
  writeFileSync(path.join(topicDir, "ontology-neighborhood-summary.md"), `${summaryMd}\n`);
  writeFileSync(path.join(topicDir, "reviewer-burden-estimate.md"), `${reviewerBurdenMd}\n`);
  writeFileSync(path.join(topicDir, "agent-contract-summary.md"), `${contractSummaryMd}\n`);
  writeFileSync(path.join(topicDir, "agent-output-summary.md"), `${agentOutputSummaryMd}\n`);
  if (result.claimBuilderReport) {
    writeFileSync(
      path.join(topicDir, "claim-builder-summary.md"),
      `${buildClaimBuilderSummaryMd(result.claimBuilderReport)}\n`
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        topic: result.plan.topicKey,
        outDir: topicDir,
        gaps: result.gaps.length,
        workItems: result.workPlan.workItems.length,
        autoApproved: result.autoReview.summary.AUTO_APPROVE,
        humanReviewPercent: result.autoReview.humanReviewPercent,
        maturity: `${result.publication.currentLevel}/${result.publication.requiredLevel}`,
        publicationReady: result.publication.ready,
        blockers: result.publication.blockers.length,
        agentsExecuted: result.agentExecution?.entries.length ?? 0,
        agentFailures: result.agentExecution?.failedAgents ?? 0,
        conflicts: result.conflictReport?.totalConflicts ?? 0,
        evidencePacketId: result.plan.evidencePacketId ?? null,
        dataSource: result.dataSource,
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
