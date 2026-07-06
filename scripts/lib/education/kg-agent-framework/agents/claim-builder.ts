/**
 * Evidence-aware Claim Builder — generates atomic educational claims from KnowledgeEvidencePacket.
 */

import type { ProposalRecord } from "../../../../kg-automation-common.ts";
import type { AgentCapability, AgentIdentity, AgentInputBundle, WorkAssignment } from "../contract.ts";
import {
  buildClaimBuilderOutput,
  type ClaimBuilderOutput,
} from "../claim-builder/claim-builder-reports.ts";
import {
  claimCandidateToProposal,
  extractClaimCandidatesFromEvidence,
} from "../claim-builder/evidence-to-claim.ts";
import { resolveProposalsForGaps } from "../gap-proposal-matcher.ts";
import { BaseKnowledgeFactoryAgent } from "../lifecycle.ts";
import { scoreGapMatch } from "../matching.ts";
import {
  FRAMEWORK_CONTRACT_VERSION,
  MIN_COMPILER_VERSION,
  PROPOSAL_SCHEMA_VERSION,
  SUPPORTED_ONTOLOGY_VERSION,
} from "../versioning.ts";

const IDENTITY: AgentIdentity = {
  id: "claim-builder",
  name: "Claim Builder",
  description: "Generates atomic educational claim proposals from evidence packet items.",
  owner: "knowledge-factory",
  supportedOntologyVersion: SUPPORTED_ONTOLOGY_VERSION,
  versions: {
    contractVersion: FRAMEWORK_CONTRACT_VERSION,
    ontologyVersion: SUPPORTED_ONTOLOGY_VERSION,
    minCompilerVersion: MIN_COMPILER_VERSION,
    proposalSchemaVersion: PROPOSAL_SCHEMA_VERSION,
  },
};

const CAPABILITIES: AgentCapability = {
  produces: ["claims"],
  consumes: [
    "neighborhood_snapshot",
    "canonical_objects",
    "work_assignment",
    "proposal_packets",
    "evidence_packets",
  ],
  handlesGapKinds: ["missing_claim"],
  requires: ["relationship-builder"],
  confidenceRange: { min: 0.65, max: 0.85 },
  validationCategories: ["schema", "safety", "publication", "provenance"],
  proposalTypes: ["propose_educational_claim"],
};

function candidateMatchesGap(
  candidate: ReturnType<typeof extractClaimCandidatesFromEvidence>["candidates"][number],
  gap: WorkAssignment["gaps"][number]
): boolean {
  if (gap.anchorEntitySlug && candidate.primaryEntitySlug !== gap.anchorEntitySlug) return false;
  if (gap.claimType) {
    const types = gap.claimType.split("|");
    if (!types.includes(candidate.claimType)) return false;
  }
  return true;
}

function selectClaimsForGaps(
  candidates: ReturnType<typeof extractClaimCandidatesFromEvidence>["candidates"],
  gaps: WorkAssignment["gaps"]
) {
  const selected: typeof candidates = [];

  for (const gap of gaps) {
    const match = candidates.find(
      (c) => candidateMatchesGap(c, gap) && !selected.some((s) => s.draftId === c.draftId)
    );
    if (match) selected.push({ ...match, gapId: gap.id });
  }

  for (const c of candidates) {
    if (selected.length >= Math.max(gaps.length, 8)) break;
    if (!selected.some((s) => s.draftId === c.draftId)) {
      if (gaps.some((g) => candidateMatchesGap(c, g)) || gaps.length === 0) {
        selected.push(c);
      }
    }
  }

  if (selected.length === 0 && candidates.length > 0) {
    return candidates.slice(0, Math.min(candidates.length, Math.max(gaps.length, 6)));
  }

  return selected;
}

export class ClaimBuilderAgent extends BaseKnowledgeFactoryAgent {
  readonly identity = IDENTITY;
  readonly capabilities = CAPABILITIES;

  canHandle(assignment: Pick<WorkAssignment, "gaps" | "type">): boolean {
    if (assignment.type !== "gap_resolution") return false;
    return assignment.gaps.some((g) => scoreGapMatch(CAPABILITIES, g).matches);
  }

  protected async run(input: AgentInputBundle, assignment: WorkAssignment) {
    const packet = input.knowledgeEvidencePacket;
    const pool = input.existingProposals ?? [];

    let proposals: ProposalRecord[] = [];
    let extraction = extractClaimCandidatesFromEvidence(
      packet,
      input.evidenceContext,
      assignment.gaps,
      input.neighborhood
    );

    if (packet || input.evidenceContext) {
      const selected = selectClaimsForGaps(extraction.candidates, assignment.gaps);
      proposals = selected.map((c) =>
        claimCandidateToProposal(c, input.neighborhood.pilotKey, packet?.packetId)
      );
    }

    if (proposals.length === 0) {
      const fallback = resolveProposalsForGaps(
        assignment.gaps,
        pool,
        ["propose_educational_claim"]
      ) as ProposalRecord[];
      proposals = fallback.map((p) => ({
        ...p,
        metadata: {
          ...p.metadata,
          generated_by: "claim-builder-fallback",
          evidence_item_ids: input.evidenceContext?.relevantEvidenceItemIds ?? [],
          verified: false,
          content_source: "generated_draft",
          publication_eligible: false,
        },
      }));
    }

    const gapsAddressed = assignment.gaps.filter((gap) =>
      proposals.some((p) => {
        const anchor = String(p.metadata?.primary_entity_slug ?? "");
        if (gap.anchorEntitySlug && anchor !== gap.anchorEntitySlug) return false;
        if (gap.claimType) {
          const types = gap.claimType.split("|");
          return types.includes(String(p.metadata?.claim_type ?? ""));
        }
        return true;
      })
    ).length;

    const report: ClaimBuilderOutput = buildClaimBuilderOutput({
      evidencePacketId: packet?.packetId ?? input.evidenceContext?.evidencePacketId,
      gaps: { scheduled: assignment.gaps.length, addressed: gapsAddressed },
      extraction,
      proposals,
    });

    return {
      proposals,
      outputs: {
        gapsScheduled: assignment.gaps.length,
        gapsAddressed,
        proposalsGenerated: proposals.length,
        evidenceGenerated: proposals.filter((p) => p.metadata?.generated_by === "claim-builder-v2").length,
        gapsUnmatched: assignment.gaps.length - gapsAddressed,
        claimBuilderReport: report,
        redirectedToDecisionPoint: extraction.redirectedToDp,
        executable: true,
      },
    };
  }
}