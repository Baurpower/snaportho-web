/**
 * Generate ankle fracture pilot proposal packet.
 *
 * Outputs JSON artifacts only — does NOT apply to canonical truth.
 * Claims and DPs remain generated_draft / needs_review.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  ANKLE_CLAIM_DRAFTS,
  ANKLE_DECISION_POINT_DRAFTS,
  ANKLE_ENTITIES,
  ANKLE_PILOT_KEY,
  ANKLE_SOURCE_IDS,
  ANKLE_ASSET_COUNTS,
  activeAnkleRelationships,
  slugToEntityMap,
} from "./lib/education/kg-ankle-pilot-spec.ts";
import {
  HIGH_RISK_PREDICATES,
  validateRelationshipTriple,
} from "./lib/education/kg-relationship-registry.ts";

type ProposalFingerprint = string;

function fingerprint(parts: string[]): ProposalFingerprint {
  return parts.join("|").toLowerCase().replace(/\s+/g, " ");
}

function buildEntityProposals() {
  return ANKLE_ENTITIES.map((entity) => ({
    proposal_type: "create_canonical_entity" as const,
    proposal_fingerprint: fingerprint(["create", entity.entityType, entity.slug]),
    proposed_entity_type: entity.entityType,
    proposed_entity_label: entity.preferredLabel,
    review_status: "generated" as const,
    confidence: 0.92,
    confidence_tier: "high" as const,
    confidence_reason: "ankle_pilot_spec_v1",
    evidence_summary: `Pilot spec entity for ${ANKLE_PILOT_KEY}`,
    source_signal_type: "reference_import",
    source_signal_ids: [ANKLE_SOURCE_IDS.curriculumNodeSlug, ANKLE_SOURCE_IDS.prepareTopicId],
    metadata: {
      slug: entity.slug,
      description: entity.description,
      pilot: ANKLE_PILOT_KEY,
      ...entity.metadata,
    },
  }));
}

function buildRelationshipProposals() {
  const bySlug = slugToEntityMap();
  const proposals = [];
  const errors: string[] = [];

  for (const rel of activeAnkleRelationships()) {
    const subject = bySlug.get(rel.subjectSlug);
    const object = bySlug.get(rel.objectSlug);
    if (!subject || !object) {
      errors.push(`Missing entity for relationship ${rel.subjectSlug} -[${rel.predicate}]-> ${rel.objectSlug}`);
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

    proposals.push({
      proposal_type: "add_canonical_relationship" as const,
      proposal_fingerprint: fingerprint(["rel", rel.subjectSlug, rel.predicate, rel.objectSlug]),
      proposed_predicate: rel.predicate,
      review_status: HIGH_RISK_PREDICATES.has(rel.predicate) ? ("needs_review" as const) : ("generated" as const),
      confidence: 0.88,
      confidence_tier: "high" as const,
      confidence_reason: "ankle_pilot_spec_v1",
      evidence_summary: `Pilot relationship ${rel.predicate}`,
      source_signal_type: "reference_import",
      source_signal_ids: [ANKLE_SOURCE_IDS.prepareTopicId],
      metadata: {
        pilot: ANKLE_PILOT_KEY,
        subject_slug: rel.subjectSlug,
        subject_entity_type: subject.entityType,
        object_slug: rel.objectSlug,
        object_entity_type: object.entityType,
        relationship_metadata: rel.metadata ?? {},
        high_risk: HIGH_RISK_PREDICATES.has(rel.predicate),
      },
    });
  }

  return { proposals, errors };
}

function buildClaimProposals() {
  return ANKLE_CLAIM_DRAFTS.map((claim) => ({
    proposal_type: "educational_claim_draft" as const,
    proposal_fingerprint: fingerprint(["claim", claim.draftId]),
    review_status: claim.reviewStatus,
    content_source: claim.contentSource,
    metadata: {
      pilot: ANKLE_PILOT_KEY,
      draft_id: claim.draftId,
      claim_type: claim.claimType,
      claim_text: claim.claimText,
      primary_entity_slug: claim.primaryEntitySlug,
      importance_level: claim.importanceLevel,
      context_relevance: claim.contextRelevance ?? [],
      source_note: claim.sourceNote,
      verified: false,
    },
  }));
}

function buildDecisionPointProposals() {
  return ANKLE_DECISION_POINT_DRAFTS.map((dp) => ({
    proposal_type: "decision_point_draft" as const,
    proposal_fingerprint: fingerprint(["dp", dp.draftId]),
    review_status: dp.reviewStatus,
    content_source: dp.contentSource,
    metadata: {
      pilot: ANKLE_PILOT_KEY,
      draft_id: dp.draftId,
      subject_entity_slug: dp.subjectEntitySlug,
      pattern_type: dp.patternType,
      trigger: dp.trigger,
      action: dp.action,
      urgency: dp.urgency,
      safety_criticality: dp.safetyCriticality,
      source_note: dp.sourceNote,
      requires_attending_review: dp.requiresAttendingReview,
      verified: false,
    },
  }));
}

function buildBridgeProposal() {
  return {
    proposal_type: "link_curriculum_node_to_entity" as const,
    proposal_fingerprint: fingerprint(["bridge", ANKLE_SOURCE_IDS.curriculumNodeSlug, "ankle-fracture"]),
    proposed_bridge_type: "primary_coverage" as const,
    review_status: "needs_review" as const,
    confidence: 0.95,
    confidence_tier: "high" as const,
    evidence_summary: "Legacy retarget node trauma-ankle-fractures maps to ankle fracture entity",
    source_signal_type: "curriculum_node",
    source_signal_ids: [ANKLE_SOURCE_IDS.curriculumNodeSlug],
    metadata: {
      pilot: ANKLE_PILOT_KEY,
      curriculum_node_slug: ANKLE_SOURCE_IDS.curriculumNodeSlug,
      primary_entity_slug: "ankle-fracture",
      legacy_card_mappings: ANKLE_ASSET_COUNTS.ankiCardMappings,
      legacy_question_mappings: ANKLE_ASSET_COUNTS.orthobulletsQuestionMappings,
    },
  };
}

async function main() {
  const outDir = path.join(process.cwd(), "reports", "kg-pilots");
  mkdirSync(outDir, { recursive: true });

  const entityProposals = buildEntityProposals();
  const { proposals: relationshipProposals, errors: relationshipErrors } = buildRelationshipProposals();
  const claimProposals = buildClaimProposals();
  const dpProposals = buildDecisionPointProposals();
  const bridgeProposal = buildBridgeProposal();

  const packet = {
    generatedAt: new Date().toISOString(),
    pilotKey: ANKLE_PILOT_KEY,
    sourceIds: ANKLE_SOURCE_IDS,
    assetCounts: ANKLE_ASSET_COUNTS,
    summary: {
      entityProposals: entityProposals.length,
      relationshipProposals: relationshipProposals.length,
      claimDraftProposals: claimProposals.length,
      decisionPointDraftProposals: dpProposals.length,
      relationshipValidationErrors: relationshipErrors.length,
    },
    publicationPolicy: {
      autoPublish: false,
      claimsVerified: false,
      decisionPointsVerified: false,
      note: "All medical assertions remain generated_draft until human review.",
    },
    entityProposals,
    relationshipProposals,
    claimDraftProposals: claimProposals,
    decisionPointDraftProposals: dpProposals,
    bridgeProposals: [bridgeProposal],
    relationshipValidationErrors: relationshipErrors,
  };

  const outPath = path.join(outDir, "ankle-proposal-packet.json");
  writeFileSync(outPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        ok: relationshipErrors.length === 0,
        outPath,
        ...packet.summary,
        publicationPolicy: packet.publicationPolicy,
      },
      null,
      2
    )
  );

  if (relationshipErrors.length > 0) {
    console.error("Relationship validation errors:");
    for (const err of relationshipErrors) {
      console.error(`  - ${err}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});