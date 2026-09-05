/**
 * Validate an authored codex-refill batch ({noteGuid:{link,bullets[]}}) against
 * the live card text in tmp/codex-refill/worklist.json, using the same
 * validateBullets guard the publish pipeline uses (now including the
 * bullet_restates_question check). Read-only; prints per-card errors.
 *
 *   npx tsx scripts/validate-codex-refill-batch.ts tmp/codex-refill/authored-batch-001.json
 */
import { readFileSync } from "node:fs";
// @ts-expect-error Direct Node strip-types runner imports TypeScript source.
import { validateBullets, canonicalOrthobulletsTopicUrl } from "../src/lib/education/orthobullets-enrichment-packet.ts";

const batchPath = process.argv[2] ?? "tmp/codex-refill/authored-batch-001.json";
const worklistPath = process.argv[3] ?? "tmp/codex-refill/worklist.json";

const batch = JSON.parse(readFileSync(batchPath, "utf8")) as Record<string, { link: string; bullets: string[] }>;
const worklist = JSON.parse(readFileSync(worklistPath, "utf8")) as { cards: Array<{ noteGuid: string; front: string; extra: string }> };
const byGuid = new Map(worklist.cards.map((c) => [c.noteGuid, c]));

let clean = 0;
let bad = 0;
for (const [guid, fill] of Object.entries(batch)) {
  const card = byGuid.get(guid);
  const errors: string[] = [];
  if (!card) errors.push("guid_not_in_worklist");
  const url = canonicalOrthobulletsTopicUrl(fill.link ?? "");
  if (!url.ok) errors.push(`link_${url.error}`);
  if (card) errors.push(...validateBullets(fill.bullets ?? [], { front: card.front, extra: card.extra }));
  if (errors.length) {
    bad += 1;
    console.log(`FAIL ${guid}  ${errors.join(", ")}`);
    console.log(`     front: ${(card?.front ?? "").slice(0, 100)}`);
  } else {
    clean += 1;
  }
}
console.log(`\n${clean} clean / ${bad} failing / ${Object.keys(batch).length} total`);
process.exit(bad ? 1 : 0);
