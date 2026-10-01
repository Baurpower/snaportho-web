// Deterministic stratified canary selection for the v5 claim-extraction pilot.
// Round-robin over specialties (alphabetical) with qids in numeric order.
// Pure function of the pool file: no DB state, no randomness, no cherry-picking.
// Small specialties exhaust early; the robin continues over the remainder.
//
// Usage:
//   node scripts/select-ob-canary-packets.mjs --pool=/tmp/obv5-pool.json \
//     --out=/tmp/ob-canary500-packets.json --n=500
import { readFileSync, writeFileSync } from 'node:fs';

const args = new Map();
for (const value of process.argv.slice(2)) {
  if (!value.startsWith('--')) continue;
  const at = value.indexOf('=');
  args.set(at < 0 ? value.slice(2) : value.slice(2, at), at < 0 ? 'true' : value.slice(at + 1));
}
const poolPath = args.get('pool');
const outPath = args.get('out');
const n = Number(args.get('n') ?? '0');
if (!poolPath || !outPath || !Number.isInteger(n) || n <= 0) throw new Error('missing/invalid --pool --out --n');

const pool = JSON.parse(readFileSync(poolPath, 'utf8'));
const bySpecialty = new Map();
for (const row of pool) {
  const specialty = row.specialty ?? 'unknown';
  if (!bySpecialty.has(specialty)) bySpecialty.set(specialty, []);
  bySpecialty.get(specialty).push(row);
}
const specialties = [...bySpecialty.keys()].sort();
for (const specialty of specialties) {
  bySpecialty.get(specialty).sort((a, b) => Number(a.nativeQuestionId) - Number(b.nativeQuestionId)
    || String(a.nativeQuestionId).localeCompare(String(b.nativeQuestionId)));
}
const selected = [];
const cursors = new Map(specialties.map((specialty) => [specialty, 0]));
while (selected.length < n) {
  let advanced = false;
  for (const specialty of specialties) {
    if (selected.length >= n) break;
    const rows = bySpecialty.get(specialty);
    const cursor = cursors.get(specialty);
    if (cursor >= rows.length) continue;
    selected.push(rows[cursor]);
    cursors.set(specialty, cursor + 1);
    advanced = true;
  }
  if (!advanced) break;
}
writeFileSync(outPath, `${JSON.stringify(selected)}\n`);
const counts = {};
for (const row of selected) counts[row.specialty] = (counts[row.specialty] ?? 0) + 1;
console.log(JSON.stringify({ pool: pool.length, selected: selected.length, specialties: specialties.length, counts }));
