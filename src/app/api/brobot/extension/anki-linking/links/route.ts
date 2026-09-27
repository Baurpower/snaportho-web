import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateLinkingRequest, jsonError, snapshotFields, type LinkAdmin } from '../_lib';

const SaveLinkSchema = z.object({
  canonicalCardId: z.string().uuid(),
  pageId: z.string().uuid(),
});
type ReleaseCard = {
  canonical_card_id: string;
  canonical_card_version_id: string;
  note_guid: string;
  card_ordinal: number;
  ordering_key: string;
};
type CardVersion = { id: string; field_snapshot: unknown };
type UserCardLink = { canonical_card_id: string; source_page_id: string; created_at: string };
type UserSourcePage = {
  id: string;
  provider: 'orthobullets' | 'rock';
  canonical_url: string;
  source_url: string;
  title: string;
};

function batches<T>(items: T[], size = 500) {
  const output: T[][] = [];
  for (let offset = 0; offset < items.length; offset += size) {
    output.push(items.slice(offset, offset + size));
  }
  return output;
}

async function currentIncludedCards(supabase: LinkAdmin, ids: string[]) {
  if (!ids.length) return new Map<string, Record<string, unknown>>();
  const { data: release, error: releaseError } = await supabase
    .from('anki_deck_releases').select('id,release_version')
    .eq('status', 'published').order('published_at', { ascending: false })
    .limit(1).maybeSingle();
  if (releaseError || !release) return null;
  const output = new Map<string, Record<string, unknown>>();
  for (const idBatch of batches(ids)) {
    const { data: memberRows, error: memberError } = await supabase
      .from('anki_deck_release_cards')
      .select('canonical_card_id,canonical_card_version_id,note_guid,card_ordinal,ordering_key')
      .eq('deck_release_id', release.id)
      .eq('inclusion_status', 'included')
      .in('canonical_card_id', idBatch);
    if (memberError) return null;
    const rows = (memberRows ?? []) as ReleaseCard[];
    const { data: versionRows, error: versionError } = rows.length
      ? await supabase.from('canonical_card_versions').select('id,field_snapshot')
        .in('id', rows.map((row) => row.canonical_card_version_id))
      : { data: [], error: null };
    if (versionError) return null;
    const versions = (versionRows ?? []) as CardVersion[];
    const byId = new Map(versions.map((version) => [version.id, version]));
    for (const row of rows) {
      const version = byId.get(row.canonical_card_version_id);
      if (!version) continue;
      output.set(row.canonical_card_id, {
        canonicalCardId: row.canonical_card_id,
        canonicalCardVersionId: row.canonical_card_version_id,
        noteGuid: row.note_guid,
        cardOrdinal: row.card_ordinal,
        orderingKey: row.ordering_key,
        fields: snapshotFields(version.field_snapshot),
      });
    }
  }
  return output;
}

export async function GET(request: Request) {
  const auth = await authenticateLinkingRequest(request);
  if ('response' in auth) return auth.response;
  const params = new URL(request.url).searchParams;
  const cardId = params.get('canonicalCardId');
  const pageId = params.get('pageId');
  if ((!cardId && !pageId) || (cardId && pageId)) return jsonError('provide_card_or_page_id', 400);
  if (cardId && !z.string().uuid().safeParse(cardId).success) return jsonError('invalid_card_id', 400);
  if (pageId && !z.string().uuid().safeParse(pageId).success) return jsonError('invalid_page_id', 400);

  const rows: UserCardLink[] = [];
  for (let offset = 0; ; offset += 500) {
    let query = auth.supabase.from('brobot_anki_card_page_links')
      .select('canonical_card_id,source_page_id,created_at')
      .eq('user_id', auth.userId);
    query = cardId ? query.eq('canonical_card_id', cardId) : query.eq('source_page_id', pageId!);
    const { data: linkRows, error } = await query
      .order('canonical_card_id')
      .order('source_page_id')
      .range(offset, offset + 499);
    if (error) return jsonError('card_links_unavailable');
    rows.push(...((linkRows ?? []) as UserCardLink[]));
    if (!linkRows || linkRows.length < 500) break;
  }
  const pageIds = [...new Set<string>(rows.map((row) => row.source_page_id))];
  const cardIds = [...new Set<string>(rows.map((row) => row.canonical_card_id))];
  const pageResults = await Promise.all(batches(pageIds).map((pageBatch) =>
    auth.supabase.from('brobot_anki_source_pages')
      .select('id,provider,canonical_url,source_url,title')
      .eq('user_id', auth.userId).in('id', pageBatch)));
  if (pageResults.some((result) => result.error)) return jsonError('linked_cards_unavailable');
  const pages = pageResults.flatMap((result) => (result.data ?? []) as UserSourcePage[]);
  const currentCards = pageId
    ? await currentIncludedCards(auth.supabase, cardIds)
    : null;
  if (pageId && currentCards === null) return jsonError('linked_cards_unavailable');
  const pageById = new Map(pages.map((page) => [page.id, page]));
  if (pageId) {
    return NextResponse.json({
      links: rows,
      cards: rows.map((row) => {
        const current = currentCards?.get(row.canonical_card_id);
        return current
          ? { ...current, available: true }
          : { canonicalCardId: row.canonical_card_id, available: false };
      }),
    });
  }
  return NextResponse.json({
    links: rows.map((row) => ({ ...row, page: pageById.get(row.source_page_id) ?? null })),
  });
}

export async function POST(request: Request) {
  const auth = await authenticateLinkingRequest(request);
  if ('response' in auth) return auth.response;
  const parsed = SaveLinkSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError('invalid_card_link', 400);
  const { data: page, error: pageError } = await auth.supabase.from('brobot_anki_source_pages')
    .select('id').eq('id', parsed.data.pageId).eq('user_id', auth.userId).maybeSingle();
  if (pageError) return jsonError('source_page_lookup_failed');
  if (!page) return jsonError('source_page_not_found', 404);
  const available = await currentIncludedCards(auth.supabase, [parsed.data.canonicalCardId]);
  if (available === null) return jsonError('deck_membership_lookup_failed');
  if (!available.has(parsed.data.canonicalCardId)) return jsonError('card_not_in_latest_published_deck', 409);
  const { error } = await auth.supabase.from('brobot_anki_card_page_links').upsert({
    user_id: auth.userId,
    canonical_card_id: parsed.data.canonicalCardId,
    source_page_id: parsed.data.pageId,
  }, { onConflict: 'user_id,canonical_card_id,source_page_id', ignoreDuplicates: true });
  if (error) return jsonError('card_link_save_failed');
  return NextResponse.json({ saved: true });
}

export async function DELETE(request: Request) {
  const auth = await authenticateLinkingRequest(request);
  if ('response' in auth) return auth.response;
  const parsed = SaveLinkSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError('invalid_card_link', 400);
  const { error } = await auth.supabase.from('brobot_anki_card_page_links')
    .delete().eq('user_id', auth.userId)
    .eq('canonical_card_id', parsed.data.canonicalCardId)
    .eq('source_page_id', parsed.data.pageId);
  if (error) return jsonError('card_link_remove_failed');
  return NextResponse.json({ removed: true });
}
