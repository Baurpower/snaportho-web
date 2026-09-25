import {
  type CardClaimFactoryCard,
  type ExistingClaimRef,
} from "./card-claim-factory";
import { canonicalContentHash, type EntityIndexRow, type EphemeralField } from "./deck-semantic-mapping";

export const CARD_CLAIM_DRY_RUN_LIMIT_DEFAULT = 50;
export const CARD_CLAIM_DRY_RUN_LIMIT_MAX = 500;
export const CARD_CLAIM_FULL_DECK_CONFIRM = "DRY_RUN_FULL_DECK";

export type DeckReleaseRef = {
  id: string;
  releaseKey: string;
  releaseVersion: string;
  status: string;
  manifestChecksum: string;
};

export type PublishedDeckLoaderRow = {
  canonical_card_id: string;
  canonical_card_version_id: string;
  current_version_id: string;
  note_guid: string;
  card_ordinal: number;
  content_hash: string;
  inclusion_status: "included" | "excluded" | "withdrawn";
  card_active: boolean;
  version_active: boolean;
  field_snapshot: unknown;
  tag_snapshot: unknown;
};

export type CardClaimDryRunGuard = {
  limit: number | null;
  fullDeck: boolean;
};

export function parseCardClaimDryRunGuard(args: Map<string, string>): CardClaimDryRunGuard {
  if (args.has("--apply")) throw new Error("card_claim_factory_has_no_apply_mode");
  const confirm = args.get("--confirm");
  const limitRaw = args.get("--limit");
  if (confirm === CARD_CLAIM_FULL_DECK_CONFIRM) {
    if (limitRaw) throw new Error("full_deck_dry_run_does_not_take_limit");
    return { limit: null, fullDeck: true };
  }
  if (confirm) throw new Error("unknown_confirm_token");
  const limit = limitRaw ? Number(limitRaw) : CARD_CLAIM_DRY_RUN_LIMIT_DEFAULT;
  if (!Number.isInteger(limit) || limit < 1 || limit > CARD_CLAIM_DRY_RUN_LIMIT_MAX) {
    throw new Error("limit_must_be_1_to_500_or_confirm_full_deck");
  }
  return { limit, fullDeck: false };
}

export function mapFieldSnapshot(snapshot: unknown): EphemeralField[] {
  if (!Array.isArray(snapshot)) return [];
  return snapshot.map((field) => {
    const row = field && typeof field === "object" ? field as Record<string, unknown> : {};
    return {
      name: String(row.name ?? "unknown"),
      rawValue: String(row.rawValue ?? row.value ?? ""),
      plainText: typeof row.plainText === "string" ? row.plainText : undefined,
    };
  });
}

export function mapPublishedDeckRow(row: PublishedDeckLoaderRow): CardClaimFactoryCard {
  const fields = mapFieldSnapshot(row.field_snapshot);
  const tags = Array.isArray(row.tag_snapshot) ? row.tag_snapshot.map((tag) => String(tag)) : [];
  const card: CardClaimFactoryCard = {
    canonicalCardId: row.canonical_card_id,
    canonicalCardVersionId: row.canonical_card_version_id,
    noteGuid: row.note_guid,
    cardOrdinal: Number(row.card_ordinal),
    contentHash: row.content_hash,
    tags,
    fields,
    active: Boolean(row.card_active && row.version_active),
    currentVersion: row.current_version_id === row.canonical_card_version_id,
    inclusionStatus: row.inclusion_status,
  };
  if (canonicalContentHash(card) !== row.content_hash) {
    throw new Error(`content_hash_mismatch:${row.canonical_card_id}`);
  }
  return card;
}

export function mapEntityRow(row: {
  id: string;
  preferred_label: string;
  normalized_label: string;
  entity_type: string;
  is_active: boolean;
  status: string;
  aliases: string[] | null;
  source_aliases: string[] | null;
}): EntityIndexRow {
  return {
    id: row.id,
    preferredLabel: row.preferred_label,
    normalizedLabel: row.normalized_label,
    entityType: row.entity_type,
    aliases: row.aliases ?? [],
    sourceAliases: row.source_aliases ?? [],
    active: row.is_active,
    lifecycleStatus: row.status,
  };
}

export function mapExistingClaimRow(row: {
  id: string;
  current_version_id: string | null;
  fingerprint_hash: string;
}): ExistingClaimRef | null {
  if (!row.current_version_id) return null;
  return {
    claimId: row.id,
    currentVersionId: row.current_version_id,
    fingerprintHash: row.fingerprint_hash,
  };
}

export const PUBLISHED_RELEASE_SQL = `
  select id, release_key, release_version, status, manifest_checksum
  from public.anki_deck_releases
  where status = 'published'
  order by published_at desc nulls last, created_at desc
  limit 1
`;

export const RELEASE_BY_ID_SQL = `
  select id, release_key, release_version, status, manifest_checksum
  from public.anki_deck_releases
  where id = $1::uuid
`;

export const PUBLISHED_DECK_CARDS_SQL = `
  select
    rc.canonical_card_id,
    rc.canonical_card_version_id,
    c.current_version_id,
    rc.note_guid,
    rc.card_ordinal,
    rc.content_hash,
    rc.inclusion_status,
    c.is_active as card_active,
    v.is_active as version_active,
    v.field_snapshot,
    v.tag_snapshot
  from public.anki_deck_release_cards rc
  join public.canonical_cards c on c.id = rc.canonical_card_id
  join public.canonical_card_versions v on v.id = rc.canonical_card_version_id
  where rc.deck_release_id = $1::uuid
    and rc.inclusion_status = 'included'
  order by md5(rc.canonical_card_id::text)
  limit $2
`;

export const ENTITY_INDEX_SQL = `
  select
    e.id,
    e.preferred_label,
    e.normalized_label,
    e.entity_type,
    e.is_active,
    e.status,
    coalesce(array_remove(array_agg(distinct case when sa.entity_type = 'canonical_entity' then sa.alias_value end), null), '{}') aliases,
    coalesce(array_remove(array_agg(distinct case when sa.source_id is not null then sa.alias_value end), null), '{}') source_aliases
  from public.canonical_entities e
  left join public.source_aliases sa on sa.entity_id = e.id and sa.is_active
  where e.is_active
  group by e.id
  order by e.id
`;

export const EXISTING_CLAIMS_SQL = `
  select id, current_version_id, fingerprint_hash
  from public.educational_claims
  where is_active
`;

export function specialtyStratum(tags: string[]): string {
  const joined = tags.join(" ").toLowerCase();
  const buckets: Array<[string, RegExp]> = [
    ["peds", /pedia|paed|child/],
    ["trauma", /trauma/],
    ["sports", /sport/],
    ["recon", /recon|arthroplast/],
    ["spine", /spine/],
    ["hand", /hand|wrist/],
    ["foot", /foot|ankle/],
    ["oncology", /oncolog|tumor/],
    ["shoulder", /shoulder|elbow/],
  ];
  for (const [name, pattern] of buckets) {
    if (pattern.test(joined)) return name;
  }
  return "other";
}

export function stratifyCards<T extends { tags: string[] }>(cards: T[], limit: number): T[] {
  if (cards.length <= limit) return cards;
  const buckets = new Map<string, T[]>();
  for (const card of cards) {
    const key = specialtyStratum(card.tags);
    const list = buckets.get(key) ?? [];
    list.push(card);
    buckets.set(key, list);
  }
  const keys = [...buckets.keys()].sort();
  const out: T[] = [];
  let index = 0;
  while (out.length < limit && keys.some((key) => (buckets.get(key)?.length ?? 0) > 0)) {
    const key = keys[index % keys.length];
    const next = buckets.get(key)?.shift();
    if (next) out.push(next);
    index += 1;
  }
  return out;
}

export function queueDistribution(assignments: Array<{ queue: string }>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of assignments) counts[row.queue] = (counts[row.queue] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}
