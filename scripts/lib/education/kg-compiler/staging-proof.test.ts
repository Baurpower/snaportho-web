import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { dryRunApplyProposals } from "../kg-factory/dry-run-apply.ts";
import { buildAnkleProposalPacket } from "../kg-factory/proposal-builder.ts";
import { curateProposalBatch } from "../kg-factory/intelligent-curator.ts";
import { compileNeighborhood } from "./compiler.ts";

const migrationSql = readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260705_120000_ankle_pilot_kg_vocabulary.sql"),
  "utf8"
);

assert.ok(migrationSql.includes("educational_claims"), "migration creates educational_claims");
assert.ok(migrationSql.includes("decision_points"), "migration creates decision_points");
assert.ok(migrationSql.includes("classification_grade"), "migration extends entity types");
assert.ok(migrationSql.includes("injured_in"), "migration extends predicates");
assert.ok(migrationSql.includes("propose_educational_claim"), "migration extends proposal types");
assert.ok(migrationSql.includes("commit;"), "migration is transactional");

const packet = buildAnkleProposalPacket();
const { curated } = curateProposalBatch(packet.proposals);
const dryRun = dryRunApplyProposals(curated);

const approved = curated.filter((p) => p.review_status === "approved");
const mutations = dryRun.filter((m) => !m.kind.includes("rejected"));

assert.ok(approved.length >= 40, "expected substantial auto-approved set");
assert.ok(mutations.length > 0, "dry-run should emit mutations");

for (const m of dryRun.filter((x) => x.kind === "claim_create_draft")) {
  assert.equal(m.payload.content_source, "generated_draft");
  assert.equal(m.payload.review_status, "unreviewed");
  assert.notEqual(m.payload.verified, true);
}

for (const m of dryRun.filter((x) => x.kind === "decision_point_create_draft")) {
  assert.equal(m.payload.content_source, "generated_draft");
  assert.equal(m.payload.review_status, "unreviewed");
}

const specCompile = await compileNeighborhood({ topic: "ankle-fracture" });
assert.equal(specCompile.dataSource.neighborhood, "spec");

const dbCompile = await compileNeighborhood({ topic: "ankle-fracture", dbBacked: true });
assert.ok(["database", "spec"].includes(dbCompile.dataSource.neighborhood));

console.log("staging-proof.test.ts: all assertions passed");
console.log(
  JSON.stringify(
    {
      approved: approved.length,
      dryRunMutations: mutations.length,
      specEntities: specCompile.plan.neighborhood.entityCount,
      dbSource: dbCompile.dataSource,
    },
    null,
    2
  )
);