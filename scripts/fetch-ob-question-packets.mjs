// Curator packet fetcher for the v5 claim-extraction pilot. LOCAL ONLY.
// DEVELOPMENT FALLBACK ONLY: the primary workflow is browser-driven — the
// extension opens exact results-page review URLs in inactive tabs (using the
// existing login), polls for review readiness, and sends a transient packet
// to the claim pipeline without ever writing source text to disk. Use this
// script only when that path is unavailable, and treat its output file as
// licensed source text: keep it local, never commit it.
//
// Enumerates exact review URLs from an Orthobullets results page the curator
// could open in a browser, fetches completed-review pages with the curator's
// own Chrome session, and saves source packets for offline extraction runs.
//
// Not a scraper: polite delays, small bounded cohorts, resumable output,
// no writes anywhere except the local out file. Never posts to the API,
// never touches Supabase.
//
// Usage:
//   node scripts/fetch-ob-question-packets.mjs --results-url=<testscore-url> \
//     --out=packets.json [--delay-ms=2000]
//   node scripts/fetch-ob-question-packets.mjs --topics-file=topics.txt \
//     --per-topic=5 --out=packets.json [--delay-ms=2000]
//
// topics file lines: <specialty>|<topic-url>
// or direct: --qids=1150,3167 [--specialty=regression]
// (direct qids rebuild a minimal review URL and are a dev fallback: prefer
// --results-url so every question uses its exact results-page review URL.)
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, copyFileSync, rmSync } from 'node:fs';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { parseHTML } from 'linkedom';
import { extractOrthobulletsPageContext } from '../extensions/orthobullets-brobot/dist/content/extractor.js';

const args = new Map();
for (const value of process.argv.slice(2)) {
  if (!value.startsWith('--')) continue;
  const at = value.indexOf('=');
  args.set(at < 0 ? value.slice(2) : value.slice(2, at), at < 0 ? 'true' : value.slice(at + 1));
}
const topicsFile = args.get('topics-file');
const resultsUrl = args.get('results-url');
const qidsFile = args.get('qids-file');
const qidSpecialties = new Map();
let fileQids = [];
if (qidsFile) {
  const text = readFileSync(qidsFile, 'utf8');
  try {
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed) ? parsed : parsed.questions;
    if (!Array.isArray(rows)) throw new Error('JSON qids file must be an array or recovery manifest');
    fileQids = rows.map((row) => typeof row === 'string' ? row : String(row.native_question_id ?? row.nativeQuestionId ?? '')).filter(Boolean);
    for (const row of rows) if (row && typeof row === 'object') {
      const qid = String(row.native_question_id ?? row.nativeQuestionId ?? '');
      if (qid) qidSpecialties.set(qid, row.specialty ?? null);
    }
  } catch (error) {
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) throw error;
    fileQids = text.split(/\r?\n/).map((qid) => qid.trim()).filter(Boolean);
  }
}
const directQids = [...new Set([...(args.get('qids') ?? '').split(',').map((qid) => qid.trim()).filter(Boolean), ...fileQids])];
const directSpecialty = args.get('specialty') ?? 'regression';
const perTopic = Number(args.get('per-topic') ?? '5');
const outPath = args.get('out') ?? '/tmp/obv5-packets.json';
const delayMs = Number(args.get('delay-ms') ?? '2000');
const topicDelayMs = Number(args.get('topic-delay-ms') ?? '3000');
if (!topicsFile && !directQids.length && !resultsUrl) throw new Error('missing --results-url, --topics-file, --qids, or --qids-file');

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
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const cookieCopy = '/tmp/obv5-fetch-cookies.sqlite';

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

function reviewDocument(html) {
  const { document } = parseHTML(html);
  for (const element of document.querySelectorAll('.collapse, .collapsed')) {
    element.setAttribute('class', (element.getAttribute('class') ?? '').replace(/\bcollapsed?\b/g, '').replace(/\s+/g, ' ').trim());
  }
  return document;
}

const topics = topicsFile
  ? readFileSync(topicsFile, 'utf8').split(/\r?\n/).map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const at = line.indexOf('|');
      if (at < 0) throw new Error(`bad topics line: ${line}`);
      return { specialty: line.slice(0, at).trim(), url: line.slice(at + 1).trim() };
    })
  : [];

let packets = [];
if (existsSync(outPath)) {
  try { packets = JSON.parse(readFileSync(outPath, 'utf8')); } catch { packets = []; }
}
const have = new Set(packets.map((row) => row.nativeQuestionId));
const save = () => writeFileSync(outPath, `${JSON.stringify(packets, null, 2)}\n`);

const cookie = sessionCookie();
const counts = {};

async function capture(qid, specialty, topicUrl, reviewUrlInput) {
  if (have.has(qid)) return 'duplicate';
  await sleep(delayMs);
  let reviewUrl = reviewUrlInput ?? null;
  let reconstructed = false;
  if (!reviewUrl) {
    // Dev fallback: a bare qid cannot reproduce the results-row URL
    // (qid + ans + test). Prefer --results-url.
    reviewUrl = `https://www.orthobullets.com/testview?qid=${qid}`;
    reconstructed = true;
  }
  try {
    const pageHtml = await fetchHtml(reviewUrl, cookie);
    const ctx = extractOrthobulletsPageContext({ document: reviewDocument(pageHtml), pageUrl: reviewUrl });
    const legacyReady = ['review', 'testview'].includes(ctx.pageKind) && ctx.questionId === qid && ctx.stem?.trim()
      && ctx.correctAnswerKey && ctx.explanationText?.trim() && (ctx.answerChoices?.length ?? 0) >= 2;
    const ready = ctx.reviewState ? ctx.reviewState === 'ready' && ctx.questionId === qid : legacyReady;
    if (!ready) {
      console.log(JSON.stringify({
        qid, status: ctx.reviewDiagnostics?.errorCode ?? 'extraction_incomplete',
        pageKind: ctx.pageKind ?? null, reviewState: ctx.reviewState ?? null,
        missingFields: ctx.reviewDiagnostics?.missingFields ?? [],
        reconstructedUrl: reconstructed,
      }));
      return 'incomplete';
    }
    if (reconstructed) {
      console.log(JSON.stringify({ qid, status: 'reconstructed_url_dev_fallback', reviewUrl }));
    }
    const choices = ctx.answerChoices.map((choice) => ({ key: String(choice.key ?? choice.label ?? ''), text: String(choice.text ?? '') }));
    const correct = choices.find((choice) => choice.key === ctx.correctAnswerKey);
    const pctRow = (ctx.percentDistribution ?? []).find((row) => row.answerKey === ctx.correctAnswerKey || row.label === ctx.correctAnswerKey);
    packets.push({
      nativeQuestionId: qid,
      specialty,
      topicUrl,
      reviewUrl,
      reconstructedUrl: reconstructed,
      topic: (ctx.breadcrumbs ?? []).at(-1) ?? null,
      percentCorrect: typeof pctRow?.percent === 'number' ? pctRow.percent : null,
      packet: {
        stem: ctx.stem.trim(),
        answerChoices: choices,
        correctAnswer: (ctx.correctAnswer ?? correct?.text ?? null),
        explanationText: ctx.explanationText.trim(),
        topicHints: [...(ctx.breadcrumbs ?? []), ctx.title ?? ''].map((hint) => String(hint).trim()).filter(Boolean),
      },
    });
    have.add(qid);
    counts[specialty] = (counts[specialty] ?? 0) + 1;
    save();
    console.log(JSON.stringify({ qid, status: 'captured', specialty, stemLen: ctx.stem.length, explLen: ctx.explanationText.length }));
    return 'captured';
  } catch (error) {
    console.log(JSON.stringify({ qid, status: 'fetch_failed', error: String(error.message).slice(0, 80) }));
    return 'failed';
  }
}

for (const topic of topics) {
  await sleep(topicDelayMs);
  let qids = [];
  try {
    const html = await fetchHtml(topic.url, cookie);
    qids = [...new Set([...html.matchAll(/[?&]qid=(\d{4,8})/g)].map((match) => match[1]))];
  } catch (error) {
    console.log(JSON.stringify({ topic: topic.url, error: String(error.message).slice(0, 80) }));
    continue;
  }
  console.log(JSON.stringify({ topic: topic.url, qids: qids.length }));
  let taken = 0;
  for (const qid of qids) {
    if (taken >= perTopic) break;
    if ((await capture(qid, topic.specialty, topic.url)) === 'captured') taken += 1;
  }
}
if (resultsUrl) {
  await sleep(topicDelayMs);
  try {
    const html = await fetchHtml(resultsUrl, cookie);
    const rows = exactReviewUrls(html, resultsUrl);
    console.log(JSON.stringify({ resultsUrl, rows: rows.length }));
    for (const row of rows) {
      await capture(row.qid, qidSpecialties.get(row.qid) ?? directSpecialty, resultsUrl, row.reviewUrl);
    }
  } catch (error) {
    console.log(JSON.stringify({ resultsUrl, error: String(error.message).slice(0, 80) }));
  }
}
for (const qid of directQids) {
  await capture(qid, qidSpecialties.get(qid) ?? directSpecialty, null);
}
rmSync(cookieCopy, { force: true });
console.log(JSON.stringify({ event: 'finished', total: packets.length, counts }));
