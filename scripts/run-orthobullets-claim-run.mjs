import { execSync } from 'node:child_process';
import { readFileSync, appendFileSync, copyFileSync, rmSync } from 'node:fs';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { createRequire } from 'node:module';
import { parseHTML } from '/tmp/pilot-deps/node_modules/linkedom/esm/index.js';
import { extractOrthobulletsPageContext } from '../extensions/orthobullets-brobot/dist/content/extractor.js';

const require = createRequire(new URL('../package.json', import.meta.url));
const { Client } = require('pg');

const args = new Map(process.argv.slice(2).join(' ').split(/\s+--/).filter(Boolean).map((part) => {
  const [key, ...rest] = part.trim().split(/\s+/);
  return [key.replace(/^--/, ''), rest.join(' ')];
}));
const resultsUrl = args.get('results-url') ?? 'https://www.orthobullets.com/qbank/testscore?test=4P1MKEE&scope=learning&day=55';
const limit = Number(args.get('limit') ?? '25');
const testKey = args.get('test-key') ?? 'pilot:4P1MKEE:day55:reviewed';
const outcomeLog = '/tmp/ob-claim-run.jsonl';
const cookieCopy = '/tmp/ob-claim-cookies.sqlite';

function record(entry) {
  appendFileSync(outcomeLog, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
  console.log(JSON.stringify(entry));
}

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
  return db.prepare("select name, encrypted_value from cookies where host_key like '%orthobullets.com'").all().map((row) => {
    const value = Buffer.from(row.encrypted_value);
    const decipher = crypto.createDecipheriv('aes-128-cbc', key, Buffer.alloc(16, ' '));
    const out = Buffer.concat([decipher.update(value.subarray(3)), decipher.final()]);
    return `${row.name}=${out.subarray(32).toString('utf8')}`;
  }).join('; ');
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

function reviewDocument(html, url) {
  const { document } = parseHTML(html);
  for (const element of document.querySelectorAll('.collapse, .collapsed')) {
    const className = element.getAttribute('class') ?? '';
    element.setAttribute('class', className.replace(/\bcollapsed?\b/g, '').replace(/\s+/g, ' ').trim());
  }
  return document;
}

function exactReviewUrls(resultsHtml, base) {
  const found = new Map();
  const score = (url) => (url.searchParams.has('ans') ? 2 : 0) + (url.searchParams.has('test') ? 1 : 0);
  for (const match of resultsHtml.matchAll(/href=(["'])([^"']*\/testview[^"']*)\1/gi)) {
    let url;
    try {
      url = new URL(match[2], base);
    } catch {
      continue;
    }
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

const cookie = sessionCookie();
const html = await fetchHtml(resultsUrl, cookie);
if (!/\/qbank\/(testscore|loadresults)\b/.test(resultsUrl)) throw new Error('results_url_not_completed_review');
// Preserve the exact review URL from the results row (qid + ans + test).
// Never reconstruct it from a bare question id: partial URLs can land on an
// unrevealed or wrong-question page.
const roster = exactReviewUrls(html, resultsUrl).slice(0, limit);
if (!roster.length) throw new Error('no_completed_review_urls');

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
let databaseUrl = env.match(/^DATABASE_URL=(.*)$/m)[1].trim();
if ((databaseUrl.startsWith('"') && databaseUrl.endsWith('"')) || (databaseUrl.startsWith("'") && databaseUrl.endsWith("'"))) databaseUrl = databaseUrl.slice(1, -1);
const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
await client.connect();
const known = await client.query(`select native_question_id from orthobullets_claim_run_items where status in ('accepted', 'accepted_no_card', 'accepted_provisional_entity')`);
await client.end();
const done = new Set(known.rows.map((row) => row.native_question_id));
const pending = roster.filter(({ qid }) => !done.has(qid));
record({ event: 'roster', results: roster.length, alreadyDone: roster.filter(({ qid }) => done.has(qid)).length, pending: pending.length });
if (!pending.length) {
  rmSync(cookieCopy, { force: true });
  process.exit(0);
}

const token = deviceToken();
const runResponse = await fetch('http://localhost:3000/api/brobot/extension/question-claim-runs', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-snaportho-extension-token': token },
  body: JSON.stringify({
    testKey,
    questions: pending.map(({ qid, reviewUrl }) => ({ nativeQuestionId: qid, reviewLocator: reviewUrl })),
  }),
});
const runBody = await runResponse.json();
if (!runResponse.ok) {
  record({ event: 'run_create_failed', status: runResponse.status, error: runBody.error ?? 'unknown' });
  process.exit(1);
}
const items = new Map(runBody.items.map((item) => [item.native_question_id, item]));
record({ event: 'run_ready', runId: runBody.runId, items: runBody.items.length });

for (const { qid, reviewUrl } of pending) {
  const item = items.get(qid);
  if (!item || item.status === 'accepted' || item.status === 'accepted_no_card' || item.status === 'accepted_provisional_entity') {
    record({ qid, status: item?.status ?? 'missing_run_item' });
    continue;
  }
  try {
    const pageHtml = await fetchHtml(reviewUrl, cookie);
    const pageContext = extractOrthobulletsPageContext({ document: reviewDocument(pageHtml, reviewUrl), pageUrl: reviewUrl });
    const legacyReady = pageContext.pageKind === 'review' && pageContext.questionId === qid && pageContext.stem?.trim()
      && pageContext.correctAnswerKey && pageContext.explanationText?.trim() && pageContext.answerChoices.length >= 2;
    const ready = pageContext.reviewState ? pageContext.reviewState === 'ready' && pageContext.questionId === qid : legacyReady;
    if (!ready) {
      record({
        qid, status: pageContext.reviewDiagnostics?.errorCode ?? 'extraction_incomplete',
        pageKind: pageContext.pageKind ?? null, reviewState: pageContext.reviewState ?? null,
        missingFields: pageContext.reviewDiagnostics?.missingFields ?? [],
        extractedQuestionId: pageContext.questionId ?? null,
        warnings: pageContext.extractionWarnings ?? [],
      });
      continue;
    }
    let response;
    let body;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      response = await fetch('http://localhost:3000/api/brobot/extension/question-claims', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-snaportho-extension-token': token },
        body: JSON.stringify({ contractVersion: 'orthobullets-question-claim-v1', pageContext, runId: runBody.runId, runItemId: item.id }),
      });
      body = await response.json();
      if (body.status !== 'retryable') break;
      await new Promise((resolve) => setTimeout(resolve, 1_000 * (2 ** attempt)));
    }
    record({
      qid, http: response.status, status: body.status ?? body.error ?? 'unknown', reason: body.reason ?? null,
      claimId: body.claimId ?? null, cardCount: body.cardCount ?? null, gapRecorded: body.gapRecorded ?? false,
    });
  } catch (error) {
    record({ qid, status: 'request_failed', error: error instanceof Error ? error.message.slice(0, 160) : 'unknown' });
  }
}
rmSync(cookieCopy, { force: true });
record({ event: 'finished' });
