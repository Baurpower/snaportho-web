import type { ProposalRecord } from "../../kg-automation-common.ts";
import type {
  PilotClaimDraft,
  PilotDecisionPointDraft,
  PilotEntitySpec,
  PilotRelationshipSpec,
} from "../kg-ankle-pilot-spec.ts";
import { HIGH_RISK_PREDICATES, validateRelationshipTriple } from "../kg-relationship-registry.ts";

export type PilotProposalSpec = {
  pilotKey: string;
  pilotPacketKey: string;
  pilotPacketLabel: string;
  specVersion: string;
  primaryEntitySlug: string;
  sourceIds: {
    curriculumNodeSlug: string;
    prepareTopicId: string;
    casePrepSlug?: string;
  };
  assetCounts: {
    ankiCardMappings: number;
    orthobulletsQuestionMappings: number;
  };
  entities: PilotEntitySpec[];
  relationships: PilotRelationshipSpec[];
  claimDrafts: PilotClaimDraft[];
  decisionPointDrafts: PilotDecisionPointDraft[];
};

function fingerprint(parts: string[]): string {
  return parts.join("|").toLowerCase().replace(/\s+/g, " ");
}

function slugToEntityMap(entities: PilotEntitySpec[]): Map<string, PilotEntitySpec> {
  return new Map(entities.map((e) => [e.slug, e]));
}

function baseProposal(spec: PilotProposalSpec, partial: Partial<ProposalRecord>): ProposalRecord {
  const { metadata: partialMetadata, ...rest } = partial;

  return {
    proposal_fingerprint: "unknown",
    proposal_type: "create_canonical_entity",
    source_signal_type: "reference_import",
    source_signal_ids: [],
    specialty_id: null,
    proposed_entity_type: null,
    proposed_entity_label: null,
    proposed_existing_entity_id: null,
    proposed_subject_entity_id: null,
    proposed_predicate: null,
    proposed_object_entity_id: null,
    proposed_alias: null,
    proposed_bridge_type: null,
    confidence: 0.85,
    confidence_tier: "high",
    confidence_reason: spec.specVersion,
    evidence_summary: "",
    supporting_card_count: spec.assetCounts.ankiCardMappings,
    supporting_question_count: spec.assetCounts.orthobulletsQuestionMappings,
    supporting_curriculum_node_count: 1,
    supporting_source_count: 2,
    conflict_count: 0,
    review_status: "generated",
    reviewed_by: null,
    reviewed_at: null,
    reviewer_notes: null,
    applied_at: null,
    superseded_by: null,
    comments: null,
    is_active: true,
    ...rest,
    metadata: {
      pilot: spec.pilotKey,
      review_packet_key: spec.pilotPacketKey,
      review_packet_label: spec.pilotPacketLabel,
      factory_version: "kf-016",
      ...(partialMetadata ?? {}),
    },
  };
}

export function buildPilotProposalPacket(spec: PilotProposalSpec): {
  pilotKey: string;
  proposals: ProposalRecord[];
  validationErrors: string[];
} {
  const bySlug = slugToEntityMap(spec.entities);
  const proposals: ProposalRecord[] = [];
  const errors: string[] = [];

  for (const entity of spec.entities) {
    proposals.push(
      baseProposal(spec, {
        proposal_fingerprint: fingerprint(["create", entity.entityType, entity.slug]),
        proposal_type: "create_canonical_entity",
        proposed_entity_type: entity.entityType,
        proposed_entity_label: entity.preferredLabel,
        source_signal_ids: [spec.sourceIds.curriculumNodeSlug, spec.sourceIds.prepareTopicId],
        evidence_summary: `Pilot entity: ${entity.preferredLabel}`,
        metadata: {
          slug: entity.slug,
          description: entity.description,
          ...entity.metadata,
        },
      })
    );
  }

  for (const rel of spec.relationships) {
    const subject = bySlug.get(rel.subjectSlug);
    const object = bySlug.get(rel.objectSlug);
    if (!subject || !object) {
      errors.push(`Missing entity for ${rel.subjectSlug} -[${rel.predicate}]-> ${rel.objectSlug}`);
      continue;
    }

    const validation = validateRelationshipTriple({
      subjectEndpointType: "canonical_entity",
      subjectEntityType: subject.entityType,
      predicate: rel.predicate,
      objectEndpointType: "canonical_entity",
      objectEntityType: object.entityType,
    });

    if (!validation.valid) {
      errors.push(`${rel.subjectSlug} -[${rel.predicate}]-> ${rel.objectSlug}: ${validation.errors.join("; ")}`);
      continue;
    }

    proposals.push(
      baseProposal(spec, {
        proposal_fingerprint: fingerprint(["rel", rel.subjectSlug, rel.predicate, rel.objectSlug]),
        proposal_type: "add_canonical_relationship",
        proposed_predicate: rel.predicate,
        review_status: HIGH_RISK_PREDICATES.has(rel.predicate) ? "needs_review" : "generated",
        metadata: {
          subject_slug: rel.subjectSlug,
          subject_entity_type: subject.entityType,
          object_slug: rel.objectSlug,
          object_entity_type: object.entityType,
          relationship_metadata: rel.metadata ?? {},
          high_risk: HIGH_RISK_PREDICATES.has(rel.predicate),
        },
        evidence_summary: `Relationship ${rel.predicate}`,
      })
    );
  }

  for (const claim of spec.claimDrafts) {
    proposals.push(
      baseProposal(spec, {
        proposal_fingerprint: fingerprint(["claim", claim.draftId]),
        proposal_type: "propose_educational_claim",
        review_status: "needs_review",
        confidence: 0.75,
        confidence_tier: "medium",
        evidence_summary: claim.sourceNote,
        source_signal_ids: [spec.sourceIds.prepareTopicId],
        metadata: {
          draft_id: claim.draftId,
          claim_type: claim.claimType,
          claim_text: claim.claimText,
          primary_entity_slug: claim.primaryEntitySlug,
          importance_level: claim.importanceLevel,
          content_source: claim.contentSource,
          context_relevance: claim.contextRelevance ?? [],
          verified: false,
        },
      })
    );
  }

  for (const dp of spec.decisionPointDrafts) {
    proposals.push(
      baseProposal(spec, {
        proposal_fingerprint: fingerprint(["dp", dp.draftId]),
        proposal_type: "propose_decision_point",
        review_status: "needs_review",
        confidence: 0.7,
        confidence_tier: "medium",
        evidence_summary: dp.sourceNote,
        metadata: {
          draft_id: dp.draftId,
          subject_entity_slug: dp.subjectEntitySlug,
          pattern_type: dp.patternType,
          trigger: dp.trigger,
          action: dp.action,
          urgency: dp.urgency,
          safety_criticality: dp.safetyCriticality,
          content_source: dp.contentSource,
          requires_attending_review: dp.requiresAttendingReview,
          verified: false,
        },
      })
    );
  }

  proposals.push(
    baseProposal(spec, {
      proposal_fingerprint: fingerprint([
        "bridge",
        spec.sourceIds.curriculumNodeSlug,
        spec.primaryEntitySlug,
      ]),
      proposal_type: "link_curriculum_node_to_entity",
      proposed_bridge_type: "primary_coverage",
      review_status: "needs_review",
      confidence: 0.95,
      evidence_summary: `Bridge ${spec.sourceIds.curriculumNodeSlug} to ${spec.primaryEntitySlug} entity`,
      source_signal_type: "curriculum_node",
      source_signal_ids: [spec.sourceIds.curriculumNodeSlug],
      metadata: {
        curriculum_node_slug: spec.sourceIds.curriculumNodeSlug,
        primary_entity_slug: spec.primaryEntitySlug,
        legacy_card_mappings: spec.assetCounts.ankiCardMappings,
        legacy_question_mappings: spec.assetCounts.orthobulletsQuestionMappings,
      },
    })
  );

  return {
    pilotKey: spec.pilotKey,
    proposals,
    validationErrors: errors,
  };
}