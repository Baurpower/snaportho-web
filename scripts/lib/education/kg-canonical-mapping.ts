/**
 * Canonical mapping read-preference helpers.
 *
 * During the legacy-ontology retargeting transition, an educational object
 * (card or question) may have:
 *   - a NEW canonical-entity mapping (card_canonical_entity_links /
 *     question_canonical_entity_links), and/or
 *   - a LEGACY mapping (card_knowledge_links /
 *     external_question_curriculum_mappings) via curriculum_node (or concept,
 *     though 0 concepts exist today).
 *
 * The read preference is: use the canonical-entity mapping when present, else
 * fall back to the legacy mapping. This module is pure (no IO) so it is
 * unit-testable and safe to import anywhere. Scripts load the rows (paginated)
 * and pass them in. Per the rollout plan, only reports consume this for now —
 * BroBot / Student Workspace reads are unchanged until the reports prove stable.
 */

export type CanonicalEntityLinkRow = {
  /** canonical_card_id or external_question_id */
  objectId: string;
  canonical_entity_id: string;
  is_active: boolean;
  review_status: string;
};

export type LegacyMappingRow = {
  /** canonical_card_id or external_question_id */
  objectId: string;
  curriculum_node_id: string | null;
  concept_id: string | null;
  is_active: boolean;
};

export type PreferredSource = "canonical" | "legacy" | "none";

export type MappingResolution = {
  objectId: string;
  hasCanonical: boolean;
  hasLegacy: boolean;
  preferredSource: PreferredSource;
  /** Canonical entity ids (the preferred target) when hasCanonical. */
  canonicalEntityIds: string[];
  /** Legacy curriculum-node ids used as fallback when no canonical mapping. */
  legacyCurriculumNodeIds: string[];
  /** Legacy concept ids (empty in practice today — 0 concepts). */
  legacyConceptIds: string[];
};

function groupBy<T>(rows: T[], key: (row: T) => string) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    const bucket = map.get(k) ?? [];
    bucket.push(row);
    map.set(k, bucket);
  }
  return map;
}

/**
 * Resolve the preferred mapping for every object that has any mapping (canonical
 * or legacy). Objects with neither are simply absent from the result map; pass
 * the full id universe to `summarizeMappingCoverage` to count unmapped objects.
 */
export function resolveMappings(
  canonicalLinks: CanonicalEntityLinkRow[],
  legacyMappings: LegacyMappingRow[]
): Map<string, MappingResolution> {
  const activeCanonical = canonicalLinks.filter((row) => row.is_active);
  const activeLegacy = legacyMappings.filter((row) => row.is_active);

  const canonicalByObject = groupBy(activeCanonical, (row) => row.objectId);
  const legacyByObject = groupBy(activeLegacy, (row) => row.objectId);

  const objectIds = new Set<string>([...canonicalByObject.keys(), ...legacyByObject.keys()]);
  const result = new Map<string, MappingResolution>();

  for (const objectId of objectIds) {
    const canonicalRows = canonicalByObject.get(objectId) ?? [];
    const legacyRows = legacyByObject.get(objectId) ?? [];
    const hasCanonical = canonicalRows.length > 0;
    const hasLegacy = legacyRows.length > 0;

    result.set(objectId, {
      objectId,
      hasCanonical,
      hasLegacy,
      preferredSource: hasCanonical ? "canonical" : hasLegacy ? "legacy" : "none",
      canonicalEntityIds: [...new Set(canonicalRows.map((row) => row.canonical_entity_id))],
      legacyCurriculumNodeIds: [
        ...new Set(legacyRows.map((row) => row.curriculum_node_id).filter((v): v is string => Boolean(v))),
      ],
      legacyConceptIds: [
        ...new Set(legacyRows.map((row) => row.concept_id).filter((v): v is string => Boolean(v))),
      ],
    });
  }

  return result;
}

export type MappingCoverageSummary = {
  totalObjects: number;
  canonicalMapped: number;
  legacyOnly: number;
  dualMapped: number;
  unmapped: number;
};

/**
 * Aggregate coverage across the full id universe of objects (e.g. all active
 * canonical_cards or all active external_questions).
 */
export function summarizeMappingCoverage(
  allObjectIds: string[],
  canonicalLinks: CanonicalEntityLinkRow[],
  legacyMappings: LegacyMappingRow[]
): MappingCoverageSummary {
  const resolutions = resolveMappings(canonicalLinks, legacyMappings);
  let canonicalMapped = 0;
  let legacyOnly = 0;
  let dualMapped = 0;
  let unmapped = 0;

  for (const objectId of allObjectIds) {
    const resolution = resolutions.get(objectId);
    if (!resolution || resolution.preferredSource === "none") {
      unmapped += 1;
      continue;
    }
    if (resolution.hasCanonical && resolution.hasLegacy) {
      dualMapped += 1;
    }
    if (resolution.hasCanonical) {
      canonicalMapped += 1;
    } else if (resolution.hasLegacy) {
      legacyOnly += 1;
    }
  }

  return {
    totalObjects: allObjectIds.length,
    canonicalMapped,
    legacyOnly,
    dualMapped,
    unmapped,
  };
}
