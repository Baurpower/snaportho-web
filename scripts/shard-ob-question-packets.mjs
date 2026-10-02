// Deterministically partition a complete packet inventory into immutable shards.
// Sort order is numeric qid first, then lexical qid; output is canonical compact JSON.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = new Map();
for (const value of process.argv.slice(2)) {
  if (!value.startsWith('--')) continue;
  const at = value.indexOf('=');
  args.set(at < 0 ? value.slice(2) : value.slice(2, at), at < 0 ? 'true' : value.slice(at + 1));
}
const inputPath = args.get('input');
const outDir = args.get('out');
const shardSize = Number(args.get('shard-size') ?? '0');
if (!inputPath || !outDir || !Number.isInteger(shardSize) || shardSize < 1) {
  throw new Error('usage: --input=packets.json --out=directory --shard-size=1000');
}
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const inputText = readFileSync(inputPath, 'utf8');
const rows = JSON.parse(inputText);
if (!Array.isArray(rows)) throw new Error('packet file must be a JSON array');
const qidOf = (row) => String(row?.nativeQuestionId ?? '');
const seen = new Set();
for (const [index, row] of rows.entries()) {
  const qid = qidOf(row);
  if (!qid) throw new Error(`missing nativeQuestionId at index ${index}`);
  if (seen.has(qid)) throw new Error(`duplicate nativeQuestionId: ${qid}`);
  seen.add(qid);
}
rows.sort((a, b) => Number(qidOf(a)) - Number(qidOf(b)) || qidOf(a).localeCompare(qidOf(b)));
mkdirSync(outDir, { recursive: true });
const width = String(Math.ceil(rows.length / shardSize)).length;
const shards = [];
for (let offset = 0, ordinal = 1; offset < rows.length; offset += shardSize, ordinal += 1) {
  const shardRows = rows.slice(offset, offset + shardSize);
  const filename = `shard-${String(ordinal).padStart(width, '0')}.json`;
  const body = `${JSON.stringify(shardRows)}\n`;
  writeFileSync(path.join(outDir, filename), body, { flag: 'wx' });
  shards.push({ filename, sha256: sha256(body), count: shardRows.length,
    firstQid: qidOf(shardRows[0]), lastQid: qidOf(shardRows.at(-1)) });
}
const manifest = {
  schemaVersion: 1,
  source: { path: path.resolve(inputPath), sha256: sha256(inputText), count: rows.length },
  ordering: 'numeric-qid-then-lexical-qid', shardSize, shards,
};
writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ event: 'sharded', outDir: path.resolve(outDir), ...manifest }));
