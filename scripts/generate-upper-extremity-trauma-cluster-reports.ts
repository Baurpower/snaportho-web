/**
 * Consolidated batch reports for the upper extremity trauma cluster (5 neighborhoods).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const PILOT_OUT = path.join(process.cwd(), "reports", "kg-pilots");
const COMPILER_OUT = path.join(process.cwd(), "reports", "kg-compiler");
const BATCH_OUT = path.join(process.cwd(), "reports", "kg-batches");

type ClusterTopic = {
  topicKey: string;
  displayName: string;
  pilotKey: string;
  curriculumNode: string;
  anki: number;
  ob: number;
};

const CLUSTER: ClusterTopic[] = [
  {
    topicKey: "clavicle-fracture",
    displayName: "Clavicle Fracture",
    pilotKey: "clavicle-fracture-neighborhood",
    curriculumNode: "trauma-clavicle-fractures-midshaft",
    anki: 0,
    ob: 22,
  },
  {
    topicKey: "proximal-humerus-fracture",
    displayName: "Proximal Humerus Fracture",
    pilotKey: "proximal-humerus-fracture-neighborhood",
    curriculumNode: "trauma-proximal-humerus-fractures",
    anki: 0,
    ob: 57,
  },
  {
    topicKey: "humeral-shaft-fracture",
    displayName: "Humeral Shaft Fracture",
    pilotKey: "humeral-shaft-fracture-neighborhood",
    curriculumNode: "trauma-humeral-shaft-fractures",
    anki: 10,
    ob: 47,
  },
  {
    topicKey: "distal-humerus-fracture",
    displayName: "Distal Humerus Fracture",
    pilotKey: "distal-humerus-fracture-neighborhood",
    curriculumNode: "trauma-distal-humerus-fractures",
    anki: 7,
    ob: 26,
  },
  {
    topicKey: "supracondylar-humerus-fracture",
    displayName: "Supracondylar Humerus Fracture",
    pilotKey: "supracondylar-humerus-fracture-neighborhood",
    curriculumNode: "pediatrics-supracondylar-fracture-pediatric",
    anki: 0,
    ob: 58,
  },
];

const SHARED_ANATOMY_SLUGS = [
  "upper-extremity-trauma-anatomy-hub",
  "clavicle",
  "ac-joint",
  "sternoclavicular-joint",
  "proximal-humerus",
  "humeral-head",
  "surgical-neck",
  "axillary-nerve",
  "humeral-shaft",
  "radial-nerve",
  "brachial-artery",
  "distal-humerus",
  "medial-column",
  "lateral-column",
  "olecranon-fossa",
  "capitellum",
  "trochlea",
  "anterior-interosseous-nerve",
  "median-nerve",
  "ulnar-nerve",
  "elbow-joint",
];

function readJson<T>(file: string): T | null {
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

function readPilotJson<T>(topicKey: string, name: string): T | null {
  return readJson<T>(path.join(PILOT_OUT, `${topicKey}-${name}`));
}

function readCompilerJson<T>(topicKey: string, name: string): T | null {
  return readJson<T>(path.join(COMPILER_OUT, topicKey, name));
}

function categorizeProposal(p: {
  proposal_type: string;
  proposed_predicate?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const route = String(p.metadata?.curation_route ?? "");
  const claimType = String(p.metadata?.claim_type ?? "");
  const pred = String(p.proposed_predicate ?? "");

  if (route === "AUTO_APPROVED_LOW_RISK" || route === "AUTO_REVISED") return "safe_curator_approval";
  if (route === "REJECTED") return "reject_revise";
  if (route === "ATTENDING_REVIEW") return "needs_attending";
  if (p.proposal_type === "propose_decision_point") return "needs_attending";
  if (["at_risk_structure", "indicates_treatment", "treated_by", "uses_fixation", "explains_instability"].includes(pred)) {
    return "needs_attending";
  }
  if (["board_trap", "red_flag", "clinical_script", "cognitive_trap"].includes(claimType)) return "needs_clinical";
  if (route === "HUMAN_REVIEW") return "needs_clinical";
  return "schema_ontology";
}

function buildSummary(): string {
  const lines: string[] = [
    "# Upper Extremity Trauma Cluster — Manufacturing Summary",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Five neighborhoods manufactured via Knowledge Factory operator pipeline:",
    "Evidence → Compiler → Gap Analysis → Work Planner → Agent Execution → Merge → Auto Review → Human Queue → Publication Validation → Staging Apply → DB-backed compile.",
    "",
    "## Cluster topics",
    "",
    "| Neighborhood | Topic key | Curriculum node | Anki | OB | Factory maturity | Publication |",
    "|--------------|-----------|-----------------|-----:|---:|-----------------:|:-----------:|",
  ];

  for (const topic of CLUSTER) {
    const quality = readPilotJson<{ estimatedMaturityLevel: number }>(topic.topicKey, "db-quality.json");
    const pub = readPilotJson<{ ready: boolean }>(topic.topicKey, "publication-readiness.json");
    lines.push(
      `| ${topic.displayName} | \`${topic.topicKey}\` | \`${topic.curriculumNode}\` | ${topic.anki} | ${topic.ob} | ${quality?.estimatedMaturityLevel ?? "—"} | ${pub?.ready ? "ready" : "blocked"} |`
    );
  }

  lines.push(
    "",
    "## Shared upper-extremity trauma anatomy",
    "",
    "Owned by clavicle-fracture pilot (`upper-extremity-trauma-cluster-shared`). Siblings reference these slugs; staging apply skips duplicate entity creation.",
    "",
    ...SHARED_ANATOMY_SLUGS.map((s) => `- \`${s}\``),
    "",
    "## Gating policy applied",
    "",
    "- Neurovascular-risk edges (`at_risk_structure`) → attending review",
    "- Operative indications, fixation/arthroplasty decisions → attending review",
    "- Pediatric supracondylar vascular/nerve DPs → attending review",
    "- Board traps and cognitive traps → clinical review",
    "- Decision points not applied to staging without explicit draft mode",
    "",
    "## Per-topic report paths",
    ""
  );

  for (const topic of CLUSTER) {
    lines.push(`### ${topic.displayName}`, "");
    lines.push(`- Evidence: \`reports/kg-evidence/${topic.topicKey}/\``);
    lines.push(`- Compiler: \`reports/kg-compiler/${topic.topicKey}/\``);
    lines.push(`- Factory: \`reports/kg-pilots/${topic.topicKey}-*\``, "");
  }

  return lines.join("\n");
}

function buildReviewQueue(): string {
  const lines: string[] = [
    "# Upper Extremity Trauma Cluster — Review Queue",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
  ];

  for (const topic of CLUSTER) {
    const curated = readPilotJson<{ proposals: Array<Record<string, unknown>> }>(topic.topicKey, "curated-proposals.json");
    const queue = readPilotJson<Array<Record<string, unknown>>>(topic.topicKey, "human-review-queue.json");
    const buckets: Record<string, number> = {
      safe_curator_approval: 0,
      needs_clinical: 0,
      needs_attending: 0,
      reject_revise: 0,
      schema_ontology: 0,
    };
    for (const p of curated?.proposals ?? []) {
      buckets[categorizeProposal(p as Parameters<typeof categorizeProposal>[0])] += 1;
    }
    lines.push(`## ${topic.displayName}`, "");
    lines.push("| Bucket | Count |");
    lines.push("|--------|------:|");
    lines.push(`| Safe curator approval | ${buckets.safe_curator_approval} |`);
    lines.push(`| Needs clinical judgment | ${buckets.needs_clinical} |`);
    lines.push(`| Needs attending judgment | ${buckets.needs_attending} |`);
    lines.push(`| Human review queue items | ${queue?.length ?? 0} |`, "");
    if (queue?.length) {
      for (const item of queue.slice(0, 8)) {
        lines.push(`- **${item.route}** — ${item.target} (${item.proposal_type})`);
      }
      if (queue.length > 8) lines.push(`- …and ${queue.length - 8} more`, "");
    }
  }
  return lines.join("\n");
}

function buildStagingApply(): string {
  const lines: string[] = [
    "# Upper Extremity Trauma Cluster — Staging Apply",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Staging target: `geznczcokbgybsseipjg` with `KG_TARGET_ENV=staging`. Production modified: **no**.",
    "Order: clavicle (shared anatomy owner) → proximal humerus → humeral shaft → distal humerus → supracondylar.",
    "",
    "| Neighborhood | Entities | Relationships | Bridges | Draft claims | DPs applied |",
    "|--------------|--------:|--------------:|--------:|-------------:|------------:|",
  ];
  for (const topic of CLUSTER) {
    const apply = readPilotJson<{ cumulativeApply?: Record<string, number>; applied?: Record<string, number> }>(
      topic.topicKey,
      "staging-apply-result.json"
    );
    const a = apply?.cumulativeApply ?? apply?.applied ?? {};
    lines.push(
      `| ${topic.displayName} | ${a.entities ?? "—"} | ${a.relationships ?? "—"} | ${a.bridges ?? "—"} | ${a.claims_draft ?? "—"} | ${a.decision_points_draft ?? 0} |`
    );
  }
  lines.push(
    "",
    "All applied rows: `staging_apply: true`, `clinical_verification: false`, claims as `generated_draft` / `unreviewed`.",
    ""
  );
  return lines.join("\n");
}

function buildQualityJson(): Record<string, unknown> {
  const topics: Record<string, unknown> = {};
  for (const topic of CLUSTER) {
    topics[topic.topicKey] = {
      displayName: topic.displayName,
      pilotKey: topic.pilotKey,
      factoryQuality: readPilotJson(topic.topicKey, "db-quality.json"),
      factoryPublication: readPilotJson(topic.topicKey, "publication-readiness.json"),
      compilerPublication: readCompilerJson(topic.topicKey, "ontology-publication-readiness.json"),
      dataSource: readCompilerJson(topic.topicKey, "ontology-data-source.json"),
      evidencePacketId: readJson<Record<string, unknown>>(
        path.join(process.cwd(), "reports", "kg-evidence", topic.topicKey, "evidence-packet.json")
      )?.packetId ?? null,
    };
  }
  return {
    generatedAt: new Date().toISOString(),
    cluster: "upper-extremity-trauma",
    topics,
    sharedAnatomySlugs: SHARED_ANATOMY_SLUGS,
    publicationBlocked: true,
    clinicalVerification: false,
    stagingOnly: true,
    aggregate: {
      topicCount: CLUSTER.length,
      factoryMaturityLevels: CLUSTER.map((t) => readPilotJson<{ estimatedMaturityLevel: number }>(t.topicKey, "db-quality.json")?.estimatedMaturityLevel ?? null),
      allDbBackedCompileOk: CLUSTER.every((t) => readCompilerJson<{ dbLoaded?: boolean }>(t.topicKey, "ontology-data-source.json")?.dbLoaded === true),
      allCompilerAgentsOk: CLUSTER.every((t) => (readCompilerJson<{ agents?: { failed?: number } }>(t.topicKey, "ontology-compiler-plan.json")?.agents?.failed ?? 0) === 0),
    },
  };
}

function main() {
  mkdirSync(BATCH_OUT, { recursive: true });
  writeFileSync(path.join(BATCH_OUT, "upper-extremity-trauma-cluster-summary.md"), `${buildSummary()}\n`);
  writeFileSync(path.join(BATCH_OUT, "upper-extremity-trauma-cluster-review-queue.md"), `${buildReviewQueue()}\n`);
  writeFileSync(path.join(BATCH_OUT, "upper-extremity-trauma-cluster-staging-apply.md"), `${buildStagingApply()}\n`);
  writeFileSync(path.join(BATCH_OUT, "upper-extremity-trauma-cluster-quality.json"), `${JSON.stringify(buildQualityJson(), null, 2)}\n`);
  console.log(JSON.stringify({ ok: true }, null, 2));
}

main();