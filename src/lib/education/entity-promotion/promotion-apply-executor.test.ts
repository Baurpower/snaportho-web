/** Tests for the live apply executor (in-memory fake database). */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { executePlan, type PromotionDb } from "./promotion-apply-executor";
import type { ReviewDecisionInput } from "./promotion-applier";

function makeFake(): { db: PromotionDb; state: { canonical: Array<{ id: string; normalizedLabel: string; entityType: string }>; aliases: Array<{ normalizedAlias: string; canonicalEntityId: string; isActive: boolean }>; decisions: string[]; edgeCalls: number } } {
  const state = {
    canonical: [{ id: "canon-nerve", normalizedLabel: "femoral nerve", entityType: "anatomy_structure" }],
    aliases: [] as Array<{ normalizedAlias: string; canonicalEntityId: string; isActive: boolean }>,
    decisions: [] as string[],
    edgeCalls: 0,
  };
  const db: PromotionDb = {
    fetchCanonical: async () => state.canonical,
    fetchAliases: async () => state.aliases,
    fetchKgProposals: async (ids) => ids.map((id) => ({ id, reviewStatus: "generated", proposalType: "create_canonical_entity" })),
    fetchAppliedDecisionKeys: async () => [...state.decisions],
    fetchProposalEdges: async () => [{ claimId: "c1", role: "tested_answer", entityKind: "proposed", proposalId: "kg-1" }],
    insertCanonicalEntity: async (input) => {
      const existing = state.canonical.find((entry) => entry.normalizedLabel === input.normalizedLabel);
      if (existing) return existing.id;
      const id = `canon-${state.canonical.length}`;
      state.canonical.push({ id, normalizedLabel: input.normalizedLabel, entityType: input.entityType });
      return id;
    },
    insertAlias: async (input) => {
      state.aliases.push({ normalizedAlias: input.normalizedAlias, canonicalEntityId: input.canonicalEntityId, isActive: true });
    },
    repointEdges: async () => {
      state.edgeCalls += 1;
      return 1;
    },
    mergeProposal: async () => {},
    setProposalReview: async () => {},
    recordDecision: async (input) => {
      state.decisions.push(input.decisionKey);
    },
    markDecisionApplied: async () => {},
  };
  return { db, state };
}

const ALIAS: ReviewDecisionInput = {
  kgProposalId: "kg-1",
  proposalLabel: "Femoral",
  proposalNormalizedLabel: "femoral",
  proposedEntityType: "condition",
  sourceClaimIds: ["c1"],
  decision: "ALIAS_EXISTING",
  canonicalEntityId: "canon-nerve",
  reviewer: "reviewer@example.com",
  reason: "innervation context",
};

describe("executePlan", () => {
  it("executes alias decisions and records them", async () => {
    const { db, state } = makeFake();
    const report = await executePlan(db, [ALIAS], "cli");
    assert.equal(report.executed, 1);
    assert.deepEqual(report.errors, []);
    assert.equal(state.aliases.length, 1);
    assert.equal(report.mutations.claim_edges_repointed, 1);
    assert.equal(report.mutations.decisions_recorded, 1);
  });

  it("is idempotent across replays", async () => {
    const { db, state } = makeFake();
    await executePlan(db, [ALIAS], "cli");
    const replay = await executePlan(db, [ALIAS], "cli");
    assert.equal(replay.executed, 0);
    assert.equal(state.aliases.length, 1);
  });

  it("aborts the batch on plan errors without partial writes", async () => {
    const { db, state } = makeFake();
    const report = await executePlan(db, [{ ...ALIAS, canonicalEntityId: "missing" }], "cli");
    assert.equal(report.executed, 0);
    assert.equal(report.errors[0].code, "alias_target_missing");
    assert.equal(state.aliases.length, 0);
    assert.equal(state.decisions.length, 0);
  });

  it("skips blocked promotes without writing", async () => {
    const { db } = makeFake();
    const report = await executePlan(
      db,
      [{ ...ALIAS, decision: "PROMOTE_CANONICAL", canonicalLabel: "Femoral nerve", entityType: "anatomy_structure", canonicalEntityId: undefined }],
      "cli",
    );
    assert.equal(report.executed, 0);
    assert.equal(report.skipped, 1);
  });
});
