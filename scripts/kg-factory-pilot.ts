/**
 * Knowledge Factory pipeline orchestrator — topic-agnostic.
 *
 * Usage: kg-factory-pilot.ts --topic <topic-key> <generate|curate|review|persist|quality|publication|dry-run>
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { writeSnapshot } from "./kg-automation-common.ts";
import { resolveTopic } from "./lib/education/kg-compiler/topic-registry.ts";
import {
  buildAcetabularFractureProposalPacket,
  buildAnkleProposalPacket,
  buildCalcaneusProposalPacket,
  buildClavicleProposalPacket,
  buildCompartmentSyndromeProposalPacket,
  buildDistalFemurProposalPacket,
  buildDistalHumerusProposalPacket,
  buildDistalRadiusProposalPacket,
  buildFemoralNeckProposalPacket,
  buildFemoralShaftProposalPacket,
  buildHumeralShaftProposalPacket,
  buildIntertrochantericProposalPacket,
  buildLisfrancProposalPacket,
  buildPatellaProposalPacket,
  buildPelvicRingProposalPacket,
  buildPilonProposalPacket,
  buildProximalHumerusProposalPacket,
  buildSubtrochantericProposalPacket,
  buildSupracondylarProposalPacket,
  buildTalusProposalPacket,
  buildTibialPlateauProposalPacket,
  buildTibialShaftProposalPacket,
  buildAdultReconstructionProposalPacket,
  buildHandWristProposalPacket,
  buildSportsMedicineProposalPacket,
} from "./lib/education/kg-factory/proposal-builder.ts";
import { listAdultReconstructionTopicKeys } from "./lib/education/kg-adult-reconstruction-topic-registry.ts";
import { listHandWristFactoryTopicKeys } from "./lib/education/kg-hand-wrist-pilot-spec.ts";
import { listSportsTopicKeys } from "./lib/education/kg-sports-medicine-pilot-spec.ts";
import {
  curateProposalBatch,
  summarizeCurationRoutes,
} from "./lib/education/kg-factory/intelligent-curator.ts";
import { dryRunApplyProposals } from "./lib/education/kg-factory/dry-run-apply.ts";
import { loadDbQualityMetrics } from "./lib/education/kg-factory/db-quality.ts";
import { buildHumanReviewPacket } from "./lib/education/kg-factory/human-review-packet.ts";
import { loadPilotProposals, persistProposals } from "./lib/education/kg-factory/persist.ts";
import { assessPublicationReadiness } from "./lib/education/kg-factory/publication-readiness.ts";
import { validateProposalPacket } from "./lib/education/kg-factory/validator.ts";
import type { CurationReport } from "./lib/education/kg-factory/types.ts";

const OUT_DIR = path.join(process.cwd(), "reports", "kg-pilots");
const DOCS_DIR = path.join(process.cwd(), "docs", "knowledge-graph", "pilots");

function parseArgs(argv: string[]) {
  let topic = "";
  let cmd = "help";

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--topic") {
      topic = argv[i + 1] ?? "";
      i += 1;
    } else if (!arg.startsWith("-")) {
      cmd = arg;
    }
  }

  return { topic, cmd };
}

function topicPrefix(topicKey: string): string {
  return topicKey;
}

function buildProposalPacket(topicKey: string) {
  switch (topicKey) {
    case "ankle-fracture":
      return buildAnkleProposalPacket();
    case "compartment-syndrome":
      return buildCompartmentSyndromeProposalPacket();
    case "distal-radius-fracture":
      return buildDistalRadiusProposalPacket();
    case "tibial-shaft-fracture":
      return buildTibialShaftProposalPacket();
    case "femoral-neck-fracture":
      return buildFemoralNeckProposalPacket();
    case "intertrochanteric-fracture":
      return buildIntertrochantericProposalPacket();
    case "subtrochanteric-fracture":
      return buildSubtrochantericProposalPacket();
    case "clavicle-fracture":
      return buildClavicleProposalPacket();
    case "proximal-humerus-fracture":
      return buildProximalHumerusProposalPacket();
    case "humeral-shaft-fracture":
      return buildHumeralShaftProposalPacket();
    case "distal-humerus-fracture":
      return buildDistalHumerusProposalPacket();
    case "supracondylar-humerus-fracture":
      return buildSupracondylarProposalPacket();
    case "pelvic-ring-injury":
      return buildPelvicRingProposalPacket();
    case "acetabular-fracture":
      return buildAcetabularFractureProposalPacket();
    case "femoral-shaft-fracture":
      return buildFemoralShaftProposalPacket();
    case "distal-femur-fracture":
      return buildDistalFemurProposalPacket();
    case "patella-fracture":
      return buildPatellaProposalPacket();
    case "tibial-plateau-fracture":
      return buildTibialPlateauProposalPacket();
    case "pilon-fracture":
      return buildPilonProposalPacket();
    case "calcaneus-fracture":
      return buildCalcaneusProposalPacket();
    case "talus-fracture":
      return buildTalusProposalPacket();
    case "lisfranc-injury":
      return buildLisfrancProposalPacket();
    default:
      if (listHandWristFactoryTopicKeys().includes(topicKey)) {
        return buildHandWristProposalPacket(topicKey);
      }
      if (listSportsTopicKeys().includes(topicKey)) {
        return buildSportsMedicineProposalPacket(topicKey);
      }
      if (listAdultReconstructionTopicKeys().includes(topicKey)) {
        return buildAdultReconstructionProposalPacket(topicKey);
      }
      throw new Error(`No proposal builder registered for topic ${topicKey}`);
  }
}

function ensureDirs() {
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(DOCS_DIR, { recursive: true });
}

function loadCuratedProposals(prefix: string) {
  const file = path.join(OUT_DIR, `${prefix}-curated-proposals.json`);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8")) as {
    proposals: import("./kg-automation-common.ts").ProposalRecord[];
    curation: CurationReport;
  };
}

async function main() {
  const { topic, cmd } = parseArgs(process.argv);
  const topicDef = topic ? resolveTopic(topic) : undefined;

  if (!topicDef || cmd === "help") {
    console.log(
      "Usage: kg-factory-pilot.ts --topic <topic-key> <generate|curate|review|persist|dry-run|quality|publication>"
    );
    process.exitCode = topicDef || cmd === "help" ? 0 : 1;
    return;
  }

  const prefix = topicPrefix(topicDef.topicKey);
  const packet = buildProposalPacket(topicDef.topicKey);

  switch (cmd) {
    case "generate": {
      ensureDirs();
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
      writeFileSync(path.join(OUT_DIR, `${prefix}-proposal-packet.json`), `${JSON.stringify(out, null, 2)}\n`);
      writeSnapshot(OUT_DIR, {
        generatedAt: out.generatedAt,
        tableAvailable: false,
        persistedToDatabase: false,
        proposalCount: packet.proposals.length,
        proposals: packet.proposals,
      });
      console.log(JSON.stringify({ ok: packet.validationErrors.length === 0, ...out.summary }, null, 2));
      if (packet.validationErrors.length) process.exitCode = 1;
      break;
    }
    case "curate": {
      ensureDirs();
      const { curated, decisions } = curateProposalBatch(packet.proposals);
      const summary = summarizeCurationRoutes(decisions);
      const curation: CurationReport = {
        generatedAt: new Date().toISOString(),
        pilotKey: topicDef.pilotKey,
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

      writeFileSync(
        path.join(OUT_DIR, `${prefix}-curated-proposals.json`),
        `${JSON.stringify({ proposals: curated, curation }, null, 2)}\n`
      );
      writeFileSync(path.join(OUT_DIR, `${prefix}-curation-report.json`), `${JSON.stringify(curation, null, 2)}\n`);

      const humanPct =
        ((summary.HUMAN_REVIEW + summary.ATTENDING_REVIEW) / Math.max(curated.length, 1)) * 100;
      const autoPct =
        ((summary.AUTO_APPROVED_LOW_RISK + summary.AUTO_REVISED) / Math.max(curated.length, 1)) * 100;

      console.log(
        JSON.stringify(
          {
            total: curated.length,
            summary,
            humanReviewPercent: Math.round(humanPct),
            autoCuratedPercent: Math.round(autoPct),
          },
          null,
          2
        )
      );
      break;
    }
    case "review": {
      ensureDirs();
      const data = loadCuratedProposals(prefix);
      if (!data) {
        console.error("Run curate first.");
        process.exitCode = 1;
        return;
      }
      const { markdown, items } = buildHumanReviewPacket(data.proposals, data.curation);
      writeFileSync(path.join(OUT_DIR, `${prefix}-human-review-queue.md`), `${markdown}\n`);
      writeFileSync(path.join(OUT_DIR, `${prefix}-human-review-queue.json`), `${JSON.stringify(items, null, 2)}\n`);
      writeFileSync(path.join(DOCS_DIR, `${prefix}-human-review-queue.md`), `${markdown}\n`);
      console.log(
        JSON.stringify({ humanReviewItems: items.length, md: path.join(OUT_DIR, `${prefix}-human-review-queue.md`) }, null, 2)
      );
      break;
    }
    case "persist": {
      ensureDirs();
      const data = loadCuratedProposals(prefix);
      const proposals = data?.proposals ?? packet.proposals;
      const result = await persistProposals(proposals);
      writeFileSync(path.join(OUT_DIR, `${prefix}-persist-result.json`), `${JSON.stringify(result, null, 2)}\n`);
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case "dry-run": {
      const data = loadCuratedProposals(prefix);
      const proposals = data?.proposals ?? packet.proposals;
      const mutations = dryRunApplyProposals(proposals);
      writeFileSync(path.join(OUT_DIR, `${prefix}-dry-run-mutations.json`), `${JSON.stringify(mutations, null, 2)}\n`);
      console.log(
        JSON.stringify({ mutations: mutations.length, kinds: [...new Set(mutations.map((m) => m.kind))] }, null, 2)
      );
      break;
    }
    case "quality": {
      ensureDirs();
      const data = loadCuratedProposals(prefix);
      const proposals = data?.proposals ?? (await loadPilotProposals(topicDef.pilotKey));
      const fallback = proposals.length ? proposals : packet.proposals;
      const report = await loadDbQualityMetrics(topicDef.pilotKey, fallback);
      writeFileSync(path.join(OUT_DIR, `${prefix}-db-quality.json`), `${JSON.stringify(report, null, 2)}\n`);
      const md = [
        `# Database Quality — ${topicDef.displayName}`,
        "",
        `Source: **${report.source}**`,
        `Maturity: **Level ${report.estimatedMaturityLevel}**`,
        "",
        "## Metrics",
        ...Object.entries(report.metrics).map(([k, v]) => `- ${k}: ${v}`),
        "",
      ].join("\n");
      writeFileSync(path.join(OUT_DIR, `${prefix}-db-quality.md`), `${md}\n`);
      console.log(JSON.stringify(report, null, 2));
      break;
    }
    case "publication": {
      ensureDirs();
      const data = loadCuratedProposals(prefix);
      const proposals = data?.proposals ?? packet.proposals;
      const validation = validateProposalPacket(topicDef.pilotKey, proposals);
      const report = assessPublicationReadiness(topicDef.pilotKey, proposals, validation, data?.curation);
      writeFileSync(
        path.join(OUT_DIR, `${prefix}-publication-readiness.json`),
        `${JSON.stringify(report, null, 2)}\n`
      );
      const md = [
        `# Publication Readiness — ${topicDef.displayName}`,
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
      writeFileSync(path.join(OUT_DIR, `${prefix}-publication-readiness.md`), `${md}\n`);
      console.log(
        JSON.stringify({ ready: report.ready, maturity: report.estimatedMaturityLevel, blockers: report.blockers.length }, null, 2)
      );
      break;
    }
    default:
      console.log(
        "Usage: kg-factory-pilot.ts --topic <topic-key> <generate|curate|review|persist|dry-run|quality|publication>"
      );
      process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});