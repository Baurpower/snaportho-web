/**
 * Stability evaluation: N independent production-pipeline extractions per
 * question over a representative packet set. Pure extraction (no DB writes).
 * Reports acceptance/count/text stability honestly; never fabricates.
 *
 * Usage:
 *   node --experimental-strip-types --experimental-loader ./tmp/alias-loader.mjs \
 *     scripts/eval-ob-claims-stability.ts --input=packets.json --out=dir \
 *     [--runs=3] [--per-specialty=5] [--delay-ms=1200]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import OpenAI from 'openai';
import { runProductionExtraction } from '../src/lib/brobot/orthobullets/claim-review-pipeline.ts';
import { sourceContentHashV5, verbatimSimilarity } from '../src/lib/brobot/orthobullets/claim-extractor-v5.ts';

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
  if (!existsSync(file)) return values;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean || clean.startsWith('#') || !clean.includes('=')) continue;
    const at = clean.indexOf('=');
    values[clean.slice(0, at).trim()] = clean.slice(at + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return values;
}

function tokens(value: string): Set<string> {
  return new Set(value.toLowerCase().match(/[a-z0-9%/-]{4,}/g) ?? []);
}

function overlap(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const token of ta) if (tb.has(token)) inter += 1;
  return inter / Math.min(ta.size, tb.size);
}

/** Greedy best-match F1 between two claim sets (match = overlap>=0.5 or verbatim>=0.8). */
function setF1(left: string[], right: string[]): number {
  if (!left.length && !right.length) return 1;
  if (!left.length || !right.length) return 0;
  const used = new Set<number>();
  let matches = 0;
  for (const a of left) {
    let best = -1;
    let bestScore = 0;
    right.forEach((b, index) => {
      if (used.has(index)) return;
      const score = Math.max(overlap(a, b), verbatimSimilarity(a, b));
      if (score > bestScore) {
        bestScore = score;
        best = index;
      }
    });
    if (bestScore >= 0.5 && best >= 0) {
      used.add(best);
      matches += 1;
    }
  }
  const precision = matches / right.length;
  const recall = matches / left.length;
  return precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = args.get('--input');
  if (!inputPath) throw new Error('missing --input=packets.json');
  const runs = Number(args.get('--runs') ?? '3');
  const perSpecialty = Number(args.get('--per-specialty') ?? '5');
  const delayMs = Number(args.get('--delay-ms') ?? '1200');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = args.get('--out') ?? path.join('/tmp', 'obv5-stability', stamp);
  mkdirSync(outDir, { recursive: true });

  const env = { ...loadEnv(path.resolve('.env.local')), ...process.env };
  if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
  const strong = env.BROBOT_STRONG_MODEL?.trim() || 'gpt-4o';
  const models = {
    generator: env.BROBOT_OB_CLAIMS_GENERATOR_MODEL?.trim() || strong,
    reviewer: env.BROBOT_OB_CLAIMS_CRITIC_MODEL?.trim() || strong,
    coverage: env.BROBOT_OB_CLAIMS_REVIEW_MODEL?.trim() || strong,
    repair: env.BROBOT_OB_CLAIMS_REVIEW_MODEL?.trim() || strong,
    validator: strong,
  };
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  const raw = JSON.parse(readFileSync(inputPath, 'utf8')) as Array<{
    nativeQuestionId: string; specialty?: string; packet: {
      stem: string; answerChoices: Array<{ key: string; text: string }>;
      correctAnswer: string | null; explanationText: string | null; topicHints: string[];
    };
  }>;
  const bySpecialty = new Map<string, typeof raw>();
  for (const row of raw) {
    const key = row.specialty ?? 'unknown';
    if (!bySpecialty.has(key)) bySpecialty.set(key, []);
    bySpecialty.get(key)!.push(row);
  }
  const selected: typeof raw = [];
  for (const [, rows] of [...bySpecialty.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    selected.push(...rows.slice(0, perSpecialty));
  }

  const perQuestion: Array<{
    nativeQuestionId: string; specialty: string;
    states: string[]; counts: number[]; acceptedCounts: number[];
    pairwiseF1: Array<number | null>; errors: Array<string | null>;
  }> = [];

  let n = 0;
  for (const row of selected) {
    n += 1;
    const states: string[] = [];
    const counts: number[] = [];
    const acceptedCounts: number[] = [];
    const errors: Array<string | null> = [];
    const texts: string[][] = [];
    const okFlags: boolean[] = [];
    const sourceHash = sourceContentHashV5(row.packet);
    for (let run = 0; run < runs; run += 1) {
      if (run > 0 && delayMs > 0) await sleep(delayMs);
      try {
        const result = await runProductionExtraction(row.packet, {
          provider: 'orthobullets',
          nativeQuestionId: row.nativeQuestionId,
          registryQuestionId: null,
          sourceHash,
          reviewLocator: `https://www.orthobullets.com/testview?qid=${encodeURIComponent(row.nativeQuestionId)}`,
        }, { client: client as never, models });
        if (!result.ok) {
          states.push(`failed:${result.diagnostic}`);
          counts.push(-1);
          acceptedCounts.push(-1);
          errors.push(result.diagnostic);
          texts.push([]);
          okFlags.push(false);
        } else {
          states.push(result.extraction.finalState);
          counts.push(result.extraction.candidates.length);
          acceptedCounts.push(result.extraction.candidates.filter((c) => c.accepted).length);
          errors.push(null);
          texts.push(result.extraction.candidates.filter((c) => c.accepted).map((c) => c.text));
          okFlags.push(true);
        }
      } catch (error) {
        states.push('failed:exception');
        counts.push(-1);
        acceptedCounts.push(-1);
        errors.push(error instanceof Error ? error.message.slice(0, 100) : 'exception');
        texts.push([]);
        okFlags.push(false);
      }
    }
    // Failed runs carry no claim sets: their pairs score null, never F1 1.
    const pairwiseF1: Array<number | null> = [];
    for (let i = 0; i < runs; i += 1) {
      for (let j = i + 1; j < runs; j += 1) {
        pairwiseF1.push(
          okFlags[i] && okFlags[j] ? Number(setF1(texts[i], texts[j]).toFixed(3)) : null,
        );
      }
    }
    perQuestion.push({
      nativeQuestionId: row.nativeQuestionId, specialty: row.specialty ?? 'unknown',
      states, counts, acceptedCounts, pairwiseF1, errors,
    });
    const okPairs = pairwiseF1.filter((v): v is number => typeof v === 'number');
    console.log(JSON.stringify({
      progress: `${n}/${selected.length}`, qid: row.nativeQuestionId,
      states, counts, acceptedCounts,
      meanF1: okPairs.length ? Number((okPairs.reduce((a, b) => a + b, 0) / okPairs.length).toFixed(3)) : null,
    }));
    if (delayMs > 0) await sleep(delayMs);
  }

  const sameState = perQuestion.filter((q) => q.states.every((s) => s === q.states[0])).length;
  const sameCount = perQuestion.filter((q) => q.acceptedCounts.every((c) => c === q.acceptedCounts[0])).length;
  const allF1 = perQuestion.flatMap((q) => q.pairwiseF1).filter((v): v is number => typeof v === 'number');
  const allPairs = perQuestion.reduce((a, q) => a + q.pairwiseF1.length, 0);
  const failedRuns = perQuestion.flatMap((q) => q.states).filter((s) => s.startsWith('failed:')).length;
  const report = {
    runs, questions: perQuestion.length, models,
    generatedAt: new Date().toISOString(),
    failedRuns,
    scoredPairs: `${allF1.length}/${allPairs}`,
    identicalState: `${sameState}/${perQuestion.length}`,
    identicalAcceptedCount: `${sameCount}/${perQuestion.length}`,
    meanPairwiseF1: allF1.length ? Number((allF1.reduce((a, b) => a + b, 0) / allF1.length).toFixed(3)) : null,
    minPairwiseF1: allF1.length ? Math.min(...allF1) : null,
    acceptanceRatePerRun: Array.from({ length: runs }, (_, run) =>
      perQuestion.filter((q) => q.states[run] === 'accepted').length),
    perQuestion,
  };
  writeFileSync(path.join(outDir, 'stability-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    event: 'finished', outDir, identicalState: report.identicalState,
    identicalAcceptedCount: report.identicalAcceptedCount,
    meanPairwiseF1: report.meanPairwiseF1, acceptanceRatePerRun: report.acceptanceRatePerRun,
  }));
}

main().catch((error) => {
  console.error(JSON.stringify({ fatal: error instanceof Error ? error.message : 'unknown' }));
  process.exit(1);
});
