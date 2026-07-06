import type { ProposalRecord } from "../../../kg-automation-common.ts";
import {
  expandRequirementsForNeighborhood,
  maturityImpactForPriority,
  reviewerForGap,
  type EntityShapeRequirements,
  type NeighborhoodLevelRequirement,
} from "./ontology-requirements.ts";
import type { GapKind, GapPriority, NeighborhoodSnapshot, OntologyGap } from "./types.ts";

let gapCounter = 0;

function nextGapId(prefix: string) {
  gapCounter += 1;
  return `${prefix}-${gapCounter}`;
}

function resetGapCounter() {
  gapCounter = 0;
}

function countPredicates(
  snapshot: NeighborhoodSnapshot,
  slug: string,
  predicate: string,
  direction: "outbound" | "inbound",
  filter?: { entityTypes?: string[]; side: "subject" | "object" }
): number {
  const rels =
    direction === "outbound"
      ? snapshot.relationships.filter((r) => r.subjectSlug === slug && r.predicate === predicate)
      : snapshot.relationships.filter((r) => r.objectSlug === slug && r.predicate === predicate);

  if (!filter?.entityTypes?.length) return rels.length;

  const entityBySlug = new Map(snapshot.entities.map((e) => [e.slug, e]));
  return rels.filter((r) => {
    const otherSlug = filter.side === "object" ? r.objectSlug : r.subjectSlug;
    const other = entityBySlug.get(otherSlug);
    return other && filter.entityTypes!.includes(other.entityType);
  }).length;
}

function countNeighborEntities(
  snapshot: NeighborhoodSnapshot,
  anchorSlug: string,
  entityType: string,
  anchorEntityType?: string
): number {
  const linked = new Set<string>();
  for (const rel of snapshot.relationships) {
    if (rel.subjectSlug === anchorSlug) {
      const obj = snapshot.entities.find((e) => e.slug === rel.objectSlug);
      if (obj?.entityType === entityType) linked.add(obj.slug);
    }
    if (rel.objectSlug === anchorSlug) {
      const subj = snapshot.entities.find((e) => e.slug === rel.subjectSlug);
      if (subj?.entityType === entityType) linked.add(subj.slug);
    }
  }

  // Classification systems and pilot neighborhoods: co-located entities count
  // even before grade→system edges are authored.
  if (
    linked.size === 0 &&
    (anchorEntityType === "classification_system" || entityType === "classification_grade")
  ) {
    for (const entity of snapshot.entities) {
      if (entity.entityType === entityType) linked.add(entity.slug);
    }
  }

  return linked.size;
}

function analyzeEntityGaps(
  snapshot: NeighborhoodSnapshot,
  slug: string,
  requirements: EntityShapeRequirements
): OntologyGap[] {
  const gaps: OntologyGap[] = [];
  const entity = snapshot.entities.find((e) => e.slug === slug);
  if (!entity) return gaps;

  for (const neighbor of requirements.neighborEntities) {
    if (neighbor.optional) continue;
    const count = countNeighborEntities(snapshot, slug, neighbor.entityType, entity.entityType);
    if (count < neighbor.minCount) {
      gaps.push({
        id: nextGapId("gap-entity-neighbor"),
        kind: "missing_entity",
        priority: neighbor.priority,
        confidence: 0.95,
        reason: `${entity.preferredLabel} neighborhood has ${count}/${neighbor.minCount} ${neighbor.entityType} entities.`,
        requiredReviewer: reviewerForGap("missing_entity", neighbor.priority),
        maturityImpact: maturityImpactForPriority(neighbor.priority),
        ontologyRule: neighbor.ruleId,
        anchorEntitySlug: slug,
        entityType: neighbor.entityType,
      });
    }
  }

  for (const pred of requirements.predicates) {
    if ((pred as { optional?: boolean }).optional) continue;
    const filter =
      pred.direction === "outbound"
        ? pred.objectEntityTypes
          ? { entityTypes: pred.objectEntityTypes, side: "object" as const }
          : undefined
        : pred.subjectEntityTypes
          ? { entityTypes: pred.subjectEntityTypes, side: "subject" as const }
          : undefined;

    const count = countPredicates(snapshot, slug, pred.predicate, pred.direction, filter);
    if (count < pred.minCount) {
      gaps.push({
        id: nextGapId("gap-rel"),
        kind: "missing_relationship",
        priority: pred.priority,
        confidence: 0.92,
        reason: `${entity.preferredLabel} missing ${pred.direction} ${pred.predicate} (${count}/${pred.minCount}).`,
        requiredReviewer: reviewerForGap("missing_relationship", pred.priority, pred.predicate),
        maturityImpact: maturityImpactForPriority(pred.priority),
        ontologyRule: pred.ruleId,
        anchorEntitySlug: slug,
        subjectSlug: pred.direction === "outbound" ? slug : undefined,
        predicate: pred.predicate,
        objectSlug: pred.direction === "inbound" ? slug : undefined,
      });
    }
  }

  if (requirements.claims && requirements.claims.minL1Count > 0) {
    const entityClaims = snapshot.claims.filter((c) => c.primaryEntitySlug === slug);
    const l1Claims = entityClaims.filter((c) => c.importanceLevel === "L1");
    if (l1Claims.length < requirements.claims.minL1Count) {
      gaps.push({
        id: nextGapId("gap-claim"),
        kind: "missing_claim",
        priority: requirements.claims.priority,
        confidence: 0.88,
        reason: `${entity.preferredLabel} has ${l1Claims.length}/${requirements.claims.minL1Count} L1 claims.`,
        requiredReviewer: reviewerForGap("missing_claim", requirements.claims.priority),
        maturityImpact: maturityImpactForPriority(requirements.claims.priority),
        ontologyRule: requirements.claims.ruleId,
        anchorEntitySlug: slug,
        claimType: requirements.claims.claimTypes.join("|"),
      });
    }

    for (const claimType of requirements.claims.claimTypes) {
      const hasType = entityClaims.some((c) => c.claimType === claimType);
      if (!hasType && requirements.claims.minL1Count > 0) {
        gaps.push({
          id: nextGapId("gap-claim-type"),
          kind: "missing_claim",
          priority: "medium",
          confidence: 0.75,
          reason: `${entity.preferredLabel} missing claim type: ${claimType}.`,
          requiredReviewer: reviewerForGap("missing_claim", "medium"),
          maturityImpact: maturityImpactForPriority("medium"),
          ontologyRule: `${requirements.claims.ruleId}.${claimType}`,
          anchorEntitySlug: slug,
          claimType,
        });
      }
    }
  }

  if (requirements.decisionPoints && requirements.decisionPoints.minCount > 0) {
    const entityDps = snapshot.decisionPoints.filter((dp) => dp.subjectEntitySlug === slug);
    if (entityDps.length < requirements.decisionPoints.minCount) {
      gaps.push({
        id: nextGapId("gap-dp"),
        kind: "missing_decision_point",
        priority: requirements.decisionPoints.priority,
        confidence: 0.9,
        reason: `${entity.preferredLabel} has ${entityDps.length}/${requirements.decisionPoints.minCount} decision points.`,
        requiredReviewer: "attending",
        maturityImpact: maturityImpactForPriority(requirements.decisionPoints.priority),
        ontologyRule: requirements.decisionPoints.ruleId,
        anchorEntitySlug: slug,
      });
    }
    for (const pattern of requirements.decisionPoints.patternTypes) {
      if (!entityDps.some((dp) => dp.patternType === pattern)) {
        gaps.push({
          id: nextGapId("gap-dp-pattern"),
          kind: "missing_decision_point",
          priority: requirements.decisionPoints.priority,
          confidence: 0.85,
          reason: `${entity.preferredLabel} missing decision point pattern: ${pattern}.`,
          requiredReviewer: "attending",
          maturityImpact: maturityImpactForPriority(requirements.decisionPoints.priority),
          ontologyRule: `${requirements.decisionPoints.ruleId}.${pattern}`,
          anchorEntitySlug: slug,
          decisionPointPattern: pattern,
        });
      }
    }
  }

  for (const meta of requirements.metadata) {
    if (meta.scope === "entity") {
      if (entity.metadata[meta.field] == null) {
        gaps.push({
          id: nextGapId("gap-meta-entity"),
          kind: "missing_metadata",
          priority: meta.priority,
          confidence: 0.98,
          reason: `Entity ${entity.preferredLabel} missing metadata field: ${meta.field}.`,
          requiredReviewer: reviewerForGap("missing_metadata", meta.priority),
          maturityImpact: maturityImpactForPriority(meta.priority),
          ontologyRule: meta.ruleId,
          anchorEntitySlug: slug,
          metadataField: meta.field,
        });
      }
    }

    if (meta.scope === "relationship" && meta.relationshipPredicates?.length) {
      const rels = snapshot.relationships.filter(
        (r) =>
          r.subjectSlug === slug && meta.relationshipPredicates!.includes(r.predicate)
      );
      const missingMeta = rels.filter((r) => r.metadata?.[meta.field] == null);
      if (rels.length > 0 && missingMeta.length > 0) {
        gaps.push({
          id: nextGapId("gap-meta-rel"),
          kind: "missing_metadata",
          priority: meta.priority,
          confidence: 0.9,
          reason: `${missingMeta.length} ${meta.field} gaps on ${entity.preferredLabel} ${meta.relationshipPredicates.join("/")} edges.`,
          requiredReviewer: reviewerForGap("missing_metadata", meta.priority),
          maturityImpact: maturityImpactForPriority(meta.priority),
          ontologyRule: meta.ruleId,
          anchorEntitySlug: slug,
          metadataField: meta.field,
          predicate: meta.relationshipPredicates.join("|"),
        });
      }
    }
  }

  return gaps;
}

function analyzeNeighborhoodGaps(
  snapshot: NeighborhoodSnapshot,
  requirements: NeighborhoodLevelRequirement[],
  proposals: ProposalRecord[]
): OntologyGap[] {
  const gaps: OntologyGap[] = [];

  for (const req of requirements) {
    if (req.kind === "asset_link") {
      const hasCards =
        snapshot.assets.linkedCardProposals > 0 ||
        proposals.some((p) => p.proposal_type === "retarget_card_to_entity");
      const hasQuestions =
        snapshot.assets.linkedQuestionProposals > 0 ||
        proposals.some((p) => p.proposal_type === "retarget_question_to_entity");

      if (req.ruleId.includes("cards") && !hasCards && snapshot.assets.ankiCardMappings > 0) {
        gaps.push({
          id: nextGapId("gap-asset-card"),
          kind: "missing_asset_link",
          priority: req.priority,
          confidence: 0.8,
          reason: `${snapshot.assets.ankiCardMappings} Anki mappings exist but no card link proposals in neighborhood.`,
          requiredReviewer: "curator",
          maturityImpact: maturityImpactForPriority(req.priority),
          ontologyRule: req.ruleId,
          anchorEntitySlug: snapshot.primaryEntitySlug,
        });
      }
      if (
        req.ruleId.includes("questions") &&
        !hasQuestions &&
        snapshot.assets.orthobulletsQuestionMappings > 0
      ) {
        gaps.push({
          id: nextGapId("gap-asset-question"),
          kind: "missing_asset_link",
          priority: req.priority,
          confidence: 0.8,
          reason: `${snapshot.assets.orthobulletsQuestionMappings} question mappings exist but no question link proposals.`,
          requiredReviewer: "curator",
          maturityImpact: maturityImpactForPriority(req.priority),
          ontologyRule: req.ruleId,
          anchorEntitySlug: snapshot.primaryEntitySlug,
        });
      }
    }

    if (req.kind === "provenance") {
      const missingProv = proposals.filter(
        (p) => !p.evidence_summary && !(p.source_signal_ids?.length)
      );
      if (missingProv.length > 0) {
        gaps.push({
          id: nextGapId("gap-provenance"),
          kind: "missing_provenance",
          priority: req.priority,
          confidence: 0.95,
          reason: `${missingProv.length} proposals lack provenance signals.`,
          requiredReviewer: "curator",
          maturityImpact: maturityImpactForPriority(req.priority),
          ontologyRule: req.ruleId,
        });
      }
    }

    if (req.kind === "curriculum_bridge") {
      const bridgeCount = proposals.filter(
        (p) => p.proposal_type === "link_curriculum_node_to_entity"
      ).length;
      if (bridgeCount < (req.minCount ?? 1)) {
        gaps.push({
          id: nextGapId("gap-bridge"),
          kind: "missing_relationship",
          priority: req.priority,
          confidence: 0.7,
          reason: "Curriculum bridge proposal missing or not yet approved.",
          requiredReviewer: "curator",
          maturityImpact: maturityImpactForPriority(req.priority),
          ontologyRule: req.ruleId,
          anchorEntitySlug: snapshot.primaryEntitySlug,
          predicate: "covered_by_curriculum_node",
        });
      }
    }
  }

  // Grade completeness: all grades in neighborhood should link to condition when system exists
  const grades = snapshot.entities.filter((e) => e.entityType === "classification_grade");
  const primary = snapshot.primaryEntitySlug;
  for (const grade of grades) {
    const linked = snapshot.relationships.some(
      (r) =>
        r.subjectSlug === primary &&
        r.predicate === "has_grade" &&
        r.objectSlug === grade.slug
    );
    if (!linked) {
      gaps.push({
        id: nextGapId("gap-grade-link"),
        kind: "missing_relationship",
        priority: "medium",
        confidence: 0.85,
        reason: `Classification grade ${grade.preferredLabel} exists but is not linked via has_grade from primary condition.`,
        requiredReviewer: "curator",
        maturityImpact: maturityImpactForPriority("medium"),
        ontologyRule: "classification.grade.link_all",
        anchorEntitySlug: primary,
        subjectSlug: primary,
        predicate: "has_grade",
        objectSlug: grade.slug,
      });
    }
  }

  // Biomechanics concept claims
  for (const entity of snapshot.entities.filter((e) => e.entityType === "biomechanics_concept")) {
    const claims = snapshot.claims.filter((c) => c.primaryEntitySlug === entity.slug);
    if (claims.length === 0) {
      gaps.push({
        id: nextGapId("gap-biomech-claim"),
        kind: "missing_claim",
        priority: "medium",
        confidence: 0.82,
        reason: `Biomechanics concept ${entity.preferredLabel} has no teaching claim (e.g., mortise instability).`,
        requiredReviewer: "clinical_expert",
        maturityImpact: maturityImpactForPriority("medium"),
        ontologyRule: "biomechanics.claims",
        anchorEntitySlug: entity.slug,
        claimType: "fact",
      });
    }
  }

  // Procedure approach/implant gaps
  for (const proc of snapshot.entities.filter((e) => e.entityType === "procedure")) {
    const hasApproach = snapshot.relationships.some(
      (r) => r.subjectSlug === proc.slug && r.predicate === "uses_approach"
    );
    if (!hasApproach) {
      gaps.push({
        id: nextGapId("gap-proc-approach"),
        kind: "missing_relationship",
        priority: "medium",
        confidence: 0.78,
        reason: `Procedure ${proc.preferredLabel} missing uses_approach edge.`,
        requiredReviewer: "clinical_expert",
        maturityImpact: maturityImpactForPriority("medium"),
        ontologyRule: "procedure.pred.uses_approach",
        anchorEntitySlug: proc.slug,
        subjectSlug: proc.slug,
        predicate: "uses_approach",
      });
    }
  }

  return gaps;
}

export function analyzeGaps(
  snapshot: NeighborhoodSnapshot,
  proposals: ProposalRecord[] = []
): OntologyGap[] {
  resetGapCounter();
  const expanded = expandRequirementsForNeighborhood(snapshot);
  const gaps: OntologyGap[] = [];

  // Primary entity and procedure anchors get full shape analysis
  const prioritySlugs = new Set([
    snapshot.primaryEntitySlug,
    ...snapshot.entities.filter((e) => e.entityType === "procedure").map((e) => e.slug),
    ...snapshot.entities
      .filter((e) => e.entityType === "anatomy_structure" && e.metadata.hierarchy_level)
      .map((e) => e.slug),
    ...snapshot.entities.filter((e) => e.entityType === "biomechanics_concept").map((e) => e.slug),
    ...snapshot.entities.filter((e) => e.entityType === "classification_system").map((e) => e.slug),
  ]);

  for (const { entity, requirements } of expanded.entityRequirements) {
    if (!requirements || !prioritySlugs.has(entity.slug)) continue;
    gaps.push(...analyzeEntityGaps(snapshot, entity.slug, requirements));
  }

  gaps.push(...analyzeNeighborhoodGaps(snapshot, expanded.neighborhoodRequirements, proposals));

  // Deduplicate by reason+kind+anchor
  const seen = new Set<string>();
  return gaps.filter((g) => {
    const key = `${g.kind}|${g.ontologyRule}|${g.anchorEntitySlug ?? ""}|${g.predicate ?? ""}|${g.objectSlug ?? ""}|${g.claimType ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function summarizeGaps(gaps: OntologyGap[]) {
  const byKind = {} as Record<GapKind, number>;
  const byPriority = {} as Record<GapPriority, number>;
  for (const gap of gaps) {
    byKind[gap.kind] = (byKind[gap.kind] ?? 0) + 1;
    byPriority[gap.priority] = (byPriority[gap.priority] ?? 0) + 1;
  }
  return { total: gaps.length, byKind, byPriority };
}