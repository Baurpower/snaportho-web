/**
 * Consolidated batch reports for the hip fracture cluster (3 neighborhoods).
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
    topicKey: "femoral-neck-fracture",
    displayName: "Femoral Neck Fracture",
    pilotKey: "femoral-neck-fracture-neighborhood",
    curriculumNode: "trauma-femoral-neck-fractures",
    anki: 9,
    ob: 64,
  },
  {
    topicKey: "intertrochanteric-fracture",
    displayName: "Intertrochanteric Fracture",
    pilotKey: "intertrochanteric-fracture-neighborhood",
    curriculumNode: "trauma-intertrochanteric-fractures",
    anki: 10,
    ob: 40,
  },
  {
    topicKey: "subtrochanteric-fracture",
    displayName: "Subtrochanteric Fracture",
    pilotKey: "subtrochanteric-fracture-neighborhood",
    curriculumNode: "trauma-subtrochanteric-fractures",
    anki: 11,
    ob: 20,
  },
];

const SHARED_ANATOMY_SLUGS = [
  "proximal-femur-anatomy-hub",
  "femoral-head",
  "femoral-neck",
  "intertrochanteric-region",
  "lesser-trochanter",
  "greater-trochanter",
  "calcar",
  "medial-femoral-circumflex-artery",
  "sciatic-nerve",
  "hip-joint",
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
    "# Hip Fracture Cluster — Manufacturing Summary",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Cluster neighborhoods manufactured end-to-end via Knowledge Factory operator pipeline:",
    "Evidence → Compiler → Gap Analysis → Work Planner → Agent Execution → Merge → Auto Review → Human Queue → Publication Validation → Staging Apply.",
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
    "## Shared proximal femur anatomy (single canonical set)",
    "",
    "Owned by femoral-neck-fracture pilot (`hip-fracture-cluster-shared`). Sibling neighborhoods reference these slugs — staging apply skips duplicate entity creation when slugs already exist.",
    "",
    ...SHARED_ANATOMY_SLUGS.map((s) => `- \`${s}\``),
    "",
    "Shared implant slug reused across IT + ST: `cephalomedullary-nail`, `cephalomedullary-nailing` (procedure).",
    "",
    "## Pipeline execution",
    "",
    "1. Registered all three topics in `topic-registry.ts`",
    "2. Built evidence packets (`npm run kg:evidence -- --topic <key>`)",
    "3. Compiled with evidence (`npm run kg:compile -- --topic <key> --use-evidence`)",
    "4. Ran factory agents: generate → curate → review → persist",
    "5. Applied safe low-risk approvals to staging only (`KG_TARGET_ENV=staging`)",
    "6. Re-ran DB-backed evidence + compile + quality",
    "7. Gated operative indications, fixation/arthroplasty edges, AVN/vascular anatomy, and all decision points for attending review",
    "",
    "## Known framework limitations (documented, not blocking)",
    "",
    "- No Iteration Controller — compiler is single-pass; DB-backed gaps may exceed spec-pass gaps until review queue clears",
    "- DB snapshot loader filters by pilot metadata — shared anatomy may appear under sibling pilot tags while slugs remain canonical",
    "- Neighborhood QA Agent not implemented — gap analysis + publication validator substitute",
    "",
    "## Per-topic report paths",
    ""
  );

  for (const topic of CLUSTER) {
    lines.push(`### ${topic.displayName}`, "");
    lines.push(`- Evidence: \`reports/kg-evidence/${topic.topicKey}/\``);
    lines.push(`- Compiler: \`reports/kg-compiler/${topic.topicKey}/\``);
    lines.push(`- Factory: \`reports/kg-pilots/${topic.topicKey}-*\``);
    lines.push("");
  }

  return lines.join("\n");
}

function buildReviewQueue(): string {
  const lines: string[] = [
    "# Hip Fracture Cluster — Review Queue",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Items requiring clinical or attending judgment before publication. Safe curator approvals were applied to staging as draft/unreviewed content only.",
    "",
    "## Gating policy",
    "",
    "- **Attending**: `treated_by`, `uses_fixation`, `indicates_treatment`, `at_risk_structure`, `explains_instability`, all decision points",
    "- **Clinical**: board traps, cognitive traps, clinical scripts, general `HUMAN_REVIEW` claims",
    "- **Not applied**: decision points (unless explicit staging draft mode)",
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
      const cat = categorizeProposal(p as Parameters<typeof categorizeProposal>[0]);
      buckets[cat] += 1;
    }

    lines.push(`## ${topic.displayName}`, "");
    lines.push("| Bucket | Count | Staging applied |");
    lines.push("|--------|------:|:---------------:|");
    lines.push(`| Safe curator approval | ${buckets.safe_curator_approval} | partial (low-risk only) |`);
    lines.push(`| Needs clinical judgment | ${buckets.needs_clinical} | no |`);
    lines.push(`| Needs attending judgment | ${buckets.needs_attending} | no |`);
    lines.push(`| Reject/revise | ${buckets.reject_revise} | no |`);
    lines.push(`| Schema/ontology | ${buckets.schema_ontology} | no |`);
    lines.push(`| Human review queue items | ${queue?.length ?? 0} | — |`, "");

    if (queue?.length) {
      lines.push("### Queue highlights", "");
      for (const item of queue.slice(0, 10)) {
        lines.push(`- **${item.route}** — ${item.target} (${item.proposal_type})`);
      }
      if (queue.length > 10) lines.push(`- …and ${queue.length - 10} more`, "");
    }
  }

  return lines.join("\n");
}

function buildStagingApply(): string {
  const lines: string[] = [
    "# Hip Fracture Cluster — Staging Apply",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Staging target: `geznczcokbgybsseipjg` with `KG_TARGET_ENV=staging`. Production modified: **no**.",
    "",
    "Manufacturing order: femoral-neck-fracture (shared anatomy owner) → intertrochanteric-fracture → subtrochanteric-fracture.",
    "Second apply pass executed for femoral-neck and intertrochanteric after shared slug resolution (same pattern as tibial-shaft cluster).",
    "",
    "## Per-neighborhood apply totals (cumulative passes)",
    "",
    "| Neighborhood | Entities | Relationships | Bridges | Draft claims | DPs applied |",
    "|--------------|--------:|--------------:|--------:|-------------:|------------:|",
  ];

  for (const topic of CLUSTER) {
    const apply = readPilotJson<{
      applied: Record<string, number>;
      cumulativeApply?: Record<string, number>;
      approvedLoaded?: number;
      skipped: Array<{ reason: string }>;
      errors: string[];
    }>(topic.topicKey, "staging-apply-result.json");

    const a = apply?.cumulativeApply ?? apply?.applied ?? {};
    lines.push(
      `| ${topic.displayName} | ${a.entities ?? "—"} | ${a.relationships ?? "—"} | ${a.bridges ?? "—"} | ${a.claims_draft ?? "—"} | ${a.decision_points_draft ?? 0} |`
    );
  }

  lines.push(
    "",
    "## Shared anatomy deduplication",
    "",
    "Sibling pilots emit `create_canonical_entity` proposals for shared slugs (for relationship validation). Staging apply skips inserts when slug already exists — **no duplicate canonical rows** for shared anatomy.",
    "",
    "## Provenance tags",
    "",
    "- `staging_apply: true`",
    "- `staging_reviewer: staging_test_reviewer_not_clinical`",
    "- `clinical_verification: false`",
    "- Claims: `content_source: generated_draft`, `review_status: unreviewed`",
    "- Decision points: **not applied** (gated for attending)",
    ""
  );

  return lines.join("\n");
}

function buildQualityJson(): Record<string, unknown> {
  const topics: Record<string, unknown> = {};

  for (const topic of CLUSTER) {
    const quality = readPilotJson<Record<string, unknown>>(topic.topicKey, "db-quality.json");
    const pub = readPilotJson<Record<string, unknown>>(topic.topicKey, "publication-readiness.json");
    const compilerPub = readCompilerJson<Record<string, unknown>>(topic.topicKey, "ontology-publication-readiness.json");
    const dataSource = readCompilerJson<Record<string, unknown>>(topic.topicKey, "ontology-data-source.json");
    const plan = readCompilerJson<Record<string, unknown>>(topic.topicKey, "ontology-compiler-plan.json");
    const evidence = readJson<Record<string, unknown>>(
      path.join(process.cwd(), "reports", "kg-evidence", topic.topicKey, "evidence-packet.json")
    );

    topics[topic.topicKey] = {
      displayName: topic.displayName,
      pilotKey: topic.pilotKey,
      factoryQuality: quality,
      factoryPublication: pub,
      compilerPublication: compilerPub,
      compilerPlan: {
        gaps: (plan as { gaps?: { total?: number } })?.gaps?.total,
        agentsFailed: (plan as { agents?: { failed?: number } })?.agents?.failed ?? 0,
      },
      dataSource,
      evidencePacketId: evidence?.packetId ?? null,
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    cluster: "hip-fracture",
    topics,
    sharedAnatomySlugs: SHARED_ANATOMY_SLUGS,
    publicationBlocked: true,
    clinicalVerification: false,
    stagingOnly: true,
    aggregate: {
      topicCount: CLUSTER.length,
      factoryMaturityLevels: CLUSTER.map((t) => {
        const q = readPilotJson<{ estimatedMaturityLevel: number }>(t.topicKey, "db-quality.json");
        return q?.estimatedMaturityLevel ?? null;
      }),
      allCompilerAgentsOk: CLUSTER.every((t) => {
        const plan = readCompilerJson<{ agents?: { failed?: number } }>(t.topicKey, "ontology-compiler-plan.json");
        return (plan?.agents?.failed ?? 0) === 0;
      }),
      allDbBackedCompileOk: CLUSTER.every((t) => {
        const ds = readCompilerJson<{ dbLoaded?: boolean }>(t.topicKey, "ontology-data-source.json");
        return ds?.dbLoaded === true;
      }),
    },
  };
}

function main() {
  mkdirSync(BATCH_OUT, { recursive: true });

  const summary = buildSummary();
  const reviewQueue = buildReviewQueue();
  const stagingApply = buildStagingApply();
  const quality = buildQualityJson();

  writeFileSync(path.join(BATCH_OUT, "hip-fracture-cluster-summary.md"), `${summary}\n`);
  writeFileSync(path.join(BATCH_OUT, "hip-fracture-cluster-review-queue.md"), `${reviewQueue}\n`);
  writeFileSync(path.join(BATCH_OUT, "hip-fracture-cluster-staging-apply.md"), `${stagingApply}\n`);
  writeFileSync(path.join(BATCH_OUT, "hip-fracture-cluster-quality.json"), `${JSON.stringify(quality, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        files: [
          "hip-fracture-cluster-summary.md",
          "hip-fracture-cluster-review-queue.md",
          "hip-fracture-cluster-staging-apply.md",
          "hip-fracture-cluster-quality.json",
        ],
      },
      null,
      2
    )
  );
}

main();