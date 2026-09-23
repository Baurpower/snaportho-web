import { sha256, deterministicUuid } from "../deck-foundation";
import {
  CLAIM_OVERLAP_GOLD_CONTRACT,
  goldSetMixErrors,
  type ClaimOverlapGoldItem,
  type GoldItemFormat,
} from "../contracts/claim-overlap-v1";
import {
  CLINICAL_CLAIM_CONTRACT_VERSION,
  clinicalClaimFingerprintHash,
  type CardClaimLinkV1,
  type ClinicalClaimQualifiers,
  type ClinicalClaimRecordV1,
  type ClinicalClaimType,
} from "../contracts/clinical-claim-v1";
import type { ClaimOverlapInventory, ClaimOverlapInventoryCard } from "../claim-overlap-matcher";

const SPECIALTIES = [
  "adult-recon", "trauma", "sports", "spine", "hand",
  "foot-ankle", "oncology", "shoulder", "peds-ortho", "tumor",
] as const;

type Role =
  | "serve"
  | "serve_sibling"
  | "no_card"
  | "contraindication"
  | "complication"
  | "pediatric"
  | "algorithm"
  | "ambiguous";

function roleFor(index: number): Role {
  if (index < 29) return "serve";
  if (index < 33) return "serve_sibling";
  if (index < 38) return "no_card";
  if (index < 40) return "contraindication";
  if (index < 42) return "complication";
  if (index === 42) return "pediatric";
  if (index === 43) return "algorithm";
  return "ambiguous";
}

function formatFor(role: Role, index: number): GoldItemFormat {
  if (role === "no_card") return "no_card";
  if (role === "contraindication") return "contraindication";
  if (role === "complication") return "complication";
  if (role === "algorithm") return "algorithm";
  if (role === "serve" && index < 5) return "image";
  return "text";
}

function claimShape(role: Role, index: number): {
  claimType: ClinicalClaimType;
  predicate: string;
  objectText: string;
  qualifiers: ClinicalClaimQualifiers;
  claimText: string;
} {
  if (role === "contraindication") {
    return {
      claimType: "contraindication",
      predicate: "contraindication",
      objectText: `closed treatment ${index}`,
      qualifiers: {},
      claimText: `Closed treatment ${index} is contraindicated for this injury pattern.`,
    };
  }
  if (role === "complication") {
    return {
      claimType: "complication",
      predicate: "complication_of",
      objectText: `nerve palsy ${index}`,
      qualifiers: {},
      claimText: `Nerve palsy ${index} is a recognized complication of this approach.`,
    };
  }
  if (role === "pediatric") {
    return {
      claimType: "fact",
      predicate: "teaches_fact",
      objectText: `growth remaining ${index}`,
      qualifiers: { age_group: "pediatric" },
      claimText: `Growth remaining ${index} changes implant choice in pediatric patients.`,
    };
  }
  if (role === "ambiguous") {
    return {
      claimType: "treatment_indication",
      predicate: "preferred_treatment",
      objectText: `unresolved method ${index}`,
      qualifiers: {},
      claimText: `Unresolved method ${index} is not uniquely mapped in the inventory.`,
    };
  }
  return {
    claimType: "treatment_indication",
    predicate: "preferred_treatment",
    objectText: `preferred method ${index}`,
    qualifiers: index % 3 === 0 ? { setting: "revision" } : {},
    claimText: `Preferred method ${index} is the indicated reconstruction for this defect.`,
  };
}

function makeClaim(input: {
  itemId: string;
  entityId: string;
  claimType: ClinicalClaimType;
  predicate: string;
  objectText: string;
  qualifiers: ClinicalClaimQualifiers;
  claimText: string;
}): ClinicalClaimRecordV1 {
  const fingerprintHash = clinicalClaimFingerprintHash({
    claimType: input.claimType,
    primaryEntityId: input.entityId,
    predicate: input.predicate,
    objectText: input.objectText,
    qualifiers: input.qualifiers,
  });
  return {
    contractVersion: CLINICAL_CLAIM_CONTRACT_VERSION,
    claimId: deterministicUuid(`gold|claim|${input.itemId}|${input.objectText}`),
    currentVersionId: deterministicUuid(`gold|claimver|${input.itemId}|${input.objectText}`),
    fingerprintHash,
    claimText: input.claimText,
    claimType: input.claimType,
    predicate: input.predicate,
    objectText: input.objectText,
    qualifiers: input.qualifiers,
    primaryEntityId: input.entityId,
    approvalMethod: "machine_consensus",
    algorithmVersion: "card-claim-factory.v1",
    isActive: true,
  };
}

function makeCard(itemId: string, slot: string, noteGuid: string, ordinal: number): ClaimOverlapInventoryCard {
  return {
    canonicalCardId: deterministicUuid(`gold|card|${itemId}|${slot}`),
    canonicalCardVersionId: deterministicUuid(`gold|cardver|${itemId}|${slot}`),
    noteGuid,
    cardOrdinal: ordinal,
    active: true,
    currentVersion: true,
    atomic: true,
  };
}

function makeLink(claim: ClinicalClaimRecordV1, card: ClaimOverlapInventoryCard): CardClaimLinkV1 {
  return {
    contractVersion: CLINICAL_CLAIM_CONTRACT_VERSION,
    canonicalCardId: card.canonicalCardId,
    canonicalCardVersionId: card.canonicalCardVersionId,
    claimId: claim.claimId,
    claimVersionId: claim.currentVersionId!,
    mappingRole: "teaches",
    confidence: 0.97,
    approvalMethod: "machine_consensus",
    reviewStatus: "auto_approved",
    algorithmVersion: "card-claim-factory.v1",
    evidenceLocator: "cloze",
    evidenceHashes: [sha256(`gold|evidence|${card.canonicalCardId}`)],
    reasonCodes: ["machine_consensus"],
    metadata: { gold: true },
    isActive: true,
  };
}

export function buildClaimOverlapGoldV1(): {
  items: ClaimOverlapGoldItem[];
  inventory: ClaimOverlapInventory;
} {
  const items: ClaimOverlapGoldItem[] = [];
  const claims: ClinicalClaimRecordV1[] = [];
  const links: CardClaimLinkV1[] = [];
  const cards: ClaimOverlapInventoryCard[] = [];

  for (let index = 0; index < 50; index += 1) {
    const role = roleFor(index);
    const itemId = `gold-${String(index).padStart(2, "0")}`;
    const provider = index < 25 ? "orthobullets" : "rock_himalaya";
    const nativeQuestionId = provider === "orthobullets" ? String(210000 + index) : `item-${1000 + index}`;
    const entityId = deterministicUuid(`gold|entity|${itemId}`);
    const shape = claimShape(role, index);
    const testedClaim = {
      ...shape,
      primaryEntityId: entityId,
      fingerprintHash: clinicalClaimFingerprintHash({
        claimType: shape.claimType,
        primaryEntityId: entityId,
        predicate: shape.predicate,
        objectText: shape.objectText,
        qualifiers: shape.qualifiers,
      }),
    };
    const primary = makeCard(itemId, "primary", `note-${itemId}`, 0);
    const support = makeCard(itemId, "support", `note-${itemId}-support`, 0);
    const sibling = makeCard(itemId, "sibling", `note-${itemId}`, 1);
    const decoyCard = makeCard(itemId, "decoy", `note-${itemId}-decoy`, 0);
    const inventoryClaim = makeClaim({ itemId, entityId, ...shape });
    const decoyClaim = makeClaim({
      itemId,
      entityId,
      claimType: shape.claimType,
      predicate: shape.predicate,
      objectText: `decoy method ${index}`,
      qualifiers: shape.qualifiers,
      claimText: `Decoy method ${index} is a related but different reconstruction.`,
    });

    let disposition: ClaimOverlapGoldItem["expected"]["disposition"] = "serve";
    let allowedCardIds: string[] = [];
    let primaryCardId: string | null = primary.canonicalCardId;
    let gapClass: ClaimOverlapGoldItem["expected"]["gapClass"] = null;
    let rationale = `Exact fingerprint should serve the primary teaching card for ${itemId}.`;

    if (role === "serve") {
      cards.push(primary, decoyCard);
      claims.push(inventoryClaim, decoyClaim);
      links.push(makeLink(inventoryClaim, primary), makeLink(decoyClaim, decoyCard));
      if (index % 2 === 0) {
        cards.push(support);
        links.push(makeLink(inventoryClaim, support));
        allowedCardIds = [primary.canonicalCardId, support.canonicalCardId];
      } else {
        allowedCardIds = [primary.canonicalCardId];
      }
    } else if (role === "serve_sibling") {
      cards.push(primary, sibling, decoyCard);
      claims.push(inventoryClaim, decoyClaim);
      links.push(makeLink(inventoryClaim, primary), makeLink(inventoryClaim, sibling), makeLink(decoyClaim, decoyCard));
      allowedCardIds = [primary.canonicalCardId];
      rationale = `Sibling cloze of the same note must not be returned with the primary card.`;
    } else if (role === "no_card") {
      claims.push(inventoryClaim);
      cards.push(decoyCard);
      claims.push(decoyClaim);
      links.push(makeLink(decoyClaim, decoyCard));
      disposition = "no_card";
      primaryCardId = null;
      allowedCardIds = [];
      gapClass = "missing_card";
      rationale = `The tested claim has no adequate teaching card.`;
    } else if (role === "ambiguous") {
      const altA = makeClaim({
        itemId,
        entityId,
        claimType: shape.claimType,
        predicate: shape.predicate,
        objectText: `candidate a ${index}`,
        qualifiers: shape.qualifiers,
        claimText: `Candidate A ${index} is one plausible reconstruction.`,
      });
      const altB = makeClaim({
        itemId,
        entityId,
        claimType: shape.claimType,
        predicate: shape.predicate,
        objectText: `candidate b ${index}`,
        qualifiers: shape.qualifiers,
        claimText: `Candidate B ${index} is another plausible reconstruction.`,
      });
      claims.push(altA, altB);
      cards.push(primary, support);
      links.push(makeLink(altA, primary), makeLink(altB, support));
      disposition = "abstain";
      primaryCardId = null;
      allowedCardIds = [];
      rationale = `Two type-entity matches sit below tau; the matcher must abstain.`;
    } else {
      cards.push(primary, decoyCard);
      claims.push(inventoryClaim, decoyClaim);
      links.push(makeLink(inventoryClaim, primary), makeLink(decoyClaim, decoyCard));
      disposition = "abstain";
      primaryCardId = null;
      allowedCardIds = [];
      rationale = `Safety-hold claim type or pediatric qualifier is not served in claim-overlap.v1.`;
    }

    items.push({
      contractVersion: CLAIM_OVERLAP_GOLD_CONTRACT,
      itemId,
      provider,
      nativeQuestionId,
      sourceFingerprintHash: sha256(`gold-source|${itemId}`),
      specialty: SPECIALTIES[index % SPECIALTIES.length],
      format: formatFor(role, index),
      testedClaim,
      expected: { disposition, primaryCardId, allowedCardIds, gapClass },
      rationale,
    });
  }

  const mixErrors = goldSetMixErrors(items);
  if (mixErrors.length) throw new Error(`gold_set_mix:${mixErrors.join(",")}`);
  return { items, inventory: { claims, links, cards } };
}
