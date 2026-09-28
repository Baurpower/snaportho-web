import { mkdir, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import pg from "pg";

import {
  CARD_CLAIM_FACTORY_ALGORITHM,
  CARD_CLAIM_FACTORY_CONTRACT_VERSION,
  CARD_CLAIM_FACTORY_IMPLEMENTATION_VERSION,
  runCardClaimFactory,
  type CardClaimFactoryCard,
  type ExistingClaimRef,
} from "../src/lib/education/card-claim-factory.ts";
import {
  ENTITY_INDEX_SQL,
  EXISTING_CLAIMS_SQL,
  PUBLISHED_DECK_CARDS_SQL,
  PUBLISHED_RELEASE_SQL,
  RELEASE_BY_ID_SQL,
  mapEntityRow,
  mapExistingClaimRow,
  mapPublishedDeckRow,
  type DeckReleaseRef,
  type PublishedDeckLoaderRow,
} from "../src/lib/education/card-claim-deck-loader.ts";
import { checksum, stableJson } from "../src/lib/education/deck-mapping-factory.ts";
import {
  SEMANTIC_CLAIM_IDENTITY_VERSION,
  semanticClaimFingerprintHash,
} from "../src/lib/education/contracts/clinical-claim-v1.ts";
import {
  normalizeClinicalText,
  type EntityIndexRow,
} from "../src/lib/education/deck-semantic-mapping.ts";

const { Client } = pg;

const args = new Map(process.argv.slice(2).map((value) => {
  const [key, ...rest] = value.split("=");
  return [key, rest.join("=") || "true"] as const;
}));

// This workflow is intentionally recommendation-only. Canonical mutations
// require a separately reviewed decision import; never re-enable an inline
// `--apply` escape hatch here.
if (args.has("--apply")) {
  throw new Error("card_claim_backfill_is_review_only_no_human_decision_importer_is_available");
}
const apply = false;
const fromDb = args.has("--from-db");
const explicitMode = args.get("--mode");
if (explicitMode !== undefined && explicitMode !== "live" && explicitMode !== "fixture") {
  throw new Error(`unknown_mode:${explicitMode}`);
}
if (explicitMode === "live" && !fromDb) throw new Error("live_mode_requires_from_db");
if (explicitMode === "fixture" && fromDb) throw new Error("fixture_mode_conflicts_with_from_db");
const mode = explicitMode ?? (fromDb ? "live" : "fixture");

const batchSize = Number(args.get("--batch-size") ?? "200");
if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1000) {
  throw new Error("batch_size_must_be_1_to_1000");
}
const outRoot = args.get("--out") ?? "/tmp/snaportho-card-claim-backfill";
const runKeyOverride = args.get("--run-key") ?? null;

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

function proposalFingerprint(entityType: string, normalizedLabel: string): string {
  return createHash("sha256")
    .update(`card-claim-backfill|proposed-entity|${entityType}|${normalizedLabel}`)
    .digest("hex");
}

function confidenceTier(confidence: number): string {
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.5) return "medium";
  return "low";
}

type Totals = {
  discovered: number;
  eligible: number;
  skipped: number;
  processed: number;
  claimsProduced: number;
  claimsInserted: number;
  claimsReused: number;
  claimConflicts: number;
  linksInserted: number;
  linksReused: number;
  canonicalMatches: number;
  proposedEntities: number;
  unresolved: number;
  failed: number;
  skippedReasons: Record<string, number>;
};

function emptyTotals(): Totals {
  return {
    discovered: 0, eligible: 0, skipped: 0, processed: 0, claimsProduced: 0,
    claimsInserted: 0, claimsReused: 0, claimConflicts: 0, linksInserted: 0,
    linksReused: 0, canonicalMatches: 0, proposedEntities: 0, unresolved: 0,
    failed: 0, skippedReasons: {},
  };
}

async function loadFixture(): Promise<{
  cards: CardClaimFactoryCard[];
  entities: EntityIndexRow[];
  existingClaims: ExistingClaimRef[];
  release: DeckReleaseRef | null;
}> {
  const inputDir = args.get("--input") ?? "/tmp/snaportho-card-claim-factory-input";
  const { readFile } = await import("node:fs/promises");
  const payload = JSON.parse(await readFile(path.join(inputDir, "card-claim-factory-input.json"), "utf8")) as {
    cards: CardClaimFactoryCard[];
    entities: EntityIndexRow[];
    existingClaims?: ExistingClaimRef[];
  };
  return {
    cards: payload.cards,
    entities: payload.entities,
    existingClaims: payload.existingClaims ?? [],
    release: null,
  };
}

const env = { ...envFile(path.resolve(".env.local")), ...process.env };
if (fromDb && !env.DATABASE_URL) throw new Error("DATABASE_URL required for live backfill");

const db = fromDb
  ? new Client({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    application_name: apply ? "card_claim_backfill_apply" : "card_claim_backfill_dryrun",
  })
  : null;

async function withDb<T>(fn: (handle: pg.Client) => Promise<T>): Promise<T> {
  // Fresh short-lived connections per unit of work: the sandboxed egress
  // proxy can drop long-idle tunnels, so no connection is held across batches.
  const handle = new Client({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    application_name: apply ? "card_claim_backfill_apply" : "card_claim_backfill_dryrun",
  });
  await handle.connect();
  try {
    return await fn(handle);
  } finally {
    try { await handle.query("rollback"); } catch { /* ignore */ }
    await handle.end();
  }
}

async function withLiveDb<T>(fn: (handle: pg.Client) => Promise<T>): Promise<T> {
  if (!db) throw new Error("live_db_required");
  return withDb(fn);
}

async function main(): Promise<void> {
  {
    const loaded = db
      ? await withLiveDb(async (handle) => {
        await handle.query("begin");
        await handle.query("set transaction read only");
        await handle.query("set local statement_timeout='10min'");
        return loadLive(handle);
      })
      : await loadFixture();
    const runKey = runKeyOverride
      ?? `card-claim-backfill|${loaded.release?.id ?? "fixture"}|${CARD_CLAIM_FACTORY_IMPLEMENTATION_VERSION}`;

    // Eligibility split before batching.
    const eligible: CardClaimFactoryCard[] = [];
    const skipped: Array<{ card: CardClaimFactoryCard; reason: string }> = [];
    for (const card of loaded.cards) {
      if (!card.active || !card.currentVersion) {
        skipped.push({ card, reason: "inactive_or_stale" });
      } else if (card.inclusionStatus !== "included") {
        skipped.push({ card, reason: `inclusion_${card.inclusionStatus}` });
      } else {
        eligible.push(card);
      }
    }

    let runId: string | null = null;
    let resumeDone = new Set<string>();
    if (db && apply && loaded.release) {
      const setup = await withLiveDb(async (handle) => {
        const existing = await handle.query("select id, status from public.card_claim_backfill_runs where run_key = $1", [runKey]);
        if (existing.rows[0]) {
          const id = existing.rows[0].id as string;
          if (existing.rows[0].status === "completed" && !args.has("--reprocess")) {
            return { id, done: true as const, resume: [] as string[] };
          }
          await handle.query("update public.card_claim_backfill_runs set status='running', started_at=coalesce(started_at, now()) where id=$1", [id]);
          await handle.query("commit");
          const doneRows = await handle.query(
            "select canonical_card_version_id from public.card_claim_backfill_items where run_id=$1 and status in ('processed','needs_review')",
            [id],
          );
          return { id, done: false as const, resume: doneRows.rows.map((row) => row.canonical_card_version_id as string) };
        }
        const inserted = await handle.query(
          `insert into public.card_claim_backfill_runs
            (run_key, deck_release_id, mode, status, factory_contract_version, factory_implementation_version, batch_size, started_at)
           values ($1, $2, 'apply', 'running', $3, $4, $5, now()) returning id`,
          [runKey, loaded.release.id, CARD_CLAIM_FACTORY_CONTRACT_VERSION, CARD_CLAIM_FACTORY_IMPLEMENTATION_VERSION, batchSize],
        );
        await handle.query("commit");
        return { id: inserted.rows[0].id as string, done: false as const, resume: [] as string[] };
      });
      runId = setup.id;
      if (setup.done) {
        console.log(JSON.stringify({ backfill: "already_completed", runKey, runId }));
        return;
      }
      resumeDone = new Set(setup.resume);
    }

    const totals = emptyTotals();
    totals.discovered = loaded.cards.length;
    totals.eligible = eligible.length;
    totals.skipped = skipped.length;
    for (const row of skipped) totals.skippedReasons[row.reason] = (totals.skippedReasons[row.reason] ?? 0) + 1;

    const entityById = new Map(loaded.entities.map((entity) => [entity.id, entity]));
    const pending = eligible.filter((card) => !resumeDone.has(card.canonicalCardVersionId));
    const resumedCount = eligible.length - pending.length;
    const batches: CardClaimFactoryCard[][] = [];
    for (let index = 0; index < pending.length; index += batchSize) {
      batches.push(pending.slice(index, index + batchSize));
    }

    const distinctProposals = new Set<string>();
    const placeholderCounts: Record<string, number> = {};
    const factoryFailures: Array<{ card: string; error: string }> = [];
    const accumulate = (result: FactoryBatchResult): void => {
      totals.processed += result.metrics.cardsProcessed;
      totals.claimsProduced += result.metrics.proposedClaims;
      totals.canonicalMatches += result.metrics.canonicalEntityMatches;
      totals.unresolved += result.metrics.openMissingEntity;
      totals.failed += result.assignments.filter((row) => row.queue === "extraction_failed").length;
      for (const entity of result.proposedEntities) {
        distinctProposals.add(entity.entityId);
        if (entity.sourceCardIds.length > 0) {
          placeholderCounts[entity.preferredLabel] =
            (placeholderCounts[entity.preferredLabel] ?? 0) + entity.sourceCardIds.length;
        }
      }
    };
    let done = 0;
    for (const batch of batches) {
      try {
        const batchResults: Array<{ result: FactoryBatchResult; cards: CardClaimFactoryCard[] }> = [];
        try {
          batchResults.push({
            result: runCardClaimFactory({
              cards: batch,
              entities: loaded.entities,
              existingClaims: loaded.existingClaims,
              deckId: loaded.release?.id ?? undefined,
            }),
            cards: batch,
          });
        } catch (batchError) {
          // One poison card must not sink a batch: fall back to per-card runs,
          // recording individual failures and processing the rest.
          for (const card of batch) {
            try {
              batchResults.push({
                result: runCardClaimFactory({
                  cards: [card],
                  entities: loaded.entities,
                  existingClaims: loaded.existingClaims,
                  deckId: loaded.release?.id ?? undefined,
                }),
                cards: [card],
              });
            } catch (cardError) {
              const message = cardError instanceof Error ? cardError.message.slice(0, 300) : String(cardError).slice(0, 300);
              factoryFailures.push({ card: card.canonicalCardId, error: message });
              totals.processed += 1;
              totals.failed += 1;
              if (db && apply && runId) {
                const failedRunId: string = runId;
                await withLiveDb(async (handle) => {
                  await handle.query("begin");
                  try {
                    await upsertItem(handle, failedRunId, card, "failed", {
                      resolutionReason: "factory_error",
                      errorText: message,
                      resultPayload: { queue: "factory_error", reasonCodes: ["factory_error"] },
                    });
                    await handle.query("commit");
                  } catch (persistError) {
                    try { await handle.query("rollback"); } catch { /* ignore */ }
                    throw persistError;
                  }
                });
              }
            }
          }
          void batchError;
        }
        for (const { result, cards } of batchResults) {
          accumulate(result);
          for (const card of cards) card.fields.length = 0;
          if (db && apply && runId) {
            const batchRunId: string = runId;
            await withLiveDb(async (handle) => {
              await handle.query("begin");
              await handle.query("set local statement_timeout='10min'");
              try {
                await persistBatch(handle, batchRunId, cards, result, entityById, totals);
                await handle.query("commit");
              } catch (persistError) {
                try { await handle.query("rollback"); } catch { /* ignore */ }
                throw persistError;
              }
            });
          }
        }
      } catch (error) {
        if (db && apply) {
          console.error(JSON.stringify({
            backfill: "batch_failed",
            done,
            error: error instanceof Error ? error.message : String(error),
          }));
          throw error;
        }
        throw error;
      }
      done += batch.length;
      totals.proposedEntities = distinctProposals.size;
      console.log(JSON.stringify({
        progress: `${done + resumedCount} / ${eligible.length}`,
        claims: totals.claimsProduced,
        canonical: totals.canonicalMatches,
        proposed: totals.proposedEntities,
        needsReview: totals.claimConflicts + totals.unresolved,
        failed: totals.failed,
      }));
    }

    totals.proposedEntities = distinctProposals.size;
    const duplicateCardIds = loaded.cards.length - new Set(loaded.cards.map((card) => card.canonicalCardId)).size;
    const topProposals = Object.entries(placeholderCounts)
      .sort(([, left], [, right]) => right - left)
      .slice(0, 20)
      .map(([label, count]) => ({ label, count }));
    const manifest = {
      backfillRunId: runId,
      runKey,
      dryRun: !apply,
      mode,
      release: loaded.release,
      factoryContractVersion: CARD_CLAIM_FACTORY_CONTRACT_VERSION,
      factoryImplementationVersion: CARD_CLAIM_FACTORY_IMPLEMENTATION_VERSION,
      batchSize,
      resumedCards: resumedCount,
      totals,
      factoryFailures: factoryFailures.slice(0, 50),
      factoryFailureCount: factoryFailures.length,
      duplicateCardIds,
      topProposals,
      unresolvedRate: totals.processed > 0 ? totals.unresolved / totals.processed : 0,
      completedAt: new Date().toISOString(),
    };
    if (db && apply && runId) {
      const finalRunId: string = runId;
      const finalTotals = { ...totals, resumedCards: resumedCount };
      await withLiveDb(async (handle) => {
        await handle.query("begin");
        try {
          await handle.query(
            "update public.card_claim_backfill_runs set status='completed', completed_at=now(), totals=$2 where id=$1",
            [finalRunId, JSON.stringify(finalTotals)],
          );
          await handle.query("commit");
        } catch (persistError) {
          try { await handle.query("rollback"); } catch { /* ignore */ }
          throw persistError;
        }
      });
    }
    const out = path.join(outRoot, apply ? `apply-${runKey.replace(/[^a-z0-9]+/gi, "-")}` : "dry-run");
    await mkdir(out, { recursive: true });
    await writeFile(path.join(out, "backfill-manifest.json"), `${stableJson(manifest)}\n`);
    console.log(JSON.stringify({ backfill: apply ? "apply_complete" : "dry_run_complete", out, totals }, null, 2));
  }
}

async function loadLive(dbHandle: pg.Client): Promise<{
  cards: CardClaimFactoryCard[];
  entities: EntityIndexRow[];
  existingClaims: ExistingClaimRef[];
  release: DeckReleaseRef;
}> {
  const releaseRow = args.get("--release-id")
    ? (await dbHandle.query(RELEASE_BY_ID_SQL, [args.get("--release-id")])).rows[0]
    : (await dbHandle.query(PUBLISHED_RELEASE_SQL)).rows[0];
  if (!releaseRow) throw new Error("published_deck_release_not_found");
  if (releaseRow.status !== "published") throw new Error(`deck_release_not_published:${releaseRow.status}`);
  const release: DeckReleaseRef = {
    id: releaseRow.id,
    releaseKey: releaseRow.release_key,
    releaseVersion: releaseRow.release_version,
    status: releaseRow.status,
    manifestChecksum: releaseRow.manifest_checksum,
  };
  const cardRows = (await dbHandle.query(PUBLISHED_DECK_CARDS_SQL, [release.id, 100_000])).rows as PublishedDeckLoaderRow[];
  if (cardRows.length === 0) throw new Error("published_deck_has_no_included_cards");
  const cards: CardClaimFactoryCard[] = [];
  const hashMismatches: string[] = [];
  for (const row of cardRows) {
    try {
      cards.push(mapPublishedDeckRow(row));
    } catch {
      hashMismatches.push(row.canonical_card_id);
    }
  }
  if (hashMismatches.length > 0) {
    console.log(JSON.stringify({ contentHashMismatches: hashMismatches.length, sample: hashMismatches.slice(0, 5) }));
  }
  const entities = ((await dbHandle.query(ENTITY_INDEX_SQL)).rows as Array<{
    id: string; preferred_label: string; normalized_label: string; entity_type: string;
    is_active: boolean; status: string; aliases: string[] | null; source_aliases: string[] | null;
  }>).map(mapEntityRow);
  const existingClaims = ((await dbHandle.query(EXISTING_CLAIMS_SQL)).rows as Array<{
    id: string; current_version_id: string | null; fingerprint_hash: string; semantic_fingerprint_hash?: string | null;
  }>).map(mapExistingClaimRow).filter((row): row is ExistingClaimRef => row !== null);
  return { cards, entities, existingClaims, release };
}

type FactoryBatchResult = ReturnType<typeof runCardClaimFactory>;

type PersistClaim = {
  claimId: string;
  currentVersionId: string;
  claimText: string;
  claimType: string;
  predicate: string;
  objectText: string;
  qualifiers: Record<string, string>;
  primaryEntityId: string;
  approvalMethod: string;
  algorithmVersion: string;
  evidenceLocator: string;
  evidenceHash: string;
  fingerprintHash: string;
  entityTargetType: string;
  semanticFingerprintHash?: string | null;
  semanticIdentityVersion?: string | null;
  sourceUnitId?: string | null;
  claimIndex?: number | null;
  claimsInVersion?: number | null;
  rewriteMethod?: string | null;
  atomicConfidence?: number | null;
};

type CanonicalClaimOutcome = {
  outcome: "inserted" | "reused" | "conflict";
  /** Active stored claims sharing the canonical semantic fingerprint. Recorded, never auto-merged. */
  semanticCandidates: string[];
};

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const row of rows) {
    const groupKey = key(row);
    const list = out.get(groupKey) ?? [];
    list.push(row);
    out.set(groupKey, list);
  }
  return out;
}

type UnitPersistOutcome = {
  claimIndex: number;
  claimsInVersion: number;
  sourceUnitId: string;
  queue: string;
  reasonCodes: string[];
  claimId: string | null;
  claimRefKind: string | null;
  entityTargetKind: string | null;
  proposalId: string | null;
  teachesLinkId: string | null;
  conflict: boolean;
  semanticCandidates: string[];
};

async function persistUnitClaim(
  dbHandle: pg.Client,
  runId: string,
  factoryRunId: string,
  card: CardClaimFactoryCard,
  claim: PersistClaim,
  unit: { claimIndex: number; claimsInVersion: number; sourceUnitId: string; queue: string; reasonCodes: string[] },
  gapMetadata: Record<string, unknown>,
  link: { confidence: number } | undefined,
  entityById: Map<string, EntityIndexRow>,
  totals: Totals,
): Promise<UnitPersistOutcome> {
  const base = {
    claimIndex: unit.claimIndex,
    claimsInVersion: unit.claimsInVersion,
    sourceUnitId: unit.sourceUnitId,
    queue: unit.queue,
    reasonCodes: unit.reasonCodes,
    claimId: claim.claimId,
  };
  const target = claim.entityTargetType;
  if (target === "canonical") {
    const persisted = await upsertCanonicalClaim(dbHandle, runId, factoryRunId, card, claim);
    if (persisted.outcome === "conflict") {
      totals.claimConflicts += 1;
      return {
        ...base, claimRefKind: "stored_claim", entityTargetKind: "canonical",
        proposalId: null, teachesLinkId: null, conflict: true,
        semanticCandidates: persisted.semanticCandidates,
      };
    }
    if (persisted.outcome === "inserted") totals.claimsInserted += 1;
    else totals.claimsReused += 1;
    let teachesLinkId: string | null = null;
    if (link) {
      teachesLinkId = await upsertTeachesLink(
        dbHandle, runId, factoryRunId, card, claim, link, entityById, unit.reasonCodes, totals,
      );
    }
    return {
      ...base, claimRefKind: "stored_claim", entityTargetKind: "canonical",
      proposalId: null, teachesLinkId, conflict: false,
      semanticCandidates: persisted.semanticCandidates,
    };
  }
  if (target === "proposed") {
    const proposalId = await upsertProposal(dbHandle, runId, factoryRunId, card, claim, gapMetadata);
    return {
      ...base, claimRefKind: "proposed_payload", entityTargetKind: "proposed",
      proposalId, teachesLinkId: null, conflict: false, semanticCandidates: [],
    };
  }
  return {
    ...base, claimRefKind: "unresolved_payload", entityTargetKind: "unresolved",
    proposalId: null, teachesLinkId: null, conflict: false, semanticCandidates: [],
  };
}

async function insertBackfillClaim(
  dbHandle: pg.Client,
  backfillItemId: string,
  outcome: UnitPersistOutcome,
): Promise<void> {
  await dbHandle.query(
    `insert into public.card_claim_backfill_claims
      (backfill_item_id, claim_index, claims_in_version, queue, claim_id,
       claim_ref_kind, entity_target_kind, reason_codes, result_payload)
     values ($1::uuid, $2, $3, $4, $5::uuid, $6, $7, $8, $9::jsonb)
     on conflict (backfill_item_id, claim_index) do update set
       queue = excluded.queue, claim_id = excluded.claim_id,
       claim_ref_kind = excluded.claim_ref_kind, entity_target_kind = excluded.entity_target_kind,
       reason_codes = excluded.reason_codes, result_payload = excluded.result_payload,
       updated_at = now()`,
    [
      backfillItemId, outcome.claimIndex, outcome.claimsInVersion, outcome.queue,
      outcome.claimId, outcome.claimRefKind, outcome.entityTargetKind,
      outcome.reasonCodes, JSON.stringify(outcome),
    ],
  );
}

async function persistBatch(
  dbHandle: pg.Client,
  runId: string,
  batch: CardClaimFactoryCard[],
  result: FactoryBatchResult,
  entityById: Map<string, EntityIndexRow>,
  totals: Totals,
): Promise<void> {
  const assignmentByCard = new Map(result.assignments.map((row) => [row.canonicalCardId, row]));
  const claimById = new Map(result.proposedClaims.map((claim) => [claim.claimId, claim as PersistClaim]));
  const unitsByCard = groupBy(result.unitOutcomes ?? [], (row) => row.canonicalCardId);
  // Links are per (card, claim): a claim shared across cards carries one link
  // row each, and each card must persist its own confidence.
  const linksByCardClaim = new Map(
    result.autoApprovedLinks
      .filter((link) => link.mappingRole === "teaches" && link.reviewStatus === "auto_approved")
      .map((link) => [`${link.canonicalCardId}|${link.claimId}`, link]),
  );
  const gapsByClaim = new Map<string, Record<string, unknown>>();
  for (const gap of result.gaps) {
    const claimId = (gap.metadata as Record<string, unknown> | undefined)?.claimId;
    if (typeof claimId === "string") gapsByClaim.set(claimId, (gap.metadata ?? {}) as Record<string, unknown>);
  }
  const factoryLinksByClaim = groupBy(result.entityLinks ?? [], (row) => row.claimId);
  const flagsByClaim = groupBy(result.qualityFlags ?? [], (row) => row.claimId);

  for (const card of batch) {
    await dbHandle.query("savepoint backfill_card");
    try {
      const assignment = assignmentByCard.get(card.canonicalCardId);
      if (!assignment) throw new Error("missing_assignment");
      const units = (unitsByCard.get(card.canonicalCardId) ?? [])
        .sort((left, right) => left.claimIndex - right.claimIndex);
      if (units.length === 0) {
        // Zero-claim cards (image-dependent, insufficient context, ceiling
        // review) carry no claims; the item records the terminal queue.
        const status = assignment.queue === "extraction_failed"
          ? "failed"
          : assignment.queue === "multi_claim_review"
            ? "needs_review"
            : "processed";
        await upsertItem(dbHandle, runId, card, status, {
          resolutionReason: assignment.reasonCodes[0] ?? assignment.queue,
          resultPayload: {
            queue: assignment.queue, reasonCodes: assignment.reasonCodes, claimCount: 0, claims: [],
          },
        });
        if (status === "failed") totals.failed += 1;
        await dbHandle.query("release savepoint backfill_card");
        continue;
      }
      const outcomes: UnitPersistOutcome[] = [];
      for (const unit of units) {
        const claim = unit.claimId ? claimById.get(unit.claimId) : undefined;
        if (!claim) {
          // Early-exit units (qualifier conflict, negation, competing
          // entities, non-atomic) build no claim; record the queue only.
          outcomes.push({
            claimIndex: unit.claimIndex,
            claimsInVersion: unit.claimsInVersion,
            sourceUnitId: unit.sourceUnitId,
            queue: unit.queue,
            reasonCodes: unit.reasonCodes,
            claimId: null,
            claimRefKind: null,
            entityTargetKind: null,
            proposalId: null,
            teachesLinkId: null,
            conflict: false,
            semanticCandidates: [],
          });
          continue;
        }
        outcomes.push(await persistUnitClaim(
          dbHandle, runId, result.factoryRunId, card, claim, unit,
          gapsByClaim.get(claim.claimId) ?? {},
          linksByCardClaim.get(`${card.canonicalCardId}|${claim.claimId}`),
          entityById, totals,
        ));
      }
      const hasConflict = outcomes.some((outcome) => outcome.conflict);
      const status = hasConflict || assignment.queue === "multi_claim_review" ? "needs_review" : "processed";
      const firstClaim = outcomes.find((outcome) => outcome.claimId);
      const firstProposal = outcomes.find((outcome) => outcome.proposalId);
      const itemId = await upsertItem(dbHandle, runId, card, status, {
        claimId: firstClaim?.claimId ?? undefined,
        claimRefKind: firstClaim?.claimRefKind ?? undefined,
        entityTargetKind: firstClaim?.entityTargetKind ?? undefined,
        proposedProposalId: firstProposal?.proposalId ?? undefined,
        resolutionReason: assignment.reasonCodes[0] ?? assignment.queue,
        teachesLinkId: outcomes.find((outcome) => outcome.teachesLinkId)?.teachesLinkId ?? null,
        conflictKind: hasConflict ? "claim_conflict" : undefined,
        resultPayload: {
          queue: assignment.queue, reasonCodes: assignment.reasonCodes,
          claimCount: outcomes.filter((outcome) => outcome.claimId).length,
          claims: outcomes.map((outcome) => ({
            claimIndex: outcome.claimIndex, queue: outcome.queue, claimId: outcome.claimId,
            entityTarget: outcome.entityTargetKind, conflict: outcome.conflict,
          })),
        },
      });
      for (const outcome of outcomes) {
        await insertBackfillClaim(dbHandle, itemId, outcome);
      }
      // Claim-level entity links and quality flags for every persisted claim.
      const persistedClaims = new Map<string, PersistClaim>();
      for (const outcome of outcomes) {
        if (outcome.claimId && !outcome.conflict) {
          const claim = claimById.get(outcome.claimId);
          if (claim) persistedClaims.set(outcome.claimId, claim);
        }
      }
      for (const [claimId, claim] of persistedClaims) {
        for (const entityLink of factoryLinksByClaim.get(claimId) ?? []) {
          await dbHandle.query(
            `insert into public.claim_entities
              (claim_id, claim_version_id, entity_kind, canonical_entity_id, proposed_proposal_id,
               role, confidence, evidence_locator, algorithm_version)
             values ($1::uuid, $2::uuid, $3, $4::uuid, $5::uuid, $6, $7, $8, $9)
             on conflict do nothing`,
            [
              claimId, claim.currentVersionId, entityLink.entityKind,
              entityLink.entityKind === "canonical" ? entityLink.entityId : null,
              entityLink.entityKind === "proposed"
                ? outcomes.find((outcome) => outcome.claimId === claimId)?.proposalId ?? null
                : null,
              entityLink.role, entityLink.confidence,
              entityLink.evidenceLocator, entityLink.algorithmVersion,
            ],
          );
        }
        for (const flag of flagsByClaim.get(claimId) ?? []) {
          await dbHandle.query(
            `insert into public.claim_quality_flags
              (claim_id, claim_version_id, canonical_card_id, canonical_card_version_id,
               code, severity, detail, algorithm_version)
             values ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6, $7, $8)
             on conflict (claim_id, code) do update set
               severity = excluded.severity, detail = excluded.detail`,
            [
              claimId, claim.currentVersionId, card.canonicalCardId, card.canonicalCardVersionId,
              flag.code, flag.severity, flag.detail, CARD_CLAIM_FACTORY_ALGORITHM,
            ],
          );
        }
      }
      await dbHandle.query("release savepoint backfill_card");
    } catch (error) {
      await dbHandle.query("rollback to savepoint backfill_card");
      const message = error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
      await upsertItem(dbHandle, runId, card, "failed", {
        resolutionReason: "persist_error",
        errorText: message,
        resultPayload: { queue: "persist_error", reasonCodes: ["persist_error"] },
      });
      totals.failed += 1;
    }
  }
}

async function upsertCanonicalClaim(
  dbHandle: pg.Client,
  runId: string,
  factoryRunId: string,
  card: CardClaimFactoryCard,
  claim: PersistClaim,
): Promise<CanonicalClaimOutcome> {
  // Canonical semantic identity via the ONE shared implementation. The factory
  // attaches it; recompute here so a stale caller can never persist a wrong
  // semantic value (the DB trigger recomputes once more on write).
  const semanticHash = semanticClaimFingerprintHash({
    claimText: claim.claimText,
    claimType: claim.claimType,
    qualifiers: claim.qualifiers ?? {},
  });
  const semanticCandidates = ((await dbHandle.query(
    `select id from public.educational_claims
     where is_active
       and semantic_identity_version = $1
       and semantic_fingerprint_hash = $2
     order by created_at asc`,
    [SEMANTIC_CLAIM_IDENTITY_VERSION, semanticHash],
  )).rows as Array<{ id: string }>).map((row) => String(row.id));
  const existing = (await dbHandle.query(
    `select id, claim_text, claim_type, predicate, object_text, qualifiers,
            primary_entity_id, fingerprint_hash
     from public.educational_claims where id = $1::uuid`,
    [claim.claimId],
  )).rows[0];
  if (existing) {
    const same =
      existing.claim_text === claim.claimText
      && existing.claim_type === claim.claimType
      && existing.predicate === claim.predicate
      && existing.object_text === claim.objectText
      && stableJson(existing.qualifiers ?? {}) === stableJson(claim.qualifiers ?? {})
      && String(existing.primary_entity_id) === claim.primaryEntityId
      && existing.fingerprint_hash === claim.fingerprintHash;
    return same ? { outcome: "reused", semanticCandidates } : { outcome: "conflict", semanticCandidates };
  }
  const provenance = {
    sourceUnitId: claim.sourceUnitId ?? null,
    claimIndex: claim.claimIndex ?? null,
    claimsInVersion: claim.claimsInVersion ?? null,
    rewriteMethod: claim.rewriteMethod ?? null,
    atomicConfidence: claim.atomicConfidence ?? null,
  };
  const metadata = {
    backfillRunId: runId,
    factoryRunId,
    factoryContractVersion: CARD_CLAIM_FACTORY_CONTRACT_VERSION,
    canonicalCardId: card.canonicalCardId,
    canonicalCardVersionId: card.canonicalCardVersionId,
    evidenceLocator: claim.evidenceLocator,
    evidenceHash: claim.evidenceHash,
    entityTarget: "canonical",
    semanticFingerprintHash: semanticHash,
    semanticIdentityVersion: SEMANTIC_CLAIM_IDENTITY_VERSION,
    ...provenance,
  };
  const inserted = (await dbHandle.query(
    `insert into public.educational_claims
      (id, primary_entity_id, claim_text, claim_type, predicate, object_text, qualifiers,
       approval_method, algorithm_version, content_source, review_status, metadata)
     values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7::jsonb, $8, $9, 'generated_draft', 'unreviewed', $10::jsonb)
     returning fingerprint_hash, semantic_fingerprint_hash, semantic_identity_version`,
    [
      claim.claimId, claim.primaryEntityId, claim.claimText, claim.claimType,
      claim.predicate, claim.objectText, JSON.stringify(claim.qualifiers ?? {}),
      claim.approvalMethod, claim.algorithmVersion, JSON.stringify(metadata),
    ],
  )).rows[0];
  // TS/SQL parity gate: the trigger must agree with the shared implementation
  // on BOTH identities, or the row is a conflict, never a silent write.
  if (inserted.fingerprint_hash !== claim.fingerprintHash) return { outcome: "conflict", semanticCandidates };
  if (
    inserted.semantic_fingerprint_hash !== semanticHash
    || inserted.semantic_identity_version !== SEMANTIC_CLAIM_IDENTITY_VERSION
  ) {
    return { outcome: "conflict", semanticCandidates };
  }
  await dbHandle.query(
    `insert into public.educational_claim_versions
      (id, claim_id, version_number, claim_text, claim_type, predicate, object_text, qualifiers,
       primary_entity_id, approval_method, content_source, review_status, algorithm_version, metadata)
     values ($1::uuid, $2::uuid, 1, $3, $4, $5, $6, $7::jsonb, $8::uuid, $9, 'generated_draft', 'unreviewed', $10, $11::jsonb)`,
    [
      claim.currentVersionId, claim.claimId, claim.claimText, claim.claimType,
      claim.predicate, claim.objectText, JSON.stringify(claim.qualifiers ?? {}),
      claim.primaryEntityId, claim.approvalMethod, claim.algorithmVersion,
      JSON.stringify(provenance),
    ],
  );
  await dbHandle.query("update public.educational_claims set current_version_id = $2::uuid where id = $1::uuid", [
    claim.claimId, claim.currentVersionId,
  ]);
  return { outcome: "inserted", semanticCandidates };
}

async function upsertProposal(
  dbHandle: pg.Client,
  runId: string,
  factoryRunId: string,
  card: CardClaimFactoryCard,
  claim: PersistClaim,
  gapMetadata: Record<string, unknown>,
): Promise<string> {
  const assessment = (gapMetadata.proposalAssessment ?? {}) as Record<string, unknown>;
  const normalizedLabel = String(assessment.normalizedLabel ?? gapMetadata.normalizedLabel ?? "");
  const entityType = String(assessment.entityType ?? "condition");
  const preferredLabel = String(assessment.preferredLabel ?? normalizedLabel);
  const derivation = String(assessment.derivation ?? gapMetadata.derivation ?? "ontology_gap_filled");
  const confidence = typeof gapMetadata.confidence === "number" ? gapMetadata.confidence : 0.6;
  const fingerprint = proposalFingerprint(entityType, normalizedLabel);
  const existing = (await dbHandle.query(
    "select id, supporting_card_count, source_signal_ids, metadata from public.kg_automation_proposals where proposal_fingerprint = $1 and is_active",
    [fingerprint],
  )).rows[0];
  if (existing) {
    const signalIds = Array.from(new Set([...(existing.source_signal_ids ?? []), card.canonicalCardId]));
    const meta = {
      ...(existing.metadata ?? {}),
      backfillRunIds: Array.from(new Set([...((existing.metadata ?? {}).backfillRunIds ?? []), runId])),
    };
    await dbHandle.query(
      `update public.kg_automation_proposals
       set supporting_card_count = $2, source_signal_ids = $3, metadata = $4::jsonb, updated_at = now()
       where id = $1::uuid`,
      [existing.id, signalIds.length, signalIds, JSON.stringify(meta)],
    );
    return existing.id as string;
  }
  const inserted = (await dbHandle.query(
    `insert into public.kg_automation_proposals
      (proposal_fingerprint, proposal_type, source_signal_type, source_signal_ids,
       proposed_entity_type, proposed_entity_label, confidence, confidence_tier, confidence_reason,
       supporting_card_count, review_status, metadata)
     values ($1, 'create_canonical_entity', 'canonical_card', $2,
       $3, $4, $5, $6, $7, 1, 'generated', $8::jsonb)
     returning id`,
    [
      fingerprint,
      [card.canonicalCardId],
      entityType,
      preferredLabel,
      confidence,
      confidenceTier(confidence),
      `card-claim-factory:${derivation}`,
      JSON.stringify({
        factoryRunId,
        factoryContractVersion: CARD_CLAIM_FACTORY_CONTRACT_VERSION,
        normalizedLabel,
        derivation,
        sourceCards: [card.canonicalCardId],
        claimIds: [claim.claimId],
        backfillRunIds: [runId],
      }),
    ],
  )).rows[0];
  return inserted.id as string;
}

async function upsertTeachesLink(
  dbHandle: pg.Client,
  runId: string,
  factoryRunId: string,
  card: CardClaimFactoryCard,
  claim: PersistClaim,
  link: { confidence: number },
  entityById: Map<string, EntityIndexRow>,
  reasonCodes: string[],
  totals: Totals,
): Promise<string | null> {
  const entityId = claim.primaryEntityId;
  const existing = (await dbHandle.query(
    `select id from public.card_canonical_entity_links
     where canonical_card_id = $1::uuid and canonical_entity_id = $2::uuid and is_active`,
    [card.canonicalCardId, entityId],
  )).rows[0];
  if (existing) {
    totals.linksReused += 1;
    return existing.id as string;
  }
  const entity = entityById.get(entityId);
  const answerNormalized = normalizeClinicalText(claim.objectText);
  const aliasHit = (entity?.aliases ?? []).concat(entity?.sourceAliases ?? [])
    .some((alias) => normalizeClinicalText(alias) === answerNormalized);
  const matchBasis = reasonCodes.includes("canonical_alias_match") || aliasHit
    ? "alias"
    : answerNormalized === entity?.normalizedLabel
      ? "exact_label"
      : "factory_semantic";
  const inserted = (await dbHandle.query(
    `insert into public.card_canonical_entity_links
      (canonical_card_id, canonical_entity_id, retarget_path, match_basis,
       mapping_confidence, review_status, created_by_source, metadata)
     values ($1::uuid, $2::uuid, 'direct_exact', $3, $4, 'approved', 'system', $5::jsonb)
     returning id`,
    [
      card.canonicalCardId, entityId, matchBasis, link.confidence,
      JSON.stringify({
        claimId: claim.claimId, factoryRunId, backfillRunId: runId,
        reasonCodes, entityTarget: "canonical",
      }),
    ],
  )).rows[0];
  totals.linksInserted += 1;
  return inserted.id as string;
}

async function upsertItem(
  dbHandle: pg.Client,
  runId: string,
  card: CardClaimFactoryCard,
  status: "processed" | "needs_review" | "failed",
  fields: {
    claimId?: string;
    claimRefKind?: string;
    entityTargetKind?: string;
    entityId?: string;
    proposedLabel?: string;
    proposedType?: string;
    proposedProposalId?: string;
    resolutionReason?: string;
    teachesLinkId?: string | null;
    conflictKind?: string;
    errorText?: string;
    resultPayload?: Record<string, unknown>;
  },
): Promise<string> {
  const inserted = (await dbHandle.query(
    `insert into public.card_claim_backfill_items
      (run_id, canonical_card_id, canonical_card_version_id, content_hash, status,
       claim_id, claim_ref_kind, entity_target_kind, entity_id,
       proposed_entity_label, proposed_entity_type, proposed_proposal_id,
       resolution_reason, teaches_link_id, conflict_kind, error_text, result_payload)
     values ($1::uuid, $2::uuid, $3::uuid, $4, $5,
       $6::uuid, $7, $8, $9::uuid, $10, $11, $12::uuid, $13, $14::uuid, $15, $16, $17::jsonb)
     on conflict (run_id, canonical_card_version_id) do update set
       status = excluded.status, claim_id = excluded.claim_id,
       claim_ref_kind = excluded.claim_ref_kind, entity_target_kind = excluded.entity_target_kind,
       entity_id = excluded.entity_id, proposed_entity_label = excluded.proposed_entity_label,
       proposed_entity_type = excluded.proposed_entity_type,
       proposed_proposal_id = excluded.proposed_proposal_id,
       resolution_reason = excluded.resolution_reason, teaches_link_id = excluded.teaches_link_id,
       conflict_kind = excluded.conflict_kind, error_text = excluded.error_text,
       result_payload = excluded.result_payload, updated_at = now()
     returning id`,
    [
      runId, card.canonicalCardId, card.canonicalCardVersionId, card.contentHash, status,
      fields.claimId ?? null, fields.claimRefKind ?? null, fields.entityTargetKind ?? null,
      fields.entityId ?? null, fields.proposedLabel ?? null, fields.proposedType ?? null,
      fields.proposedProposalId ?? null, fields.resolutionReason ?? null,
      fields.teachesLinkId ?? null, fields.conflictKind ?? null, fields.errorText ?? null,
      JSON.stringify(fields.resultPayload ?? {}),
    ],
  )).rows[0];
  return String(inserted.id);
}

main().catch((error) => {
  console.error(JSON.stringify({ backfill: "fatal", error: error instanceof Error ? error.message : String(error) }));
  process.exit(1);
});
