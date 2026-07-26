/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { z } from "zod";
import { reviewerAuth, body } from "../../_lib";
import { workspaceLocalIdentitySchema } from "@/lib/education/anki-reviewer";
import {
  buildKgDraftSuggestions,
  significantTokens,
  type KgDraftResult,
} from "@/lib/education/anki-kg-draft";
import type { EntityIndexRow } from "@/lib/education/deck-semantic-mapping";
import { normalizeClinicalText } from "@/lib/education/deck-semantic-mapping";

const draftRequestSchema = z
  .object({
    contractVersion: z.literal("snaportho-anki-kg-draft.v1"),
    localIdentity: workspaceLocalIdentitySchema,
    refineComment: z.string().max(1000).optional().default(""),
    clientVersion: z.string().min(1).max(64),
  })
  .strict();

function toIndexRow(e: any): EntityIndexRow {
  const aliases = Array.isArray(e.aliases)
    ? e.aliases.map((a: any) => String(a?.alias ?? a ?? "")).filter(Boolean)
    : [];
  return {
    id: e.id,
    preferredLabel: e.preferred_label,
    normalizedLabel: normalizeClinicalText(e.preferred_label ?? ""),
    entityType: e.entity_type ?? "concept",
    aliases: aliases.map((a: string) => normalizeClinicalText(a)).filter(Boolean),
    sourceAliases: [],
    active: Boolean(e.is_active),
    lifecycleStatus: e.status ?? "canonical",
  };
}

/**
 * Suggest KG improvements from the card (and optional refine comment).
 * Does not write mappings or entities.
 */
export async function POST(request: Request) {
  const a = await reviewerAuth(request, "clinical_editor");
  if ("response" in a) return a.response;
  const parsed = await body(request, draftRequestSchema);
  if ("response" in parsed) return parsed.response;
  const input = parsed.data!;

  const { data: notes, error: noteError } = await a.auth.supabase
    .from("anki_notes")
    .select("id")
    .eq("anki_note_guid", input.localIdentity.noteGuid)
    .eq("is_active", true)
    .limit(5);
  if (noteError)
    return NextResponse.json({ error: "card resolution unavailable" }, { status: 500 });
  if (!notes?.length)
    return NextResponse.json({ error: "card not found" }, { status: 404 });

  const { data: cards } = await a.auth.supabase
    .from("anki_cards")
    .select("id")
    .in(
      "note_id",
      notes.map((n: any) => n.id),
    )
    .eq("card_ord", input.localIdentity.cardOrdinal)
    .eq("is_active", true)
    .limit(5);
  if (!cards?.length || cards.length !== 1)
    return NextResponse.json({ error: "card not found or ambiguous" }, { status: 404 });

  const { data: canonical } = await a.auth.supabase
    .from("canonical_cards")
    .select("id,current_version_id,is_active")
    .eq("anki_card_id", cards[0].id)
    .maybeSingle();
  if (!canonical?.is_active)
    return NextResponse.json({ error: "canonical card unavailable" }, { status: 404 });

  const { data: version } = await a.auth.supabase
    .from("canonical_card_versions")
    .select("id,content_hash,field_snapshot,tag_snapshot")
    .eq("id", canonical.current_version_id)
    .eq("canonical_card_id", canonical.id)
    .maybeSingle();
  if (!version)
    return NextResponse.json({ error: "version unavailable" }, { status: 404 });

  const fields = Array.isArray(version.field_snapshot) ? version.field_snapshot : [];
  const textBits = fields
    .map((f: any) => String(f?.rawValue ?? f?.value ?? ""))
    .join(" ");
  const tokens = significantTokens(`${textBits}\n${input.refineComment ?? ""}`);

  // Candidate entities: governed preferred labels and aliases only.
  const entityMap = new Map<string, any>();
  const aliasesByEntity = new Map<string, string[]>();
  for (const token of tokens.slice(0, 12)) {
    const pattern = `%${token.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    const { data } = await a.auth.supabase
      .from("canonical_entities")
      .select("id,preferred_label,entity_type,status,is_active")
      .eq("is_active", true)
      .eq("status", "canonical")
      .ilike("preferred_label", pattern)
      .limit(25);
    for (const e of data ?? []) entityMap.set(e.id, e);
    const { data: aliases } = await a.auth.supabase
      .from("source_aliases")
      .select("entity_id,alias_value")
      .eq("is_active", true)
      .eq("entity_type", "canonical_entity")
      .ilike("alias_value", pattern)
      .limit(25);
    for (const alias of aliases ?? []) {
      const entityId = String(alias.entity_id ?? "");
      const value = String(alias.alias_value ?? "");
      if (!entityId || !value) continue;
      aliasesByEntity.set(entityId, [
        ...(aliasesByEntity.get(entityId) ?? []),
        value,
      ]);
    }
  }
  const aliasEntityIds = [...aliasesByEntity.keys()].filter(
    (id) => !entityMap.has(id),
  );
  if (aliasEntityIds.length) {
    const { data } = await a.auth.supabase
      .from("canonical_entities")
      .select("id,preferred_label,entity_type,status,is_active")
      .in("id", aliasEntityIds)
      .eq("is_active", true)
      .eq("status", "canonical");
    for (const e of data ?? []) entityMap.set(e.id, e);
  }

  const entities = [...entityMap.values()].map((entity) =>
    toIndexRow({
      ...entity,
      aliases: aliasesByEntity.get(entity.id) ?? [],
    }),
  );

  const { data: links } = await a.auth.supabase
    .from("card_canonical_entity_links")
    .select("canonical_entity_id")
    .eq("canonical_card_id", canonical.id)
    .eq("is_active", true);

  const existingEntityIds = (links ?? []).map((l: any) => l.canonical_entity_id);

  const draft: KgDraftResult = buildKgDraftSuggestions({
    canonicalCardId: canonical.id,
    canonicalCardVersionId: version.id,
    contentHash: version.content_hash,
    cardOrdinal: input.localIdentity.cardOrdinal,
    fields: fields.map((f: any) => ({
      name: String(f?.name ?? "unknown"),
      rawValue: String(f?.rawValue ?? f?.value ?? ""),
      plainText: String(f?.plainText ?? ""),
    })),
    tags: Array.isArray(version.tag_snapshot) ? version.tag_snapshot.map(String) : [],
    entities,
    refineComment: input.refineComment,
    existingEntityIds,
  });

  return NextResponse.json({
    ...draft,
    canonicalCardId: canonical.id,
    canonicalCardVersionId: version.id,
    baseContentHash: version.content_hash,
    // Do not echo full card body
    localIdentity: input.localIdentity,
  });
}
