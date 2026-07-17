/**
 * KF-018 — Knowledge Factory Auditor CLI.
 *
 * Independent read-only QA gate for manufactured knowledge neighborhoods.
 *
 * Usage:
 *   npm run kg:audit -- --topic ankle-fracture
 *   npm run kg:audit -- --batch trauma
 *   npm run kg:audit -- --all
 */

import path from "node:path";

import { auditNeighborhood, buildBatchSummary, buildOverallDashboard } from "./lib/education/kg-auditor/auditor.ts";
import { BATCH_REGISTRY, listAllAuditTopics, listBatchKeys, resolveBatch } from "./lib/education/kg-auditor/batch-registry.ts";
import { loadAuditInput } from "./lib/education/kg-auditor/input-loader.ts";
import {
  writeBatchReports,
  writeOverallDashboard,
  writeTopicAuditReports,
} from "./lib/education/kg-auditor/reports.ts";
import { listRegisteredTopics } from "./lib/education/kg-compiler/topic-registry.ts";
import type { TopicAuditArtifacts } from "./lib/education/kg-auditor/types.ts";

function parseArgs(argv: string[]) {
  let topic = "";
  let batch = "";
  let all = false;
  let dbBacked = false;
  let strictDb = false;
  let batchKey = "";
  let outDir = "reports/kg-audits";

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--topic") {
      topic = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--batch") {
      batch = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--all") {
      all = true;
    } else if (arg === "--db-backed") {
      dbBacked = true;
    } else if (arg === "--strict-db") {
      dbBacked = true;
      strictDb = true;
    } else if (arg === "--batch-key") {
      batchKey = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--out-dir") {
      outDir = argv[i + 1] ?? outDir;
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      topic = "__help__";
    }
  }

  return { topic, batch, all, dbBacked, strictDb, batchKey, outDir };
}

function printHelp() {
  console.log(
    [
      "Knowledge Factory Auditor (KF-018) — read-only neighborhood QA",
      "",
      "Usage:",
      "  npm run kg:audit -- --topic <topic-key>",
      "  npm run kg:audit -- --batch <batch-key>",
      "  npm run kg:audit -- --all",
      "",
      "Options:",
      "  --db-backed    Prefer DB-backed neighborhood and proposals (read-only)",
      "  --strict-db    Require DB neighborhood; prohibit file/spec fallback",
      "  --batch-key    Restrict proposal-driven membership to a staging batch",
      "  --out-dir      Output directory (default: reports/kg-audits)",
      "",
      "Registered topics:",
      ...listRegisteredTopics().map((t) => `  - ${t.topicKey} (${t.displayName})`),
      "",
      "Registered batches:",
      ...listBatchKeys().map((b) => `  - ${b}`),
      "",
      "Constraints:",
      "  - Never modifies database or neighborhood content",
      "  - Reuses existing compiler/evidence reports when available",
    ].join("\n")
  );
}

async function auditTopics(
  topicKeys: string[],
  options: { dbBacked: boolean; strictDb?: boolean; batchKey?: string; outDir: string; crossNeighborhoodInputs?: boolean }
): Promise<TopicAuditArtifacts[]> {
  const inputs = [];
  for (const topicKey of topicKeys) {
    inputs.push(
      await loadAuditInput({
        topic: topicKey,
        dbBacked: options.dbBacked,
        strictDb: options.strictDb,
        batchKey: options.batchKey,
      })
    );
  }

  const crossInputs = options.crossNeighborhoodInputs ? inputs : undefined;
  const artifacts: TopicAuditArtifacts[] = [];

  for (const input of inputs) {
    const result = auditNeighborhood(input, crossInputs);
    writeTopicAuditReports(options.outDir, result);
    artifacts.push(result);
  }

  return artifacts;
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.topic === "__help__") {
    printHelp();
    return;
  }

  const outDir = path.join(process.cwd(), args.outDir);
  const modeCount = [args.topic, args.batch, args.all].filter(Boolean).length;
  if (modeCount !== 1) {
    printHelp();
    process.exitCode = 1;
    return;
  }

  if (args.topic) {
    const artifacts = await auditTopics([args.topic], {
      dbBacked: args.dbBacked,
      strictDb: args.strictDb,
      batchKey: args.batchKey || undefined,
      outDir,
    });
    const scorecard = artifacts[0].scorecard;
    console.log(
      JSON.stringify(
        {
          ok: true,
          mode: "topic",
          topic: scorecard.topicKey,
          overallScore: scorecard.overallScore,
          publication: scorecard.publication.status,
          outDir: path.join(outDir, scorecard.topicKey),
          reportsMissing: scorecard.dataSource.reportsMissing,
          databaseModified: false,
        },
        null,
        2
      )
    );
    return;
  }

  if (args.batch) {
    const batchDef = resolveBatch(args.batch);
    if (!batchDef) {
      console.error(`Unknown batch: ${args.batch}. Registered: ${listBatchKeys().join(", ")}`);
      process.exitCode = 1;
      return;
    }

    const artifacts = await auditTopics(batchDef.topicKeys, {
      dbBacked: args.dbBacked,
      outDir,
      crossNeighborhoodInputs: true,
    });

    const summary = buildBatchSummary(batchDef.batchKey, batchDef.displayName, artifacts);
    const batchOutDir = path.join(outDir, "batches", batchDef.batchKey);
    writeBatchReports(batchOutDir, summary);

    console.log(
      JSON.stringify(
        {
          ok: true,
          mode: "batch",
          batch: batchDef.batchKey,
          neighborhoods: summary.neighborhoods.length,
          averageScore: summary.aggregate.averageOverallScore,
          publicationReady: summary.aggregate.publicationReadyCount,
          publicationBlocked: summary.aggregate.publicationBlockedCount,
          outDir: batchOutDir,
          databaseModified: false,
        },
        null,
        2
      )
    );
    return;
  }

  if (args.all) {
    const allTopics = listAllAuditTopics();
    const artifacts = await auditTopics(allTopics, {
      dbBacked: args.dbBacked,
      outDir,
      crossNeighborhoodInputs: true,
    });

    const batchSummaries = BATCH_REGISTRY.map((batchDef) => {
      const batchArtifacts = artifacts.filter((a) =>
        batchDef.topicKeys.includes(a.scorecard.topicKey)
      );
      const summary = buildBatchSummary(batchDef.batchKey, batchDef.displayName, batchArtifacts);
      writeBatchReports(path.join(outDir, "batches", batchDef.batchKey), summary);
      return summary;
    });

    const dashboard = buildOverallDashboard(batchSummaries, artifacts);
    writeOverallDashboard(outDir, dashboard);

    console.log(
      JSON.stringify(
        {
          ok: true,
          mode: "all",
          neighborhoods: artifacts.length,
          averageScore: Math.round(
            artifacts.reduce((s, a) => s + a.scorecard.overallScore, 0) / artifacts.length
          ),
          publicationReady: artifacts.filter((a) => a.publicationAudit.ready).length,
          publicationBlocked: artifacts.filter((a) => !a.publicationAudit.ready).length,
          outDir,
          databaseModified: false,
        },
        null,
        2
      )
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
