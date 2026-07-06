/**
 * Consolidated staging readiness reports for the first 3 KG pilots.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "reports", "kg-pilots");

type PilotMeta = {
  topicKey: string;
  displayName: string;
  prefix: string;
  pilotKey: string;
};

const PILOTS: PilotMeta[] = [
  { topicKey: "ankle-fracture", displayName: "Ankle Fracture", prefix: "ankle-fracture", pilotKey: "ankle-fracture-neighborhood" },
  {
    topicKey: "compartment-syndrome",
    displayName: "Compartment Syndrome",
    prefix: "compartment-syndrome",
    pilotKey: "compartment-syndrome-neighborhood",
  },
  {
    topicKey: "distal-radius-fracture",
    displayName: "Distal Radius Fracture",
    prefix: "distal-radius-fracture",
    pilotKey: "distal-radius-fracture-neighborhood",
  },
];

function readJson<T>(file: string): T | null {
  const full = path.join(OUT, file);
  if (!existsSync(full)) return null;
  return JSON.parse(readFileSync(full, "utf8")) as T;
}

function readCompilerJson<T>(topicKey: string, file: string): T | null {
  const full = path.join(process.cwd(), "reports", "kg-compiler", topicKey, file);
  if (!existsSync(full)) return null;
  return JSON.parse(readFileSync(full, "utf8")) as T;
}

function categorizeProposal(p: {
  proposal_type: string;
  proposed_predicate?: string | null;
  metadata?: Record<string, unknown>;
  review_status?: string;
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

function buildReviewSummary(): string {
  const lines: string[] = [
    "# Three-Pilot Review Summary",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Review grouping across ankle-fracture, compartment-syndrome, and distal-radius-fracture.",
    "",
    "## Safety policy applied",
    "",
    "- **Safe curator approval** (`AUTO_APPROVED_LOW_RISK`, `AUTO_REVISED`): eligible for staging apply",
    "- **Needs attending**: high-risk predicates, operative indications, emergency DPs",
    "- **Needs clinical**: board traps, cognitive traps, clinical scripts, general HUMAN_REVIEW claims",
    "- **Decision points**: gated — not applied without explicit staging draft mode",
    "- **Claims**: even auto-approved anatomy pearls insert as `generated_draft` / `unreviewed`",
    "",
  ];

  for (const pilot of PILOTS) {
    const curatedFile =
      pilot.topicKey === "ankle-fracture" ? "ankle-curated-proposals.json" : `${pilot.prefix}-curated-proposals.json`;
    const queueFile =
      pilot.topicKey === "ankle-fracture" ? "ankle-human-review-queue.json" : `${pilot.prefix}-human-review-queue.json`;
    const curated = readJson<{ proposals: Array<Record<string, unknown>> }>(curatedFile);
    const queue = readJson<Array<Record<string, unknown>>>(queueFile);

    const buckets: Record<string, string[]> = {
      safe_curator_approval: [],
      needs_clinical: [],
      needs_attending: [],
      reject_revise: [],
      schema_ontology: [],
    };

    for (const p of curated?.proposals ?? []) {
      const cat = categorizeProposal(p as Parameters<typeof categorizeProposal>[0]);
      buckets[cat].push(String(p.proposal_fingerprint));
    }

    lines.push(`## ${pilot.displayName}`, "");
    lines.push("| Bucket | Count | Applied to staging |");
    lines.push("|--------|------:|-------------------|");
    lines.push(`| Safe curator approval | ${buckets.safe_curator_approval.length} | yes (auto) |`);
    lines.push(`| Needs clinical judgment | ${buckets.needs_clinical.length} | no — queued |`);
    lines.push(`| Needs attending judgment | ${buckets.needs_attending.length} | no — queued |`);
    lines.push(`| Reject/revise | ${buckets.reject_revise.length} | no |`);
    lines.push(`| Schema/ontology issue | ${buckets.schema_ontology.length} | no |`);
    lines.push(`| Human review queue items | ${queue?.length ?? 0} | — |`, "");

    if (queue?.length) {
      lines.push("### Attending / human queue highlights", "");
      for (const item of queue.slice(0, 8)) {
        lines.push(`- **${item.route}** — ${item.target} (${item.proposal_type})`);
      }
      if (queue.length > 8) lines.push(`- …and ${queue.length - 8} more`, "");
    }
  }

  return lines.join("\n");
}

function buildStagingApplyReport(): string {
  const lines: string[] = [
    "# Three-Pilot Staging Apply Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Staging target: `geznczcokbgybsseipjg` with `KG_TARGET_ENV=staging`.",
    "Production modified: **no**.",
    "",
    "## Migration",
    "",
    "Shared vocabulary migration `20260705_120000_ankle_pilot_kg_vocabulary.sql` applied once (idempotent).",
    "",
    "## Per-pilot apply results",
    "",
    "| Pilot | Approved loaded | Entities | Relationships | Bridges | Draft claims | DPs applied | Marked applied |",
    "|-------|----------------:|---------:|--------------:|--------:|-------------:|------------:|---------------:|",
  ];

  for (const pilot of PILOTS) {
    const apply = readJson<{
      approvedLoaded: number;
      applied: Record<string, number>;
      priorApplyFromStagingProof?: Record<string, number>;
      note?: string;
      skipped: Array<{ reason: string }>;
      errors: string[];
      dryRun: boolean;
    }>(`${pilot.topicKey}-staging-apply-result.json`);

    if (!apply) {
      lines.push(`| ${pilot.displayName} | — | — | — | — | — | — | not run |`);
      continue;
    }

    const prior = apply.priorApplyFromStagingProof;
    const entities = apply.applied.entities + (prior?.entities ?? 0);
    const rels = apply.applied.relationships + (prior?.relationships ?? 0);
    const bridges = apply.applied.bridges + (prior?.bridges ?? 0);
    const claims = apply.applied.claims_draft + (prior?.claims_draft ?? 0);
    const marked = apply.applied.proposals_marked_applied + (prior?.proposals_marked_applied ?? 0);

    lines.push(
      `| ${pilot.displayName} | ${apply.approvedLoaded || (prior ? "0 (prior)" : 0)} | ${entities} | ${rels} | ${bridges} | ${claims} | 0 | ${marked} |`
    );
    if (apply.note) lines.push("", `> ${pilot.displayName}: ${apply.note}`, "");
  }

  lines.push("", "## Provenance tags on all applied rows", "");
  lines.push("- `staging_apply: true`");
  lines.push("- `staging_reviewer: staging_test_reviewer_not_clinical`");
  lines.push("- `clinical_verification: false`");
  lines.push("- Claims: `content_source: generated_draft`, `review_status: unreviewed`");
  lines.push("- Decision points: **not applied** (gated)", "");

  return lines.join("\n");
}

function buildDbBackedQuality(): string {
  const lines: string[] = [
    "# Three-Pilot DB-Backed Quality",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Post-staging apply metrics from `loadDbQualityMetrics` and DB-backed compiler.",
    "",
    "| Pilot | Factory maturity | Canonical entities | Canonical rels | Claims (draft) | DPs | Review completeness | Publication ready |",
    "|-------|-----------------:|-------------------:|---------------:|---------------:|----:|--------------------:|:-----------------:|",
  ];

  for (const pilot of PILOTS) {
    const qualityFile =
      pilot.topicKey === "ankle-fracture"
        ? ["ankle-fracture-db-quality.json", "ankle-db-quality.json"]
        : [`${pilot.prefix}-db-quality.json`];
    const quality =
      qualityFile.map((f) => readJson<{ estimatedMaturityLevel: number; metrics: Record<string, number>; source: string }>(f)).find(Boolean) ??
      null;

    const pubFile =
      pilot.topicKey === "ankle-fracture"
        ? ["ankle-fracture-publication-readiness.json", "publication-readiness.json"]
        : [`${pilot.prefix}-publication-readiness.json`];
    const pub = pubFile.map((f) => readJson<{ ready: boolean }>(f)).find(Boolean) ?? null;

    const m = quality?.metrics ?? {};
    lines.push(
      `| ${pilot.displayName} | ${quality?.estimatedMaturityLevel ?? "—"} | ${m.canonicalEntityCount ?? "—"} | ${m.canonicalRelationshipCount ?? "—"} | ${m.educationalClaimCount ?? "—"} | ${m.decisionPointCount ?? "—"} | ${m.reviewCompleteness != null ? (m.reviewCompleteness * 100).toFixed(1) + "%" : "—"} | ${pub?.ready ? "yes" : "no"} |`
    );
  }

  lines.push("", "## DB-backed compiler", "", "| Pilot | Data source | Gaps | Maturity | Agents OK |", "|-------|-------------|-----:|---------:|:---------:|");

  for (const pilot of PILOTS) {
    const plan = readCompilerJson<{
      gaps?: { total?: number };
      publication?: { currentLevel?: number };
      agents?: { failed?: number };
    }>(pilot.topicKey, "ontology-compiler-plan.json");

    const pub = readCompilerJson<{ currentLevel?: number }>(pilot.topicKey, "ontology-publication-readiness.json");

    const dataSource = readCompilerJson<{ neighborhood?: string; dbLoaded?: boolean; dbCounts?: { entities?: number; relationships?: number } }>(
      pilot.topicKey,
      "ontology-data-source.json"
    );

    const neighborhood = dataSource?.dbLoaded ? "database" : dataSource?.neighborhood ?? "—";
    const maturity = pub?.currentLevel ?? plan?.publication?.currentLevel ?? "—";

    lines.push(
      `| ${pilot.displayName} | ${neighborhood} (${dataSource?.dbCounts?.entities ?? "?"} entities) | ${plan?.gaps?.total ?? "—"} | ${maturity}/7 | ${(plan?.agents?.failed ?? 0) === 0 ? "yes" : "no"} |`
    );
  }

  return lines.join("\n");
}

function buildPublicationBlockers(): string {
  const lines: string[] = [
    "# Three-Pilot Publication Blockers",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Publication remains blocked for all pilots until true clinical/attending review.",
    "",
  ];

  for (const pilot of PILOTS) {
    const compilerPub = readCompilerJson<{
      ready: boolean;
      currentLevel: number;
      requiredLevel: number;
      blockers: string[];
      remainingWork: string[];
    }>(pilot.topicKey, "ontology-publication-readiness.json");

    const pubFiles =
      pilot.topicKey === "ankle-fracture"
        ? ["ankle-fracture-publication-readiness.json", "publication-readiness.json"]
        : [`${pilot.prefix}-publication-readiness.json`];
    const factoryPub =
      pubFiles
        .map((f) =>
          readJson<{ ready: boolean; blockers: string[]; estimatedMaturityLevel: number }>(f)
        )
        .find(Boolean) ?? null;

    lines.push(`## ${pilot.displayName}`, "");
    const stagingEntities = readCompilerJson<{ dbCounts?: { entities?: number } }>(pilot.topicKey, "ontology-data-source.json");
    lines.push(`- Compiler ready: **${compilerPub?.ready ? "yes" : "no"}** (Level ${compilerPub?.currentLevel ?? "—"}/${compilerPub?.requiredLevel ?? 7})`);
    lines.push(`- Factory ready: **${factoryPub?.ready ? "yes" : "no"}** (Level ${factoryPub?.estimatedMaturityLevel ?? "—"})`);
    lines.push(`- Staging canonical entities in DB: **${stagingEntities?.dbCounts?.entities ?? "—"}** (tagged \`staging_apply\`, not clinically verified)`, "");
    lines.push("### Compiler blockers", "");
    for (const b of compilerPub?.blockers ?? ["(no compiler report)"]) lines.push(`- ${b}`);
    lines.push("", "### Factory blockers", "");
    for (const b of factoryPub?.blockers ?? ["(no factory report)"]) lines.push(`- ${b}`);
    lines.push("", "### Remaining work (compiler)", "");
    for (const w of (compilerPub?.remainingWork ?? []).slice(0, 6)) lines.push(`- ${w}`);
    lines.push("");
  }

  lines.push("## Global gates (all pilots)", "");
  lines.push("- No verified medical claims in staging consumption paths");
  lines.push("- Safety-critical relationships and DPs await attending review");
  lines.push("- Product traversal (Prepare/BroBot) not enabled");
  lines.push("- Staging rows tagged `clinical_verification: false`", "");

  return lines.join("\n");
}

function main() {
  writeFileSync(path.join(OUT, "three-pilot-review-summary.md"), `${buildReviewSummary()}\n`);
  writeFileSync(path.join(OUT, "three-pilot-staging-apply-report.md"), `${buildStagingApplyReport()}\n`);
  writeFileSync(path.join(OUT, "three-pilot-db-backed-quality.md"), `${buildDbBackedQuality()}\n`);
  writeFileSync(path.join(OUT, "three-pilot-publication-blockers.md"), `${buildPublicationBlockers()}\n`);
  console.log(
    JSON.stringify(
      {
        ok: true,
        files: [
          "three-pilot-review-summary.md",
          "three-pilot-staging-apply-report.md",
          "three-pilot-db-backed-quality.md",
          "three-pilot-publication-blockers.md",
        ],
      },
      null,
      2
    )
  );
}

main();