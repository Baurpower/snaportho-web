// Bulk v5 transient claim driver. LOCAL ONLY.
//
// Enumerates review URLs from Orthobullets question sources, readiness-gates
// every question (ready / unrevealed / login / mismatch), and POSTs ready
// pages to the v5 transient claim route. Resumable via a metadata-only
// checkpoint (qid, review URL, source hash, status, claim counts). Source
// prose (stem, choices, answers, explanations, HTML) is never written to the
// checkpoint, logs, or reports.
//
// Two roster modes (exactly one required):
//   results pages: --results-urls / --results-urls-file — exact review URLs
//     (qid+ans+test) from completed tests; includes your selected answer.
//   question search: --search-list-url + --search-pages=1-6 — QIDs from the
//     Search Questions list; bare testview?qid= URLs reveal stem, choices,
//     correct answer, and explanation, but never your selection (the ready
//     gate is selection-optional for this reason).
//
// Excludes questions with any live v5 extraction attempt, so previously
// extracted work (including unfinished items under manual review) is left
// untouched. Run creation is chunked (<=100 questions per run).
//
// Usage:
//   node scripts/run-ob-transient-bulk.mjs --results-urls=<u1,u2> --apply
//   node scripts/run-ob-transient-bulk.mjs --search-list-url=<search> --search-pages=1-6 --dry-run
//   node scripts/run-ob-transient-bulk.mjs --search-list-url=<search> --search-pages=1-6 --apply \
//     --max-questions=500 --max-errors=25 --delay-ms=2000 \
//     --checkpoint=tmp/ob-transient-bulk.jsonl --test-key-prefix=live:v5:bulk1
//
// Requires the dev server (or deployed app) at --app-origin (default
// http://localhost:3000) and a linked extension (device token + Chrome
// cookies, same as the other local runners).
import { execSync } from 'node:child_process';
import { readFileSync, appendFileSync, copyFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { createRequire } from 'node:module';
import { parseHTML } from 'linkedom';
import { extractOrthobulletsPageContext } from '../extensions/orthobullets-brobot/dist/content/extractor.js';

const require = createRequire(new URL('../package.json', import.meta.url));
const { Client } = require('pg');

const args = new Map();
for (const value of process.argv.slice(2)) {
  if (!value.startsWith('--')) continue;
  const at = value.indexOf('=');
  args.set(at < 0 ? value.slice(2) : value.slice(2, at), at < 0 ? 'true' : value.slice(at + 1));
}
const appOrigin = (args.get('app-origin') ?? 'http://localhost:3000').replace(/\/+$/, '');
const apply = args.get('apply') === 'true';
const dryRun = args.get('dry-run') === 'true';
if (apply && dryRun) throw new Error('choose exactly one of --apply or --dry-run');
if (!apply && !dryRun) throw new Error('refusing bulk run without --apply (or pass --dry-run)');
const maxQuestions = Number(args.get('max-questions') ?? '500');
const maxErrors = Number(args.get('max-errors') ?? '25');
const maxConsecutiveErrors = Number(args.get('max-consecutive-errors') ?? '10');
const delayMs = Number(args.get('delay-ms') ?? '2000');
const checkpointPath = args.get('checkpoint') ?? 'tmp/ob-transient-bulk.jsonl';
const testKeyPrefix = args.get('test-key-prefix') ?? 'live:v5:bulk1';
const resultsUrls = [
  ...(args.get('results-urls') ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  ...(args.get('results-urls-file') ? readFileSync(args.get('results-urls-file'), 'utf8').split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#')) : []),
];
const searchListUrl = args.get('search-list-url') ?? null;
const searchPages = [];
for (const part of (args.get('search-pages') ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
  const range = part.match(/^(\d+)-(\d+)$/);
  if (range) {
    for (let p = Number(range[1]); p <= Number(range[2]); p += 1) searchPages.push(p);
  } else if (/^\d+$/.test(part)) {
    searchPages.push(Number(part));
  } else {
    throw new Error(`bad --search-pages part: ${part}`);
  }
}
if ((resultsUrls.length > 0) === (searchListUrl != null)) throw new Error('pass exactly one roster mode: --results-urls(-file) or --search-list-url + --search-pages');
if (resultsUrls.length && !resultsUrls.every((url) => /\/qbank\/(testscore|loadresults)\b/.test(url))) throw new Error('all results urls must be completed-review testscore pages');
if (searchListUrl && !searchPages.length) throw new Error('missing --search-pages (e.g. 1-6)');
if (searchListUrl && !/\/Site\/ElasticSearch\/StandardSearch(List|Tiles)\b/.test(searchListUrl)) throw new Error('search list url must be a StandardSearch page');

const cookieCopy = '/tmp/ob-transient-bulk-cookies.sqlite';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const record = (entry) => {
  appendFileSync(checkpointPath, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
  console.log(JSON.stringify(entry));
};
const say = (entry) => console.log(JSON.stringify(entry));

function deviceToken() {
  const data = readFileSync(`${process.env.HOME}/Library/Application Support/Google/Chrome/Default/Local Extension Settings/aggdlbbnecnobamooijhnhphkpkfchip/000003.log`);
  const marker = 'snaportho_extension_device_token';
  const start = data.indexOf(marker);
  if (start < 0) throw new Error('device token missing');
  const lengthAt = start + marker.length;
  const blob = data.subarray(lengthAt + 1, lengthAt + 1 + data[lengthAt]);
  const value = blob.subarray(1, -1).toString('utf8');
  if (!/^[\x21-\x7e]{32,200}$/.test(value)) throw new Error('device token unreadable');
  return value;
}

function sessionCookie() {
  const password = execSync('security find-generic-password -w -s "Chrome Safe Storage" -a "Chrome"', { encoding: 'utf8' }).trim();
  const key = crypto.pbkdf2Sync(password, 'saltysalt', 1003, 16, 'sha1');
  copyFileSync(`${process.env.HOME}/Library/Application Support/Google/Chrome/Default/Cookies`, cookieCopy);
  const db = new DatabaseSync(cookieCopy, { readOnly: true });
  const header = db.prepare("select name, encrypted_value from cookies where host_key like '%orthobullets.com'").all().map((row) => {
    const value = Buffer.from(row.encrypted_value);
    const decipher = crypto.createDecipheriv('aes-128-cbc', key, Buffer.alloc(16, ' '));
    const out = Buffer.concat([decipher.update(value.subarray(3)), decipher.final()]);
    return `${row.name}=${out.subarray(32).toString('utf8')}`;
  }).join('; ');
  db.close();
  return header;
}

async function fetchHtml(url, cookie) {
  const response = await fetch(url, {
    headers: {
      cookie,
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',
      accept: 'text/html',
    },
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`page_http_${response.status}`);
  return response.text();
}

function exactReviewUrls(resultsHtml, base) {
  const found = new Map();
  const score = (url) => (url.searchParams.has('ans') ? 2 : 0) + (url.searchParams.has('test') ? 1 : 0);
  for (const match of resultsHtml.matchAll(/href=(["'])([^"']*\/testview[^"']*)\1/gi)) {
    let url;
    try { url = new URL(match[2], base); } catch { continue; }
    if (url.hostname !== 'www.orthobullets.com' && url.hostname !== 'orthobullets.com') continue;
    if (url.protocol !== 'https:') continue;
    const qid = url.searchParams.get('qid');
    if (!/^\d{4,8}$/.test(qid ?? '')) continue;
    url.hash = '';
    const current = found.get(qid);
    if (!current || score(url) > score(new URL(current))) found.set(qid, url.toString());
  }
  return [...found.entries()].map(([qid, reviewUrl]) => ({ qid, reviewUrl }));
}

function loadEnv() {
  const values = {};
  const file = new URL('../.env.local', import.meta.url);
  if (!existsSync(file)) return { ...process.env };
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean || clean.startsWith('#') || !clean.includes('=')) continue;
    const at = clean.indexOf('=');
    values[clean.slice(0, at).trim()] = clean.slice(at + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return { ...values, ...process.env };
}

mkdirSync(path.dirname(checkpointPath), { recursive: true });
const checkpointed = new Set();
if (existsSync(checkpointPath)) {
  for (const line of readFileSync(checkpointPath, 'utf8').split('\n').filter(Boolean)) {
    try {
      const row = JSON.parse(line);
      if (row.qid && row.terminal) checkpointed.add(row.qid);
    } catch { /* ignore partial trailing line */ }
  }
}

const cookie = sessionCookie();
const token = apply ? deviceToken() : null;

// 1. Enumerate the roster: exact results-page review URLs, or QIDs from
// Search Questions list pages (bare testview?qid= URLs).
const roster = new Map();
for (const resultsUrl of resultsUrls) {
  await sleep(delayMs);
  const html = await fetchHtml(resultsUrl, cookie);
  for (const row of exactReviewUrls(html, resultsUrl)) {
    if (!roster.has(row.qid)) roster.set(row.qid, { ...row, resultsUrl });
  }
  say({ event: 'results_page', url: resultsUrl, rows: roster.size });
}
for (const page of searchPages) {
  await sleep(delayMs);
  const separator = searchListUrl.includes('?') ? '&' : '?';
  const pageUrl = `${searchListUrl}${separator}p=${page}`;
  const html = await fetchHtml(pageUrl, cookie);
  let added = 0;
  for (const qid of new Set([...html.matchAll(/\/testview\?qid=(\d{4,8})/g)].map((match) => match[1]))) {
    if (!roster.has(qid)) {
      roster.set(qid, { qid, reviewUrl: `https://www.orthobullets.com/testview?qid=${qid}`, resultsUrl: pageUrl });
      added += 1;
    }
  }
  say({ event: 'search_page', page, added, rows: roster.size });
  if (!added) break;
}
say({ event: 'roster', total: roster.size, checkpointed: checkpointed.size, mode: resultsUrls.length ? 'results' : 'search' });

// 2. Exclude previously extracted questions (any live v5 attempt, any state)
// so unfinished items under manual review are never reprocessed.
const env = loadEnv();
if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
const pg = new Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await pg.connect();
const extracted = new Set((await pg.query(
  `select distinct native_question_id from public.ob_claim_extraction_events
    where provider = 'orthobullets' and superseded_by_attempt_id is null`,
)).rows.map((row) => row.native_question_id));
await pg.end();
const fresh = [...roster.values()].filter(({ qid }) => !extracted.has(qid) && !checkpointed.has(qid)).slice(0, maxQuestions);
say({
  event: 'filtered', roster: roster.size,
  excludedExtracted: [...roster.keys()].filter((qid) => extracted.has(qid)).length,
  excludedCheckpointed: [...roster.keys()].filter((qid) => checkpointed.has(qid)).length,
  selected: fresh.length,
});
if (!fresh.length) {
  rmSync(cookieCopy, { force: true });
  process.exit(0);
}
if (dryRun) {
  // Readiness gate each selected question without POSTing anything.
  const states = {};
  for (const { qid, reviewUrl } of fresh) {
    await sleep(delayMs);
    try {
      const pageHtml = await fetchHtml(reviewUrl, cookie);
      const { document } = parseHTML(pageHtml);
      for (const element of document.querySelectorAll('.collapse, .collapsed')) {
        const className = element.getAttribute('class') ?? '';
        element.setAttribute('class', className.replace(/\bcollapsed?\b/g, '').replace(/\s+/g, ' ').trim());
      }
      const pageContext = extractOrthobulletsPageContext({ document, pageUrl: reviewUrl });
      const state = pageContext.questionId === qid ? (pageContext.reviewState ?? 'unknown') : 'question_mismatch';
      states[state] = (states[state] ?? 0) + 1;
      say({ qid, dry: state, errorCode: pageContext.reviewDiagnostics?.errorCode ?? null, stemLen: (pageContext.stem ?? '').length, choices: pageContext.answerChoices.length, explLen: (pageContext.explanationText ?? '').length });
    } catch (error) {
      states.fetch_failed = (states.fetch_failed ?? 0) + 1;
      say({ qid, dry: 'fetch_failed', error: String(error.message).slice(0, 80) });
    }
  }
  say({ event: 'dry_run_complete', states });
  rmSync(cookieCopy, { force: true });
  process.exit(0);
}

// 3. Create tracked runs (<=100 questions each) labeled with the v5 algorithm.
const OB_PROD_ALGORITHM = 'orthobullets-claims-prod.v1';
const runItemByQid = new Map();
for (let chunk = 0; chunk * 100 < fresh.length; chunk += 1) {
  const batch = fresh.slice(chunk * 100, chunk * 100 + 100);
  const response = await fetch(`${appOrigin}/api/brobot/extension/question-claim-runs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-snaportho-extension-token': token },
    body: JSON.stringify({
      testKey: `${testKeyPrefix}:chunk${chunk + 1}`,
      algorithmVersion: OB_PROD_ALGORITHM,
      questions: batch.map(({ qid, reviewUrl }) => ({ nativeQuestionId: qid, reviewLocator: reviewUrl })),
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    say({ event: 'run_create_failed', chunk: chunk + 1, status: response.status, error: body.error ?? 'unknown' });
    rmSync(cookieCopy, { force: true });
    process.exit(1);
  }
  for (const item of body.items ?? []) runItemByQid.set(item.native_question_id, { runId: body.runId, itemId: item.id });
  say({ event: 'run_ready', chunk: chunk + 1, runId: body.runId, items: (body.items ?? []).length });
}

// 4. Process sequentially with retries; checkpoint every terminal outcome.
let errors = 0;
let consecutiveErrors = 0;
const outcomes = {};
for (const { qid, reviewUrl } of fresh) {
  await sleep(delayMs);
  const outcome = { qid, terminal: true };
  try {
    const pageHtml = await fetchHtml(reviewUrl, cookie);
    const { document } = parseHTML(pageHtml);
    for (const element of document.querySelectorAll('.collapse, .collapsed')) {
      const className = element.getAttribute('class') ?? '';
      element.setAttribute('class', className.replace(/\bcollapsed?\b/g, '').replace(/\s+/g, ' ').trim());
    }
    const pageContext = extractOrthobulletsPageContext({ document, pageUrl: reviewUrl });
    if (pageContext.reviewState !== 'ready' || pageContext.questionId !== qid) {
      record({ ...outcome, status: pageContext.reviewDiagnostics?.errorCode ?? 'extraction_incomplete', reviewState: pageContext.reviewState ?? null });
      outcomes.skipped_not_ready = (outcomes.skipped_not_ready ?? 0) + 1;
      continue;
    }
    const run = runItemByQid.get(qid);
    const isModelTransient = (payload) => payload.status === 'ai_review_unresolved'
      && Array.isArray(payload.diagnostics)
      && payload.diagnostics.some((code) => code === 'model_429' || code === 'model_timeout');
    let body = {};
    let status = 0;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${appOrigin}/api/brobot/extension/question-claims-v5`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-snaportho-extension-token': token },
        body: JSON.stringify({ contractVersion: 'orthobullets-question-claim-v5', pageContext, runId: run?.runId, runItemId: run?.itemId }),
      });
      status = response.status;
      body = await response.json().catch(() => ({}));
      if (body.status !== 'retryable' && status < 500 && !isModelTransient(body)) break;
      await sleep(isModelTransient(body) ? 60000 : 5000 * (2 ** attempt));
    }
    record({
      ...outcome, status: body.status ?? body.error ?? 'unknown', http: status,
      claimCount: body.claimCount ?? 0, diagnostics: body.diagnostics ?? [],
      claimTextLens: Array.isArray(body.claims) ? body.claims.map((c) => String(c.text ?? '').length) : [],
      runItemId: body.runItemId ?? run?.itemId ?? null, sourceHash: body.sourceHash ?? null,
    });
    outcomes[body.status ?? 'unknown'] = (outcomes[body.status ?? 'unknown'] ?? 0) + 1;
    if (status >= 500 || body.status === 'retryable' || body.error || isModelTransient(body)) {
      errors += 1;
      consecutiveErrors += 1;
    } else {
      consecutiveErrors = 0;
    }
  } catch (error) {
    record({ ...outcome, status: 'request_failed', error: error instanceof Error ? error.message.slice(0, 120) : 'unknown' });
    outcomes.request_failed = (outcomes.request_failed ?? 0) + 1;
    errors += 1;
    consecutiveErrors += 1;
  }
  if (errors >= maxErrors || consecutiveErrors >= maxConsecutiveErrors) {
    say({ event: 'aborted', errors, consecutiveErrors, outcomes });
    break;
  }
}

// 5. Progress invariance: results rows identical after the run (results
// mode only; search enumeration has no per-user progress to disturb).
if (resultsUrls.length) {
  const recheck = new Map();
  for (const resultsUrl of resultsUrls) {
    const html = await fetchHtml(resultsUrl, cookie);
    for (const row of exactReviewUrls(html, resultsUrl)) recheck.set(row.qid, row.reviewUrl);
  }
  const before = [...roster.entries()].map(([qid, row]) => [qid, row.reviewUrl]);
  say({
    event: 'finished', outcomes,
    rowsBefore: roster.size, rowsAfter: recheck.size,
    urlsSame: JSON.stringify(before) === JSON.stringify([...recheck.entries()]),
  });
} else {
  say({ event: 'finished', outcomes, roster: roster.size, progressCheck: 'not_applicable_search_mode' });
}
rmSync(cookieCopy, { force: true });
