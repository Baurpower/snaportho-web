import assert from 'node:assert/strict';
import {
  backoffDelayMs,
  contractRejectionReasonCodes,
  isContentSafetyRejection,
  runObProduction,
  sanitizeReasonDetail,
  tolerantUsageTotals,
  validateObRunnerConfig,
  type ObRunnerConfig,
  type ObRunnerDb,
  type ObRunnerDeps,
  type ObRunnerPacket,
} from './ob-production-runner-lib';
import { exactDurableIdentity } from './claim-extraction-contract-v1';
import type { ObRegistryQuestionRow } from './ob-question-identity';

// ---------------------------------------------------------------------------
// In-memory fake DB mirroring the RPC rules (lease, idempotency, links).
// ---------------------------------------------------------------------------

type FakeItem = {
  id: string; runId: string; nativeQuestionId: string; specialty: string | null;
  status: string; attemptCount: number; maxAttempts: number; nextAttemptAt: string | null;
  leaseOwner: string | null; leaseExpiresAt: number | null;
  sourceHash: string | null; identityOutcome: string | null; registryId: string | null;
  liveAttemptId: string | null; lastDiagnostic: string | null;
  reasonCodes: string[];
  promptTokens: number; completionTokens: number; costUsd: number;
};

class FakeDb implements ObRunnerDb {
  runs = new Map<string, { id: string; status: string }>();
  items: FakeItem[] = [];
  events: Array<{ id: string; nativeQuestionId: string; sourceHash: string; finalState: string; supersededBy: string | null; attemptNo: number }> = [];
  candidates: Array<{ id: string; eventId: string; index: number; text: string }> = [];
  registry: ObRegistryQuestionRow[] = [];
  aliases: Array<{ aliasKind: string; aliasValue: string; row: ObRegistryQuestionRow }> = [];
  claims: Array<{ id: string; text: string; type: string; struct: string; sem: string; active: boolean; createdAt: string }> = [];
  links: Array<{ qid: string; claimId: string; role: string; active: boolean; algorithm: string; supersededBy: string | null }> = [];
  resolutions: Array<{ candidateId: string; decision: string; resolvedId: string | null }> = [];
  identities: Array<{ itemId: string; outcome: string }> = [];
  ops: string[] = [];
  failPersist: Error | null = null;
  failPersistAfterArtifacts = false;
  failLease: Error | null = null;
  nowMs: number;
  seq = 0;

  constructor(nowMs: number) { this.nowMs = nowMs; }

  async getRun(runId: string) { return this.runs.get(runId) ?? null; }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- stub mirrors the real DB signature
  async createRun(_input: { runKey: string; config: Record<string, unknown>; expectedCount: number; createdBy: string }) {
    this.ops.push('run.create');
    const id = `run-${++this.seq}`;
    this.runs.set(id, { id, status: 'running' });
    return { id };
  }
  async upsertItems(runId: string, rows: Array<{ nativeQuestionId: string; specialty: string | null }>) {
    this.ops.push('items.upsert');
    for (const row of rows) {
      if (this.items.some((item) => item.runId === runId && item.nativeQuestionId === row.nativeQuestionId)) continue;
      this.items.push({
        id: `item-${++this.seq}`, runId, nativeQuestionId: row.nativeQuestionId, specialty: row.specialty,
        status: 'pending', attemptCount: 0, maxAttempts: 5, nextAttemptAt: null,
        leaseOwner: null, leaseExpiresAt: null, sourceHash: null, identityOutcome: null,
        registryId: null, liveAttemptId: null, lastDiagnostic: null, reasonCodes: [],
        promptTokens: 0, completionTokens: 0, costUsd: 0,
      });
    }
    return rows.length;
  }
  async leaseItem(runId: string, workerId: string, leaseSeconds: number) {
    if (this.failLease) throw this.failLease;
    const ready = this.items
      .filter((item) => item.runId === runId)
      .filter((item) => (
        (item.attemptCount < item.maxAttempts && (
          item.status === 'pending'
          || (item.status === 'failed_transient' && (item.nextAttemptAt === null || Date.parse(item.nextAttemptAt) <= this.nowMs))
          || (['leased', 'extracting', 'reviewing', 'resolving', 'persisting'].includes(item.status)
            && item.leaseExpiresAt !== null && item.leaseExpiresAt <= this.nowMs)
        ))
        || (item.status === 'failed_transient' && item.attemptCount >= item.maxAttempts)
      ))
      .sort((a, b) => a.attemptCount - b.attemptCount);
    const item = ready[0];
    if (!item) return null;
    const exhausted = item.attemptCount >= item.maxAttempts;
    item.status = 'leased';
    item.leaseOwner = workerId;
    item.leaseExpiresAt = this.nowMs + leaseSeconds * 1000;
    if (!exhausted) item.attemptCount += 1;
    this.ops.push('items.lease');
    return {
      itemId: item.id, nativeQuestionId: item.nativeQuestionId, specialty: item.specialty,
      attemptCount: item.attemptCount, maxAttempts: item.maxAttempts,
      sourceFingerprintHash: item.sourceHash, exhausted,
    };
  }
  async heartbeat(itemId: string, workerId: string, leaseSeconds: number) {
    const item = this.items.find((entry) => entry.id === itemId);
    if (!item) return 'item_missing' as const;
    if (item.leaseOwner !== workerId || item.leaseExpiresAt === null || item.leaseExpiresAt <= this.nowMs) {
      return 'lease_lost' as const;
    }
    item.leaseExpiresAt = this.nowMs + leaseSeconds * 1000;
    return 'ok' as const;
  }
  async setItemStatus(itemId: string, status: string) {
    const item = this.items.find((entry) => entry.id === itemId)!;
    item.status = status;
    this.ops.push(`items.status:${status}`);
  }
  async completeItem(input: {
    itemId: string; workerId: string;
    status: 'identity_unresolved' | 'identity_conflict' | 'failed_transient' | 'failed_permanent';
    diagnostic: string | null; reasonCodes: string[];
    usage: { promptTokens: number; completionTokens: number; estimatedCostUsd: number };
    nextAttemptAt: string | null;
    identity: { outcome: 'RESOLVED' | 'UNRESOLVED' | 'CONFLICT'; registryQuestionId: string | null } | null;
  }) {
    const item = this.items.find((entry) => entry.id === input.itemId)!;
    if (item.leaseOwner !== input.workerId) throw new Error('lease lost or not owned');
    item.status = input.status;
    item.nextAttemptAt = input.status === 'failed_transient' ? input.nextAttemptAt : null;
    item.leaseOwner = null;
    item.leaseExpiresAt = null;
    item.lastDiagnostic = input.diagnostic;
    item.reasonCodes = [...input.reasonCodes];
    item.promptTokens += input.usage.promptTokens;
    item.completionTokens += input.usage.completionTokens;
    item.costUsd += input.usage.estimatedCostUsd;
    if (input.identity) {
      item.identityOutcome = input.identity.outcome;
      item.registryId = input.identity.registryQuestionId;
      this.identities.push({ itemId: item.id, outcome: input.identity.outcome });
    }
    this.ops.push(`items.complete:${input.status}`);
  }
  async persistExtraction(itemId: string, workerId: string, payload: Record<string, unknown>) {
    const snapshot = JSON.stringify({
      events: this.events, candidates: this.candidates, claims: this.claims,
      links: this.links, resolutions: this.resolutions, identities: this.identities,
      items: this.items,
    });
    try {
      return this.persistInner(itemId, workerId, payload);
    } catch (error) {
      const restored = JSON.parse(snapshot);
      Object.assign(this, restored);
      throw error;
    }
  }
  private persistInner(itemId: string, workerId: string, payload: Record<string, unknown>) {
    const item = this.items.find((entry) => entry.id === itemId)!;
    if (item.leaseOwner !== workerId || item.leaseExpiresAt === null || item.leaseExpiresAt <= this.nowMs) {
      throw new Error('lease lost or not owned');
    }
    if (payload.contract_version !== 'ob-claims-production.v1'
      || payload.algorithm_version !== 'orthobullets-claims-prod.v1') {
      throw new Error('contract/algorithm mismatch');
    }
    const src = payload.source as Record<string, string>;
    if (src.native_question_id !== item.nativeQuestionId) throw new Error('extraction identity mismatch');
    const finalState = payload.final_state as string;
    const candidates = payload.candidates as Array<Record<string, unknown>>;
    if (finalState === 'accepted') {
      if ((payload.coverage as Record<string, string>).verdict !== 'complete') throw new Error('accepted requires complete coverage');
      for (const candidate of candidates) {
        if (candidate.accepted) {
          if (candidate.final_factual !== 'supported' || candidate.final_quality !== 'good'
            || (candidate.validator as Record<string, string>).verdict !== 'accept') {
            throw new Error('accepted claim fails categorical gates');
          }
        }
      }
    } else {
      for (const candidate of candidates) {
        if (candidate.accepted) throw new Error('unresolved extraction marks claims accepted');
      }
    }
    // Mirror the real RPC's snake_case reads (NOT NULL columns + usage keys).
    for (const candidate of candidates) {
      const generator = candidate.generator as Record<string, unknown> | null;
      if (typeof generator?.prompt_version !== 'string' || !generator.prompt_version) {
        throw new Error('generator_prompt_version missing (NOT NULL)');
      }
    }
    const payloadUsage = payload.usage as Record<string, unknown> | null;
    if (typeof payloadUsage?.prompt_tokens !== 'number' || typeof payloadUsage?.completion_tokens !== 'number') {
      throw new Error('payload usage must use snake_case token keys');
    }
    const attemptId = payload.attempt_id as string;
    const preexisted = this.events.some((event) => event.id === attemptId);
    if (!preexisted) {
      this.events.push({
        id: attemptId, nativeQuestionId: item.nativeQuestionId, sourceHash: src.source_hash,
        finalState, supersededBy: null, attemptNo: payload.attempt_no as number,
      });
      this.ops.push('events.insert');
      const supersedes = payload.supersedes_attempt_id as string | null;
      if (supersedes) {
        const target = this.events.find((event) => event.id === supersedes);
        if (!target || target.supersededBy) throw new Error('supersede target missing or already superseded');
        target.supersededBy = attemptId;
      }
      for (const candidate of candidates) {
        this.candidates.push({
          id: candidate.candidate_id as string, eventId: attemptId,
          index: candidate.index as number, text: candidate.final_text as string,
        });
      }
      this.ops.push('candidates.insert');
      const identity = payload.identity as { outcome: string } | null;
      if (identity) this.identities.push({ itemId: item.id, outcome: identity.outcome });
      if (this.failPersistAfterArtifacts) throw new Error('db_timeout: injected mid-persist failure');
      for (const candidate of candidates) {
        const resolution = candidate.resolution as {
          decision: string; resolved_claim_id: string | null;
          examined: Array<{ claim_id: string | null; verdict: string }>;
        } | null;
        if (!resolution) continue;
        this.resolutions.push({
          candidateId: candidate.candidate_id as string,
          decision: resolution.decision, resolvedId: resolution.resolved_claim_id,
        });
      }
    }
    if (this.failPersist) throw this.failPersist;
    let created = 0;
    let reused = 0;
    if (finalState === 'accepted') {
      for (const candidate of candidates) {
        if (!candidate.accepted) continue;
        const resolution = candidate.resolution as { decision: string; resolved_claim_id: string | null };
        if (!resolution || !['reuse', 'create'].includes(resolution.decision)) {
          throw new Error('accepted candidate lacks reuse/create resolution');
        }
        let claimId = resolution.resolved_claim_id;
        if (resolution.decision === 'create' || !claimId) {
          claimId = `claim-${++this.seq}`;
          const identity = exactDurableIdentity({
            claimText: candidate.final_text as string,
            claimType: candidate.claim_type as string,
            qualifiers: (candidate.qualifiers ?? {}) as Record<string, string>,
          });
          // Exact-identity re-check (mirrors RPC advisory path).
          const existing = this.claims.find((row) => row.active && row.struct === identity.structuralHash && row.sem === identity.semanticHash);
          if (existing) {
            claimId = existing.id;
            reused += 1;
          } else {
            this.claims.push({
              id: claimId, text: candidate.final_text as string, type: candidate.claim_type as string,
              struct: identity.structuralHash, sem: identity.semanticHash, active: true,
              createdAt: new Date(this.nowMs).toISOString(),
            });
            this.ops.push('claims.insert');
            created += 1;
          }
        } else {
          const target = this.claims.find((row) => row.id === claimId && row.active);
          if (!target) throw new Error('reuse target failed identity verification');
          reused += 1;
        }
        const role = candidate.importance === 'primary' ? 'tests_primary' : 'tests_secondary';
        const live = this.links.find((link) => link.qid === item.nativeQuestionId && link.claimId === claimId && link.active);
        if (!live) {
          const dormant = this.links.find((link) => link.qid === item.nativeQuestionId && link.claimId === claimId && !link.active);
          if (dormant) {
            dormant.active = true;
            dormant.role = role;
            dormant.supersededBy = null;
            this.ops.push('links.reactivate');
          } else {
            this.links.push({ qid: item.nativeQuestionId, claimId: claimId as string, role, active: true, algorithm: 'orthobullets-claims-prod.v1', supersededBy: null });
            this.ops.push('links.insert');
          }
          // Supersede same-algorithm older links only; rows retained.
          for (const link of this.links) {
            if (link.qid === item.nativeQuestionId && link.role === role && link.claimId !== claimId
              && link.active && link.algorithm === 'orthobullets-claims-prod.v1') {
              link.active = false;
              link.supersededBy = claimId as string;
              this.ops.push('links.supersede');
            }
          }
        }
      }
    }
    item.status = finalState === 'accepted' ? 'accepted' : 'ai_review_unresolved';
    item.liveAttemptId = attemptId;
    item.leaseOwner = null;
    item.leaseExpiresAt = null;
    item.reasonCodes = [finalState === 'accepted' ? 'extraction_accepted' : 'extraction_unresolved'];
    item.sourceHash = src.source_hash;
    const usage = payload.usage as { promptTokens: number; completionTokens: number; estimatedCostUsd: number };
    item.promptTokens += usage.promptTokens;
    item.completionTokens += usage.completionTokens;
    item.costUsd += usage.estimatedCostUsd;
    this.ops.push(`items.persist:${finalState}`);
    return { ok: true, claims_created: created, claims_reused: reused };
  }
  async adoptLiveEvent(itemId: string, workerId: string, attemptId: string) {
    const item = this.items.find((entry) => entry.id === itemId)!;
    if (item.leaseOwner !== workerId) throw new Error('lease lost or not owned');
    const event = this.events.find((entry) => entry.id === attemptId);
    if (!event || event.finalState !== 'accepted' || event.supersededBy) throw new Error('event not adoptable');
    item.status = 'accepted';
    item.liveAttemptId = attemptId;
    item.leaseOwner = null;
    item.leaseExpiresAt = null;
    item.reasonCodes = ['adopted_live_event'];
    this.ops.push('items.adopt');
  }
  async findRegistryByNative(nativeQuestionId: string) {
    return this.registry.filter((row) => row.externalQuestionId === nativeQuestionId);
  }
  async findRegistryByAliases(aliasValues: string[]) {
    return this.aliases.filter((hit) => aliasValues.includes(hit.aliasValue));
  }
  async countExtractionAttempts(nativeQuestionId: string, sourceHash: string) {
    return this.events.filter((event) => event.nativeQuestionId === nativeQuestionId && event.sourceHash === sourceHash).length;
  }
  async findLiveAcceptedAttempt(nativeQuestionId: string, sourceHash: string) {
    const event = this.events.find((entry) => entry.nativeQuestionId === nativeQuestionId
      && entry.sourceHash === sourceHash && !entry.supersededBy && entry.finalState === 'accepted');
    return event ? { attemptId: event.id } : null;
  }
  async findLiveAttemptAny(nativeQuestionId: string, sourceHash: string) {
    const event = this.events.find((entry) => entry.nativeQuestionId === nativeQuestionId
      && entry.sourceHash === sourceHash && !entry.supersededBy);
    return event ? { attemptId: event.id } : null;
  }
  async findByExactIdentity(structuralHash: string, semanticHash: string) {
    return this.claims
      .filter((row) => row.active && row.struct === structuralHash && row.sem === semanticHash)
      .map((row) => ({
        id: row.id, claimText: row.text, claimType: row.type, qualifiers: {},
        fingerprintHash: row.struct, semanticFingerprintHash: row.sem, isActive: true,
        createdAt: row.createdAt, algorithmVersion: 'orthobullets-claims-prod.v1',
      }));
  }
  async findBySemanticHash(semanticHash: string) {
    return this.claims
      .filter((row) => row.active && row.sem === semanticHash)
      .map((row) => ({
        id: row.id, claimText: row.text, claimType: row.type, qualifiers: {},
        fingerprintHash: row.struct, semanticFingerprintHash: row.sem, isActive: true,
        createdAt: row.createdAt, algorithmVersion: 'orthobullets-claims-prod.v1',
      }));
  }
  async findTextNeighbors(normalizedText: string, limit: number) {
    const words = new Set(normalizedText.split(/\s+/).filter((word) => word.length > 4));
    return this.claims
      .filter((row) => row.active && [...words].some((word) => row.text.toLowerCase().includes(word)))
      .slice(0, limit)
      .map((row) => ({
        id: row.id, claimText: row.text, claimType: row.type, qualifiers: {},
        fingerprintHash: row.struct, semanticFingerprintHash: row.sem, isActive: true,
        createdAt: row.createdAt, algorithmVersion: 'orthobullets-claims-prod.v1',
      }));
  }
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

const CLAIM_A = 'The radial nerve travels in the spiral groove along the posterior humeral shaft.';
const CLAIM_B = 'The axillary nerve is at risk during anterior shoulder dislocation events here.';
const CLAIM_C = 'The tibia heals by endochondral ossification within a stabilizing callus envelope.';

function packet(qid: string, specialty = 'trauma'): ObRunnerPacket {
  return {
    nativeQuestionId: qid, specialty,
    packet: {
      stem: `Stem for question ${qid} asking about nerve anatomy relationships?`,
      answerChoices: [{ key: 'A', text: 'Median nerve' }, { key: 'B', text: 'Radial nerve' }],
      correctAnswer: 'Radial nerve',
      explanationText: `Explanation for ${qid}: the radial nerve is at risk in the spiral groove.`,
      topicHints: ['Humerus'],
    },
  };
}

const QUALIFIERS = {
  anatomy: '', age_group: '', setting: '', severity: '', laterality: '', procedure: '', contraindication: '',
};
const judgmentGood = (index: number) => ({
  claim_index: index, factual: 'supported', factual_reason: 'ok', quality: 'good',
  quality_reason: 'ok', importance_override: 'keep',
});
const COVERAGE = JSON.stringify({
  verdict: 'complete', notes: '', missing_concepts: [], drop_indices: [], importance_changes: [],
});
const VALIDATOR = JSON.stringify({ verdict: 'accept', reason: 'ok' });

function acceptFlow(text: string, importance = 'primary', claimType = 'anatomy'): string[] {
  return [
    JSON.stringify({
      claims: [{ text, importance, claim_type: claimType, qualifiers: QUALIFIERS, support: ['stem', 'explanation'], confidence: 0.9 }],
    }),
    JSON.stringify({ judgments: [judgmentGood(0)] }),
    COVERAGE,
    VALIDATOR,
  ];
}

function scriptedModel(outputs: Array<string | Error>) {
  let calls = 0;
  const client = {
    chat: {
      completions: {
        create: async () => {
          if (calls >= outputs.length) throw new Error(`model script exhausted at call ${calls}`);
          const output = outputs[calls];
          calls += 1;
          if (output instanceof Error) throw output;
          return { choices: [{ message: { content: output } }], usage: { prompt_tokens: 10, completion_tokens: 5 } };
        },
      },
    },
  };
  return { client: client as never, calls: () => calls };
}

function baseConfig(overrides: Partial<ObRunnerConfig> = {}): ObRunnerConfig {
  return {
    mode: 'run', runId: null, apply: true, workerId: 'worker-test', leaseSeconds: 300,
    forceReprocess: false,
    limits: { maxQuestions: 0, maxErrors: 0, maxCostUsd: 0, maxConsecutiveFailures: 0 },
    specialtyFilter: null, questionFilter: null,
    models: { generator: 'g', reviewer: 'r', coverage: 'c', repair: 'p', validator: 'v', resolution: 'e' },
    costPer1kPromptUsd: 0.0025, costPer1kCompletionUsd: 0.01,
    backoffBaseSeconds: 30, backoffCapSeconds: 1800, heartbeatDivider: 3,
    requestTimeoutMs: 120_000, interItemDelayMs: 0,
    ...overrides,
  };
}

function depsFor(db: FakeDb, model: { client: never }, packets: ObRunnerPacket[]): ObRunnerDeps {
  const checkpoints: unknown[] = [];
  return {
    db, model: model.client, packets,
    now: () => new Date(db.nowMs).toISOString(),
    nowMs: () => db.nowMs,
    sleep: async () => {},
    random: () => 0.5,
    onCheckpoint: (entry) => { checkpoints.push(entry); },
  };
}

function seedRegistry(db: FakeDb, qid: string, id = '11111111-1111-4111-8111-111111111111') {
  db.registry.push({
    id, sourceSlug: 'orthobullets', externalQuestionId: qid, topicSlug: 'humerus',
    topicNormalized: 'Humerus', specialtyNormalized: 'trauma', isActive: true,
  });
}

// 1. Happy path: accepted end to end.
{
  const db = new FakeDb(1_000_000);
  seedRegistry(db, 'Q1');
  const model = scriptedModel(acceptFlow(CLAIM_A));
  const report = await runObProduction(depsFor(db, model, [packet('Q1')]), baseConfig());
  assert.equal(report.outcomes.accepted, 1);
  assert.equal(db.events.length, 1);
  assert.equal(db.candidates.length, 1);
  assert.equal(db.claims.length, 1);
  assert.equal(db.links.filter((link) => link.active).length, 1);
  assert.equal(db.links[0].role, 'tests_primary');
  assert.equal(db.items[0].status, 'accepted');
  assert.equal(model.calls(), 4);
}

// 2. Same source/version rerun adopts the live event (no new extraction).
{
  const db = new FakeDb(1_000_000);
  seedRegistry(db, 'Q1');
  const first = scriptedModel(acceptFlow(CLAIM_A));
  await runObProduction(depsFor(db, first, [packet('Q1')]), baseConfig());
  assert.equal(first.calls(), 4);
  const second = scriptedModel([]);
  const report = await runObProduction(depsFor(db, second, [packet('Q1')]), baseConfig());
  assert.equal(report.outcomes.adopted, 1);
  assert.equal(second.calls(), 0);
  assert.equal(db.events.length, 1);
  assert.equal(db.claims.length, 1);
}

// 3. Force reprocess creates a new event and supersedes history.
{
  const db = new FakeDb(1_000_000);
  seedRegistry(db, 'Q1');
  await runObProduction(depsFor(db, scriptedModel(acceptFlow(CLAIM_A)), [packet('Q1')]), baseConfig());
  const firstEvent = db.events[0].id;
  const distinct = JSON.stringify({
    verdicts: [{ claim_id: db.claims[0].id, verdict: 'related_but_distinct', reason: 'different nerve' }],
  });
  const model = scriptedModel([...acceptFlow(CLAIM_B), distinct]);
  const report = await runObProduction(
    depsFor(db, model, [packet('Q1')]), baseConfig({ forceReprocess: true }),
  );
  assert.equal(report.outcomes.accepted, 1);
  assert.equal(db.events.length, 2);
  assert.equal(db.events[0].supersededBy, db.events[1].id);
  assert.equal(db.events[1].attemptNo, 1);
  void firstEvent;
}

// 4. Crash before persistence: lease expires, another worker reclaims.
{
  const db = new FakeDb(1_000_000);
  seedRegistry(db, 'Q1');
  await db.createRun({ runKey: 'k', config: {}, expectedCount: 1, createdBy: 't' });
  const runId = [...db.runs.keys()][0];
  await db.upsertItems(runId, [{ nativeQuestionId: 'Q1', specialty: null }]);
  const first = await db.leaseItem(runId, 'worker-a', 300);
  assert.ok(first);
  db.nowMs += 400_000; // lease expires (crash: no heartbeat, no complete)
  const second = await db.leaseItem(runId, 'worker-b', 300);
  assert.ok(second);
  assert.equal(second!.itemId, first!.itemId);
  assert.equal(second!.attemptCount, 2);
}

// 5. Transaction rollback: mid-persist failure leaves zero partial artifacts.
{
  const db = new FakeDb(1_000_000);
  seedRegistry(db, 'Q1');
  db.failPersistAfterArtifacts = true;
  const model = scriptedModel(acceptFlow(CLAIM_A));
  const report = await runObProduction(depsFor(db, model, [packet('Q1')]), baseConfig());
  assert.equal(report.outcomes.failed, 1);
  assert.equal(report.items[0].diagnostic, 'db_error');
  assert.equal(db.events.length, 0);
  assert.equal(db.candidates.length, 0);
  assert.equal(db.claims.length, 0);
  assert.equal(db.links.length, 0);
  assert.equal(db.items[0].status, 'failed_transient');
  assert.ok(db.items[0].nextAttemptAt);
}

// 6. Two workers lease different items (contention selection).
{
  const db = new FakeDb(1_000_000);
  await db.createRun({ runKey: 'k', config: {}, expectedCount: 2, createdBy: 't' });
  const runId = [...db.runs.keys()][0];
  await db.upsertItems(runId, [
    { nativeQuestionId: 'Q1', specialty: null },
    { nativeQuestionId: 'Q2', specialty: null },
  ]);
  const a = await db.leaseItem(runId, 'worker-a', 300);
  const b = await db.leaseItem(runId, 'worker-b', 300);
  assert.ok(a && b);
  assert.notEqual(a!.itemId, b!.itemId);
  assert.equal(await db.leaseItem(runId, 'worker-c', 300), null);
}

// 7. Malformed model JSON: transient with backoff.
{
  const db = new FakeDb(1_000_000);
  seedRegistry(db, 'Q1');
  const model = scriptedModel(['not json']);
  const report = await runObProduction(depsFor(db, model, [packet('Q1')]), baseConfig());
  assert.equal(report.outcomes.failed, 1);
  assert.equal(report.items[0].diagnostic, 'model_malformed');
  assert.equal(db.items[0].status, 'failed_transient');
  assert.ok(db.items[0].nextAttemptAt);
}

// 8. 429 transient, refusal permanent.
{
  const db = new FakeDb(1_000_000);
  seedRegistry(db, 'Q1');
  const err429 = new Error('rate limited');
  (err429 as { status?: number }).status = 429;
  const model = scriptedModel([err429]);
  const report = await runObProduction(depsFor(db, model, [packet('Q1')]), baseConfig());
  assert.equal(db.items[0].status, 'failed_transient');
  assert.equal(report.items[0].diagnostic, 'model_429');
}
{
  const db = new FakeDb(2_000_000);
  seedRegistry(db, 'Q1');
  const model = {
    chat: {
      completions: {
        create: async () => ({ choices: [{ message: { content: null, refusal: 'no' } }], usage: null }),
      },
    },
  };
  await runObProduction(depsFor(db, { client: model as never }, [packet('Q1')]), baseConfig());
  assert.equal(db.items[0].status, 'failed_permanent');
}

// 9. DB timeout on persist: transient.
{
  const db = new FakeDb(1_000_000);
  seedRegistry(db, 'Q1');
  db.failPersist = new Error('db_timeout: connection expired');
  const model = scriptedModel(acceptFlow(CLAIM_A));
  const report = await runObProduction(depsFor(db, model, [packet('Q1')]), baseConfig());
  assert.equal(report.items[0].diagnostic, 'db_error');
  assert.equal(db.items[0].status, 'failed_transient');
  assert.equal(db.events.length, 0);
}

// 10. Packet missing / invalid: permanent source failures, no model calls.
{
  const db = new FakeDb(1_000_000);
  seedRegistry(db, 'Q9');
  const created = await db.createRun({ runKey: 'k', config: {}, expectedCount: 1, createdBy: 't' });
  await db.upsertItems(created.id, [{ nativeQuestionId: 'Q9', specialty: null }]);
  const model = scriptedModel([]);
  const report = await runObProduction(depsFor(db, model, []), baseConfig({ runId: created.id }));
  assert.equal(report.outcomes.failed, 1);
  assert.equal(report.items[0].diagnostic, 'source_fetch_failed');
  assert.equal(db.items[0].status, 'failed_permanent');
  assert.equal(model.calls(), 0);
}
{
  const db = new FakeDb(1_000_000);
  seedRegistry(db, 'Q1');
  const bad = packet('Q1');
  bad.packet.stem = '  ';
  const model = scriptedModel([]);
  const report = await runObProduction(depsFor(db, model, [bad]), baseConfig());
  assert.equal(report.items[0].diagnostic, 'source_incomplete');
  assert.equal(db.items[0].status, 'failed_permanent');
  assert.equal(model.calls(), 0);
}

// 11. Identity unresolved / conflict: terminal, identity recorded, no extraction.
{
  const db = new FakeDb(1_000_000);
  const model = scriptedModel([]);
  const report = await runObProduction(depsFor(db, model, [packet('Q1')]), baseConfig());
  assert.equal(report.outcomes.identity_unresolved, 1);
  assert.equal(db.items[0].status, 'identity_unresolved');
  assert.equal(db.identities.length, 1);
  assert.equal(model.calls(), 0);
}
{
  const db = new FakeDb(1_000_000);
  seedRegistry(db, 'Q1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  db.registry.push({
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', sourceSlug: 'orthobullets', externalQuestionId: 'Q1',
    topicSlug: 'other', topicNormalized: 'Other', specialtyNormalized: 'trauma', isActive: true,
  });
  const model = scriptedModel([]);
  const report = await runObProduction(depsFor(db, model, [packet('Q1')]), baseConfig());
  assert.equal(report.outcomes.identity_conflict, 1);
  assert.equal(db.items[0].status, 'identity_conflict');
  assert.equal(model.calls(), 0);
}

// 12. Zero claims: accepted with zero candidates.
{
  const db = new FakeDb(1_000_000);
  seedRegistry(db, 'Q1');
  const model = scriptedModel([JSON.stringify({ claims: [] }), COVERAGE, VALIDATOR]);
  const report = await runObProduction(depsFor(db, model, [packet('Q1')]), baseConfig());
  assert.equal(report.outcomes.accepted, 1);
  assert.equal(report.items[0].claimsAccepted, 0);
  assert.equal(db.events.length, 1);
  assert.equal(db.candidates.length, 0);
  assert.equal(db.claims.length, 0);
  assert.equal(db.links.length, 0);
}

// 13. Exact existing claim reuse: no duplicate claim row.
{
  const db = new FakeDb(1_000_000);
  seedRegistry(db, 'Q1');
  const identity = exactDurableIdentity({ claimText: CLAIM_A, claimType: 'anatomy', qualifiers: {} });
  db.claims.push({
    id: 'claim-existing', text: CLAIM_A, type: 'anatomy',
    struct: identity.structuralHash, sem: identity.semanticHash, active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  const model = scriptedModel(acceptFlow(CLAIM_A)); // no equivalence call: exact hit
  const report = await runObProduction(depsFor(db, model, [packet('Q1')]), baseConfig());
  assert.equal(report.outcomes.accepted, 1);
  assert.equal(db.claims.length, 1);
  assert.equal(db.links[0].claimId, 'claim-existing');
  assert.equal(model.calls(), 4);
}

// 14. Related-but-distinct: new claim created, both preserved.
{
  const db = new FakeDb(1_000_000);
  seedRegistry(db, 'Q1');
  db.claims.push({
    id: 'claim-neighbor', text: 'The radial nerve is at risk in humeral shaft fractures generally.',
    type: 'anatomy', struct: 's'.repeat(64), sem: 'e'.repeat(64), active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  const equiv = JSON.stringify({
    verdicts: [{ claim_id: 'claim-neighbor', verdict: 'related_but_distinct', reason: 'different proposition' }],
  });
  const model = scriptedModel([...acceptFlow(CLAIM_A), equiv]);
  const report = await runObProduction(depsFor(db, model, [packet('Q1')]), baseConfig());
  assert.equal(report.outcomes.accepted, 1);
  assert.equal(db.claims.length, 2);
  assert.ok(db.claims.every((row) => row.active));
}

// 15. Contradictory existing claim: flipped to unresolved, nothing materialized.
{
  const db = new FakeDb(1_000_000);
  seedRegistry(db, 'Q1');
  db.claims.push({
    id: 'claim-foe', text: 'The radial nerve is never injured in humeral shaft fractures at all.',
    type: 'anatomy', struct: 's'.repeat(64), sem: 'e'.repeat(64), active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  const equiv = JSON.stringify({
    verdicts: [{ claim_id: 'claim-foe', verdict: 'contradictory', reason: 'opposite polarity' }],
  });
  const model = scriptedModel([...acceptFlow(CLAIM_A), equiv]);
  const report = await runObProduction(depsFor(db, model, [packet('Q1')]), baseConfig());
  assert.equal(report.outcomes.unresolved, 1);
  assert.equal(db.claims.length, 1);
  assert.equal(db.links.length, 0);
  assert.equal(db.events[0].finalState, 'ai_review_unresolved');
  assert.equal(db.resolutions.length, 1);
  assert.equal(db.items[0].status, 'ai_review_unresolved');
}

// 16. Duplicate link prevention: two candidates, one claim → one active link.
{
  const db = new FakeDb(1_000_000);
  seedRegistry(db, 'Q1');
  const two = [
    JSON.stringify({
      claims: [
        { text: CLAIM_A, importance: 'primary', claim_type: 'anatomy', qualifiers: QUALIFIERS, support: ['stem'], confidence: 0.9 },
        { text: CLAIM_A, importance: 'secondary', claim_type: 'anatomy', qualifiers: QUALIFIERS, support: ['explanation'], confidence: 0.8 },
      ],
    }),
    JSON.stringify({ judgments: [judgmentGood(0), judgmentGood(1)] }),
    COVERAGE,
    VALIDATOR,
  ];
  const model = scriptedModel(two);
  const report = await runObProduction(depsFor(db, model, [packet('Q1')]), baseConfig());
  assert.equal(report.outcomes.accepted, 1);
  // Same text/type/qualifiers → same identity → one claim, one link.
  assert.equal(db.claims.length, 1);
  assert.equal(db.links.filter((link) => link.active).length, 1);
}

// 17. Supersession without deletion: force reprocess retires old links, rows retained.
{
  const db = new FakeDb(1_000_000);
  seedRegistry(db, 'Q1');
  await runObProduction(depsFor(db, scriptedModel(acceptFlow(CLAIM_A)), [packet('Q1')]), baseConfig());
  assert.equal(db.links.filter((link) => link.active).length, 1);
  const oldClaim = db.links[0].claimId;
  const distinct = JSON.stringify({
    verdicts: [{ claim_id: db.claims[0].id, verdict: 'related_but_distinct', reason: 'different nerve' }],
  });
  await runObProduction(
    depsFor(db, scriptedModel([...acceptFlow(CLAIM_B), distinct]), [packet('Q1')]),
    baseConfig({ forceReprocess: true }),
  );
  assert.equal(db.links.length, 2);
  assert.equal(db.links.filter((link) => link.active).length, 1);
  const retired = db.links.find((link) => link.claimId === oldClaim)!;
  assert.equal(retired.active, false);
  assert.ok(retired.supersededBy);
}

// 18. Budgets stop the run: max-errors, max-consecutive, max-cost.
{
  const db = new FakeDb(1_000_000);
  seedRegistry(db, 'Q1');
  seedRegistry(db, 'Q2', '22222222-2222-4222-8222-222222222222');
  seedRegistry(db, 'Q3', '33333333-3333-4333-8333-333333333333');
  const model = scriptedModel(['bad', 'bad', 'bad']);
  const report = await runObProduction(
    depsFor(db, model, [packet('Q1'), packet('Q2'), packet('Q3')]),
    baseConfig({ limits: { maxQuestions: 0, maxErrors: 2, maxCostUsd: 0, maxConsecutiveFailures: 0 } }),
  );
  assert.equal(report.stoppedBy, 'max_errors');
  assert.equal(report.processed, 2);
}
{
  const db = new FakeDb(1_000_000);
  seedRegistry(db, 'Q1');
  seedRegistry(db, 'Q2', '22222222-2222-4222-8222-222222222222');
  seedRegistry(db, 'Q3', '33333333-3333-4333-8333-333333333333');
  seedRegistry(db, 'Q4', '44444444-4444-4444-8444-444444444444');
  const model = scriptedModel(['bad', 'bad', 'bad', 'bad']);
  const report = await runObProduction(
    depsFor(db, model, [packet('Q1'), packet('Q2'), packet('Q3'), packet('Q4')]),
    baseConfig({ limits: { maxQuestions: 0, maxErrors: 0, maxCostUsd: 0, maxConsecutiveFailures: 2 } }),
  );
  assert.equal(report.stoppedBy, 'max_consecutive_failures');
  assert.equal(report.processed, 2);
}
{
  const db = new FakeDb(1_000_000);
  seedRegistry(db, 'Q1');
  seedRegistry(db, 'Q2', '22222222-2222-4222-8222-222222222222');
  // Each question: 4 calls x (10 prompt + 5 completion) tokens.
  const model = scriptedModel([...acceptFlow(CLAIM_A), ...acceptFlow(CLAIM_B)]);
  const report = await runObProduction(
    depsFor(db, model, [packet('Q1'), packet('Q2')]),
    baseConfig({ limits: { maxQuestions: 0, maxErrors: 0, maxCostUsd: 0.0002, maxConsecutiveFailures: 0 } }),
  );
  assert.equal(report.stoppedBy, 'max_cost');
  assert.equal(report.processed, 1);
}

// 19. Dry run: full pipeline, zero DB writes.
{
  const db = new FakeDb(1_000_000);
  seedRegistry(db, 'Q1');
  const model = scriptedModel(acceptFlow(CLAIM_A));
  const report = await runObProduction(depsFor(db, model, [packet('Q1')]), baseConfig({ apply: false }));
  assert.equal(report.outcomes.would_accept, 1);
  assert.equal(db.ops.length, 0);
  assert.equal(db.events.length, 0);
  assert.equal(db.runs.size, 0);
}

// 20. Backoff bounds: exponential with jitter in [0.8, 1.2].
{
  assert.equal(backoffDelayMs(1, 30, 1800, () => 0), 24_000);
  assert.equal(backoffDelayMs(1, 30, 1800, () => 1), 36_000);
  assert.equal(backoffDelayMs(2, 30, 1800, () => 0.5), 60_000);
  assert.equal(backoffDelayMs(99, 30, 1800, () => 1), Math.round(1800 * 1.2 * 1000));
}

// 21. Prohibited paths are statically unreachable from v5 production modules.
{
  const { readFileSync } = await import('node:fs');
  const { dirname, join } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const dir = dirname(fileURLToPath(import.meta.url));
  const sources = [
    'claim-extraction-contract-v1.ts',
    'claim-review-pipeline.ts',
    'ob-question-identity.ts',
    'ob-claim-resolution.ts',
    'ob-production-runner-lib.ts',
  ].map((file) => readFileSync(join(dir, file), 'utf8')).join('\n');
  for (const forbidden of [
    'anki-linker', 'persistCardLinks', 'card_claim_links', 'canonical_entities',
    'resolve_or_create', 'find_published_anki', 'question-claims/route',
    'auto_approved', 'supabase', 'createClient',
  ]) {
    assert.ok(!sources.includes(forbidden), `forbidden token reachable: ${forbidden}`);
  }
}

// 22. Retry then accept: per-question FINAL outcomes (two rows, one question).
{
  const db = new FakeDb(1_000_000);
  seedRegistry(db, 'Q1');
  const model = scriptedModel([new Error('socket timed out after 120000ms'), ...acceptFlow(CLAIM_A)]);
  const report = await runObProduction(
    depsFor(db, model, [packet('Q1')]), baseConfig({ backoffBaseSeconds: 0 }),
  );
  assert.equal(report.processed, 2);
  assert.equal(report.questions, 1);
  assert.equal(report.items.length, 2);
  assert.equal(report.items[0].outcome, 'failed');
  assert.equal(report.items[1].outcome, 'accepted');
  assert.equal(report.outcomes.accepted, 1);
  assert.equal(report.outcomes.failed, undefined);
  assert.equal(db.items[0].status, 'accepted');
  assert.equal(model.calls(), 5);
}

// 23. Contract-rejection helpers: capped codes, tolerant usage salvage.
{
  assert.deepEqual(contractRejectionReasonCodes(null), ['contract_rejected', 'contract:not_record']);
  assert.deepEqual(
    contractRejectionReasonCodes({}),
    ['contract_rejected', 'contract:contract_version', 'contract:attempt_id', 'contract:attempt_no', 'contract:supersedes_attempt_id', 'contract:algorithm_version'],
  );
  const codes = contractRejectionReasonCodes({ contractVersion: 'x', attemptNo: -1, candidates: 'many', usage: null, diagnostics: 7 });
  assert.equal(codes[0], 'contract_rejected');
  assert.ok(codes.length <= 6);
  assert.ok(codes.some((code) => code === 'contract:contract_version'));
  assert.ok(codes.every((code) => code.length <= 89));
  assert.deepEqual(tolerantUsageTotals(null), { promptTokens: 0, completionTokens: 0 });
  assert.deepEqual(tolerantUsageTotals({ generator: { promptTokens: 10, completionTokens: 5 } }), { promptTokens: 10, completionTokens: 5 });
  assert.deepEqual(
    tolerantUsageTotals({ generator: { promptTokens: 10, completionTokens: -3 }, review: 'junk', coverage: { promptTokens: 1.5, completionTokens: 2 } }),
    { promptTokens: 10, completionTokens: 2 },
  );
}

// 24. Dry run counts failure usage (no zero-token failures).
{
  const db = new FakeDb(1_000_000);
  seedRegistry(db, 'Q1');
  const model = scriptedModel(['not json']);
  const report = await runObProduction(depsFor(db, model, [packet('Q1')]), baseConfig({ apply: false }));
  assert.equal(report.outcomes.failed, 1);
  assert.equal(report.items[0].diagnostic, 'model_malformed');
  assert.equal(report.items[0].promptTokens, 10);
  assert.equal(report.items[0].completionTokens, 5);
  assert.ok(report.estimatedCostUsd > 0);
  assert.equal(db.ops.length, 0);
}

// 25. Vignette text anywhere rejects pre-RPC as retryable (canary-500 Q1704).
{
  const db = new FakeDb(1_000_000);
  seedRegistry(db, 'Q1');
  const vignette = 'A 45-year-old man presents with wrist pain and numbness in the median nerve distribution.';
  const model = scriptedModel(acceptFlow(vignette));
  const report = await runObProduction(depsFor(db, model, [packet('Q1')]), baseConfig());
  assert.equal(report.outcomes.failed, 1);
  assert.equal(report.items[0].diagnostic, 'safety_violation');
  assert.deepEqual(report.items[0].reasonCodes, ['contract_rejected', 'contract:candidate[0]:text_safety:age_vignette']);
  assert.equal(db.items[0].status, 'failed_transient');
  assert.deepEqual(db.items[0].reasonCodes, ['contract_rejected', 'contract:candidate[0]:text_safety:age_vignette']);
  assert.ok(db.items[0].nextAttemptAt !== null);
  assert.ok(report.items[0].promptTokens > 0);
  assert.equal(db.events.length, 0);
}

// 26. Dry run mirrors the content-safety gate (no silent would-accept).
{
  const db = new FakeDb(1_000_000);
  seedRegistry(db, 'Q1');
  const vignette = 'A 45-year-old man presents with wrist pain and numbness in the median nerve distribution.';
  const model = scriptedModel(acceptFlow(vignette));
  const report = await runObProduction(depsFor(db, model, [packet('Q1')]), baseConfig({ apply: false }));
  assert.equal(report.outcomes.failed, 1);
  assert.equal(report.items[0].diagnostic, 'safety_violation');
  assert.deepEqual(report.items[0].reasonCodes, ['contract_rejected', 'contract:candidate[0]:text_safety:age_vignette']);
  assert.ok(report.items[0].promptTokens > 0);
  assert.equal(db.ops.length, 0);
}

// 27. Model failures carry sanitized detail (429s are diagnosable).
{
  const db = new FakeDb(1_000_000);
  seedRegistry(db, 'Q1');
  const err429 = new Error('429 Rate limit reached for gpt-4o\ntry later');
  (err429 as { status?: number }).status = 429;
  const model = scriptedModel([err429]);
  const report = await runObProduction(depsFor(db, model, [packet('Q1')]), baseConfig());
  assert.equal(report.outcomes.failed, 1);
  assert.equal(report.items[0].diagnostic, 'model_429');
  assert.deepEqual(db.items[0].reasonCodes, ['extraction_failed', 'model:429 Rate limit reached for gpt-4o try later']);
  assert.equal(db.items[0].status, 'failed_transient');
  assert.equal(sanitizeReasonDetail('  a\nb  c  ', 3), 'a b');
  assert.equal(sanitizeReasonDetail(''), '');
}

// 28. Inter-item pacing sleeps between items; safety classification is exact.
{
  const db = new FakeDb(1_000_000);
  seedRegistry(db, 'Q1');
  seedRegistry(db, 'Q2', '22222222-2222-4222-8222-222222222222');
  const model = scriptedModel([...acceptFlow(CLAIM_A), ...acceptFlow(CLAIM_C)]);
  const sleeps: number[] = [];
  const deps = { ...depsFor(db, model, [packet('Q1'), packet('Q2')]), sleep: async (ms: number) => { sleeps.push(ms); } };
  const report = await runObProduction(deps, baseConfig({ interItemDelayMs: 1500 }));
  assert.equal(report.outcomes.accepted, 2);
  assert.deepEqual(sleeps, [1500, 1500]);
  assert.equal(isContentSafetyRejection(['candidate[0]:text_safety:age_vignette']), true);
  assert.equal(isContentSafetyRejection(['candidate[0]:repair[0]:before_text_safety:presentation_vignette']), true);
  assert.equal(isContentSafetyRejection(['contract_version']), false);
  assert.equal(isContentSafetyRejection(['candidate[0]:text_safety:age_vignette', 'contract_version']), false);
  assert.equal(isContentSafetyRejection([]), false);
}

// 29. Invalid numeric controls fail before database or model work.
{
  assert.throws(() => validateObRunnerConfig(baseConfig({ interItemDelayMs: Number.NaN })), /interItemDelayMs/);
  assert.throws(() => validateObRunnerConfig(baseConfig({ leaseSeconds: 0 })), /leaseSeconds/);
  assert.throws(() => validateObRunnerConfig(baseConfig({ requestTimeoutMs: 0 })), /requestTimeoutMs/);
  assert.throws(() => validateObRunnerConfig(baseConfig({
    limits: { maxQuestions: 1.5, maxErrors: 0, maxCostUsd: 0, maxConsecutiveFailures: 10 },
  })), /maxQuestions/);
}

console.log('ob-production-runner-lib.test.ts: all assertions passed');
