// Split anatomy-structures.json into N shards for N classification agents.
// Each shard is self-contained (carries the vocabulary reference + its structures).
//
// Run from snaportho-web/:
//   node integrations/snaportho-anki/anatomy-hierarchy/split-shards.mjs [N=6]
//
// Writes shards/shard-01.todo.json ... shard-0N.todo.json
// Agents read a *.todo.json and write the sibling *.done.json (same structures,
// with region/tissue/canonical_structure/merge_into/confidence/evidence filled).

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const HERE = path.join(process.cwd(), "integrations/snaportho-anki/anatomy-hierarchy");
const N = Number(process.argv[2] ?? 6);

const data = JSON.parse(readFileSync(path.join(HERE, "anatomy-structures.json"), "utf8"));
const vocab = JSON.parse(readFileSync(path.join(HERE, "vocabulary.json"), "utf8"));

// Interleave by descending card count so every shard has a mix of high/low signal.
const sorted = [...data.structures];
const shards = Array.from({ length: N }, () => []);
sorted.forEach((s, i) => shards[i % N].push(s));

shards.forEach((structures, i) => {
  const id = String(i + 1).padStart(2, "0");
  const shard = {
    schemaVersion: vocab.schemaVersion,
    shard: `shard-${id}`,
    manifestId: data.manifestId,
    regions: vocab.regions.map((r) => r.token),
    tissues: vocab.tissues.map((t) => t.token),
    instructions: "For each structure set region + tissue (from the lists above) + canonical_structure (clean PascalCase_with_underscores; keep the given anki_slug unless it is a typo/abbreviation you are normalizing). Set merge_into to another structure's anki_slug only if this is a true duplicate. confidence: high|medium|low. evidence: one short phrase citing the sample_fronts or anatomy knowledge. Do NOT invent region/tissue tokens.",
    structures,
  };
  writeFileSync(path.join(HERE, "shards", `shard-${id}.todo.json`), JSON.stringify(shard, null, 2) + "\n");
});

console.error(`wrote ${N} shards (${sorted.length} structures) to shards/`);
