/** Tests for the review-driven promotion applier. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  decisionKeyFor,
  inferAliasType,
  planApply,
  renderApplySql,
  slugifyLabel,
  validateDecisions,
  type ApplyContext,
  type ReviewDecisionInput,
} from "./promotion-applier";

function context(overrides: Partial<ApplyContext> = {}): ApplyContext {
  return {
    canonicalById: new Map([
      ["canon-nerve", { id: "canon-nerve", normalizedLabel: "femoral nerve", entityType: "anatomy_structure" }],
    ]),
    canonicalByNormalized: new Map([
      ["femoral nerve", [{ id: "canon-nerve", normalizedLabel: "femoral nerve", entityType: "anatomy_structure" }]],
    ]),
    aliases: [],
    kgProposals: new Map([
      ["kg-head", { id: "kg-head", reviewStatus: "generated", proposalType: "create_canonical_entity" }],
    ]),
    appliedDecisionKeys: new Set(),
    edges: [
      { claimId: "c1", role: "tested_answer", entityKind: "proposed", proposalId: "kg-1" },
      { claimId: "c2", role: "tested_answer", entityKind: "proposed", proposalId: "kg-1" },
    ],
    ...overrides,
  };
}

function decision(overrides: Partial<ReviewDecisionInput> = {}): ReviewDecisionInput {
  return {
    kgProposalId: "kg-1",
    proposalLabel: "Femoral",
    proposalNormalizedLabel: "femoral",
    proposedEntityType: "condition",
    sourceClaimIds: ["c1", "c2"],
    decision: "ALIAS_EXISTING",
    canonicalEntityId: "canon-nerve",
    reviewer: "reviewer@example.com",
    reason: "innervation context",
    ...overrides,
  };
}

describe("validateDecisions", () => {
  it("accepts a well-formed alias decision", () => {
    assert.deepEqual(validateDecisions([decision()]), []);
  });

  it("rejects unknown dispositions and missing fields", () => {
    const errors = validateDecisions([
      decision({ decision: "maybe" }),
      decision({ decision: "ALIAS_EXISTING", canonicalEntityId: undefined }),
      decision({ decision: "PROMOTE_CANONICAL", canonicalLabel: undefined, entityType: undefined }),
      decision({ decision: "PROMOTE_CANONICAL", canonicalLabel: "X", entityType: "organism" }),
      decision({ reviewer: "" }),
    ]);
    const codes = errors.map((entry) => entry.code);
    assert.ok(codes.includes("unknown_decision"));
    assert.ok(codes.includes("alias_missing_target"));
    assert.ok(codes.includes("promote_missing_label_or_type"));
    assert.ok(codes.includes("promote_invalid_type"));
    assert.ok(codes.includes("missing_reviewer_or_reason"));
  });

  it("rejects duplicate decision keys", () => {
    const errors = validateDecisions([decision(), decision()]);
    assert.ok(errors.some((entry) => entry.code === "duplicate_decision_key"));
  });
});

describe("planApply", () => {
  it("defaults to dry-run", () => {
    const plan = planApply([decision()], context());
    assert.equal(plan.dryRun, true);
  });

  it("plans alias with edge repoint and decision record", () => {
    const plan = planApply([decision()], context());
    assert.deepEqual(plan.errors, []);
    const kinds = plan.operations.map((operation) => operation.kind);
    assert.deepEqual(kinds, ["add_entity_alias", "repoint_edges_to_canonical", "record_decision"]);
    const repoint = plan.operations[1];
    assert.equal(repoint.kind === "repoint_edges_to_canonical" && repoint.edgeCount, 2);
  });

  it("fails closed when the alias target is missing", () => {
    const plan = planApply([decision({ canonicalEntityId: "nope" })], context());
    assert.equal(plan.operations.length, 0);
    assert.equal(plan.errors[0].code, "alias_target_missing");
  });

  it("fails closed on alias conflicts", () => {
    const plan = planApply(
      [decision()],
      context({ aliases: [{ normalizedAlias: "femoral", canonicalEntityId: "canon-other", isActive: true }] }),
    );
    assert.equal(plan.errors[0].code, "alias_conflict");
  });

  it("converts promote to re-review when a canonical appears", () => {
    const plan = planApply(
      [decision({ decision: "PROMOTE_CANONICAL", canonicalLabel: "Femoral nerve", entityType: "anatomy_structure", canonicalEntityId: undefined })],
      context(),
    );
    assert.equal(plan.operations[0].kind, "needs_rereview");
    assert.ok(plan.warnings.some((warning) => warning.code === "promote_blocked_by_existing_canonical"));
  });

  it("skips already-applied decisions for idempotent replay", () => {
    const plan = planApply(
      [decision()],
      context({ appliedDecisionKeys: new Set([decisionKeyFor(decision())]) }),
    );
    assert.equal(plan.operations.length, 0);
    assert.equal(plan.stats.skipped_applied, 1);
  });

  it("slugifies canonical labels", () => {
    assert.equal(slugifyLabel("Tibial Nerve (Deep)"), "tibial-nerve-deep");
  });

  it("infers elided_form alias types", () => {
    const plan = planApply([decision()], context());
    const alias = plan.operations[0];
    assert.equal(alias.kind === "add_entity_alias" && alias.aliasType, "elided_form");
  });
});

describe("plural-folded fail-closed (Step 2)", () => {
  const twinContext = (): ApplyContext => context({
    canonicalById: new Map([
      ["canon-fx", { id: "canon-fx", normalizedLabel: "femoral shaft fracture", entityType: "condition" }],
      ["canon-fxs", { id: "canon-fxs", normalizedLabel: "femoral shaft fractures", entityType: "condition" }],
    ]),
    canonicalByNormalized: new Map([
      ["femoral shaft fracture", [{ id: "canon-fx", normalizedLabel: "femoral shaft fracture", entityType: "condition" }]],
      ["femoral shaft fractures", [{ id: "canon-fxs", normalizedLabel: "femoral shaft fractures", entityType: "condition" }]],
    ]),
  });

  it("converts promote to re-review on a plural-folded twin", () => {
    const plan = planApply(
      [decision({ decision: "PROMOTE_CANONICAL", canonicalLabel: "Femoral Shaft Fractures", entityType: "condition", canonicalEntityId: undefined })],
      context({
        canonicalById: new Map([["canon-fx", { id: "canon-fx", normalizedLabel: "femoral shaft fracture", entityType: "condition" }]]),
        canonicalByNormalized: new Map([["femoral shaft fracture", [{ id: "canon-fx", normalizedLabel: "femoral shaft fracture", entityType: "condition" }]]]),
      }),
    );
    assert.equal(plan.operations[0].kind, "needs_rereview");
    assert.ok(plan.warnings.some((warning) => warning.code === "promote_blocked_by_folded_canonical"));
  });

  it("converts promote to re-review on a folded alias claim", () => {
    const plan = planApply(
      [decision({ decision: "PROMOTE_CANONICAL", canonicalLabel: "Radial Head Fracture", entityType: "condition", canonicalEntityId: undefined })],
      context({ aliases: [{ normalizedAlias: "radial head fractures", canonicalEntityId: "canon-other", isActive: true }] }),
    );
    assert.equal(plan.operations[0].kind, "needs_rereview");
    assert.ok(plan.warnings.some((warning) => warning.code === "promote_blocked_by_folded_alias"));
  });

  it("converts alias to re-review when it folds into a different canonical", () => {
    const plan = planApply(
      [decision({ proposalLabel: "Femoral Shaft Fractures", proposalNormalizedLabel: "femoral shaft fractures", canonicalEntityId: "canon-fxs" })],
      twinContext(),
    );
    assert.equal(plan.operations[0].kind, "needs_rereview");
    assert.ok(plan.warnings.some((warning) => warning.code === "alias_blocked_by_folded_canonical"));
  });

  it("allows a plural alias whose folded form matches only its own target", () => {
    const plan = planApply(
      [decision({ proposalLabel: "Open fractures", proposalNormalizedLabel: "open fractures", canonicalEntityId: "canon-open" })],
      context({
        canonicalById: new Map([["canon-open", { id: "canon-open", normalizedLabel: "open fracture", entityType: "condition" }]]),
        canonicalByNormalized: new Map([["open fracture", [{ id: "canon-open", normalizedLabel: "open fracture", entityType: "condition" }]]]),
      }),
    );
    assert.deepEqual(plan.errors, []);
    assert.equal(plan.operations[0].kind, "add_entity_alias");
  });

  it("types -es and irregular inflections as plural_variant", () => {
    assert.equal(inferAliasType("Abscesses", "Abscess"), "plural_variant");
    assert.equal(inferAliasType("Diagnoses", "Diagnosis"), "plural_variant");
    assert.equal(inferAliasType("Open fractures", "Open Fracture"), "plural_variant");
    assert.equal(inferAliasType("FDP tendons", "FDP"), "synonym");
  });
});

describe("joint-ambiguous acronym guard (Step 3)", () => {
  const mclContext = (): ApplyContext => context({
    canonicalById: new Map([
      ["canon-mcl", { id: "canon-mcl", normalizedLabel: "medial collateral ligament", entityType: "anatomy_structure" }],
      ["canon-mcl-knee", { id: "canon-mcl-knee", normalizedLabel: "medial collateral ligament knee", entityType: "anatomy_structure" }],
    ]),
    canonicalByNormalized: new Map([
      ["medial collateral ligament", [{ id: "canon-mcl", normalizedLabel: "medial collateral ligament", entityType: "anatomy_structure" }]],
      ["medial collateral ligament knee", [{ id: "canon-mcl-knee", normalizedLabel: "medial collateral ligament knee", entityType: "anatomy_structure" }]],
    ]),
  });

  it("allows a bare acronym alias to a joint-unspecified canonical (interim)", () => {
    const plan = planApply(
      [decision({ proposalLabel: "MCL", proposalNormalizedLabel: "mcl", canonicalEntityId: "canon-mcl" })],
      mclContext(),
    );
    assert.deepEqual(plan.errors, []);
    assert.equal(plan.operations[0].kind, "add_entity_alias");
  });

  it("errors a bare acronym alias to a joint-qualified canonical", () => {
    for (const bare of ["MCL", "LCL", "UCL"]) {
      const plan = planApply(
        [decision({ proposalLabel: bare, proposalNormalizedLabel: bare.toLowerCase(), canonicalEntityId: "canon-mcl-knee" })],
        mclContext(),
      );
      assert.equal(plan.operations.length, 0, bare);
      assert.equal(plan.errors[0].code, "alias_joint_ambiguous", bare);
    }
  });

  it("does not gate joint-unambiguous acronyms", () => {
    const plan = planApply(
      [decision({ proposalLabel: "ACL", proposalNormalizedLabel: "acl", canonicalEntityId: "canon-mcl-knee" })],
      mclContext(),
    );
    assert.deepEqual(plan.errors, []);
    assert.equal(plan.operations[0].kind, "add_entity_alias");
  });
});

describe("renderApplySql", () => {
  it("renders one transaction with idempotent guards", () => {
    const inputs = [decision()];
    const sql = renderApplySql(planApply(inputs, context()), inputs);
    assert.match(sql, /^-- promotion apply plan/m);
    assert.ok(sql.includes("begin;"));
    assert.ok(sql.includes("commit;"));
    assert.ok(sql.includes("where not exists"));
    assert.ok(sql.includes("on conflict (decision_key) do nothing;"));
  });
});
