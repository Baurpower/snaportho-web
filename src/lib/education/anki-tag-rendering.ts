import { createHash } from "node:crypto";

export const MANAGED_TAG_ROOT = "SnapOrtho";
export const LEGACY_TAG_ROOT = "Legacy";

export const CLINICAL_FACETS = [
  "Specialty",
  "Anatomy",
  "Diagnosis",
  "Treatment",
] as const;

export const TAG_FACETS = [
  ...CLINICAL_FACETS,
  "Content",
  "Learner_Level",
  "Yield",
  "Source",
  "Workflow",
] as const;

export type TagFacet = (typeof TAG_FACETS)[number];
export type LegacyTagDisposition =
  | "map_exact"
  | "map_split"
  | "source_only"
  | "navigation_only"
  | "workflow_only"
  | "ambiguous"
  | "contaminated"
  | "retired";

export interface TaxonomyTagNode {
  /** Stable ontology identity. It is deliberately not encoded in the Anki tag. */
  canonicalEntityId: string;
  facet: TagFacet;
  /** Facet-relative, already governed path tokens. */
  path: readonly string[];
  exportable: boolean;
}

export interface AcceptedTagAssertion {
  assertionId: string;
  canonicalCardVersionId: string;
  canonicalEntityId: string;
  status: "accepted";
}

export interface LegacyDispositionRule {
  rawTag: string;
  normalizedForm: string;
  disposition: LegacyTagDisposition;
  canonicalTargetIds: readonly string[];
  taxonomyVersion: string;
  rationale: string;
}

export interface TagExportPolicy {
  version: string;
  taxonomyVersion: string;
  publicExport: boolean;
  /** Export these workflow paths publicly only when explicitly intended. */
  publicWorkflowPaths?: readonly string[];
  legacyMode: "none" | "transition";
  navigationLegacyMode?: "omit" | "quarantine";
}

export interface CardTagRenderInput {
  canonicalCardVersionId: string;
  assertions: readonly AcceptedTagAssertion[];
  rawTags?: readonly string[];
  existingTags?: readonly string[];
}

export interface CardTagManifest {
  canonicalCardVersionId: string;
  generatedTags: string[];
  assertionIds: string[];
  taxonomyVersion: string;
  exportPolicyVersion: string;
  checksum: string;
}

export interface CardTagDiff {
  canonicalCardVersionId: string;
  added: string[];
  removed: string[];
  unchanged: string[];
  checksum: string;
}

const TOKEN = /^(?:[A-Z][A-Za-z0-9]*|[A-Z][A-Z0-9]*)(?:_(?:[A-Z][A-Za-z0-9]*|[A-Z][A-Z0-9]*))*$/;
const FACETS = new Set<string>(TAG_FACETS);

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => compareText(a, b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareText);
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function normalizeLegacyTag(rawTag: string): string {
  return rawTag
    .trim()
    .replace(/^#+/, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US");
}

export function assertGovernedToken(token: string): void {
  if (!TOKEN.test(token)) throw new Error(`invalid_governed_tag_token:${token}`);
}

export function buildGovernedTag(facet: TagFacet, path: readonly string[]): string {
  if (!FACETS.has(facet)) throw new Error(`invalid_tag_facet:${facet}`);
  if (path.length === 0) throw new Error(`empty_tag_path:${facet}`);
  path.forEach(assertGovernedToken);
  return [MANAGED_TAG_ROOT, facet, ...path].join("::");
}

export function validateGovernedTag(tag: string): boolean {
  const parts = tag.split("::");
  return (
    parts.length >= 3 &&
    parts[0] === MANAGED_TAG_ROOT &&
    FACETS.has(parts[1]) &&
    parts.slice(2).every((part) => TOKEN.test(part))
  );
}

function taxonomyIndex(nodes: readonly TaxonomyTagNode[]): Map<string, TaxonomyTagNode> {
  const result = new Map<string, TaxonomyTagNode>();
  for (const node of nodes) {
    if (result.has(node.canonicalEntityId))
      throw new Error(`duplicate_taxonomy_entity:${node.canonicalEntityId}`);
    buildGovernedTag(node.facet, node.path);
    result.set(node.canonicalEntityId, node);
  }
  return result;
}

/**
 * Produces declared, exportable ancestors. An ancestor is never guessed: it must
 * be present as a node in the frozen taxonomy with the same facet and path.
 */
export function exportableParentClosure(
  node: TaxonomyTagNode,
  taxonomy: readonly TaxonomyTagNode[],
): string[] {
  const byPath = new Map(
    taxonomy
      .filter((candidate) => candidate.facet === node.facet)
      .map((candidate) => [candidate.path.join("::"), candidate] as const),
  );
  const tags: string[] = [];
  for (let length = 1; length <= node.path.length; length += 1) {
    const path = node.path.slice(0, length);
    const declared = byPath.get(path.join("::"));
    if (declared?.exportable) tags.push(buildGovernedTag(node.facet, path));
  }
  return sortedUnique(tags);
}

function workflowAllowed(tag: string, policy: TagExportPolicy): boolean {
  if (!tag.startsWith(`${MANAGED_TAG_ROOT}::Workflow::`)) return true;
  if (!policy.publicExport) return true;
  return new Set(policy.publicWorkflowPaths ?? []).has(tag);
}

function legacyTag(rawTag: string, kind: "Navigation" | "Ambiguous" | "Contaminated"): string {
  const digest = sha256(rawTag).slice(0, 12);
  return `${LEGACY_TAG_ROOT}::${kind}::tag_${digest}`;
}

export function applyLegacyDispositions(
  rawTags: readonly string[],
  rules: readonly LegacyDispositionRule[],
  taxonomy: readonly TaxonomyTagNode[],
  policy: TagExportPolicy,
): string[] {
  if (policy.legacyMode === "none") return [];
  const index = taxonomyIndex(taxonomy);
  const rulesByNormalized = new Map<string, LegacyDispositionRule>();
  for (const rule of rules) {
    if (rule.taxonomyVersion !== policy.taxonomyVersion) continue;
    const normalized = normalizeLegacyTag(rule.rawTag);
    if (normalized !== rule.normalizedForm)
      throw new Error(`legacy_normalized_form_mismatch:${rule.rawTag}`);
    if (rulesByNormalized.has(normalized))
      throw new Error(`duplicate_legacy_disposition:${normalized}`);
    rulesByNormalized.set(normalized, rule);
  }

  const output: string[] = [];
  for (const rawTag of sortedUnique(rawTags)) {
    const rule = rulesByNormalized.get(normalizeLegacyTag(rawTag));
    if (!rule) continue;
    if (["map_exact", "map_split", "source_only", "workflow_only"].includes(rule.disposition)) {
      for (const targetId of rule.canonicalTargetIds) {
        const target = index.get(targetId);
        if (!target) throw new Error(`unknown_legacy_target:${targetId}`);
        output.push(...exportableParentClosure(target, taxonomy));
      }
    }
    if (rule.disposition === "navigation_only" && policy.navigationLegacyMode === "quarantine")
      output.push(legacyTag(rawTag, "Navigation"));
    if (rule.disposition === "ambiguous") output.push(legacyTag(rawTag, "Ambiguous"));
    if (rule.disposition === "contaminated") output.push(legacyTag(rawTag, "Contaminated"));
  }
  return sortedUnique(output.filter((tag) => workflowAllowed(tag, policy)));
}

export function renderCardTagManifest(
  input: CardTagRenderInput,
  taxonomy: readonly TaxonomyTagNode[],
  policy: TagExportPolicy,
  legacyRules: readonly LegacyDispositionRule[] = [],
): CardTagManifest {
  const index = taxonomyIndex(taxonomy);
  const assertions = input.assertions
    .filter(
      (assertion) =>
        assertion.status === "accepted" &&
        assertion.canonicalCardVersionId === input.canonicalCardVersionId,
    )
    .sort((a, b) => compareText(a.assertionId, b.assertionId));
  const generated: string[] = [];
  for (const assertion of assertions) {
    const node = index.get(assertion.canonicalEntityId);
    if (!node) throw new Error(`unknown_assertion_entity:${assertion.canonicalEntityId}`);
    generated.push(...exportableParentClosure(node, taxonomy));
  }
  generated.push(
    ...applyLegacyDispositions(input.rawTags ?? [], legacyRules, taxonomy, policy),
  );
  const generatedTags = sortedUnique(generated.filter((tag) => workflowAllowed(tag, policy)));
  const core = {
    canonicalCardVersionId: input.canonicalCardVersionId,
    generatedTags,
    assertionIds: assertions.map((assertion) => assertion.assertionId),
    taxonomyVersion: policy.taxonomyVersion,
    exportPolicyVersion: policy.version,
  };
  return { ...core, checksum: sha256(stable(core)) };
}

/**
 * Replaces only the SnapOrtho managed namespace. All personal/source tags and
 * quarantined Legacy tags already present in a collection remain user-owned.
 */
export function reconcileManagedTags(
  existingTags: readonly string[],
  generatedTags: readonly string[],
): string[] {
  const preserved = existingTags.filter((tag) => !tag.startsWith(`${MANAGED_TAG_ROOT}::`));
  const managed = generatedTags.filter((tag) => tag.startsWith(`${MANAGED_TAG_ROOT}::`));
  return sortedUnique([...preserved, ...managed]);
}

export function diffCardTags(
  canonicalCardVersionId: string,
  previousTags: readonly string[],
  nextTags: readonly string[],
): CardTagDiff {
  const previous = new Set(previousTags);
  const next = new Set(nextTags);
  const core = {
    canonicalCardVersionId,
    added: sortedUnique([...next].filter((tag) => !previous.has(tag))),
    removed: sortedUnique([...previous].filter((tag) => !next.has(tag))),
    unchanged: sortedUnique([...next].filter((tag) => previous.has(tag))),
  };
  return { ...core, checksum: sha256(stable(core)) };
}

export function buildTagReleaseManifest(
  manifests: readonly CardTagManifest[],
  policy: TagExportPolicy,
): {
  contractVersion: "snaportho-anki-tag-manifest.v1";
  taxonomyVersion: string;
  exportPolicyVersion: string;
  cards: CardTagManifest[];
  checksum: string;
} {
  const cards = [...manifests].sort((a, b) =>
    compareText(a.canonicalCardVersionId, b.canonicalCardVersionId),
  );
  const core = {
    contractVersion: "snaportho-anki-tag-manifest.v1" as const,
    taxonomyVersion: policy.taxonomyVersion,
    exportPolicyVersion: policy.version,
    cards,
  };
  return { ...core, checksum: sha256(stable(core)) };
}
