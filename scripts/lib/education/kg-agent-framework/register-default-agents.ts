/**
 * Bootstrap default Knowledge Factory agents into the registry.
 * Import this module once at compiler/work-planner startup.
 */

import { ConflictResolverAgent } from "./agents/conflict-resolver.ts";
import { DuplicateDetectorAgent } from "./agents/duplicate-detector.ts";
import { MetadataBuilderAgent } from "./agents/metadata-builder.ts";
import { QualityScorerAgent } from "./agents/quality-scorer.ts";
import { ClaimBuilderAgent } from "./agents/claim-builder.ts";
import { createGapAgent } from "./agents/gap-stub-agent.ts";
import { PublicationValidatorAgent } from "./agents/publication-validator-agent.ts";
import { RelationshipBuilderAgent } from "./agents/relationship-builder.ts";
import { ReviewAssistantAgent } from "./agents/review-assistant.ts";
import { getAgentRegistry } from "./registry.ts";

let registered = false;

export function resetDefaultAgentRegistration(): void {
  registered = false;
}

export function registerDefaultAgents(): void {
  if (registered) return;
  const registry = getAgentRegistry();

  registry.register(
    createGapAgent({
      id: "anatomy-builder",
      name: "Anatomy Builder",
      description: "Produces anatomy_structure entities from anatomy-prefixed ontology gaps.",
      handlesGapKinds: ["missing_entity"],
      handlesEntityTypes: ["anatomy_structure"],
      handlesOntologyRulePrefixes: ["anatomy."],
      produces: ["entities"],
      consumes: ["neighborhood_snapshot", "ontology_requirements", "work_assignment"],
      requires: [],
      proposalTypes: ["create_canonical_entity"],
      confidenceRange: { min: 0.85, max: 0.95 },
      validationCategories: ["ontology", "metadata", "duplicate"],
    })
  );

  registry.register(
    createGapAgent({
      id: "clinical-entity-builder",
      name: "Clinical Entity Builder",
      description: "Generic fallback for clinical canonical entities (conditions, procedures, etc.).",
      handlesGapKinds: ["missing_entity"],
      isGenericFallback: true,
      produces: ["entities"],
      consumes: ["neighborhood_snapshot", "ontology_requirements", "work_assignment"],
      requires: [],
      proposalTypes: ["create_canonical_entity"],
      confidenceRange: { min: 0.8, max: 0.95 },
      validationCategories: ["ontology", "schema", "duplicate"],
    })
  );

  registry.register(new RelationshipBuilderAgent());

  registry.register(new ClaimBuilderAgent());

  registry.register(
    createGapAgent({
      id: "decision-point-builder",
      name: "Decision Point Builder",
      description: "Produces decision point proposals (attending review required).",
      handlesGapKinds: ["missing_decision_point"],
      produces: ["decision_points"],
      consumes: ["neighborhood_snapshot", "canonical_objects", "work_assignment"],
      requires: ["relationship-builder"],
      proposalTypes: ["propose_decision_point"],
      confidenceRange: { min: 0.6, max: 0.8 },
      validationCategories: ["safety", "publication", "schema"],
    })
  );

  registry.register(new MetadataBuilderAgent());

  registry.register(
    createGapAgent({
      id: "asset-linker",
      name: "Asset Linker",
      description: "Links Anki cards and question assets to canonical entities.",
      handlesGapKinds: ["missing_asset_link"],
      produces: ["asset_links"],
      consumes: ["neighborhood_snapshot", "canonical_objects", "evidence_packets", "work_assignment"],
      requires: ["clinical-entity-builder"],
      proposalTypes: ["retarget_card_to_entity", "retarget_question_to_entity"],
      confidenceRange: { min: 0.7, max: 0.9 },
      validationCategories: ["provenance", "schema"],
    })
  );

  registry.register(
    createGapAgent({
      id: "provenance-builder",
      name: "Provenance Builder",
      description: "Attaches provenance records to proposals and canonical objects.",
      handlesGapKinds: ["missing_provenance"],
      produces: ["provenance"],
      consumes: ["proposal_packets", "work_assignment"],
      requires: [],
      proposalTypes: ["add_provenance_record"],
      confidenceRange: { min: 0.85, max: 0.95 },
      validationCategories: ["provenance", "schema"],
    })
  );

  registry.register(new DuplicateDetectorAgent());
  registry.register(new QualityScorerAgent());
  registry.register(new ConflictResolverAgent());
  registry.register(new ReviewAssistantAgent());
  registry.register(new PublicationValidatorAgent());

  registered = true;
}