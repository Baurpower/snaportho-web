/**
 * Consolidated batch reports for the Sports Medicine Prepare cluster (17 neighborhoods).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { SPORTS_CONDITION_SEEDS } from "./lib/education/kg-sports-medicine-condition-registry.ts";
import { getPilotKeyForSeed } from "./lib/education/kg-sports-medicine-condition-registry.ts";

const PILOT_OUT = path.join(process.cwd(), "reports", "kg-pilots");
const COMPILER_OUT = path.join(process.cwd(), "reports", "kg-compiler");
const BATCH_OUT = path.join(process.cwd(), "reports", "kg-batches");
const AUDIT_OUT = path.join(process.cwd(), "reports", "kg-audits");

const SHARED_ANATOMY_SLUGS = [
  "sports-medicine-anatomy-hub",
  "sports-knee-anatomy-hub",
  "sports-shoulder-anatomy-hub",
  "sports-elbow-anatomy-hub",
  "sports-foot-ankle-anatomy-hub",
  "mcl",
  "lcl",
  "posterolateral-corner",
  "medial-meniscus",
  "lateral-meniscus",
  "articular-cartilage",
  "femoral-condyles",
  "glenoid",
  "labrum",
  "rotator-cuff",
  "supraspinatus",
  "infraspinatus",
  "subscapularis",
  "teres-minor",
  "biceps-anchor",
  "ucl",
  "radial-collateral-ligament",
  "distal-biceps-tendon",
  "atfl",
  "cfl",
  "achilles-tendon",
];

const TRAUMA_CROSS_LINKS = [
  "tibial-plateau-fracture",
  "proximal-humerus-fracture",
  "clavicle-fracture",
  "ankle-fracture",
  "calcaneus-fracture",
  "talus-fracture",
  "patella-fracture",
  "distal-femur-fracture",
  "pilon-fracture",
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
    "# Sports Medicine Prepare Cluster — Manufacturing Summary",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Seventeen diagnosis-first neighborhoods manufactured via Knowledge Factory operator pipeline:",
    "Evidence → Compiler → Gap Analysis → Work Planner → Agent Execution → Merge → Auto Review → Human Queue → Publication Validation → Staging Apply → DB-backed compile → Auditor.",
    "",
    "## Cluster topics",
    "",
    "| Region | Neighborhood | Topic key | Curriculum node | Anki | OB | Factory maturity | Publication |",
    "|--------|--------------|-----------|-----------------|-----:|---:|-----------------:|:-----------:|",
  ];

  for (const seed of SPORTS_CONDITION_SEEDS) {
    const quality = readPilotJson<{ estimatedMaturityLevel: number }>(seed.topicKey, "db-quality.json");
    const pub = readPilotJson<{ ready: boolean }>(seed.topicKey, "publication-readiness.json");
    lines.push(
      `| ${seed.region} | ${seed.displayName} | \`${seed.topicKey}\` | \`${seed.curriculumNodeSlug}\` | ${seed.ankiCount} | ${seed.obCount} | ${quality?.estimatedMaturityLevel ?? "—"} | ${pub?.ready ? "ready" : "blocked"} |`
    );
  }

  lines.push(
    "",
    "## Shared sports medicine anatomy",
    "",
    "Owned by acl-tear pilot (`sports-medicine-cluster-shared`). Siblings reference these slugs; staging apply skips duplicate entity creation.",
    "",
    ...SHARED_ANATOMY_SLUGS.map((s) => `- \`${s}\``),
    "",
    "## Cross-cluster trauma reuse",
    "",
    "Sports neighborhoods reference canonical trauma anatomy and conditions without duplication:",
    "",
    ...TRAUMA_CROSS_LINKS.map((s) => `- \`${s}\``),
    "",
    "## Gating policy applied",
    "",
    "- Anatomy, classifications, metadata, curriculum bridges → auto-staged (low-risk)",
    "- Operative indications, reconstruction, graft/fixation concepts → ATTENDING_REVIEW",
    "- Return-to-play criteria, surgical decision points, rehab protocols → ATTENDING_REVIEW",
    "- Educational claims, board traps, cognitive traps, clinical scripts → HUMAN_REVIEW",
    "- Decision points not applied to staging without explicit draft mode",
    "- Publication blocked pending clinical verification",
    "",
    "## Per-topic report paths",
    ""
  );

  for (const seed of SPORTS_CONDITION_SEEDS) {
    lines.push(`### ${seed.displayName}`, "");
    lines.push(`- Evidence: \`reports/kg-evidence/${seed.topicKey}/\``);
    lines.push(`- Compiler: \`reports/kg-compiler/${seed.topicKey}/\``);
    lines.push(`- Factory: \`reports/kg-pilots/${seed.topicKey}-*\``, "");
  }

  return lines.join("\n");
}

function buildReviewQueue(): string {
  const lines: string[] = [
    "# Sports Medicine Prepare Cluster — Review Queue",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
  ];

  for (const seed of SPORTS_CONDITION_SEEDS) {
    const curated = readPilotJson<{ proposals: Array<Record<string, unknown>> }>(seed.topicKey, "curated-proposals.json");
    const queue = readPilotJson<Array<Record<string, unknown>>>(seed.topicKey, "human-review-queue.json");
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
    lines.push(`## ${seed.displayName}`, "");
    lines.push("| Bucket | Count |");
    lines.push("|--------|------:|");
    lines.push(`| Safe curator approval | ${buckets.safe_curator_approval} |`);
    lines.push(`| Needs clinical judgment | ${buckets.needs_clinical} |`);
    lines.push(`| Needs attending judgment | ${buckets.needs_attending} |`);
    lines.push(`| Reject / revise | ${buckets.reject_revise} |`);
    lines.push(`| Schema / ontology | ${buckets.schema_ontology} |`);
    lines.push(`| Human review queue items | ${queue?.length ?? 0} |`, "");
    if (queue?.length) {
      for (const item of queue.slice(0, 6)) {
        lines.push(`- **${item.route}** — ${item.target} (${item.proposal_type})`);
      }
      if (queue.length > 6) lines.push(`- …and ${queue.length - 6} more`, "");
    }
  }
  return lines.join("\n");
}

function buildStagingApply(): string {
  const lines: string[] = [
    "# Sports Medicine Prepare Cluster — Staging Apply",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Staging target: `geznczcokbgybsseipjg` with `KG_TARGET_ENV=staging`. Production modified: **no**.",
    "Order: acl-tear (shared anatomy owner) → knee → shoulder → elbow → foot-ankle neighborhoods.",
    "",
    "| Neighborhood | Entities | Relationships | Bridges | Draft claims | DPs applied |",
    "|--------------|--------:|--------------:|--------:|-------------:|------------:|",
  ];
  for (const seed of SPORTS_CONDITION_SEEDS) {
    const apply = readPilotJson<{ cumulativeApply?: Record<string, number>; applied?: Record<string, number> }>(
      seed.topicKey,
      "staging-apply-result.json"
    );
    const a = apply?.cumulativeApply ?? apply?.applied ?? {};
    lines.push(
      `| ${seed.displayName} | ${a.entities ?? "—"} | ${a.relationships ?? "—"} | ${a.bridges ?? "—"} | ${a.claims_draft ?? "—"} | ${a.decision_points_draft ?? 0} |`
    );
  }
  lines.push(
    "",
    "All applied rows: `staging_apply: true`, `clinical_verification: false`, claims as `generated_draft` / `unreviewed`.",
    ""
  );
  return lines.join("\n");
}

function buildCrossNeighborhoodAnalysis(): string {
  const lines: string[] = [
    "# Sports Medicine Prepare Cluster — Cross-Neighborhood Analysis",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Intra-cluster connectivity",
    "",
    "| Condition | Cross-neighborhood links | Trauma cross-links |",
    "|-----------|-------------------------|-------------------|",
  ];

  for (const seed of SPORTS_CONDITION_SEEDS) {
    lines.push(
      `| ${seed.displayName} | ${seed.crossNeighborhoodSlugs.map((s) => `\`${s}\``).join(", ") || "—"} | ${seed.traumaCrossLinks.map((s) => `\`${s}\``).join(", ") || "—"} |`
    );
  }

  lines.push(
    "",
    "## Shared anatomy reuse strategy",
    "",
    "- **Knee sports**: Reuses LE trauma slugs (`acl`, `pcl`, `patella`, `tibial-plateau`, `extensor-mechanism`, `popliteal-artery`, `common-peroneal-nerve`) plus owned sports knee hub entities.",
    "- **Shoulder sports**: Reuses UE trauma slugs (`humeral-head`, `proximal-humerus`, `axillary-nerve`, `ac-joint`) plus owned rotator cuff and labrum entities.",
    "- **Elbow sports**: Reuses UE trauma nerve and elbow joint slugs plus owned UCL and distal biceps entities.",
    "- **Foot & ankle sports**: Reuses LE trauma (`talus`, `calcaneus`) and ankle-fracture pilot (`syndesmosis`, `deltoid-ligament`) plus owned ATFL/CFL/Achilles entities.",
    "",
    "## Auditor cross-neighborhood consistency",
    ""
  );

  const batchAudit = readJson<{
    batchKey: string;
    neighborhoods: Array<{ topicKey: string; overallScore?: number; publicationStatus?: string }>;
    aggregate?: { averageScore?: number; publicationBlocked?: number };
  }>(path.join(AUDIT_OUT, "batches", "sports-medicine", "batch-summary.json"));

  if (batchAudit) {
    lines.push(`Batch audit file: \`reports/kg-audits/batches/sports-medicine/batch-summary.json\``, "");
    lines.push(`- Average auditor score: **${batchAudit.aggregate?.averageScore ?? "—"}**`);
    lines.push(`- Publication blocked: **${batchAudit.aggregate?.publicationBlocked ?? 17}/17** neighborhoods`, "");
    for (const topic of batchAudit.neighborhoods ?? []) {
      const crossAudit = readJson<{ score?: number }>(
        path.join(AUDIT_OUT, topic.topicKey, "cross-neighborhood-consistency.json")
      );
      lines.push(
        `- \`${topic.topicKey}\`: overall ${topic.overallScore ?? "—"}, cross-neighborhood ${crossAudit?.score ?? "—"}`
      );
    }
  } else {
    lines.push("_Batch auditor report not yet generated — run `npm run kg:audit -- --batch sports-medicine --db-backed`_");
  }

  return lines.join("\n");
}

function buildQualityJson(): Record<string, unknown> {
  const topics: Record<string, unknown> = {};
  for (const seed of SPORTS_CONDITION_SEEDS) {
    topics[seed.topicKey] = {
      displayName: seed.displayName,
      pilotKey: getPilotKeyForSeed(seed),
      region: seed.region,
      factoryQuality: readPilotJson(seed.topicKey, "db-quality.json"),
      factoryPublication: readPilotJson(seed.topicKey, "publication-readiness.json"),
      compilerPublication: readCompilerJson(seed.topicKey, "ontology-publication-readiness.json"),
      dataSource: readCompilerJson(seed.topicKey, "ontology-data-source.json"),
      agentExecution: readCompilerJson(seed.topicKey, "agent-execution-report.json"),
      evidencePacketId: readJson<Record<string, unknown>>(
        path.join(process.cwd(), "reports", "kg-evidence", seed.topicKey, "evidence-packet.json")
      )?.packetId ?? null,
    };
  }
  return {
    generatedAt: new Date().toISOString(),
    cluster: "sports-medicine",
    topics,
    sharedAnatomySlugs: SHARED_ANATOMY_SLUGS,
    traumaCrossLinks: TRAUMA_CROSS_LINKS,
    publicationBlocked: true,
    clinicalVerification: false,
    stagingOnly: true,
    aggregate: {
      topicCount: SPORTS_CONDITION_SEEDS.length,
      factoryMaturityLevels: SPORTS_CONDITION_SEEDS.map(
        (s) => readPilotJson<{ estimatedMaturityLevel: number }>(s.topicKey, "db-quality.json")?.estimatedMaturityLevel ?? null
      ),
      allDbBackedCompileOk: SPORTS_CONDITION_SEEDS.every(
        (s) => readCompilerJson<{ dbLoaded?: boolean }>(s.topicKey, "ontology-data-source.json")?.dbLoaded === true
      ),
      allCompilerAgentsOk: SPORTS_CONDITION_SEEDS.every(
        (s) => (readCompilerJson<{ agents?: { failed?: number } }>(s.topicKey, "agent-execution-report.json")?.agents?.failed ?? 0) === 0
      ),
      allPublicationBlocked: SPORTS_CONDITION_SEEDS.every(
        (s) => readPilotJson<{ ready: boolean }>(s.topicKey, "publication-readiness.json")?.ready !== true
      ),
    },
  };
}

function main() {
  mkdirSync(BATCH_OUT, { recursive: true });
  writeFileSync(path.join(BATCH_OUT, "sports-medicine-cluster-summary.md"), `${buildSummary()}\n`);
  writeFileSync(path.join(BATCH_OUT, "sports-medicine-cluster-review-queue.md"), `${buildReviewQueue()}\n`);
  writeFileSync(path.join(BATCH_OUT, "sports-medicine-cluster-staging-apply.md"), `${buildStagingApply()}\n`);
  writeFileSync(path.join(BATCH_OUT, "sports-medicine-cross-neighborhood-analysis.md"), `${buildCrossNeighborhoodAnalysis()}\n`);
  writeFileSync(path.join(BATCH_OUT, "sports-medicine-cluster-quality.json"), `${JSON.stringify(buildQualityJson(), null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, topicCount: SPORTS_CONDITION_SEEDS.length }, null, 2));
}

main();