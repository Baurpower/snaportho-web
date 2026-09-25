import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

import {
  CARD_CLAIM_FACTORY_ALGORITHM,
  runCardClaimFactory,
  type CardClaimFactoryOutput,
  type CardClaimFactoryCard,
  type ExistingClaimRef,
} from "../src/lib/education/card-claim-factory.ts";
import {
  buildFactoryEvaluation,
  normalizeSnapshot,
  type EvaluationMode,
} from "../src/lib/education/card-claim-factory-evaluation.ts";
import {
  ENTITY_INDEX_SQL,
  EXISTING_CLAIMS_SQL,
  PUBLISHED_DECK_CARDS_SQL,
  PUBLISHED_RELEASE_SQL,
  RELEASE_BY_ID_SQL,
  mapEntityRow,
  mapExistingClaimRow,
  mapPublishedDeckRow,
  parseCardClaimDryRunGuard,
  queueDistribution,
  stratifyCards,
  type DeckReleaseRef,
  type PublishedDeckLoaderRow,
} from "../src/lib/education/card-claim-deck-loader.ts";
import { checksum, stableJson } from "../src/lib/education/deck-mapping-factory.ts";
import type { EntityIndexRow } from "../src/lib/education/deck-semantic-mapping.ts";

const { Client } = pg;

const args = new Map(process.argv.slice(2).map((value) => {
  const [key, ...rest] = value.split("=");
  return [key, rest.join("=") || "true"] as const;
}));
const guard = parseCardClaimDryRunGuard(args);
const outRoot = args.get("--out") ?? "/tmp/snaportho-card-claim-factory";
const fromDb = args.has("--from-db");
const explicitMode = args.get("--mode");
if (explicitMode !== undefined && explicitMode !== "live" && explicitMode !== "fixture") {
  throw new Error(`unknown_mode:${explicitMode}`);
}
if (explicitMode === "live" && !fromDb) throw new Error("live_mode_requires_from_db");
if (explicitMode === "fixture" && fromDb) throw new Error("fixture_mode_conflicts_with_from_db");
const mode: EvaluationMode = explicitMode ?? (fromDb ? "live" : "fixture");
const batchSizeRaw = args.get("--batch-size");
const batchSize = batchSizeRaw ? Number(batchSizeRaw) : null;
if (batchSize !== null && (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500)) {
  throw new Error("batch_size_must_be_1_to_500");
}

function envFile(file: string) {
  const out: Record<string, string> = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    out[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return out;
}

async function loadFromJson(): Promise<{
  cards: CardClaimFactoryCard[];
  entities: EntityIndexRow[];
  existingClaims: ExistingClaimRef[];
  release: DeckReleaseRef | null;
}> {
  const inputDir = args.get("--input") ?? "/tmp/snaportho-card-claim-factory-input";
  const payload = JSON.parse(await readFile(path.join(inputDir, "card-claim-factory-input.json"), "utf8")) as {
    cards: CardClaimFactoryCard[];
    entities: EntityIndexRow[];
    existingClaims?: ExistingClaimRef[];
  };
  const cards = guard.limit ? payload.cards.slice(0, guard.limit) : payload.cards;
  return {
    cards,
    entities: payload.entities,
    existingClaims: payload.existingClaims ?? [],
    release: null,
  };
}

async function loadFromDatabase(): Promise<{
  cards: CardClaimFactoryCard[];
  entities: EntityIndexRow[];
  existingClaims: ExistingClaimRef[];
  release: DeckReleaseRef;
  rolledBack: boolean;
  db: pg.Client;
}> {
  const env = { ...envFile(path.resolve(".env.local")), ...process.env };
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL required for read-only published-deck loading");
  const db = new Client({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    application_name: "card_claim_factory_readonly",
  });
  await db.connect();
  console.log("Read-only database connection established.");
  let rolledBack = false;
  try {
    await db.query("begin");
    await db.query("set transaction read only");
    await db.query(guard.fullDeck ? "set local statement_timeout='10min'" : "set local statement_timeout='90s'");
    if ((await db.query("show transaction_read_only")).rows[0]?.transaction_read_only !== "on") {
      throw new Error("read_only_guard_failed");
    }
    console.log("Read-only transaction confirmed; loading published deck.");
    const releaseRow = args.get("--release-id")
      ? (await db.query(RELEASE_BY_ID_SQL, [args.get("--release-id")])).rows[0]
      : (await db.query(PUBLISHED_RELEASE_SQL)).rows[0];
    if (!releaseRow) throw new Error("published_deck_release_not_found");
    if (releaseRow.status !== "published") throw new Error(`deck_release_not_published:${releaseRow.status}`);
    const release: DeckReleaseRef = {
      id: releaseRow.id,
      releaseKey: releaseRow.release_key,
      releaseVersion: releaseRow.release_version,
      status: releaseRow.status,
      manifestChecksum: releaseRow.manifest_checksum,
    };
    const fetchLimit = guard.fullDeck ? 100_000 : Math.min(400, Math.max((guard.limit ?? 50) * 8, 50));
    const cardRows = (await db.query(PUBLISHED_DECK_CARDS_SQL, [release.id, fetchLimit])).rows as PublishedDeckLoaderRow[];
    if (cardRows.length === 0) throw new Error("published_deck_has_no_included_cards");
    const mapped = cardRows.map(mapPublishedDeckRow);
    const cards = guard.fullDeck || !guard.limit ? mapped : stratifyCards(mapped, guard.limit);
    console.log(`Loaded ${cards.length} cards; loading entity index.`);
    const entityRows = (await db.query(ENTITY_INDEX_SQL)).rows;
    const entities = entityRows.map(mapEntityRow);
    let existingClaims: ExistingClaimRef[] = [];
    const claimsTable = await db.query("select to_regclass('public.educational_claims') as name");
    if (claimsTable.rows[0]?.name) {
      existingClaims = (await db.query(EXISTING_CLAIMS_SQL)).rows
        .map(mapExistingClaimRow)
        .filter((row: ExistingClaimRef | null): row is ExistingClaimRef => row !== null);
    }
    console.log(`Loaded ${entities.length} entities and ${existingClaims.length} existing claims.`);
    return { cards, entities, existingClaims, release, rolledBack, db };
  } catch (error) {
    try {
      await db.query("rollback");
      rolledBack = true;
    } catch {
      // ignore rollback failure on the original error
    }
    await db.end();
    throw error;
  }
}

/**
 * A full published deck can exceed short-lived command hosts. Checkpoint each
 * deterministic batch locally so an interrupted dry run can be resumed without
 * touching the database. Cards are note-grouped to preserve sibling checks.
 */
async function runCheckpointedFactory(input: {
  cards: CardClaimFactoryCard[];
  entities: EntityIndexRow[];
  existingClaims: ExistingClaimRef[];
  deckId?: string;
}): Promise<CardClaimFactoryOutput> {
  if (!batchSize) return runCardClaimFactory(input);
  const cards = [...input.cards].sort((left, right) => (
    left.noteGuid.localeCompare(right.noteGuid) || left.cardOrdinal - right.cardOrdinal || left.canonicalCardId.localeCompare(right.canonicalCardId)
  ));
  const checkpointKey = checksum({
    algorithm: CARD_CLAIM_FACTORY_ALGORITHM,
    implementation: "2026-09-24.checkpointed",
    deckId: input.deckId ?? "fixture",
    cards: cards.map((card) => [card.canonicalCardVersionId, card.contentHash]),
  });
  const checkpointDir = path.join(outRoot, ".checkpoints", checkpointKey);
  await mkdir(checkpointDir, { recursive: true });
  const results: CardClaimFactoryOutput[] = [];
  const failures: Array<{ canonicalCardId: string; error: string }> = [];
  for (let start = 0; start < cards.length; start += batchSize) {
    const batchNumber = Math.floor(start / batchSize);
    const checkpointPath = path.join(checkpointDir, `${String(batchNumber).padStart(5, "0")}.json`);
    let batchResults: CardClaimFactoryOutput[];
    if (args.has("--resume") && existsSync(checkpointPath)) {
      const saved = JSON.parse(await readFile(checkpointPath, "utf8")) as CardClaimFactoryOutput | {
        outputs: CardClaimFactoryOutput[];
        failures: Array<{ canonicalCardId: string; error: string }>;
      };
      if ("outputs" in saved) {
        batchResults = saved.outputs;
        failures.push(...saved.failures);
      } else {
        batchResults = [saved];
      }
    } else {
      const batchCards = cards.slice(start, start + batchSize);
      try {
        batchResults = [runCardClaimFactory({ ...input, cards: batchCards })];
      } catch {
        batchResults = [];
        for (const card of batchCards) {
          try {
            batchResults.push(runCardClaimFactory({ ...input, cards: [card] }));
          } catch (error) {
            failures.push({
              canonicalCardId: card.canonicalCardId,
              error: error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300),
            });
          }
        }
      }
      const checkpointFailures = failures.filter((failure) => batchCards.some((card) => card.canonicalCardId === failure.canonicalCardId));
      await writeFile(checkpointPath, `${stableJson({ outputs: batchResults, failures: checkpointFailures })}\n`);
    }
    results.push(...batchResults);
    console.log(JSON.stringify({ checkpoint: `${Math.min(start + batchSize, cards.length)} / ${cards.length}`, batch: batchNumber + 1 }));
  }
  const first = results[0];
  if (!first) return runCardClaimFactory(input);
  const claims = new Map(first.proposedClaims.map((claim) => [claim.fingerprintHash, claim]));
  const entities = new Map(first.proposedEntities.map((entity) => [entity.entityId, structuredClone(entity)]));
  const links = new Map(first.autoApprovedLinks.map((link) => [link.canonicalCardId, link]));
  const assignments = new Map(first.assignments.map((assignment) => [assignment.canonicalCardId, assignment]));
  const gaps = new Map(first.gaps.map((gap) => [gap.canonicalCardId, gap]));
  const reviews = [...first.machineReviews];
  for (const result of results.slice(1)) {
    for (const claim of result.proposedClaims) claims.set(claim.fingerprintHash, claim);
    for (const entity of result.proposedEntities) {
      const previous = entities.get(entity.entityId);
      if (!previous) entities.set(entity.entityId, structuredClone(entity));
      else for (const cardId of entity.sourceCardIds) if (!previous.sourceCardIds.includes(cardId)) previous.sourceCardIds.push(cardId);
    }
    for (const link of result.autoApprovedLinks) links.set(link.canonicalCardId, link);
    for (const assignment of result.assignments) assignments.set(assignment.canonicalCardId, assignment);
    for (const gap of result.gaps) gaps.set(gap.canonicalCardId, gap);
    reviews.push(...result.machineReviews);
  }
  const proposedClaims = [...claims.values()];
  const autoApprovedLinks = [...links.values()];
  const allAssignments = [...assignments.values()];
  const allEntities = [...entities.values()];
  const allAssignmentsWithFailures = [
    ...allAssignments,
    ...failures.map((failure) => ({
      canonicalCardId: failure.canonicalCardId,
      canonicalCardVersionId: "00000000-0000-4000-8000-000000000000",
      noteGuid: "factory_failure",
      cardOrdinal: 0,
      contentHash: "factory_failure",
      queue: "extraction_failed" as const,
      reasonCodes: ["factory_error", failure.error],
      fingerprintHash: null,
    })),
  ];
  return {
    ...first,
    factoryRunId: `checkpointed-${checkpointKey.slice(0, 24)}`,
    proposedClaims,
    proposedEntities: allEntities,
    autoApprovedLinks,
    assignments: allAssignmentsWithFailures,
    exceptionQueue: allAssignmentsWithFailures.filter((assignment) => assignment.queue !== "auto_approved"),
    gaps: [...gaps.values()],
    machineReviews: reviews,
    metrics: {
      ...first.metrics,
      cardsProcessed: allAssignmentsWithFailures.length,
      autoApprovedCards: allAssignmentsWithFailures.filter((assignment) => assignment.queue === "auto_approved").length,
      autoApprovedLinks: autoApprovedLinks.length,
      proposedClaims: proposedClaims.length,
      ontologyFills: allEntities.length,
      exceptionCards: allAssignmentsWithFailures.filter((assignment) => assignment.queue !== "auto_approved").length,
      mergedClaimCount: autoApprovedLinks.length - new Set(autoApprovedLinks.map((link) => link.claimId)).size,
      canonicalEntityMatches: proposedClaims.filter((claim) => claim.entityTargetType === "canonical").length,
      proposedEntitiesCreated: allEntities.length,
      proposedEntitiesReused: allEntities.reduce((sum, entity) => sum + Math.max(0, entity.sourceCardIds.length - 1), 0),
      cardsAttachedToProposedEntities: allEntities.reduce((sum, entity) => sum + entity.sourceCardIds.length, 0),
      shortLabelInsufficientContext: results.reduce((sum, result) => sum + result.metrics.shortLabelInsufficientContext, 0),
      entityLikenessBlocked: results.reduce((sum, result) => sum + result.metrics.entityLikenessBlocked, 0),
      contextSpecificityBlocked: results.reduce((sum, result) => sum + result.metrics.contextSpecificityBlocked, 0),
      openMissingEntity: allAssignmentsWithFailures.filter((assignment) => assignment.queue === "missing_entity").length,
    },
  };
}

let loaded: Awaited<ReturnType<typeof loadFromJson>> | Awaited<ReturnType<typeof loadFromDatabase>>;
try {
  loaded = fromDb ? await loadFromDatabase() : await loadFromJson();
} catch (error) {
  if (fromDb) {
    // Live mode never falls back to fixture mode: fail loudly instead.
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`LIVE_DATA_UNAVAILABLE reason=${reason}`);
    process.exit(2);
  }
  throw error;
}
let dbHandle: pg.Client | null = fromDb ? (loaded as Awaited<ReturnType<typeof loadFromDatabase>>).db : null;
let rolledBack = false;
try {
  console.log(`Running factory for ${loaded.cards.length} cards.`);
  const result = await runCheckpointedFactory({
    cards: loaded.cards,
    entities: loaded.entities,
    existingClaims: loaded.existingClaims,
    deckId: loaded.release?.id ?? undefined,
  });
  console.log("Factory complete; writing local artifacts.");
  for (const card of loaded.cards) card.fields.length = 0;

  const out = path.join(outRoot, result.factoryRunId);
  try {
    await access(out);
    if (!args.has("--resume")) throw new Error(`output_exists_use_resume:${out}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await mkdir(out, { recursive: true });
  const distribution = queueDistribution(result.assignments);
  const evaluation = buildFactoryEvaluation(result, { mode, entities: loaded.entities });
  const snapshot = normalizeSnapshot(result, mode);
  const artifacts: Record<string, unknown> = {
    "factory-run-manifest.json": {
      contractVersion: result.contractVersion,
      factoryRunId: result.factoryRunId,
      algorithmVersion: CARD_CLAIM_FACTORY_ALGORITHM,
      dryRun: true,
      mode,
      source: fromDb ? "published_deck" : "json_fixture",
      release: loaded.release,
      limit: guard.limit,
      fullDeck: guard.fullDeck,
      status: "completed",
    },
    "proposed-claims.json": result.proposedClaims,
    "proposed-entities.json": result.proposedEntities,
    "auto-approved-links.json": result.autoApprovedLinks,
    "card-assignments.json": result.assignments,
    "exception-queue.json": result.exceptionQueue,
    "gaps.json": result.gaps,
    "machine-reviews.json": result.machineReviews,
    "queue-distribution.json": distribution,
    "metrics.json": result.metrics,
    "evaluation.json": evaluation,
    "snapshot.json": snapshot,
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
      `- Mode: ${mode}`,
      `- Source: ${fromDb ? "published_deck" : "json_fixture"}`,
      loaded.release ? `- Release: ${loaded.release.releaseKey} ${loaded.release.releaseVersion}` : "",
      `- Cards: ${result.metrics.cardsProcessed}`,
      `- Auto-approved links: ${result.metrics.autoApprovedLinks}`,
      `- Proposed claims: ${result.metrics.proposedClaims}`,
      `- Exception cards: ${result.metrics.exceptionCards}`,
      `- Queue mix: ${JSON.stringify(distribution)}`,
      `- Run ID: ${result.factoryRunId}`,
      "",
      "Read-only. No database write. Auto-approved links are machine consensus artifacts, not publication.",
      "",
    ].filter(Boolean).join("\n"),
  );
  console.log(JSON.stringify({
    dryRun: true,
    mode,
    source: fromDb ? "published_deck" : "json_fixture",
    out,
    runId: result.factoryRunId,
    release: loaded.release,
    queueDistribution: distribution,
    metrics: result.metrics,
    evaluation: {
      unresolved: evaluation.unresolved,
      proposedEntitiesCreated: evaluation.proposedEntitiesCreated,
      proposedEntitiesReused: evaluation.proposedEntitiesReused,
    },
  }, null, 2));
} finally {
  if (dbHandle) {
    if (!rolledBack) {
      try {
        await dbHandle.query("rollback");
        rolledBack = true;
      } catch {
        // ignore
      }
    }
    await dbHandle.end();
  }
}
