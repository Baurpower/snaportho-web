import { NextResponse } from 'next/server';
import { authenticateLinkingRequest, jsonError, snapshotFields } from '../_lib';

const PAGE_SIZE_MAX = 50;
const READ_BATCH_SIZE = 500;
type DeckMember = {
  canonical_card_id: string;
  canonical_card_version_id: string;
  note_guid: string;
  card_ordinal: number;
  ordering_key: string;
};
type DeckVersion = { id: string; field_snapshot: unknown };
type CardPageLink = { canonical_card_id: string; source_page_id: string };

function boundedInt(value: string | null, fallback: number, maximum: number) {
  if (!value || !/^\d+$/.test(value)) return fallback;
  return Math.min(Number(value), maximum);
}

export async function GET(request: Request) {
  const auth = await authenticateLinkingRequest(request);
  if ('response' in auth) return auth.response;
  const params = new URL(request.url).searchParams;
  const offset = boundedInt(params.get('offset'), 0, 1_000_000);
  const limit = boundedInt(params.get('limit'), 1, PAGE_SIZE_MAX);
  const search = (params.get('search') ?? '').trim().slice(0, 120).toLocaleLowerCase();
  const { data: release, error: releaseError } = await auth.supabase
    .from('anki_deck_releases')
    .select('id,release_version,published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (releaseError) return jsonError('published_deck_unavailable');
  if (!release) return jsonError('no_published_deck', 404);

  const { count, error: countError } = await auth.supabase
    .from('anki_deck_release_cards')
    .select('canonical_card_id', { count: 'exact', head: true })
    .eq('deck_release_id', release.id)
    .eq('inclusion_status', 'included');
  if (countError || count == null) return jsonError('deck_inventory_unavailable');

  const matches: Array<Record<string, unknown>> = [];
  let matchedCount = search ? 0 : offset;
  let scanned = search ? 0 : offset;
  while (scanned < count && (Boolean(search) || matchedCount < offset + limit)) {
    const end = search
      ? Math.min(scanned + READ_BATCH_SIZE, count) - 1
      : Math.min(offset + limit, count) - 1;
    const { data: memberRows, error: memberError } = await auth.supabase
      .from('anki_deck_release_cards')
      .select('canonical_card_id,canonical_card_version_id,note_guid,card_ordinal,ordering_key')
      .eq('deck_release_id', release.id)
      .eq('inclusion_status', 'included')
      .order('ordering_key')
      .range(scanned, end);
    if (memberError) return jsonError('deck_inventory_unavailable');
    const members = (memberRows ?? []) as DeckMember[];
    if (!members.length) break;
    const { data: versionRows, error: versionError } = await auth.supabase
      .from('canonical_card_versions')
      .select('id,field_snapshot')
      .in('id', members.map((member) => member.canonical_card_version_id));
    if (versionError) return jsonError('deck_preview_unavailable');
    const versions = (versionRows ?? []) as DeckVersion[];
    const byId = new Map(versions.map((version) => [version.id, version]));
    for (const member of members) {
      const version = byId.get(member.canonical_card_version_id);
      if (!version) return jsonError('deck_preview_unavailable');
      const fields = snapshotFields(version.field_snapshot);
      if (search && !fields.some((field) => field.text.toLocaleLowerCase().includes(search))) continue;
      if (matchedCount >= offset && matchedCount < offset + limit) {
        matches.push({
          canonicalCardId: member.canonical_card_id,
          canonicalCardVersionId: member.canonical_card_version_id,
          noteGuid: member.note_guid,
          cardOrdinal: member.card_ordinal,
          orderingKey: member.ordering_key,
          fields,
        });
      }
      matchedCount += 1;
    }
    scanned += members.length;
  }

  const cards = matches;
  const ids = cards.map((card) => card.canonicalCardId as string);
  const { data: linkRows, error: linksError } = ids.length
    ? await auth.supabase.from('brobot_anki_card_page_links')
      .select('canonical_card_id,source_page_id')
      .eq('user_id', auth.userId)
      .in('canonical_card_id', ids)
    : { data: [], error: null };
  if (linksError) return jsonError('card_links_unavailable');
  const links = (linkRows ?? []) as CardPageLink[];
  return NextResponse.json({
    release: { id: release.id, version: release.release_version },
    total: search ? matchedCount : count,
    offset,
    cards: cards.map((card) => ({
      ...card,
      linkedPageIds: (links ?? [])
        .filter((link) => link.canonical_card_id === card.canonicalCardId)
        .map((link) => link.source_page_id),
    })),
  });
}
