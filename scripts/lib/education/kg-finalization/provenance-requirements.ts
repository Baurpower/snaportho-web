import type { FinalizationObjectKind } from "./types.ts";

export type LifecycleStage = "draft" | "staging" | "publication";

export type ProvenanceRequirement = {
  objectKind: FinalizationObjectKind;
  draftMinimum: string[];
  stagingMinimum: string[];
  publicationMinimum: string[];
};

export const PROVENANCE_REQUIREMENTS: ProvenanceRequirement[] = [
  {
    objectKind: "entity",
    draftMinimum: ["source_or_registry_marker", "review_status_or_draft_marker"],
    stagingMinimum: ["source_or_registry_marker", "identity_review_status"],
    publicationMinimum: ["source_type", "source_identifier", "source_title_or_path", "evidence_confidence", "approved_review_status"],
  },
  {
    objectKind: "relationship",
    draftMinimum: ["source_or_inherited_relationship", "review_status_or_draft_marker"],
    stagingMinimum: ["source_or_inherited_relationship", "evidence_class", "review_status"],
    publicationMinimum: ["source_type", "source_identifier", "source_title_or_path", "evidence_confidence", "approved_review_status"],
  },
  {
    objectKind: "claim",
    draftMinimum: ["content_source", "review_status"],
    stagingMinimum: ["source_identifier_or_content_source", "evidence_confidence_or_draft_marker", "review_status"],
    publicationMinimum: ["source_identifier", "source_title_or_path", "extraction_method", "evidence_confidence", "approved_review_status"],
  },
  {
    objectKind: "decision_point",
    draftMinimum: ["risk_classification_or_safety_marker", "review_status_or_attending_flag"],
    stagingMinimum: ["supporting_source_or_review_overlay", "risk_classification", "clinical_review_status"],
    publicationMinimum: ["supporting_source_records", "clinical_reviewer_approval", "risk_classification", "approved_review_status"],
  },
];

export function provenanceRequirementMatrix(): Array<Record<string, unknown>> {
  return PROVENANCE_REQUIREMENTS.map((requirement) => ({
    object_type: requirement.objectKind,
    draft_minimum: requirement.draftMinimum,
    staging_minimum: requirement.stagingMinimum,
    publication_minimum: requirement.publicationMinimum,
  }));
}

export function missingDraftProvenance(kind: FinalizationObjectKind, object: Record<string, unknown>): string[] {
  const metadata = (object.metadata ?? {}) as Record<string, unknown>;
  if (kind === "entity") {
    return [
      ...((object.source || metadata.source || metadata._provenance_fingerprint || metadata.shared_reference) ? [] : ["source_or_registry_marker"]),
      ...((metadata.review_status || metadata.verified != null || object.source === "database") ? [] : ["review_status_or_draft_marker"]),
    ];
  }
  if (kind === "relationship") {
    return [
      ...((object.source || metadata.source || metadata._provenance_fingerprint) ? [] : ["source_or_inherited_relationship"]),
      ...((metadata.review_status || metadata.reviewStatus) ? [] : ["review_status_or_draft_marker"]),
    ];
  }
  if (kind === "claim") {
    return [
      ...((object.contentSource || metadata.source_identifier || metadata.source) ? [] : ["content_source"]),
      ...((object.reviewStatus || metadata.review_status) ? [] : ["review_status"]),
    ];
  }
  return [
    ...((metadata.risk_classification || object.safetyCriticality || object.requiresAttendingReview != null) ? [] : ["risk_classification_or_safety_marker"]),
    ...((metadata.review_status || metadata.clinical_review_status || object.requiresAttendingReview != null) ? [] : ["review_status_or_attending_flag"]),
  ];
}

export function missingPublicationProvenance(kind: FinalizationObjectKind, object: Record<string, unknown>): string[] {
  const metadata = (object.metadata ?? {}) as Record<string, unknown>;
  if (kind === "claim") {
    return [
      ...(metadata.source_identifier || object.contentSource ? [] : ["source_identifier"]),
      ...(metadata.source_title || metadata.source_path ? [] : ["source_title_or_path"]),
      ...(metadata.extraction_method ? [] : ["extraction_method"]),
      ...(metadata.evidence_confidence || metadata.evidenceConfidence ? [] : ["evidence_confidence"]),
      ...(/approved/i.test(String(object.reviewStatus ?? metadata.review_status ?? "")) ? [] : ["approved_review_status"]),
    ];
  }
  return [
    ...(metadata.source_type ? [] : ["source_type"]),
    ...(metadata.source_identifier || metadata.source || object.source ? [] : ["source_identifier"]),
    ...(metadata.source_title || metadata.source_path ? [] : ["source_title_or_path"]),
    ...(metadata.evidence_confidence || metadata.evidenceConfidence ? [] : ["evidence_confidence"]),
    ...(/approved/i.test(String(metadata.review_status ?? metadata.reviewStatus ?? "")) ? [] : ["approved_review_status"]),
  ];
}
