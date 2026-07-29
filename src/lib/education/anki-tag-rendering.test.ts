import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Direct Node strip-types runner imports TypeScript source.
import { applyLegacyDispositions, buildGovernedTag, buildTagReleaseManifest, diffCardTags, exportableParentClosure, normalizeLegacyTag, reconcileManagedTags, renderCardTagManifest, validateGovernedTag, type LegacyDispositionRule, type TagExportPolicy, type TaxonomyTagNode } from "./anki-tag-rendering.ts";

const taxonomy: TaxonomyTagNode[] = [
  { canonicalEntityId: "le", facet: "Anatomy", path: ["Lower_Extremity"], exportable: true },
  { canonicalEntityId: "knee", facet: "Anatomy", path: ["Lower_Extremity", "Knee"], exportable: true },
  { canonicalEntityId: "ligament", facet: "Anatomy", path: ["Lower_Extremity", "Knee", "Ligament"], exportable: false },
  { canonicalEntityId: "acl", facet: "Anatomy", path: ["Lower_Extremity", "Knee", "Ligament", "ACL"], exportable: true },
  { canonicalEntityId: "sports", facet: "Specialty", path: ["Sports_Medicine"], exportable: true },
  { canonicalEntityId: "review", facet: "Workflow", path: ["Needs_Human_Review"], exportable: true },
  { canonicalEntityId: "netter", facet: "Source", path: ["Netter"], exportable: true },
];
const transition: TagExportPolicy = {
  version: "tag-policy.v1",
  taxonomyVersion: "taxonomy.v1",
  publicExport: true,
  legacyMode: "transition",
  navigationLegacyMode: "quarantine",
};
const rules: LegacyDispositionRule[] = [
  {
    rawTag: "# Netter",
    normalizedForm: "netter",
    disposition: "source_only",
    canonicalTargetIds: ["netter"],
    taxonomyVersion: "taxonomy.v1",
    rationale: "Governed provenance",
  },
  {
    rawTag: "SnapOrtho::CasePrep",
    normalizedForm: "snaportho::caseprep",
    disposition: "navigation_only",
    canonicalTargetIds: [],
    taxonomyVersion: "taxonomy.v1",
    rationale: "Over-broad navigation",
  },
  {
    rawTag: "MixedTopic",
    normalizedForm: "mixedtopic",
    disposition: "ambiguous",
    canonicalTargetIds: [],
    taxonomyVersion: "taxonomy.v1",
    rationale: "Requires card review",
  },
];

test("governed grammar accepts canonical tokens and rejects spaces or punctuation", () => {
  assert.equal(buildGovernedTag("Diagnosis", ["ACL_Tear"]), "SnapOrtho::Diagnosis::ACL_Tear");
  assert.equal(validateGovernedTag("SnapOrtho::Treatment::Open_Reduction_Internal_Fixation"), true);
  assert.equal(validateGovernedTag("SnapOrtho::Diagnosis::acl tear"), false);
  assert.throws(() => buildGovernedTag("Anatomy", ["Cervical/Myelopathy"]));
});

test("parent closure emits only declared exportable ancestors", () => {
  assert.deepEqual(exportableParentClosure(taxonomy[3], taxonomy), [
    "SnapOrtho::Anatomy::Lower_Extremity",
    "SnapOrtho::Anatomy::Lower_Extremity::Knee",
    "SnapOrtho::Anatomy::Lower_Extremity::Knee::Ligament::ACL",
  ]);
});

test("public rendering filters workflow tags and is deterministic", () => {
  const input = {
    canonicalCardVersionId: "card-v1",
    assertions: [
      { assertionId: "z", canonicalCardVersionId: "card-v1", canonicalEntityId: "review", status: "accepted" as const },
      { assertionId: "a", canonicalCardVersionId: "card-v1", canonicalEntityId: "acl", status: "accepted" as const },
      { assertionId: "ignored", canonicalCardVersionId: "other", canonicalEntityId: "sports", status: "accepted" as const },
    ],
    rawTags: ["# Netter"],
  };
  const one = renderCardTagManifest(input, taxonomy, transition, rules);
  const two = renderCardTagManifest({ ...input, rawTags: [...input.rawTags].reverse(), assertions: [...input.assertions].reverse() }, [...taxonomy].reverse(), transition, [...rules].reverse());
  assert.deepEqual(one, two);
  assert.deepEqual(one.assertionIds, ["a", "z"]);
  assert.ok(!one.generatedTags.some((tag) => tag.includes("Workflow")));
  assert.ok(one.generatedTags.includes("SnapOrtho::Source::Netter"));
});

test("workflow export requires an explicit public allow-list", () => {
  const policy = {
    ...transition,
    publicWorkflowPaths: ["SnapOrtho::Workflow::Needs_Human_Review"],
  };
  const manifest = renderCardTagManifest({
    canonicalCardVersionId: "v",
    assertions: [{ assertionId: "a", canonicalCardVersionId: "v", canonicalEntityId: "review", status: "accepted" }],
  }, taxonomy, policy);
  assert.deepEqual(manifest.generatedTags, ["SnapOrtho::Workflow::Needs_Human_Review"]);
});

test("legacy rules canonicalize safe source tags and hash quarantined raw labels", () => {
  assert.equal(normalizeLegacyTag(" ##  Trauma  "), "trauma");
  const result = applyLegacyDispositions(
    ["MixedTopic", "SnapOrtho::CasePrep", "# Netter"],
    rules,
    taxonomy,
    transition,
  );
  assert.ok(result.includes("SnapOrtho::Source::Netter"));
  assert.ok(result.some((tag) => /^Legacy::Ambiguous::tag_[a-f0-9]{12}$/.test(tag)));
  assert.ok(result.some((tag) => /^Legacy::Navigation::tag_[a-f0-9]{12}$/.test(tag)));
  assert.ok(!result.some((tag) => tag.includes("MixedTopic")));
});

test("reconciliation preserves every tag outside the managed namespace", () => {
  assert.deepEqual(
    reconcileManagedTags(
      ["marked", "personal::favorite", "Legacy::Ambiguous::old", "SnapOrtho::Diagnosis::Old"],
      ["SnapOrtho::Diagnosis::ACL_Tear", "Legacy::Navigation::new"],
    ),
    [
      "Legacy::Ambiguous::old",
      "SnapOrtho::Diagnosis::ACL_Tear",
      "marked",
      "personal::favorite",
    ],
  );
});

test("diff and release manifests are stable and fully ordered", () => {
  const diff = diffCardTags("v1", ["b", "a"], ["c", "b"]);
  assert.deepEqual({ added: diff.added, removed: diff.removed, unchanged: diff.unchanged }, {
    added: ["c"],
    removed: ["a"],
    unchanged: ["b"],
  });
  assert.match(diff.checksum, /^[a-f0-9]{64}$/);

  const a = renderCardTagManifest({
    canonicalCardVersionId: "b",
    assertions: [{ assertionId: "x", canonicalCardVersionId: "b", canonicalEntityId: "sports", status: "accepted" }],
  }, taxonomy, transition);
  const b = renderCardTagManifest({
    canonicalCardVersionId: "a",
    assertions: [{ assertionId: "y", canonicalCardVersionId: "a", canonicalEntityId: "acl", status: "accepted" }],
  }, taxonomy, transition);
  const one = buildTagReleaseManifest([a, b], transition);
  const two = buildTagReleaseManifest([b, a], transition);
  assert.deepEqual(one, two);
  assert.deepEqual(one.cards.map((card) => card.canonicalCardVersionId), ["a", "b"]);
  assert.match(one.checksum, /^[a-f0-9]{64}$/);
});

test("bad taxonomy and disposition inputs fail closed", () => {
  assert.throws(() => renderCardTagManifest({
    canonicalCardVersionId: "v",
    assertions: [{ assertionId: "a", canonicalCardVersionId: "v", canonicalEntityId: "missing", status: "accepted" }],
  }, taxonomy, transition), /unknown_assertion_entity/);
  assert.throws(() => applyLegacyDispositions(["# Netter"], [{
    ...rules[0],
    normalizedForm: "wrong",
  }], taxonomy, transition), /legacy_normalized_form_mismatch/);
});
