import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { CATEGORY_LABELS } from "./scoring.ts";
import type { BatchSummary, OverallDashboard, TopicAuditArtifacts } from "./types.ts";

function writeJson(filePath: string, payload: unknown) {
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

export function writeTopicAuditReports(
  outDir: string,
  artifacts: TopicAuditArtifacts
): string {
  const topicDir = path.join(outDir, artifacts.scorecard.topicKey);
  mkdirSync(topicDir, { recursive: true });

  writeJson(path.join(topicDir, "topic-scorecard.json"), artifacts.scorecard);
  writeFileSync(
    path.join(topicDir, "topic-scorecard.md"),
    `${buildTopicScorecardMarkdown(artifacts)}\n`
  );

  writeJson(path.join(topicDir, "ontology-audit.json"), artifacts.ontologyAudit);
  writeJson(path.join(topicDir, "graph-integrity.json"), artifacts.graphIntegrity);
  writeJson(path.join(topicDir, "relationship-audit.json"), artifacts.relationshipAudit);
  writeJson(path.join(topicDir, "claim-audit.json"), artifacts.claimAudit);
  writeJson(path.join(topicDir, "decision-point-audit.json"), artifacts.decisionPointAudit);
  writeJson(path.join(topicDir, "review-calibration.json"), artifacts.reviewCalibration);
  writeJson(path.join(topicDir, "agent-report-cards.json"), artifacts.agentReportCards);
  writeJson(path.join(topicDir, "compiler-report-card.json"), artifacts.compilerReportCard);
  writeJson(path.join(topicDir, "publication-audit.json"), artifacts.publicationAudit);
  if (artifacts.crossNeighborhood) {
    writeJson(
      path.join(topicDir, "cross-neighborhood-consistency.json"),
      artifacts.crossNeighborhood
    );
  }

  return topicDir;
}

export function writeBatchReports(outDir: string, summary: BatchSummary): void {
  mkdirSync(outDir, { recursive: true });
  writeJson(path.join(outDir, "batch-summary.json"), summary);
  writeFileSync(path.join(outDir, "batch-summary.md"), `${buildBatchSummaryMarkdown(summary)}\n`);
}

export function writeOverallDashboard(outDir: string, dashboard: OverallDashboard): void {
  mkdirSync(outDir, { recursive: true });
  writeJson(path.join(outDir, "overall-dashboard.json"), dashboard);
  writeFileSync(path.join(outDir, "overall-dashboard.md"), `${buildOverallDashboardMarkdown(dashboard)}\n`);
}

function buildTopicScorecardMarkdown(artifacts: TopicAuditArtifacts): string {
  const { scorecard, publicationAudit } = artifacts;
  const lines = [
    `# ${scorecard.displayName.toUpperCase()} — Knowledge Factory Audit`,
    "",
    `Generated: ${scorecard.generatedAt}`,
    `Auditor: KF-018 v${scorecard.auditorVersion}`,
    "",
    "## Overall",
    "",
    `| Metric | Score |`,
    `|--------|------:|`,
    `| **Overall** | **${scorecard.overallScore}** |`,
  ];

  for (const [key, score] of Object.entries(scorecard.categories)) {
    const label = CATEGORY_LABELS[key as keyof typeof CATEGORY_LABELS] ?? key;
    lines.push(`| ${label} | ${score} |`);
  }

  lines.push(
    `| Publication | ${publicationAudit.status === "READY" ? "Ready" : "Blocked"} |`,
    "",
    "## Publication",
    "",
    `- Status: **${publicationAudit.status}**`,
    `- Maturity: ${publicationAudit.currentLevel} / ${publicationAudit.requiredLevel}`,
    "",
    "### Blockers",
    "",
    ...(publicationAudit.blockers.length
      ? publicationAudit.blockers.map((b) => `- ${b}`)
      : ["- None"]),
    "",
    "## Top Findings",
    "",
    ...scorecard.topFindings.slice(0, 8).map(
      (f) =>
        `### [${f.severity.toUpperCase()}] ${f.finding}\n\n- **Evidence:** ${f.evidence}\n- **Reason:** ${f.reason}\n- **Impact:** -${f.impact}\n- **Fix:** ${f.suggestedFix}\n`
    ),
    "## Prioritized Recommendations",
    "",
    ...scorecard.prioritizedRecommendations.map(
      (r) => `${r.priority}. **[${CATEGORY_LABELS[r.category]}]** ${r.action} — _${r.impact}_`
    ),
    "",
    "## Data Source",
    "",
    `- Neighborhood: ${scorecard.dataSource.neighborhood}`,
    `- Reports loaded: ${scorecard.dataSource.reportsLoaded.length}`,
    `- Reports missing: ${scorecard.dataSource.reportsMissing.length > 0 ? scorecard.dataSource.reportsMissing.join(", ") : "none"}`,
    "",
    "## Constraints",
    "",
    "- Database modified: **no**",
    "- Content generated: **no**",
    "- Auto-approved: **no**",
    ""
  );

  return lines.join("\n");
}

function buildBatchSummaryMarkdown(summary: BatchSummary): string {
  const lines = [
    `# ${summary.displayName} — Audit Dashboard`,
    "",
    `Generated: ${summary.generatedAt}`,
    `Batch: **${summary.batchKey}**`,
    "",
    "## Neighborhoods",
    "",
    "| Neighborhood | Overall | Publication | Review Burden |",
    "|--------------|--------:|-------------|--------------:|",
    ...summary.neighborhoods.map(
      (n) =>
        `| ${n.displayName} | ${n.overallScore} | ${n.publicationStatus} | ${n.reviewBurden} |`
    ),
    "",
    "## Aggregate",
    "",
    `| Metric | Value |`,
    `|--------|------:|`,
    `| Average overall score | ${summary.aggregate.averageOverallScore} |`,
    `| Factory maturity | Level ${summary.aggregate.factoryMaturity} |`,
    `| Publication ready | ${summary.aggregate.publicationReadyCount} |`,
    `| Publication blocked | ${summary.aggregate.publicationBlockedCount} |`,
    `| Total review burden | ${summary.aggregate.totalReviewBurden} |`,
    `| Weakest category | ${CATEGORY_LABELS[summary.aggregate.weakestCategory]} |`,
    `| Strongest category | ${CATEGORY_LABELS[summary.aggregate.strongestCategory]} |`,
    "",
    "## Rankings",
    "",
    "### By quality",
    "",
    ...summary.rankings.byQuality.map((t, i) => `${i + 1}. ${t}`),
    "",
    "### By publication readiness",
    "",
    ...summary.rankings.byPublicationReadiness.map((t, i) => `${i + 1}. ${t}`),
    "",
    "## Outstanding blockers",
    "",
    ...(summary.aggregate.outstandingBlockers.length
      ? summary.aggregate.outstandingBlockers.map((b) => `- ${b}`)
      : ["- None"]),
    "",
    "## Constraints",
    "",
    "- Database modified: **no**",
    ""
  ];

  return lines.join("\n");
}

function buildOverallDashboardMarkdown(dashboard: OverallDashboard): string {
  const lines = [
    "# Knowledge Factory — Overall Audit Dashboard",
    "",
    `Generated: ${dashboard.generatedAt}`,
    `Neighborhoods audited: **${dashboard.neighborhoodCount}**`,
    "",
    "## Global Rankings — Quality",
    "",
    "| Rank | Neighborhood | Score |",
    "|------|--------------|------:|",
    ...dashboard.globalRankings.byQuality.map((n, i) => `| ${i + 1} | ${n.displayName} | ${n.score} |`),
    "",
    "## Global Rankings — Publication Readiness",
    "",
    "| Rank | Neighborhood | Ready | Score |",
    "|------|--------------|-------|------:|",
    ...dashboard.globalRankings.byPublicationReadiness.map(
      (n, i) => `| ${i + 1} | ${n.displayName} | ${n.ready ? "YES" : "NO"} | ${n.score} |`
    ),
    "",
    "## Systemic Weaknesses",
    "",
    "| Category | Avg Score | Frequency | Example |",
    "|----------|----------:|----------:|---------|",
    ...dashboard.systemicWeaknesses.map(
      (w) =>
        `| ${CATEGORY_LABELS[w.category]} | ${w.averageScore} | ${w.frequency} | ${w.exampleFinding} |`
    ),
    "",
    "## Agent Leaderboard",
    "",
    "| Agent | Avg Grade | Topics |",
    "|-------|-----------|-------:|",
    ...dashboard.agentLeaderboard.map((a) => `| ${a.agentId} | ${a.averageGrade} | ${a.topicsAudited} |`),
    "",
    "## Batch Summaries",
    "",
    ...dashboard.batches.map(
      (b) =>
        `### ${b.displayName}\n\n- Neighborhoods: ${b.neighborhoods.length}\n- Avg score: ${b.aggregate.averageOverallScore}\n- Ready: ${b.aggregate.publicationReadyCount} / Blocked: ${b.aggregate.publicationBlockedCount}\n`
    ),
    "",
    "## Constraints",
    "",
    "- Database modified: **no**",
    "- Auditor is read-only and independent from builders",
    ""
  ];

  return lines.join("\n");
}