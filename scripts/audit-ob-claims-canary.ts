/**
 * Independent AI audit for v5 canaries. Blind to the production chain: the
 * auditors see ONLY the source packet + final claims + importance labels.
 * No generator/critic/validator reasoning is exposed.
 *
 * Auditor 1 classifies every question PASS/FAIL/UNRESOLVED with explicit
 * defect categories. Auditor 2 (different prompt) re-examines FAIL and
 * UNRESOLVED cases only. Verdict disagreement is recorded as
 * audit_disagreement and reported as a system metric, never auto-failed.
 *
 * Usage:
 *   node --experimental-strip-types --experimental-loader ./tmp/alias-loader.mjs \
 *     scripts/audit-ob-claims-canary.ts --input=packets.json \
 *     --out=dir --run-id=UUID [--no-second] [--delay-ms=800]
 *
 * Audits the exact event referenced by each requested run item and rejects a
 * packet whose source fingerprint differs. The manifest is written before any
 * model call so the audited evidence remains reproducible after reprocessing.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import OpenAI from 'openai';
import pg from 'pg';
import { sourceContentHashV5, type ObSourcePacketV5 } from '../src/lib/brobot/orthobullets/claim-extractor-v5';
import { deterministicSamplingParams } from '../src/lib/brobot/orthobullets/openai-model-compat';
import { terminalRunPreconditions } from './lib/ob-claims-run-gate';
import { resolveObModelProfile } from './lib/ob-model-profile';

const AUDITOR1_SYSTEM = `You are an independent orthopaedic-education auditor. You receive an Orthobullets source question (stem, answer choices, correct answer, explanation) and a set of final extracted educational claims labeled primary/secondary. You know nothing about how the claims were produced.

Classify the extraction:
- PASS: every claim is factually supported by the source (stem, correct answer, or explanation), the primary teaching concept is covered, claims are atomic general rules (no specific-patient vignette text, no distractor-derived falsehoods, no negation flips, correct thresholds), and secondary claims are proportionate (at most a few, each adding distinct value).
- FAIL: at least one clear defect (see categories). Name every defect with its category and the claim index (0-based) it affects, or null for set-level defects.
- UNRESOLVED: you cannot confidently judge (e.g., source itself is ambiguous, or a fair expert could disagree). Prefer UNRESOLVED over a forced verdict.

Defect categories: unsupported_claim, missing_primary_concept, distractor_contamination, vignette_contamination, negation_error, threshold_error, non_atomic, excessive_secondary, redundancy, other.

For questions with ZERO extracted claims: PASS if abstention is justified (no safely extractable general claim exists in the source); FAIL with missing_primary_concept if the source clearly supports claims the extraction missed; UNRESOLVED if genuinely borderline.

Reply with a single JSON object only: {"verdict":"PASS|FAIL|UNRESOLVED","defects":[{"category":"","claim_index":null,"detail":""}],"notes":""}`.trim();

const AUDITOR2_SYSTEM = `You are a second independent orthopaedic-education auditor reviewing a disputed extraction. You receive the same source question and final claims as the first auditor, plus the first auditor's verdict and alleged defects. Verify EACH alleged defect against the source yourself: confirm it only if the source plainly supports the charge, overturn it if the claim is actually supported/atomic/correct.

Reply with a single JSON object only: {"verdict":"PASS|FAIL|UNRESOLVED","confirmed_defects":[{"category":"","claim_index":null,"detail":""}],"overturned":0,"notes":""}.

Rules: verdict FAIL only if at least one defect survives your own verification. Verdict PASS if all charges are overturned (or none were made and the set is sound). Verdict UNRESOLVED if you cannot confidently decide after review.

For questions with ZERO extracted claims: a missing_primary_concept charge is VALID and must be judged on the merits (does the source clearly support claims the extraction missed?). An empty set never auto-passes and never auto-fails: PASS only if abstention was justified, FAIL if the source plainly supports extractable claims, UNRESOLVED if genuinely borderline.`.trim();

function parseArgs(values: string[]): Map<string, string> {
  const args = new Map<string, string>();
  for (const value of values) {
    if (!value.startsWith('--')) continue;
    const at = value.indexOf('=');
    args.set(at < 0 ? value : value.slice(0, at), at < 0 ? 'true' : value.slice(at + 1));
  }
  return args;
}

function loadEnv(file: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean || clean.startsWith('#') || !clean.includes('=')) continue;
    const at = clean.indexOf('=');
    values[clean.slice(0, at).trim()] = clean.slice(at + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return values;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type AuditVerdict = 'PASS' | 'FAIL' | 'UNRESOLVED';

type AuditPacket = {
  nativeQuestionId: string;
  specialty?: string;
  packet: ObSourcePacketV5;
};

type AuditEventRow = {
  id: string;
  run_id: string;
  source_fingerprint_hash: string;
  algorithm_version: string;
  prompt_set_version: string;
};

export type AuditManifestEntry = {
  qid: string;
  specialty: string | null;
  runId: string;
  itemId: string;
  itemStatus: string;
  extractionEventId: string | null;
  eventRunId: string | null;
  sourceFingerprintHash: string;
  algorithmVersion: string | null;
  promptSetVersion: string | null;
  claimsHash: string;
  claims: Array<{ index: number; text: string; importance: string; accepted: boolean }>;
  source: AuditPacket['packet'];
};

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function buildAuditManifestEntry(input: {
  runId: string;
  packet: AuditPacket;
  item: { id: string; status: string; liveAttemptId: string | null };
  event: {
    id: string; runId: string; sourceFingerprintHash: string;
    algorithmVersion: string; promptSetVersion: string;
  } | null;
  claims: AuditManifestEntry['claims'];
}): AuditManifestEntry {
  const sourceFingerprintHash = sourceContentHashV5(input.packet.packet);
  if (input.item.liveAttemptId !== (input.event?.id ?? null)) throw new Error(`audit pointer mismatch for ${input.packet.nativeQuestionId}`);
  if (input.event && input.event.sourceFingerprintHash !== sourceFingerprintHash) {
    throw new Error(`audit source hash mismatch for ${input.packet.nativeQuestionId}`);
  }
  if (input.event && input.event.algorithmVersion !== 'orthobullets-claims-prod.v1') {
    throw new Error(`audit algorithm mismatch for ${input.packet.nativeQuestionId}`);
  }
  if (input.event && input.event.promptSetVersion !== 'ob-claims-prod-prompts-v1.0') {
    throw new Error(`audit prompt-set mismatch for ${input.packet.nativeQuestionId}`);
  }
  if (!input.event && ['accepted', 'adopted', 'ai_review_unresolved'].includes(input.item.status)) {
    throw new Error(`audit terminal item has no event for ${input.packet.nativeQuestionId}`);
  }
  const acceptedClaims = input.claims.filter((claim) => claim.accepted);
  return {
    qid: input.packet.nativeQuestionId,
    specialty: input.packet.specialty ?? null,
    runId: input.runId,
    itemId: input.item.id,
    itemStatus: input.item.status,
    extractionEventId: input.event?.id ?? null,
    eventRunId: input.event?.runId ?? null,
    sourceFingerprintHash,
    algorithmVersion: input.event?.algorithmVersion ?? null,
    promptSetVersion: input.event?.promptSetVersion ?? null,
    claimsHash: sha256(JSON.stringify(acceptedClaims.map((claim) => ({ index: claim.index, importance: claim.importance, text: claim.text })))),
    claims: input.claims,
    source: input.packet.packet,
  };
}

function parseVerdict(raw: string | null): { verdict: AuditVerdict; json: Record<string, unknown> } | null {
  if (!raw) return null;
  try {
    const json = JSON.parse(raw) as Record<string, unknown>;
    const verdict = json.verdict;
    if (verdict !== 'PASS' && verdict !== 'FAIL' && verdict !== 'UNRESOLVED') return null;
    return { verdict, json };
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const runId = args.get('--run-id');
  if (!runId) throw new Error('missing --run-id=UUID (audits must be bound to a production run)');
  const inputPath = args.get('--input');
  if (!inputPath) throw new Error('missing --input=packets.json');
  const second = args.get('--no-second') !== 'true';
  const delayMs = Number(args.get('--delay-ms') ?? '800');
  if (!Number.isInteger(delayMs) || delayMs < 0) throw new Error('--delay-ms must be a nonnegative integer');
  const requestTimeoutMs = Number(args.get('--request-timeout-ms') ?? '120000');
  if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 1) throw new Error('--request-timeout-ms must be a positive integer');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = args.get('--out') ?? path.join('/tmp', 'ob-canary-audit', stamp);
  mkdirSync(outDir, { recursive: true });

  const env = { ...loadEnv(path.resolve('.env.local')), ...process.env };
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  const modelProfile = args.get('--model-profile') ?? 'environment';
  const provider = resolveObModelProfile(modelProfile, env);
  const model1 = modelProfile === 'environment'
    ? env.OB_AUDIT_MODEL_1?.trim() || env.BROBOT_STRONG_MODEL?.trim() || provider.models.generator
    : provider.models.generator;
  const model2 = modelProfile === 'environment'
    ? env.OB_AUDIT_MODEL_2?.trim() || env.BROBOT_STRONG_MODEL?.trim() || provider.models.reviewer
    : provider.models.reviewer;
  const client = new OpenAI({ apiKey: provider.apiKey, ...(provider.baseURL ? { baseURL: provider.baseURL } : {}) });
  const db = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();

  const inputText = readFileSync(inputPath, 'utf8');
  const packetSha256 = sha256(inputText);
  const allPackets = JSON.parse(inputText) as AuditPacket[];
  const questionId = args.get('--question-id');
  const packets = questionId
    ? allPackets.filter((packet) => packet.nativeQuestionId === questionId)
    : allPackets;
  if (questionId && packets.length !== 1) {
    throw new Error(`expected exactly one packet for --question-id=${questionId}; found ${packets.length}`);
  }
  const runResult = await db.query(
    `select id, status, expected_count, completed_count, packet_sha256
       from public.ob_claim_production_runs where id = $1`,
    [runId],
  );
  if (runResult.rows.length !== 1) throw new Error(`production run not found: ${runId}`);
  const run = runResult.rows[0] as {
    status: string; expected_count: number | string; completed_count: number | string; packet_sha256: string | null;
  };
  const statusResult = await db.query(
    `select status, count(*)::integer as count
       from public.ob_claim_production_items where run_id = $1 group by status order by status`,
    [runId],
  );
  const readinessIssues = terminalRunPreconditions(run, statusResult.rows as Array<{ status: string; count: number | string }>);
  if (readinessIssues.length) throw new Error(`audit gate not ready: ${readinessIssues.join(', ')}`);
  if (!questionId && allPackets.length !== Number(run.expected_count)) {
    throw new Error(`audit packet count mismatch: ${allPackets.length}/${run.expected_count}`);
  }
  if (run.packet_sha256 && run.packet_sha256 !== packetSha256) {
    throw new Error(`audit packet hash mismatch: ${packetSha256} != ${run.packet_sha256}`);
  }
  const results: Array<Record<string, unknown>> = [];
  const usage1 = { calls: 0, prompt: 0, completion: 0 };
  const usage2 = { calls: 0, prompt: 0, completion: 0 };

  const manifest: AuditManifestEntry[] = [];
  const seenQids = new Set<string>();
  for (const packet of packets) {
    const qid = packet.nativeQuestionId;
    if (seenQids.has(qid)) throw new Error(`duplicate packet qid: ${qid}`);
    seenQids.add(qid);
    const itemResult = await db.query(
      `select id, status, live_attempt_id from public.ob_claim_production_items
        where run_id = $1 and native_question_id = $2`,
      [runId, qid],
    );
    if (itemResult.rows.length !== 1) throw new Error(`expected exactly one run item for ${qid}; found ${itemResult.rows.length}`);
    const itemRow = itemResult.rows[0] as { id: string; status: string; live_attempt_id: string | null };
    let eventRow: AuditEventRow | null = null;
    let claims: Array<{ index: number; text: string; importance: string; accepted: boolean }> = [];
    if (itemRow.live_attempt_id) {
      const eventResult = await db.query(
        `select id, run_id, source_fingerprint_hash, algorithm_version, prompt_set_version
           from public.ob_claim_extraction_events where id = $1`,
        [itemRow.live_attempt_id],
      );
      if (eventResult.rows.length !== 1) throw new Error(`missing extraction event ${itemRow.live_attempt_id} for ${qid}`);
      eventRow = eventResult.rows[0] as AuditEventRow;
      const rows = await db.query(
        `select candidate_index as idx, final_text as text, importance, accepted
         from public.ob_claim_candidates where extraction_event_id = $1 order by candidate_index`,
        [itemRow.live_attempt_id],
      );
      claims = (rows.rows as Array<{ idx: number; text: string; importance: string; accepted: boolean }>)
        .map((r) => ({ index: r.idx, text: r.text, importance: r.importance, accepted: r.accepted }));
    }
    manifest.push(buildAuditManifestEntry({
      runId,
      packet,
      item: { id: itemRow.id, status: itemRow.status, liveAttemptId: itemRow.live_attempt_id },
      event: eventRow ? {
        id: eventRow.id, runId: eventRow.run_id, sourceFingerprintHash: eventRow.source_fingerprint_hash,
        algorithmVersion: eventRow.algorithm_version, promptSetVersion: eventRow.prompt_set_version,
      } : null,
      claims,
    }));
  }
  const manifestPath = path.join(outDir, 'audit-manifest.json');
  writeFileSync(manifestPath, `${JSON.stringify({ runId, generatedAt: new Date().toISOString(), entries: manifest }, null, 2)}\n`);

  for (const item of manifest) {
    const accepted = item.claims.filter((claim) => claim.accepted);
    const userPayload = {
      source: {
        stem: item.source.stem,
        choices: item.source.answerChoices,
        correct_answer: item.source.correctAnswer,
        explanation: item.source.explanationText,
      },
      item_status: item.itemStatus,
      final_claims: accepted.map((c) => ({ index: c.index, importance: c.importance, text: c.text })),
    };
    const call1 = await client.chat.completions.create({
      model: model1, ...deterministicSamplingParams(model1), response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: AUDITOR1_SYSTEM }, { role: 'user', content: JSON.stringify(userPayload) }],
    }, { timeout: requestTimeoutMs });
    usage1.calls += 1;
    usage1.prompt += call1.usage?.prompt_tokens ?? 0;
    usage1.completion += call1.usage?.completion_tokens ?? 0;
    const parsed1 = parseVerdict(call1.choices[0]?.message?.content ?? null);
    const entry: Record<string, unknown> = {
      qid: item.qid, specialty: item.specialty, status: item.itemStatus,
      item_id: item.itemId, extraction_event_id: item.extractionEventId,
      source_fingerprint_hash: item.sourceFingerprintHash, claims_hash: item.claimsHash,
      claims_accepted: accepted.length, auditor1: parsed1?.json ?? { verdict: 'UNRESOLVED', defects: [], notes: 'unparseable auditor output' },
    };
    if (second && parsed1 && parsed1.verdict !== 'PASS') {
      if (delayMs > 0) await sleep(delayMs);
      const call2 = await client.chat.completions.create({
        model: model2, ...deterministicSamplingParams(model2), response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: AUDITOR2_SYSTEM },
          { role: 'user', content: JSON.stringify({ ...userPayload, first_audit: parsed1.json }) },
        ],
      }, { timeout: requestTimeoutMs });
      usage2.calls += 1;
      usage2.prompt += call2.usage?.prompt_tokens ?? 0;
      usage2.completion += call2.usage?.completion_tokens ?? 0;
      const parsed2 = parseVerdict(call2.choices[0]?.message?.content ?? null);
      entry.auditor2 = parsed2?.json ?? { verdict: 'UNRESOLVED', confirmed_defects: [], overturned: 0, notes: 'unparseable auditor output' };
      const v2 = (entry.auditor2 as { verdict: AuditVerdict }).verdict;
      entry.final = parsed1.verdict === v2 ? parsed1.verdict : 'audit_disagreement';
    } else {
      entry.final = parsed1?.verdict ?? 'UNRESOLVED';
    }
    results.push(entry);
    console.log(JSON.stringify({ qid: item.qid, status: item.itemStatus, accepted: accepted.length, final: entry.final }));
    if (delayMs > 0) await sleep(delayMs);
  }

  const tally = (key: string) => {
    const counts: Record<string, number> = {};
    for (const r of results) {
      const raw = r[key];
      const v = String(raw && typeof raw === 'object' ? (raw as { verdict?: string }).verdict ?? 'UNKNOWN' : raw ?? 'UNKNOWN');
      counts[v] = (counts[v] ?? 0) + 1;
    }
    return counts;
  };
  const report = {
    runId, packetSha256, manifestPath, provider: provider.provider,
    models: { auditor1: model1, auditor2: second ? model2 : null },
    generatedAt: new Date().toISOString(), questions: results.length,
    final: tally('final'), auditor1: tally('auditor1'),
    usage: { auditor1: usage1, auditor2: usage2 },
    results,
  };
  writeFileSync(path.join(outDir, 'audit-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ event: 'finished', outDir, questions: results.length, final: report.final }));
  await db.end();
}

const invoked = process.argv[1]?.endsWith('audit-ob-claims-canary.ts') ?? false;
if (invoked) {
  main().catch((error) => {
    console.error(JSON.stringify({ fatal: error instanceof Error ? error.message : 'unknown' }));
    if (error instanceof Error && error.stack) console.error(error.stack.split('\n').slice(0, 4).join('\n'));
    process.exit(1);
  });
}
