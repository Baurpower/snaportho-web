/**
 * Build agent-scoped evidence context from a KnowledgeEvidencePacket.
 */

import type { WorkAssignment } from "../kg-agent-framework/contract.ts";
import type { EvidenceAgentContext, KnowledgeEvidencePacket } from "./evidence-packet.ts";

const GAP_KIND_EVIDENCE_TYPES: Record<string, string[]> = {
  missing_entity: ["canonical_snapshot", "static_prepare", "curriculum_node"],
  missing_relationship: ["canonical_snapshot", "curriculum_node", "quality_signal"],
  missing_claim: ["static_prepare", "proposal_history", "quality_signal"],
  missing_decision_point: ["static_prepare", "quality_signal"],
  missing_metadata: ["canonical_snapshot", "quality_signal"],
  missing_asset_link: ["anki_card", "orthobullets_question", "caseprep"],
  missing_provenance: ["proposal_history", "review_history"],
};

export function selectRelevantEvidenceIds(
  packet: KnowledgeEvidencePacket,
  assignment: WorkAssignment
): string[] {
  const types = new Set<string>();
  for (const gap of assignment.gaps) {
    for (const t of GAP_KIND_EVIDENCE_TYPES[gap.kind] ?? []) types.add(t);
  }
  if (assignment.type === "review") {
    types.add("proposal_history");
    types.add("review_history");
    types.add("quality_signal");
  }
  if (assignment.type === "publication_validation") {
    types.add("quality_signal");
    types.add("canonical_snapshot");
  }
  if (assignment.type === "quality_scoring") {
    types.add("canonical_snapshot");
    types.add("proposal_history");
  }
  if (types.size === 0) {
    return packet.sourceEvidence.slice(0, 6).map((e) => e.evidenceId);
  }
  return packet.sourceEvidence
    .filter((e) => types.has(e.sourceType))
    .map((e) => e.evidenceId);
}

export function buildEvidenceAgentContext(
  packet: KnowledgeEvidencePacket,
  assignment: WorkAssignment
): EvidenceAgentContext {
  const relevantEvidenceItemIds = selectRelevantEvidenceIds(packet, assignment);
  const relevantItems = packet.sourceEvidence.filter((e) =>
    relevantEvidenceItemIds.includes(e.evidenceId)
  );

  const confidenceHints = Object.fromEntries(
    relevantItems.map((e) => [e.evidenceId, e.confidenceHint])
  );
  const provenanceHints = relevantItems.map((e) => e.provenanceHint);

  return {
    evidencePacketId: packet.packetId,
    relevantEvidenceItemIds,
    sourceEvidenceSummary: relevantItems.map((e) => `${e.label}: ${e.summary}`).join("; "),
    canonicalSnapshotSummary: `${packet.canonicalSnapshot.entityCount} entities, ${packet.canonicalSnapshot.relationshipCount} relationships (${packet.canonicalSnapshot.source})`,
    confidenceHints,
    provenanceHints,
    safetySignals: [...packet.safetySignals],
  };
}

export function toAgentEvidenceRefs(packet: KnowledgeEvidencePacket) {
  return packet.sourceEvidence.map((e) => ({
    packetId: packet.packetId,
    sourceType: e.sourceType,
    sourceIds: [e.sourceId],
    summary: e.summary,
    quality: e.confidenceHint,
    evidenceItemId: e.evidenceId,
  }));
}