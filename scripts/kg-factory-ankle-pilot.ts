/**
 * KF-016 — Ankle Knowledge Factory pipeline orchestrator.
 *
 * Subcommands: generate | persist | curate | review | dry-run | quality | publication | migrate-validate
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { writeSnapshot } from "./kg-automation-common.ts";
import { ANKLE_PILOT_KEY } from "./lib/education/kg-ankle-pilot-spec.ts";
import { buildAnkleProposalPacket } from "./lib/education/kg-factory/proposal-builder.ts";
import {
  curateProposalBatch,
  summarizeCurationRoutes,
} from "./lib/education/kg-factory/intelligent-curator.ts";
import { dryRunApplyProposals } from "./lib/education/kg-factory/dry-run-apply.ts";
import { loadDbQualityMetrics } from "./lib/education/kg-factory/db-quality.ts";
import { buildHumanReviewPacket } from "./lib/education/kg-factory/human-review-packet.ts";
import { persistProposals, loadPilotProposals } from "./lib/education/kg-factory/persist.ts";
import { assessPublicationReadiness } from "./lib/education/kg-factory/publication-readiness.ts";
import { validateProposalPacket } from "./lib/education/kg-factory/validator.ts";
import type { CurationReport } from "./lib/education/kg-factory/types.ts";

const OUT_DIR = path.join(process.cwd(), "reports", "kg-pilots");
const DOCS_DIR = path.join(process.cwd(), "docs", "knowledge-graph", "pilots");

function ensureDirs() {
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(DOCS_DIR, { recursive: true });
}

function loadCuratedProposals() {
  const file = path.join(OUT_DIR, "ankle-curated-proposals.json");
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8")) as {
    proposals: import("./kg-automation-common.ts").ProposalRecord[];
    curation: CurationReport;
  };
}

async function cmdGenerate() {
  ensureDirs();
  const packet = buildAnkleProposalPacket();
  const out = {
    generatedAt: new Date().toISOString(),
    pilotKey: packet.pilotKey,
    summary: {
      proposals: packet.proposals.length,
      validationErrors: packet.validationErrors.length,
    },
    proposals: packet.proposals,
    validationErrors: packet.validationErrors,
  };
  writeFileSync(path.join(OUT_DIR, "ankle-proposal-packet.json"), `${JSON.stringify(out, null, 2)}\n`);
  writeSnapshot(OUT_DIR, {
    generatedAt: out.generatedAt,
    tableAvailable: false,
    persistedToDatabase: false,
    proposalCount: packet.proposals.length,
    proposals: packet.proposals,
  });
  console.log(JSON.stringify({ ok: packet.validationErrors.length === 0, ...out.summary }, null, 2));
  if (packet.validationErrors.length) process.exitCode = 1;
}

async function cmdPersist() {
  ensureDirs();
  const packet = buildAnkleProposalPacket();
  const result = await persistProposals(packet.proposals);
  writeFileSync(path.join(OUT_DIR, "ankle-persist-result.json"), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
}

async function cmdCurate() {
  ensureDirs();
  const packet = buildAnkleProposalPacket();
  const { curated, decisions } = curateProposalBatch(packet.proposals);
  const summary = summarizeCurationRoutes(decisions);
  const curation: CurationReport = {
    generatedAt: new Date().toISOString(),
    pilotKey: ANKLE_PILOT_KEY,
    summary,
    decisions: decisions.map((d, i) => ({
      proposal_fingerprint: curated[i].proposal_fingerprint,
      proposal_type: curated[i].proposal_type,
      route: d.route,
      scores: d.scores,
      recommendation: d.recommendation,
      rationale: d.rationale,
      reviewerDecisionRequired: d.reviewerDecisionRequired,
      revised: Object.keys(d.revisions).length > 0,
      final_review_status: curated[i].review_status,
    })),
  };

  writeFileSync(path.join(OUT_DIR, "ankle-curated-proposals.json"), `${JSON.stringify({ proposals: curated, curation }, null, 2)}\n`);
  writeFileSync(path.join(OUT_DIR, "ankle-curation-report.json"), `${JSON.stringify(curation, null, 2)}\n`);

  const humanPct =
    ((summary.HUMAN_REVIEW + summary.ATTENDING_REVIEW) / Math.max(curated.length, 1)) * 100;
  const autoPct = ((summary.AUTO_APPROVED_LOW_RISK + summary.AUTO_REVISED) / Math.max(curated.length, 1)) * 100;

  console.log(
    JSON.stringify(
      {
        total: curated.length,
        summary,
        humanReviewPercent: Math.round(humanPct),
        autoCuratedPercent: Math.round(autoPct),
        workloadReductionEstimate: `${Math.round(autoPct)}% auto-curated`,
      },
      null,
      2
    )
  );

  try {
    const persistResult = await Promise.race([
      persistProposals(curated),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("persist timed out after 15s")), 15_000)
      ),
    ]);
    writeFileSync(
      path.join(OUT_DIR, "ankle-persist-result.json"),
      `${JSON.stringify(persistResult, null, 2)}\n`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeFileSync(
      path.join(OUT_DIR, "ankle-persist-result.json"),
      `${JSON.stringify({ tableAvailable: false, inserted: 0, updated: 0, skipped: 0, errors: [message] }, null, 2)}\n`
    );
    console.warn(`persist skipped: ${message}`);
  }
}

async function cmdReview() {
  ensureDirs();
  const data = loadCuratedProposals();
  if (!data) {
    console.error("Run curate first.");
    process.exitCode = 1;
    return;
  }
  const { markdown, items } = buildHumanReviewPacket(data.proposals, data.curation);
  writeFileSync(path.join(OUT_DIR, "ankle-human-review-queue.md"), `${markdown}\n`);
  writeFileSync(path.join(OUT_DIR, "ankle-human-review-queue.json"), `${JSON.stringify(items, null, 2)}\n`);
  writeFileSync(path.join(DOCS_DIR, "ankle-human-review-queue.md"), `${markdown}\n`);
  console.log(JSON.stringify({ humanReviewItems: items.length, md: path.join(OUT_DIR, "ankle-human-review-queue.md") }, null, 2));
}

async function cmdDryRun() {
  const data = loadCuratedProposals();
  const proposals = data?.proposals ?? buildAnkleProposalPacket().proposals;
  const mutations = dryRunApplyProposals(proposals);
  writeFileSync(path.join(OUT_DIR, "ankle-dry-run-mutations.json"), `${JSON.stringify(mutations, null, 2)}\n`);
  console.log(JSON.stringify({ mutations: mutations.length, kinds: [...new Set(mutations.map((m) => m.kind))] }, null, 2));
}

async function cmdQuality() {
  ensureDirs();
  const data = loadCuratedProposals();
  const proposals = data?.proposals ?? (await loadPilotProposals(ANKLE_PILOT_KEY));
  const fallback = proposals.length ? proposals : buildAnkleProposalPacket().proposals;
  const report = await loadDbQualityMetrics(ANKLE_PILOT_KEY, fallback);
  writeFileSync(path.join(OUT_DIR, "ankle-db-quality.json"), `${JSON.stringify(report, null, 2)}\n`);
  const md = [
    "# Database Quality — Ankle Pilot",
    "",
    `Source: **${report.source}**`,
    `Maturity: **Level ${report.estimatedMaturityLevel}**`,
    "",
    "## Metrics",
    ...Object.entries(report.metrics).map(([k, v]) => `- ${k}: ${v}`),
    "",
  ].join("\n");
  writeFileSync(path.join(OUT_DIR, "ankle-db-quality.md"), `${md}\n`);
  console.log(JSON.stringify(report, null, 2));
}

async function cmdPublication() {
  ensureDirs();
  const data = loadCuratedProposals();
  const proposals = data?.proposals ?? buildAnkleProposalPacket().proposals;
  const validation = validateProposalPacket(ANKLE_PILOT_KEY, proposals);
  const report = assessPublicationReadiness(ANKLE_PILOT_KEY, proposals, validation, data?.curation);
  writeFileSync(path.join(OUT_DIR, "publication-readiness.json"), `${JSON.stringify(report, null, 2)}\n`);
  const md = [
    "# Publication Readiness — Ankle Pilot",
    "",
    `Ready: **${report.ready}**`,
    `Maturity: **Level ${report.estimatedMaturityLevel}**`,
    "",
    "## Blockers",
    ...report.blockers.map((b) => `- ${b}`),
    "",
    "## Recommended actions",
    ...report.recommendedActions.map((a) => `- ${a}`),
    "",
  ].join("\n");
  writeFileSync(path.join(OUT_DIR, "publication-readiness.md"), `${md}\n`);
  console.log(JSON.stringify({ ready: report.ready, maturity: report.estimatedMaturityLevel, blockers: report.blockers.length }, null, 2));
}

async function cmdMigrateValidate() {
  const migrationPath = path.join(
    process.cwd(),
    "supabase/migrations/20260705_120000_ankle_pilot_kg_vocabulary.sql"
  );
  const sql = readFileSync(migrationPath, "utf8");
  const destructive = /\bdrop\s+table\b/i.test(sql) && !sql.includes("drop table if exists public.decision_points");
  const additive = sql.includes("alter table") && sql.includes("create table if not exists");
  const report = {
    migrationPath,
    additive,
    destructiveDataOps: /\bdelete\s+from\b|\btruncate\b/i.test(sql),
    createsClaimsTable: sql.includes("educational_claims"),
    createsDecisionPointsTable: sql.includes("decision_points"),
    extendsPredicates: sql.includes("injured_in"),
    rollbackDocumented: sql.includes("Rollback:"),
    productionSafe: !sql.includes("production"),
    recommendation: "Apply to staging/development only via Supabase SQL editor or CI migration runner",
    applied: false,
  };
  writeFileSync(path.join(OUT_DIR, "migration-validation.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

async function main() {
  const cmd = process.argv[2] ?? "help";
  switch (cmd) {
    case "generate":
      await cmdGenerate();
      break;
    case "persist":
      await cmdPersist();
      break;
    case "curate":
      await cmdCurate();
      break;
    case "review":
      await cmdReview();
      break;
    case "dry-run":
      await cmdDryRun();
      break;
    case "quality":
      await cmdQuality();
      break;
    case "publication":
      await cmdPublication();
      break;
    case "migrate-validate":
      await cmdMigrateValidate();
      break;
    default:
      console.log(
        "Usage: kg-factory-ankle-pilot.ts <generate|persist|curate|review|dry-run|quality|publication|migrate-validate>"
      );
      process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});