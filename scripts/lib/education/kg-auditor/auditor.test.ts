import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";

import { auditNeighborhood } from "./auditor.ts";
import { loadAuditInput } from "./input-loader.ts";
import { writeTopicAuditReports } from "./reports.ts";

const input = await loadAuditInput({ topic: "ankle-fracture" });
const artifacts = auditNeighborhood(input);

assert.equal(artifacts.scorecard.topicKey, "ankle-fracture");
assert.equal(artifacts.scorecard.databaseModified, false);
assert.ok(artifacts.scorecard.overallScore >= 0 && artifacts.scorecard.overallScore <= 100);
assert.equal(artifacts.publicationAudit.status, "NOT_READY");
assert.ok(artifacts.scorecard.categories.ontology_completeness >= 0);
assert.ok(artifacts.scorecard.categories.educational_quality >= 0);
assert.ok(artifacts.ontologyAudit.deductions.length > 0, "expected explainable ontology deductions");
assert.ok(
  artifacts.ontologyAudit.deductions.every(
    (d) => d.finding && d.evidence && d.reason && d.suggestedFix
  ),
  "every deduction must be explainable"
);
assert.ok(artifacts.agentReportCards.length > 0 || input.reportsMissing.includes("agent-execution-report.json"));

const outDir = path.join(process.cwd(), "reports", "kg-audits-test");
const topicDir = writeTopicAuditReports(outDir, artifacts);
assert.ok(existsSync(path.join(topicDir, "topic-scorecard.json")));
assert.ok(existsSync(path.join(topicDir, "topic-scorecard.md")));
assert.ok(existsSync(path.join(topicDir, "ontology-audit.json")));
assert.ok(existsSync(path.join(topicDir, "graph-integrity.json")));
assert.ok(existsSync(path.join(topicDir, "publication-audit.json")));

console.log("kg-auditor/auditor.test.ts: all assertions passed");
console.log(
  JSON.stringify(
    {
      topic: artifacts.scorecard.topicKey,
      overallScore: artifacts.scorecard.overallScore,
      publication: artifacts.publicationAudit.status,
      topFindings: artifacts.scorecard.topFindings.length,
      categories: artifacts.scorecard.categories,
    },
    null,
    2
  )
);