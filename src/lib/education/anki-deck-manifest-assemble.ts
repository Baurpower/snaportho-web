/**
 * Pure assembly of a deck sync manifest from already-fetched DB rows.
 * Shared by the device API (`loadReleaseManifest`) and the bootstrap CLI so they cannot drift.
 */
import { toProductDeckPath } from "./anki-deck-path";
import { normalizeFieldSnapshotToMaster } from "./anki-normalize-to-master";

export type ReleaseHeaderRow = {
  id: string;
  release_key: string;
  release_version: string;
  status: string;
  manifest_schema_version?: string | null;
  manifest_checksum: string;
  minimum_addon_version: string;
  published_at?: string | null;
};

export type ReleaseMemberRow = {
  canonical_card_id: string;
  canonical_card_version_id: string;
  note_guid: string;
  card_ordinal: number;
  native_card_id_hint?: string | null;
  content_hash: string;
  deck_path: string;
  ordering_key: string;
  inclusion_status: string;
};

export type VersionRow = {
  id: string;
  canonical_card_id: string;
  content_hash?: string;
  field_snapshot: unknown;
  tag_snapshot: unknown;
  source_note_id?: string | null;
  version_number?: number | null;
};

export type MappingRow = {
  canonical_card_version_id: string;
  canonical_entity_id: string;
  reviewer_mapping_role: string;
};

export type MediaAssetRow = {
  canonical_card_version_id?: string | null;
  logical_filename: string;
  content_sha256: string;
  mime_type: string;
  byte_size: number;
  object_key: string;
  license_status: string;
};

export type AssembledDeckSyncManifest = {
  contractVersion: "snaportho-deck-sync-manifest.v1";
  releaseId: string;
  releaseKey: string;
  releaseVersion: string;
  releaseStatus: string;
  manifestChecksum: string;
  minimumAddonVersion: string;
  cards: Array<{
    canonicalCardId: string;
    canonicalCardVersionId: string;
    noteGuid: string;
    cardOrdinal: number;
    nativeCardIdHint: string | null;
    canonicalContentHash: string;
    contentHash: string;
    deckPath: string;
    orderingKey: string;
    inclusionStatus: string;
    fieldSnapshot: Array<{ name: string; rawValue?: string; value?: string; plainText?: string }>;
    centralTags: string[];
    mappings: Array<{ canonicalEntityId: string; mappingRole: string }>;
    mediaHashes: string[];
  }>;
  media: MediaAssetRow[];
};

function asFieldSnapshot(
  raw: unknown,
): Array<{ name: string; rawValue?: string; value?: string; plainText?: string }> {
  if (!Array.isArray(raw)) return [];
  return raw.map((field: unknown) => {
    const f =
      typeof field === "object" && field !== null
        ? (field as Record<string, unknown>)
        : {};
    return {
      name: String(f.name ?? "unknown"),
      rawValue: typeof f.rawValue === "string" ? f.rawValue : undefined,
      value: typeof f.value === "string" ? f.value : undefined,
      plainText: typeof f.plainText === "string" ? f.plainText : undefined,
    };
  });
}

function asTagSnapshot(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((t) => String(t));
}

/** Collect media filenames referenced in field HTML (img src + [sound:…]). */
export function filenamesInFieldSnapshot(
  fields: Array<{ rawValue?: string; value?: string }>,
): string[] {
  const found = new Set<string>();
  for (const field of fields) {
    const html = field.rawValue ?? field.value ?? "";
    for (const match of html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)) {
      const base = String(match[1] ?? "")
        .split(/[?#]/)[0]
        .split(/[/\\]/)
        .pop();
      if (base) found.add(base);
    }
    for (const match of html.matchAll(/\[sound:([^\]]+)\]/gi)) {
      const base = String(match[1] ?? "")
        .trim()
        .split(/[/\\]/)
        .pop();
      if (base) found.add(base);
    }
  }
  return [...found];
}

export function assembleDeckSyncManifest(input: {
  release: ReleaseHeaderRow;
  members: ReleaseMemberRow[];
  versions: VersionRow[];
  mappings: MappingRow[];
  media: MediaAssetRow[];
}): AssembledDeckSyncManifest {
  const versionById = new Map((input.versions ?? []).map((v) => [v.id, v]));
  const entities = new Map<string, Array<{ canonicalEntityId: string; mappingRole: string }>>();
  const mediaByVersion = new Map<string, string[]>();
  const mediaByFilename = new Map<string, string>(); // logical_filename -> sha256

  for (const m of input.mappings ?? []) {
    const rows = entities.get(m.canonical_card_version_id) ?? [];
    rows.push({
      canonicalEntityId: m.canonical_entity_id,
      mappingRole: m.reviewer_mapping_role,
    });
    entities.set(m.canonical_card_version_id, rows);
  }
  for (const asset of input.media ?? []) {
    if (asset.license_status === "excluded") continue;
    mediaByFilename.set(asset.logical_filename, asset.content_sha256);
    if (!asset.canonical_card_version_id) continue;
    const rows = mediaByVersion.get(asset.canonical_card_version_id) ?? [];
    rows.push(asset.content_sha256);
    mediaByVersion.set(asset.canonical_card_version_id, rows);
  }

  const members = [...(input.members ?? [])].sort((a, b) =>
    a.ordering_key < b.ordering_key ? -1 : a.ordering_key > b.ordering_key ? 1 : 0,
  );

  return {
    contractVersion: "snaportho-deck-sync-manifest.v1",
    releaseId: input.release.id,
    releaseKey: input.release.release_key,
    releaseVersion: input.release.release_version,
    releaseStatus: input.release.status,
    manifestChecksum: input.release.manifest_checksum,
    minimumAddonVersion: input.release.minimum_addon_version,
    cards: members.map((m) => {
      const v = versionById.get(m.canonical_card_version_id);
      const rawFields = asFieldSnapshot(v?.field_snapshot);
      const tags = asTagSnapshot(v?.tag_snapshot);
      // Normalize to SnapOrtho Master fields so contentHash matches bootstrap notes.
      const normalized = normalizeFieldSnapshotToMaster(rawFields, tags, m.card_ordinal);
      const fields = normalized.fieldSnapshot;
      const byVersion = mediaByVersion.get(m.canonical_card_version_id) ?? [];
      const byFilename = filenamesInFieldSnapshot([...rawFields, ...fields])
        .map((name) => mediaByFilename.get(name))
        .filter((h): h is string => Boolean(h));
      const mediaHashes = [...new Set([...byVersion, ...byFilename])].sort();
      return {
        canonicalCardId: m.canonical_card_id,
        canonicalCardVersionId: m.canonical_card_version_id,
        noteGuid: m.note_guid,
        cardOrdinal: m.card_ordinal,
        nativeCardIdHint: m.native_card_id_hint ?? null,
        canonicalContentHash: m.content_hash,
        contentHash: normalized.contentHash,
        deckPath: toProductDeckPath(m.deck_path),
        orderingKey: m.ordering_key,
        inclusionStatus: m.inclusion_status,
        fieldSnapshot: fields,
        centralTags: tags.filter((t) => t.startsWith("SnapOrtho::")),
        mappings: entities.get(m.canonical_card_version_id) ?? [],
        mediaHashes,
      };
    }),
    media: (input.media ?? []).filter((a) => a.license_status !== "excluded"),
  };
}
