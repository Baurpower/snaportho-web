import { createHash } from "node:crypto";

import {
  CLAIM_OVERLAP_LEARNER_CONTRACT,
  isClaimOverlapLaunchAcknowledgementV1,
  type ClaimOverlapLaunchAcknowledgementV1,
  type ClaimOverlapLaunchRequestV1,
} from "./contracts/claim-overlap-learner-v1";

export const ANKI_LAUNCH_CREATE_CONTRACT = CLAIM_OVERLAP_LEARNER_CONTRACT;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_ID = /^[A-Za-z0-9._:-]{1,200}$/;

export type AnkiLaunchCreateRequest = {
  contractVersion: typeof CLAIM_OVERLAP_LEARNER_CONTRACT;
  noteGuid: string;
  cardOrdinal: number;
  rank: 1 | 2 | 3;
  canonicalCardId?: string;
  canonicalCardVersionId?: string;
  idempotencyKey?: string;
};

export type ResolvedLaunchCard = {
  canonicalCardId: string;
  canonicalCardVersionId: string;
  noteGuid: string;
  cardOrdinal: number;
};

export function isAnkiLaunchCreateRequest(value: unknown): value is AnkiLaunchCreateRequest {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  if (row.contractVersion !== CLAIM_OVERLAP_LEARNER_CONTRACT) return false;
  if (typeof row.noteGuid !== "string" || !SAFE_ID.test(row.noteGuid)) return false;
  if (!Number.isInteger(row.cardOrdinal) || (row.cardOrdinal as number) < 0) return false;
  if (row.rank !== 1 && row.rank !== 2 && row.rank !== 3) return false;
  if ("deck" in row || "deckName" in row || "deckPath" in row) return false;
  if (row.canonicalCardId != null && (typeof row.canonicalCardId !== "string" || !UUID.test(row.canonicalCardId))) {
    return false;
  }
  if (row.canonicalCardVersionId != null && (typeof row.canonicalCardVersionId !== "string" || !UUID.test(row.canonicalCardVersionId))) {
    return false;
  }
  if (row.idempotencyKey != null && (typeof row.idempotencyKey !== "string" || !UUID.test(row.idempotencyKey))) {
    return false;
  }
  return true;
}

export function guidOrdinalResolution(count: number): "ok" | "not_found" | "ambiguous" {
  if (count <= 0) return "not_found";
  if (count > 1) return "ambiguous";
  return "ok";
}

export function launchIdempotencyKey(userId: string, noteGuid: string, cardOrdinal: number, seed: string): string {
  return createHash("sha256").update(`${userId}|${noteGuid}|${cardOrdinal}|${seed}`).digest("hex");
}

export function buildLaunchCommandRow(input: {
  userId: string;
  card: ResolvedLaunchCard;
  idempotencySeed?: string;
  now?: Date;
}): {
  user_id: string;
  recommendation_item_id: null;
  canonical_card_id: string;
  canonical_card_version_id: string;
  note_guid: string;
  card_ordinal: number;
  contract_version: typeof CLAIM_OVERLAP_LEARNER_CONTRACT;
  status: "pending";
  idempotency_key: string;
  requested_at: string;
  expires_at: string;
} {
  const now = input.now ?? new Date();
  const requestedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + 2 * 60_000).toISOString();
  return {
    user_id: input.userId,
    recommendation_item_id: null,
    canonical_card_id: input.card.canonicalCardId,
    canonical_card_version_id: input.card.canonicalCardVersionId,
    note_guid: input.card.noteGuid,
    card_ordinal: input.card.cardOrdinal,
    contract_version: CLAIM_OVERLAP_LEARNER_CONTRACT,
    status: "pending",
    idempotency_key: launchIdempotencyKey(
      input.userId,
      input.card.noteGuid,
      input.card.cardOrdinal,
      input.idempotencySeed ?? requestedAt,
    ),
    requested_at: requestedAt,
    expires_at: expiresAt,
  };
}

export function toLaunchRequest(row: {
  id: string;
  canonical_card_id: string;
  canonical_card_version_id: string;
  note_guid: string;
  card_ordinal: number;
  requested_at: string;
  expires_at: string;
}): ClaimOverlapLaunchRequestV1 {
  return {
    contractVersion: CLAIM_OVERLAP_LEARNER_CONTRACT,
    launchCommandId: row.id,
    recommendationItemId: null,
    canonicalCardId: row.canonical_card_id,
    canonicalCardVersionId: row.canonical_card_version_id,
    noteGuid: row.note_guid,
    cardOrdinal: row.card_ordinal,
    requestedAt: row.requested_at,
    expiresAt: row.expires_at,
  };
}

export function isValidLaunchAck(value: unknown): value is ClaimOverlapLaunchAcknowledgementV1 {
  return isClaimOverlapLaunchAcknowledgementV1(value);
}
