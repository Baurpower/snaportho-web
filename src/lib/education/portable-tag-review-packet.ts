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

export function isPendingPacketFileName(name: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}-pending\.json$/.test(name);
}
