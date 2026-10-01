// Topic-graph crawl for the v5 claim-extraction pilot. LOCAL ONLY.
// Breadth-first crawl of Orthobullets topic pages starting from seed
// topics, collecting additional topic URLs for packet acquisition.
// Polite delays, bounded output, deterministic ordering, resumable.
//
// Usage:
//   node scripts/enumerate-ob-topics.mjs --seeds=/tmp/obv5-topics.txt \
//     --out=/tmp/obv5-topics-expanded.txt [--max-topics=300] [--delay-ms=1500]
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, copyFileSync, rmSync } from 'node:fs';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const args = new Map();
for (const value of process.argv.slice(2)) {
  if (!value.startsWith('--')) continue;
  const at = value.indexOf('=');
  args.set(at < 0 ? value.slice(2) : value.slice(2, at), at < 0 ? 'true' : value.slice(at + 1));
}
const seedsFile = args.get('seeds');
const outPath = args.get('out') ?? '/tmp/obv5-topics-expanded.txt';
const maxTopics = Number(args.get('max-topics') ?? '300');
const delayMs = Number(args.get('delay-ms') ?? '1500');
if (!seedsFile) throw new Error('missing --seeds');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const cookieCopy = '/tmp/obv5-topics-cookies.sqlite';

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

// specialty slug -> display specialty (matches fetcher topics-file format)
const SPECIALTIES = new Map([
  ['trauma', 'trauma'],
  ['spine', 'spine'],
  ['hand', 'hand'],
  ['shoulder-and-elbow', 'shoulder & elbow'],
  ['knee-and-sports', 'sports'],
  ['recon', 'adult reconstruction'],
  ['foot-and-ankle', 'foot & ankle'],
  ['pediatrics', 'pediatrics'],
  ['pathology', 'oncology'],
  ['basic-science', 'basic science'],
]);

// seed specialty|url lines
const seen = new Map(); // url -> specialty
if (existsSync(outPath)) {
  for (const line of readFileSync(outPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const at = trimmed.indexOf('|');
    if (at > 0) seen.set(trimmed.slice(at + 1).trim(), trimmed.slice(0, at).trim());
  }
}
const queue = [];
for (const line of readFileSync(seedsFile, 'utf8').split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const at = trimmed.indexOf('|');
  if (at < 0) throw new Error(`bad seeds line: ${line}`);
  const specialty = trimmed.slice(0, at).trim();
  const url = trimmed.slice(at + 1).trim();
  if (!seen.has(url)) seen.set(url, specialty);
  queue.push(url);
}
const save = () => writeFileSync(outPath, `${[...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0])).map(([url, specialty]) => `${specialty}|${url}`).join('\n')}\n`);

const cookie = sessionCookie();
const visited = new Set();
while (queue.length && seen.size < maxTopics) {
  const url = queue.shift();
  if (visited.has(url)) continue;
  visited.add(url);
  await sleep(delayMs);
  let html = '';
  try {
    html = await fetchHtml(url, cookie);
  } catch (error) {
    console.log(JSON.stringify({ topic: url, error: String(error.message).slice(0, 60) }));
    continue;
  }
  const links = [...new Set([...html.matchAll(/href="((?:https?:\/\/www\.orthobullets\.com)?(\/[a-z-]+\/\d{3,5}\/[a-z0-9-]+))"/g)]
    .map((m) => ({ full: m[1].startsWith('http') ? m[1] : `https://www.orthobullets.com${m[1]}`, slug: m[2].split('/')[1] })))];
  let added = 0;
  for (const link of links) {
    if (seen.has(link.full) || seen.size >= maxTopics) continue;
    seen.set(link.full, SPECIALTIES.get(link.slug) ?? link.slug);
    queue.push(link.full);
    added += 1;
  }
  console.log(JSON.stringify({ topic: url.slice(32, 70), links: links.length, added, total: seen.size }));
  save();
}
rmSync(cookieCopy, { force: true });
console.log(JSON.stringify({ event: 'finished', topics: seen.size, visited: visited.size }));
