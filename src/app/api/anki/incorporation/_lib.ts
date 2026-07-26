/* eslint-disable @typescript-eslint/no-explicit-any */
import { timingSafeEqual } from "node:crypto";
import {
  buildIncorporationCandidate,
  type IncorporationCandidate,
  type IncorporationProposal,
} from "@/lib/education/anki-incorporation";

export function authorizedAgentRequest(request: Request): boolean {
  const secret = process.env.ANKI_INCORPORATION_AGENT_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || !header) return false;
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function loadIncorporationCandidate(
  supabase: any,
  proposalId: string,
): Promise<IncorporationCandidate | null> {
  const { data: row } = await supabase
    .from("anki_editor_workspace_proposals")
    .select(
      "id,proposal_evidence_hash,proposal_kind,canonical_card_id,base_canonical_card_version_id,edited_fields,central_tag_changes,proposed_deck_path,mapping_changes,kg_expansion_suggestion,status",
    )
    .eq("id", proposalId)
    .maybeSingle();
  if (!row || !["submitted", "processing"].includes(row.status)) return null;
  if (!row.canonical_card_id) return null;
  const { data: card } = await supabase
    .from("canonical_cards")
    .select("id,current_version_id,anki_card_id,is_active")
    .eq("id", row.canonical_card_id)
    .maybeSingle();
  if (!card?.is_active) return null;
  const { data: version } = await supabase
    .from("canonical_card_versions")
    .select("id,field_snapshot,tag_snapshot")
    .eq("id", card.current_version_id)
    .maybeSingle();
  const { data: ankiCard } = await supabase
    .from("anki_cards")
    .select("card_ord,deck_id")
    .eq("id", card.anki_card_id)
    .maybeSingle();
  const { data: deck } = ankiCard
    ? await supabase
        .from("anki_decks")
        .select("full_name")
        .eq("id", ankiCard.deck_id)
        .maybeSingle()
    : { data: null };
  if (!version || !ankiCard || !deck) return null;

  const mappingChanges = Array.isArray(row.mapping_changes)
    ? row.mapping_changes
    : [];
  const entityIds = mappingChanges
    .map((mapping: any) => mapping?.canonicalEntityId)
    .filter(Boolean);
  const { data: entities } = entityIds.length
    ? await supabase
        .from("canonical_entities")
        .select("id")
        .in("id", [...new Set(entityIds)])
        .eq("is_active", true)
        .eq("status", "canonical")
    : { data: [] };

  const proposal: IncorporationProposal = {
    id: row.id,
    proposalEvidenceHash: row.proposal_evidence_hash,
    proposalKind: row.proposal_kind,
    canonicalCardId: row.canonical_card_id,
    baseVersionId: row.base_canonical_card_version_id,
    editedFields: Array.isArray(row.edited_fields) ? row.edited_fields : [],
    centralTagChanges: row.central_tag_changes ?? { add: [], remove: [] },
    proposedDeckPath: row.proposed_deck_path,
    mappingChanges,
    kgExpansionSuggestion: row.kg_expansion_suggestion,
  };
  return buildIncorporationCandidate(proposal, {
    cardOrdinal: Number(ankiCard.card_ord),
    currentVersionId: version.id,
    currentFields: Array.isArray(version.field_snapshot)
      ? version.field_snapshot
      : [],
    currentTags: Array.isArray(version.tag_snapshot)
      ? version.tag_snapshot
      : [],
    currentDeckPath: deck.full_name,
    activeEntityIds: new Set((entities ?? []).map((entity: any) => entity.id)),
  });
}
