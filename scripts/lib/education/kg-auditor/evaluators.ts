import type { ProposalRecord } from "../../../kg-automation-common.ts";
import { HIGH_RISK_PREDICATES, validateRelationshipTriple } from "../kg-relationship-registry.ts";
import type {
  AuditInputBundle,
  AgentReportCard,
  AuditDeduction,
  CategoryAuditResult,
  CompilerReportCard,
  PublicationAuditResult,
} from "./types.ts";
import { clampScore, gradeFromScore, makeDeduction, scoreFromDeductions } from "./scoring.ts";

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

function entityBySlug(input: AuditInputBundle) {
  return new Map(input.mergedDraft.entities.map((e) => [e.slug, e]));
}

export function evaluateOntologyCompleteness(input: AuditInputBundle): CategoryAuditResult {
  const deductions: AuditDeduction[] = [];
  const gaps = input.gaps;
  const totalGaps = gaps.length;

  const byPriority = {
    critical: gaps.filter((g) => g.priority === "critical").length,
    high: gaps.filter((g) => g.priority === "high").length,
    medium: gaps.filter((g) => g.priority === "medium").length,
    low: gaps.filter((g) => g.priority === "low").length,
  };

  if (byPriority.critical > 0) {
    deductions.push(
      makeDeduction({
        finding: `${byPriority.critical} critical ontology gaps remain`,
        evidence: `ontology-gap-report.json: ${gaps
          .filter((g) => g.priority === "critical")
          .slice(0, 3)
          .map((g) => g.id)
          .join(", ")}`,
        reason: "Required entities, relationships, claims, or decision points are missing per CKO §8–§9.",
        severity: "critical",
        category: "ontology_completeness",
        suggestedFix: "Resolve critical gaps via assigned factory agents before publication review.",
      })
    );
  }

  if (byPriority.high > 0) {
    deductions.push(
      makeDeduction({
        finding: `${byPriority.high} high-priority ontology gaps`,
        evidence: `Gap kinds: ${[...new Set(gaps.filter((g) => g.priority === "high").map((g) => g.kind))].join(", ")}`,
        reason: "High-priority gaps block maturity level advancement.",
        severity: "high",
        category: "ontology_completeness",
        impact: Math.min(12, byPriority.high * 2),
        suggestedFix: "Schedule gap-resolution work items from ontology-work-plan.json.",
      })
    );
  }

  const missingKinds = [...new Set(gaps.map((g) => g.kind))];
  for (const kind of ["missing_entity", "missing_relationship", "missing_claim", "missing_decision_point"] as const) {
    if (missingKinds.includes(kind)) {
      const count = gaps.filter((g) => g.kind === kind).length;
      deductions.push(
        makeDeduction({
          finding: `Missing ${kind.replace("missing_", "")} requirements (${count})`,
          evidence: `${count} gaps of kind ${kind}`,
          reason: `Ontology contract requires complete ${kind.replace("missing_", "")} coverage.`,
          severity: count > 3 ? "high" : "medium",
          category: "ontology_completeness",
          impact: Math.min(8, count),
          suggestedFix: `Run the matching builder agent for ${kind}.`,
        })
      );
    }
  }

  if (input.reportsMissing.includes("ontology-gap-report.json")) {
    deductions.push(
      makeDeduction({
        finding: "No compiler gap report available",
        evidence: "ontology-gap-report.json missing from reports/kg-compiler",
        reason: "Auditor cannot verify ontology completeness without compiler gap analysis.",
        severity: "high",
        category: "ontology_completeness",
        suggestedFix: "Run npm run kg:compile -- --topic <topic> to generate gap report.",
      })
    );
  }

  const anatomyCount = input.mergedDraft.entities.filter((e) => e.entityType === "anatomy_structure").length;
  if (anatomyCount < 3) {
    deductions.push(
      makeDeduction({
        finding: `Only ${anatomyCount} anatomy structures (minimum 3 required)`,
        evidence: `Entity slugs: ${input.mergedDraft.entities
          .filter((e) => e.entityType === "anatomy_structure")
          .map((e) => e.slug)
          .join(", ")}`,
        reason: "Condition neighborhoods require regional anatomy per condition.anatomy.min_structures.",
        severity: "critical",
        category: "ontology_completeness",
        affectedSlugs: [input.primaryEntitySlug],
        suggestedFix: "Add essential regional anatomy via anatomy builder or shared anatomy reuse.",
      })
    );
  }

  const classificationCount = input.mergedDraft.entities.filter(
    (e) => e.entityType === "classification_system" || e.entityType === "classification_grade"
  ).length;
  if (classificationCount < 1) {
    deductions.push(
      makeDeduction({
        finding: "No classification system present",
        evidence: `0 classification entities in merged draft`,
        reason: "Fracture diagnoses require classification when one exists clinically.",
        severity: "high",
        category: "ontology_completeness",
        suggestedFix: "Link has_classification and has_grade edges to a classification system.",
      })
    );
  }

  const completenessRatio = totalGaps === 0 ? 1 : Math.max(0, 1 - totalGaps / 30);
  return scoreFromDeductions("ontology_completeness", deductions, {
    totalGaps,
    criticalGaps: byPriority.critical,
    highGaps: byPriority.high,
    anatomyStructures: anatomyCount,
    classificationEntities: classificationCount,
    completenessRatio,
  });
}

export function evaluateEvidenceQuality(input: AuditInputBundle): CategoryAuditResult {
  const deductions: AuditDeduction[] = [];
  const packet = input.evidencePacket;
  const proposals = input.proposals;

  if (!packet) {
    deductions.push(
      makeDeduction({
        finding: "No evidence packet loaded",
        evidence: "reports/kg-evidence/<topic>/evidence-packet.json not found",
        reason: "Factory agents and proposals cannot be verified against source evidence.",
        severity: "high",
        category: "evidence_quality",
        suggestedFix: "Run npm run kg:evidence -- --topic <topic> before auditing.",
      })
    );
    return scoreFromDeductions("evidence_quality", deductions, { evidencePacketLoaded: false });
  }

  const evidenceItems = packet.sourceEvidence ?? [];
  const evidenceIds = new Set(evidenceItems.map((e) => e.evidenceId));
  const proposalsWithEvidence = proposals.filter((p) => {
    const refs = (p.metadata?.evidence_refs as string[] | undefined) ?? [];
    return refs.length > 0;
  });
  const coverage = proposals.length === 0 ? 1 : proposalsWithEvidence.length / proposals.length;

  if (coverage < 0.5) {
    deductions.push(
      makeDeduction({
        finding: `Low evidence coverage (${Math.round(coverage * 100)}% of proposals cite evidence)`,
        evidence: `${proposalsWithEvidence.length}/${proposals.length} proposals have evidence_refs`,
        reason: "Every proposal should cite supporting evidence per factory contract.",
        severity: coverage < 0.25 ? "critical" : "high",
        category: "evidence_quality",
        suggestedFix: "Ensure claim/relationship builders attach evidence_refs from the evidence packet.",
      })
    );
  }

  const sourceTypes = new Set(evidenceItems.map((e) => e.sourceType));
  if (sourceTypes.size < 2) {
    deductions.push(
      makeDeduction({
        finding: "Low evidence diversity",
        evidence: `Source types: ${[...sourceTypes].join(", ") || "none"}`,
        reason: "Neighborhoods should draw from multiple evidence channels (Prepare, Anki, Orthobullets, etc.).",
        severity: "medium",
        category: "evidence_quality",
        suggestedFix: "Expand evidence collectors to include curriculum, case prep, and quality signals.",
      })
    );
  }

  const staleThreshold = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const staleItems = evidenceItems.filter((e) => {
    const collected = Date.parse(e.collectedAt ?? "");
    return Number.isFinite(collected) && collected < staleThreshold;
  });
  if (staleItems.length > evidenceItems.length * 0.5) {
    deductions.push(
      makeDeduction({
        finding: "Evidence freshness concern",
        evidence: `${staleItems.length}/${evidenceItems.length} evidence items older than 1 year`,
        reason: "Stale evidence may not reflect current board or clinical practice standards.",
        severity: "medium",
        category: "evidence_quality",
        suggestedFix: "Refresh evidence packet with recent Orthobullets and curriculum signals.",
      })
    );
  }

  const provenanceComplete = evidenceItems.filter((e) => e.provenanceHint?.length > 0).length;
  const provenanceRate = evidenceItems.length ? provenanceComplete / evidenceItems.length : 0;
  if (provenanceRate < 0.8) {
    deductions.push(
      makeDeduction({
        finding: "Incomplete evidence provenance",
        evidence: `${Math.round(provenanceRate * 100)}% of evidence items have generator provenance`,
        reason: "Evidence provenance is required for auditability and review calibration.",
        severity: "medium",
        category: "evidence_quality",
        suggestedFix: "Ensure all collectors stamp generator and timestamp on evidence items.",
      })
    );
  }

  const referencedIds = new Set(
    proposals.flatMap((p) => (p.metadata?.evidence_refs as string[] | undefined) ?? [])
  );
  const reuseCount = evidenceItems.filter((e) => referencedIds.has(e.evidenceId)).length;
  const reuseRate = evidenceItems.length ? reuseCount / evidenceItems.length : 0;

  return scoreFromDeductions("evidence_quality", deductions, {
    evidencePacketLoaded: true,
    evidenceItemCount: evidenceItems.length,
    evidenceCoverage: coverage,
    sourceTypeCount: sourceTypes.size,
    provenanceRate,
    evidenceReuseRate: reuseRate,
    uniqueEvidenceIds: evidenceIds.size,
  });
}

export function evaluateGraphIntegrity(input: AuditInputBundle): CategoryAuditResult {
  const deductions: AuditDeduction[] = [];
  const { entities, relationships } = input.mergedDraft;
  const slugSet = new Set(entities.map((e) => e.slug));
  const bySlug = entityBySlug(input);

  const connected = new Set<string>();
  for (const rel of relationships) {
    connected.add(rel.subjectSlug);
    connected.add(rel.objectSlug);
  }
  const orphans = entities.filter((e) => !connected.has(e.slug) && e.slug !== input.primaryEntitySlug);
  if (orphans.length > 0) {
    deductions.push(
      makeDeduction({
        finding: `${orphans.length} orphan entities with no relationships`,
        evidence: `Slugs: ${orphans.map((e) => e.slug).join(", ")}`,
        reason: "Orphan entities cannot be traversed by products and indicate incomplete graph wiring.",
        severity: orphans.length > 2 ? "high" : "medium",
        category: "graph_integrity",
        affectedSlugs: orphans.map((e) => e.slug),
        suggestedFix: "Add inbound or outbound clinical/anatomy edges, or merge duplicates.",
      })
    );
  }

  const dangling = relationships.filter((r) => !slugSet.has(r.subjectSlug) || !slugSet.has(r.objectSlug));
  if (dangling.length > 0) {
    deductions.push(
      makeDeduction({
        finding: `${dangling.length} dangling edges reference missing entities`,
        evidence: dangling
          .slice(0, 3)
          .map((r) => `${r.subjectSlug} -[${r.predicate}]-> ${r.objectSlug}`)
          .join("; "),
        reason: "Relationships must resolve to entities in the neighborhood graph.",
        severity: "critical",
        category: "graph_integrity",
        suggestedFix: "Create missing entities or remove invalid relationship proposals.",
      })
    );
  }

  const labelGroups = new Map<string, string[]>();
  for (const entity of entities) {
    const key = normalizeLabel(entity.preferredLabel);
    const group = labelGroups.get(key) ?? [];
    group.push(entity.slug);
    labelGroups.set(key, group);
  }
  const duplicateLabels = [...labelGroups.entries()].filter(([, slugs]) => slugs.length > 1);
  if (duplicateLabels.length > 0) {
    deductions.push(
      makeDeduction({
        finding: `${duplicateLabels.length} duplicate entity labels detected`,
        evidence: duplicateLabels
          .slice(0, 3)
          .map(([label, slugs]) => `"${label}": ${slugs.join(", ")}`)
          .join("; "),
        reason: "Duplicate labels suggest fragmented concepts that should be shared canonical entities.",
        severity: "high",
        category: "graph_integrity",
        affectedSlugs: duplicateLabels.flatMap(([, s]) => s),
        suggestedFix: "Merge to shared anatomy slugs and retarget relationships.",
      })
    );
  }

  const relKeys = new Map<string, number>();
  for (const rel of relationships) {
    const key = `${rel.subjectSlug}|${rel.predicate}|${rel.objectSlug}`;
    relKeys.set(key, (relKeys.get(key) ?? 0) + 1);
  }
  const dupRels = [...relKeys.entries()].filter(([, count]) => count > 1);
  if (dupRels.length > 0) {
    deductions.push(
      makeDeduction({
        finding: `${dupRels.length} duplicate relationship triples`,
        evidence: dupRels
          .slice(0, 3)
          .map(([key, count]) => `${key} (×${count})`)
          .join("; "),
        reason: "Duplicate edges add noise without educational value.",
        severity: "medium",
        category: "graph_integrity",
        suggestedFix: "Deduplicate during merge; run duplicate-detector agent.",
      })
    );
  }

  let invalidPredicates = 0;
  for (const rel of relationships) {
    const subj = bySlug.get(rel.subjectSlug);
    const obj = bySlug.get(rel.objectSlug);
    if (!subj || !obj) continue;
    const result = validateRelationshipTriple({
      subjectEndpointType: "canonical_entity",
      subjectEntityType: subj.entityType,
      predicate: rel.predicate,
      objectEndpointType: "canonical_entity",
      objectEntityType: obj.entityType,
    });
    if (!result.valid) invalidPredicates += 1;
  }
  if (invalidPredicates > 0) {
    deductions.push(
      makeDeduction({
        finding: `${invalidPredicates} invalid relationship triples per ontology registry`,
        evidence: `${invalidPredicates}/${relationships.length} relationships fail validateRelationshipTriple`,
        reason: "Invalid predicates or entity type pairings violate the relationship registry.",
        severity: invalidPredicates > 3 ? "critical" : "high",
        category: "graph_integrity",
        suggestedFix: "Correct subject/object entity types or choose valid predicates.",
      })
    );
  }

  const anatomySlugs = entities.filter((e) => e.entityType === "anatomy_structure").map((e) => e.slug);
  const anatomyConnected = anatomySlugs.filter((slug) => connected.has(slug));
  if (anatomySlugs.length > 0 && anatomyConnected.length < anatomySlugs.length) {
    const disconnected = anatomySlugs.filter((s) => !connected.has(s));
    deductions.push(
      makeDeduction({
        finding: `${disconnected.length} disconnected anatomy structures`,
        evidence: `Disconnected: ${disconnected.join(", ")}`,
        reason: "Anatomy must connect to the condition graph for educational traversal.",
        severity: "high",
        category: "graph_integrity",
        affectedSlugs: disconnected,
        suggestedFix: "Add involves_anatomy, injured_in, or part_of edges from condition/procedure anchors.",
      })
    );
  }

  if (input.conflictReport && input.conflictReport.totalConflicts > 0) {
    deductions.push(
      makeDeduction({
        finding: `${input.conflictReport.totalConflicts} merge conflicts detected`,
        evidence: `conflict-report.json: ${input.conflictReport.items
          .slice(0, 2)
          .map((i) => i.description)
          .join("; ")}`,
        reason: "Unresolved merge conflicts indicate inconsistent agent outputs.",
        severity: "high",
        category: "graph_integrity",
        suggestedFix: "Run conflict-resolver agent and reconcile metadata/text conflicts.",
      })
    );
  }

  const validationRate =
    relationships.length === 0 ? 1 : (relationships.length - invalidPredicates) / relationships.length;

  return scoreFromDeductions("graph_integrity", deductions, {
    entityCount: entities.length,
    relationshipCount: relationships.length,
    orphanCount: orphans.length,
    danglingEdgeCount: dangling.length,
    duplicateLabelGroups: duplicateLabels.length,
    invalidPredicateCount: invalidPredicates,
    validationRate,
  });
}

export function evaluateSharedKnowledgeReuse(input: AuditInputBundle): CategoryAuditResult {
  const deductions: AuditDeduction[] = [];
  const anatomyEntities = input.mergedDraft.entities.filter((e) => e.entityType === "anatomy_structure");

  const suspiciousPatterns = anatomyEntities.filter(
    (e) =>
      /-\d+$/.test(e.slug) ||
      e.slug.includes("-upper") ||
      e.slug.includes("-lower") ||
      e.slug.includes("-copy") ||
      e.slug.endsWith("-2")
  );
  if (suspiciousPatterns.length > 0) {
    deductions.push(
      makeDeduction({
        finding: `${suspiciousPatterns.length} anatomy slugs suggest duplication instead of reuse`,
        evidence: `Slugs: ${suspiciousPatterns.map((e) => e.slug).join(", ")}`,
        reason: "Shared anatomy should use canonical slugs (e.g. radial-nerve) not suffixed variants.",
        severity: "high",
        category: "shared_knowledge_reuse",
        affectedSlugs: suspiciousPatterns.map((e) => e.slug),
        suggestedFix: "Retarget relationships to shared anatomy hub slugs from cross-neighborhood registry.",
      })
    );
  }

  const labelGroups = new Map<string, string[]>();
  for (const entity of anatomyEntities) {
    const key = normalizeLabel(entity.preferredLabel);
    const group = labelGroups.get(key) ?? [];
    group.push(entity.slug);
    labelGroups.set(key, group);
  }
  const duplicatedAnatomy = [...labelGroups.entries()].filter(([, slugs]) => slugs.length > 1);
  if (duplicatedAnatomy.length > 0) {
    deductions.push(
      makeDeduction({
        finding: `${duplicatedAnatomy.length} anatomy labels duplicated within neighborhood`,
        evidence: duplicatedAnatomy
          .slice(0, 3)
          .map(([label, slugs]) => `${label}: ${slugs.join(", ")}`)
          .join("; "),
        reason: "Correct pattern is one canonical slug per anatomical concept.",
        severity: "high",
        category: "shared_knowledge_reuse",
        suggestedFix: "Consolidate to shared anatomy and remove neighborhood-specific duplicates.",
      })
    );
  }

  const sharedMeta = anatomyEntities.filter(
    (e) => e.metadata?.shared === true || e.metadata?.anatomy_scope === "shared"
  );
  const reuseRate = anatomyEntities.length ? sharedMeta.length / anatomyEntities.length : 1;

  if (reuseRate < 0.3 && anatomyEntities.length > 5) {
    deductions.push(
      makeDeduction({
        finding: "Low shared anatomy metadata tagging",
        evidence: `${sharedMeta.length}/${anatomyEntities.length} anatomy entities marked shared`,
        reason: "Shared anatomy metadata helps cross-neighborhood consistency and reuse tracking.",
        severity: "low",
        category: "shared_knowledge_reuse",
        suggestedFix: "Tag reused anatomy with metadata.shared=true and link to anatomy hubs.",
      })
    );
  }

  return scoreFromDeductions("shared_knowledge_reuse", deductions, {
    anatomyEntityCount: anatomyEntities.length,
    suspiciousSlugCount: suspiciousPatterns.length,
    duplicatedLabelCount: duplicatedAnatomy.length,
    sharedMetadataRate: reuseRate,
  });
}

export function evaluateRelationshipQuality(input: AuditInputBundle): CategoryAuditResult {
  const deductions: AuditDeduction[] = [];
  const { relationships, entities } = input.mergedDraft;
  const bySlug = entityBySlug(input);
  const primary = input.primaryEntitySlug;

  const primaryOutbound = relationships.filter((r) => r.subjectSlug === primary);
  const clinicalPredicates = new Set([
    "injured_in",
    "has_classification",
    "has_imaging_finding",
    "at_risk_structure",
    "treated_by",
    "has_complication",
  ]);
  const missingClinical = [...clinicalPredicates].filter(
    (p) => !primaryOutbound.some((r) => r.predicate === p)
  );
  for (const pred of missingClinical) {
    deductions.push(
      makeDeduction({
        finding: `Missing clinical edge: ${pred}`,
        evidence: `0 outbound ${pred} edges from ${primary}`,
        reason: "Core diagnosis neighborhoods require standard clinical relationship patterns.",
        severity: pred === "injured_in" || pred === "has_classification" ? "critical" : "high",
        category: "relationship_quality",
        affectedSlugs: [primary],
        suggestedFix: `Add ${pred} relationship via relationship-builder agent.`,
      })
    );
  }

  const density = relationships.length / Math.max(entities.length, 1);
  if (density < 1.2) {
    deductions.push(
      makeDeduction({
        finding: "Low relationship density",
        evidence: `${relationships.length} relationships / ${entities.length} entities = ${density.toFixed(2)}`,
        reason: "Sparse graphs limit educational traversal and reasoning support.",
        severity: "medium",
        category: "relationship_quality",
        suggestedFix: "Add metadata-rich clinical and anatomy edges to improve connectivity.",
      })
    );
  } else if (density > 4) {
    deductions.push(
      makeDeduction({
        finding: "High relationship density may indicate overlinking",
        evidence: `Density ${density.toFixed(2)} exceeds recommended threshold of 4.0`,
        reason: "Unnecessary edges increase review burden without educational gain.",
        severity: "low",
        category: "relationship_quality",
        suggestedFix: "Prune low-importance anatomy edges; tag essential vs supporting in metadata.",
      })
    );
  }

  const highRiskUnreviewed = relationships.filter(
    (r) => HIGH_RISK_PREDICATES.has(r.predicate) && r.metadata?.review_status !== "approved"
  );
  if (highRiskUnreviewed.length > 0) {
    deductions.push(
      makeDeduction({
        finding: `${highRiskUnreviewed.length} high-risk relationships lack approved review status`,
        evidence: `Predicates: ${[...new Set(highRiskUnreviewed.map((r) => r.predicate))].join(", ")}`,
        reason: "High-risk predicates require human review before publication.",
        severity: "high",
        category: "relationship_quality",
        suggestedFix: "Route at_risk_structure, treated_by, and indicates_treatment edges to attending review.",
      })
    );
  }

  const conflicting: string[] = [];
  const treatmentEdges = relationships.filter((r) => r.predicate === "treated_by" && r.subjectSlug === primary);
  if (treatmentEdges.length > 3) {
    conflicting.push("multiple treated_by edges may conflict");
  }
  if (conflicting.length > 0) {
    deductions.push(
      makeDeduction({
        finding: "Potential conflicting clinical edges",
        evidence: conflicting.join("; "),
        reason: "Conflicting treatment or indication edges confuse learners.",
        severity: "medium",
        category: "relationship_quality",
        suggestedFix: "Resolve conflicts via conflict-resolver and attending review.",
      })
    );
  }

  let validCount = 0;
  for (const rel of relationships) {
    const subj = bySlug.get(rel.subjectSlug);
    const obj = bySlug.get(rel.objectSlug);
    if (!subj || !obj) continue;
    if (
      validateRelationshipTriple({
        subjectEndpointType: "canonical_entity",
        subjectEntityType: subj.entityType,
        predicate: rel.predicate,
        objectEndpointType: "canonical_entity",
        objectEntityType: obj.entityType,
      }).valid
    ) {
      validCount += 1;
    }
  }
  const predicateCorrectness = relationships.length ? validCount / relationships.length : 1;

  return scoreFromDeductions("relationship_quality", deductions, {
    relationshipCount: relationships.length,
    relationshipDensity: density,
    missingClinicalEdgeCount: missingClinical.length,
    highRiskUnreviewedCount: highRiskUnreviewed.length,
    predicateCorrectness,
  });
}

export function evaluateClaimQuality(input: AuditInputBundle): CategoryAuditResult {
  const deductions: AuditDeduction[] = [];
  const claims = input.mergedDraft.claims;

  if (claims.length === 0) {
    deductions.push(
      makeDeduction({
        finding: "No educational claims in neighborhood",
        evidence: "merged draft claimCount = 0",
        reason: "Claims are the primary educational content layer for products.",
        severity: "critical",
        category: "claim_quality",
        suggestedFix: "Run claim-builder agent to generate evidence-backed atomic claims.",
      })
    );
    return scoreFromDeductions("claim_quality", deductions, { claimCount: 0 });
  }

  const nonAtomic = claims.filter((c) => {
    const sentences = c.claimText.split(/[.!?]/).filter((s) => s.trim().length > 0);
    return sentences.length > 2 || c.claimText.length > 280;
  });
  if (nonAtomic.length > 0) {
    deductions.push(
      makeDeduction({
        finding: `${nonAtomic.length} claims fail atomicity heuristic`,
        evidence: `Draft IDs: ${nonAtomic
          .slice(0, 3)
          .map((c) => c.draftId)
          .join(", ")}`,
        reason: "Claims should be atomic (≤2 sentences, <280 chars) for flashcard and BroBot consumption.",
        severity: "medium",
        category: "claim_quality",
        suggestedFix: "Split compound claims into separate atomic proposals.",
      })
    );
  }

  const vague = claims.filter((c) =>
    /\b(may|might|sometimes|often|usually)\b/i.test(c.claimText)
  );
  if (vague.length > claims.length * 0.3) {
    deductions.push(
      makeDeduction({
        finding: "High claim ambiguity rate",
        evidence: `${vague.length}/${claims.length} claims contain hedging language`,
        reason: "Ambiguous claims reduce educational specificity and board relevance.",
        severity: "medium",
        category: "claim_quality",
        suggestedFix: "Rewrite hedged claims with specific, evidence-backed statements.",
      })
    );
  }

  const l1Count = claims.filter((c) => c.importanceLevel === "L1").length;
  if (l1Count < 3) {
    deductions.push(
      makeDeduction({
        finding: `Only ${l1Count} L1 (board-critical) claims`,
        evidence: `L1 count ${l1Count}, recommended minimum 3`,
        reason: "L1 claims anchor board-relevant learning objectives.",
        severity: "high",
        category: "claim_quality",
        suggestedFix: "Promote high-yield Orthobullets and Anki signals to L1 claims.",
      })
    );
  }

  const draftOnly = claims.filter((c) => c.contentSource === "generated_draft");
  if (draftOnly.length === claims.length) {
    deductions.push(
      makeDeduction({
        finding: "All claims remain generated_draft",
        evidence: `${draftOnly.length}/${claims.length} claims are unreviewed drafts`,
        reason: "Draft claims cannot be consumed as verified educational content.",
        severity: "high",
        category: "claim_quality",
        suggestedFix: "Route claims through human review queue before publication.",
      })
    );
  }

  const claimProposals = input.proposals.filter((p) => p.proposal_type === "propose_educational_claim");
  const claimsWithEvidence = claimProposals.filter((p) => {
    const refs = (p.metadata?.evidence_refs as string[] | undefined) ?? [];
    return refs.length > 0;
  });
  const evidenceSupport =
    claimProposals.length === 0 ? 1 : claimsWithEvidence.length / claimProposals.length;
  if (evidenceSupport < 0.5) {
    deductions.push(
      makeDeduction({
        finding: "Insufficient evidence support on claim proposals",
        evidence: `${Math.round(evidenceSupport * 100)}% of claim proposals cite evidence`,
        reason: "Every claim should cite supporting evidence.",
        severity: "high",
        category: "claim_quality",
        suggestedFix: "Attach evidence_refs from evidence packet to each claim proposal.",
      })
    );
  }

  const atomicityScore =
    claims.length === 0 ? 0 : (claims.length - nonAtomic.length) / claims.length;

  return scoreFromDeductions("claim_quality", deductions, {
    claimCount: claims.length,
    l1ClaimCount: l1Count,
    atomicityScore,
    ambiguityRate: vague.length / claims.length,
    evidenceSupportRate: evidenceSupport,
  });
}

export function evaluateDecisionPointQuality(input: AuditInputBundle): CategoryAuditResult {
  const deductions: AuditDeduction[] = [];
  const dps = input.mergedDraft.decisionPoints;

  if (dps.length === 0) {
    deductions.push(
      makeDeduction({
        finding: "No decision points in neighborhood",
        evidence: "merged draft decisionPointCount = 0",
        reason: "Decision points support clinical reasoning and operative safety pathways.",
        severity: "critical",
        category: "decision_point_quality",
        suggestedFix: "Run decision-point-builder for operative_indication and nonoperative_eligible patterns.",
      })
    );
    return scoreFromDeductions("decision_point_quality", deductions, { decisionPointCount: 0 });
  }

  const requiredPatterns = ["operative_indication", "nonoperative_eligible", "emergency_escalation"];
  const presentPatterns = new Set(dps.map((dp) => dp.patternType));
  for (const pattern of requiredPatterns) {
    if (!presentPatterns.has(pattern)) {
      const gap = input.gaps.find((g) => g.decisionPointPattern === pattern);
      deductions.push(
        makeDeduction({
          finding: `Missing decision point pattern: ${pattern}`,
          evidence: gap?.reason ?? `0 decision points with pattern ${pattern}`,
          reason: "Fracture neighborhoods require branching operative vs nonoperative pathways.",
          severity: pattern === "emergency_escalation" ? "critical" : "high",
          category: "decision_point_quality",
          suggestedFix: `Add ${pattern} decision point with attending-gated review.`,
        })
      );
    }
  }

  const ambiguous = dps.filter((dp) => dp.trigger.length < 20 || dp.action.length < 20);
  if (ambiguous.length > 0) {
    deductions.push(
      makeDeduction({
        finding: `${ambiguous.length} decision points have underspecified trigger/action`,
        evidence: `Draft IDs: ${ambiguous.map((dp) => dp.draftId).join(", ")}`,
        reason: "Decision points must have unambiguous triggers and actions for safe clinical use.",
        severity: "high",
        category: "decision_point_quality",
        suggestedFix: "Expand trigger and action text with specific clinical criteria.",
      })
    );
  }

  const attendingGated = dps.filter((dp) => dp.requiresAttendingReview);
  if (attendingGated.length < dps.length * 0.5) {
    deductions.push(
      makeDeduction({
        finding: "Insufficient attending review gating on decision points",
        evidence: `${attendingGated.length}/${dps.length} DPs require attending review`,
        reason: "Operative and emergency decision points must be attending-gated.",
        severity: "medium",
        category: "decision_point_quality",
        suggestedFix: "Set requiresAttendingReview=true on safety-critical patterns.",
      })
    );
  }

  const safetyCritical = dps.filter((dp) => dp.safetyCriticality === "high" || dp.urgency === "emergent");
  if (safetyCritical.length === 0) {
    deductions.push(
      makeDeduction({
        finding: "No emergent/high-safety decision pathways",
        evidence: "0 decision points with safetyCriticality=high or urgency=emergent",
        reason: "Trauma neighborhoods require emergency escalation pathways.",
        severity: "high",
        category: "decision_point_quality",
        suggestedFix: "Add emergency_escalation decision point for compartment syndrome, open fracture, etc.",
      })
    );
  }

  return scoreFromDeductions("decision_point_quality", deductions, {
    decisionPointCount: dps.length,
    patternCoverage: presentPatterns.size,
    attendingGatedCount: attendingGated.length,
    safetyCriticalCount: safetyCritical.length,
  });
}

export function evaluateMetadataQuality(input: AuditInputBundle): CategoryAuditResult {
  const deductions: AuditDeduction[] = [];
  const { entities, relationships } = input.mergedDraft;

  const primary = entities.find((e) => e.slug === input.primaryEntitySlug);
  if (primary) {
    const requiredFields = ["clinical_kind", "curriculum_tags", "board_relevance"];
    const missing = requiredFields.filter((f) => primary.metadata?.[f] == null);
    if (missing.length > 0) {
      deductions.push(
        makeDeduction({
          finding: `Primary entity missing metadata: ${missing.join(", ")}`,
          evidence: `Entity ${primary.slug} metadata keys: ${Object.keys(primary.metadata ?? {}).join(", ")}`,
          reason: "Primary condition entities require educational and curriculum metadata.",
          severity: "high",
          category: "metadata_quality",
          affectedSlugs: [primary.slug],
          suggestedFix: "Run metadata-builder to populate clinical_kind, curriculum_tags, board_relevance.",
        })
      );
    }
  }

  const relsNeedingMeta = relationships.filter((r) =>
    ["involves_anatomy", "at_risk_structure", "injured_in"].includes(r.predicate)
  );
  const relsWithMeta = relsNeedingMeta.filter(
    (r) =>
      r.metadata?.anatomy_role != null ||
      r.metadata?.clinical_importance != null ||
      r.metadata?.context_relevance != null
  );
  const metaRate = relsNeedingMeta.length ? relsWithMeta.length / relsNeedingMeta.length : 1;
  if (metaRate < 0.6) {
    deductions.push(
      makeDeduction({
        finding: "Incomplete relationship metadata",
        evidence: `${Math.round(metaRate * 100)}% of anatomy edges have role/importance metadata`,
        reason: "Relationship metadata drives Prepare traversal and BroBot context selection.",
        severity: "medium",
        category: "metadata_quality",
        suggestedFix: "Add anatomy_role, clinical_importance, and context_relevance to anatomy edges.",
      })
    );
  }

  const entitiesWithoutTags = entities.filter(
    (e) => !e.metadata?.curriculum_tags && !e.metadata?.tags && e.entityType !== "anatomy_structure"
  );
  if (entitiesWithoutTags.length > entities.length * 0.5) {
    deductions.push(
      makeDeduction({
        finding: "Low entity tagging coverage",
        evidence: `${entitiesWithoutTags.length}/${entities.length} non-anatomy entities lack tags`,
        reason: "Tags support product filtering and adaptive learning pathways.",
        severity: "low",
        category: "metadata_quality",
        suggestedFix: "Add curriculum_tags from evidence packet curriculum signals.",
      })
    );
  }

  return scoreFromDeductions("metadata_quality", deductions, {
    primaryMetadataComplete: primary
      ? ["clinical_kind", "curriculum_tags", "board_relevance"].filter(
          (f) => primary.metadata?.[f] != null
        ).length
      : 0,
    relationshipMetadataRate: metaRate,
    untaggedEntityCount: entitiesWithoutTags.length,
  });
}

export function evaluateProvenanceQuality(input: AuditInputBundle): CategoryAuditResult {
  const deductions: AuditDeduction[] = [];
  const { entities, relationships, claims, decisionPoints } = input.mergedDraft;
  const proposals = input.proposals;

  const objectsToCheck = [
    ...entities.map((e) => ({ type: "entity", id: e.slug, meta: e.metadata })),
    ...relationships.map((r) => ({
      type: "relationship",
      id: `${r.subjectSlug}-${r.predicate}-${r.objectSlug}`,
      meta: r.metadata,
    })),
    ...claims.map((c) => ({ type: "claim", id: c.draftId, meta: c.metadata })),
    ...decisionPoints.map((dp) => ({ type: "decision_point", id: dp.draftId, meta: {} })),
  ];

  const missingProvenance = objectsToCheck.filter(
    (o) => !o.meta?._provenance_fingerprint && !o.meta?.generator && !o.meta?.source
  );
  if (missingProvenance.length > objectsToCheck.length * 0.3) {
    deductions.push(
      makeDeduction({
        finding: "Provenance incomplete on graph objects",
        evidence: `${missingProvenance.length}/${objectsToCheck.length} objects lack provenance markers`,
        reason: "Every object should include source, timestamp, evidence IDs, generator, and review state.",
        severity: "medium",
        category: "provenance_quality",
        suggestedFix: "Ensure merge engine attaches _provenance_fingerprint from proposal fingerprints.",
      })
    );
  }

  const proposalsWithoutFingerprint = proposals.filter((p) => !p.proposal_fingerprint);
  if (proposalsWithoutFingerprint.length > 0) {
    deductions.push(
      makeDeduction({
        finding: `${proposalsWithoutFingerprint.length} proposals missing fingerprints`,
        evidence: "proposal_fingerprint field absent",
        reason: "Fingerprints are required for audit trail and review deduplication.",
        severity: "high",
        category: "provenance_quality",
        suggestedFix: "Regenerate proposals with stable fingerprint hashing.",
      })
    );
  }

  const proposalsWithoutReview = proposals.filter((p) => !p.review_status);
  if (proposalsWithoutReview.length > proposals.length * 0.2) {
    deductions.push(
      makeDeduction({
        finding: "Review state missing on proposals",
        evidence: `${proposalsWithoutReview.length}/${proposals.length} proposals lack review_status`,
        reason: "Review state is required for provenance and publication gating.",
        severity: "medium",
        category: "provenance_quality",
        suggestedFix: "Route all proposals through review engine before merge.",
      })
    );
  }

  const provenanceRate =
    objectsToCheck.length === 0
      ? 1
      : (objectsToCheck.length - missingProvenance.length) / objectsToCheck.length;

  return scoreFromDeductions("provenance_quality", deductions, {
    objectCount: objectsToCheck.length,
    provenanceRate,
    proposalFingerprintRate:
      proposals.length === 0
        ? 1
        : (proposals.length - proposalsWithoutFingerprint.length) / proposals.length,
  });
}

export function evaluateReviewCalibration(input: AuditInputBundle): CategoryAuditResult {
  const deductions: AuditDeduction[] = [];
  const autoReview = input.autoReview;

  if (!autoReview) {
    deductions.push(
      makeDeduction({
        finding: "No auto-review calibration data",
        evidence: "ontology-auto-review.json missing",
        reason: "Cannot evaluate false positive/negative rates without review engine output.",
        severity: "high",
        category: "review_calibration",
        suggestedFix: "Run compiler to generate ontology-auto-review.json.",
      })
    );
    return scoreFromDeductions("review_calibration", deductions, { autoReviewLoaded: false });
  }

  const total = autoReview.decisions.length || 1;
  const humanRate = autoReview.humanReviewPercent;
  const autoRate = autoReview.autoApprovedPercent;

  if (humanRate > 40) {
    deductions.push(
      makeDeduction({
        finding: "Review burden too high — excessive human routing",
        evidence: `${humanRate}% human review rate (${autoReview.summary.SAFE_REVIEW + autoReview.summary.EXPERT_REVIEW} items)`,
        reason: "Well-calibrated auto-review should auto-approve low-risk proposals.",
        severity: "medium",
        category: "review_calibration",
        suggestedFix: "Tune confidence thresholds; improve evidence quality to raise auto-approve rate.",
      })
    );
  }

  const highRiskAutoApproved = autoReview.decisions.filter(
    (d) =>
      d.category === "AUTO_APPROVE" &&
      (d.safetyCriticality > 0.7 || d.proposal_type === "propose_decision_point")
  );
  if (highRiskAutoApproved.length > 0) {
    deductions.push(
      makeDeduction({
        finding: `${highRiskAutoApproved.length} potentially dangerous auto-approvals`,
        evidence: `Fingerprints: ${highRiskAutoApproved
          .slice(0, 3)
          .map((d) => d.proposal_fingerprint)
          .join(", ")}`,
        reason: "Safety-critical proposals should not be auto-approved.",
        severity: "critical",
        category: "review_calibration",
        suggestedFix: "Tighten auto-approve rules for decision points and high safetyCriticality scores.",
      })
    );
  }

  const rejected = autoReview.summary.REJECT;
  const falsePositiveEstimate = total > 0 ? rejected / total : 0;
  const falseNegativeEstimate =
    highRiskAutoApproved.length > 0 ? highRiskAutoApproved.length / total : 0;

  if (falsePositiveEstimate > 0.15) {
    deductions.push(
      makeDeduction({
        finding: "Elevated estimated false positive rate (over-rejection)",
        evidence: `${Math.round(falsePositiveEstimate * 100)}% proposals rejected (${rejected}/${total})`,
        reason: "High rejection rates increase factory rework without improving safety.",
        severity: "medium",
        category: "review_calibration",
        suggestedFix: "Review REJECT rules; check duplicate-detector and conflict-resolver calibration.",
      })
    );
  }

  const expertRate = (autoReview.summary.EXPERT_REVIEW / total) * 100;
  if (expertRate > 25) {
    deductions.push(
      makeDeduction({
        finding: "High attending review burden",
        evidence: `${Math.round(expertRate)}% EXPERT_REVIEW (${autoReview.summary.EXPERT_REVIEW} items)`,
        reason: "Excessive attending review slows publication velocity.",
        severity: "medium",
        category: "review_calibration",
        suggestedFix: "Improve claim atomicity and decision point specificity to reduce EXPERT_REVIEW routing.",
      })
    );
  }

  return scoreFromDeductions("review_calibration", deductions, {
    autoReviewLoaded: true,
    humanReviewPercent: humanRate,
    autoApprovedPercent: autoRate,
    estimatedFalsePositiveRate: falsePositiveEstimate,
    estimatedFalseNegativeRate: falseNegativeEstimate,
    expertReviewCount: autoReview.summary.EXPERT_REVIEW,
  });
}

export function evaluateAgentPerformance(input: AuditInputBundle): {
  category: CategoryAuditResult;
  reportCards: AgentReportCard[];
} {
  const deductions: AuditDeduction[] = [];
  const report = input.agentExecution;
  const autoReview = input.autoReview;

  if (!report) {
    deductions.push(
      makeDeduction({
        finding: "No agent execution report",
        evidence: "agent-execution-report.json missing",
        reason: "Cannot grade agent performance without execution metrics.",
        severity: "high",
        category: "agent_performance",
        suggestedFix: "Run compiler agent orchestration stage.",
      })
    );
    return {
      category: scoreFromDeductions("agent_performance", deductions, { agentReportLoaded: false }),
      reportCards: [],
    };
  }

  const reportCards: AgentReportCard[] = report.entries.map((entry) => {
    const agentProposals = input.proposals.filter(
      (p) => p.metadata?.agent_id === entry.agentId || p.metadata?.generated_by === entry.agentId
    );
    const withEvidence = agentProposals.filter((p) => {
      const refs = (p.metadata?.evidence_refs as string[] | undefined) ?? [];
      return refs.length > 0;
    });
    const reviewBurden = autoReview
      ? autoReview.decisions.filter((d) => {
          const proposal = input.proposals.find((p) => p.proposal_fingerprint === d.proposal_fingerprint);
          return (
            proposal?.metadata?.agent_id === entry.agentId ||
            proposal?.metadata?.generated_by === entry.agentId
          );
        }).length
      : 0;

    const successRate = entry.status === "completed" ? 1 : entry.status === "partial" ? 0.5 : 0;
    const avgConfidence =
      agentProposals.length > 0
        ? agentProposals.reduce((s, p) => s + (Number(p.metadata?.confidence) || 0.75), 0) /
          agentProposals.length
        : entry.status === "completed"
          ? 0.85
          : 0.5;

    const rawScore =
      successRate * 40 +
      Math.min(entry.proposalCount, 10) * 3 +
      avgConfidence * 20 +
      (withEvidence.length / Math.max(agentProposals.length, 1)) * 20 -
      reviewBurden * 0.5;
    const grade = gradeFromScore(clampScore(rawScore));

    const strengths: string[] = [];
    const weaknesses: string[] = [];
    if (entry.status === "completed") strengths.push("Completed without errors");
    if (entry.proposalCount > 0) strengths.push(`Generated ${entry.proposalCount} proposals`);
    if (withEvidence.length > 0) strengths.push("Uses evidence citations");
    if (entry.status === "failed") weaknesses.push("Agent execution failed");
    if (entry.timedOut) weaknesses.push("Execution timed out");
    if (entry.proposalCount === 0 && entry.agentId.includes("builder"))
      weaknesses.push("No proposals generated");
    if (reviewBurden > 5) weaknesses.push(`High review burden (${reviewBurden} items)`);

    return {
      agentId: entry.agentId,
      assignmentId: entry.assignmentId,
      status: entry.status,
      workload: entry.proposalCount,
      successRate,
      averageConfidence: Math.round(avgConfidence * 100) / 100,
      proposalsGenerated: entry.proposalCount,
      reviewBurden,
      evidenceUsage:
        agentProposals.length === 0 ? 0 : withEvidence.length / agentProposals.length,
      grade,
      strengths,
      weaknesses,
    };
  });

  const failed = report.failedAgents;
  if (failed > 0) {
    deductions.push(
      makeDeduction({
        finding: `${failed} agent(s) failed during orchestration`,
        evidence: report.entries
          .filter((e) => e.status === "failed")
          .map((e) => e.agentId)
          .join(", "),
        reason: "Failed agents leave gaps unaddressed in the manufactured neighborhood.",
        severity: "critical",
        category: "agent_performance",
        suggestedFix: "Investigate agent errors and re-run orchestration.",
      })
    );
  }

  const underperformers = reportCards.filter((c) => c.grade === "D" || c.grade === "F");
  if (underperformers.length > 0) {
    deductions.push(
      makeDeduction({
        finding: `${underperformers.length} underperforming agent(s)`,
        evidence: underperformers.map((c) => `${c.agentId} (${c.grade})`).join(", "),
        reason: "Low-grading agents reduce neighborhood quality and increase review burden.",
        severity: "high",
        category: "agent_performance",
        suggestedFix: "Review agent report cards and address weaknesses per agent.",
      })
    );
  }

  const avgGrade =
    reportCards.length === 0
      ? 0
      : reportCards.reduce((s, c) => {
          const gradeScore = c.grade === "A" ? 95 : c.grade === "B" ? 85 : c.grade === "C" ? 75 : c.grade === "D" ? 65 : 50;
          return s + gradeScore;
        }, 0) / reportCards.length;

  return {
    category: scoreFromDeductions("agent_performance", deductions, {
      agentReportLoaded: true,
      agentsExecuted: report.entries.length,
      failedAgents: failed,
      averageAgentGrade: Math.round(avgGrade),
      underperformerCount: underperformers.length,
    }),
    reportCards,
  };
}

export function evaluateCompilerQuality(input: AuditInputBundle): CompilerReportCard {
  const deductions: AuditDeduction[] = [];

  const gapScore = input.gaps.length === 0 ? 100 : clampScore(100 - input.gaps.length * 2);
  if (input.reportsMissing.includes("ontology-gap-report.json")) {
    deductions.push(
      makeDeduction({
        finding: "Gap detection report missing",
        evidence: "ontology-gap-report.json not loaded",
        reason: "Cannot verify compiler gap detection quality.",
        severity: "high",
        category: "compiler_quality",
        suggestedFix: "Run kg:compile to regenerate gap analysis.",
      })
    );
  }

  const workItemCount = input.workPlan?.workItems.length ?? 0;
  const unmetGaps = input.gaps.filter((g) => {
    const handled = input.workPlan?.workItems.some((w) => w.gapIds.includes(g.id));
    return !handled;
  });
  const workPlanningScore =
    workItemCount === 0 ? 50 : clampScore(100 - unmetGaps.length * 5);

  if (unmetGaps.length > 0) {
    deductions.push(
      makeDeduction({
        finding: `${unmetGaps.length} gaps not assigned to work items`,
        evidence: `Gap IDs: ${unmetGaps
          .slice(0, 3)
          .map((g) => g.id)
          .join(", ")}`,
        reason: "Work planner should assign every gap to a registered agent.",
        severity: "medium",
        category: "compiler_quality",
        suggestedFix: "Register agents for unmet gap kinds or add generic fallback handlers.",
      })
    );
  }

  const executionOrder = input.workPlan?.executionOrder ?? [];
  const dependencyScore = executionOrder.length > 0 ? 95 : 70;

  const mergeConflicts = input.conflictReport?.totalConflicts ?? input.mergedDraft.conflicts.length;
  const mergeScore = mergeConflicts === 0 ? 100 : clampScore(100 - mergeConflicts * 10);

  if (mergeConflicts > 0) {
    deductions.push(
      makeDeduction({
        finding: `${mergeConflicts} merge conflicts`,
        evidence: "conflict-report.json or merged draft conflicts array",
        reason: "Merge engine should resolve or surface all agent output conflicts.",
        severity: "high",
        category: "compiler_quality",
        suggestedFix: "Review conflict-report.json and re-run merge with conflict-resolver output.",
      })
    );
  }

  const publicationBlockers = input.publication?.blockers.length ?? 0;
  const publicationBlockerScore =
    publicationBlockers === 0 ? 100 : clampScore(100 - publicationBlockers * 5);

  const overallScore = clampScore(
    (gapScore + workPlanningScore + dependencyScore + mergeScore + publicationBlockerScore) / 5
  );

  return {
    gapDetectionScore: gapScore,
    workPlanningScore,
    dependencyGraphScore: dependencyScore,
    mergeCorrectnessScore: mergeScore,
    publicationBlockerScore,
    overallScore,
    deductions,
    metrics: {
      gapCount: input.gaps.length,
      workItemCount,
      unmetGapCount: unmetGaps.length,
      mergeConflictCount: mergeConflicts,
      publicationBlockerCount: publicationBlockers,
    },
  };
}

export function evaluateEducationalQuality(input: AuditInputBundle): CategoryAuditResult {
  const deductions: AuditDeduction[] = [];
  const { entities, relationships, claims, decisionPoints } = input.mergedDraft;
  const primary = input.primaryEntitySlug;

  const primaryClaims = claims.filter((c) => c.primaryEntitySlug === primary);
  if (primaryClaims.length < 5) {
    deductions.push(
      makeDeduction({
        finding: "Insufficient primary-entity claims for learning progression",
        evidence: `${primaryClaims.length} claims anchored to ${primary}`,
        reason: "Residents need a critical mass of claims to build mental models.",
        severity: "high",
        category: "educational_quality",
        suggestedFix: "Add L1–L3 claims covering diagnosis, classification, treatment, and complications.",
      })
    );
  }

  const l1Claims = claims.filter((c) => c.importanceLevel === "L1");
  const boardRelevance = claims.length ? l1Claims.length / claims.length : 0;
  if (boardRelevance < 0.2) {
    deductions.push(
      makeDeduction({
        finding: "Low board relevance density",
        evidence: `${l1Claims.length}/${claims.length} claims are L1 (${Math.round(boardRelevance * 100)}%)`,
        reason: "OITE and board prep require high-yield L1 claim concentration.",
        severity: "medium",
        category: "educational_quality",
        suggestedFix: "Elevate Orthobullets high-frequency topics to L1 claims.",
      })
    );
  }

  const reachable = new Set<string>([primary]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const rel of relationships) {
      if (reachable.has(rel.subjectSlug) && !reachable.has(rel.objectSlug)) {
        reachable.add(rel.objectSlug);
        changed = true;
      }
      if (reachable.has(rel.objectSlug) && !reachable.has(rel.subjectSlug)) {
        reachable.add(rel.subjectSlug);
        changed = true;
      }
    }
  }
  const connectivity = entities.length ? reachable.size / entities.length : 0;
  if (connectivity < 0.7) {
    deductions.push(
      makeDeduction({
        finding: "Poor concept connectivity from primary entity",
        evidence: `${reachable.size}/${entities.length} entities reachable from ${primary} (${Math.round(connectivity * 100)}%)`,
        reason: "Learners cannot traverse disconnected concepts effectively.",
        severity: "high",
        category: "educational_quality",
        suggestedFix: "Add bridging relationships between classification, anatomy, imaging, and treatment nodes.",
      })
    );
  }

  const reasoningSupport = decisionPoints.length > 0 && primaryClaims.length >= 3 ? 1 : 0;
  if (reasoningSupport === 0) {
    deductions.push(
      makeDeduction({
        finding: "Weak reasoning support (claims + decision points)",
        evidence: `${primaryClaims.length} primary claims, ${decisionPoints.length} decision points`,
        reason: "Effective learning requires both factual claims and branching clinical reasoning.",
        severity: "high",
        category: "educational_quality",
        suggestedFix: "Pair decision points with supporting claims for each branch.",
      })
    );
  }

  const pearls = claims.filter(
    (c) =>
      c.claimType === "pearl" ||
      c.claimType === "clinical_pearl" ||
      String(c.metadata?.attending_pearl) === "true"
  );
  if (pearls.length === 0) {
    deductions.push(
      makeDeduction({
        finding: "No attending pearls identified",
        evidence: "0 claims with claimType=pearl or attending_pearl metadata",
        reason: "Attending pearls differentiate SnapOrtho from generic content aggregators.",
        severity: "low",
        category: "educational_quality",
        suggestedFix: "Add attending_pearl claims from faculty review or evidence quality signals.",
      })
    );
  }

  const misconceptionTraps = claims.filter((c) =>
    /\b(do not|avoid|commonly confused|misconception|trap)\b/i.test(c.claimText)
  );
  if (misconceptionTraps.length === 0) {
    deductions.push(
      makeDeduction({
        finding: "No cognitive trap / misconception claims",
        evidence: "0 claims address common resident errors",
        reason: "Misconception targeting improves retention and exam performance.",
        severity: "low",
        category: "educational_quality",
        suggestedFix: "Add claims that explicitly address common pitfalls from Anki missed-card signals.",
      })
    );
  }

  const importanceLevels = ["L1", "L2", "L3", "L4"] as const;
  const progression = importanceLevels.filter((level) =>
    claims.some((c) => c.importanceLevel === level)
  ).length;
  if (progression < 3) {
    deductions.push(
      makeDeduction({
        finding: "Incomplete learning progression across importance levels",
        evidence: `Levels present: ${progression}/4 (L1–L4)`,
        reason: "Progressive difficulty (L1 board → L4 nuance) supports adaptive learning.",
        severity: "medium",
        category: "educational_quality",
        suggestedFix: "Distribute claims across L1–L4 for scaffolded learning paths.",
      })
    );
  }

  return scoreFromDeductions("educational_quality", deductions, {
    primaryClaimCount: primaryClaims.length,
    boardRelevanceRate: boardRelevance,
    conceptConnectivity: connectivity,
    reasoningSupport,
    attendingPearlCount: pearls.length,
    misconceptionClaimCount: misconceptionTraps.length,
    importanceLevelCoverage: progression,
  });
}

export function evaluateCrossNeighborhoodConsistency(
  inputs: AuditInputBundle[]
): CategoryAuditResult {
  const deductions: AuditDeduction[] = [];

  if (inputs.length < 2) {
    return scoreFromDeductions("cross_neighborhood_consistency", deductions, {
      neighborhoodsCompared: inputs.length,
    });
  }

  const labelToTopics = new Map<string, Array<{ topicKey: string; slug: string }>>();
  const slugToTopics = new Map<string, Set<string>>();

  for (const input of inputs) {
    for (const entity of input.mergedDraft.entities) {
      const label = normalizeLabel(entity.preferredLabel);
      const entries = labelToTopics.get(label) ?? [];
      entries.push({ topicKey: input.topicKey, slug: entity.slug });
      labelToTopics.set(label, entries);

      const topics = slugToTopics.get(entity.slug) ?? new Set();
      topics.add(input.topicKey);
      slugToTopics.set(entity.slug, topics);
    }
  }

  const crossTopicDuplicates = [...labelToTopics.entries()].filter(([, entries]) => {
    const topics = new Set(entries.map((e) => e.topicKey));
    const slugs = new Set(entries.map((e) => e.slug));
    return topics.size > 1 && slugs.size > 1;
  });

  if (crossTopicDuplicates.length > 0) {
    const examples = crossTopicDuplicates.slice(0, 5);
    deductions.push(
      makeDeduction({
        finding: `${crossTopicDuplicates.length} duplicate concepts across neighborhoods`,
        evidence: examples
          .map(
            ([label, entries]) =>
              `"${label}": ${entries.map((e) => `${e.topicKey}/${e.slug}`).join(", ")}`
          )
          .join("; "),
        reason: "Same anatomical/clinical concepts should use shared canonical slugs across neighborhoods.",
        severity: "high",
        category: "cross_neighborhood_consistency",
        suggestedFix: "Consolidate to shared anatomy hubs; reference rather than recreate entities.",
      })
    );
  }

  const sharedSlugs = [...slugToTopics.entries()].filter(([, topics]) => topics.size > 1);
  const anatomySlugs = sharedSlugs.filter(([slug]) =>
    inputs.some((input) =>
      input.mergedDraft.entities.some(
        (e) => e.slug === slug && e.entityType === "anatomy_structure"
      )
    )
  );

  const totalAnatomy = inputs.reduce(
    (sum, input) =>
      sum + input.mergedDraft.entities.filter((e) => e.entityType === "anatomy_structure").length,
    0
  );
  const reuseRate = totalAnatomy > 0 ? anatomySlugs.length / totalAnatomy : 0;

  if (reuseRate < 0.1 && inputs.length >= 3) {
    deductions.push(
      makeDeduction({
        finding: "Low cross-neighborhood anatomy reuse",
        evidence: `${anatomySlugs.length} shared anatomy slugs across ${inputs.length} neighborhoods`,
        reason: "Trauma clusters should share regional anatomy (e.g. proximal femur hub).",
        severity: "medium",
        category: "cross_neighborhood_consistency",
        suggestedFix: "Define batch-level shared anatomy slugs and retarget all neighborhoods.",
      })
    );
  }

  const terminologyMismatches: string[] = [];
  for (const [label, entries] of labelToTopics.entries()) {
    const slugs = new Set(entries.map((e) => e.slug));
    if (slugs.size > 1 && entries.length > 1) {
      const topics = new Set(entries.map((e) => e.topicKey));
      if (topics.size > 1) {
        terminologyMismatches.push(label);
      }
    }
  }
  if (terminologyMismatches.length > 3) {
    deductions.push(
      makeDeduction({
        finding: "Terminology inconsistency across neighborhoods",
        evidence: `Labels with different slugs: ${terminologyMismatches.slice(0, 5).join(", ")}`,
        reason: "Inconsistent terminology confuses cross-topic study and BroBot retrieval.",
        severity: "medium",
        category: "cross_neighborhood_consistency",
        suggestedFix: "Normalize preferredLabel and slug across batch via shared ontology registry.",
      })
    );
  }

  return scoreFromDeductions("cross_neighborhood_consistency", deductions, {
    neighborhoodsCompared: inputs.length,
    duplicateConceptCount: crossTopicDuplicates.length,
    sharedAnatomySlugCount: anatomySlugs.length,
    crossNeighborhoodReuseRate: reuseRate,
    terminologyMismatchCount: terminologyMismatches.length,
  });
}

export function evaluatePublicationReadiness(input: AuditInputBundle): PublicationAuditResult {
  const deductions: AuditDeduction[] = [];
  const publication = input.publication;

  if (!publication) {
    deductions.push(
      makeDeduction({
        finding: "No publication readiness report",
        evidence: "publication-readiness.json missing",
        reason: "Cannot determine publication eligibility without compiler publication gate.",
        severity: "critical",
        category: "publication_readiness",
        suggestedFix: "Run compiler publication-validator stage.",
      })
    );
    return {
      status: "NOT_READY",
      ready: false,
      blockers: ["Publication readiness report missing"],
      currentLevel: 0,
      requiredLevel: input.targetMaturityLevel,
      score: 0,
      deductions,
    };
  }

  for (const blocker of publication.blockers) {
    deductions.push(
      makeDeduction({
        finding: blocker,
        evidence: `publication-readiness.json blockers`,
        reason: "Publication gate identified blocking condition.",
        severity: blocker.includes("critical") ? "critical" : "high",
        category: "publication_readiness",
        suggestedFix: publication.remainingWork[0] ?? "Resolve blocker via factory work plan.",
      })
    );
  }

  const criticalGaps = input.gaps.filter((g) => g.priority === "critical").length;
  if (criticalGaps > 0 && publication.ready) {
    deductions.push(
      makeDeduction({
        finding: "Publication gate may be miscalibrated — critical gaps remain but ready=true",
        evidence: `${criticalGaps} critical gaps + ready=${publication.ready}`,
        reason: "Auditor never overrides gates but flags potential false READY signals.",
        severity: "critical",
        category: "publication_readiness",
        suggestedFix: "Re-run publication-validator; ensure critical gaps block ready flag.",
      })
    );
  }

  const score = publication.ready
    ? 100
    : clampScore(100 - publication.blockers.length * 8 - criticalGaps * 5);

  return {
    status: publication.ready ? "READY" : "NOT_READY",
    ready: publication.ready,
    blockers: publication.blockers,
    currentLevel: publication.currentLevel,
    requiredLevel: publication.requiredLevel,
    score,
    deductions,
  };
}