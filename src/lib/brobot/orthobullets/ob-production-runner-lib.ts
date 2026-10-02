/**
 * v5 production runner orchestration (contract ob-claims-production.v1).
 *
 * Injected DB + model + clock + sleep seams keep this deterministic-testable.
 * Hard prohibitions (asserted by test): no Anki linking calls, no entity
 * creation calls, no durable semantic writes without apply mode.
 */

import {
  exactDurableIdentity,
  explainObProdExtraction,
  OB_PROD_ALGORITHM,
  OB_PROD_PROMPT_SET,
  type ObProdExtraction,
  type ObProdItemStatus,
} from './claim-extraction-contract-v1';
import { runProductionExtraction, type ObProdModelClient } from './claim-review-pipeline';
import { resolveObQuestionIdentity, type ObAliasHit, type ObRegistryQuestionRow } from './ob-question-identity';
import { resolveObClaimCandidate, type ObResolutionCandidateRow } from './ob-claim-resolution';
import { sourceContentHashV5, type ObSourcePacketV5 } from './claim-extractor-v5';

export type ObRunnerPacket = {
  nativeQuestionId: string;
  specialty?: string;
  topicUrl?: string | null;
  topic?: string | null;
  packet: ObSourcePacketV5;
};

export type ObRunnerLeasedItem = {
  itemId: string;
  nativeQuestionId: string;
  specialty: string | null;
  attemptCount: number;
  maxAttempts: number;
  sourceFingerprintHash: string | null;
  exhausted: boolean;
};

export type ObRunnerDb = {
  getRun: (runId: string) => Promise<{ id: string; status: string; releaseSha?: string | null; packetSha256?: string | null; executionManifest?: Record<string, unknown> | null } | null>;
  createRun: (input: {
    runKey: string; config: Record<string, unknown>; expectedCount: number; createdBy: string;
    releaseSha: string; packetSha256: string; executionManifest: Record<string, unknown>; pricingProfile: Record<string, unknown>;
  }) => Promise<{ id: string }>;
  upsertItems: (runId: string, rows: Array<{ nativeQuestionId: string; specialty: string | null }>) => Promise<number>;
  leaseItem: (runId: string, workerId: string, leaseSeconds: number) => Promise<ObRunnerLeasedItem | null>;
  heartbeat: (itemId: string, workerId: string, leaseSeconds: number) => Promise<'ok' | 'lease_lost' | 'item_missing'>;
  setItemStatus: (itemId: string, status: ObProdItemStatus) => Promise<void>;
  completeItem: (input: {
    itemId: string; workerId: string; status: 'identity_unresolved' | 'identity_conflict' | 'failed_transient' | 'failed_permanent';
    diagnostic: string | null; reasonCodes: string[];
    usage: { promptTokens: number; completionTokens: number; estimatedCostUsd: number };
    nextAttemptAt: string | null;
    identity: {
      outcome: 'RESOLVED' | 'UNRESOLVED' | 'CONFLICT'; registryQuestionId: string | null;
      method: string; confidence: string; evidence: string[]; locator: string; conflictingIds: string[];
    } | null;
  }) => Promise<void>;
  persistExtraction: (itemId: string, workerId: string, payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
  adoptLiveEvent: (itemId: string, workerId: string, attemptId: string) => Promise<void>;
  findRegistryByNative: (nativeQuestionId: string) => Promise<ObRegistryQuestionRow[]>;
  findRegistryByAliases: (aliasValues: string[]) => Promise<ObAliasHit[]>;
  countExtractionAttempts: (nativeQuestionId: string, sourceHash: string) => Promise<number>;
  findLiveAcceptedAttempt: (nativeQuestionId: string, sourceHash: string) => Promise<{ attemptId: string } | null>;
  findLiveAttemptAny: (nativeQuestionId: string, sourceHash: string) => Promise<{ attemptId: string } | null>;
  findByExactIdentity: (structuralHash: string, semanticHash: string) => Promise<ObResolutionCandidateRow[]>;
  findBySemanticHash: (semanticHash: string) => Promise<ObResolutionCandidateRow[]>;
  findTextNeighbors: (normalizedText: string, limit: number) => Promise<ObResolutionCandidateRow[]>;
};

export type ObRunnerLimits = {
  maxQuestions: number;
  maxErrors: number;
  maxCostUsd: number;
  maxConsecutiveFailures: number;
};

export type ObRunnerConfig = {
  mode: 'run' | 'resume';
  runId: string | null;
  apply: boolean;
  workerId: string;
  leaseSeconds: number;
  forceReprocess: boolean;
  limits: ObRunnerLimits;
  specialtyFilter: string | null;
  questionFilter: string | null;
  models: { generator: string; reviewer: string; coverage: string; repair: string; validator: string; resolution: string };
  costPer1kPromptUsd: number;
  costPer1kCompletionUsd: number;
  backoffBaseSeconds: number;
  backoffCapSeconds: number;
  heartbeatDivider: number;
  /** Per-model-call timeout in milliseconds. */
  requestTimeoutMs: number;
  releaseSha: string;
  packetSha256: string;
  pricingProfile: Record<string, unknown>;
  /** Pause between leased items (ms). 0 = none. Paces model-call bursts. */
  interItemDelayMs: number;
};

export type ObRunnerItemReport = {
  nativeQuestionId: string;
  itemId: string | null;
  outcome: string;
  diagnostic: string | null;
  reasonCodes?: string[];
  claimsAccepted: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
};

export function validateObRunnerConfig(config: ObRunnerConfig): void {
  const finiteNonnegative: Array<[string, number]> = [
    ['maxQuestions', config.limits.maxQuestions],
    ['maxErrors', config.limits.maxErrors],
    ['maxCostUsd', config.limits.maxCostUsd],
    ['maxConsecutiveFailures', config.limits.maxConsecutiveFailures],
    ['interItemDelayMs', config.interItemDelayMs],
    ['requestTimeoutMs', config.requestTimeoutMs],
    ['costPer1kPromptUsd', config.costPer1kPromptUsd],
    ['costPer1kCompletionUsd', config.costPer1kCompletionUsd],
  ];
  for (const [name, value] of finiteNonnegative) {
    if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be a finite nonnegative number`);
  }
  for (const [name, value] of [finiteNonnegative[0], finiteNonnegative[1], finiteNonnegative[3]]) {
    if (!Number.isInteger(value)) throw new Error(`${name} must be an integer`);
  }
  if (!Number.isInteger(config.leaseSeconds) || config.leaseSeconds <= 0) {
    throw new Error('leaseSeconds must be a positive integer');
  }
  if (!Number.isInteger(config.interItemDelayMs)) throw new Error('interItemDelayMs must be an integer');
  if (!Number.isInteger(config.requestTimeoutMs) || config.requestTimeoutMs <= 0) {
    throw new Error('requestTimeoutMs must be a positive integer');
  }
  if (!Number.isFinite(config.backoffBaseSeconds) || config.backoffBaseSeconds < 0) throw new Error('backoffBaseSeconds must be nonnegative');
  if (!Number.isFinite(config.backoffCapSeconds) || config.backoffCapSeconds < config.backoffBaseSeconds) {
    throw new Error('backoffCapSeconds must be at least backoffBaseSeconds');
  }
  if (!Number.isFinite(config.heartbeatDivider) || config.heartbeatDivider <= 0) throw new Error('heartbeatDivider must be positive');
  if (!/^[0-9a-f]{7,64}$/.test(config.releaseSha)) throw new Error('releaseSha must be a git SHA');
  if (!/^[0-9a-f]{64}$/.test(config.packetSha256)) throw new Error('packetSha256 must be sha256');
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function executionManifest(config: ObRunnerConfig): Record<string, unknown> {
  return {
    release_sha: config.releaseSha, packet_sha256: config.packetSha256,
    algorithm_version: OB_PROD_ALGORITHM, prompt_set_version: OB_PROD_PROMPT_SET,
    models: config.models, request_timeout_ms: config.requestTimeoutMs,
    lease_seconds: config.leaseSeconds, inter_item_delay_ms: config.interItemDelayMs,
    limits: config.limits, pricing_profile: config.pricingProfile,
  };
}

export type ObRunnerReport = {
  runId: string | null;
  mode: string;
  apply: boolean;
  startedAt: string;
  completedAt: string;
  /** Lease completions checkpointed (retries count repeatedly). */
  processed: number;
  /** Unique questions checkpointed. */
  questions: number;
  /** Per-question FINAL outcomes: only the last checkpoint per question counts. */
  outcomes: Record<string, number>;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  stoppedBy: string | null;
  items: ObRunnerItemReport[];
};

export type ObRunnerDeps = {
  db: ObRunnerDb;
  model: ObProdModelClient;
  packets: ObRunnerPacket[];
  now: () => string;
  nowMs: () => number;
  sleep: (ms: number) => Promise<void>;
  random: () => number;
  onCheckpoint: (report: ObRunnerItemReport) => void;
};

export function backoffDelayMs(attemptCount: number, baseSeconds: number, capSeconds: number, random: () => number): number {
  const exponential = Math.min(capSeconds, baseSeconds * 2 ** Math.max(0, attemptCount - 1));
  const jittered = exponential * (0.8 + random() * 0.4);
  return Math.round(jittered * 1000);
}

function isTerminalDbError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /check_violation|contract\/algorithm mismatch|not adoptable|extraction identity mismatch|reuse target failed identity/i.test(message);
}

const OB_RUNNER_MAX_CONTRACT_CODES = 5;

/** Stable reason codes for a contract rejection (capped, length-bounded). */
export function contractReasonCodesForViolations(violations: string[]): string[] {
  return ['contract_rejected', ...violations.slice(0, OB_RUNNER_MAX_CONTRACT_CODES).map((code) => `contract:${code.slice(0, 80)}`)];
}

export function contractRejectionReasonCodes(value: unknown): string[] {
  return contractReasonCodesForViolations(explainObProdExtraction(value));
}

const CONTENT_SAFETY_CODE_RE = /_safety:/;

/**
 * Content-safety rejections (LLM-produced text the DB CHECK cannot store)
 * are retryable: fresh model outputs. Any shape violation means a pipeline
 * bug, which retries cannot fix.
 */
export function isContentSafetyRejection(violations: string[]): boolean {
  return violations.length > 0 && violations.every((code) => CONTENT_SAFETY_CODE_RE.test(code));
}

/** Single-line, length-bounded reason detail (mirrors the rpc: precedent). */
export function sanitizeReasonDetail(message: string, maxLength = 160): string {
  return message.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

/** Sum stage usage tolerantly: only valid non-negative integers count. */
export function tolerantUsageTotals(usage: unknown): { promptTokens: number; completionTokens: number } {
  let promptTokens = 0;
  let completionTokens = 0;
  if (!usage || typeof usage !== 'object' || Array.isArray(usage)) return { promptTokens, completionTokens };
  for (const stage of Object.values(usage as Record<string, unknown>)) {
    if (!stage || typeof stage !== 'object' || Array.isArray(stage)) continue;
    const record = stage as Record<string, unknown>;
    if (Number.isInteger(record.promptTokens) && (record.promptTokens as number) >= 0) promptTokens += record.promptTokens as number;
    if (Number.isInteger(record.completionTokens) && (record.completionTokens as number) >= 0) {
      completionTokens += record.completionTokens as number;
    }
  }
  return { promptTokens, completionTokens };
}

export async function runObProduction(deps: ObRunnerDeps, config: ObRunnerConfig): Promise<ObRunnerReport> {
  validateObRunnerConfig(config);
  const startedAt = deps.now();
  const report: ObRunnerReport = {
    runId: null, mode: config.mode, apply: config.apply, startedAt, completedAt: startedAt,
    processed: 0, questions: 0, outcomes: {}, promptTokens: 0, completionTokens: 0, estimatedCostUsd: 0,
    stoppedBy: null, items: [],
  };
  const finish = (stoppedBy: string | null): ObRunnerReport => {
    report.completedAt = deps.now();
    report.stoppedBy = stoppedBy;
    // Per-question FINAL outcomes: retries checkpoint one row per attempt, but
    // only the last checkpoint per question counts toward outcomes.
    const finalByQuestion = new Map<string, string>();
    for (const entry of report.items) finalByQuestion.set(entry.nativeQuestionId, entry.outcome);
    const outcomes: Record<string, number> = {};
    for (const outcome of finalByQuestion.values()) outcomes[outcome] = (outcomes[outcome] ?? 0) + 1;
    report.outcomes = outcomes;
    report.questions = finalByQuestion.size;
    return report;
  };

  const costOf = (promptTokens: number, completionTokens: number): number =>
    (promptTokens / 1000) * config.costPer1kPromptUsd + (completionTokens / 1000) * config.costPer1kCompletionUsd;

  // Packet selection (run mode upserts; resume works the queue only).
  let selected = deps.packets.filter((row) => (
    (!config.specialtyFilter || (row.specialty ?? '') === config.specialtyFilter)
    && (!config.questionFilter || row.nativeQuestionId === config.questionFilter)
  ));
  if (config.limits.maxQuestions > 0) selected = selected.slice(0, config.limits.maxQuestions);
  const packetByQid = new Map(selected.map((row) => [row.nativeQuestionId, row]));
  const requestedManifest = executionManifest(config);

  let runId = config.runId;
  if (config.mode === 'run' && !config.apply) {
    // Dry run without a run id: no run row needed (zero DB writes).
  } else if (runId) {
    const run = await deps.db.getRun(runId);
    if (!run) throw new Error(`run not found: ${runId}`);
    if (run.status !== 'running' && run.status !== 'paused') {
      throw new Error(`run not resumable from status ${run.status}`);
    }
    if (run.packetSha256 && run.packetSha256 !== config.packetSha256) throw new Error('resume packet SHA mismatch');
    if (run.releaseSha && run.releaseSha !== config.releaseSha) throw new Error('resume release SHA mismatch');
    if (run.executionManifest && stableJson(run.executionManifest) !== stableJson(requestedManifest)) {
      throw new Error('resume execution manifest mismatch');
    }
  } else if (config.mode === 'run' && config.apply) {
    const created = await deps.db.createRun({
      runKey: `obprod-${deps.nowMs()}`,
      config: {
        mode: config.mode, limits: config.limits, specialty: config.specialtyFilter,
        worker: config.workerId, forceReprocess: config.forceReprocess,
      },
      expectedCount: selected.length,
      createdBy: config.workerId,
      releaseSha: config.releaseSha,
      packetSha256: config.packetSha256,
      executionManifest: requestedManifest,
      pricingProfile: config.pricingProfile,
    });
    runId = created.id;
  } else {
    throw new Error('resume mode requires --run-id');
  }
  report.runId = runId;

  if (config.mode === 'run' && config.apply && runId) {
    await deps.db.upsertItems(runId, selected.map((row) => ({
      nativeQuestionId: row.nativeQuestionId, specialty: row.specialty ?? null,
    })));
  }

  let consecutiveFailures = 0;
  let errors = 0;

  const checkpoints: ObRunnerItemReport[] = [];
  const checkpoint = (entry: ObRunnerItemReport) => {
    checkpoints.push(entry);
    report.items.push(entry);
    report.processed += 1;
    report.promptTokens += entry.promptTokens;
    report.completionTokens += entry.completionTokens;
    report.estimatedCostUsd += entry.estimatedCostUsd;
    deps.onCheckpoint(entry);
  };

  // Dry run: process packets directly, zero DB writes.
  if (!config.apply) {
    for (const row of selected) {
      if (report.estimatedCostUsd >= config.limits.maxCostUsd && config.limits.maxCostUsd > 0) return finish('max_cost');
      const entry = await processPacketDryRun(deps, config, row, costOf);
      checkpoint(entry);
      if (entry.outcome.startsWith('failed') || entry.outcome === 'error') {
        errors += 1;
        consecutiveFailures += 1;
      } else {
        consecutiveFailures = 0;
      }
      if (config.limits.maxErrors > 0 && errors >= config.limits.maxErrors) return finish('max_errors');
      if (config.limits.maxConsecutiveFailures > 0 && consecutiveFailures >= config.limits.maxConsecutiveFailures) {
        return finish('max_consecutive_failures');
      }
      if (config.interItemDelayMs > 0) await deps.sleep(config.interItemDelayMs);
    }
    return finish('queue_empty');
  }

  if (!runId) throw new Error('apply mode requires a run id');

  // Apply mode: lease-driven loop.
  for (;;) {
    if (config.limits.maxCostUsd > 0 && report.estimatedCostUsd >= config.limits.maxCostUsd) return finish('max_cost');
    const leased = await deps.db.leaseItem(runId, config.workerId, config.leaseSeconds);
    if (!leased) return finish('queue_empty');
    if (leased.exhausted) {
      await deps.db.completeItem({
        itemId: leased.itemId, workerId: config.workerId, status: 'failed_permanent',
        diagnostic: 'attempts_exhausted', reasonCodes: ['attempts_exhausted'],
        usage: { promptTokens: 0, completionTokens: 0, estimatedCostUsd: 0 },
        nextAttemptAt: null, identity: null,
      });
      checkpoint({
        nativeQuestionId: leased.nativeQuestionId, itemId: leased.itemId,
        outcome: 'failed', diagnostic: 'attempts_exhausted', claimsAccepted: 0,
        promptTokens: 0, completionTokens: 0, estimatedCostUsd: 0,
      });
      errors += 1;
      consecutiveFailures += 1;
      if (config.limits.maxErrors > 0 && errors >= config.limits.maxErrors) return finish('max_errors');
      if (config.limits.maxConsecutiveFailures > 0 && consecutiveFailures >= config.limits.maxConsecutiveFailures) {
        return finish('max_consecutive_failures');
      }
      continue;
    }
    if (config.questionFilter && leased.nativeQuestionId !== config.questionFilter) {
      // Leased an out-of-filter item (resume with filter): release via transient completion.
      await deps.db.completeItem({
        itemId: leased.itemId, workerId: config.workerId, status: 'failed_transient',
        diagnostic: 'worker_stopped', reasonCodes: ['filtered_out'],
        usage: { promptTokens: 0, completionTokens: 0, estimatedCostUsd: 0 },
        nextAttemptAt: new Date(deps.nowMs() + 3600_000).toISOString(), identity: null,
      });
      continue;
    }
    const entry = await processLeasedItem(deps, config, leased, packetByQid.get(leased.nativeQuestionId) ?? null, costOf);
    checkpoint(entry);
    if (entry.outcome === 'failed' || entry.outcome === 'error') {
      errors += 1;
      consecutiveFailures += 1;
    } else {
      consecutiveFailures = 0;
    }
    if (config.limits.maxErrors > 0 && errors >= config.limits.maxErrors) return finish('max_errors');
    if (config.limits.maxConsecutiveFailures > 0 && consecutiveFailures >= config.limits.maxConsecutiveFailures) {
      return finish('max_consecutive_failures');
    }
    if (config.interItemDelayMs > 0) await deps.sleep(config.interItemDelayMs);
  }
}

async function processPacketDryRun(
  deps: ObRunnerDeps,
  config: ObRunnerConfig,
  row: ObRunnerPacket,
  costOf: (prompt: number, completion: number) => number,
): Promise<ObRunnerItemReport> {
  const base = { nativeQuestionId: row.nativeQuestionId, itemId: null as string | null };
  const packet = row.packet;
  if (!packet.stem?.trim() || !Array.isArray(packet.answerChoices) || packet.answerChoices.length < 2) {
    return { ...base, outcome: 'failed', diagnostic: 'source_incomplete', claimsAccepted: 0, promptTokens: 0, completionTokens: 0, estimatedCostUsd: 0 };
  }
  const sourceHash = sourceContentHashV5(packet);
  let promptTokens = 0;
  let completionTokens = 0;
  // Dry-run identity (read-only): mirrors the apply gate.
  const dryIdentity = resolveObQuestionIdentity({
    nativeQuestionId: row.nativeQuestionId,
    observedLocator: row.topicUrl ?? null,
    topicSlug: row.topic ?? null,
    topicNormalized: row.topic ?? null,
    nativeRows: await deps.db.findRegistryByNative(row.nativeQuestionId),
    aliasHits: (await deps.db.findRegistryByAliases([row.nativeQuestionId]))
      .filter((hit) => hit.aliasValue === row.nativeQuestionId),
  });
  if (dryIdentity.outcome !== 'RESOLVED') {
    return {
      ...base,
      outcome: dryIdentity.outcome === 'CONFLICT' ? 'would_identity_conflict' : 'would_identity_unresolved',
      diagnostic: dryIdentity.method, claimsAccepted: 0,
      promptTokens: 0, completionTokens: 0, estimatedCostUsd: 0,
    };
  }
  const result = await runProductionExtraction(packet, {
    provider: 'orthobullets',
    nativeQuestionId: row.nativeQuestionId,
    registryQuestionId: dryIdentity.registryQuestionId,
    sourceHash,
    reviewLocator: dryIdentity.locator,
  }, {
    client: deps.model,
    models: {
      generator: config.models.generator, reviewer: config.models.reviewer, coverage: config.models.coverage,
      repair: config.models.repair, validator: config.models.validator,
    },
    now: deps.now,
    requestTimeoutMs: config.requestTimeoutMs,
  });
  if (!result.ok) {
    for (const stage of Object.values(result.usage)) {
      promptTokens += stage.promptTokens;
      completionTokens += stage.completionTokens;
    }
    const modelDetail = sanitizeReasonDetail(result.detail ?? '');
    return {
      ...base, outcome: 'failed', diagnostic: result.diagnostic,
      reasonCodes: modelDetail ? ['extraction_failed', `model:${modelDetail}`] : ['extraction_failed'],
      claimsAccepted: 0,
      promptTokens, completionTokens, estimatedCostUsd: costOf(promptTokens, completionTokens),
    };
  }
  // Dry run mirrors the apply gate: a pipeline output the contract rejects is a
  // would-be safety failure, never a silent would-accept.
  if (explainObProdExtraction(result.extraction).length > 0) {
    const salvaged = tolerantUsageTotals((result.extraction as unknown as Record<string, unknown> | null)?.usage);
    promptTokens += salvaged.promptTokens;
    completionTokens += salvaged.completionTokens;
    return {
      ...base, outcome: 'failed', diagnostic: 'safety_violation',
      reasonCodes: contractRejectionReasonCodes(result.extraction), claimsAccepted: 0,
      promptTokens, completionTokens, estimatedCostUsd: costOf(promptTokens, completionTokens),
    };
  }
  for (const stage of Object.values(result.extraction.usage)) {
    promptTokens += stage.promptTokens;
    completionTokens += stage.completionTokens;
  }
  // Dry-run resolution: read-only retrieval + equivalence review (would-decide).
  let wouldReuse = 0;
  let wouldCreate = 0;
  if (result.extraction.finalState === 'accepted') {
    for (const candidate of result.extraction.candidates.filter((entry) => entry.accepted)) {
      const outcome = await resolveObClaimCandidate(candidate, deps.db, {
        client: deps.model, model: config.models.resolution, now: deps.now,
      });
      promptTokens += outcome.usage.promptTokens;
      completionTokens += outcome.usage.completionTokens;
      if (outcome.decision === 'reuse') wouldReuse += 1;
      else if (outcome.decision === 'create') wouldCreate += 1;
    }
  }
  void wouldReuse;
  void wouldCreate;
  return {
    ...base,
    outcome: result.extraction.finalState === 'accepted' ? 'would_accept' : 'would_unresolved',
    diagnostic: result.extraction.finalState === 'accepted' ? null : 'review_unresolved',
    claimsAccepted: result.extraction.candidates.filter((entry) => entry.accepted).length,
    promptTokens, completionTokens, estimatedCostUsd: costOf(promptTokens, completionTokens),
  };
}

async function processLeasedItem(
  deps: ObRunnerDeps,
  config: ObRunnerConfig,
  leased: ObRunnerLeasedItem,
  row: ObRunnerPacket | null,
  costOf: (prompt: number, completion: number) => number,
): Promise<ObRunnerItemReport> {
  const { db } = deps;
  const base = { nativeQuestionId: leased.nativeQuestionId, itemId: leased.itemId };
  let promptTokens = 0;
  let completionTokens = 0;
  const usageOf = () => ({
    promptTokens, completionTokens, estimatedCostUsd: costOf(promptTokens, completionTokens),
  });

  // Heartbeat during long model operations.
  let heartbeatFailed = false;
  const heartbeatEveryMs = Math.max(10_000, Math.floor((config.leaseSeconds * 1000) / config.heartbeatDivider));
  const heartbeatTimer = setInterval(() => {
    void db.heartbeat(leased.itemId, config.workerId, config.leaseSeconds).then((status) => {
      if (status !== 'ok') heartbeatFailed = true;
    }).catch(() => {
      heartbeatFailed = true;
    });
  }, heartbeatEveryMs);
  // Allow the process to exit without explicit cleanup in tests.
  if (typeof (heartbeatTimer as unknown as { unref?: () => void }).unref === 'function') {
    (heartbeatTimer as unknown as { unref: () => void }).unref();
  }
  const stopHeartbeat = () => clearInterval(heartbeatTimer);

  try {
    if (!row) {
      await db.completeItem({
        itemId: leased.itemId, workerId: config.workerId, status: 'failed_permanent',
        diagnostic: 'source_fetch_failed', reasonCodes: ['packet_missing'], usage: usageOf(),
        nextAttemptAt: null, identity: null,
      });
      return { ...base, outcome: 'failed', diagnostic: 'source_fetch_failed', claimsAccepted: 0, ...usageOf() };
    }
    const packet = row.packet;
    if (!packet.stem?.trim() || !Array.isArray(packet.answerChoices) || packet.answerChoices.length < 2) {
      await db.completeItem({
        itemId: leased.itemId, workerId: config.workerId, status: 'failed_permanent',
        diagnostic: 'source_incomplete', reasonCodes: ['packet_invalid'], usage: usageOf(),
        nextAttemptAt: null, identity: null,
      });
      return { ...base, outcome: 'failed', diagnostic: 'source_incomplete', claimsAccepted: 0, ...usageOf() };
    }

    // Identity resolution (read-only lookups, then decide).
    const nativeRows = await db.findRegistryByNative(leased.nativeQuestionId);
    const aliasValues = [leased.nativeQuestionId];
    const aliasHits = await db.findRegistryByAliases(aliasValues);
    const identity = resolveObQuestionIdentity({
      nativeQuestionId: leased.nativeQuestionId,
      observedLocator: row.topicUrl ?? null,
      topicSlug: row.topic ?? null,
      topicNormalized: row.topic ?? null,
      nativeRows,
      aliasHits: aliasHits.filter((hit) => hit.aliasValue === leased.nativeQuestionId),
    });
    if (identity.outcome !== 'RESOLVED') {
      await db.completeItem({
        itemId: leased.itemId, workerId: config.workerId,
        status: identity.outcome === 'CONFLICT' ? 'identity_conflict' : 'identity_unresolved',
        diagnostic: identity.outcome === 'CONFLICT' ? 'identity_conflict' : 'identity_unresolved',
        reasonCodes: [identity.method], usage: usageOf(), nextAttemptAt: null,
        identity: {
          outcome: identity.outcome, registryQuestionId: identity.registryQuestionId,
          method: identity.method, confidence: identity.confidence, evidence: identity.evidence,
          locator: identity.locator, conflictingIds: identity.conflictingIds,
        },
      });
      return { ...base, outcome: identity.outcome === 'CONFLICT' ? 'identity_conflict' : 'identity_unresolved', diagnostic: identity.method, claimsAccepted: 0, ...usageOf() };
    }

    const sourceHash = sourceContentHashV5(packet);
    await db.setItemStatus(leased.itemId, 'extracting');

    // Skip identical completed extractions (unless force reprocess).
    const priorAttempts = await db.countExtractionAttempts(leased.nativeQuestionId, sourceHash);
    if (!config.forceReprocess) {
      const live = await db.findLiveAcceptedAttempt(leased.nativeQuestionId, sourceHash);
      if (live) {
        await db.adoptLiveEvent(leased.itemId, config.workerId, live.attemptId);
        return { ...base, outcome: 'adopted', diagnostic: null, claimsAccepted: 0, ...usageOf() };
      }
    }
    const liveAny = await db.findLiveAttemptAny(leased.nativeQuestionId, sourceHash);
    // Any new event for the same extraction identity supersedes the live one
    // (live unique index); force reprocess additionally bypasses adoption.
    const attemptNo = priorAttempts;
    const supersedesAttemptId = liveAny?.attemptId ?? null;

    // Extraction.
    const result = await runProductionExtraction(packet, {
      provider: 'orthobullets',
      nativeQuestionId: leased.nativeQuestionId,
      registryQuestionId: identity.registryQuestionId,
      sourceHash,
      reviewLocator: identity.locator,
    }, {
      client: deps.model,
      models: {
        generator: config.models.generator, reviewer: config.models.reviewer, coverage: config.models.coverage,
        repair: config.models.repair, validator: config.models.validator,
      },
      attemptNo,
      supersedesAttemptId,
      now: deps.now,
      requestTimeoutMs: config.requestTimeoutMs,
    });
    if (heartbeatFailed) {
      return { ...base, outcome: 'failed', diagnostic: 'lease_lost', claimsAccepted: 0, ...usageOf() };
    }
    if (!result.ok) {
      const transient = result.diagnostic === 'model_429' || result.diagnostic === 'model_timeout'
        || result.diagnostic === 'model_malformed' || result.diagnostic === 'model_empty';
      const status = transient ? 'failed_transient' : 'failed_permanent';
      const nextAttemptAt = transient
        ? new Date(deps.nowMs() + backoffDelayMs(leased.attemptCount, config.backoffBaseSeconds, config.backoffCapSeconds, deps.random)).toISOString()
        : null;
      for (const stage of Object.values(result.usage)) {
        promptTokens += stage.promptTokens;
        completionTokens += stage.completionTokens;
      }
      const modelDetail = sanitizeReasonDetail(result.detail ?? '');
      await db.completeItem({
        itemId: leased.itemId, workerId: config.workerId, status, diagnostic: result.diagnostic,
        reasonCodes: modelDetail ? ['extraction_failed', `model:${modelDetail}`] : ['extraction_failed'],
        usage: usageOf(), nextAttemptAt,
        identity: {
          outcome: identity.outcome, registryQuestionId: identity.registryQuestionId,
          method: identity.method, confidence: identity.confidence, evidence: identity.evidence,
          locator: identity.locator, conflictingIds: identity.conflictingIds,
        },
      });
      return { ...base, outcome: 'failed', diagnostic: result.diagnostic, claimsAccepted: 0, ...usageOf() };
    }

    let extraction = result.extraction;
    const contractViolations = explainObProdExtraction(extraction);
    if (contractViolations.length > 0) {
      const reasonCodes = contractReasonCodesForViolations(contractViolations);
      const salvaged = tolerantUsageTotals((extraction as unknown as Record<string, unknown> | null)?.usage);
      promptTokens += salvaged.promptTokens;
      completionTokens += salvaged.completionTokens;
      // Content-safety rejections are retryable (fresh model outputs); shape
      // violations indicate a pipeline bug and are terminal.
      if (isContentSafetyRejection(contractViolations)) {
        await db.completeItem({
          itemId: leased.itemId, workerId: config.workerId, status: 'failed_transient',
          diagnostic: 'safety_violation', reasonCodes, usage: usageOf(),
          nextAttemptAt: new Date(deps.nowMs() + backoffDelayMs(leased.attemptCount, config.backoffBaseSeconds, config.backoffCapSeconds, deps.random)).toISOString(),
          identity: {
            outcome: identity.outcome, registryQuestionId: identity.registryQuestionId,
            method: identity.method, confidence: identity.confidence, evidence: identity.evidence,
            locator: identity.locator, conflictingIds: identity.conflictingIds,
          },
        });
        return { ...base, outcome: 'failed', diagnostic: 'safety_violation', reasonCodes, claimsAccepted: 0, ...usageOf() };
      }
      await db.completeItem({
        itemId: leased.itemId, workerId: config.workerId, status: 'failed_permanent',
        diagnostic: 'safety_violation', reasonCodes, usage: usageOf(),
        nextAttemptAt: null, identity: null,
      });
      return { ...base, outcome: 'failed', diagnostic: 'safety_violation', reasonCodes, claimsAccepted: 0, ...usageOf() };
    }
    for (const stage of Object.values(extraction.usage)) {
      promptTokens += stage.promptTokens;
      completionTokens += stage.completionTokens;
    }

    // Resolution for accepted candidates (accepted extractions only).
    await db.setItemStatus(leased.itemId, 'resolving');
    const resolutions = new Map<string, {
      decision: 'reuse' | 'create' | 'unresolved'; resolvedClaimId: string | null;
      structuralHash: string; semanticHash: string; model: string; promptVersion: string;
      usage: { promptTokens: number; completionTokens: number; estimatedCostUsd: number };
      examined: Array<{ claim_id: string | null; verdict: string; reason: string }>;
    }>();
    if (extraction.finalState === 'accepted') {
      for (const candidate of extraction.candidates.filter((entry) => entry.accepted)) {
        const identityHashes = exactDurableIdentity({
          claimText: candidate.text, claimType: candidate.claimType, qualifiers: candidate.qualifiers,
        });
        const outcome = await resolveObClaimCandidate(candidate, db, {
          client: deps.model, model: config.models.resolution, now: deps.now,
        });
        promptTokens += outcome.usage.promptTokens;
        completionTokens += outcome.usage.completionTokens;
        if (outcome.diagnostic) {
          await db.completeItem({
            itemId: leased.itemId, workerId: config.workerId, status: 'failed_transient',
            diagnostic: 'model_timeout', reasonCodes: ['resolution_failed'],
            usage: usageOf(),
            nextAttemptAt: new Date(deps.nowMs() + backoffDelayMs(leased.attemptCount, config.backoffBaseSeconds, config.backoffCapSeconds, deps.random)).toISOString(),
            identity: null,
          });
          return { ...base, outcome: 'failed', diagnostic: 'model_timeout', claimsAccepted: 0, ...usageOf() };
        }
        resolutions.set(candidate.candidateId, {
          decision: outcome.decision,
          resolvedClaimId: outcome.resolvedClaimId,
          structuralHash: identityHashes.structuralHash,
          semanticHash: identityHashes.semanticHash,
          model: config.models.resolution,
          promptVersion: 'ob-claims-prod-equivalence-v1.0',
          usage: {
            promptTokens: outcome.usage.promptTokens,
            completionTokens: outcome.usage.completionTokens,
            estimatedCostUsd: costOf(outcome.usage.promptTokens, outcome.usage.completionTokens),
          },
          examined: outcome.records.map((record) => ({
            claim_id: record.examinedClaimId, verdict: record.verdict, reason: record.reason,
          })),
        });
      }
      // Any unresolved resolution (e.g. live contradiction) flips the whole
      // extraction to ai_review_unresolved: persist all artifacts including
      // the resolution evidence, materialize nothing, mark every candidate
      // unaccepted. Never silently fork truth.
      const blocked = [...resolutions.values()].some((entry) => entry.decision === 'unresolved');
      if (blocked) {
        extraction = {
          ...extraction,
          finalState: 'ai_review_unresolved',
          diagnostics: [...extraction.diagnostics, 'review_unresolved'],
          candidates: extraction.candidates.map((candidate) => ({ ...candidate, accepted: false })),
        };
      }
    }

    // Persist (artifacts always; claims/links only when accepted).
    await db.setItemStatus(leased.itemId, 'persisting');
    const payload = buildPersistPayload(extraction, resolutions, identity, usageOf());
    try {
      await db.persistExtraction(leased.itemId, config.workerId, payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/lease lost/i.test(message)) {
        return { ...base, outcome: 'failed', diagnostic: 'lease_lost', claimsAccepted: 0, ...usageOf() };
      }
      if (isTerminalDbError(error)) {
        const terminalDetail = message.replace(/\s+/g, ' ').trim().slice(0, 160);
        await db.completeItem({
          itemId: leased.itemId, workerId: config.workerId, status: 'failed_permanent',
          diagnostic: 'persistence_failed', reasonCodes: ['persist_rejected', `rpc:${terminalDetail}`],
          usage: usageOf(), nextAttemptAt: null, identity: null,
        });
        return { ...base, outcome: 'failed', diagnostic: 'persistence_failed', claimsAccepted: 0, ...usageOf() };
      }
      // Surface the sanitized RPC message: bare db_error is undebuggable.
      const detail = message.replace(/\s+/g, ' ').trim().slice(0, 160);
      await db.completeItem({
        itemId: leased.itemId, workerId: config.workerId, status: 'failed_transient',
        diagnostic: 'db_error', reasonCodes: ['persist_failed', `rpc:${detail}`],
        usage: usageOf(),
        nextAttemptAt: new Date(deps.nowMs() + backoffDelayMs(leased.attemptCount, config.backoffBaseSeconds, config.backoffCapSeconds, deps.random)).toISOString(),
        identity: null,
      });
      return { ...base, outcome: 'failed', diagnostic: 'db_error', claimsAccepted: 0, ...usageOf() };
    }
    const accepted = extraction.candidates.filter((entry) => entry.accepted).length;
    return {
      ...base,
      outcome: extraction.finalState === 'accepted' ? 'accepted' : 'unresolved',
      diagnostic: extraction.finalState === 'accepted' ? null : 'review_unresolved',
      claimsAccepted: accepted,
      ...usageOf(),
    };
  } finally {
    stopHeartbeat();
  }
}

export function buildPersistPayload(
  extraction: ObProdExtraction,
  resolutions: Map<string, {
    decision: 'reuse' | 'create' | 'unresolved'; resolvedClaimId: string | null;
    structuralHash: string; semanticHash: string; model: string; promptVersion: string;
    usage: { promptTokens: number; completionTokens: number; estimatedCostUsd: number };
    examined: Array<{ claim_id: string | null; verdict: string; reason: string }>;
  }>,
  identity: {
    outcome: 'RESOLVED' | 'UNRESOLVED' | 'CONFLICT'; registryQuestionId: string | null;
    method: string; confidence: string; evidence: string[]; locator: string; conflictingIds: string[];
  },
  usage: { promptTokens: number; completionTokens: number; estimatedCostUsd: number },
): Record<string, unknown> {
  return {
    attempt_id: extraction.attemptId,
    attempt_no: extraction.attemptNo,
    supersedes_attempt_id: extraction.supersedesAttemptId,
    contract_version: extraction.contractVersion,
    algorithm_version: OB_PROD_ALGORITHM,
    prompt_set_version: OB_PROD_PROMPT_SET,
    prompt_versions: extraction.promptVersions,
    models: extraction.models,
    source: {
      provider: extraction.source.provider,
      native_question_id: extraction.source.nativeQuestionId,
      registry_question_id: extraction.source.registryQuestionId,
      source_hash: extraction.source.sourceHash,
      review_locator: extraction.source.reviewLocator,
    },
    started_at: extraction.startedAt,
    completed_at: extraction.completedAt,
    final_state: extraction.finalState,
    coverage: {
      verdict: extraction.coverage.verdict,
      notes: extraction.coverage.notes,
      missing_concepts: extraction.coverage.missingConcepts,
    },
    diagnostics: extraction.diagnostics,
    usage: {
      prompt_tokens: usage.promptTokens,
      completion_tokens: usage.completionTokens,
      estimated_cost_usd: usage.estimatedCostUsd,
    },
    identity: {
      outcome: identity.outcome,
      registry_question_id: identity.registryQuestionId,
      method: identity.method,
      confidence: identity.confidence,
      evidence: identity.evidence,
      locator: identity.locator,
      conflicting_ids: identity.conflictingIds,
    },
    candidates: extraction.candidates.map((candidate) => {
      const resolution = resolutions.get(candidate.candidateId) ?? null;
      const repair = candidate.repairs[0] ?? null;
      return {
        candidate_id: candidate.candidateId,
        index: candidate.index,
        text: repair ? repair.beforeText : candidate.text,
        importance: candidate.importance,
        claim_type: candidate.claimType,
        qualifiers: candidate.qualifiers,
        support: candidate.support,
        generator: {
          model: candidate.generator.model,
          prompt_version: candidate.generator.promptVersion,
          confidence: candidate.generator.confidence,
        },
        factual: candidate.factual,
        quality: candidate.quality,
        final_factual: candidate.finalFactual,
        final_quality: candidate.finalQuality,
        validator: candidate.validator,
        accepted: candidate.accepted,
        final_text: candidate.text,
        origin_candidate_index: null,
        repair_action: repair?.action ?? null,
        repair_reason: repair?.reason ?? null,
        pre_repair_text: repair ? repair.beforeText : null,
        resolution: resolution ? {
          decision: resolution.decision,
          resolved_claim_id: resolution.resolvedClaimId,
          structural_hash: resolution.structuralHash,
          semantic_hash: resolution.semanticHash,
          model: resolution.model,
          prompt_version: resolution.promptVersion,
          usage: {
            prompt_tokens: resolution.usage.promptTokens,
            completion_tokens: resolution.usage.completionTokens,
            estimated_cost_usd: resolution.usage.estimatedCostUsd,
          },
          examined: resolution.examined,
        } : null,
      };
    }),
  };
}
