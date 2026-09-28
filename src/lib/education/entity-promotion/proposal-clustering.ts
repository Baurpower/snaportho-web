/** Proposed ↔ proposed duplicate clustering (Step 8).
 *
 * Union-find over proposals with conservative pairwise signals: shared match
 * keys (normalization variants), acronym↔expansion initials, and high
 * trigram+containment fuzzy pairs. Clusters recommend one head:
 * prefer the full (non-acronym) form with the most claim support.
 */

import {
  entityMatchKeys,
  looksLikeAcronym,
  tokenContainment,
  trigramSimilarity,
} from "./entity-label-normalization";

export const PROPOSAL_CLUSTERING_VERSION = "proposal-clustering.v1" as const;

export type ClusterableProposal = {
  entityId: string;
  preferredLabel: string;
  normalizedLabel: string;
  entityType: string;
  claimIds: string[];
  cardIds: string[];
};

export type ProposalCluster = {
  clusterId: string;
  memberIds: string[];
  headId: string;
  linkReasons: string[];
  recommendation: "promote_head_alias_rest" | "alias_all_to_canonical" | "reject_all" | "defer";
  rationale: string;
};

function initialsOf(normalized: string): string {
  return normalized
    .split(" ")
    .filter(Boolean)
    .map((token) => token[0])
    .join("");
}

function pairwiseLink(
  left: ClusterableProposal,
  right: ClusterableProposal,
): string | null {
  const leftKeys = new Set(entityMatchKeys(left.preferredLabel));
  if (left.normalizedLabel) leftKeys.add(left.normalizedLabel);
  const rightKeys = entityMatchKeys(right.preferredLabel);
  if (right.normalizedLabel) rightKeys.push(right.normalizedLabel);
  if (rightKeys.some((key) => leftKeys.has(key))) return "shared_match_key";

  const leftNorm = left.normalizedLabel || [...leftKeys][0] || "";
  const rightNorm = right.normalizedLabel || rightKeys[0] || "";
  const leftTokens = leftNorm.split(" ").filter(Boolean);
  const rightTokens = rightNorm.split(" ").filter(Boolean);
  // Acronym ↔ expansion: "ACL" / "anterior cruciate ligament".
  // Two-letter acronyms are excluded: initials collide constantly ("CT" =
  // "cut tubia" / "complete tear" / "claw toes"). Short acronyms resolve
  // through expert expansion review instead of clustering.
  if (
    leftTokens.length === 1
    && leftTokens[0]!.length >= 3
    && rightTokens.length > 1
    && looksLikeAcronym(left.preferredLabel)
  ) {
    if (initialsOf(rightNorm) === leftTokens[0]) return "acronym_expansion";
  }
  if (
    rightTokens.length === 1
    && rightTokens[0]!.length >= 3
    && leftTokens.length > 1
    && looksLikeAcronym(right.preferredLabel)
  ) {
    if (initialsOf(leftNorm) === rightTokens[0]) return "acronym_expansion";
  }
  // Conservative fuzzy: high trigram AND full containment (spelling variants,
  // elided duplicates). Both gates required to avoid merging neighbors.
  const trigram = trigramSimilarity(leftNorm, rightNorm);
  const containment = tokenContainment(leftNorm, rightNorm);
  if (trigram >= 0.85 && containment === 1) return "fuzzy_variant";
  return null;
}

function pickHead(members: ClusterableProposal[]): ClusterableProposal {
  // Prefer full forms over acronyms, then claim support, then card spread,
  // then longest label, then stable id order.
  return [...members].sort((a, b) => {
    const aAcronym = looksLikeAcronym(a.preferredLabel) ? 1 : 0;
    const bAcronym = looksLikeAcronym(b.preferredLabel) ? 1 : 0;
    if (aAcronym !== bAcronym) return aAcronym - bAcronym;
    if (a.claimIds.length !== b.claimIds.length) return b.claimIds.length - a.claimIds.length;
    if (a.cardIds.length !== b.cardIds.length) return b.cardIds.length - a.cardIds.length;
    if (a.preferredLabel.length !== b.preferredLabel.length) {
      return b.preferredLabel.length - a.preferredLabel.length;
    }
    return a.entityId.localeCompare(b.entityId);
  })[0];
}

export function clusterProposals(proposals: ClusterableProposal[]): ProposalCluster[] {
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    let root = parent.get(id) ?? id;
    while ((parent.get(root) ?? root) !== root) root = parent.get(root) ?? root;
    parent.set(id, root);
    return root;
  };
  const union = (a: string, b: string): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  const linkReasons = new Map<string, Set<string>>();
  const recordReason = (a: string, b: string, reason: string): void => {
    union(a, b);
    const root = find(a);
    const set = linkReasons.get(root) ?? new Set<string>();
    set.add(reason);
    linkReasons.set(root, set);
  };
  for (const proposal of proposals) parent.set(proposal.entityId, proposal.entityId);
  for (let i = 0; i < proposals.length; i++) {
    for (let j = i + 1; j < proposals.length; j++) {
      const reason = pairwiseLink(proposals[i], proposals[j]);
      if (reason) recordReason(proposals[i].entityId, proposals[j].entityId, reason);
    }
  }
  const groups = new Map<string, ClusterableProposal[]>();
  for (const proposal of proposals) {
    const root = find(proposal.entityId);
    const group = groups.get(root) ?? [];
    group.push(proposal);
    groups.set(root, group);
  }
  const clusters: ProposalCluster[] = [];
  for (const [root, members] of groups) {
    if (members.length < 2) continue;
    const head = pickHead(members);
    const reasons = [...(linkReasons.get(root) ?? new Set<string>())];
    clusters.push({
      clusterId: root,
      memberIds: members.map((member) => member.entityId).sort(),
      headId: head.entityId,
      linkReasons: reasons.sort(),
      recommendation: "promote_head_alias_rest",
      rationale: `cluster of ${members.length} proposals; head "${head.preferredLabel}" by claim support and full-form preference`,
    });
  }
  clusters.sort((a, b) => b.memberIds.length - a.memberIds.length);
  return clusters;
}
