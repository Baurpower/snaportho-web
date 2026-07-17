import path from "node:path";
import { PREDICATE_REGISTRY } from "./lib/education/kg-relationship-registry.ts";
import {
  GraphFinalizationPipeline,
  type AliasEntry,
  type CanonicalRegistryEntry,
  type GraphFinalizationInput,
  type PriorReviewDecision,
  type SourceManifestEntry,
} from "./lib/education/kg-finalization/index.ts";
import type {
  NeighborhoodEntity,
} from "./lib/education/kg-compiler/types.ts";
import {
  applyPostReviewInput,
  readJsonIfExists,
  readMergedNeighborhoodDraft,
} from "./lib/education/kg-finalization/post-review-input.ts";

type CliOptions = {
  topic?: string;
  inputDir?: string;
  outDir: string;
  priorReview?: string;
  sourceManifest?: string;
  canonicalRegistry?: string;
  aliases?: string;
  postReviewInput?: string;
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (!options.topic && !options.inputDir) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const topic = options.topic ?? path.basename(options.inputDir ?? "");
  const inputDir = options.inputDir ?? path.join("reports", "kg-compiler", topic);
  const outDir = path.join(options.outDir, topic);
  let draft = await readMergedNeighborhoodDraft(inputDir);
  const postReviewPackage = options.postReviewInput ? await readJsonIfExists<Record<string, unknown>>(options.postReviewInput, {}) : undefined;
  if (postReviewPackage) draft = await applyPostReviewInput(draft, postReviewPackage, options.postReviewInput!);
  const inferredPriorReview = postReviewPackage?.source_decisions ? String(postReviewPackage.source_decisions) : undefined;
  const priorReviewPath = options.priorReview ?? inferredPriorReview;
  const priorReviewDecisions = priorReviewPath ? await readJsonIfExists<PriorReviewDecision[]>(priorReviewPath, []) : [];
  const sourceManifest = options.sourceManifest ? await readSourceManifest(options.sourceManifest) : [];
  const canonicalRegistry = options.canonicalRegistry
    ? await readJsonIfExists<CanonicalRegistryEntry[]>(options.canonicalRegistry, [])
    : buildLocalCanonicalRegistry(draft.entities, draft.topicKey);
  const aliases = options.aliases ? await readJsonIfExists<AliasEntry[]>(options.aliases, []) : [];

  const input: GraphFinalizationInput = {
    neighborhoodId: draft.topicKey ?? topic,
    entities: draft.entities ?? [],
    relationships: draft.relationships ?? [],
    claims: draft.claims ?? [],
    decisionPoints: draft.decisionPoints ?? [],
    canonicalRegistry,
    aliases,
    predicateRegistry: PREDICATE_REGISTRY,
    sourceManifest,
    priorReviewDecisions,
    neighborhoodMetadata: {
      topicKey: draft.topicKey,
      pilotKey: draft.pilotKey,
      inputDirectory: inputDir,
      generatedAt: draft.generatedAt,
      primaryEntitySlug: inferPrimarySlug(draft),
      reviewOverlayApplied: Boolean(postReviewPackage),
      postReviewInput: options.postReviewInput,
    },
  };

  const pipeline = new GraphFinalizationPipeline();
  const result = pipeline.run(input);
  await pipeline.writeReports(result, outDir);

  console.log(`KG finalization reports written to ${outDir}`);
  console.log(JSON.stringify(result.summary, null, 2));
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    outDir: path.join("reports", "kg-finalization"),
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
    if (arg === "--topic") {
      options.topic = next;
      index += 1;
    } else if (arg === "--input-dir") {
      options.inputDir = next;
      index += 1;
    } else if (arg === "--out-dir") {
      options.outDir = next ?? options.outDir;
      index += 1;
    } else if (arg === "--prior-review") {
      options.priorReview = next;
      index += 1;
    } else if (arg === "--source-manifest") {
      options.sourceManifest = next;
      index += 1;
    } else if (arg === "--canonical-registry") {
      options.canonicalRegistry = next;
      index += 1;
    } else if (arg === "--aliases") {
      options.aliases = next;
      index += 1;
    } else if (arg === "--post-review-input") {
      options.postReviewInput = next;
      index += 1;
    }
  }
  return options;
}

function printUsage(): void {
  console.log(`Usage:
  npm run kg:finalize -- --topic <topic-key> [--input-dir <compiler-output-dir>] [--out-dir <report-dir>]

Options:
  --topic <topic-key>              Topic/neighborhood key. Defaults output subfolder name.
  --input-dir <dir>                Directory containing merged-neighborhood-draft.json or ontology-merged-draft.json.
  --out-dir <dir>                  Report output root. Default: reports/kg-finalization.
  --prior-review <json>            Optional prior review decisions JSON.
  --source-manifest <json>         Optional source manifest JSON.
  --canonical-registry <json>      Optional canonical registry JSON.
  --aliases <json>                 Optional alias registry JSON.
  --post-review-input <json>       Optional normalized post-review graph/overlay package.

This command is report-only. It does not stage, persist, publish, certify, or write database state.`);
}

async function readSourceManifest(filePath: string): Promise<SourceManifestEntry[]> {
  const raw = await readJsonIfExists<unknown>(filePath, []);
  if (Array.isArray(raw)) return raw as SourceManifestEntry[];
  if (raw && typeof raw === "object") {
    const object = raw as Record<string, unknown>;
    const entries = object.sources ?? object.evidence_sources ?? object.items ?? object.manifest;
    if (Array.isArray(entries)) return entries as SourceManifestEntry[];
  }
  return [];
}

function buildLocalCanonicalRegistry(entities: NeighborhoodEntity[], neighborhoodId: string): CanonicalRegistryEntry[] {
  return entities.map((entity) => ({
    slug: entity.slug,
    entityType: String(entity.entityType),
    preferredLabel: entity.preferredLabel,
    neighborhoodId,
    aliases: Array.isArray(entity.metadata?.aliases) ? (entity.metadata.aliases as string[]) : [],
    metadata: entity.metadata,
  }));
}

function inferPrimarySlug(draft: MergedNeighborhoodDraft): string | undefined {
  return (
    draft.entities.find((entity) => entity.slug === draft.topicKey)?.slug ??
    draft.entities.find((entity) => String(entity.entityType) === "condition")?.slug ??
    draft.entities[0]?.slug
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
