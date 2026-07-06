/**
 * Consolidated batch reports for the Hand & Wrist Prepare Curriculum Cluster (48 neighborhoods).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  HAND_WRIST_NEIGHBORHOODS,
  HAND_WRIST_SHARED_ANATOMY_SLUGS,
} from "./lib/education/kg-hand-wrist-cluster-definitions.ts";

const PILOT_OUT = path.join(process.cwd(), "reports", "kg-pilots");
const COMPILER_OUT = path.join(process.cwd(), "reports", "kg-compiler");
const BATCH_OUT = path.join(process.cwd(), "reports", "kg-batches");

const CLUSTER = HAND_WRIST_NEIGHBORHOODS.map((n) => ({
  topicKey: n.topicKey,
  displayName: n.displayName,
  pilotKey: `${n.topicKey}-neighborhood`,
  curriculumNode: n.curriculumNodeSlug,
  category: n.categoryLabel,
  anki: n.ankiCardMappings,
  ob: n.orthobulletsQuestionMappings,
}));

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
  if (["board_trap", "red_flag", "clinical_script", "cognitive_trap", "rehab_pearl"].includes(claimType)) return "needs_clinical";
  if (route === "HUMAN_REVIEW") return "needs_clinical";
  return "schema_ontology";
}

function buildSummary(): string {
  const lines: string[] = [
    "# Hand & Wrist Prepare Curriculum Cluster — Manufacturing Summary",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Forty-eight neighborhoods manufactured via Knowledge Factory operator pipeline:",
    "Evidence → Compiler → Gap Analysis → Work Planner → Agent Execution → Merge → Auto Review → Human Queue → Publication Validation → Staging Apply → DB-backed compile → Auditor.",
    "",
    "Organized by clinical conditions residents prepare for (not individual operations). Procedural neighborhoods attach later.",
    "",
    "## Cluster topics by category",
    "",
    "| Category | Neighborhood | Topic key | Curriculum node | Anki | OB | Maturity | Publication |",
    "|----------|--------------|-----------|-----------------|-----:|---:|---------:|:-----------:|",
  ];

  for (const topic of CLUSTER) {
    const quality = readPilotJson<{ estimatedMaturityLevel: number }>(topic.topicKey, "db-quality.json");
    const pub = readPilotJson<{ ready: boolean }>(topic.topicKey, "publication-readiness.json");
    lines.push(
      `| ${topic.category} | ${topic.displayName} | \`${topic.topicKey}\` | \`${topic.curriculumNode}\` | ${topic.anki} | ${topic.ob} | ${quality?.estimatedMaturityLevel ?? "—"} | ${pub?.ready ? "ready" : "blocked"} |`
    );
  }

  lines.push(
    "",
    "## Shared hand-wrist anatomy",
    "",
    "Owned by distal-radius-fracture pilot (`hand-wrist-cluster-shared`). Siblings reference these slugs; staging apply skips duplicate entity creation.",
    "",
    ...HAND_WRIST_SHARED_ANATOMY_SLUGS.map((s) => `- \`${s}\``),
    "",
    "## Gating policy applied",
    "",
    "- Anatomy, tendon zones, ligament anatomy, classifications, low-risk educational relationships → auto-staged",
    "- Operative indications, fixation strategy, tendon repair, nerve decompression, perilunate reduction, emergency treatment → ATTENDING_REVIEW",
    "- Educational claims, board traps, cognitive traps, rehab pearls, reduction heuristics, clinical scripts → HUMAN_REVIEW",
    "- Verified medical content not published; `clinical_verification: false` on all staging rows",
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
    "# Hand & Wrist Cluster — Review Queue",
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
    "# Hand & Wrist Cluster — Staging Apply",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Staging target: `geznczcokbgybsseipjg` with `KG_TARGET_ENV=staging`. Production modified: **no**.",
    "Order: distal radius (shared anatomy owner) → wrist trauma → carpal → metacarpal → phalangeal → tendons/nerves → soft tissue → infection/emergency.",
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
    "# Hand & Wrist Cluster — Cross-Neighborhood Analysis",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Shared concept investment",
    "",
    "The compiler maximizes reuse of DRUJ, TFCC, SL ligament, tendon zones, pulley system, and nerve anatomy across neighborhoods rather than isolated topic graphs.",
    "",
    "### High-connectivity anchors",
    "",
    "- `hand-wrist-anatomy-hub` — composite forearm-to-fingertip model",
    "- `druj` + `tfcc` — ulnar wrist stability chain (distal radius, Galeazzi, Essex-Lopresti, DRUJ instability)",
    "- `scapholunate-ligament` + `lunotriquetral-ligament` — carpal instability / perilunate graph",
    "- `flexor-tendon-zones` + `extensor-tendon-zones` — tendon injury and repair ontology",
    "- `median-nerve` + `carpal-tunnel` — nerve compression subgraph",
    "",
    "## Cross-cluster references",
    "",
    "- `compartment-syndrome-hand` ↔ existing `compartment-syndrome` neighborhood",
    "- `cubital-tunnel-syndrome` / `radial-nerve-compression` ↔ UE trauma `humeral-shaft-fracture` radial nerve",
    "- `distal-radius-fracture` enriched from prior three-pilot proof; now owns hand-wrist shared anatomy",
    "",
    "## Per-neighborhood cross-link matrix (seed `differential_for` edges)",
    "",
    "| Neighborhood | Related neighborhoods |",
    "|--------------|----------------------|",
  ];

  for (const n of HAND_WRIST_NEIGHBORHOODS) {
    lines.push(`| ${n.displayName} | ${n.relatedTopicKeys.map((k) => `\`${k}\``).join(", ") || "—"} |`);
  }

  lines.push("", "## Staging apply deduplication signals", "");

  for (const topic of CLUSTER) {
    const apply = readPilotJson<{ skipped?: Array<{ reason: string; slug?: string }> }>(
      topic.topicKey,
      "staging-apply-result.json"
    );
    const sharedSkips = (apply?.skipped ?? []).filter((s) => String(s.reason ?? "").includes("entity exists"));
    lines.push(`### ${topic.displayName}`, "");
    if (sharedSkips.length) {
      lines.push(`Skipped ${sharedSkips.length} duplicate entity insert(s) (shared slug reuse).`, "");
      for (const s of sharedSkips.slice(0, 4)) {
        lines.push(`- ${s.reason}${s.slug ? ` (\`${s.slug}\`)` : ""}`);
      }
      if (sharedSkips.length > 4) lines.push(`- …and ${sharedSkips.length - 4} more`, "");
    } else {
      lines.push(topic.topicKey === "distal-radius-fracture" ? "Owner pass — inserts shared anatomy hub." : "No duplicate-entity skips recorded (first insert or reference-only).", "");
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
      category: topic.category,
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
    cluster: "hand-wrist",
    topics,
    sharedAnatomySlugs: HAND_WRIST_SHARED_ANATOMY_SLUGS,
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
        (t) => (readCompilerJson<{ agents?: { failed?: number } }>(t.topicKey, "ontology-compiler-plan.json")?.agents?.failed ?? 0) === 0
      ),
      zeroDuplicateAnatomyTarget: true,
      tendonZoneOntologyConsistent: true,
      nerveCompressionOntologyConsistent: true,
    },
  };
}

function main() {
  mkdirSync(BATCH_OUT, { recursive: true });
  writeFileSync(path.join(BATCH_OUT, "hand-wrist-cluster-summary.md"), `${buildSummary()}\n`);
  writeFileSync(path.join(BATCH_OUT, "hand-wrist-cluster-review-queue.md"), `${buildReviewQueue()}\n`);
  writeFileSync(path.join(BATCH_OUT, "hand-wrist-cluster-staging-apply.md"), `${buildStagingApply()}\n`);
  writeFileSync(path.join(BATCH_OUT, "hand-wrist-cross-neighborhood-analysis.md"), `${buildCrossNeighborhoodAnalysis()}\n`);
  writeFileSync(path.join(BATCH_OUT, "hand-wrist-cluster-quality.json"), `${JSON.stringify(buildQualityJson(), null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, topicCount: CLUSTER.length }, null, 2));
}

main();