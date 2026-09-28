/** Tests for review-packet disposition recommendations and ranking. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildReviewRow,
  detectJointDivergence,
  detectMixedSense,
  rankReviewRows,
  recommendDisposition,
  reviewCsvHeader,
  reviewRowToCsv,
  type PacketContext,
  type PacketProposal,
} from "./review-packet";

function packet(label: string, overrides: Partial<PacketProposal> = {}): PacketProposal {
  return {
    entityId: `p-${label}`,
    preferredLabel: label,
    normalizedLabel: label.toLowerCase(),
    factoryType: "condition",
    claimIds: ["c1"],
    cardIds: ["k1"],
    tags: [],
    ...overrides,
  };
}

function context(overrides: Partial<PacketContext> = {}): PacketContext {
  return {
    inferredType: { type: "condition", confidence: 0.35, reasons: ["condition_prior_fallback"], flags: ["prior_fallback"] },
    candidates: [],
    isClusterHead: true,
    claimTexts: [],
    neighborLabels: [],
    ...overrides,
  };
}

describe("recommendDisposition", () => {
  it("aliases exact canonical duplicates", () => {
    const rec = recommendDisposition(
      packet("Femoral Nerve"),
      context({
        candidates: [
          {
            entityId: "canon-1",
            label: "Femoral nerve",
            type: "anatomy_structure",
            signals: { exactLabel: true, aliasMatch: false, tokenJaccard: 1, tokenContainment: 1, trigram: 1, typeCompatible: true, acronymExpansion: false, elision: false, claimOverlap: 0 },
            score: 1.1,
            evidence: ["exact_normalized_label"],
          },
        ],
      }),
    );
    assert.equal(rec.disposition, "ALIAS_EXISTING");
    assert.equal(rec.needsFullDbRecheck, false);
  });

  it("rejects verb fragments as non-entities", () => {
    const rec = recommendDisposition(
      packet("Extend"),
      context({
        inferredType: { type: "condition", confidence: 0.35, reasons: ["condition_prior_fallback"], flags: ["prior_fallback", "likely_verb_fragment"] },
      }),
    );
    assert.equal(rec.disposition, "REJECT_NON_ENTITY");
  });

  it("defers multi-sense elided forms", () => {
    const rec = recommendDisposition(
      packet("Radial", { claimIds: ["c1", "c2", "c3"] }),
      context({
        claimTexts: ["The Brachioradialis is innervated by radial nerve.", "The meniscus tear pattern is radial."],
      }),
    );
    assert.equal(rec.disposition, "DEFER_NEEDS_REVIEW");
    assert.match(rec.reason, /multi_sense_risk/);
  });

  it("promotes reusable multi-claim labels", () => {
    const rec = recommendDisposition(
      packet("Metatarsus adductus", { claimIds: ["c1", "c2", "c3", "c4"], cardIds: ["k1", "k2"] }),
      context({
        inferredType: { type: "condition", confidence: 0.85, reasons: ["condition_head_noun"], flags: [] },
      }),
    );
    assert.equal(rec.disposition, "PROMOTE_CANONICAL");
    assert.equal(rec.needsFullDbRecheck, true);
  });

  it("rejects count-shaped labels as context-dependent", () => {
    const rec = recommendDisposition(packet("8 pulleys"), context());
    assert.equal(rec.disposition, "REJECT_CONTEXT_DEPENDENT");
  });

  it("rejects composite and relational labels", () => {
    assert.equal(
      recommendDisposition(packet("DIPJ and distal phalanx"), context()).reason,
      "composite_conjunction_label",
    );
    assert.equal(
      recommendDisposition(packet("insertion of tibialis anterior"), context()).reason,
      "location_descriptor_label",
    );
    // Slash eponyms are not composites.
    assert.notEqual(
      recommendDisposition(packet("AO/OTA classification"), context()).reason,
      "composite_conjunction_label",
    );
  });

  it("rejects bare qualifiers missing a parent", () => {
    assert.equal(
      recommendDisposition(packet("Stage III"), context()).reason,
      "bare_qualifier_missing_parent",
    );
    assert.equal(
      recommendDisposition(packet("Complete tear"), context()).disposition,
      "REJECT_CONTEXT_DEPENDENT",
    );
    // Structured parents survive.
    assert.notEqual(
      recommendDisposition(packet("Garden type II"), context()).reason,
      "bare_qualifier_missing_parent",
    );
  });

  it("falls below-threshold fuzzy matches through to intrinsic merit", () => {
    const fuzzy = { exactLabel: false, aliasMatch: false, tokenJaccard: 0.5, tokenContainment: 0.67, trigram: 0.72, typeCompatible: true, acronymExpansion: false, elision: false, claimOverlap: 0 };
    const rec = recommendDisposition(
      packet("Posterior oblique ligament", { normalizedLabel: "posterior oblique ligament" }),
      context({
        inferredType: { type: "anatomy_structure", confidence: 0.9, reasons: ["anatomy_head_noun"], flags: [] },
        candidates: [
          { entityId: "pcl", label: "Posterior Cruciate Ligament", type: "anatomy_structure", signals: fuzzy, score: 0.55, evidence: [] },
        ],
      }),
    );
    assert.equal(rec.disposition, "PROMOTE_CANONICAL");
    assert.equal(rec.recommendedCanonicalLabel, "Posterior oblique ligament");
  });

  it("keeps anatomical ranges promotable", () => {
    const rec = recommendDisposition(
      packet("Spinous process C7-T3", { normalizedLabel: "spinous process c7-t3", claimIds: ["c1", "c2"] }),
      context({
        inferredType: { type: "anatomy_structure", confidence: 0.9, reasons: ["anatomy_head_noun"], flags: [] },
      }),
    );
    assert.equal(rec.disposition, "PROMOTE_CANONICAL");
  });

  it("promotes elided nerves under expanded labels", () => {
    const rec = recommendDisposition(
      packet("Tibial", { claimIds: ["c1", "c2"] }),
      context({
        inferredType: { type: "anatomy_structure", confidence: 0.8, reasons: ["condition_prior_fallback", "innervation_context_disambiguation"], flags: ["prior_fallback", "ambiguous_elision"] },
        claimTexts: ["innervated by tibial"],
      }),
    );
    assert.equal(rec.disposition, "PROMOTE_CANONICAL");
    assert.equal(rec.recommendedCanonicalLabel, "Tibial nerve");
  });

  it("rejects boolean answer tokens", () => {
    assert.equal(recommendDisposition(packet("False!"), context()).disposition, "REJECT_NON_ENTITY");
    assert.equal(recommendDisposition(packet("True"), context()).disposition, "REJECT_NON_ENTITY");
  });

  it("rejects bare generic nouns without strong candidates", () => {
    assert.equal(recommendDisposition(packet("Infection"), context()).disposition, "REJECT_TOO_GENERIC");
    assert.equal(recommendDisposition(packet("Instability"), context()).disposition, "REJECT_TOO_GENERIC");
    assert.equal(recommendDisposition(packet("surgery"), context()).disposition, "REJECT_TOO_GENERIC");
  });

  it("rejects generics despite elision-driven strong candidates", () => {
    const elision = { exactLabel: false, aliasMatch: false, tokenJaccard: 0.5, tokenContainment: 1, trigram: 0.75, typeCompatible: true, acronymExpansion: false, elision: true, claimOverlap: 0 };
    const rec = recommendDisposition(
      packet("Fracture"),
      context({
        candidates: [
          { entityId: "of", label: "Open Fracture", type: "condition", signals: elision, score: 0.85, evidence: [] },
        ],
      }),
    );
    assert.equal(rec.disposition, "REJECT_TOO_GENERIC");
  });

  it("prefers acronym expansions over higher elision rivals", () => {
    const injury = { exactLabel: false, aliasMatch: false, tokenJaccard: 0.5, tokenContainment: 1, trigram: 0.7, typeCompatible: true, acronymExpansion: false, elision: true, claimOverlap: 0 };
    const expansion = { exactLabel: false, aliasMatch: false, tokenJaccard: 0, tokenContainment: 0, trigram: 0.3, typeCompatible: true, acronymExpansion: true, elision: false, claimOverlap: 0 };
    const rec = recommendDisposition(
      packet("PCL", { claimIds: ["c1", "c2"] }),
      context({
        candidates: [
          { entityId: "inj", label: "PCL Injury", type: "condition", signals: injury, score: 0.9, evidence: [] },
          { entityId: "lig", label: "Posterior Cruciate Ligament", type: "anatomy_structure", signals: expansion, score: 0.65, evidence: [] },
        ],
        claimTexts: ["The knee ligament PCL is torn.", "PCL reconstruction follows."],
      }),
    );
    assert.equal(rec.disposition, "ALIAS_EXISTING");
    assert.equal(rec.recommendedTargetId, "lig");
  });

  it("defers same-score canonical ties", () => {
    const fuzzy = { exactLabel: false, aliasMatch: false, tokenJaccard: 0.67, tokenContainment: 1, trigram: 0.9, typeCompatible: true, acronymExpansion: false, elision: true, claimOverlap: 0 };
    const rec = recommendDisposition(
      packet("Medial parapatellar", { normalizedLabel: "medial parapatellar" }),
      context({
        inferredType: { type: "surgical_approach", confidence: 0.85, reasons: ["surgical_approach_pattern"], flags: [] },
        candidates: [
          { entityId: "app", label: "Medial Parapatellar Approach", type: "surgical_approach", signals: fuzzy, score: 0.65, evidence: [] },
          { entityId: "int", label: "Medial Parapatellar Interval", type: "anatomy_structure", signals: fuzzy, score: 0.65, evidence: [] },
        ],
      }),
    );
    assert.equal(rec.disposition, "DEFER_NEEDS_REVIEW");
    assert.equal(rec.reason, "canonical_tie_needs_review");
  });

  it("defers single-token elision matches instead of strong-aliasing", () => {
    const elision = { exactLabel: false, aliasMatch: false, tokenJaccard: 0.5, tokenContainment: 1, trigram: 0.88, typeCompatible: true, acronymExpansion: false, elision: true, claimOverlap: 0 };
    const rec = recommendDisposition(
      packet("Posterolateral"),
      context({
        inferredType: { type: "condition", confidence: 0.35, reasons: ["condition_prior_fallback"], flags: ["prior_fallback", "ambiguous_elision"] },
        candidates: [
          { entityId: "plc", label: "Posterolateral Corner", type: "anatomy_structure", signals: elision, score: 0.9, evidence: [] },
        ],
        claimTexts: ["The bundles of the ACL are posterolateral."],
      }),
    );
    assert.equal(rec.disposition, "DEFER_NEEDS_REVIEW");
  });

  it("detects mixed senses in multi-token elided labels", () => {
    assert.deepEqual(
      detectMixedSense("posterior tibial", [
        "Posterior tibial tendon dysfunction causes flatfoot.",
        "Posterior tibial vessel supplies the foot.",
      ]).sort(),
      ["tendon", "vessel"],
    );
  });

  it("splits short acronyms by joint divergence", () => {
    assert.deepEqual(
      detectJointDivergence([
        "In knee extension, the LCL provides stability.",
        "When a patient suffers a terrible triad injury of the elbow, LCL.",
      ]).sort(),
      ["elbow", "knee"],
    );
    const rec = recommendDisposition(
      packet("LCL", { claimIds: ["c1", "c2"] }),
      context({
        claimTexts: [
          "In knee extension, the LCL provides stability.",
          "When a patient suffers a terrible triad injury of the elbow, LCL.",
        ],
      }),
    );
    assert.equal(rec.disposition, "DEFER_NEEDS_REVIEW");
    assert.match(rec.reason, /multi_sense_risk/);
  });

  it("defers unexpanded acronyms with a specific reason", () => {
    const rec = recommendDisposition(
      packet("MRI"),
      context({
        inferredType: { type: "diagnostic_test", confidence: 0.9, reasons: ["diagnostic_modality"], flags: [] },
      }),
    );
    assert.equal(rec.disposition, "DEFER_NEEDS_REVIEW");
    assert.equal(rec.reason, "acronym_needs_expansion_review");
  });

  it("defers strong-typed acronyms instead of bare-acronym promotion", () => {
    const rec = recommendDisposition(
      packet("ORIF", { claimIds: ["c1", "c2", "c3"] }),
      context({
        inferredType: { type: "fixation_method", confidence: 0.85, reasons: ["fixation_method_pattern"], flags: [] },
      }),
    );
    assert.equal(rec.disposition, "DEFER_NEEDS_REVIEW");
    assert.equal(rec.reason, "acronym_needs_expansion_review");
  });

  it("aliases elided nerves despite same-prefix tie order", () => {
    const elision = { exactLabel: false, aliasMatch: false, tokenJaccard: 0.5, tokenContainment: 1, trigram: 0.7, typeCompatible: true, acronymExpansion: false, elision: true, claimOverlap: 0 };
    const rec = recommendDisposition(
      packet("Femoral", { claimIds: ["c1", "c2"] }),
      context({
        inferredType: { type: "anatomy_structure", confidence: 0.8, reasons: ["innervation_context_disambiguation"], flags: ["ambiguous_elision"] },
        candidates: [
          { entityId: "head", label: "Femoral Head", type: "anatomy_structure", signals: elision, score: 0.7, evidence: [] },
          { entityId: "nerve", label: "Femoral nerve", type: "anatomy_structure", signals: elision, score: 0.7, evidence: [] },
        ],
        claimTexts: ["innervated by femoral"],
      }),
    );
    assert.equal(rec.disposition, "ALIAS_EXISTING");
    assert.equal(rec.recommendedTargetId, "nerve");
  });

  it("merges non-head cluster members", () => {
    const rec = recommendDisposition(
      packet("ACL"),
      context({
        cluster: { clusterId: "cl", memberIds: ["a", "b"], headId: "b", linkReasons: ["acronym_expansion"], recommendation: "promote_head_alias_rest", rationale: "" },
        isClusterHead: false,
      }),
    );
    assert.equal(rec.disposition, "MERGE_PROPOSALS");
  });
});

describe("detectMixedSense", () => {
  it("detects nerve vs tear senses across claims", () => {
    assert.deepEqual(
      detectMixedSense("radial", ["innervated by radial nerve", "tear pattern is radial"]),
      ["nerve", "tear"],
    );
  });

  it("ignores same-claim co-occurrence", () => {
    assert.deepEqual(detectMixedSense("femoral", ["femoral neck fracture fixation"]), []);
  });

  it("ignores multi-token labels", () => {
    assert.deepEqual(detectMixedSense("radial nerve", ["x nerve y tear"]), []);
  });
});

describe("ranking and CSV", () => {
  it("ranks claim support above label order", () => {
    const low = buildReviewRow(packet("Zebra", { claimIds: ["c1"] }), context());
    const high = buildReviewRow(packet("Alpha", { claimIds: ["c1", "c2", "c3"] }), context());
    const ranked = rankReviewRows([low, high]);
    assert.equal(ranked[0].proposalId, high.proposalId);
  });

  it("serializes rows to CSV with header", () => {
    const row = buildReviewRow(packet("Alpha", { claimIds: ["c1", "c2"] }), context({ claimTexts: ["first", "second"] }));
    const header = reviewCsvHeader().split(",");
    const cells = reviewRowToCsv(row).split(",");
    assert.equal(header[0], "proposal_id");
    assert.equal(cells.length, header.length);
  });
});
