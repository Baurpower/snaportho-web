import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildOntologyReviewPacket,
  type CardClaimFactoryEvaluation,
} from "../src/lib/education/card-claim-factory-evaluation.ts";
import { stableJson } from "../src/lib/education/deck-mapping-factory.ts";

function requiredArg(name: string): string {
  const value = process.argv.find((argument) => argument.startsWith(`${name}=`))?.slice(name.length + 1);
  if (!value) throw new Error(`missing_required_argument:${name}`);
  return value;
}

const inputPath = requiredArg("--input");
const outDir = requiredArg("--out");
const evaluation = JSON.parse(await readFile(inputPath, "utf8")) as CardClaimFactoryEvaluation;
const suppliedRunId = process.argv.find((argument) => argument.startsWith("--review-run-id="))?.slice("--review-run-id=".length);
const generatedPacket = buildOntologyReviewPacket(evaluation);
// A review packet may be regenerated from the same deterministic factory run
// after quality rules change. Give that regenerated review cohort its own ID so
// stale proposals can be superseded instead of silently coexisting.
const packet = suppliedRunId ? { ...generatedPacket, runId: suppliedRunId } : generatedPacket;

const actionCounts = Object.fromEntries(
  [...new Set(packet.items.map((item) => item.recommendedAction))]
    .sort()
    .map((action) => [action, packet.items.filter((item) => item.recommendedAction === action).length]),
);
const typeCounts = Object.fromEntries(
  [...new Set(packet.items.map((item) => item.entityType))]
    .sort()
    .map((entityType) => [entityType, packet.items.filter((item) => item.entityType === entityType).length]),
);
const summary = {
  contractVersion: packet.contractVersion,
  runId: packet.runId,
  mode: packet.mode,
  proposedEntityCandidates: packet.items.length,
  blockedCandidates: packet.blockedCandidates.length,
  recommendationCounts: actionCounts,
  entityTypeCounts: typeCounts,
  promotionBoundary: "review_only_no_canonical_or_proposal_database_writes",
};

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "ontology-review-packet.json"), `${stableJson(packet)}\n`);
await writeFile(path.join(outDir, "ontology-review-summary.json"), `${stableJson(summary)}\n`);
console.log(JSON.stringify({ outDir, ...summary }, null, 2));
