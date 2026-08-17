import { createHash } from "node:crypto";

export const PORTABLE_TAG_REVIEW_PACKET_VERSION = "snaportho-portable-tag-review-packet.2" as const;
export const GROK_TAG_REVIEW_RUN_KEY = "snaportho-grok-full-review-v1" as const;

export type MetadataFacet = "anatomy" | "diagnosis" | "treatment" | "specialty";

export type OfficialNoteIdentity = {
  noteId: string;
  noteVersionId: string;
  stableGuid: string;
  contentChecksum: string;
};

export type ReleaseCardIdentity = {
  noteGuid: string;
  canonicalCardId: string;
  canonicalCardVersionId: string;
  contentHash: string;
};

export type JoinedOfficialCard = OfficialNoteIdentity & ReleaseCardIdentity;

export type OfficialJoinResult = {
  joined: JoinedOfficialCard[];
  missingGuids: string[];
  duplicateGuids: string[];
};

export type PortableTagReviewCard = {
  canonicalCardId: string;
  canonicalCardVersionId: string;
  contentHash: string;
  front: string;
  back: string;
  deckPath: string;
  existingTags: string[];
  noteId?: string;
  noteVersionId?: string;
  stableGuid?: string;
  priorAssertions?: Array<{
    facet: MetadataFacet;
    termId: string;
    preferredLabel: string;
    confidence: number;
    decision: string;
  }>;
  candidates: Record<MetadataFacet, Array<{
    termId: string;
    preferredLabel: string;
    aliases: string[];
    parentIds: string[];
    retrievalScore: number;
  }>>;
  reviewStatus?: "completed";
  reviewNotes?: string[];
  missingConcepts?: Array<{ facet: MetadataFacet; preferredLabel: string; rationale: string }>;
  assertions: Array<{
    facet: MetadataFacet;
    termId: string;
    confidence: number;
    evidence: Array<{ field: "front" | "back"; quote: string }>;
    rationaleCodes: string[];
  }>;
};

export type PortableTagReviewPacket = {
  schemaVersion: typeof PORTABLE_TAG_REVIEW_PACKET_VERSION;
  runId: string;
  runKey: string;
  batchId: string;
  batchKey: string;
  leaseOwner: string;
  taxonomyVersion: string;
  taxonomyVersionId: string;
  taxonomyLimit: number;
  inputChecksum: string;
  instructions: string[];
  reviewer?: { provider: string; model: string; reviewedAt: string };
  cards: PortableTagReviewCard[];
};

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value: unknown): string {
  return createHash("sha256")
    .update(typeof value === "string" ? value : stableJson(value))
    .digest("hex");
}

export function joinOfficialNotesToReleaseCards(
  notes: readonly OfficialNoteIdentity[],
  cards: readonly ReleaseCardIdentity[],
): OfficialJoinResult {
  const cardsByGuid = new Map<string, ReleaseCardIdentity[]>();
  for (const card of cards) {
    const rows = cardsByGuid.get(card.noteGuid) ?? [];
    rows.push(card);
    cardsByGuid.set(card.noteGuid, rows);
  }
  const joined: JoinedOfficialCard[] = [];
  const missingGuids: string[] = [];
  const duplicateGuids: string[] = [];
  for (const note of notes) {
    const matches = cardsByGuid.get(note.stableGuid) ?? [];
    if (matches.length === 0) {
      missingGuids.push(note.stableGuid);
      continue;
    }
    if (matches.length > 1) {
      duplicateGuids.push(note.stableGuid);
    }
    const card = [...matches].sort((left, right) =>
      left.canonicalCardVersionId.localeCompare(right.canonicalCardVersionId),
    )[0];
    joined.push({ ...note, ...card });
  }
  return { joined, missingGuids, duplicateGuids };
}

export function portablePacketChecksumInput(
  packet: Omit<PortableTagReviewPacket, "inputChecksum"> | PortableTagReviewPacket,
) {
  return {
    schemaVersion: packet.schemaVersion,
    runId: packet.runId,
    runKey: packet.runKey,
    batchId: packet.batchId,
    batchKey: packet.batchKey,
    taxonomyVersion: packet.taxonomyVersion,
    taxonomyVersionId: packet.taxonomyVersionId,
    taxonomyLimit: packet.taxonomyLimit,
    cards: packet.cards.map((card) => {
      const base = {
        canonicalCardId: card.canonicalCardId,
        canonicalCardVersionId: card.canonicalCardVersionId,
        contentHash: card.contentHash,
        front: card.front,
        back: card.back,
        deckPath: card.deckPath,
        existingTags: card.existingTags,
        candidates: card.candidates,
      };
      if (!card.noteId && !card.noteVersionId && !card.stableGuid) return base;
      return {
        ...base,
        noteId: card.noteId,
        noteVersionId: card.noteVersionId,
        stableGuid: card.stableGuid,
      };
    }),
  };
}

export function sealPortablePacket(
  packet: Omit<PortableTagReviewPacket, "inputChecksum">,
): PortableTagReviewPacket {
  return {
    ...packet,
    inputChecksum: sha256(portablePacketChecksumInput(packet)),
  };
}

export function pendingPacketFileName(batchKey: string): string {
  return `${batchKey}-pending.json`;
}

export function reviewedPacketFileName(batchKey: string): string {
  return `${batchKey}-reviewed.json`;
}

export function verifiedPacketFileName(batchKey: string): string {
  return `${batchKey}-verified.json`;
}

export function sidecarPacketFileName(batchKey: string): string {
  return `${batchKey}-sidecar.json`;
}

export function briefPacketFileName(batchKey: string): string {
  return `${batchKey}-brief.json`;
}

export type ReviewBriefCard = {
  canonicalCardVersionId: string;
  front: string;
  back: string;
  deckPath: string;
  existingTags: string[];
  priorAssertions: NonNullable<PortableTagReviewCard["priorAssertions"]>;
  candidates: Record<MetadataFacet, Array<{ termId: string; preferredLabel: string }>>;
};

export type ReviewBrief = {
  batchKey: string;
  inputChecksum: string;
  taxonomyVersion: string;
  cards: ReviewBriefCard[];
};

const BRIEF_BACK_LIMIT = 800;
const BRIEF_CANDIDATE_LIMIT = 8;

function slimCandidates(
  candidates: PortableTagReviewCard["candidates"][MetadataFacet],
  priorIds: Set<string>,
  limit = BRIEF_CANDIDATE_LIMIT,
) {
  const slim = (candidates ?? []).map((term) => ({
    termId: term.termId,
    preferredLabel: term.preferredLabel,
  }));
  const kept: Array<{ termId: string; preferredLabel: string }> = [];
  const seen = new Set<string>();
  for (const term of slim) {
    if (priorIds.has(term.termId) && !seen.has(term.termId)) {
      kept.push(term);
      seen.add(term.termId);
    }
  }
  for (const term of slim) {
    if (kept.length >= limit) break;
    if (seen.has(term.termId)) continue;
    kept.push(term);
    seen.add(term.termId);
  }
  return kept;
}

export function buildReviewBrief(packet: PortableTagReviewPacket): ReviewBrief {
  return {
    batchKey: packet.batchKey,
    inputChecksum: packet.inputChecksum,
    taxonomyVersion: packet.taxonomyVersion,
    cards: packet.cards.map((card) => {
      const priorIds = new Set((card.priorAssertions ?? []).map((row) => row.termId));
      return {
        canonicalCardVersionId: card.canonicalCardVersionId,
        front: card.front,
        back: card.back.length > BRIEF_BACK_LIMIT
          ? `${card.back.slice(0, BRIEF_BACK_LIMIT)}…`
          : card.back,
        deckPath: card.deckPath,
        existingTags: card.existingTags,
        priorAssertions: card.priorAssertions ?? [],
        candidates: {
          anatomy: slimCandidates(card.candidates.anatomy, priorIds),
          diagnosis: slimCandidates(card.candidates.diagnosis, priorIds),
          treatment: slimCandidates(card.candidates.treatment, priorIds),
          specialty: slimCandidates(card.candidates.specialty, priorIds),
        },
      };
    }),
  };
}

export function quoteSupported(card: { front: string; back: string }, quote: string) {
  if (!quote) return false;
  const inFront = card.front.includes(quote);
  const inBack = card.back.includes(quote);
  if (!inFront && !inBack) return false;
  if (inFront) return true;
  const extraAt = card.back.indexOf("Extra:");
  if (extraAt >= 0 && card.back.indexOf(quote) >= extraAt) return false;
  return true;
}

export function trimLowRiskAssertions(card: PortableTagReviewCard): PortableTagReviewCard["assertions"] {
  const kept = card.assertions.filter((assertion) => {
    if (assertion.facet === "diagnosis" || assertion.facet === "treatment") return true;
    const quote = assertion.evidence[0]?.quote ?? "";
    return quoteSupported(card, quote);
  });
  const specialties = kept
    .filter((assertion) => assertion.facet === "specialty")
    .sort((left, right) => right.confidence - left.confidence || left.termId.localeCompare(right.termId));
  const primarySpecialty = specialties[0]?.termId;
  return kept.filter((assertion) =>
    assertion.facet !== "specialty" || assertion.termId === primarySpecialty);
}

export function isPendingPacketFileName(name: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}-pending\.json$/.test(name);
}

export type TagReviewSidecarCard = {
  canonicalCardVersionId: string;
  reviewStatus: "completed";
  assertions: PortableTagReviewCard["assertions"];
  reviewNotes?: string[];
  missingConcepts?: PortableTagReviewCard["missingConcepts"];
};

export type TagReviewSidecar = {
  batchKey: string;
  inputChecksum: string;
  reviewer: { provider: string; model: string; reviewedAt: string };
  cards: TagReviewSidecarCard[];
};

export function applyTagReviewSidecar(
  packet: PortableTagReviewPacket,
  sidecar: TagReviewSidecar,
): PortableTagReviewPacket {
  if (sidecar.batchKey !== packet.batchKey) {
    throw new Error(`sidecar_batch_mismatch:${sidecar.batchKey}:${packet.batchKey}`);
  }
  if (sidecar.inputChecksum !== packet.inputChecksum) {
    throw new Error("sidecar_checksum_mismatch");
  }
  if (!sidecar.reviewer?.provider?.trim() || !sidecar.reviewer.model?.trim()
    || !Number.isFinite(Date.parse(sidecar.reviewer.reviewedAt))) {
    throw new Error("sidecar_reviewer_required");
  }
  const byVersion = new Map(sidecar.cards.map((card) => [card.canonicalCardVersionId, card]));
  if (byVersion.size !== sidecar.cards.length) throw new Error("sidecar_duplicate_card");
  if (byVersion.size !== packet.cards.length) {
    throw new Error(`sidecar_card_count_mismatch:${byVersion.size}:${packet.cards.length}`);
  }
  const mergedCards = packet.cards.map((card) => {
    const patch = byVersion.get(card.canonicalCardVersionId);
    if (!patch) throw new Error(`sidecar_missing_card:${card.canonicalCardVersionId}`);
    if (patch.reviewStatus !== "completed") {
      throw new Error(`sidecar_card_incomplete:${card.canonicalCardVersionId}`);
    }
    return {
      ...card,
      reviewStatus: "completed" as const,
      reviewNotes: patch.reviewNotes ?? [],
      missingConcepts: patch.missingConcepts ?? [],
      assertions: patch.assertions,
    };
  });
  const merged: PortableTagReviewPacket = {
    ...packet,
    reviewer: sidecar.reviewer,
    cards: mergedCards,
  };
  if (sha256(portablePacketChecksumInput(merged)) !== packet.inputChecksum) {
    throw new Error("sidecar_mutated_protected_fields");
  }
  return merged;
}
