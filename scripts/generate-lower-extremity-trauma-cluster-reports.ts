/**
 * Consolidated batch reports for the lower extremity trauma cluster (10 neighborhoods).
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
    topicKey: "pelvic-ring-injury",
    displayName: "Pelvic Ring Injury",
    pilotKey: "pelvic-ring-injury-neighborhood",
    curriculumNode: "trauma-pelvic-ring-fractures",
    anki: 14,
    ob: 64,
  },
  {
    topicKey: "acetabular-fracture",
    displayName: "Acetabular Fracture",
    pilotKey: "acetabular-fracture-neighborhood",
    curriculumNode: "trauma-acetabular-fractures",
    anki: 24,
    ob: 74,
  },
  {
    topicKey: "femoral-shaft-fracture",
    displayName: "Femoral Shaft Fracture",
    pilotKey: "femoral-shaft-fracture-neighborhood",
    curriculumNode: "trauma-femoral-shaft-fractures",
    anki: 28,
    ob: 60,
  },
  {
    topicKey: "distal-femur-fracture",
    displayName: "Distal Femur Fracture",
    pilotKey: "distal-femur-fracture-neighborhood",
    curriculumNode: "trauma-distal-femur-fractures",
    anki: 9,
    ob: 19,
  },
  {
    topicKey: "patella-fracture",
    displayName: "Patella Fracture",
    pilotKey: "patella-fracture-neighborhood",
    curriculumNode: "trauma-patella-fracture",
    anki: 5,
    ob: 11,
  },
  {
    topicKey: "tibial-plateau-fracture",
    displayName: "Tibial Plateau Fracture",
    pilotKey: "tibial-plateau-fracture-neighborhood",
    curriculumNode: "trauma-tibial-plateau-fractures",
    anki: 15,
    ob: 68,
  },
  {
    topicKey: "pilon-fracture",
    displayName: "Pilon Fracture",
    pilotKey: "pilon-fracture-neighborhood",
    curriculumNode: "trauma-tibial-plafond-fractures",
    anki: 5,
    ob: 27,
  },
  {
    topicKey: "calcaneus-fracture",
    displayName: "Calcaneus Fracture",
    pilotKey: "calcaneus-fracture-neighborhood",
    curriculumNode: "trauma-calcaneus-fractures",
    anki: 11,
    ob: 48,
  },
  {
    topicKey: "talus-fracture",
    displayName: "Talus Fracture",
    pilotKey: "talus-fracture-neighborhood",
    curriculumNode: "trauma-talar-neck-fractures",
    anki: 13,
    ob: 28,
  },
  {
    topicKey: "lisfranc-injury",
    displayName: "Lisfranc Injury",
    pilotKey: "lisfranc-injury-neighborhood",
    curriculumNode: "foot-ankle-lisfranc-injury",
    anki: 0,
    ob: 34,
  },
];

const SHARED_ANATOMY_SLUGS = [
  "lower-extremity-trauma-anatomy-hub",
  "pelvis",
  "sacrum",
  "sacroiliac-joint",
  "pubic-symphysis",
  "iliac-wing",
  "acetabulum",
  "femoral-diaphysis",
  "distal-femur",
  "tibial-plateau",
  "patella",
  "extensor-mechanism",
  "acl",
  "pcl",
  "popliteal-artery",
  "common-peroneal-nerve",
  "talus",
  "calcaneus",
  "subtalar-joint",
  "lisfranc-joint",
  "midfoot",
  "plantar-soft-tissues",
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
    "# Lower Extremity Trauma Cluster — Manufacturing Summary",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Ten neighborhoods manufactured via Knowledge Factory operator pipeline:",
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
    "## Shared lower-extremity trauma anatomy",
    "",
    "Owned by pelvic-ring-injury pilot (`lower-extremity-trauma-cluster-shared`). Siblings reference these slugs; staging apply skips duplicate entity creation.",
    "",
    ...SHARED_ANATOMY_SLUGS.map((s) => `- \`${s}\``),
    "",
    "## Gating policy applied",
    "",
    "- Neurovascular-risk edges (`at_risk_structure`) → attending review",
    "- Operative indications, fixation decisions → attending review",
    "- Hemorrhage and instability decision points → attending review",
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
    "# Lower Extremity Trauma Cluster — Review Queue",
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
    "# Lower Extremity Trauma Cluster — Staging Apply",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Staging target: `geznczcokbgybsseipjg` with `KG_TARGET_ENV=staging`. Production modified: **no**.",
    "Order: pelvic ring (shared anatomy owner) → acetabular → femoral shaft → distal femur → patella → tibial plateau → pilon → calcaneus → talus → Lisfranc.",
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

function buildCrossNeighborhoodReuse(): string {
  const hipSlugs = [
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
  const legSlugs = ["tibial-shaft", "fibula", "leg-compartment-complex", "anterior-compartment"];

  const lines: string[] = [
    "# Lower Extremity Trauma Cluster — Cross-Neighborhood Reuse",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## LE cluster shared anatomy (owned)",
    "",
    "Owner pilot: `pelvic-ring-injury-neighborhood` (`lower-extremity-trauma-cluster-shared`).",
    "Sibling pilots emit reference proposals; staging apply skips `entity exists` for these slugs.",
    "",
    ...SHARED_ANATOMY_SLUGS.map((s) => `- \`${s}\``),
    "",
    "## Hip fracture cluster reuse (not re-created)",
    "",
    "Acetabular and femoral shaft neighborhoods reference hip cluster slugs via `sharedHipAnatomyForLeSibling`:",
    "",
    ...hipSlugs.map((s) => `- \`${s}\` (owner: hip-fracture-cluster-shared)`),
    "",
    "## Tibial shaft / leg anatomy reuse (not re-created)",
    "",
    "Tibial plateau and pilon neighborhoods reference tibial-shaft-fracture pilot leg slugs:",
    "",
    ...legSlugs.map((s) => `- \`${s}\` (owner: tibial-shaft-fracture-neighborhood)`),
    "",
    "## Per-neighborhood reuse matrix",
    "",
    "| Neighborhood | LE shared | Hip shared | Leg shared |",
    "|--------------|:---------:|:----------:|:----------:|",
    "| Pelvic Ring Injury | owner | — | — |",
    "| Acetabular Fracture | ref | ref | — |",
    "| Femoral Shaft Fracture | ref | ref | — |",
    "| Distal Femur Fracture | ref | — | — |",
    "| Patella Fracture | ref | — | — |",
    "| Tibial Plateau Fracture | ref | — | ref |",
    "| Pilon Fracture | ref | — | ref |",
    "| Calcaneus Fracture | ref | — | — |",
    "| Talus Fracture | ref | — | — |",
    "| Lisfranc Injury | ref | — | — |",
    "",
    "## Staging apply deduplication signals",
    "",
  ];

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
    cluster: "lower-extremity-trauma",
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
  writeFileSync(path.join(BATCH_OUT, "lower-extremity-trauma-summary.md"), `${buildSummary()}\n`);
  writeFileSync(path.join(BATCH_OUT, "lower-extremity-trauma-review-queue.md"), `${buildReviewQueue()}\n`);
  writeFileSync(path.join(BATCH_OUT, "lower-extremity-trauma-staging-apply.md"), `${buildStagingApply()}\n`);
  writeFileSync(path.join(BATCH_OUT, "lower-extremity-trauma-cross-neighborhood-reuse.md"), `${buildCrossNeighborhoodReuse()}\n`);
  writeFileSync(path.join(BATCH_OUT, "lower-extremity-trauma-quality.json"), `${JSON.stringify(buildQualityJson(), null, 2)}\n`);
  console.log(JSON.stringify({ ok: true }, null, 2));
}

main();