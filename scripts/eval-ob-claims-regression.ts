/**
 * Regression eval for v5 claim extraction. Fetches fresh packets by qid
 * (curator OB session; no source text stored in repo), runs extractClaimsV5,
 * and checks each case's expectations. Exits nonzero on any failure.
 *
 * Usage:
 *   node --experimental-strip-types --experimental-loader ./tmp/alias-loader.mjs \
 *     scripts/eval-ob-claims-regression.ts --out=/tmp/obv5-regression [--packets=file.json]
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import OpenAI from 'openai';
import {
  extractClaimsV5,
  flagWithinQuestionDuplicates,
  type ObProposedClaimV5,
} from '../src/lib/brobot/orthobullets/claim-extractor-v5';

type ExpectedConcept = { all: string[]; importance?: 'primary' | 'secondary'; note?: string };
type Case = {
  qid: string;
  specialty: string;
  notes: string;
  traps: string[];
  expectedConcepts: ExpectedConcept[];
  forbiddenPatterns: string[];
  minClaims?: number;
  maxClaims?: number;
  minPrimaries?: number;
};

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

function checkCase(testCase: Case, claims: ObProposedClaimV5[]): string[] {
  const failures: string[] = [];
  const texts = claims.map((claim) => claim.text);
  const lowered = texts.map((text) => text.toLowerCase());
  if (testCase.minClaims !== undefined && claims.length < testCase.minClaims) {
    failures.push(`claims ${claims.length} < min ${testCase.minClaims}`);
  }
  if (testCase.maxClaims !== undefined && claims.length > testCase.maxClaims) {
    failures.push(`claims ${claims.length} > max ${testCase.maxClaims}`);
  }
  if (testCase.minPrimaries !== undefined) {
    const primaries = claims.filter((claim) => claim.importance === 'primary').length;
    if (primaries < testCase.minPrimaries) failures.push(`primaries ${primaries} < min ${testCase.minPrimaries}`);
  }
  for (const concept of testCase.expectedConcepts) {
    const covered = claims.some((claim) => {
      if (concept.importance && claim.importance !== concept.importance) return false;
      const text = claim.text.toLowerCase();
      return concept.all.every((keyword) => text.includes(keyword.toLowerCase()));
    });
    if (!covered) failures.push(`missing concept: ${concept.note ?? concept.all.join('+')}`);
  }
  for (const pattern of testCase.forbiddenPatterns) {
    const regex = new RegExp(pattern, 'i');
    const hit = texts.findIndex((text) => regex.test(text));
    if (hit >= 0) failures.push(`forbidden pattern /${pattern}/ matched claim #${hit}`);
  }
  for (const claim of claims) {
    if (claim.provenance.autoFlags.length) {
      failures.push(`auto flags on "${claim.text.slice(0, 60)}...": ${claim.provenance.autoFlags.join(',')}`);
    }
  }
  const dupes = flagWithinQuestionDuplicates(texts);
  if (dupes.length) failures.push(`verbatim dupe pairs: ${JSON.stringify(dupes)}`);
  void lowered;
  return failures;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const outDir = args.get('--out') ?? '/tmp/obv5-regression';
  mkdirSync(outDir, { recursive: true });
  const suite = JSON.parse(readFileSync(
    path.resolve('src/lib/brobot/orthobullets/claim-extraction-regression-v5.json'), 'utf8',
  )) as { cases: Case[] };

  let packetsPath = args.get('--packets');
  if (!packetsPath) {
    packetsPath = path.join(outDir, 'packets.json');
    const qids = suite.cases.map((testCase) => testCase.qid).join(',');
    execSync(`node scripts/fetch-ob-question-packets.mjs --qids=${qids} --out=${packetsPath} --delay-ms=1500`, { stdio: 'inherit' });
  }
  const packets = JSON.parse(readFileSync(packetsPath, 'utf8')) as Array<{
    nativeQuestionId: string;
    packet: { stem: string; answerChoices: Array<{ key: string; text: string }>; correctAnswer: string | null; explanationText: string | null; topicHints: string[] };
  }>;
  const byQid = new Map(packets.map((row) => [row.nativeQuestionId, row]));

  const env = { ...loadEnv(path.resolve('.env.local')), ...process.env };
  if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
  const strong = env.BROBOT_STRONG_MODEL?.trim() || 'gpt-4o';
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  let failed = 0;
  for (const testCase of suite.cases) {
    const row = byQid.get(testCase.qid);
    if (!row) {
      console.log(JSON.stringify({ qid: testCase.qid, status: 'NO_PACKET', failures: ['packet fetch failed'] }));
      failed += 1;
      continue;
    }
    const result = await extractClaimsV5(row.packet, testCase.qid, {
      client: client as never,
      generatorModel: env.BROBOT_OB_CLAIMS_GENERATOR_MODEL?.trim() || strong,
      criticModel: env.BROBOT_OB_CLAIMS_CRITIC_MODEL?.trim() || strong,
      reviewModel: env.BROBOT_OB_CLAIMS_REVIEW_MODEL?.trim() || strong,
    });
    const failures = result.error ? [result.error] : checkCase(testCase, result.claims);
    if (failures.length) failed += 1;
    console.log(JSON.stringify({ qid: testCase.qid, status: failures.length ? 'FAIL' : 'PASS', claims: result.claims.length, failures }));
    writeFileSync(path.join(outDir, `extraction-${testCase.qid}.json`), `${JSON.stringify(result, null, 2)}\n`);
  }
  console.log(JSON.stringify({ cases: suite.cases.length, failed }));
  if (failed) process.exit(1);
}

main().catch((error) => {
  console.error(JSON.stringify({ fatal: error instanceof Error ? error.message : 'unknown' }));
  process.exit(1);
});
