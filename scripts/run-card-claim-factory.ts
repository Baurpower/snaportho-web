import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// @ts-expect-error Direct Node runner imports TypeScript source files.
import { runCardClaimFactory, CARD_CLAIM_FACTORY_ALGORITHM } from "../src/lib/education/card-claim-factory.ts";
// @ts-expect-error Direct Node runner imports TypeScript source files.
import { checksum, stableJson } from "../src/lib/education/deck-mapping-factory.ts";
import type { CardClaimFactoryCard } from "../src/lib/education/card-claim-factory";
import type { EntityIndexRow } from "../src/lib/education/deck-semantic-mapping";

const args = new Map(process.argv.slice(2).map((value) => {
  const [key, ...rest] = value.split("=");
  return [key, rest.join("=") || "true"] as const;
}));
if (args.has("--apply")) throw new Error("card_claim_factory_has_no_apply_mode");

const inputDir = args.get("--input") ?? "/tmp/snaportho-card-claim-factory-input";
const outRoot = args.get("--out") ?? "/tmp/snaportho-card-claim-factory";
const payload = JSON.parse(await readFile(path.join(inputDir, "card-claim-factory-input.json"), "utf8")) as {
  cards: CardClaimFactoryCard[];
  entities: EntityIndexRow[];
};

const result = runCardClaimFactory({
  cards: payload.cards,
  entities: payload.entities,
});
const out = path.join(outRoot, result.factoryRunId);
try {
  await access(out);
  if (!args.has("--resume")) throw new Error(`output_exists_use_resume:${out}`);
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
await mkdir(out, { recursive: true });

const artifacts: Record<string, unknown> = {
  "factory-run-manifest.json": {
    contractVersion: result.contractVersion,
    factoryRunId: result.factoryRunId,
    algorithmVersion: CARD_CLAIM_FACTORY_ALGORITHM,
    dryRun: true,
    status: "completed",
  },
  "proposed-claims.json": result.proposedClaims,
  "auto-approved-links.json": result.autoApprovedLinks,
  "card-assignments.json": result.assignments,
  "exception-queue.json": result.exceptionQueue,
  "gaps.json": result.gaps,
  "machine-reviews.json": result.machineReviews,
  "metrics.json": result.metrics,
};
for (const [name, value] of Object.entries(artifacts).sort(([left, right]) => left.localeCompare(right))) {
  await writeFile(path.join(out, name), `${stableJson(value)}\n`);
}
const inventory = Object.entries(artifacts)
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([name, value]) => ({ name, checksum: checksum(value) }));
await writeFile(path.join(out, "artifact-inventory.json"), `${stableJson(inventory)}\n`);
await writeFile(
  path.join(out, "summary.md"),
  [
    "# Card-claim factory dry run",
    "",
    `- Algorithm: ${CARD_CLAIM_FACTORY_ALGORITHM}`,
    `- Cards: ${result.metrics.cardsProcessed}`,
    `- Auto-approved links: ${result.metrics.autoApprovedLinks}`,
    `- Proposed claims: ${result.metrics.proposedClaims}`,
    `- Exception cards: ${result.metrics.exceptionCards}`,
    `- Run ID: ${result.factoryRunId}`,
    "",
    "No database write. Auto-approved links are machine consensus artifacts, not KG publication.",
    "",
  ].join("\n"),
);
console.log(JSON.stringify({
  dryRun: true,
  out,
  runId: result.factoryRunId,
  metrics: result.metrics,
}, null, 2));
