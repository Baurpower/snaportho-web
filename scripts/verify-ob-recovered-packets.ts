import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { sourceContentHashV5 } from '../src/lib/brobot/orthobullets/claim-extractor-v5';

const arg = (name: string) => process.argv.find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1);
const manifestPath = arg('--manifest'); const packetPath = arg('--packets'); const outPath = arg('--out');
if (!manifestPath || !packetPath || !outPath) throw new Error('usage: --manifest=file --packets=file --out=new-report.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { questions: Array<{ native_question_id: string; source_fingerprint_hash: string | null }> };
const packetText = readFileSync(packetPath, 'utf8');
const packets = JSON.parse(packetText) as Array<{ nativeQuestionId: string; packet: Parameters<typeof sourceContentHashV5>[0] }>;
const byQid = new Map(packets.map((row) => [row.nativeQuestionId, row]));
const expected = new Set(manifest.questions.map((row) => row.native_question_id));
const missing = [...expected].filter((qid) => !byQid.has(qid));
const extra = [...byQid.keys()].filter((qid) => !expected.has(qid));
const mismatches = manifest.questions.flatMap((row) => {
  if (!row.source_fingerprint_hash) return [];
  const packet = byQid.get(row.native_question_id); if (!packet) return [];
  const actual = sourceContentHashV5(packet.packet);
  return actual === row.source_fingerprint_hash ? [] : [{ qid: row.native_question_id, expected: row.source_fingerprint_hash, actual }];
});
const report = { generatedAt: new Date().toISOString(), packetSha256: createHash('sha256').update(packetText).digest('hex'),
  expected: expected.size, packets: packets.length, missing, extra, compared: manifest.questions.filter((row) => row.source_fingerprint_hash).length,
  mismatches, pass: missing.length === 0 && extra.length === 0 && mismatches.length === 0 };
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify(report));
if (!report.pass) process.exitCode = 2;
