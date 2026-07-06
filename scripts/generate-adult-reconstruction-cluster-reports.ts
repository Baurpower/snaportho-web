/**
 * Consolidated batch reports for the Adult Reconstruction cluster (20 neighborhoods).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { ADULT_RECONSTRUCTION_TOPIC_CATALOG } from "./lib/education/kg-adult-reconstruction-topic-catalog.ts";

const PILOT_OUT = path.join(process.cwd(), "reports", "kg-pilots");
const COMPILER_OUT = path.join(process.cwd(), "reports", "kg-compiler");
const BATCH_OUT = path.join(process.cwd(), "reports", "kg-batches");

type ClusterTopic = {
  topicKey: string;
  displayName: string;
  pilotKey: string;
  curriculumNode: string;
  clusterGroup: string;
  anki: number;
  ob: number;
};

const CLUSTER: ClusterTopic[] = ADULT_RECONSTRUCTION_TOPIC_CATALOG.map((e) => ({
  topicKey: e.topicKey,
  displayName: e.displayName,
  pilotKey: `${e.topicKey}-neighborhood`,
  curriculumNode: e.curriculumNodeSlug,
  clusterGroup: e.clusterGroup,
  anki: e.anki,
  ob: e.ob,
}));

const SHARED_ANATOMY_SLUGS = [
  "adult-reconstruction-anatomy-hub",
  "pelvis",
  "acetabulum",
  "proximal-femur",
  "hip-capsule",
  "labrum",
  "gluteus-medius",
  "gluteus-minimus",
  "short-external-rotators",
  "femoral-nerve",
  "femur",
  "tibia",
  "femoral-condyles",
  "collateral-ligaments",
  "cruciate-ligaments",
  "quadriceps-tendon",
  "patellar-tendon",
  "implant-concepts-hub",
  "femoral-component",
  "acetabular-component",
  "polyethylene-liner",
  "femoral-stem",
  "tibial-baseplate",
  "tibial-insert",
  "patellar-component",
  "cement-mantle",
  "press-fit-fixation",
  "cemented-fixation",
];

const IMPLANT_SLUGS = [
  "femoral-component",
  "acetabular-component",
  "polyethylene-liner",
  "femoral-stem",
  "tibial-baseplate",
  "tibial-insert",
  "patellar-component",
  "cement-mantle",
  "press-fit-fixation",
  "cemented-fixation",
];

const TRAUMA_REUSE_SLUGS = [
  "femoral-head",
  "femoral-neck",
  "greater-trochanter",
  "lesser-trochanter",
  "calcar",
  "medial-femoral-circumflex-artery",
  "sciatic-nerve",
  "hip-joint",
  "patella",
  "tibial-plateau",
  "extensor-mechanism",
  "femoral-diaphysis",
  "popliteal-artery",
  "common-peroneal-nerve",
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
  const hip = CLUSTER.filter((t) => t.clusterGroup === "hip");
  const knee = CLUSTER.filter((t) => t.clusterGroup === "knee");
  const principles = CLUSTER.filter((t) => t.clusterGroup === "principles");

  const lines: string[] = [
    "# Adult Reconstruction Cluster — Manufacturing Summary",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Twenty neighborhoods manufactured via Knowledge Factory operator pipeline:",
    "Evidence → Compiler → Gap Analysis → Work Planner → Agent Execution → Merge → Auto Review → Human Queue → Publication Validation → Staging Apply → DB-backed compile.",
    "",
    "## Cluster groups",
    "",
    `- **Hip Reconstruction** (${hip.length}): ${hip.map((t) => t.displayName).join(", ")}`,
    `- **Knee Reconstruction** (${knee.length}): ${knee.map((t) => t.displayName).join(", ")}`,
    `- **Reconstruction Principles** (${principles.length}): ${principles.map((t) => t.displayName).join(", ")}`,
    "",
    "## Cluster topics",
    "",
    "| Neighborhood | Topic key | Group | Curriculum node | Anki | OB | Factory maturity | Publication |",
    "|--------------|-----------|-------|-----------------|-----:|---:|-----------------:|:-----------:|",
  ];

  for (const topic of CLUSTER) {
    const quality = readPilotJson<{ estimatedMaturityLevel: number }>(topic.topicKey, "db-quality.json");
    const pub = readPilotJson<{ ready: boolean }>(topic.topicKey, "publication-readiness.json");
    lines.push(
      `| ${topic.displayName} | \`${topic.topicKey}\` | ${topic.clusterGroup} | \`${topic.curriculumNode}\` | ${topic.anki} | ${topic.ob} | ${quality?.estimatedMaturityLevel ?? "—"} | ${pub?.ready ? "ready" : "blocked"} |`
    );
  }

  lines.push(
    "",
    "## Shared adult reconstruction anatomy + implant concepts",
    "",
    "Owned by hip-osteoarthritis pilot (`adult-reconstruction-cluster-shared`). Siblings reference these slugs; staging apply skips duplicate entity creation.",
    "",
    ...SHARED_ANATOMY_SLUGS.map((s) => `- \`${s}\``),
    "",
    "## Gating policy applied",
    "",
    "- Implant selection, fixation strategy, revision strategy → attending review",
    "- Infection management, instability management, operative indications → attending review",
    "- Educational claims, board traps, cognitive traps, implant pearls → clinical review",
    "- Anatomy, implant metadata, classifications, low-risk educational relationships → auto-staged",
    "- Publication remains blocked pending clinical verification",
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
    "# Adult Reconstruction Cluster — Review Queue",
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
    "# Adult Reconstruction Cluster — Staging Apply",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Staging target: `geznczcokbgybsseipjg` with `KG_TARGET_ENV=staging`. Production modified: **no**.",
    "Order: hip-osteoarthritis (shared anatomy owner) → hip recon neighborhoods → knee recon → reconstruction principles.",
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

function buildCrossNeighborhoodAnalysis(): string {
  const lines: string[] = [
    "# Adult Reconstruction Cluster — Cross-Neighborhood Analysis",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Recon cluster shared anatomy (owned)",
    "",
    "Owner pilot: `hip-osteoarthritis-neighborhood` (`adult-reconstruction-cluster-shared`).",
    "Sibling pilots emit reference proposals; staging apply skips `entity exists` for these slugs.",
    "",
    ...SHARED_ANATOMY_SLUGS.map((s) => `- \`${s}\``),
    "",
    "## Canonical implant concepts (shared, not duplicated)",
    "",
    ...IMPLANT_SLUGS.map((s) => `- \`${s}\``),
    "",
    "## Trauma neighborhood reuse (not re-created)",
    "",
    "Adult reconstruction neighborhoods reference trauma cluster slugs via cross-neighborhood bridges:",
    "",
    ...TRAUMA_REUSE_SLUGS.map((s) => `- \`${s}\` (hip-fracture / LE trauma cluster)`),
    "",
    "## Cross-neighborhood bridge examples",
    "",
    "| Recon neighborhood | Trauma / peer bridges |",
    "|--------------------|-----------------------|",
    "| Hip Osteoarthritis | femoral-neck-fracture, intertrochanteric-fracture, subtrochanteric-fracture |",
    "| Periprosthetic Femur Fracture | femoral-shaft-fracture, total-hip-arthroplasty |",
    "| Periprosthetic Knee Fracture | distal-femur-fracture, tibial-shaft-fracture |",
    "| PJI (hip/knee/principles) | compartment-syndrome |",
    "| Implant Fixation Principles | tibial-shaft-fracture (IM nail concepts) |",
    "| Femoral Neck (Adult Recon) | femoral-neck-fracture (trauma neighborhood) |",
    "",
    "## Per-neighborhood reuse matrix",
    "",
    "| Neighborhood | Recon shared | Hip trauma | LE trauma | Implant hub |",
    "|--------------|:------------:|:----------:|:---------:|:-----------:|",
  ];

  for (const topic of CLUSTER) {
    const apply = readPilotJson<{ skipped?: Array<{ reason: string; slug?: string }> }>(
      topic.topicKey,
      "staging-apply-result.json"
    );
    const sharedSkips = (apply?.skipped ?? []).filter((s) => String(s.reason ?? "").includes("entity exists"));
    const isOwner = topic.topicKey === "hip-osteoarthritis";
    lines.push(
      `| ${topic.displayName} | ${isOwner ? "owner" : "ref"} | ref | ref | ref |`
    );
    if (sharedSkips.length) {
      lines.push(`  - Skipped ${sharedSkips.length} duplicate entity insert(s)`);
    }
  }

  lines.push("", "## Staging apply deduplication signals", "");
  for (const topic of CLUSTER) {
    const apply = readPilotJson<{ skipped?: Array<{ reason: string; slug?: string }> }>(
      topic.topicKey,
      "staging-apply-result.json"
    );
    const sharedSkips = (apply?.skipped ?? []).filter((s) =>
      String(s.reason ?? "").includes("entity exists")
    );
    lines.push(`### ${topic.displayName}`, "");
    if (sharedSkips.length) {
      lines.push(`Skipped ${sharedSkips.length} duplicate entity insert(s) (shared slug reuse).`, "");
      for (const s of sharedSkips.slice(0, 6)) {
        lines.push(`- ${s.reason}${s.slug ? ` (\`${s.slug}\`)` : ""}`);
      }
      if (sharedSkips.length > 6) lines.push(`- …and ${sharedSkips.length - 6} more`, "");
    } else {
      lines.push("No duplicate-entity skips recorded (owner pass or first insert).", "");
    }
  }

  return lines.join("\n");
}

function buildQualityJson(): Record<string, unknown> {
  const topics: Record<string, unknown> = {};
  for (const topic of CLUSTER) {
    topics[topic.topicKey] = {
      displayName: topic.displayName,
      pilotKey: topic.pilotKey,
      clusterGroup: topic.clusterGroup,
      factoryQuality: readPilotJson(topic.topicKey, "db-quality.json"),
      factoryPublication: readPilotJson(topic.topicKey, "publication-readiness.json"),
      compilerPublication: readCompilerJson(topic.topicKey, "ontology-publication-readiness.json"),
      dataSource: readCompilerJson(topic.topicKey, "ontology-data-source.json"),
      agentExecution: readCompilerJson(topic.topicKey, "agent-execution-report.json"),
      evidencePacketId: readJson<Record<string, unknown>>(
        path.join(process.cwd(), "reports", "kg-evidence", topic.topicKey, "evidence-packet.json")
      )?.packetId ?? null,
    };
  }
  return {
    generatedAt: new Date().toISOString(),
    cluster: "adult-reconstruction",
    topicCount: CLUSTER.length,
    topics,
    sharedAnatomySlugs: SHARED_ANATOMY_SLUGS,
    implantConceptSlugs: IMPLANT_SLUGS,
    traumaReuseSlugs: TRAUMA_REUSE_SLUGS,
    publicationBlocked: true,
    clinicalVerification: false,
    stagingOnly: true,
    aggregate: {
      topicCount: CLUSTER.length,
      factoryMaturityLevels: CLUSTER.map(
        (t) => readPilotJson<{ estimatedMaturityLevel: number }>(t.topicKey, "db-quality.json")?.estimatedMaturityLevel ?? null
      ),
      allDbBackedCompileOk: CLUSTER.every(
        (t) => readCompilerJson<{ dbLoaded?: boolean }>(t.topicKey, "ontology-data-source.json")?.dbLoaded === true
      ),
      allCompilerAgentsOk: CLUSTER.every(
        (t) => (readCompilerJson<{ agents?: { failed?: number } }>(t.topicKey, "agent-execution-report.json")?.agents?.failed ?? 0) === 0
      ),
      allPublicationBlocked: CLUSTER.every(
        (t) => readPilotJson<{ ready: boolean }>(t.topicKey, "publication-readiness.json")?.ready !== true
      ),
    },
  };
}

function main() {
  mkdirSync(BATCH_OUT, { recursive: true });
  writeFileSync(path.join(BATCH_OUT, "adult-reconstruction-cluster-summary.md"), `${buildSummary()}\n`);
  writeFileSync(path.join(BATCH_OUT, "adult-reconstruction-cluster-review-queue.md"), `${buildReviewQueue()}\n`);
  writeFileSync(path.join(BATCH_OUT, "adult-reconstruction-cluster-staging-apply.md"), `${buildStagingApply()}\n`);
  writeFileSync(path.join(BATCH_OUT, "adult-reconstruction-cross-neighborhood-analysis.md"), `${buildCrossNeighborhoodAnalysis()}\n`);
  writeFileSync(path.join(BATCH_OUT, "adult-reconstruction-cluster-quality.json"), `${JSON.stringify(buildQualityJson(), null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, topics: CLUSTER.length }, null, 2));
}

main();